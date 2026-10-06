"use client";

import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Brand } from "@/components/brand/logo";
import { site } from "@/config/site";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const supabase = createClient();
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || window.location.origin;

    const { error: resetError } = await supabase.auth.resetPasswordForEmail(
      email,
      {
        // The callback route exchanges the code, then sends the user
        // to the page where they can choose a new password.
        redirectTo: `${siteUrl}/auth/callback?next=/reset-password`,
      }
    );

    if (resetError) {
      setError(resetError.message);
      setLoading(false);
      return;
    }

    setSent(true);
    setLoading(false);
  }

  return (
    <div className="auth-shell">
      <div className="auth-card">
        <div className="auth-brand">
          <Brand size={24} />
        </div>
        <h1 className="auth-title">Reset your password</h1>
        <p className="auth-sub">
          Enter your email and we&apos;ll send you a link to set a new
          password.
        </p>

        <form onSubmit={handleSubmit} className="auth-form">
          {error && (
            <div role="alert" className="app-alert app-alert-error auth-banner">
              {error}
            </div>
          )}

          {sent && (
            <div role="status" className="app-alert app-alert-success auth-banner">
              Check your email — we sent a password reset link to{" "}
              <span className="font-semibold">{email}</span>. The link expires
              shortly, so open it soon.
            </div>
          )}

          <div>
            <label htmlFor="email" className="app-label">
              Email
            </label>
            <input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="app-input"
              placeholder="you@company.com"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="btn btn-primary btn-block"
          >
            {loading ? "Sending..." : "Send reset link"}
          </button>

          <p className="auth-links">
            Remember your password?{" "}
            <Link href="/login">Log in</Link>
          </p>
        </form>
        <p className="auth-powered">
          Powered by{" "}
          <a href={site.rivoxUrl} target="_blank" rel="noopener noreferrer">
            Rivox
          </a>
        </p>
      </div>
    </div>
  );
}
