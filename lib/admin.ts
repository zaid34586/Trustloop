import { NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";

// ============================================================
// Admin helpers — profile lookup and the admin gate used by the
// /api/admin/* routes. Role is read from profiles (the role column
// itself is protected by the prevent_role_self_change trigger).
// ============================================================

export type ProfileRow = {
  id: string;
  email: string | null;
  full_name: string | null;
  company_name: string | null;
  role: string | null;
  plan: string;
  created_at: string | null;
};

export async function fetchProfile(
  supabase: SupabaseClient,
  userId: string
): Promise<Partial<ProfileRow> | null> {
  const { data } = await supabase
    .from("profiles")
    .select("id, email, full_name, company_name, role, plan, created_at")
    .eq("id", userId)
    .maybeSingle();
  return (data as Partial<ProfileRow> | null) ?? null;
}

export type AdminGate =
  | { ok: true; profile: ProfileRow }
  | { ok: false; status: number; error: string };

/**
 * Returns the caller's profile when it is an admin, otherwise a
 * ready-to-return error (401 not logged in, 403 not admin, 500
 * lookup failed).
 */
export async function requireAdmin(
  supabase: SupabaseClient,
  userId: string
): Promise<AdminGate> {
  const { data: profile, error } = await supabase
    .from("profiles")
    .select("id, email, full_name, company_name, role, plan, created_at")
    .eq("id", userId)
    .maybeSingle();

  if (error) {
    return { ok: false, status: 500, error: "Could not load your profile." };
  }
  if (!profile) {
    return { ok: false, status: 403, error: "Not allowed." };
  }
  if ((profile as ProfileRow).role !== "admin") {
    return { ok: false, status: 403, error: "Admin access required." };
  }
  return { ok: true, profile: profile as ProfileRow };
}

/**
 * One-call gate for /api/admin/* routes: returns either the admin
 * profile or a NextResponse (401/403/500) ready to return.
 *
 *   const gate = await adminOnly(supabase);
 *   if (gate instanceof NextResponse) return gate;
 */
export async function adminOnly(
  supabase: SupabaseClient
): Promise<{ profile: ProfileRow } | NextResponse> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not logged in." }, { status: 401 });
  }
  const gate = await requireAdmin(supabase, user.id);
  if (!gate.ok) {
    return NextResponse.json(
      { error: gate.error },
      { status: gate.status }
    );
  }
  return { profile: gate.profile };
}
