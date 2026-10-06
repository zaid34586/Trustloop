import type { Metadata } from "next";
import { HomePage } from "@/components/marketing/site";

const title = "Trustloop - Security questionnaires, drafted from your own documents";
const description =
  "Draft sourced security questionnaire answers from your own documents. Review every response before sharing.";

export const metadata: Metadata = {
  title,
  description,
  openGraph: { title, description, type: "website" },
  twitter: { card: "summary_large_image", title, description },
};

export default function Home() {
  return <HomePage />;
}
