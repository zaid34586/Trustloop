"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Brand } from "@/components/marketing/brand";

export default function ResetPasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (password.length < 8) {
      setError("Your new password must be at least 8 characters.");
      return;
    }
    if (password !== confirmPassword) {
      setError("The two passwords do not match.");
      return;
    }

    setLoading(true);

    const supabase = createClient();
    const { error: updateError } = await supabase.auth.updateUser({
      password,
    });

    if (updateError) {
      setError(updateError.message);
      setLoading(false);
      return;
    }

    setSuccess(true);
    setLoading(false);
    router.push("/dashboard");
    router.refresh();
  }

  return (
    <div className="auth-shell">
      <div className="auth-card">
        <div className="auth-brand">
          <Brand />
        </div>
        <h1 className="auth-title">Choose a new password</h1>
        <p className="auth-sub">
          Set a new password for your account, then you&apos;ll be taken to
          your dashboard.
        </p>

        <form onSubmit={handleSubmit} className="auth-form">
          {error && (
            <div role="alert" className="app-alert app-alert-error auth-banner">
              {error}
            </div>
          )}

          {success && (
            <div role="status" className="app-alert app-alert-success auth-banner">
              Password updated! Taking you to your dashboard...
            </div>
          )}

          <div>
            <label htmlFor="password" className="app-label">
              New password
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

          <div>
            <label htmlFor="confirm-password" className="app-label">
              Confirm new password
            </label>
            <input
              id="confirm-password"
              type="password"
              required
              minLength={8}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="app-input"
              placeholder="Repeat the new password"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="btn btn-primary btn-block"
          >
            {loading ? "Saving..." : "Set new password"}
          </button>

          <p className="auth-links">
            <Link href="/login">Back to login</Link>
          </p>
        </form>
      </div>
    </div>
  );
}
