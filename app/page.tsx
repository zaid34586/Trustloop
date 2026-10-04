import Link from "next/link";
import { SiteNav } from "@/components/marketing/site-nav";
import { SiteFooter } from "@/components/marketing/site-footer";
import { DashboardMockup } from "@/components/marketing/dashboard-mockup";
import { PricingSection } from "@/components/marketing/pricing";
import { FaqSection } from "@/components/marketing/faq";
import { FinalCta } from "@/components/marketing/final-cta";

const features = [
  {
    title: "Upload your security documents",
    description:
      "Bring your policies, past answers and documentation as PDF or Word files. Trustloop processes and indexes them for search.",
    icon: (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5"
      />
    ),
  },
  {
    title: "AI drafts answers from your own documents",
    description:
      "Every answer is drafted by AI using only the documents you uploaded — never generic boilerplate, never invented facts.",
    icon: (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456z"
      />
    ),
  },
  {
    title: "Sources shown for every answer",
    description:
      "Each draft links back to the exact excerpts it came from, so you can verify an answer in seconds instead of hunting through files.",
    icon: (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25"
      />
    ),
  },
  {
    title: "Human review and approval",
    description:
      "Nothing is sent automatically. You review, edit and approve every answer — a person is always in the loop before anything leaves Trustloop.",
    icon: (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M9 12.75L11.25 15 15 9.75M21 12c0 1.268-.63 2.39-1.593 3.068a3.745 3.745 0 01-1.043 3.296 3.745 3.745 0 01-3.296 1.043A3.745 3.745 0 0112 21c-1.268 0-2.39-.63-3.068-1.593a3.746 3.746 0 01-3.296-1.043 3.745 3.745 0 01-1.043-3.296A3.745 3.745 0 013 12c0-1.268.63-2.39 1.593-3.068a3.745 3.745 0 011.043-3.296 3.746 3.746 0 013.296-1.043A3.746 3.746 0 0112 3c1.268 0 2.39.63 3.068 1.593a3.746 3.746 0 013.296 1.043 3.746 3.746 0 011.043 3.296A3.745 3.745 0 0121 12z"
      />
    ),
  },
  {
    title: "Export back to the customer's Excel",
    description:
      "Approved answers are exported into an Excel file in the format you received — ready to send back to the customer.",
    icon: (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3"
      />
    ),
  },
  {
    title: "Private by design",
    description:
      "Your files live in private storage, every account's data is isolated from everyone else's, and all traffic travels over HTTPS.",
    icon: (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75A2.25 2.25 0 004.5 12.75v6.75a2.25 2.25 0 002.25 2.25z"
      />
    ),
  },
];

const steps = [
  {
    number: "01",
    title: "Upload documents",
    description:
      "Add your security policies and documentation as PDF or Word files. Trustloop processes and indexes them so answers can be grounded in your content.",
  },
  {
    number: "02",
    title: "Upload the questionnaire",
    description:
      "Drop in the customer's Excel questionnaire. Trustloop extracts every question so you can start generating answers right away.",
  },
  {
    number: "03",
    title: "Review, approve and export",
    description:
      "AI drafts each answer with its sources. You review, edit and approve — then export the finished answers back to Excel.",
  },
];

