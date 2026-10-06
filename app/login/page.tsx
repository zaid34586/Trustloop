"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Brand } from "@/components/brand/logo";
import { site } from "@/config/site";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [verified, setVerified] = useState(false);
  const [loading, setLoading] = useState(false);

  // Shown after the user confirmed their email (/auth/callback?verified=1).
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("verified") === "1") {
      setVerified(true);
      // Keep the URL clean so a refresh does not re-show the banner.
      params.delete("verified");
      const query = params.toString();
      window.history.replaceState(
        null,
        "",
        query ? `?${query}` : window.location.pathname
      );
    }
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      if (error.message === "Invalid login credentials") {
        setError("Wrong email or password. Please try again.");
      } else {
        setError(error.message);
      }
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
          <Brand size={24} />
        </div>
        <h1 className="auth-title">Log in to your account</h1>
        <p className="auth-sub">
          Welcome back. Enter your details to continue.
        </p>

        <form onSubmit={handleSubmit} className="auth-form">
          {verified && (
            <div role="status" className="app-alert app-alert-success auth-banner">
              Your email is verified — you can now log in.
            </div>
          )}

          {error && (
            <div role="alert" className="app-alert app-alert-error auth-banner">
              {error}
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
            <div className="auth-label-row">
              <label htmlFor="password" className="app-label auth-inline-label">
                Password
              </label>
              <Link href="/forgot-password" className="auth-forgot">
                Forgot password?
              </Link>
            </div>
            <input
              id="password"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="app-input"
              placeholder="••••••••"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="btn btn-primary btn-block"
          >
            {loading ? "Logging in..." : "Log in"}
          </button>

          <p className="auth-links">
            Don&apos;t have an account?{" "}
            <Link href="/signup">Sign up</Link>
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
