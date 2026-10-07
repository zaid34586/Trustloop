import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { adminOnly } from "@/lib/admin";
import { parseOfferPayload, type OfferPayload } from "@/lib/plans";

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
    .from("offers")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (loadError) {
    return NextResponse.json(
      { error: "Could not load the offer." },
      { status: 500 }
    );
  }
  if (!existing) {
    return NextResponse.json({ error: "Offer not found." }, { status: 404 });
  }

  const current = existing as Record<string, unknown>;
  const parsed = parseOfferPayload(body, {
    code: String(current.code ?? ""),
    percent: Number(current.percent ?? 0),
    plan_id: (current.plan_id as string | null) ?? null,
    active: Boolean(current.active),
    starts_at: (current.starts_at as string | null) ?? null,
    ends_at: (current.ends_at as string | null) ?? null,
  });
  if (!parsed.ok) {
    return NextResponse.json({ error: parsed.error }, { status: 422 });
  }

  const { data, error } = await supabase
    .from("offers")
    .update({ ...parsed.value, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select()
    .single();

  if (error) {
    if (error.code === "23505") {
      return NextResponse.json(
        { error: "Another offer already uses this code." },
        { status: 409 }
      );
    }
    return NextResponse.json(
      { error: "Could not update the offer." },
      { status: 500 }
    );
  }
  return NextResponse.json({ offer: data });
}

export async function DELETE(_request: Request, { params }: Params) {
  const supabase = await createClient();
  const gate = await adminOnly(supabase);
  if (gate instanceof NextResponse) return gate;

  const { id } = await params;

  const { error } = await supabase.from("offers").delete().eq("id", id);
  if (error) {
    return NextResponse.json(
      { error: "Could not delete the offer." },
      { status: 500 }
    );
  }
  return NextResponse.json({ ok: true });
}