export default function LandingPage() {
  return (
    <div className="flex min-h-screen flex-col bg-white">
      <SiteNav />

      <main className="flex-1">
        {/* Hero */}
        <section className="relative overflow-hidden">
          {/* Background glow */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0"
          >
            <div className="absolute -top-32 left-1/2 h-[32rem] w-[56rem] -translate-x-1/2 rounded-full bg-gradient-to-b from-primary-100/70 via-primary-50/40 to-transparent blur-3xl" />
          </div>

          <div className="relative mx-auto max-w-7xl px-4 pb-20 pt-16 sm:px-6 sm:pt-24 lg:px-8 lg:pt-28">
            <div className="mx-auto max-w-4xl text-center">
              <span className="inline-flex items-center gap-2 rounded-full border border-primary-200 bg-primary-50/80 px-4 py-1.5 text-sm font-medium text-primary-700">
                Security questionnaires, handled
              </span>
              <h1 className="mt-6 text-4xl font-bold tracking-tight text-gray-900 sm:text-5xl lg:text-6xl">
                Answer security questionnaires in minutes,{" "}
                <span className="text-primary-700">not weeks</span>
              </h1>
              <p className="mx-auto mt-6 max-w-2xl text-lg leading-8 text-gray-600">
                Trustloop drafts answers to customer security questionnaires
                automatically, using AI grounded in your own security
                documents. You stay in control — review, edit and approve every
                answer before it goes out.
              </p>
              <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
                <Link
                  href="/signup"
                  className="w-full rounded-xl bg-primary-600 px-8 py-3.5 text-base font-semibold text-white shadow-sm transition-all duration-150 hover:bg-primary-700 hover:shadow-md sm:w-auto"
                >
                  Get Early Access
                </Link>
                <Link
                  href="/#how-it-works"
                  className="w-full rounded-xl border border-gray-300 bg-white px-8 py-3.5 text-base font-semibold text-gray-700 transition-all duration-150 hover:border-primary-300 hover:bg-primary-50 hover:text-primary-700 sm:w-auto"
                >
                  See how it works
                </Link>
              </div>
            </div>

            {/* Dashboard mockup */}
            <div className="mx-auto mt-16 max-w-4xl">
              <DashboardMockup />
            </div>
          </div>
        </section>

        {/* Features */}
        <section id="features" className="scroll-mt-20 border-t border-gray-100 bg-white py-24 sm:py-32">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="mx-auto max-w-2xl text-center">
              <p className="text-sm font-semibold uppercase tracking-widest text-primary-600">
                Features
              </p>
              <h2 className="mt-3 text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
                Everything you need to answer questionnaires
              </h2>
              <p className="mt-4 text-lg text-gray-600">
                From upload to approved answers — one focused workflow, no
                busywork.
              </p>
            </div>

            <div className="mt-16 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {features.map((feature) => (
                <div
                  key={feature.title}
                  className="group rounded-2xl border border-gray-200 bg-white p-7 shadow-sm transition-all duration-200 hover:-translate-y-1 hover:border-primary-200 hover:shadow-lg"
                >
                  <div className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-primary-50 text-primary-600 transition-colors duration-200 group-hover:bg-primary-600 group-hover:text-white">
                    <svg
                      className="h-5 w-5"
                      fill="none"
                      viewBox="0 0 24 24"
                      strokeWidth={1.8}
                      stroke="currentColor"
                      aria-hidden="true"
                    >
                      {feature.icon}
                    </svg>
                  </div>
                  <h3 className="mt-5 text-base font-semibold text-gray-900">
                    {feature.title}
                  </h3>
                  <p className="mt-2 text-sm leading-6 text-gray-600">
                    {feature.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* How it works */}
        <section
          id="how-it-works"
          className="scroll-mt-20 border-t border-gray-100 bg-gray-50/70 py-24 sm:py-32"
        >
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="mx-auto max-w-2xl text-center">
              <p className="text-sm font-semibold uppercase tracking-widest text-primary-600">
                How it works
              </p>
              <h2 className="mt-3 text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
                From upload to approved answers in three steps
              </h2>
            </div>

            <div className="mt-16 grid gap-6 lg:grid-cols-3">
              {steps.map((step) => (
                <div
                  key={step.number}
                  className="relative rounded-2xl border border-gray-200 bg-white p-8 shadow-sm transition-all duration-200 hover:-translate-y-1 hover:shadow-lg"
                >
                  <span className="text-sm font-bold uppercase tracking-widest text-primary-600">
                    Step {step.number}
                  </span>
                  <h3 className="mt-3 text-xl font-semibold text-gray-900">
                    {step.title}
                  </h3>
                  <p className="mt-3 text-sm leading-6 text-gray-600">
                    {step.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Pricing */}
        <div className="border-t border-gray-100">
          <PricingSection />
        </div>

        {/* FAQ */}
        <div className="border-t border-gray-100">
          <FaqSection />
        </div>

        {/* Final CTA */}
        <FinalCta />
      </main>

      <SiteFooter />
    </div>
  );
}
