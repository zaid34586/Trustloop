import type { SupabaseClient } from "@supabase/supabase-js";

// ============================================================
// Shared AI helper. Every AI call in the app goes through
// completeAi() so provider selection, configuration errors and
// rate limiting live in exactly one place.
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
export class AiRequestError extends Error {}

const ANTHROPIC_URL = "https://api.anthropic.com/v1/messages";
const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";

export const AI_HOURLY_LIMIT = 60;
export const AI_DAILY_LIMIT = 300;

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

// ------------------------------------------------------------
// Rate limiting (ai_usage table: one row per AI call,
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
// Provider calls
// ------------------------------------------------------------

async function callAnthropic(
  config: AiConfig,
  system: string,
  prompt: string,
  maxTokens: number
): Promise<string> {
  const response = await fetch(ANTHROPIC_URL, {
    method: "POST",
    headers: {
      "x-api-key": config.apiKey,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: config.model,
      max_tokens: maxTokens,
      system,
      messages: [{ role: "user", content: prompt }],
    }),
  });

  if (!response.ok) {
    throw new AiRequestError("The AI service could not be reached.");
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
  system: string,
  prompt: string,
  maxTokens: number
): Promise<string> {
  const response = await fetch(OPENROUTER_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${config.apiKey}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: config.model,
      max_tokens: maxTokens,
      messages: [
        { role: "system", content: system },
        { role: "user", content: prompt },
      ],
    }),
  });

  if (!response.ok) {
    throw new AiRequestError("The AI service could not be reached.");
  }

  const data = await response.json();
  const text: string | undefined = data?.choices?.[0]?.message?.content;

  if (!text) {
    throw new AiRequestError("The AI returned an empty response.");
  }
  return text;
}

// ------------------------------------------------------------
// Public entry point: config check -> rate limit -> record -> call
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

export async function completeAi(options: CompleteAiOptions): Promise<string> {
  const config = getAiConfig();

  const limitedMessage = await checkRateLimit(options.supabase, options.userId);
  if (limitedMessage) {
    throw new AiRateLimitError(limitedMessage);
  }

  await recordAiCall(options.supabase, options.userId, options.route);

  if (config.provider === "openrouter") {
    return callOpenRouter(
      config,
      options.system,
      options.prompt,
      options.maxTokens
    );
  }
  return callAnthropic(
    config,
    options.system,
    options.prompt,
    options.maxTokens
  );
}
