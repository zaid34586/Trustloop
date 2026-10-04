import type { Metadata } from "next";
import Link from "next/link";
import { SiteNav } from "@/components/marketing/site-nav";
import { SiteFooter } from "@/components/marketing/site-footer";

export const metadata: Metadata = {
  title: "Security — Trustloop",
  description:
    "How Trustloop handles your data: private file storage, per-user data isolation, HTTPS, and human approval before anything is exported.",
};

const controls = [
  {
    title: "Private file storage",
    description:
      "The documents and questionnaires you upload are stored in private storage buckets. Files are not publicly accessible — they can only be read through the app while you are signed in.",
    icon: (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M2.25 12l8.954-8.955a1.126 1.126 0 011.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75"
      />
    ),
  },
  {
    title: "Per-user data isolation",
    description:
      "Every account only ever sees its own data. Row-level security in the database and per-folder storage policies scope documents, questionnaires and answers to the signed-in user.",
    icon: (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75A2.25 2.25 0 004.5 12.75v6.75a2.25 2.25 0 002.25 2.25z"
      />
    ),
  },
  {
    title: "HTTPS everywhere",
    description:
      "All traffic between your browser and Trustloop is encrypted over HTTPS, including sign-in, uploads, AI drafting and exports.",
    icon: (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z"
      />
    ),
  },
  {
    title: "Human approval before export",
    description:
      "Nothing is sent automatically. Every drafted answer must be reviewed and approved by you before it can be exported — a person always signs off on what leaves Trustloop.",
    icon: (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M9 12.75L11.25 15 15 9.75M21 12c0 1.268-.63 2.39-1.593 3.068a3.745 3.745 0 01-1.043 3.296 3.745 3.745 0 01-3.296 1.043A3.745 3.745 0 0112 21c-1.268 0-2.39-.63-3.068-1.593a3.746 3.746 0 01-3.296-1.043 3.745 3.745 0 01-1.043-3.296A3.745 3.745 0 013 12c0-1.268.63-2.39 1.593-3.068a3.745 3.745 0 011.043-3.296 3.746 3.746 0 013.296-1.043A3.746 3.746 0 0112 3c1.268 0 2.39.63 3.068 1.593a3.746 3.746 0 013.296 1.043 3.746 3.746 0 011.043 3.296A3.745 3.745 0 0121 12z"
      />
    ),
  },
];

export default function SecurityPage() {
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
              Security
            </p>
            <h1 className="mt-3 text-4xl font-bold tracking-tight text-gray-900 sm:text-5xl">
              Your data stays yours
            </h1>
            <p className="mx-auto mt-5 max-w-2xl text-lg leading-8 text-gray-600">
              Trustloop is built around four straightforward safeguards for
              the documents and answers you work with.
            </p>
          </div>
        </section>

        {/* Controls */}
        <section className="py-24 sm:py-32">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="grid gap-6 sm:grid-cols-2">
              {controls.map((control) => (
                <div
                  key={control.title}
                  className="group rounded-2xl border border-gray-200 bg-white p-8 shadow-sm transition-all duration-200 hover:-translate-y-1 hover:border-primary-200 hover:shadow-lg"
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
                      {control.icon}
                    </svg>
                  </div>
                  <h2 className="mt-5 text-lg font-semibold text-gray-900">
                    {control.title}
                  </h2>
                  <p className="mt-2 text-sm leading-6 text-gray-600">
                    {control.description}
                  </p>
                </div>
              ))}
            </div>

            {/* Contact */}
            <div className="mt-14 rounded-2xl border border-gray-200 bg-gray-50/70 px-6 py-8 text-center sm:px-8">
              <h2 className="text-lg font-semibold text-gray-900">
                Questions about how Trustloop handles your data?
              </h2>
              <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-gray-600">
                Reach out and we will be happy to explain how storage,
                isolation, and the approval workflow behave.
              </p>
              <div className="mt-6">
                <Link
                  href="/contact"
                  className="inline-flex w-full justify-center rounded-xl bg-primary-600 px-6 py-3 text-sm font-semibold text-white shadow-sm transition-all duration-150 hover:bg-primary-700 hover:shadow-md sm:w-auto"
                >
                  Contact us
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
