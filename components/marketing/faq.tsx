"use client";

import { useState } from "react";

const faqs = [
  {
    question: "How are answers generated?",
    answer:
      "Trustloop uses AI to draft answers strictly from the security documents you upload — your policies, documentation and past answers. Every drafted answer shows the sources it came from. If an answer is not in your documents, Trustloop says so instead of making one up. Nothing goes to your customer until you review, edit and approve it.",
  },
  {
    question: "How is our data handled?",
    answer:
      "Your files are stored privately, each account's data is kept separate from everyone else's, all traffic is encrypted over HTTPS, and a human must approve answers before anything can be exported. See the Security page for details.",
  },
  {
    question: "Which file types are supported?",
    answer:
      "Security documents: PDF and Word (.docx), up to 10 MB per file. Questionnaires: Excel (.xlsx), up to 5 MB. Approved answers are exported back into an Excel (.xlsx) file in the same format you uploaded.",
  },
  {
    question: "Does Trustloop provide certification?",
    answer:
      "No. Trustloop does not provide SOC 2, ISO 27001 or any other certification. It drafts answers to security questionnaires from your own documents for you to review — the review, approval and any certification remain yours.",
  },
  {
    question: "How do refunds work?",
    answer:
      "Questions about billing or refunds? Email [SUPPORT EMAIL] with your request and we will get back to you.",
  },
];

export function FaqSection({ id = "faq" }: { id?: string }) {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <section id={id} className="scroll-mt-20 bg-white py-24 sm:py-32">
      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
        <div className="text-center">
          <p className="text-sm font-semibold uppercase tracking-widest text-primary-600">
            FAQ
          </p>
          <h2 className="mt-3 text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
            Frequently asked questions
          </h2>
        </div>

        <div className="mt-12 space-y-4">
          {faqs.map((faq, index) => {
            const isOpen = openIndex === index;
            return (
              <div
                key={faq.question}
                className={`rounded-2xl border bg-white transition-all duration-200 ${
                  isOpen
                    ? "border-primary-200 shadow-md shadow-primary-900/5"
                    : "border-gray-200 shadow-sm hover:border-gray-300"
                }`}
              >
                <button
                  type="button"
                  onClick={() => setOpenIndex(isOpen ? null : index)}
                  className="flex w-full items-center justify-between gap-4 px-6 py-5 text-left"
                  aria-expanded={isOpen}
                >
                  <span className="text-base font-semibold text-gray-900">
                    {faq.question}
                  </span>
                  <svg
                    className={`h-5 w-5 shrink-0 text-gray-400 transition-transform duration-200 ${
                      isOpen ? "rotate-45 text-primary-600" : ""
                    }`}
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={2}
                    aria-hidden="true"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M12 4.5v15m7.5-7.5h-15"
                    />
                  </svg>
                </button>
                <div
                  className={`grid transition-all duration-200 ease-out ${
                    isOpen
                      ? "grid-rows-[1fr] opacity-100"
                      : "grid-rows-[0fr] opacity-0"
                  }`}
                >
                  <div className="overflow-hidden">
                    <p className="px-6 pb-5 text-sm leading-7 text-gray-600">
                      {faq.answer}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
