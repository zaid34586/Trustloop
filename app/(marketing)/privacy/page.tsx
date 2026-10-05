import type { Metadata } from "next";
import { LegalPage } from "@/components/marketing/inner";

export const metadata: Metadata = {
  title: "Privacy Policy — Trustloop",
  description: "Draft privacy policy template for Trustloop. Must be reviewed by a lawyer before launch.",
  openGraph: { title: "Privacy Policy — Trustloop", type: "website" },
  twitter: { card: "summary", title: "Privacy Policy — Trustloop" },
};

export default function PrivacyPage() {
  return <LegalPage kind="privacy" />;
}
