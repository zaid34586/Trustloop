import type { Metadata } from "next";
import { LegalPage } from "@/components/marketing/inner";

export const metadata: Metadata = {
  title: "Terms of Service — Trustloop",
  description: "Draft terms of service template for Trustloop. Must be reviewed by a lawyer before launch.",
  openGraph: { title: "Terms of Service — Trustloop", type: "website" },
  twitter: { card: "summary", title: "Terms of Service — Trustloop" },
};

export default function TermsPage() {
  return <LegalPage kind="terms" />;
}
