"use client";

import { useCallback, useEffect, useState } from "react";
import { toPlan, type Plan } from "@/lib/plans";
import {
  ErrorCard,
  SuccessCard,
  btnSmDanger,
  btnSmPrimary,
  inputClass,
} from "@/components/dashboard/ui";

// ============================================================
// Admin → Offers: discount codes tied to a plan (optional).
// Ready for the payment gateway integration (synced via API).
// ============================================================

type OfferRow = {
  id: string;
  plan_id: string | null;
  code: string;
  percent: number;
  active: boolean;
  starts_at: string | null;
  ends_at: string | null;
};

function toInputDate(value: string | null): string {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function OfferForm({
  plans,
  offer,
  onSubmit,
  submitLabel,
}: {
  plans: Plan[];
  offer: Partial<OfferRow>;
  onSubmit: (body: Record<string, unknown>) => Promise<string | null>;
  submitLabel: string;
}) {
  const [code, setCode] = useState(offer.code ?? "");
  const [percent, setPercent] = useState(String(offer.percent ?? 10));
  const [planId, setPlanId] = useState(offer.plan_id ?? "");
  const [active, setActive] = useState(offer.active ?? true);
  const [startsAt, setStartsAt] = useState(toInputDate(offer.starts_at ?? null));
  const [endsAt, setEndsAt] = useState(toInputDate(offer.ends_at ?? null));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const handleSubmit = async () => {
    setSaving(true);
    setSaved(false);
    const result = await onSubmit({
      code: code.trim(),
      percent: Number(percent),
      plan_id: planId || null,
      active,
      starts_at: startsAt || null,
      ends_at: endsAt || null,
    });
    setSaving(false);
    if (result) setError(result);
    else {
      setError(null);
      setSaved(true);
    }
  };

  return (
    <div className="app-card">
      <div className="grid gap-3 sm:grid-cols-3">
        <label className="block">
          <span className="app-label">Code</span>
          <input
            className={inputClass}
            placeholder="LAUNCH20"
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
          />
        </label>
        <label className="block">
          <span className="app-label">Discount %</span>
          <input
            type="number"
            min={1}
            max={100}
            className={inputClass}
            value={percent}
            onChange={(e) => setPercent(e.target.value)}
          />
        </label>
        <label className="block">
          <span className="app-label">Plan (optional)</span>
          <select
            className="app-select"
            value={planId}
            onChange={(e) => setPlanId(e.target.value)}
          >
            <option value="">Any plan</option>
            {plans.map((plan) => (
              <option key={plan.id} value={plan.id}>
                {plan.name}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="app-label">Starts (optional)</span>
          <input
            type="datetime-local"
            className={inputClass}
            value={startsAt}
            onChange={(e) => setStartsAt(e.target.value)}
          />
        </label>
        <label className="block">
          <span className="app-label">Ends (optional)</span>
          <input
            type="datetime-local"
            className={inputClass}
            value={endsAt}
            onChange={(e) => setEndsAt(e.target.value)}
          />
        </label>
        <label className="flex items-end gap-2 pb-2 text-sm text-navy">
          <input
            type="checkbox"
            checked={active}
            onChange={(e) => setActive(e.target.checked)}
          />
          Active
        </label>
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

      <button
        className={`${btnSmPrimary} mt-3`}
        onClick={handleSubmit}
        disabled={saving}
      >
        {saving ? "Saving…" : submitLabel}
      </button>
    </div>
  );
}

export default function OffersManager() {
  const [offers, setOffers] = useState<OfferRow[] | null>(null);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const [offersRes, plansRes] = await Promise.all([
      fetch("/api/admin/offers"),
      fetch("/api/admin/plans"),
    ]);
    const offersData = await offersRes.json().catch(() => null);
    if (!offersRes.ok) {
      setOffers([]);
      setError(offersData?.error ?? "Could not load offers.");
    } else {
      setOffers((offersData?.offers ?? []) as OfferRow[]);
      setError(null);
    }
    const plansData = await plansRes.json().catch(() => null);
    if (plansRes.ok) {
      setPlans(
        ((plansData?.plans ?? []) as Record<string, unknown>[]).map(toPlan)
      );
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleCreate = async (body: Record<string, unknown>) => {
    const response = await fetch("/api/admin/offers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await response.json().catch(() => null);
    if (!response.ok) return data?.error ?? "Could not create the offer.";
    await load();
    return null;
  };

  const handleUpdate = async (
    id: string,
    body: Record<string, unknown>
  ): Promise<string | null> => {
    const response = await fetch(`/api/admin/offers/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await response.json().catch(() => null);
    if (!response.ok) return data?.error ?? "Could not save the offer.";
    await load();
    return null;
  };

  const handleDelete = async (id: string): Promise<string | null> => {
    if (!window.confirm("Delete this offer code?")) return null;
    const response = await fetch(`/api/admin/offers/${id}`, {
      method: "DELETE",
    });
    const data = await response.json().catch(() => null);
    if (!response.ok) return data?.error ?? "Could not delete the offer.";
    await load();
    return null;
  };

  if (offers === null) {
    return <div className="app-card">Loading offers…</div>;
  }

  return (
    <div className="space-y-4">
      {error && <ErrorCard>{error}</ErrorCard>}

      <div>
        <p className="mb-2 text-sm font-semibold text-navy">New offer</p>
        <OfferForm plans={plans} offer={{}} onSubmit={handleCreate} submitLabel="Create" />
      </div>

      {offers.length === 0 && !error && (
        <div className="app-card">No offer codes yet.</div>
      )}

      {offers.map((offer) => (
        <div key={offer.id} className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="pill pill-blue">{offer.code}</span>
            <button
              className={btnSmDanger}
              onClick={() => handleDelete(offer.id)}
            >
              Delete
            </button>
          </div>
          <OfferForm
            plans={plans}
            offer={offer}
            onSubmit={(body) => handleUpdate(offer.id, body)}
            submitLabel="Save"
          />
        </div>
      ))}
    </div>
  );
}
