"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Brand } from "@/components/marketing/brand";

export default function SignupPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const supabase = createClient();
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || window.location.origin;
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        // The confirmation link lands on /auth/callback, which then
        // sends the user to the login page with a "verified" banner.
        emailRedirectTo: `${siteUrl}/auth/callback?next=/login`,
      },
    });

    if (error) {
      if (error.message.toLowerCase().includes("already registered")) {
        setError("An account with this email already exists. Try logging in instead.");
      } else {
        setError(error.message);
      }
      setLoading(false);
      return;
    }

    // If email confirmation is required, there is no active session yet.
    if (!data.session) {
      setSuccess(true);
      setLoading(false);
      return;
    }

    router.push("/dashboard");
    router.refresh();
  }

  return (
    <div className="auth-shell">
      <div className="auth-card">
        <div className="auth-brand">
          <Brand />
        </div>
        <h1 className="auth-title">Get early access</h1>
        <p className="auth-sub">
          Create your account to start drafting questionnaire answers from
          your own documents.
        </p>

        <form onSubmit={handleSubmit} className="auth-form">
          {error && (
            <div role="alert" className="app-alert app-alert-error auth-banner">
              {error}
            </div>
          )}

          {success && (
            <div role="status" className="app-alert app-alert-success auth-banner">
              Account created! Check your email to confirm your address, then
              log in.
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

          <div>
            <label htmlFor="password" className="app-label">
              Password
            </label>
            <input
              id="password"
              type="password"
              required
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="app-input"
              placeholder="At least 8 characters"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="btn btn-primary btn-block"
          >
            {loading ? "Creating account..." : "Create account"}
          </button>

          <p className="auth-links">
            Already have an account?{" "}
            <Link href="/login">Log in</Link>
          </p>
        </form>
      </div>
    </div>
  );
}
