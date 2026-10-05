import type { Metadata } from "next";
import { LegalPage } from "@/components/marketing/site";

const title = "Terms of Service — Trustloop";
const description =
  "Review the Trustloop draft terms of service. Legal template placeholders require completion and review.";

export const metadata: Metadata = {
  title,
  description,
  openGraph: {
    title,
    description: "Draft Trustloop terms of service for review before publication.",
    type: "website",
  },
  twitter: { card: "summary_large_image", title, description },
};

export default function Terms() {
  return <LegalPage kind="terms" />;
}
