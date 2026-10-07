import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { adminOnly } from "@/lib/admin";
import { isPlanKey } from "@/lib/plans";

export const dynamic = "force-dynamic";

/**
 * Assigns a plan to a user. Goes through the session client: the
 * profiles_update_admin RLS policy admits admins, and the
 * prevent_plan_self_change trigger blocks non-admin callers
 * (profiles.role stays protected by its own trigger).
 */
export async function POST(request: Request) {
  const supabase = await createClient();
  const gate = await adminOnly(supabase);
  if (gate instanceof NextResponse) return gate;

  let body: { user_id?: unknown; plan?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  if (typeof body.user_id !== "string" || !body.user_id) {
    return NextResponse.json({ error: "user_id is required." }, { status: 400 });
  }
  if (!isPlanKey(body.plan)) {
    return NextResponse.json(
      { error: "plan must be trial, starter, growth or business." },
      { status: 422 }
    );
  }

  const { data, error } = await supabase
    .from("profiles")
    .update({ plan: body.plan })
    .eq("id", body.user_id)
    .select("id, plan")
    .maybeSingle();

  if (error) {
    return NextResponse.json(
      { error: "Could not update the user's plan." },
      { status: 500 }
    );
  }
  if (!data) {
    return NextResponse.json(
      { error: "User not found or not allowed." },
      { status: 404 }
    );
  }
  return NextResponse.json({ user: data });
}
