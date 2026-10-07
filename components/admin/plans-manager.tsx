"use client";

import { useCallback, useEffect, useState } from "react";
import {
  PLAN_KEYS,
  toPlan,
  type Plan,
  type PlanKey,
} from "@/lib/plans";
import {
  ErrorCard,
  SuccessCard,
  btnSmDanger,
  btnSmPrimary,
  btnSmSecondary,
  inputClass,
} from "@/components/dashboard/ui";

// ============================================================
// Admin → Plans: list/edit/create/delete pricing plans.
// Limits: an empty input = unlimited (null in the DB).
// ============================================================

type Draft = {
  name: string;
  price_monthly: string;
  price_yearly: string;
  sort_order: string;
  active: boolean;
  featuresText: string;
  limits: {
    documents: string;
    questionnaires_per_month: string;
    ai_requests_per_day: string;
    seats: string;
  };
};

function limitToInput(value: number | null): string {
  return value === null ? "" : String(value);
}

function toDraft(plan: Plan): Draft {
  return {
    name: plan.name,
    price_monthly: String(plan.price_monthly),
    price_yearly: String(plan.price_yearly),
    sort_order: String(plan.sort_order),
    active: plan.active,
    featuresText: plan.features.join("\n"),
    limits: {
      documents: limitToInput(plan.limits.documents),
      questionnaires_per_month: limitToInput(
        plan.limits.questionnaires_per_month
      ),
      ai_requests_per_day: limitToInput(plan.limits.ai_requests_per_day),
      seats: limitToInput(plan.limits.seats),
    },
  };
}

function inputToLimit(value: string): number | null {
  const trimmed = value.trim();
  if (trimmed === "") return null;
  const parsed = Number(trimmed);
  if (!Number.isFinite(parsed) || parsed < 0) return null;
  return Math.floor(parsed);
}

function draftToBody(draft: Draft): Record<string, unknown> {
  const monthly = Number(draft.price_monthly);
  const yearly = Number(draft.price_yearly);
  return {
    name: draft.name.trim(),
    price_monthly: Number.isFinite(monthly) && monthly >= 0 ? monthly : 0,
    price_yearly: Number.isFinite(yearly) && yearly >= 0 ? yearly : 0,
    sort_order: Number(draft.sort_order) || 0,
    active: draft.active,
    features: draft.featuresText
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean),
    limits: {
      documents: inputToLimit(draft.limits.documents),
      questionnaires_per_month: inputToLimit(
        draft.limits.questionnaires_per_month
      ),
      ai_requests_per_day: inputToLimit(draft.limits.ai_requests_per_day),
      seats: inputToLimit(draft.limits.seats),
    },
  };
}

function LimitInputs({
  draft,
  onChange,
}: {
  draft: Draft;
  onChange: (limits: Draft["limits"]) => void;
}) {
  const fields: { key: keyof Draft["limits"]; label: string }[] = [
    { key: "documents", label: "Documents" },
    { key: "questionnaires_per_month", label: "Questionnaires/mo" },
    { key: "ai_requests_per_day", label: "AI requests/day" },
    { key: "seats", label: "Seats" },
  ];
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {fields.map((field) => (
        <label key={field.key} className="block">
          <span className="app-label">{field.label}</span>
          <input
            type="number"
            min={0}
            placeholder="unlimited"
            className={inputClass}
            value={draft.limits[field.key]}
            onChange={(e) =>
              onChange({ ...draft.limits, [field.key]: e.target.value })
            }
          />
        </label>
      ))}
    </div>
  );
}

function PlanCard({
  plan,
  onSave,
  onDelete,
}: {
  plan: Plan;
  onSave: (id: string, body: Record<string, unknown>) => Promise<string | null>;
  onDelete: (id: string) => Promise<string | null>;
}) {
  const [draft, setDraft] = useState<Draft>(() => toDraft(plan));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    setSaved(false);
    const result = await onSave(plan.id, draftToBody(draft));
    setSaving(false);
    if (result) setError(result);
    else {
      setError(null);
      setSaved(true);
    }
  };

  const handleDelete = async () => {
    if (
      !window.confirm(
        `Delete the "${plan.name}" plan? Users on this plan fall back to trial limits.`
      )
    ) {
      return;
    }
    setSaving(true);
    const result = await onDelete(plan.id);
    setSaving(false);
    if (result) setError(result);
  };

  return (
    <div className="app-card">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="text-base font-semibold text-navy">
            {plan.name}
          </span>
          <span className="pill pill-gray">{plan.key}</span>
          <span
            className={`pill ${plan.active ? "pill-green" : "pill-red"}`}
          >
            {plan.active ? "active" : "inactive"}
          </span>
        </div>
        <div className="flex gap-2">
          <button
            className={btnSmPrimary}
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? "Saving…" : "Save"}
          </button>
          <button
            className={btnSmDanger}
            onClick={handleDelete}
            disabled={saving}
          >
            Delete
          </button>
        </div>
      </div>

      {error && (
        <div className="mt-3">
          <ErrorCard>{error}</ErrorCard>
        </div>
      )}
      {saved && !error && (
        <div className="mt-3">
          <SuccessCard>Saved.</SuccessCard>
        </div>
      )}

      <div className="mt-4 grid gap-3 sm:grid-cols-4">
        <label className="block">
          <span className="app-label">Name</span>
          <input
            className={inputClass}
            value={draft.name}
            onChange={(e) => setDraft({ ...draft, name: e.target.value })}
          />
        </label>
        <label className="block">
          <span className="app-label">Monthly price (USD)</span>
          <input
            type="number"
            min={0}
            className={inputClass}
            value={draft.price_monthly}
            onChange={(e) =>
              setDraft({ ...draft, price_monthly: e.target.value })
            }
          />
        </label>
        <label className="block">
          <span className="app-label">Yearly price (USD/mo)</span>
          <input
            type="number"
            min={0}
            className={inputClass}
            value={draft.price_yearly}
            onChange={(e) =>
              setDraft({ ...draft, price_yearly: e.target.value })
            }
          />
        </label>
        <label className="block">
          <span className="app-label">Sort order</span>
          <input
            type="number"
            min={0}
            className={inputClass}
            value={draft.sort_order}
            onChange={(e) =>
              setDraft({ ...draft, sort_order: e.target.value })
            }
          />
        </label>
      </div>

      <div className="mt-3">
        <LimitInputs
          draft={draft}
          onChange={(limits) => setDraft({ ...draft, limits })}
        />
      </div>

      <label className="mt-3 block">
        <span className="app-label">Features (one per line)</span>
        <textarea
          className={inputClass}
          rows={4}
          value={draft.featuresText}
          onChange={(e) =>
            setDraft({ ...draft, featuresText: e.target.value })
          }
        />
      </label>

      <label className="mt-3 flex items-center gap-2 text-sm text-navy">
        <input
          type="checkbox"
          checked={draft.active}
          onChange={(e) => setDraft({ ...draft, active: e.target.checked })}
        />
        Active (visible for purchase/selection)
      </label>
    </div>
  );
}

