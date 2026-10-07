import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { adminOnly } from "@/lib/admin";
import { parseOfferPayload } from "@/lib/plans";

export const dynamic = "force-dynamic";

export async function GET() {
  const supabase = await createClient();
  const gate = await adminOnly(supabase);
  if (gate instanceof NextResponse) return gate;

  const { data, error } = await supabase
    .from("offers")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) {
    return NextResponse.json(
      { error: "Could not load offers." },
      { status: 500 }
    );
  }
  return NextResponse.json({ offers: data ?? [] });
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const gate = await adminOnly(supabase);
  if (gate instanceof NextResponse) return gate;

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const parsed = parseOfferPayload(body);
  if (!parsed.ok) {
    return NextResponse.json({ error: parsed.error }, { status: 422 });
  }

  const { data, error } = await supabase
    .from("offers")
    .insert({ ...parsed.value, updated_at: new Date().toISOString() })
    .select()
    .single();

  if (error) {
    if (error.code === "23505") {
      return NextResponse.json(
        { error: "An offer with this code already exists." },
        { status: 409 }
      );
    }
    return NextResponse.json(
      { error: "Could not create the offer." },
      { status: 500 }
    );
  }
  return NextResponse.json({ offer: data }, { status: 201 });
}
