import type { Metadata } from "next";
import { PageIntro } from "@/components/marketing/inner";
import { PricingSection } from "@/components/marketing/pricing-section";
import { FaqList } from "@/components/marketing/faq-section";
import { SectionHeading, FinalCTA } from "@/components/marketing/home-sections";
import { faqItems } from "@/components/marketing/site-data";

const title = "Pricing — Trustloop";
const description =
  "Clear monthly pricing for Trustloop. Document upload, AI answers with sources, human review, Excel export and Ask page.";

export const metadata: Metadata = {
  title,
  description,
  openGraph: { title, description, type: "website" },
  twitter: { card: "summary", title, description },
};

export default function PricingPage() {
  return (
    <main className="inner-page">
      <div className="site-shell">
        <PageIntro
          eyebrow="PRICING"
          title="Plans that scale with your team."
          description="Clear monthly pricing for a better way to work through customer security reviews."
        />
      </div>
      <PricingSection fullPage />
      <section className="inner-faq">
        <div className="site-shell faq-layout">
          <SectionHeading eyebrow="PLAN DETAILS" title="Pricing questions." />
          <FaqList items={[faqItems[0], faqItems[2], faqItems[5]]} />
        </div>
      </section>
      <FinalCTA />
    </main>
  );
}
