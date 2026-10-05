import type { Metadata } from "next";
import { PricingPage } from "@/components/marketing/site";

const title = "Pricing — Trustloop";
const description =
  "Compare Trustloop Starter, Growth, and Business plans for faster security questionnaire reviews.";

export const metadata: Metadata = {
  title,
  description,
  openGraph: {
    title,
    description:
      "Simple monthly and yearly pricing for Trustloop security questionnaire workflows.",
    type: "website",
  },
  twitter: { card: "summary_large_image", title, description },
};

export default function Pricing() {
  return <PricingPage />;
}
