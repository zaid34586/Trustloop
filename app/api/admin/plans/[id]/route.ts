import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { adminOnly } from "@/lib/admin";
import { parsePlanPayload, parseLimits, type PlanPayload } from "@/lib/plans";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: Params) {
  const supabase = await createClient();
  const gate = await adminOnly(supabase);
  if (gate instanceof NextResponse) return gate;

  const { id } = await params;

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const { data: existing, error: loadError } = await supabase
    .from("plans")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (loadError) {
    return NextResponse.json(
      { error: "Could not load the plan." },
      { status: 500 }
    );
  }
  if (!existing) {
    return NextResponse.json({ error: "Plan not found." }, { status: 404 });
  }

  const current = existing as Record<string, unknown>;
  const parsed = parsePlanPayload(body, {
    key: current.key as PlanPayload["key"],
    name: String(current.name ?? ""),
    price_monthly: Number(current.price_monthly ?? 0),
    price_yearly: Number(current.price_yearly ?? 0),
    features: Array.isArray(current.features)
      ? (current.features as unknown[]).map(String)
      : [],
    limits: parseLimits(current.limits),
    active: Boolean(current.active),
    sort_order: Number(current.sort_order ?? 0),
  });
  if (!parsed.ok) {
    return NextResponse.json({ error: parsed.error }, { status: 422 });
  }

  const { data, error } = await supabase
    .from("plans")
    .update({ ...parsed.value, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select()
    .single();

  if (error) {
    if (error.code === "23505") {
      return NextResponse.json(
        { error: "Another plan already uses this key." },
        { status: 409 }
      );
    }
    return NextResponse.json(
      { error: "Could not update the plan." },
      { status: 500 }
    );
  }
  return NextResponse.json({ plan: data });
}

export async function DELETE(_request: Request, { params }: Params) {
  const supabase = await createClient();
  const gate = await adminOnly(supabase);
  if (gate instanceof NextResponse) return gate;

  const { id } = await params;

  const { error } = await supabase.from("plans").delete().eq("id", id);
  if (error) {
    return NextResponse.json(
      { error: "Could not delete the plan." },
      { status: 500 }
    );
  }
  return NextResponse.json({ ok: true });
}
