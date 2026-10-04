import Link from "next/link";

export function FinalCta() {
  return (
    <section className="bg-white pb-24 sm:pb-32">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="relative overflow-hidden rounded-3xl bg-primary-900 px-6 py-16 shadow-2xl shadow-primary-900/25 sm:px-12 sm:py-20">
          {/* Subtle glow */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-primary-600/30 blur-3xl"
          />
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -bottom-32 -left-16 h-72 w-72 rounded-full bg-primary-500/20 blur-3xl"
          />

          <div className="relative mx-auto max-w-3xl text-center">
            <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
              Answer your next questionnaire in minutes
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-lg leading-8 text-primary-100">
              Upload your security documents, let Trustloop draft the answers,
              and approve every word before it reaches your customer.
            </p>
            <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Link
                href="/signup"
                className="w-full rounded-xl bg-white px-8 py-3.5 text-base font-semibold text-primary-800 shadow-sm transition-all duration-150 hover:bg-primary-50 hover:shadow-md sm:w-auto"
              >
                Get Early Access
              </Link>
              <Link
                href="/pricing"
                className="w-full rounded-xl border border-white/30 px-8 py-3.5 text-base font-semibold text-white transition-all duration-150 hover:bg-white/10 sm:w-auto"
              >
                See pricing
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
