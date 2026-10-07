import type { SupabaseClient } from "@supabase/supabase-js";

// ============================================================
// Plans — types, limits and fetch helpers for the admin-managed
// pricing plans (public.plans). Limits: null means unlimited.
// ============================================================

export type PlanKey = "starter" | "growth" | "business";

export type PlanLimits = {
  documents: number | null;
  questionnaires_per_month: number | null;
  ai_requests_per_day: number | null;
  seats: number | null;
};

export type Plan = {
  id: string;
  key: PlanKey;
  name: string;
  price_monthly: number;
  price_yearly: number;
  features: string[];
  limits: PlanLimits;
  active: boolean;
  sort_order: number;
};

export type Offer = {
  id: string;
  plan_id: string | null;
  code: string;
  percent: number;
  active: boolean;
  starts_at: string | null;
  ends_at: string | null;
};

export const PLAN_KEYS: PlanKey[] = ["starter", "growth", "business"];

// Fallback when the plans table is missing or a user's plan row is
// unknown: the smallest PAID (starter) limits — never fail open to
// "unlimited" and there is no free tier.
export const DEFAULT_LIMITS: PlanLimits = {
  documents: 25,
  questionnaires_per_month: 15,
  ai_requests_per_day: 200,
  seats: 3,
};

export function isPlanKey(value: unknown): value is PlanKey {
  return (
    typeof value === "string" && (PLAN_KEYS as string[]).includes(value)
  );
}

/** Coerces a DB/JSON limits object into a full PlanLimits. */
export function parseLimits(raw: unknown): PlanLimits {
  const out: PlanLimits = { ...DEFAULT_LIMITS };
  if (raw && typeof raw === "object") {
    const record = raw as Record<string, unknown>;
    for (const key of Object.keys(out) as (keyof PlanLimits)[]) {
      const value = record[key];
      if (value === null) {
        out[key] = null; // explicit null = unlimited
      } else if (typeof value === "number" && Number.isFinite(value) && value >= 0) {
        out[key] = Math.floor(value);
      }
    }
  }
  return out;
}

export function toPlan(row: Record<string, unknown>): Plan {
  return {
    id: String(row.id),
    key: row.key as PlanKey,
    name: String(row.name ?? ""),
    price_monthly: Number(row.price_monthly ?? 0),
    price_yearly: Number(row.price_yearly ?? 0),
    features: Array.isArray(row.features)
      ? (row.features as unknown[]).map(String)
      : [],
    limits: parseLimits(row.limits),
    active: Boolean(row.active),
    sort_order: Number(row.sort_order ?? 0),
  };
}

/**
 * Loads plans from the DB. Returns [] when the table does not
 * exist yet (pre-migration) so callers fall back to DEFAULT_LIMITS.
 */
export async function fetchPlans(
  supabase: SupabaseClient,
  options: { activeOnly?: boolean } = {}
): Promise<Plan[]> {
  try {
    let query = supabase
      .from("plans")
      .select("*")
      .order("sort_order", { ascending: true });
    if (options.activeOnly) {
      query = query.eq("active", true);
    }
    const { data, error } = await query;
    if (error || !data) return [];
    return data.map((row) => toPlan(row as Record<string, unknown>));
  } catch {
    return [];
  }
}

/** The plan row for a key, or null. */
export function planByKey(plans: Plan[], key: string): Plan | null {
  return plans.find((plan) => plan.key === key) ?? null;
}

/**
 * Limits for a plan key. Unknown/missing key → DEFAULT_LIMITS
 * (never unlimited).
 */
export function limitsForKey(plans: Plan[], key: string | null | undefined): PlanLimits {
  const plan = planByKey(plans, key ?? "starter");
  return plan ? plan.limits : DEFAULT_LIMITS;
}

// ---------- payload validation (admin APIs) ----------

export type ParseResult<T> =
  | { ok: true; value: T }
  | { ok: false; error: string };

export type PlanPayload = {
  key: PlanKey;
  name: string;
  price_monthly: number;
  price_yearly: number;
  features: string[];
  limits: PlanLimits;
  active: boolean;
  sort_order: number;
};

function numberField(
  source: Record<string, unknown>,
  field: string,
  errors: string[],
  { required = false, min = 0 }: { required?: boolean; min?: number } = {}
): number {
  const raw = source[field];
  if (raw === undefined || raw === null || raw === "") {
    if (required) errors.push(`${field} is required.`);
    return 0;
  }
  const value = Number(raw);
  if (!Number.isFinite(value) || value < min) {
    errors.push(`${field} must be a number >= ${min}.`);
    return 0;
  }
  return field === "sort_order" ? Math.floor(value) : Math.round(value * 100) / 100;
}

