import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  ensureGpuRunning,
  idleMinutesBeforeStop,
  ollamaConfig,
  probeOllama,
  touchActivity,
} from "@/lib/gpu";

export const maxDuration = 15;

/**
 * POST /api/ai/warmup — called (fire-and-forget) when a user
 * uploads a document, confirms a questionnaire or starts a Generate
 * run, and by the AI routes themselves.
 *
 * It refreshes the shared activity heartbeat (so the idle auto-stop
 * timer restarts) and boots the GPU Ollama instance when its
 * endpoint is down. With no AWS credentials configured yet it
 * answers "would-start" instead of failing — the code-first phase.
 */
export async function POST() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not logged in." }, { status: 401 });
  }

  await touchActivity(supabase);

  const local = ollamaConfig();
  const localHealth = local.url ? await probeOllama(local.url) : null;
  const gpu = await ensureGpuRunning(supabase);

  return NextResponse.json({
    ok: true,
    local: {
      configured: Boolean(local.url),
      url: local.url,
      healthy: localHealth ? localHealth.healthy : null,
      detail: localHealth?.detail,
    },
    gpu,
    idleMinutesBeforeStop: idleMinutesBeforeStop(),
  });
}
