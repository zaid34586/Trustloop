import type { SupabaseClient } from "@supabase/supabase-js";
import {
  EC2Client,
  StartInstancesCommand,
  StopInstancesCommand,
} from "@aws-sdk/client-ec2";

// ============================================================
// Ollama / GPU lifecycle (Phase 4 — code first, connections later).
//
// Two AI "own" slots live in front of the API providers
// (see getProviderChain in lib/ai.ts):
//   slot 10: local Ollama     — OLLAMA_URL (dev machine, no start/stop)
//   slot 11: cloud GPU (AWS)  — GPU_OLLAMA_URL, EC2 on-demand.
//
// Auto behaviour the app provides here:
//   - activity (document upload, questionnaire confirm, Generate,
//     any AI call) -> touchActivity() refreshes the shared
//     heartbeat AND ensureGpuRunning() boots the instance if its
//     Ollama endpoint is down;
//   - /api/cron/ai-idle calls stopGpuIfIdle(): no activity for
//     AI_IDLE_MINUTES (default 10) -> StopInstances.
//
// Everything degrades gracefully in the "connections not set up
// yet" phase: missing env vars are reported as
// "not-configured"/"would-start" instead of throwing, so the whole
// flow can be tested with the server OFF.
//
// This module is server-side only (API routes + debug page).
// ============================================================

export const IDLE_STOP_DEFAULT_MINUTES = 10;

/** Where the heartbeat lives (one shared row for the whole app). */
const LIFECYCLE_KEY = "gpu";

// Per-process fallback when the DB is unreachable — keeps local
// idle reasoning alive without persisting anything.
let memoryLastActivity: Date | null = null;
let memoryState = "stopped";

// ------------------------------------------------------------
// Config
// ------------------------------------------------------------

export function idleMinutesBeforeStop(): number {
  const raw = Number(process.env.AI_IDLE_MINUTES);
  // Small values (even fractions) are allowed on purpose so the
  // 10-minute auto-stop can be tested quickly.
  if (Number.isFinite(raw) && raw >= 0.01) return raw;
  return IDLE_STOP_DEFAULT_MINUTES;
}

export function ollamaConfig(): { url: string | null; model: string } {
  const url = (process.env.OLLAMA_URL ?? "").trim().replace(/\/+$/, "") || null;
  const model = (process.env.OLLAMA_MODEL ?? "").trim();
  return { url, model };
}

export type GpuConfig = {
  url: string | null;
  /** AWS credentials + instance id are present (start/stop possible). */
  awsConfigured: boolean;
  region: string;
  /** Human-readable reason why AWS is not usable yet, or null. */
  awsMissing: string[];
};

export function gpuConfig(): GpuConfig {
  const url = (process.env.GPU_OLLAMA_URL ?? "").trim().replace(/\/+$/, "") || null;
  const missing: string[] = [];
  if (!(process.env.AWS_ACCESS_KEY_ID ?? "").trim()) missing.push("AWS_ACCESS_KEY_ID");
  if (!(process.env.AWS_SECRET_ACCESS_KEY ?? "").trim()) missing.push("AWS_SECRET_ACCESS_KEY");
  if (!(process.env.AWS_EC2_INSTANCE_ID ?? "").trim()) missing.push("AWS_EC2_INSTANCE_ID");
  return {
    url,
    awsConfigured: missing.length === 0,
    region: (process.env.AWS_REGION ?? "").trim() || "us-east-1",
    awsMissing: missing,
  };
}

// ------------------------------------------------------------
// Health probes
// ------------------------------------------------------------

export type ProbeResult = { healthy: boolean; detail?: string };

/**
 * Pings an Ollama server's model list endpoint. Short timeout:
 * a server that is off must feel "off", not hang the warmup call.
 */
export async function probeOllama(
  url: string,
  timeoutMs = 2000
): Promise<ProbeResult> {
  try {
    const base = url.replace(/\/+$/, "");
    const response = await fetch(`${base}/api/tags`, {
      method: "GET",
      signal: AbortSignal.timeout(timeoutMs),
    });
    if (response.ok) return { healthy: true };
    return { healthy: false, detail: `HTTP ${response.status}` };
  } catch (err) {
    return {
      healthy: false,
      detail: err instanceof Error ? shortError(err) : "unreachable",
    };
  }
}

function shortError(err: Error): string {
  const message = err.message.replace(/\s+/g, " ").slice(0, 120);
  return message || err.name;
}

// ------------------------------------------------------------
// Heartbeat + state (DB row with in-memory fallback)
// ------------------------------------------------------------

