import type { Metadata } from "next";
import {
  Features,
  FinalCTA,
  Hero,
  HowItWorks,
  Problems,
  TrustSection,
} from "@/components/marketing/home-sections";
import { PricingSection } from "@/components/marketing/pricing-section";
import { FaqBand } from "@/components/marketing/faq-section";

const title = "Trustloop — Security questionnaires, answered with confidence";
const description =
  "Trustloop drafts sourced answers to customer security questionnaires from your own documents. Your team reviews and approves every response before sharing.";

export const metadata: Metadata = {
  title,
  description,
  openGraph: { title, description, type: "website" },
  twitter: { card: "summary", title, description },
};

export default function HomePage() {
  return (
    <main>
      <Hero />
      <Problems />
      <Features />
      <HowItWorks />
      <TrustSection />
      <PricingSection />
      <FaqBand />
      <FinalCTA />
    </main>
  );
}