function CreatePlanCard({
  existingKeys,
  onCreate,
}: {
  existingKeys: PlanKey[];
  onCreate: (body: Record<string, unknown>) => Promise<string | null>;
}) {
  const available = PLAN_KEYS.filter((key) => !existingKeys.includes(key));
  const [key, setKey] = useState<PlanKey | "">(available[0] ?? "");
  const [name, setName] = useState("");
  const [priceMonthly, setPriceMonthly] = useState("");
  const [priceYearly, setPriceYearly] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (available.length === 0) {
    return null;
  }

  const handleCreate = async () => {
    if (!key) {
      setError("Choose a plan key.");
      return;
    }
    setSaving(true);
    const result = await onCreate({
      key,
      name: name.trim() || key,
      price_monthly: priceMonthly || 0,
      price_yearly: priceYearly || 0,
      sort_order: PLAN_KEYS.indexOf(key),
    });
    setSaving(false);
    if (result) setError(result);
    else {
      setError(null);
      setKey(available.find((k) => k !== key) ?? "");
      setName("");
      setPriceMonthly("");
      setPriceYearly("");
    }
  };

  return (
    <div className="app-card">
      <p className="text-sm font-semibold text-navy">Create plan</p>
      {error && (
        <div className="mt-3">
          <ErrorCard>{error}</ErrorCard>
        </div>
      )}
      <div className="mt-3 grid gap-3 sm:grid-cols-4">
        <label className="block">
          <span className="app-label">Key</span>
          <select
            className="app-select"
            value={key}
            onChange={(e) => setKey(e.target.value as PlanKey)}
          >
            {available.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="app-label">Name</span>
          <input
            className={inputClass}
            placeholder={key}
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </label>
        <label className="block">
          <span className="app-label">Monthly (USD)</span>
          <input
            type="number"
            min={0}
            className={inputClass}
            value={priceMonthly}
            onChange={(e) => setPriceMonthly(e.target.value)}
          />
        </label>
        <label className="block">
          <span className="app-label">Yearly (USD/mo)</span>
          <input
            type="number"
            min={0}
            className={inputClass}
            value={priceYearly}
            onChange={(e) => setPriceYearly(e.target.value)}
          />
        </label>
      </div>
      <button
        className={`${btnSmSecondary} mt-3`}
        onClick={handleCreate}
        disabled={saving}
      >
        {saving ? "Creating…" : "Create"}
      </button>
    </div>
  );
}

export default function PlansManager() {
  const [plans, setPlans] = useState<Plan[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const response = await fetch("/api/admin/plans");
    const data = await response.json().catch(() => null);
    if (!response.ok) {
      setPlans([]);
      setError(data?.error ?? "Could not load plans.");
      return;
    }
    setPlans(((data?.plans ?? []) as Record<string, unknown>[]).map(toPlan));
    setError(null);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleSave = async (
    id: string,
    body: Record<string, unknown>
  ): Promise<string | null> => {
    const response = await fetch(`/api/admin/plans/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await response.json().catch(() => null);
    if (!response.ok) return data?.error ?? "Could not save the plan.";
    await load();
    return null;
  };

  const handleDelete = async (id: string): Promise<string | null> => {
    const response = await fetch(`/api/admin/plans/${id}`, {
      method: "DELETE",
    });
    const data = await response.json().catch(() => null);
    if (!response.ok) return data?.error ?? "Could not delete the plan.";
    await load();
    return null;
  };

  const handleCreate = async (
    body: Record<string, unknown>
  ): Promise<string | null> => {
    const response = await fetch("/api/admin/plans", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await response.json().catch(() => null);
    if (!response.ok) return data?.error ?? "Could not create the plan.";
    await load();
    return null;
  };

  if (plans === null) {
    return <div className="app-card">Loading plans…</div>;
  }

  return (
    <div className="space-y-4">
      {error && <ErrorCard>{error}</ErrorCard>}
      {plans.length === 0 && !error && (
        <div className="app-card">
          No plans found — has supabase/admin_plans.sql been applied?
        </div>
      )}
      {plans.map((plan) => (
        <PlanCard
          key={plan.id}
          plan={plan}
          onSave={handleSave}
          onDelete={handleDelete}
        />
      ))}
      <CreatePlanCard
        existingKeys={plans.map((plan) => plan.key)}
        onCreate={handleCreate}
      />
    </div>
  );
}
