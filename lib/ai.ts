import type { SupabaseClient } from "@supabase/supabase-js";
import { DEFAULT_LIMITS } from "./plans";

// ============================================================
// Shared AI helper. Every AI call in the app goes through
// completeAi() / completeAiJson(), which run a PROVIDER CHAIN in
// this order (first healthy provider wins):
//
//   slot 10 (optional): local Ollama     — OLLAMA_URL / OLLAMA_MODEL
//   slot 11 (optional): cloud GPU Ollama — GPU_OLLAMA_URL / GPU_OLLAMA_MODEL
//                                           (EC2, see lib/gpu.ts)
//   slot  1 (optional): AI_PROVIDER / AI_API_KEY / AI_MODEL (+ AI_MODEL_FALLBACKS)
//   slot  2 (optional): AI_P2_TYPE / AI_P2_API_KEY / AI_P2_MODEL
//                          (+ AI_P2_BASE_URL for gemini/openai-compatible)
//
// At least one slot must be configured; Ollama slots count, so the
// API keys are optional once a local/GPU Ollama URL is set.
//
// Behaviour:
//   - Fail-closed user rate limiting (ai_usage): if the usage count
//     query fails, the AI is NOT called.
//   - One ai_usage row per AI REQUEST (not per question) — batched
//     answer requests count once.
//   - Provider throttle: AI_RPM_LIMIT requests per provider per minute
//     (default 8).
//   - Quota aware: Retry-After / rate-limit headers are honoured; a
//     provider reporting an exhausted daily quota goes on an in-memory
//     cooldown until the end of the (UTC) day.
//   - On 429, 402, 5xx, timeout or unusable output the chain moves to
//     the NEXT provider immediately; otherwise 3 attempts with
//     exponential backoff and per-attempt model fallbacks.
//
// PRIVACY: this module never logs prompts, excerpts or document
// text. Logs contain only status codes, short sanitized provider
// messages (API keys redacted) and question ids.
//
// This module is server-side only (imported by API routes and the
// server debug page). API keys are read from process.env here and
// are never sent to the browser.
// ============================================================

export type AiProviderType =
  | "anthropic"
  | "openrouter"
  | "gemini"
  | "openai-compatible";

/** Kept for older imports — provider 1 is either of these two. */
export type AiProvider = "anthropic" | "openrouter";

export type AiConfig = {
  provider: AiProvider;
  apiKey: string;
  model: string;
};

/** One entry of the provider chain (slot 1 = primary, slot 2 = optional). */
export type AiProviderSlot = {
  slot: number;
  type: AiProviderType;
  apiKey: string;
  model: string;
  /** Base URL override (openai-compatible required, gemini optional). */
  baseUrl?: string;
};

/** Missing/invalid AI environment variables. */
export class AiConfigError extends Error {}

/** The user exceeded the hourly/daily AI limit, or every provider is
 *  on cooldown (maps to HTTP 429). */
export class AiRateLimitError extends Error {}

/**
 * The usage count query failed, so the limit cannot be verified.
 * Fail closed: the AI is NOT called (maps to HTTP 503).
 */
export class AiUnavailableError extends Error {}

/** The AI provider could not be reached or returned an error. */
export class AiRequestError extends Error {
  /** HTTP status of the provider response, when there was one. */
  readonly status?: number;
  /** Whether this failure is worth retrying with the next model. */
  readonly retryable: boolean;
  /**
   * Sanitized provider-side message for SERVER LOGS ONLY (API keys
   * redacted, no prompt or document text is ever added by this app).
   */
  readonly detail?: string;
  /** Parsed Retry-After hint from the provider, in milliseconds. */
  readonly retryAfterMs?: number;
  /** True when the provider reported an exhausted daily quota. */
  readonly quotaExhausted?: boolean;

  constructor(
    message: string,
    options: {
      status?: number;
      retryable?: boolean;
      detail?: string;
      retryAfterMs?: number;
      quotaExhausted?: boolean;
    } = {}
  ) {
    super(message);
    this.name = "AiRequestError";
    this.status = options.status;
    this.retryable = options.retryable ?? false;
    this.detail = options.detail;
    this.retryAfterMs = options.retryAfterMs;
    this.quotaExhausted = options.quotaExhausted;
  }
}

const ANTHROPIC_URL = "https://api.anthropic.com/v1/messages";
const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";
const GEMINI_BASE_URL = "https://generativelanguage.googleapis.com/v1beta";

