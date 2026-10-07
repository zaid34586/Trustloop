import { NextResponse } from "next/server";
import { timingSafeEqual } from "crypto";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { stopGpuIfIdle } from "@/lib/gpu";

export const maxDuration = 15;

function secretMatches(provided: string, expected: string): boolean {
  const a = Buffer.from(provided);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

async function handle(request: Request): Promise<NextResponse> {
  const cronSecret = (process.env.CRON_SECRET ?? "").trim();

  // Path 1: scheduler (Vercel cron sends "Authorization: Bearer
  // $CRON_SECRET"; a manual ?secret= also works). Uses the
  // service-role client because there is no user session.
  const authHeader = request.headers.get("authorization") ?? "";
  const bearer = authHeader.toLowerCase().startsWith("bearer ")
    ? authHeader.slice(7).trim()
    : "";
  const querySecret = new URL(request.url).searchParams.get("secret") ?? "";
  const provided = bearer || querySecret;

  if (cronSecret && provided && secretMatches(provided, cronSecret)) {
    const service = createServiceClient();
    if (!service) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "CRON_SECRET matched but SUPABASE_SERVICE_ROLE_KEY is not set — add it to the server env.",
        },
        { status: 503 }
      );
    }
    const gpu = await stopGpuIfIdle(service);
    return NextResponse.json({ ok: true, via: "cron-secret", gpu });
  }

  // Path 2: manual run by a signed-in admin (browser-friendly).
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not logged in." }, { status: 401 });
  }
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();
  if (profile?.role !== "admin") {
    return NextResponse.json({ error: "Admin only." }, { status: 403 });
  }

  const gpu = await stopGpuIfIdle(supabase);
  return NextResponse.json({ ok: true, via: "admin-session", gpu });
}

export async function GET(request: Request) {
  return handle(request);
}

export async function POST(request: Request) {
  return handle(request);
}
