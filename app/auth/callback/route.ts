import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Handles the email link (confirmation / password recovery).
//   verification -> /auth/callback?next=/login        -> /login (verified banner)
//   recovery     -> /auth/callback?next=/reset-password -> /reset-password (session)
//   anything else-> /auth/callback                    -> /dashboard (session)

/** Control characters (C0 + DEL) can corrupt the Location header. */
function hasControlChars(value: string): boolean {
  for (let i = 0; i < value.length; i++) {
    const code = value.charCodeAt(i);
    if (code <= 0x1f || code === 0x7f) return true;
  }
  return false;
}

/**
 * Allow only same-site relative redirects: a path starting with a
 * single "/". Reject everything else — including the backslash bypass
 * (URL parsers treat "/\evil.com" as protocol-relative "//evil.com"),
 * embedded schemes ("://") and control characters — and fall back to
 * /dashboard.
 */
function safeNextPath(raw: string | null): string {
  if (!raw) return "/dashboard";
  const invalid =
    !raw.startsWith("/") ||
    raw.startsWith("//") ||
    raw.includes("\\") ||
    raw.includes("://") ||
    hasControlChars(raw);
  return invalid ? "/dashboard" : raw;
}

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");

  const next = safeNextPath(searchParams.get("next"));

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