// Per-user usage limits. Each ai_usage row is one AI REQUEST, and one
// request can carry up to 5 questions — so a 200-question
// questionnaire (~40-50 requests) fits comfortably inside both limits.
export const AI_HOURLY_LIMIT = 100;
// The DAILY limit is per plan (plans.limits.ai_requests_per_day:
// starter 200 / growth 600 / business 2000, null = unlimited).
// This constant is only the fallback when the plans table cannot be
// read — never unlimited.
export const AI_DAILY_LIMIT = DEFAULT_LIMITS.ai_requests_per_day ?? 200;

// Shown when every provider is on cooldown/exhausted: the run stops
// cleanly and the remaining questions stay pending.
export const AI_LIMIT_REACHED_MESSAGE =
  "AI limit reached. Your remaining questions are saved. Press Generate to continue.";

// 1 initial attempt + up to 2 automatic retries with exponential
// backoff (kept from the previous design).
const MAX_ATTEMPTS = 3;
const RETRY_BACKOFF_MS = [800, 1600];
// Per-attempt timeout so a hung request becomes a retryable failure.
const REQUEST_TIMEOUT_MS = 18_000;
// Total time ONE completeAi() call may spend on provider calls.
// Budget check before each call keeps the worst case inside the
// routes' maxDuration (60s) even with a provider chain:
//   2 attempts x 18s + 0.8s backoff = 36.8s, well under 44s.
const EXEC_TIME_BUDGET_MS = 44_000;
// Low default temperature: answers must stay factual and non-creative.
const DEFAULT_TEMPERATURE = 0.2;
// Provider RPM throttle (requests per provider per minute).
const DEFAULT_RPM_LIMIT = 8;
// If the RPM window would block a provider for longer than this,
// skip it for this attempt instead of burning the route's time budget.
const MAX_RPM_WAIT_MS = 20_000;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ------------------------------------------------------------
// Configuration (provider 1 + optional provider 2)
// ------------------------------------------------------------

// Ollama slots (10 local / 11 cloud): OpenAI-compatible endpoints.
const OLLAMA_DEFAULT_MODEL = "qwen2.5:14b-instruct";

function ollamaSlot(slot: 10 | 11, url: string, keyEnv: string, modelEnv: string): AiProviderSlot {
  return {
    slot,
    type: "openai-compatible",
    // Ollama does not check the key unless OLLAMA/serve auth is set;
    // a non-empty placeholder keeps the Authorization header valid.
    apiKey: (process.env[keyEnv] ?? "").trim() || "ollama",
    model: (process.env[modelEnv] ?? "").trim() || OLLAMA_DEFAULT_MODEL,
    baseUrl: url,
  };
}

export function getAiConfig(): AiConfig {
  const config = readPrimaryConfig();
  if (!config) {
    throw new AiConfigError(
      "AI is not configured yet. Please set AI_API_KEY and AI_MODEL."
    );
  }
  return config;
}

/** Primary slot 1 config, or null when the env vars are absent. */
function readPrimaryConfig(): AiConfig | null {
  const apiKey = process.env.AI_API_KEY;
  const model = process.env.AI_MODEL;
  if (!apiKey || !model) {
    return null;
  }

  const requested = (process.env.AI_PROVIDER ?? "").trim().toLowerCase();

  // OpenRouter keys (sk-or-...) always go to OpenRouter, no matter
  // what AI_PROVIDER says. Otherwise AI_PROVIDER decides, and the
  // default is OpenRouter (https://openrouter.ai/api/v1).
  let provider: AiProvider;
  if (apiKey.startsWith("sk-or-")) {
    provider = "openrouter";
  } else if (requested === "anthropic") {
    provider = "anthropic";
  } else if (requested === "openrouter" || requested === "") {
    provider = "openrouter";
  } else {
    throw new AiConfigError(
      'AI is not configured correctly. AI_PROVIDER must be "anthropic" or "openrouter".'
    );
  }

  return { provider, apiKey, model };
}

/** Primary model + optional comma-separated fallbacks for a slot. */
function slotModels(slot: AiProviderSlot): string[] {
  const fallbacksRaw =
    slot.slot === 1
      ? (process.env.AI_MODEL_FALLBACKS ?? "")
      : (process.env.AI_P2_MODEL ?? "");
  const fallbacks = slot.slot === 1 ? fallbacksRaw.split(",") : [];
  return [
    slot.model,
    ...fallbacks
      .map((id) => id.trim())
      .filter((id) => id.length > 0 && id !== slot.model),
  ];
}

function parseP2Type(raw: string): AiProviderType | null {
  const value = raw.trim().toLowerCase();
  if (value === "anthropic") return "anthropic";
  if (value === "openrouter") return "openrouter";
  if (value === "gemini") return "gemini";
  if (value === "openai-compatible" || value === "openai_compatible") {
    return "openai-compatible";
  }
  return null;
}

