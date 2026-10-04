import type { Metadata } from "next";
import Link from "next/link";
import { SiteNav } from "@/components/marketing/site-nav";
import { SiteFooter } from "@/components/marketing/site-footer";

export const metadata: Metadata = {
  title: "Contact — Trustloop",
  description:
    "Get in touch with the Trustloop team — general enquiries, product questions and account help.",
};

const channels = [
  {
    title: "General enquiries",
    description:
      "Questions about Trustloop, pricing or partnerships — send us a message and we will get back to you.",
    contact: "[SUPPORT EMAIL]",
  },
  {
    title: "Product questions",
    description:
      "Curious how drafting, sources, approval or export works? Tell us what you are trying to do and we will walk you through it.",
    contact: "[SUPPORT EMAIL]",
  },
  {
    title: "Account help",
    description:
      "Trouble signing in or need to update your account details? Reach out and we will help you sort it out.",
    contact: "[SUPPORT EMAIL]",
  },
];

export default function ContactPage() {
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
              Contact
            </p>
            <h1 className="mt-3 text-4xl font-bold tracking-tight text-gray-900 sm:text-5xl">
              Talk to the Trustloop team
            </h1>
            <p className="mx-auto mt-5 max-w-2xl text-lg leading-8 text-gray-600">
              Whether you are evaluating Trustloop for your team or already
              answering questionnaires with it, we are happy to help.
            </p>
          </div>
        </section>

        {/* Channels */}
        <section className="py-24 sm:py-32">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="grid gap-6 md:grid-cols-3">
              {channels.map((channel) => (
                <div
                  key={channel.title}
                  className="rounded-2xl border border-gray-200 bg-white p-7 shadow-sm transition-all duration-200 hover:-translate-y-1 hover:border-primary-200 hover:shadow-lg"
                >
                  <div className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-primary-50 text-primary-600">
                    <svg
                      className="h-5 w-5"
                      fill="none"
                      viewBox="0 0 24 24"
                      strokeWidth={1.8}
                      stroke="currentColor"
                      aria-hidden="true"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75"
                      />
                    </svg>
                  </div>
                  <h2 className="mt-5 text-base font-semibold text-gray-900">
                    {channel.title}
                  </h2>
                  <p className="mt-2 text-sm leading-6 text-gray-600">
                    {channel.description}
                  </p>
                  <p className="mt-4 text-sm font-semibold text-primary-700">
                    {channel.contact}
                  </p>
                </div>
              ))}
            </div>

            {/* Account links */}
            <div className="mt-14 rounded-2xl border border-gray-200 bg-gray-50/70 px-6 py-8 text-center sm:px-8">
              <h2 className="text-lg font-semibold text-gray-900">
                Looking for your account?
              </h2>
              <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-gray-600">
                If you already use Trustloop, sign in to reach your documents
                and questionnaires — or create an account to get started.
              </p>
              <div className="mt-6 flex flex-col items-center justify-center gap-3 sm:flex-row">
                <Link
                  href="/login"
                  className="w-full rounded-xl bg-primary-600 px-6 py-3 text-sm font-semibold text-white shadow-sm transition-all duration-150 hover:bg-primary-700 hover:shadow-md sm:w-auto"
                >
                  Log in
                </Link>
                <Link
                  href="/signup"
                  className="w-full rounded-xl border border-gray-300 bg-white px-6 py-3 text-sm font-semibold text-gray-700 transition-all duration-150 hover:border-primary-300 hover:bg-primary-50 hover:text-primary-700 sm:w-auto"
                >
                  Get Early Access
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
