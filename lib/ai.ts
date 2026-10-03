import type { SupabaseClient } from "@supabase/supabase-js";

// ============================================================
// Shared AI helper. Every AI call in the app goes through
// completeAi() / completeAiJson() so provider selection,
// configuration errors, rate limiting, model fallbacks and
// retries live in exactly one place.
//
// This module is server-side only (imported by API routes).
// AI_API_KEY is read from process.env here and is never sent to
// the browser.
// ============================================================

export type AiProvider = "anthropic" | "openrouter";

export type AiConfig = {
  provider: AiProvider;
  apiKey: string;
  model: string;
};

/** Missing/invalid AI environment variables. */
export class AiConfigError extends Error {}

/** The user exceeded the hourly/daily AI limit (maps to HTTP 429). */
export class AiRateLimitError extends Error {}

/** The AI provider could not be reached or returned an error. */
export class AiRequestError extends Error {
  /** HTTP status of the provider response, when there was one. */
  readonly status?: number;
  /** Whether this failure is worth retrying with the next model. */
  readonly retryable: boolean;

  constructor(
    message: string,
    options: { status?: number; retryable?: boolean } = {}
  ) {
    super(message);
    this.name = "AiRequestError";
    this.status = options.status;
    this.retryable = options.retryable ?? false;
  }
}

const ANTHROPIC_URL = "https://api.anthropic.com/v1/messages";
const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";

export const AI_HOURLY_LIMIT = 60;
export const AI_DAILY_LIMIT = 300;

// 1 initial attempt + at most 2 retries, each on the next model.
const MAX_ATTEMPTS = 3;
// Per-attempt timeout so a hung request becomes a retryable failure
// and never exceeds the route's maxDuration (60s).
const REQUEST_TIMEOUT_MS = 30_000;

// ------------------------------------------------------------
// Configuration
// ------------------------------------------------------------

export function getAiConfig(): AiConfig {
  const provider = (process.env.AI_PROVIDER ?? "anthropic").trim().toLowerCase();
  if (provider !== "anthropic" && provider !== "openrouter") {
    throw new AiConfigError(
      'AI is not configured correctly. AI_PROVIDER must be "anthropic" or "openrouter".'
    );
  }

  const apiKey = process.env.AI_API_KEY;
  const model = process.env.AI_MODEL;
  if (!apiKey || !model) {
    throw new AiConfigError(
      "AI is not configured yet. Please set AI_API_KEY and AI_MODEL."
    );
  }

  return { provider, apiKey, model };
}

/**
 * [AI_MODEL, ...AI_MODEL_FALLBACKS] — fallbacks come from the optional
 * comma-separated AI_MODEL_FALLBACKS env var (may be empty).
 */
function getModelList(config: AiConfig): string[] {
  const fallbacks = (process.env.AI_MODEL_FALLBACKS ?? "")
    .split(",")
    .map((id) => id.trim())
    .filter((id) => id.length > 0 && id !== config.model);
  return [config.model, ...fallbacks];
}

// ------------------------------------------------------------
// Rate limiting (ai_usage table: one row per user request,
// RLS limits every query to the caller's own rows)
// ------------------------------------------------------------

async function checkRateLimit(
  supabase: SupabaseClient,
  userId: string
): Promise<string | null> {
  const now = Date.now();
  const hourAgo = new Date(now - 60 * 60 * 1000).toISOString();
  const dayAgo = new Date(now - 24 * 60 * 60 * 1000).toISOString();

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

  // If counting fails we cannot enforce the limit; do not block the user.
  if (hourRes.error || dayRes.error) return null;

  if ((hourRes.count ?? 0) >= AI_HOURLY_LIMIT) {
    return `You have reached the AI limit of ${AI_HOURLY_LIMIT} requests per hour. Please try again in a little while.`;
  }
  if ((dayRes.count ?? 0) >= AI_DAILY_LIMIT) {
    return `You have reached the AI limit of ${AI_DAILY_LIMIT} requests per day. Please try again later.`;
  }
  return null;
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
 * Returns the first JSON object found in the text.
 * Strips <thinking>/[[thinking]]/reasoning blocks and ``` fences first.
 * Throws if no JSON object can be found.
 */
export function extractJsonObject(raw: string): string {
  let text = raw.trim();

  // Model reasoning blocks — braces inside them must not confuse the scan.
  text = text
    .replace(/<think(?:ing)?\b[\s\S]*?<\/think(?:ing)?\s*>/gi, "")
    .replace(/\[\[\/?thinking\]\][\s\S]*?\[\[\/?thinking\]\]/gi, "")
    .replace(/<reasoning\b[\s\S]*?<\/reasoning\s*>/gi, "");

  // Markdown code fences (```json ... ```).
  text = text.replace(/```[a-zA-Z0-9_-]*/g, "");

  // First balanced {...} object, honouring strings and escapes.
  const start = text.indexOf("{");
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
    } else if (char === "{") {
      depth++;
    } else if (char === "}") {
      depth--;
      if (depth === 0) {
        return text.slice(start, i + 1);
      }
    }
  }

  throw new Error("No JSON found in the AI response.");
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
  } catch {
    // Network failure or timeout — worth one retry with the next model.
    throw new AiRequestError("The AI service could not be reached.", {
      retryable: true,
    });
  }
}