/**
 * The ordered provider chain: Ollama local (slot 10) and cloud GPU
 * (slot 11) when their URLs are set, then the API primary (slot 1)
 * when configured, then slot 2 when fully configured (AI_P2_TYPE +
 * AI_P2_API_KEY + AI_P2_MODEL). Throws AiConfigError when NOTHING
 * is configured or when slot 2 is half-configured with an invalid
 * type (a clear message beats silent ignoring).
 */
export function getProviderChain(): AiProviderSlot[] {
  const chain: AiProviderSlot[] = [];

  // Slot 10: local Ollama (dev machine / always-on box).
  const localUrl = (process.env.OLLAMA_URL ?? "").trim().replace(/\/+$/, "");
  if (localUrl) {
    chain.push(ollamaSlot(10, localUrl, "OLLAMA_API_KEY", "OLLAMA_MODEL"));
  }

  // Slot 11: cloud GPU (AWS EC2 running Ollama).
  const gpuUrl = (process.env.GPU_OLLAMA_URL ?? "").trim().replace(/\/+$/, "");
  if (gpuUrl) {
    chain.push(ollamaSlot(11, gpuUrl, "GPU_API_KEY", "GPU_OLLAMA_MODEL"));
  }

  // Slot 1: existing API primary (optional when an Ollama slot exists).
  const primary = readPrimaryConfig();
  if (primary) {
    chain.push({
      slot: 1,
      type: primary.provider,
      apiKey: primary.apiKey,
      model: primary.model,
    });
  }

  // Slot 2: optional second API provider.
  const p2TypeRaw = (process.env.AI_P2_TYPE ?? "").trim();
  const p2Key = (process.env.AI_P2_API_KEY ?? "").trim();
  const p2Model = (process.env.AI_P2_MODEL ?? "").trim();

  const p2any = p2TypeRaw || p2Key || p2Model;
  if (p2any) {
    const p2Type = parseP2Type(p2TypeRaw);
    if (!p2Type) {
      throw new AiConfigError(
        'AI_P2_TYPE must be "openrouter", "anthropic", "gemini" or "openai-compatible".'
      );
    }
    if (!p2Key || !p2Model) {
      throw new AiConfigError(
        "Provider 2 is half-configured: AI_P2_TYPE, AI_P2_API_KEY and AI_P2_MODEL must all be set (or none at all)."
      );
    }
    if (p2Type === "openai-compatible" && !process.env.AI_P2_BASE_URL) {
      throw new AiConfigError(
        "AI_P2_BASE_URL is required when AI_P2_TYPE is openai-compatible."
      );
    }

    chain.push({
      slot: 2,
      type: p2Type,
      apiKey: p2Key,
      model: p2Model,
      baseUrl: (process.env.AI_P2_BASE_URL ?? "").trim() || undefined,
    });
  }

  if (chain.length === 0) {
    throw new AiConfigError(
      "AI is not configured yet. Set OLLAMA_URL (local Ollama), GPU_OLLAMA_URL (cloud GPU) or AI_API_KEY + AI_MODEL."
    );
  }
  return chain;
}

function rpmLimit(): number {
  const raw = Number(process.env.AI_RPM_LIMIT);
  if (Number.isFinite(raw) && raw >= 1) return Math.floor(raw);
  return DEFAULT_RPM_LIMIT;
}

// ------------------------------------------------------------
// Per-provider runtime state (in-memory, per server instance):
// RPM window, cooldown, last error code and request counters.
// ------------------------------------------------------------

type ProviderRuntime = {
  windowStart: number;
  requestsInWindow: number;
  requestsTotal: number;
  cooldownUntil: number | null;
  cooldownReason: string | null;
  lastErrorCode: string | null;
};

const runtimeBySlot = new Map<number, ProviderRuntime>();

function getRuntime(slot: number): ProviderRuntime {
  let state = runtimeBySlot.get(slot);
  if (!state) {
    state = {
      windowStart: Date.now(),
      requestsInWindow: 0,
      requestsTotal: 0,
      cooldownUntil: null,
      cooldownReason: null,
      lastErrorCode: null,
    };
    runtimeBySlot.set(slot, state);
  }
  return state;
}

/** Debug info for /dashboard/debug — never includes keys. */
export type ProviderDebugInfo = {
  slot: number;
  configured: boolean;
  /** Friendly name for the Ollama slots, null for the API slots. */
  label: string | null;
  type: string | null;
  model: string | null;
  keySet: boolean;
  lastErrorCode: string | null;
  cooldownActive: boolean;
  cooldownUntil: string | null;
  cooldownReason: string | null;
  requestsTotal: number;
  requestsThisWindow: number;
};

function slotLabel(slot: number): string | null {
  if (slot === 10) return "Ollama local";
  if (slot === 11) return "GPU cloud";
  return null;
}

