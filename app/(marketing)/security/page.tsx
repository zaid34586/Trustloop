import type { Metadata } from "next";
import { SecurityPage } from "@/components/marketing/site";

const title = "Security and data handling — Trustloop";
const description =
  "A straightforward overview of Trustloop's stated data handling and security practices.";

export const metadata: Metadata = {
  title,
  description,
  openGraph: {
    title,
    description:
      "Understand how customer documents are handled when drafting security questionnaire answers.",
    type: "website",
  },
  twitter: { card: "summary_large_image", title, description },
};

export default function Security() {
  return <SecurityPage />;
}