function providerError(response: Response): AiRequestError {
  const retryable = response.status === 429 || response.status >= 500;
  return new AiRequestError("The AI service could not be reached.", {
    status: response.status,
    retryable,
  });
}

async function callAnthropic(
  config: AiConfig,
  model: string,
  system: string,
  prompt: string,
  maxTokens: number
): Promise<string> {
  const response = await fetchWithTimeout(ANTHROPIC_URL, {
    method: "POST",
    headers: {
      "x-api-key": config.apiKey,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model,
      max_tokens: maxTokens,
      system,
      messages: [{ role: "user", content: prompt }],
    }),
  });

  if (!response.ok) {
    throw providerError(response);
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
  config: AiConfig,
  models: string[],
  attempt: number,
  system: string,
  prompt: string,
  maxTokens: number
): Promise<string> {
  const response = await fetchWithTimeout(OPENROUTER_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${config.apiKey}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      // OpenRouter fails over to the next model automatically.
      // First attempt: [AI_MODEL, ...fallbacks]; later attempts start
      // at the next model so app retries and OpenRouter agree.
      models: models.slice(attempt),
      max_tokens: maxTokens,
      messages: [
        { role: "system", content: system },
        { role: "user", content: prompt },
      ],
    }),
  });

  if (!response.ok) {
    throw providerError(response);
  }

  const data = await response.json();
  const text: string | undefined = data?.choices?.[0]?.message?.content;

  if (!text) {
    throw new AiRequestError("The AI returned an empty response.");
  }
  return text;
}

// ------------------------------------------------------------
// Public entry points
// config check -> rate limit -> ONE ai_usage row -> call with
// up to 2 retries on the next model
// ------------------------------------------------------------

export type CompleteAiOptions = {
  supabase: SupabaseClient;
  userId: string;
  /** Where the call comes from, stored in ai_usage.route. */
  route: string;
  system: string;
  prompt: string;
  maxTokens: number;
};

type ExecuteResult = { text: string; parsed: unknown };

async function execute(
  options: CompleteAiOptions,
  parse?: (text: string) => unknown
): Promise<ExecuteResult> {
  const config = getAiConfig();

  const limitedMessage = await checkRateLimit(options.supabase, options.userId);
  if (limitedMessage) {
    throw new AiRateLimitError(limitedMessage);
  }

  // Exactly one row per user request — retries below do not add rows.
  await recordAiCall(options.supabase, options.userId, options.route);

  const models = getModelList(config);
  const attempts = Math.min(models.length, MAX_ATTEMPTS);

  for (let attempt = 0; attempt < attempts; attempt++) {
    let text: string;
    try {
      text =
        config.provider === "openrouter"
          ? await callOpenRouter(
              config,
              models,
              attempt,
              options.system,
              options.prompt,
              options.maxTokens
            )
          : await callAnthropic(
              config,
              models[attempt],
              options.system,
              options.prompt,
              options.maxTokens
            );
    } catch (err) {
      // Retry 429 / 5xx / timeouts with the next model; never retry
      // other errors (e.g. a bad API key).
      const retryable = err instanceof AiRequestError && err.retryable;
      if (!retryable || attempt + 1 >= attempts) {
        throw err;
      }
      continue;
    }

    if (!parse) {
      return { text, parsed: undefined };
    }

    try {
      return { text, parsed: parse(text) };
    } catch (err) {
      // Output that cannot be parsed as the expected JSON — retry with
      // the next model, or surface the parsing error on the last try.
      if (attempt + 1 >= attempts) {
        throw err;
      }
    }
  }

  // Unreachable: the loop either returns or throws.
  throw new AiRequestError("The AI service could not be reached.");
}

/** Plain-text completion (used by /api/ask). */
export async function completeAi(options: CompleteAiOptions): Promise<string> {
  const { text } = await execute(options);
  return text;
}

/**
 * Completion that must produce parseable JSON (used by
 * /api/questions/answer). `parse` runs inside the retry loop, so
 * unparseable output triggers a retry with the next model.
 */
export async function completeAiJson<T>(
  options: CompleteAiOptions & { parse: (text: string) => T }
): Promise<T> {
  const { parse, ...rest } = options;
  const { parsed } = await execute(rest, parse);
  return parsed as T;
}