export function getProviderDebugInfo(): ProviderDebugInfo[] {
  let chain: AiProviderSlot[] = [];
  try {
    chain = getProviderChain();
  } catch {
    // Config error (missing every provider or half-configured P2):
    // report what we can without failing the debug page. The existing
    // AI configuration card shows the actual config error message.
    const rows: ProviderDebugInfo[] = [];
    if (process.env.OLLAMA_URL) {
      rows.push(blankDebug(10, true, true));
    }
    if (process.env.GPU_OLLAMA_URL) {
      rows.push(blankDebug(11, true, true));
    }
    if (process.env.AI_API_KEY && process.env.AI_MODEL) {
      rows.push(blankDebug(1, true));
    }
    if (process.env.AI_P2_API_KEY) {
      rows.push(blankDebug(2, true));
    }
    return rows;
  }

  return chain.map((slot) => {
    const state = getRuntime(slot.slot);
    const now = Date.now();
    return {
      slot: slot.slot,
      configured: true,
      label: slotLabel(slot.slot),
      type: slot.type,
      model: slot.model,
      keySet: Boolean(slot.apiKey),
      lastErrorCode: state.lastErrorCode,
      cooldownActive: Boolean(state.cooldownUntil && state.cooldownUntil > now),
      cooldownUntil:
        state.cooldownUntil && state.cooldownUntil > now
          ? new Date(state.cooldownUntil).toISOString()
          : null,
      cooldownReason: state.cooldownReason,
      requestsTotal: state.requestsTotal,
      requestsThisWindow: state.requestsInWindow,
    };
  });
}

function blankDebug(
  slot: number,
  keySet: boolean,
  configured = false
): ProviderDebugInfo {
  const state = getRuntime(slot);
  return {
    slot,
    configured,
    label: slotLabel(slot),
    type: null,
    model: null,
    keySet,
    lastErrorCode: state.lastErrorCode,
    cooldownActive: false,
    cooldownUntil: null,
    cooldownReason: null,
    requestsTotal: state.requestsTotal,
    requestsThisWindow: state.requestsInWindow,
  };
}

function isCoolingDown(slot: number): boolean {
  const state = getRuntime(slot);
  return Boolean(state.cooldownUntil && state.cooldownUntil > Date.now());
}

/** Milliseconds to wait for this provider's RPM window (0 = can send). */
function rpmWaitMs(slot: number): number {
  const state = getRuntime(slot);
  const now = Date.now();
  if (now - state.windowStart >= 60_000) {
    state.windowStart = now;
    state.requestsInWindow = 0;
  }
  if (state.requestsInWindow < rpmLimit()) return 0;
  return Math.max(0, state.windowStart + 60_000 - now);
}

function markRequestSent(slot: number): void {
  const state = getRuntime(slot);
  state.requestsInWindow += 1;
  state.requestsTotal += 1;
}

function markProviderError(slot: number, code: string): void {
  getRuntime(slot).lastErrorCode = code;
}

/**
 * Put a provider on cooldown after a rate/quota failure.
 * - Exhausted daily quota (402, or 429 with quota wording): the rest
 *   of the (UTC) day.
 * - Other 429s: the provider's Retry-After hint (default 60s).
 */
function applyCooldown(
  slot: number,
  err: AiRequestError,
  errorBodyText: string
): void {
  const state = getRuntime(slot);
  const now = Date.now();
  const quotaWording = /quota|credit|billing|insufficient|exceeded your current allowance|resource has been exhausted/i;

  if (
    err.quotaExhausted ||
    err.status === 402 ||
    (err.status === 429 && quotaWording.test(errorBodyText))
  ) {
    const endOfDay = Date.UTC(
      new Date().getUTCFullYear(),
      new Date().getUTCMonth(),
      new Date().getUTCDate() + 1
    );
    state.cooldownUntil = endOfDay;
    state.cooldownReason = "daily quota exhausted";
    return;
  }

  if (err.status === 429) {
    const wait = err.retryAfterMs && err.retryAfterMs > 0 ? err.retryAfterMs : 60_000;
    const until = Math.min(now + wait, now + 24 * 60 * 60 * 1000);
    state.cooldownUntil = until;
    state.cooldownReason = "rate limited";
  }
}

// ------------------------------------------------------------
// Rate limiting (ai_usage table: one row per AI REQUEST,
// RLS limits every query to the caller's own rows)
// ------------------------------------------------------------