/** Refresh the shared "someone is using the app" heartbeat. */
export async function touchActivity(supabase: SupabaseClient): Promise<void> {
  const now = new Date();
  memoryLastActivity = now;
  try {
    const iso = now.toISOString();
    await supabase.from("ai_lifecycle").upsert(
      { key: LIFECYCLE_KEY, last_activity: iso, updated_at: iso },
      { onConflict: "key" }
    );
  } catch {
    // In-memory fallback only — the caller must never fail because
    // of the heartbeat.
  }
}

async function readState(
  supabase: SupabaseClient
): Promise<{ state: string; lastActivity: Date | null }> {
  try {
    const { data, error } = await supabase
      .from("ai_lifecycle")
      .select("state, last_activity")
      .eq("key", LIFECYCLE_KEY)
      .maybeSingle();
    if (!error && data) {
      return {
        state: String(data.state ?? "unknown"),
        lastActivity: data.last_activity ? new Date(String(data.last_activity)) : null,
      };
    }
  } catch {
    // fall through to memory
  }
  return { state: memoryState, lastActivity: memoryLastActivity };
}

async function setState(
  supabase: SupabaseClient,
  state: string
): Promise<void> {
  memoryState = state;
  try {
    await supabase
      .from("ai_lifecycle")
      .update({ state, updated_at: new Date().toISOString() })
      .eq("key", LIFECYCLE_KEY);
  } catch {
    // memoryState already updated
  }
}

// ------------------------------------------------------------
// EC2 control (only when AWS_* env vars are set)
// ------------------------------------------------------------

async function ec2InstanceAction(
  action: "start" | "stop"
): Promise<{ ok: boolean; detail?: string }> {
  const cfg = gpuConfig();
  if (!cfg.awsConfigured) {
    return { ok: false, detail: `AWS not configured: ${cfg.awsMissing.join(", ")}` };
  }
  try {
    const client = new EC2Client({
      region: cfg.region,
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID!.trim(),
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!.trim(),
      },
    });
    const instanceId = process.env.AWS_EC2_INSTANCE_ID!.trim();
    const command =
      action === "start"
        ? new StartInstancesCommand({ InstanceIds: [instanceId] })
        : new StopInstancesCommand({ InstanceIds: [instanceId] });
    await client.send(command);
    return { ok: true };
  } catch (err) {
    return {
      ok: false,
      detail: err instanceof Error ? shortError(err) : "AWS API error",
    };
  }
}

// ------------------------------------------------------------
// Public operations
// ------------------------------------------------------------

export type GpuAction =
  | "not-configured" // GPU_OLLAMA_URL missing
  | "already-running"
  | "start-requested"
  | "start-failed"
  | "would-start" // endpoint down, AWS not configured yet
  | "already-stopped"
  | "stop-requested"
  | "stop-failed"
  | "would-stop" // idle, but AWS not configured yet
  | "keep-running"; // cron: not idle long enough

export type GpuStatus = {
  configured: boolean;
  awsConfigured: boolean;
  url: string | null;
  healthy: boolean | null;
  state: string;
  lastActivity: string | null;
  idleMinutes: number | null;
  idleThresholdMinutes: number;
  action: GpuAction;
  detail?: string;
};

function idleMinutesOf(lastActivity: Date | null): number | null {
  if (!lastActivity) return null;
  return Math.round(((Date.now() - lastActivity.getTime()) / 60000) * 10) / 10;
}

/**
 * Called on activity (uploads, confirm, Generate, AI routes).
 * Probes the GPU endpoint; boots the EC2 instance when it is down
 * and AWS is configured; reports "would-start" when it is not
 * (the code-first / server-off phase).
 */
export async function ensureGpuRunning(
  supabase: SupabaseClient
): Promise<GpuStatus> {
  const cfg = gpuConfig();
  const { state, lastActivity } = await readState(supabase);
  const base: GpuStatus = {
    configured: Boolean(cfg.url),
    awsConfigured: cfg.awsConfigured,
    url: cfg.url,
    healthy: null,
    state,
    lastActivity: lastActivity ? lastActivity.toISOString() : null,
    idleMinutes: idleMinutesOf(lastActivity),
    idleThresholdMinutes: idleMinutesBeforeStop(),
    action: "not-configured",
  };

  if (!cfg.url) {
    base.detail = "GPU_OLLAMA_URL is not set.";
    return base;
  }

  const health = await probeOllama(cfg.url);
  base.healthy = health.healthy;

  if (health.healthy) {
    base.action = "already-running";
    await setState(supabase, "running");
    return base;
  }

  if (!cfg.awsConfigured) {
    base.action = "would-start";
    base.detail = `Server is down; would start it now, but AWS is not configured yet (${cfg.awsMissing.join(", ")}).`;
    return base;
  }

  const result = await ec2InstanceAction("start");
  if (result.ok) {
    base.action = "start-requested";
    base.detail = "EC2 StartInstances accepted — the server boots in ~2-4 minutes.";
    await setState(supabase, "starting");
  } else {
    base.action = "start-failed";
    base.detail = health.detail
      ? `Down (${health.detail}); start failed: ${result.detail}`
      : result.detail;
    await setState(supabase, "unknown");
  }
  return base;
}

