import type { Metadata } from "next";
import { LegalPage } from "@/components/marketing/site";

const title = "Privacy Policy — Trustloop";
const description =
  "Review the Trustloop draft privacy policy, including disclosure of third-party AI document processing.";

export const metadata: Metadata = {
  title,
  description,
  openGraph: {
    title,
    description: "Draft Trustloop privacy policy for review before publication.",
    type: "website",
  },
  twitter: { card: "summary_large_image", title, description },
};

export default function Privacy() {
  return <LegalPage kind="privacy" />;
}