async function checkRateLimit(
  supabase: SupabaseClient,
  userId: string
): Promise<string | null> {
  const now = Date.now();
  const hourAgo = new Date(now - 60 * 60 * 1000).toISOString();
  const dayAgo = new Date(now - 24 * 60 * 60 * 1000).toISOString();

  // Plan's daily allowance (cached ~1 min per user).
  const dailyLimit = await getDailyAiLimit(supabase, userId);

  const [hourRes, dayRes] = await Promise.all([
    supabase
      .from("ai_usage")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .gte("created_at", hourAgo),
    supabase
      .from("ai_usage")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .gte("created_at", dayAgo),
  ]);

  // If counting fails the limit cannot be verified — fail closed and
  // do not call the AI (503, surfaced as "try again in a moment").
  if (hourRes.error || dayRes.error) {
    throw new AiUnavailableError("Please try again in a moment.");
  }

  if ((hourRes.count ?? 0) >= AI_HOURLY_LIMIT) {
    return `You have reached the AI limit of ${AI_HOURLY_LIMIT} requests per hour. Please try again in a little while.`;
  }
  if ((dayRes.count ?? 0) >= dailyLimit) {
    return `You have reached your plan's daily AI limit of ${dailyLimit} requests. Please try again tomorrow, or upgrade your plan for a higher limit.`;
  }
  return null;
}

// ------------------------------------------------------------
// Per-plan daily AI limit (plans.limits.ai_requests_per_day),
// cached about a minute per user so each AI request does not pay
// two extra queries. Any failure falls back to the conservative
// starter limit — never unlimited.
// ------------------------------------------------------------
const dailyLimitCache = new Map<string, { limit: number; at: number }>();
const DAILY_LIMIT_CACHE_MS = 60_000;
const UNLIMITED = 2147483647;

async function getDailyAiLimit(
  supabase: SupabaseClient,
  userId: string
): Promise<number> {
  const now = Date.now();
  const cached = dailyLimitCache.get(userId);
  if (cached && now - cached.at < DAILY_LIMIT_CACHE_MS) {
    return cached.limit;
  }

  let limit = DEFAULT_LIMITS.ai_requests_per_day ?? AI_DAILY_LIMIT;
  try {
    const { data: profile } = await supabase
      .from("profiles")
      .select("plan")
      .eq("id", userId)
      .maybeSingle();
    const planKey =
      typeof profile?.plan === "string" && profile.plan ? profile.plan : "starter";

    const { data: plan } = await supabase
      .from("plans")
      .select("limits")
      .eq("key", planKey)
      .maybeSingle();

    if (plan) {
      const raw = (plan.limits as Record<string, unknown> | null)
        ?.ai_requests_per_day;
      if (raw === null) {
        limit = UNLIMITED; // admin set the plan to unlimited
      } else if (
        typeof raw === "number" &&
        Number.isFinite(raw) &&
        raw > 0
      ) {
        limit = Math.floor(raw);
      }
    }
  } catch {
    // keep the conservative fallback
  }

  dailyLimitCache.set(userId, { limit, at: now });
  return limit;
}

async function recordAiCall(
  supabase: SupabaseClient,
  userId: string,
  route: string
): Promise<void> {
  try {
    await supabase.from("ai_usage").insert({ user_id: userId, route });
  } catch {
    // Recording must never break the AI call itself.
  }
}

// ------------------------------------------------------------
// Tolerant JSON extraction (free models wrap output in thinking
// blocks and markdown fences before the JSON)
// ------------------------------------------------------------

/**
 * Strips <thinking>/[[thinking]]/reasoning blocks and ``` fences.
 */
