import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getProviderDebugInfo } from "@/lib/ai";
import { Badge, PageHeader } from "@/components/dashboard/ui";
import RetrievalTest from "@/components/dashboard/retrieval-test";

export const dynamic = "force-dynamic";

export default async function DebugPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [docsRes, chunksRes] = await Promise.all([
    supabase
      .from("documents")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id),
    supabase
      .from("document_chunks")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id),
  ]);

  const apiKeySet = Boolean(process.env.AI_API_KEY);
  const modelSet = Boolean(process.env.AI_MODEL);
  const providers = getProviderDebugInfo();

  return (
    <div>
      <PageHeader
        title="Debug"
        subtitle="Retrieval and AI configuration checks for your account."
      />

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <div className="app-card">
          <p className="text-sm font-medium text-muted-foreground">Documents</p>
          <p className="mt-1 text-2xl font-bold text-navy">
            {docsRes.error ? "—" : (docsRes.count ?? 0)}
          </p>
        </div>
        <div className="app-card">
          <p className="text-sm font-medium text-muted-foreground">Chunks</p>
          <p className="mt-1 text-2xl font-bold text-navy">
            {chunksRes.error ? "—" : (chunksRes.count ?? 0)}
          </p>
        </div>
      </div>

      <div className="mt-4 app-card">
        <p className="text-sm font-medium text-muted-foreground">AI configuration</p>
        <div className="mt-3 flex flex-wrap items-center gap-x-6 gap-y-3 text-sm text-navy">
          <span className="flex items-center gap-2">
            AI_API_KEY set
            <Badge tone={apiKeySet ? "green" : "red"}>
              {apiKeySet ? "true" : "false"}
            </Badge>
          </span>
          <span className="flex items-center gap-2">
            AI_MODEL set
            <Badge tone={modelSet ? "green" : "red"}>
              {modelSet ? "true" : "false"}
            </Badge>
          </span>
        </div>
        {!apiKeySet || !modelSet ? (
          <p className="mt-3 text-xs leading-5 text-muted-foreground">
            Set AI_API_KEY and AI_MODEL in .env.local (restart the dev server
            after editing) — see .env.example for working values.
          </p>
        ) : null}
      </div>

      <div className="mt-4 app-card">
        <p className="text-sm font-medium text-muted-foreground">
          AI providers (runtime state)
        </p>
        {providers.length === 0 ? (
          <p className="mt-3 text-xs leading-5 text-muted-foreground">
            No provider configured yet.
          </p>
        ) : (
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            {providers.map((provider) => (
              <div
                key={provider.slot}
                className="rounded-lg border border-border/60 p-3 text-sm text-navy"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-medium">
                    Slot {provider.slot}
                    {provider.type ? ` · ${provider.type}` : ""}
                  </span>
                  <Badge tone={provider.configured ? "green" : "red"}>
                    {provider.configured ? "configured" : "not configured"}
                  </Badge>
                  <Badge tone={provider.keySet ? "green" : "red"}>
                    key {provider.keySet ? "set" : "missing"}
                  </Badge>
                  {provider.cooldownActive ? (
                    <Badge tone="red">cooldown</Badge>
                  ) : (
                    <Badge tone="green">ready</Badge>
                  )}
                </div>
                <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
                  <span className="text-muted-foreground">Model</span>
                  <span className="truncate" title={provider.model ?? ""}>
                    {provider.model ?? "—"}
                  </span>
                  <span className="text-muted-foreground">Last error</span>
                  <span>{provider.lastErrorCode ?? "—"}</span>
                  <span className="text-muted-foreground">Cooldown until</span>
                  <span>{provider.cooldownUntil ?? "—"}</span>
                  <span className="text-muted-foreground">Cooldown reason</span>
                  <span className="truncate" title={provider.cooldownReason ?? ""}>
                    {provider.cooldownReason ?? "—"}
                  </span>
                  <span className="text-muted-foreground">Requests total</span>
                  <span>{provider.requestsTotal}</span>
                  <span className="text-muted-foreground">Last minute</span>
                  <span>{provider.requestsThisWindow}</span>
                </div>
              </div>
            ))}
          </div>
        )}
        <p className="mt-3 text-xs leading-5 text-muted-foreground">
          Cooldowns are set automatically on 429 (rate limit / retry-after)
          and on exhausted daily quota (rest of the UTC day). API keys are
          never shown here or in server logs.
        </p>
      </div>

      <div className="mt-4">
        <RetrievalTest />
      </div>
    </div>
  );
}
