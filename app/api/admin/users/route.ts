import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { adminOnly } from "@/lib/admin";

export const dynamic = "force-dynamic";

/** Lists all profiles (admin RLS policy). Max 500 rows. */
export async function GET() {
  const supabase = await createClient();
  const gate = await adminOnly(supabase);
  if (gate instanceof NextResponse) return gate;

  const { data, error } = await supabase
    .from("profiles")
    .select("id, email, full_name, company_name, role, plan, created_at")
    .order("created_at", { ascending: false })
    .limit(500);

  if (error) {
    return NextResponse.json(
      { error: "Could not load users." },
      { status: 500 }
    );
  }
  return NextResponse.json({ users: data ?? [] });
}
