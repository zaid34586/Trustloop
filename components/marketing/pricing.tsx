"use client";

import Link from "next/link";
import { useState } from "react";

type Plan = {
  name: string;
  monthly: number;
  blurb: string;
  features: string[];
  popular?: boolean;
};

const plans: Plan[] = [
  {
    name: "Starter",
    monthly: 149,
    blurb: "For your first security questionnaires.",
    features: [
      "Upload PDF and Word security documents",
      "AI drafts answers from your own documents",
      "Sources shown on every answer",
      "Review, edit and approve every answer",
      "Export back to the customer's Excel file",
    ],
  },
  {
    name: "Growth",
    monthly: 349,
    blurb: "For companies answering questionnaires every month.",
    features: [
      "Everything in Starter",
      "Answer generation across the full questionnaire",
      "Ask questions across your documents",
      "Email support",
    ],
    popular: true,
  },
  {
    name: "Business",
    monthly: 799,
    blurb: "For organizations with continuous security reviews.",
    features: [
      "Everything in Growth",
      "Draft, review, approve and export in one workflow",
      "Answers grounded in your own documents, with sources",
      "Human approval before anything is exported",
    ],
  },
];

const includedInAllPlans = [
  "Private file storage",
  "Per-user data isolation",
  "HTTPS",
  "Human approval before export",
];

function yearlyPrice(monthly: number): number {
  return Math.round(monthly * 0.85);
}

export function PricingSection({
  id = "pricing",
  showHeading = true,
}: {
  id?: string;
  showHeading?: boolean;
}) {
  const [yearly, setYearly] = useState(false);

  return (
    <section id={id} className="scroll-mt-20 bg-white py-24 sm:py-32">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {showHeading && (
          <div className="mx-auto max-w-2xl text-center">
            <p className="text-sm font-semibold uppercase tracking-widest text-primary-600">
              Pricing
            </p>
            <h2 className="mt-3 text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
              Simple, transparent pricing
            </h2>
            <p className="mt-4 text-lg text-gray-600">
              Pick a plan, upgrade or cancel any time. Every plan drafts
              answers from your own documents.
            </p>
          </div>
        )}

        {/* Billing toggle */}
        <div className="mt-10 flex justify-center">
          <div className="inline-flex items-center gap-1 rounded-full border border-gray-200 bg-gray-50 p-1">
            <button
              type="button"
              onClick={() => setYearly(false)}
              className={`rounded-full px-5 py-2 text-sm font-semibold transition-all duration-150 ${
                !yearly
                  ? "bg-white text-gray-900 shadow-sm"
                  : "text-gray-500 hover:text-gray-700"
              }`}
              aria-pressed={!yearly}
            >
              Monthly
            </button>
            <button
              type="button"
              onClick={() => setYearly(true)}
              className={`flex items-center gap-2 rounded-full px-5 py-2 text-sm font-semibold transition-all duration-150 ${
                yearly
                  ? "bg-white text-gray-900 shadow-sm"
                  : "text-gray-500 hover:text-gray-700"
              }`}
              aria-pressed={yearly}
            >
              Yearly
              <span
                className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                  yearly
                    ? "bg-primary-50 text-primary-700"
                    : "bg-primary-600 text-white"
                }`}
              >
                Save 15%
              </span>
            </button>
          </div>
        </div>

        {/* Plans */}
        <div className="mt-14 grid gap-6 lg:grid-cols-3">
          {plans.map((plan) => {
            const price = yearly ? yearlyPrice(plan.monthly) : plan.monthly;
            return (
              <div
                key={plan.name}
                className={`relative flex flex-col rounded-3xl border bg-white p-8 transition-all duration-200 ${
                  plan.popular
                    ? "border-primary-600 shadow-xl shadow-primary-900/10 ring-1 ring-primary-600"
                    : "border-gray-200 shadow-sm hover:-translate-y-1 hover:border-primary-200 hover:shadow-lg"
                }`}
              >
                {plan.popular && (
                  <span className="absolute -top-3.5 left-1/2 -translate-x-1/2 rounded-full bg-primary-600 px-4 py-1 text-xs font-semibold uppercase tracking-wide text-white shadow-sm">
                    Most popular
                  </span>
                )}

                <h3 className="text-lg font-semibold text-gray-900">
                  {plan.name}
                </h3>
                <p className="mt-1 text-sm text-gray-500">{plan.blurb}</p>

                <div className="mt-6 flex items-baseline gap-1.5">
                  <span className="text-5xl font-bold tracking-tight text-gray-900">
                    ${price}
                  </span>
                  <span className="text-sm font-medium text-gray-500">
                    /month
                  </span>
                </div>
                <p className="mt-2 text-sm text-gray-500">
                  {yearly
                    ? "Billed yearly — 15% off monthly pricing"
                    : "Billed monthly"}
                </p>

                <ul className="mt-8 space-y-3.5">
                  {plan.features.map((feature) => (
                    <li
                      key={feature}
                      className="flex items-start gap-3 text-sm leading-6 text-gray-600"
                    >
                      <svg
                        className="mt-0.5 h-4 w-4 shrink-0 text-primary-600"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth={2.2}
                        aria-hidden="true"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M4.5 12.75l6 6 9-13.5"
                        />
                      </svg>
                      {feature}
                    </li>
                  ))}
                </ul>

                <Link
                  href="/signup"
                  className={`mt-8 rounded-xl px-5 py-3 text-center text-sm font-semibold transition-all duration-150 ${
                    plan.popular
                      ? "bg-primary-600 text-white shadow-sm hover:bg-primary-700 hover:shadow-md"
                      : "border border-gray-300 bg-white text-gray-900 hover:border-primary-300 hover:bg-primary-50"
                  }`}
                >
                  Get Early Access
                </Link>
              </div>
            );
          })}
        </div>

        {/* Included in every plan */}
        <div className="mt-12 rounded-2xl border border-gray-200 bg-gray-50/70 px-6 py-6 sm:px-8">
          <p className="text-center text-sm font-semibold text-gray-900">
            Every plan includes
          </p>
          <ul className="mt-4 flex flex-wrap items-center justify-center gap-x-8 gap-y-3">
            {includedInAllPlans.map((item) => (
              <li
                key={item}
                className="flex items-center gap-2 text-sm text-gray-600"
              >
                <svg
                  className="h-4 w-4 text-primary-600"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2.2}
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M4.5 12.75l6 6 9-13.5"
                  />
                </svg>
                {item}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
