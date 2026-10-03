"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

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
    <div className="flex min-h-screen items-center justify-center bg-white px-4">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <Link href="/" className="text-2xl font-bold text-primary-800">
            Trustloop
          </Link>
          <h1 className="mt-4 text-2xl font-bold text-gray-900">
            Log in to your account
          </h1>
          <p className="mt-2 text-sm text-gray-600">
            Welcome back. Enter your details to continue.
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm sm:p-8"
        >
          {verified && (
            <div
              role="status"
              className="mb-4 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700"
            >
              Your email is verified — you can now log in.
            </div>
          )}

          {error && (
            <div
              role="alert"
              className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
            >
              {error}
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
            <div className="mb-1 flex items-center justify-between">
              <label htmlFor="password" className="text-sm font-medium text-gray-700">
                Password
              </label>
              <Link
                href="/forgot-password"
                className="text-sm font-medium text-primary-600 hover:underline"
              >
                Forgot password?
              </Link>
            </div>
            <input
              id="password"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
              placeholder="••••••••"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-primary-600 py-2.5 text-sm font-semibold text-white hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? "Logging in..." : "Log in"}
          </button>

          <p className="mt-4 text-center text-sm text-gray-600">
            Don&apos;t have an account?{" "}
            <Link href="/signup" className="font-medium text-primary-600 hover:underline">
              Sign up
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}
