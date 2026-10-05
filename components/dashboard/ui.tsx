import type { ReactNode } from "react";

// ============================================================
// Shared UI: buttons, badges, inputs, page headers, empty states,
// skeletons and alert cards — Trustloop design system tokens
// (see "Trustloop app" section in app/globals.css).
// Presentation only — no logic.
// ============================================================

// ---------- Buttons ----------

export const btnPrimary = "btn btn-primary";

export const btnSecondary = "btn btn-secondary";

export const btnDanger = "btn btn-danger";

export const btnSuccess = "btn btn-success";

export const btnSmPrimary = "btn btn-primary btn-sm";

export const btnSmSecondary = "btn btn-secondary btn-sm";

export const btnSmDanger = "btn btn-danger btn-sm";

export const btnSmSuccess = "btn btn-success btn-sm";

export const btnSmOutlinePrimary = "btn btn-outline-primary btn-sm";

export const inputClass = "app-input";

export const inputDisabledClass = "app-input";

export const selectClass = "app-select";

// ---------- Badges ----------

const badgeTones: Record<string, string> = {
  gray: "pill-gray",
  blue: "pill-blue",
  green: "pill-green",
  amber: "pill-amber",
  red: "pill-red",
  primary: "pill-primary",
  orange: "pill-amber",
};

export function Badge({
  tone = "gray",
  children,
  className = "",
}: {
  tone?: keyof typeof badgeTones | string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={`pill ${badgeTones[tone] ?? badgeTones.gray} ${className}`}
    >
      {children}
    </span>
  );
}

// ---------- Page header ----------

export function PageHeader({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children?: ReactNode;
}) {
  return (
    <div className="app-page-header">
      <div className="min-w-0">
        <h1 className="app-title">{title}</h1>
        {subtitle && <p className="app-subtitle">{subtitle}</p>}
      </div>
      {children && <div className="app-header-actions">{children}</div>}
    </div>
  );
}

// ---------- Empty state ----------

const defaultEmptyIcon = (
  <path
    strokeLinecap="round"
    strokeLinejoin="round"
    d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z"
  />
);

export function EmptyState({
  title,
  description,
  icon = defaultEmptyIcon,
  children,
}: {
  title: string;
  description?: string;
  icon?: ReactNode;
  children?: ReactNode;
}) {
  return (
    <div className="app-empty">
      <div className="app-empty-icon">
        <svg
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={1.6}
          stroke="currentColor"
          aria-hidden="true"
        >
          {icon}
        </svg>
      </div>
      <p className="app-empty-title">{title}</p>
      {description && <p className="app-empty-desc">{description}</p>}
      {children && <div className="app-empty-actions">{children}</div>}
    </div>
  );
}

// ---------- Alert cards ----------

export function ErrorCard({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div role="alert" className={`app-alert app-alert-error ${className}`}>
      <svg
        fill="none"
        viewBox="0 0 24 24"
        strokeWidth={2}
        stroke="currentColor"
        aria-hidden="true"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"
        />
      </svg>
      <span>{children}</span>
    </div>
  );
}

export function SuccessCard({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div role="status" className={`app-alert app-alert-success ${className}`}>
      <svg
        fill="none"
        viewBox="0 0 24 24"
        strokeWidth={2}
        stroke="currentColor"
        aria-hidden="true"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
        />
      </svg>
      <span>{children}</span>
    </div>
  );
}

export function NoticeCard({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div role="status" className={`app-alert app-alert-info ${className}`}>
      <svg
        fill="none"
        viewBox="0 0 24 24"
        strokeWidth={2}
        stroke="currentColor"
        aria-hidden="true"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z"
        />
      </svg>
      <span>{children}</span>
    </div>
  );
}

// ---------- Skeletons ----------

export function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`skeleton ${className}`} />;
}

export function CardSkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <div className="app-card">
      <Skeleton className="h-4 w-32" />
      <div className="mt-4 space-y-3">
        {Array.from({ length: rows }).map((_, i) => (
          <Skeleton key={i} className="h-4 w-full" />
        ))}
      </div>
    </div>
  );
}

export function ListSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <div className="app-table-scroll">
      {Array.from({ length: rows }).map((_, i) => (
        <div
          key={i}
          className="flex items-center gap-4 border-b border-border px-5 py-4 last:border-b-0"
        >
          <Skeleton className="h-9 w-9 shrink-0" />
          <div className="min-w-0 flex-1 space-y-2">
            <Skeleton className="h-3.5 w-1/2" />
            <Skeleton className="h-3 w-1/3" />
          </div>
          <Skeleton className="h-5 w-16 shrink-0" />
        </div>
      ))}
    </div>
  );
}
