import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
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

  return (
    <div>
      <PageHeader
        title="Debug"
        subtitle="Retrieval and AI configuration checks for your account."
      />

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <p className="text-sm font-medium text-gray-500">Documents</p>
          <p className="mt-1 text-2xl font-bold text-gray-900">
            {docsRes.error ? "—" : (docsRes.count ?? 0)}
          </p>
        </div>
        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <p className="text-sm font-medium text-gray-500">Chunks</p>
          <p className="mt-1 text-2xl font-bold text-gray-900">
            {chunksRes.error ? "—" : (chunksRes.count ?? 0)}
          </p>
        </div>
      </div>

      <div className="mt-4 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
        <p className="text-sm font-medium text-gray-500">AI configuration</p>
        <div className="mt-3 flex flex-wrap items-center gap-x-6 gap-y-3 text-sm text-gray-700">
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
          <p className="mt-3 text-xs leading-5 text-gray-500">
            Set AI_API_KEY and AI_MODEL in .env.local (restart the dev server
            after editing) — see .env.example for working values.
          </p>
        ) : null}
      </div>

      <div className="mt-4">
        <RetrievalTest />
      </div>
    </div>
  );
}