/**
 * Called by /api/cron/ai-idle. Stops the GPU instance once there
 * has been no activity for AI_IDLE_MINUTES (default 10).
 */
export async function stopGpuIfIdle(
  supabase: SupabaseClient
): Promise<GpuStatus> {
  const cfg = gpuConfig();
  const { state, lastActivity } = await readState(supabase);
  const idle = idleMinutesOf(lastActivity);
  const threshold = idleMinutesBeforeStop();
  const base: GpuStatus = {
    configured: Boolean(cfg.url),
    awsConfigured: cfg.awsConfigured,
    url: cfg.url,
    healthy: null,
    state,
    lastActivity: lastActivity ? lastActivity.toISOString() : null,
    idleMinutes: idle,
    idleThresholdMinutes: threshold,
    action: "keep-running",
  };

  if (!cfg.url) {
    base.action = "not-configured";
    base.detail = "GPU_OLLAMA_URL is not set.";
    return base;
  }

  // Not enough evidence to stop anything: keep the instance as is.
  if (idle === null) {
    base.detail = "No activity recorded yet — nothing to stop.";
    return base;
  }

  if (idle < threshold) {
    base.detail = `Idle ${idle} min of ${threshold} min — keeping the server running.`;
    return base;
  }

  // Idle long enough: check whether anything is still up.
  const health = await probeOllama(cfg.url);
  base.healthy = health.healthy;

  if (!health.healthy && state === "stopped") {
    base.action = "already-stopped";
    base.detail = `Idle ${idle} min — the server is already off.`;
    return base;
  }

  if (!cfg.awsConfigured) {
    base.action = "would-stop";
    base.detail = `Idle ${idle} min (>= ${threshold}) — would stop it now, but AWS is not configured yet (${cfg.awsMissing.join(", ")}).`;
    return base;
  }

  const result = await ec2InstanceAction("stop");
  if (result.ok) {
    base.action = "stop-requested";
    base.detail = `Idle ${idle} min (>= ${threshold}) — EC2 StopInstances accepted.`;
    await setState(supabase, "stopping");
  } else {
    base.action = "stop-failed";
    base.detail = result.detail;
    await setState(supabase, "unknown");
  }
  return base;
}

// ------------------------------------------------------------
// Snapshot for the admin debug page
// ------------------------------------------------------------

export type LifecycleSnapshot = {
  local: {
    configured: boolean;
    url: string | null;
    model: string;
    healthy: boolean | null;
    detail?: string;
  };
  gpu: GpuStatus;
  idleThresholdMinutes: number;
  cronSecretSet: boolean;
  serviceKeySet: boolean;
};

export async function getLifecycleSnapshot(
  supabase: SupabaseClient
): Promise<LifecycleSnapshot> {
  const local = ollamaConfig();
  const localHealth = local.url ? await probeOllama(local.url) : null;
  const cfg = gpuConfig();
  const { state, lastActivity } = await readState(supabase);
  const gpuHealth = cfg.url ? await probeOllama(cfg.url) : null;
  const gpuDetail = !cfg.url
    ? "GPU_OLLAMA_URL is not set."
    : gpuHealth?.healthy
      ? undefined
      : cfg.awsConfigured
        ? "Server is down — the next activity will start it."
        : `AWS not configured yet: ${cfg.awsMissing.join(", ")}`;

  return {
    local: {
      configured: Boolean(local.url),
      url: local.url,
      model: local.model,
      healthy: localHealth ? localHealth.healthy : null,
      detail: localHealth?.detail,
    },
    gpu: {
      configured: Boolean(cfg.url),
      awsConfigured: cfg.awsConfigured,
      url: cfg.url,
      healthy: gpuHealth ? gpuHealth.healthy : null,
      state,
      lastActivity: lastActivity ? lastActivity.toISOString() : null,
      idleMinutes: idleMinutesOf(lastActivity),
      idleThresholdMinutes: idleMinutesBeforeStop(),
      action: cfg.url
        ? gpuHealth?.healthy
          ? "already-running"
          : "would-start"
        : "not-configured",
      detail: gpuDetail,
    },
    idleThresholdMinutes: idleMinutesBeforeStop(),
    cronSecretSet: Boolean((process.env.CRON_SECRET ?? "").trim()),
    serviceKeySet: Boolean((process.env.SUPABASE_SERVICE_ROLE_KEY ?? "").trim()),
  };
}
