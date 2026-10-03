import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Handles the email link (confirmation / password recovery).
//   verification -> /auth/callback?next=/login        -> /login (verified banner)
//   recovery     -> /auth/callback?next=/reset-password -> /reset-password (session)
//   anything else-> /auth/callback                    -> /dashboard (session)
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");

  // Only allow same-site relative redirects.
  const nextParam = searchParams.get("next") ?? "/dashboard";
  const next =
    nextParam.startsWith("/") && !nextParam.startsWith("//")
      ? nextParam
      : "/dashboard";

  // Email verification: no session is created here — the user lands on
  // the login page with a confirmation banner, then signs in normally.
  if (next === "/login") {
    return NextResponse.redirect(
      new URL(code ? "/login?verified=1" : "/login", origin)
    );
  }

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(new URL(next, origin));
    }
  }

  // The code was missing or could not be exchanged — send to login.
  return NextResponse.redirect(new URL("/login", origin));
}
