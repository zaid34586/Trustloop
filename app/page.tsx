import Link from "next/link";

const benefits = [
  {
    title: "Save weeks of work",
    description:
      "Turn multi-week questionnaire marathons into a quick review session. Trustloop does the heavy lifting so your team can stay focused on building product.",
  },
  {
    title: "Answers from your own documents",
    description:
      "Trustloop drafts every answer from your own security policies, certifications and documentation — never generic boilerplate.",
  },
  {
    title: "You review and approve everything",
    description:
      "Nothing is sent automatically. Every drafted answer is reviewed, edited and approved by you before it reaches a customer.",
  },
];

export default function LandingPage() {
  return (
    <div className="flex min-h-screen flex-col bg-white">
      <header className="border-b border-gray-100">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 sm:px-6">
          <Link href="/" className="text-xl font-bold text-primary-800">
            Trustloop
          </Link>
          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="rounded-lg px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Log in
            </Link>
            <Link
              href="/signup"
              className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white hover:bg-primary-700"
            >
              Get Early Access
            </Link>
          </div>
        </div>
      </header>

      <main className="flex-1">
        <section className="mx-auto max-w-6xl px-4 py-16 text-center sm:px-6 sm:py-24">
          <h1 className="mx-auto max-w-3xl text-4xl font-extrabold tracking-tight text-gray-900 sm:text-5xl">
            Answer security questionnaires in minutes, not weeks
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-gray-600">
            Trustloop drafts answers to customer security questionnaires
            automatically, using AI grounded in your own security documents.
            You stay in control — review, edit and approve every answer before
            it goes out.
          </p>
          <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link
              href="/signup"
              className="w-full rounded-lg bg-primary-600 px-8 py-3 text-base font-semibold text-white shadow-sm hover:bg-primary-700 sm:w-auto"
            >
              Get Early Access
            </Link>
            <Link
              href="/login"
              className="w-full rounded-lg border border-gray-300 px-8 py-3 text-base font-semibold text-gray-700 hover:bg-gray-50 sm:w-auto"
            >
              Log in
            </Link>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-4 pb-20 sm:px-6">
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {benefits.map((benefit) => (
              <div
                key={benefit.title}
                className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm"
              >
                <div className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-lg bg-primary-50 text-primary-600">
                  <svg
                    className="h-5 w-5"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth={2}
                    stroke="currentColor"
                    aria-hidden="true"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M4.5 12.75l6 6 9-13.5"
                    />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-gray-900">
                  {benefit.title}
                </h3>
                <p className="mt-2 text-sm leading-6 text-gray-600">
                  {benefit.description}
                </p>
              </div>
            ))}
          </div>
        </section>
      </main>

      <footer className="border-t border-gray-100 py-8">
        <p className="text-center text-sm text-gray-500">
          Trustloop — Powered by Rivox
        </p>
      </footer>
    </div>
  );
}
