"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { parseLimits, type Plan } from "@/lib/plans";
import {
  Badge,
  ErrorCard,
  PageHeader,
  Skeleton,
  SuccessCard,
  btnPrimary,
  btnSmSecondary,
  inputClass,
  inputDisabledClass,
} from "@/components/dashboard/ui";

type SaveState = { type: "success" | "error"; message: string } | null;

export default function SettingsPage() {
  // Profile
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [profileExists, setProfileExists] = useState(false);
  const [fullName, setFullName] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("");
  const [planKey, setPlanKey] = useState("trial");
  const [activePlans, setActivePlans] = useState<Plan[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileState, setProfileState] = useState<SaveState>(null);
  const [profileLoadError, setProfileLoadError] = useState<string | null>(null);

  // Password
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [changingPassword, setChangingPassword] = useState(false);
  const [passwordState, setPasswordState] = useState<SaveState>(null);

  useEffect(() => {
    async function loadProfile() {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setProfileLoadError("You are not logged in. Please log in again.");
        setLoadingProfile(false);
        return;
      }

      setEmail(user.email ?? "");

      const { data: profile, error } = await supabase
        .from("profiles")
        .select("full_name, company_name, role, plan")
        .eq("id", user.id)
        .single();

      if (error || !profile) {
        setProfileLoadError(
          "We could not load your profile. You can still change your password below."
        );
      } else {
        setProfileExists(true);
        setFullName(profile.full_name ?? "");
        setCompanyName(profile.company_name ?? "");
        setRole(profile.role ?? "");
        setPlanKey(profile.plan ?? "trial");
        setIsAdmin((profile.role ?? "") === "admin");
      }

      // Active plans (RLS: any signed-in user can read them).
      const { data: plans } = await supabase
        .from("plans")
        .select("*")
        .eq("active", true)
        .order("sort_order", { ascending: true });
      if (plans) {
        setActivePlans(
          (plans as Record<string, unknown>[]).map((row) => ({
            id: String(row.id),
            key: row.key as Plan["key"],
            name: String(row.name ?? ""),
            price_monthly: Number(row.price_monthly ?? 0),
            price_yearly: Number(row.price_yearly ?? 0),
            features: Array.isArray(row.features)
              ? (row.features as unknown[]).map(String)
              : [],
            limits: parseLimits(row.limits),
            active: Boolean(row.active),
            sort_order: Number(row.sort_order ?? 0),
          }))
        );
      }
      setLoadingProfile(false);
    }

    loadProfile();
  }, []);

  async function handleSaveProfile(e: React.FormEvent) {
    e.preventDefault();
    setProfileState(null);

    if (!profileExists) {
      setProfileState({
        type: "error",
        message: "Your profile could not be found, so it cannot be saved.",
      });
      return;
    }

    setSavingProfile(true);

    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setProfileState({
        type: "error",
        message: "Your session has expired. Please log in again.",
      });
      setSavingProfile(false);
      return;
    }

    // Only these two fields are ever written. Email and role are not
    // part of this update and cannot be changed here.
    const { error } = await supabase
      .from("profiles")
      .update({
        full_name: fullName.trim(),
        company_name: companyName.trim(),
      })
      .eq("id", user.id);

    setSavingProfile(false);

    if (error) {
      setProfileState({
        type: "error",
        message: "Could not save your profile. Please try again.",
      });
      return;
    }

    setProfileState({ type: "success", message: "Profile saved." });
  }

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault();
    setPasswordState(null);

    if (password.length < 8) {
      setPasswordState({
        type: "error",
        message: "Your new password must be at least 8 characters.",
      });
      return;
    }
    if (password !== confirmPassword) {
      setPasswordState({
        type: "error",
        message: "The two passwords do not match.",
      });
      return;
    }

    setChangingPassword(true);

    const supabase = createClient();
    const { error } = await supabase.auth.updateUser({ password });

    setChangingPassword(false);

    if (error) {
      setPasswordState({ type: "error", message: error.message });
      return;
    }

    setPassword("");
    setConfirmPassword("");
    setPasswordState({
      type: "success",
      message: "Password updated successfully.",
    });
  }

  return (
    <div>
      <PageHeader
        title="Settings"
        subtitle="Manage your profile and account password."
      />

      {/* Profile */}
      <div className="mt-6 app-card sm:p-8">
        <h2 className="text-base font-semibold text-navy">Profile</h2>

        {loadingProfile ? (
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <div>
              <Skeleton className="h-4 w-20" />
              <Skeleton className="mt-2 h-10 w-full" />
            </div>
            <div>
              <Skeleton className="h-4 w-28" />
              <Skeleton className="mt-2 h-10 w-full" />
            </div>
            <div>
              <Skeleton className="h-4 w-16" />
              <Skeleton className="mt-2 h-10 w-full" />
            </div>
            <div>
              <Skeleton className="h-4 w-16" />
              <Skeleton className="mt-2 h-10 w-full" />
            </div>
            <div className="sm:col-span-2">
              <Skeleton className="h-10 w-32" />
            </div>
          </div>
        ) : (
          <form onSubmit={handleSaveProfile} className="mt-4">
            {profileLoadError && (
              <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                {profileLoadError}
              </div>
            )}

            {profileState &&
              (profileState.type === "error" ? (
                <ErrorCard className="mb-4">{profileState.message}</ErrorCard>
              ) : (
                <SuccessCard className="mb-4">
                  {profileState.message}
                </SuccessCard>
              ))}

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label
                  htmlFor="full-name"
                  className="mb-1 block text-sm font-medium text-navy"
                >
                  Full name
                </label>
                <input
                  id="full-name"
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  maxLength={120}
                  className={inputClass}
                  placeholder="Jane Doe"
                />
              </div>

              <div>
                <label
                  htmlFor="company-name"
                  className="mb-1 block text-sm font-medium text-navy"
                >
                  Company name
                </label>
                <input
                  id="company-name"
                  type="text"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  maxLength={120}
                  className={inputClass}
                  placeholder="Acme Security Ltd."
                />
              </div>

              <div>
                <label
                  htmlFor="email"
                  className="mb-1 block text-sm font-medium text-navy"
                >
                  Email
                </label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  readOnly
                  className={inputDisabledClass}
                  placeholder="you@company.com"
                />
                <p className="mt-1 text-xs text-muted-foreground">
                  Your email cannot be changed here.
                </p>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-navy">
                  Role
                </label>
                <p className="rounded-lg border border-border bg-surface-tint px-3 py-2 text-sm text-muted-foreground">
                  {role || "user"}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Roles are managed by an administrator.
                </p>
              </div>
            </div>

            <div className="mt-5">
              <button
                type="submit"
                disabled={savingProfile || loadingProfile}
                className={btnPrimary}
              >
                {savingProfile ? "Saving..." : "Save profile"}
              </button>
            </div>
          </form>
        )}
      </div>

      {/* Plan */}
      <div className="mt-6 app-card sm:p-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-base font-semibold text-navy">Plan</h2>
          <div className="flex gap-2">
            {isAdmin && (
              <Link href="/dashboard/admin" className={btnSmSecondary}>
                Admin panel
              </Link>
            )}
            <Link href="/pricing" className={btnSmSecondary}>
              Upgrade
            </Link>
          </div>
        </div>

        {loadingProfile ? (
          <div className="mt-4">
            <Skeleton className="h-6 w-32" />
          </div>
        ) : (() => {
          const current =
            activePlans.find((plan) => plan.key === planKey) ?? null;
          const limits = parseLimits(current?.limits ?? null);
          const rows: { label: string; value: string }[] = [
            {
              label: "Documents",
              value: limits.documents === null ? "Unlimited" : String(limits.documents),
            },
            {
              label: "Questionnaires / month",
              value:
                limits.questionnaires_per_month === null
                  ? "Unlimited"
                  : String(limits.questionnaires_per_month),
            },
            {
              label: "AI requests / day",
              value:
                limits.ai_requests_per_day === null
                  ? "Unlimited"
                  : String(limits.ai_requests_per_day),
            },
            {
              label: "Seats",
              value: limits.seats === null ? "Unlimited" : String(limits.seats),
            },
          ];
          return (
            <div className="mt-4">
              <div className="flex flex-wrap items-center gap-3">
                <Badge tone={current ? "primary" : "gray"}>
                  {current ? current.name : planKey}
                </Badge>
                {current && current.price_monthly > 0 && (
                  <span className="text-sm text-muted-foreground">
                    ${current.price_monthly}/mo
                  </span>
                )}
                {current && current.price_monthly === 0 && (
                  <span className="text-sm text-muted-foreground">
                    Free
                  </span>
                )}
              </div>
              <dl className="mt-4 grid gap-x-8 gap-y-2 text-sm sm:grid-cols-2">
                {rows.map((row) => (
                  <div
                    key={row.label}
                    className="flex items-center justify-between gap-4 border-b border-border/60 pb-1"
                  >
                    <dt className="text-muted-foreground">{row.label}</dt>
                    <dd className="font-medium text-navy">{row.value}</dd>
                  </div>
                ))}
              </dl>
              <p className="mt-3 text-xs text-muted-foreground">
                Payments are not enabled yet — plans are assigned by an
                administrator until checkout goes live.
              </p>
            </div>
          );
        })()}
      </div>

      {/* Password */}
      <div className="mt-6 app-card sm:p-8">
        <h2 className="text-base font-semibold text-navy">
          Change password
        </h2>

        <form onSubmit={handleChangePassword} className="mt-4">
          {passwordState &&
            (passwordState.type === "error" ? (
              <ErrorCard className="mb-4">{passwordState.message}</ErrorCard>
            ) : (
              <SuccessCard className="mb-4">
                {passwordState.message}
              </SuccessCard>
            ))}

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label
                htmlFor="new-password"
                className="mb-1 block text-sm font-medium text-navy"
              >
                New password
              </label>
              <input
                id="new-password"
                type="password"
                required
                minLength={8}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={inputClass}
                placeholder="At least 8 characters"
              />
            </div>

            <div>
              <label
                htmlFor="confirm-new-password"
                className="mb-1 block text-sm font-medium text-navy"
              >
                Confirm new password
              </label>
              <input
                id="confirm-new-password"
                type="password"
                required
                minLength={8}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className={inputClass}
                placeholder="Repeat the new password"
              />
            </div>
          </div>

          <div className="mt-5">
            <button
              type="submit"
              disabled={changingPassword}
              className={btnPrimary}
            >
              {changingPassword ? "Updating..." : "Change password"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
