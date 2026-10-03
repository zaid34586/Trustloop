import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Exchanges the Supabase auth code (email confirmation / password
// recovery link) for a session, then redirects the user.
//   confirmation -> /auth/callback            -> /dashboard
//   recovery     -> /auth/callback?next=/reset-password -> /reset-password
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");

  // Only allow same-site relative redirects.
  const nextParam = searchParams.get("next") ?? "/dashboard";
  const next =
    nextParam.startsWith("/") && !nextParam.startsWith("//")
      ? nextParam
      : "/dashboard";

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
