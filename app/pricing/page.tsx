import type { Metadata } from "next";
import { SiteNav } from "@/components/marketing/site-nav";
import { SiteFooter } from "@/components/marketing/site-footer";
import { PricingSection } from "@/components/marketing/pricing";
import { FaqSection } from "@/components/marketing/faq";

export const metadata: Metadata = {
  title: "Pricing — Trustloop",
  description:
    "Simple, transparent pricing for Trustloop. Monthly or yearly (15% off). Every plan drafts answers from your own documents.",
};

export default function PricingPage() {
  return (
    <div className="flex min-h-screen flex-col bg-white">
      <SiteNav />

      <main className="flex-1">
        {/* Page hero */}
        <section className="relative overflow-hidden border-b border-gray-100">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0"
          >
            <div className="absolute -top-24 left-1/2 h-96 w-[48rem] -translate-x-1/2 rounded-full bg-gradient-to-b from-primary-100/70 to-transparent blur-3xl" />
          </div>
          <div className="relative mx-auto max-w-7xl px-4 py-20 text-center sm:px-6 sm:py-24 lg:px-8">
            <p className="text-sm font-semibold uppercase tracking-widest text-primary-600">
              Pricing
            </p>
            <h1 className="mt-3 text-4xl font-bold tracking-tight text-gray-900 sm:text-5xl">
              Plans for every questionnaire workload
            </h1>
            <p className="mx-auto mt-5 max-w-2xl text-lg leading-8 text-gray-600">
              All plans draft answers from your own documents, show sources on
              every answer, and keep a human in the loop before anything is
              exported.
            </p>
          </div>
        </section>

        <PricingSection showHeading={false} />

        <div className="border-t border-gray-100">
          <FaqSection />
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}
