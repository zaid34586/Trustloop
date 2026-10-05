import type { Metadata } from "next";
import { LegalPage } from "@/components/marketing/site";

const title = "Refund Policy — Trustloop";
const description = "Review the Trustloop draft refund policy and billing terms.";

export const metadata: Metadata = {
  title,
  description,
  openGraph: {
    title,
    description: "Draft Trustloop refund policy for review before publication.",
    type: "website",
  },
  twitter: { card: "summary_large_image", title, description },
};

export default function RefundPolicy() {
  return <LegalPage kind="refund" />;
}
