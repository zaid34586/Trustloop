import type { Metadata } from "next";
import Link from "next/link";
import { SiteNav } from "@/components/marketing/site-nav";
import { SiteFooter } from "@/components/marketing/site-footer";
import { FinalCta } from "@/components/marketing/final-cta";

export const metadata: Metadata = {
  title: "About — Trustloop",
  description:
    "Trustloop helps software companies answer customer security questionnaires with AI drafts grounded in their own documents. Powered by Rivox.",
};

const principles = [
  {
    title: "Grounded in your documents",
    description:
      "Every draft comes from the security documents you upload. If an answer is not in your documents, Trustloop says so instead of inventing one.",
  },
  {
    title: "Sources on every answer",
    description:
      "Each drafted answer shows the excerpts it was built from, so review is a matter of checking references — not starting from a blank page.",
  },
  {
    title: "A human approves everything",
    description:
      "Nothing leaves Trustloop automatically. You review, edit and approve every answer before it is exported back to the customer.",
  },
  {
    title: "Private by default",
    description:
      "Files are stored privately, each account's data is isolated from other accounts, and everything is served over HTTPS.",
  },
];

export default function AboutPage() {
  return (
    <div className="flex min-h-screen flex-col bg-white">
      <SiteNav />

      <main className="flex-1">
        {/* Hero */}
        <section className="relative overflow-hidden border-b border-gray-100">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0"
          >
            <div className="absolute -top-24 left-1/2 h-96 w-[48rem] -translate-x-1/2 rounded-full bg-gradient-to-b from-primary-100/70 to-transparent blur-3xl" />
          </div>
          <div className="relative mx-auto max-w-4xl px-4 py-20 text-center sm:px-6 sm:py-24 lg:px-8">
            <p className="text-sm font-semibold uppercase tracking-widest text-primary-600">
              About
            </p>
            <h1 className="mt-3 text-4xl font-bold tracking-tight text-gray-900 sm:text-5xl">
              Security questionnaires shouldn&apos;t take weeks
            </h1>
            <p className="mx-auto mt-5 max-w-2xl text-lg leading-8 text-gray-600">
              Trustloop helps software companies answer customer security
              questionnaires with AI drafted from their own documents — and a
              human approving every word before it goes out. Powered by Rivox.
            </p>
          </div>
        </section>

        {/* Story */}
        <section className="py-24 sm:py-32">
          <div className="mx-auto grid max-w-7xl gap-12 px-4 sm:px-6 lg:grid-cols-2 lg:gap-16 lg:px-8">
            <div>
              <h2 className="text-2xl font-bold tracking-tight text-gray-900 sm:text-3xl">
                What Trustloop does
              </h2>
              <div className="mt-5 space-y-4 text-base leading-7 text-gray-600">
                <p>
                  When a customer wants to do business with you, they often
                  send a security questionnaire — sometimes hundreds of
                  questions about your policies, encryption, access control
                  and more. Answering it means digging through documents you
                  have written over years.
                </p>
                <p>
                  Trustloop cuts that down to a review session. You upload
                  your security documents and the customer&apos;s Excel
                  questionnaire, and Trustloop drafts an answer for every
                  question — from your own content, with sources attached.
                </p>
                <p>
                  The drafts are a starting point, not the finish line. You
                  edit, approve and export only what you are comfortable
                  sending.
                </p>
              </div>
            </div>

            <div>
              <h2 className="text-2xl font-bold tracking-tight text-gray-900 sm:text-3xl">
                How we work
              </h2>
              <div className="mt-5 space-y-4 text-base leading-7 text-gray-600">
                <p>
                  We build Trustloop around a simple rule: the AI drafts, the
                  human decides. That means no auto-sending, no answers
                  outside your documents, and no shortcuts on privacy.
                </p>
                <p>
                  Trustloop is a Rivox product. For questions about the
                  product, billing or partnerships, get in touch via the{" "}
                  <Link
                    href="/contact"
                    className="font-medium text-primary-700 underline underline-offset-4 hover:text-primary-800"
                  >
                    contact page
                  </Link>
                  .
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Principles */}
        <section className="border-t border-gray-100 bg-gray-50/70 py-24 sm:py-32">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="mx-auto max-w-2xl text-center">
              <p className="text-sm font-semibold uppercase tracking-widest text-primary-600">
                Principles
              </p>
              <h2 className="mt-3 text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
                What we hold ourselves to
              </h2>
            </div>

            <div className="mt-14 grid gap-6 sm:grid-cols-2">
              {principles.map((principle) => (
                <div
                  key={principle.title}
                  className="rounded-2xl border border-gray-200 bg-white p-7 shadow-sm transition-all duration-200 hover:-translate-y-1 hover:border-primary-200 hover:shadow-lg"
                >
                  <h3 className="text-base font-semibold text-gray-900">
                    {principle.title}
                  </h3>
                  <p className="mt-2 text-sm leading-6 text-gray-600">
                    {principle.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <FinalCta />
      </main>

      <SiteFooter />
    </div>
  );
}
