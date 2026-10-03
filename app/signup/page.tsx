"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

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
    <div className="flex min-h-screen items-center justify-center bg-white px-4">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <Link href="/" className="text-2xl font-bold text-primary-800">
            Trustloop
          </Link>
          <h1 className="mt-4 text-2xl font-bold text-gray-900">
            Get early access
          </h1>
          <p className="mt-2 text-sm text-gray-600">
            Create your account to start answering questionnaires faster.
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm sm:p-8"
        >
          {error && (
            <div
              role="alert"
              className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
            >
              {error}
            </div>
          )}

          {success && (
            <div
              role="status"
              className="mb-4 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700"
            >
              Account created! Check your email to confirm your address, then
              log in.
            </div>
          )}

          <div className="mb-4">
            <label
              htmlFor="email"
              className="mb-1 block text-sm font-medium text-gray-700"
            >
              Email
            </label>
            <input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
              placeholder="you@company.com"
            />
          </div>

          <div className="mb-6">
            <label
              htmlFor="password"
              className="mb-1 block text-sm font-medium text-gray-700"
            >
              Password
            </label>
            <input
              id="password"
              type="password"
              required
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
              placeholder="At least 8 characters"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-primary-600 py-2.5 text-sm font-semibold text-white hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? "Creating account..." : "Create account"}
          </button>

          <p className="mt-4 text-center text-sm text-gray-600">
            Already have an account?{" "}
            <Link href="/login" className="font-medium text-primary-600 hover:underline">
              Log in
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}