function stripWrapping(raw: string): string {
  let text = raw.trim();

  // Model reasoning blocks — braces inside them must not confuse the scan.
  text = text
    .replace(/<think(?:ing)?\b[\s\S]*?<\/think(?:ing)?\s*>/gi, "")
    .replace(/\[\[\/?thinking\]\][\s\S]*?\[\[\/?thinking\]\]/gi, "")
    .replace(/<reasoning\b[\s\S]*?<\/reasoning\s*>/gi, "");

  // Markdown code fences (```json ... ```).
  text = text.replace(/```[a-zA-Z0-9_-]*/g, "");
  return text;
}

function scanBalanced(text: string, open: string, close: string): string {
  const start = text.indexOf(open);
  if (start === -1) {
    throw new Error("No JSON found in the AI response.");
  }

  let depth = 0;
  let inString = false;
  let escaped = false;
  for (let i = start; i < text.length; i++) {
    const char = text[i];
    if (inString) {
      if (escaped) {
        escaped = false;
      } else if (char === "\\") {
        escaped = true;
      } else if (char === '"') {
        inString = false;
      }
      continue;
    }
    if (char === '"') {
      inString = true;
    } else if (char === open) {
      depth++;
    } else if (char === close) {
      depth--;
      if (depth === 0) {
        return text.slice(start, i + 1);
      }
    }
  }

  throw new Error("No JSON found in the AI response.");
}

/**
 * Returns the first JSON object found in the text.
 * Strips <thinking>/[[thinking]]/reasoning blocks and ``` fences first.
 * Throws if no JSON object can be found.
 */
export function extractJsonObject(raw: string): string {
  return scanBalanced(stripWrapping(raw), "{", "}");
}

/**
 * Same tolerant extraction for the batched answer format — returns
 * the first JSON ARRAY in the text (used by /api/questions/answer).
 */
export function extractJsonArray(raw: string): string {
  return scanBalanced(stripWrapping(raw), "[", "]");
}

// ------------------------------------------------------------
// Provider calls
// ------------------------------------------------------------

async function fetchWithTimeout(url: string, init: RequestInit) {
  try {
    return await fetch(url, {
      ...init,
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
  } catch (err) {
    const timedOut =
      err instanceof DOMException &&
      (err.name === "TimeoutError" || err.name === "AbortError");
    throw new AiRequestError(
      timedOut
        ? "The AI service timed out."
        : "The AI service could not be reached.",
      { retryable: true, detail: timedOut ? "timeout" : "network" }
    );
  }
}

/** Retry-After in ms (seconds or HTTP-date), best effort. */
function parseRetryAfterMs(response: Response): number | null {
  const raw = response.headers.get("retry-after");
  if (raw) {
    const seconds = Number(raw);
    if (Number.isFinite(seconds)) return Math.max(0, seconds * 1000);
    const date = Date.parse(raw);
    if (!Number.isNaN(date)) return Math.max(0, date - Date.now());
  }
  // Some OpenAI-compatible providers use x-ratelimit-reset-*.
  const reset = response.headers.get("x-ratelimit-reset-requests");
  if (reset) {
    const seconds = Number(reset.replace(/s$/i, ""));
    if (Number.isFinite(seconds)) return Math.max(0, seconds * 1000);
    const date = Date.parse(reset);
    if (!Number.isNaN(date)) return Math.max(0, date - Date.now());
  }
  return null;
}

/**
 * Builds the AiRequestError for a non-OK provider response. Reads the
 * Retry-After hint first (headers are gone once the body is read) and
 * redacts API keys from the body snippet kept for server logs.
 */
async function providerError(
  response: Response,
  apiKeys: string[]
): Promise<{ error: AiRequestError; bodyText: string }> {
  const retryAfterMs = parseRetryAfterMs(response);
  const retryable = response.status === 429 || response.status >= 500;

  // Capture a short provider-side message for server logs. The body may
  // echo request details, so redact API keys and never keep more than
  // 300 chars. Reading the body can fail; that is fine.
  let detail = "";
  let bodyText = "";
  try {
    const text = await response.text();
    bodyText = text;
    try {
      const parsed = JSON.parse(text);
      detail = String(parsed?.error?.message ?? parsed?.message ?? "");
    } catch {
      detail = text.slice(0, 200);
    }
  } catch {
    // No body available.
  }
  for (const key of apiKeys) {
    if (key) detail = detail.split(key).join("[redacted]");
  }
  detail = detail.slice(0, 300).trim();

  const quotaExhausted = response.status === 402;

  return {
    error: new AiRequestError("The AI service could not be reached.", {
      status: response.status,
      retryable,
      detail,
      retryAfterMs: retryAfterMs ?? undefined,
      quotaExhausted,
    }),
    bodyText,
  };
}

async function callAnthropic(
  provider: AiProviderSlot,
  model: string,
  system: string,
  prompt: string,
  maxTokens: number,
  temperature: number
): Promise<string> {
  const response = await fetchWithTimeout(ANTHROPIC_URL, {
    method: "POST",
    headers: {
      "x-api-key": provider.apiKey,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model,
      max_tokens: maxTokens,
      temperature,
      system,
      messages: [{ role: "user", content: prompt }],
    }),
  });

  if (!response.ok) {
    const { error } = await providerError(response, [provider.apiKey]);
    throw error;
  }

  const data = await response.json();
  const text: string | undefined = data?.content?.find(
    (block: { type: string }) => block.type === "text"
  )?.text;

  if (!text) {
    throw new AiRequestError("The AI returned an empty response.");
  }
  return text;
}

async function callOpenRouter(
  provider: AiProviderSlot,
  models: string[],
  attempt: number,
  system: string,
  prompt: string,
  maxTokens: number,
  temperature: number
): Promise<string> {
  const response = await fetchWithTimeout(OPENROUTER_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${provider.apiKey}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      // OpenRouter fails over to the next model automatically.
      // First attempt: [model, ...fallbacks]; later attempts start
      // at the next model so app retries and OpenRouter agree.
      models: models.slice(attempt),
      max_tokens: maxTokens,
      temperature,
      messages: [
        { role: "system", content: system },
        { role: "user", content: prompt },
      ],
    }),
  });

  if (!response.ok) {
    const { error } = await providerError(response, [provider.apiKey]);
    throw error;
  }

  const data = await response.json();
  const text: string | undefined = data?.choices?.[0]?.message?.content;

  if (!text) {
    throw new AiRequestError("The AI returned an empty response.");
  }
  return text;
}

