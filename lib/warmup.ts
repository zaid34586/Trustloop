// Client-safe helper: fire-and-forget warmup ping. Tells the server
// this account is active so the GPU slot can auto-start (and the
// idle timer restarts). Errors are ignored on purpose — the AI
// routes fall back to the API providers when the GPU is still booting.
export function pingWarmup(): void {
  if (typeof window === "undefined") return;
  void fetch("/api/ai/warmup", { method: "POST" }).catch(() => {});
}
