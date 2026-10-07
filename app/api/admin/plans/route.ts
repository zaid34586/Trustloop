import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { adminOnly } from "@/lib/admin";
import { parsePlanPayload } from "@/lib/plans";

export const dynamic = "force-dynamic";

export async function GET() {
  const supabase = await createClient();
  const gate = await adminOnly(supabase);
  if (gate instanceof NextResponse) return gate;

  const { data, error } = await supabase
    .from("plans")
    .select("*")
    .order("sort_order", { ascending: true });
  if (error) {
    return NextResponse.json(
      { error: "Could not load plans." },
      { status: 500 }
    );
  }
  return NextResponse.json({ plans: data ?? [] });
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

  const parsed = parsePlanPayload(body);
  if (!parsed.ok) {
    return NextResponse.json({ error: parsed.error }, { status: 422 });
  }

  const { data, error } = await supabase
    .from("plans")
    .insert({
      ...parsed.value,
      updated_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (error) {
    if (error.code === "23505") {
      return NextResponse.json(
        { error: "A plan with this key already exists." },
        { status: 409 }
      );
    }
    return NextResponse.json(
      { error: "Could not create the plan." },
      { status: 500 }
    );
  }
  return NextResponse.json({ plan: data }, { status: 201 });
}