async function callGemini(
  provider: AiProviderSlot,
  model: string,
  system: string,
  prompt: string,
  maxTokens: number,
  temperature: number
): Promise<string> {
  const base = (provider.baseUrl ?? GEMINI_BASE_URL).replace(/\/+$/, "");
  const response = await fetchWithTimeout(
    `${base}/models/${encodeURIComponent(model)}:generateContent`,
    {
      method: "POST",
      headers: {
        "x-goog-api-key": provider.apiKey,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: system }] },
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: {
          maxOutputTokens: maxTokens,
          temperature,
        },
      }),
    }
  );

  if (!response.ok) {
    const { error } = await providerError(response, [provider.apiKey]);
    throw error;
  }

  const data = await response.json();
  const parts: { text?: string }[] =
    data?.candidates?.[0]?.content?.parts ?? [];
  const text = parts.map((part) => part.text ?? "").join("");

  if (!text) {
    throw new AiRequestError("The AI returned an empty response.");
  }
  return text;
}

/** Normalizes a base URL and appends the OpenAI chat path. */
function openaiCompatibleUrl(baseUrl: string): string {
  let base = baseUrl.replace(/\/+$/, "");
  if (!/\/chat\/completions$/i.test(base)) {
    if (!/\/v1$/i.test(base)) base += "/v1";
    base += "/chat/completions";
  }
  return base;
}

