"use client";

export default function DashboardError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="app-card p-10 text-center">
      <div className="mx-auto mb-3 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-red-50 text-red-600">
        <svg
          className="h-6 w-6"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={1.8}
          stroke="currentColor"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"
          />
          </svg>
      </div>
      <p className="text-lg font-semibold text-navy">Something went wrong</p>
      <p className="mt-2 text-sm text-muted-foreground">
        An unexpected error occurred while loading this page. Your data is
        safe — please try again.
      </p>
      <button onClick={() => reset()} className="btn btn-primary mt-5">
        Try again
      </button>
    </div>
  );
}
