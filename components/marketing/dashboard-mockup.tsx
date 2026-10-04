const rows = [
  {
    id: 1,
    question: "Do you encrypt customer data at rest?",
    answer: "Yes. All customer data is encrypted at rest.",
    sources: 2,
    status: "drafted",
  },
  {
    id: 2,
    question: "How often do you run vulnerability scans?",
    answer: "Vulnerability scans run on a regular, documented schedule.",
    sources: 1,
    status: "drafted",
  },
  {
    id: 3,
    question: "Do you have a documented incident response plan?",
    answer: "Yes. A documented incident response plan is in place.",
    sources: 2,
    status: "approved",
  },
];

export function DashboardMockup() {
  return (
    <div
      className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-xl shadow-primary-900/10 ring-1 ring-gray-900/5"
      aria-hidden="true"
    >
      {/* Window chrome */}
      <div className="flex items-center justify-between gap-3 border-b border-gray-100 bg-gray-50/80 px-4 py-3">
        <div className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-gray-300" />
          <span className="h-2.5 w-2.5 rounded-full bg-gray-300" />
          <span className="h-2.5 w-2.5 rounded-full bg-gray-300" />
        </div>
        <span className="rounded-full border border-amber-200 bg-amber-50 px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-amber-700">
          Sample data
        </span>
      </div>

      {/* Mockup header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-100 px-4 py-4 sm:px-6">
        <div>
          <p className="text-sm font-semibold text-gray-900">
            Acme Security Questionnaire
          </p>
          <p className="mt-0.5 text-xs text-gray-500">
            Review drafted answers, then approve and export
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="rounded-full bg-primary-50 px-2.5 py-1 text-xs font-medium text-primary-700">
            Drafted 2
          </span>
          <span className="rounded-full bg-green-50 px-2.5 py-1 text-xs font-medium text-green-700">
            Approved 1
          </span>
        </div>
      </div>

      {/* Rows */}
      <div className="divide-y divide-gray-100">
        {rows.map((row) => (
          <div
            key={row.id}
            className="px-4 py-4 transition-colors duration-150 hover:bg-gray-50/70 sm:px-6"
          >
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-gray-900">
                  {row.question}
                </p>
                <p className="mt-1.5 text-sm leading-6 text-gray-600">
                  <span className="font-medium text-gray-700">Answer: </span>
                  {row.answer}
                </p>
                <span className="mt-2 inline-flex items-center gap-1.5 rounded-md border border-gray-200 bg-white px-2 py-0.5 text-[11px] font-medium text-gray-500">
                  <svg
                    className="h-3 w-3"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25"
                    />
                  </svg>
                  Sources ({row.sources})
                </span>
              </div>

              <div className="shrink-0">
                {row.status === "approved" ? (
                  <span className="inline-flex items-center gap-1.5 rounded-lg border border-green-200 bg-green-50 px-3 py-1.5 text-xs font-semibold text-green-700">
                    <svg
                      className="h-3.5 w-3.5"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth={2.2}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M4.5 12.75l6 6 9-13.5"
                      />
                    </svg>
                    Approved
                  </span>
                ) : (
                  <button
                    type="button"
                    tabIndex={-1}
                    className="inline-flex items-center rounded-lg bg-primary-600 px-3.5 py-1.5 text-xs font-semibold text-white shadow-sm transition-colors duration-150 hover:bg-primary-700"
                  >
                    Approve
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Mockup footer */}
      <div className="flex items-center justify-between gap-3 border-t border-gray-100 bg-gray-50/60 px-4 py-3 sm:px-6">
        <p className="text-xs text-gray-500">
          Approve every answer before anything leaves Trustloop.
        </p>
        <span className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 shadow-sm">
          <svg
            className="h-3.5 w-3.5"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3"
            />
          </svg>
          Export to Excel
        </span>
      </div>
    </div>
  );
}