async function callOpenAiCompatible(
  provider: AiProviderSlot,
  model: string,
  system: string,
  prompt: string,
  maxTokens: number,
  temperature: number
): Promise<string> {
  const baseUrl = provider.baseUrl ?? "";
  if (!baseUrl) {
    throw new AiConfigError(
      "AI_P2_BASE_URL is required when AI_P2_TYPE is openai-compatible."
    );
  }

  const response = await fetchWithTimeout(openaiCompatibleUrl(baseUrl), {
    method: "POST",
    headers: {
      Authorization: `Bearer ${provider.apiKey}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model,
      max_tokens: maxTokens,
      temperature,
      messages: [
        { role: "system", content: system },
        { role: "user", content: prompt },
      ],
    }),
  });

  if (!response.ok) {
    const { error } = await providerError(response, [provider.apiKey]);
    throw error;
  }

  const data = await response.json();
  const text: string | undefined = data?.choices?.[0]?.message?.content;

  if (!text) {
    throw new AiRequestError("The AI returned an empty response.");
  }
  return text;
}

async function callProvider(
  provider: AiProviderSlot,
  models: string[],
  attempt: number,
  system: string,
  prompt: string,
  maxTokens: number,
  temperature: number
): Promise<string> {
  const model = models[Math.min(attempt, models.length - 1)];
  switch (provider.type) {
    case "anthropic":
      return callAnthropic(provider, model, system, prompt, maxTokens, temperature);
    case "gemini":
      return callGemini(provider, model, system, prompt, maxTokens, temperature);
    case "openai-compatible":
      return callOpenAiCompatible(
        provider,
        model,
        system,
        prompt,
        maxTokens,
        temperature
      );
    case "openrouter":
      return callOpenRouter(
        provider,
        models,
        attempt,
        system,
        prompt,
        maxTokens,
        temperature
      );
  }
}

// ------------------------------------------------------------
// Public entry points
// config check -> fail-closed rate limit -> provider chain with
// 3 attempts / backoff / model fallbacks -> ONE ai_usage row per
// AI request (recorded lazily, only when a request is actually sent)
// ------------------------------------------------------------

export type CompleteAiOptions = {
  supabase: SupabaseClient;
  userId: string;
  /** Where the call comes from, stored in ai_usage.route. */
  route: string;
  system: string;
  prompt: string;
  maxTokens: number;
  /** Sampling temperature — defaults to a low value (factual answers). */
  temperature?: number;
};

type ExecuteResult = { text: string; parsed: unknown };

async function execute(
  options: CompleteAiOptions,
  parse?: (text: string) => unknown
): Promise<ExecuteResult> {
  // Fail fast if NO provider is configured (Ollama slots count).
  getProviderChain();

  const limitedMessage = await checkRateLimit(options.supabase, options.userId);
  if (limitedMessage) {
    throw new AiRateLimitError(limitedMessage);
  }

  const chain = getProviderChain();
  const allKeys = chain.map((provider) => provider.apiKey);
  const deadline = Date.now() + EXEC_TIME_BUDGET_MS;
  const temperature = options.temperature ?? DEFAULT_TEMPERATURE;

  let lastError: unknown = null;
  // One ai_usage row per AI REQUEST: recorded just before the first
  // HTTP request actually goes out (retries/providers don't add rows,
  // and an "every provider cooling down" stop records nothing).
  let usageRecorded = false;

  const ensureUsageRecorded = async () => {
    if (!usageRecorded) {
      usageRecorded = true;
      await recordAiCall(options.supabase, options.userId, options.route);
    }
  };

  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    if (attempt > 0) {
      await sleep(RETRY_BACKOFF_MS[attempt - 1]);
    }
    if (Date.now() >= deadline) break;

    // Every provider on cooldown: if the earliest one recovers within
    // the remaining budget, wait for it (short 429s); otherwise stop
    // cleanly with the message the UI shows above the remaining
    // pending questions.
    if (chain.every((provider) => isCoolingDown(provider.slot))) {
      const earliest = Math.min(
        ...chain.map((provider) => getRuntime(provider.slot).cooldownUntil ?? 0)
      );
      const wait = earliest - Date.now();
      if (wait > 0 && Date.now() + wait < deadline) {
        await sleep(wait);
      } else {
        throw new AiRateLimitError(AI_LIMIT_REACHED_MESSAGE);
      }
    }

    for (const provider of chain) {
      if (isCoolingDown(provider.slot)) continue;
      if (Date.now() >= deadline) break;

      // RPM throttle: wait out the window unless the wait would eat
      // too much of the route's time budget.
      const wait = rpmWaitMs(provider.slot);
      if (wait > 0) {
        if (wait > MAX_RPM_WAIT_MS || Date.now() + wait >= deadline) {
          markProviderError(provider.slot, "rpm-throttled");
          lastError ??= new AiRequestError(
            "The AI service is busy. Please try again shortly.",
            { retryable: true, detail: "rpm-throttled" }
          );
          continue;
        }
        await sleep(wait);
      }

      try {
        await ensureUsageRecorded();
        const text = await callProvider(
          provider,
          slotModels(provider),
          attempt,
          options.system,
          options.prompt,
          options.maxTokens,
          temperature
        );

        if (!parse) {
          return { text, parsed: undefined };
        }

        try {
          return { text, parsed: parse(text) };
        } catch (err) {
          // Unusable output: mark and move to the NEXT provider
          // immediately (no backoff between providers).
          markProviderError(provider.slot, "bad-output");
          lastError = err;
        }
      } catch (err) {
        if (err instanceof AiConfigError) throw err;
        if (err instanceof AiRequestError) {
          markProviderError(
            provider.slot,
            err.detail ?? (err.status ? String(err.status) : "error")
          );
          if (err.status === 429 || err.status === 402) {
            // Body text is needed for the quota wording check; re-read
            // is impossible after consumption, so the detail captured
            // by providerError is used as a fallback.
            applyCooldown(provider.slot, err, err.detail ?? "");
          }
          lastError = err;
        } else {
          markProviderError(provider.slot, "error");
          lastError = err;
        }
        // On any provider failure (429/402/5xx/timeout/bad output)
        // the chain moves to the next provider immediately.
      }
    }
  }

  if (lastError === null) {
    // Nothing was ever attempted (all providers cooling down or the
    // budget was exhausted before the first call).
    if (chain.every((provider) => isCoolingDown(provider.slot))) {
      throw new AiRateLimitError(AI_LIMIT_REACHED_MESSAGE);
    }
    throw new AiRequestError("The AI service could not be reached.", {
      retryable: true,
    });
  }

  if (
    lastError instanceof AiRequestError ||
    lastError instanceof AiConfigError ||
    lastError instanceof AiRateLimitError ||
    lastError instanceof AiUnavailableError
  ) {
    throw lastError;
  }
  throw lastError instanceof Error
    ? lastError
    : new AiRequestError("The AI service could not be reached.");
}

/** Plain-text completion (used by /api/ask). */
export async function completeAi(options: CompleteAiOptions): Promise<string> {
  const { text } = await execute(options);
  return text;
}

/**
 * Completion that must produce parseable JSON (used by
 * /api/questions/answer). `parse` runs inside the retry loop, so
 * unparseable output triggers a retry with the next model/provider.
 */
export async function completeAiJson<T>(
  options: CompleteAiOptions & { parse: (text: string) => T }
): Promise<T> {
  const { parse, ...rest } = options;
  const { parsed } = await execute(rest, parse);
  return parsed as T;
}
