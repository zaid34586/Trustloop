import type { Metadata } from "next";
import { LegalPage } from "@/components/marketing/inner";

export const metadata: Metadata = {
  title: "Refund Policy — Trustloop",
  description: "Draft refund policy template for Trustloop. Must be reviewed by a lawyer before launch.",
  openGraph: { title: "Refund Policy — Trustloop", type: "website" },
  twitter: { card: "summary", title: "Refund Policy — Trustloop" },
};

export default function RefundPolicyPage() {
  return <LegalPage kind="refund" />;
}
