import { createClient as createSupabaseClient } from "@supabase/supabase-js";

/**
 * Server-side service-role client for the cron route
 * (/api/cron/ai-idle), which runs without a user session.
 * Returns null when the env vars are not set yet (the route then
 * answers 503 with a clear message instead of failing silently).
 *
 * Never expose SUPABASE_SERVICE_ROLE_KEY to the browser — this file
 * must only be imported from server code (API routes).
 */
export function createServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createSupabaseClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