/**
 * Validates a create-style plan payload. For PATCH, pass only the
 * provided fields — undefined keys are filled from `fallback`.
 */
export function parsePlanPayload(
  body: Record<string, unknown>,
  fallback?: PlanPayload
): ParseResult<PlanPayload> {
  const errors: string[] = [];

  const key = body.key ?? fallback?.key;
  if (!isPlanKey(key)) {
    errors.push(
      `key must be one of: ${PLAN_KEYS.join(", ")}.`
    );
  }

  const nameRaw = body.name ?? fallback?.name;
  const name = typeof nameRaw === "string" ? nameRaw.trim() : "";
  if (!name) errors.push("name is required.");

  const price_monthly = numberField(body, "price_monthly", errors, {
    required: fallback === undefined,
    min: 0,
  });
  const price_yearly = numberField(body, "price_yearly", errors, {
    required: fallback === undefined,
    min: 0,
  });
  const sort_order =
    "sort_order" in body
      ? numberField(body, "sort_order", errors, { min: 0 })
      : (fallback?.sort_order ?? 0);

  let features = fallback?.features ?? [];
  if ("features" in body) {
    if (Array.isArray(body.features)) {
      features = body.features
        .filter((f): f is string => typeof f === "string")
        .map((f) => f.trim())
        .filter(Boolean);
    } else {
      errors.push("features must be an array of strings.");
    }
  }

  let limits = fallback?.limits ?? DEFAULT_LIMITS;
  if ("limits" in body) {
    if (body.limits && typeof body.limits === "object" && !Array.isArray(body.limits)) {
      limits = parseLimits({ ...limits, ...(body.limits as object) });
    } else {
      errors.push("limits must be an object.");
    }
  }

  const active =
    typeof body.active === "boolean" ? body.active : (fallback?.active ?? true);

  if (errors.length > 0) return { ok: false, error: errors.join(" ") };
  return {
    ok: true,
    value: {
      key: key as PlanKey,
      name,
      price_monthly:
        "price_monthly" in body ? price_monthly : (fallback?.price_monthly ?? 0),
      price_yearly:
        "price_yearly" in body ? price_yearly : (fallback?.price_yearly ?? 0),
      features,
      limits,
      active,
      sort_order,
    },
  };
}

export type OfferPayload = {
  code: string;
  percent: number;
  plan_id: string | null;
  active: boolean;
  starts_at: string | null;
  ends_at: string | null;
};

function optionalDate(
  value: unknown,
  field: string,
  errors: string[]
): string | null {
  if (value === undefined || value === null || value === "") return null;
  if (typeof value !== "string" || Number.isNaN(Date.parse(value))) {
    errors.push(`${field} must be a valid date.`);
    return null;
  }
  return new Date(value).toISOString();
}

export function parseOfferPayload(
  body: Record<string, unknown>,
  fallback?: OfferPayload
): ParseResult<OfferPayload> {
  const errors: string[] = [];

  const codeRaw = body.code ?? fallback?.code;
  const code = typeof codeRaw === "string" ? codeRaw.trim() : "";
  if (!code) errors.push("code is required.");
  else if (code.length > 40) errors.push("code must be <= 40 characters.");

  let percent = fallback?.percent ?? 0;
  if ("percent" in body) {
    const value = Number(body.percent);
    if (!Number.isInteger(value) || value < 1 || value > 100) {
      errors.push("percent must be a whole number between 1 and 100.");
    } else {
      percent = value;
    }
  } else if (fallback === undefined) {
    errors.push("percent is required.");
  }

  let plan_id: string | null = fallback?.plan_id ?? null;
  if ("plan_id" in body) {
    if (body.plan_id === null || body.plan_id === "") {
      plan_id = null;
    } else if (typeof body.plan_id === "string") {
      plan_id = body.plan_id;
    } else {
      errors.push("plan_id must be a plan id or null.");
    }
  }

  const starts_at =
    "starts_at" in body
      ? optionalDate(body.starts_at, "starts_at", errors)
      : (fallback?.starts_at ?? null);
  const ends_at =
    "ends_at" in body
      ? optionalDate(body.ends_at, "ends_at", errors)
      : (fallback?.ends_at ?? null);

  const active =
    typeof body.active === "boolean" ? body.active : (fallback?.active ?? true);

  if (errors.length > 0) return { ok: false, error: errors.join(" ") };
  return { ok: true, value: { code, percent, plan_id, active, starts_at, ends_at } };
}
