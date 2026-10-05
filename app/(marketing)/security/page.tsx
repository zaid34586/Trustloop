import type { Metadata } from "next";
import { PageIntro, SecurityContent } from "@/components/marketing/inner";

const title = "Security — Trustloop";
const description = "An honest outline of how Trustloop stores documents, separates accounts, and drafts answers.";

export const metadata: Metadata = {
  title,
  description,
  openGraph: { title, description, type: "website" },
  twitter: { card: "summary", title, description },
};

export default function SecurityPage() {
  return (
    <main className="inner-page">
      <div className="site-shell">
        <PageIntro
          eyebrow="SECURITY"
          title="A clear view of how Trustloop handles data."
          description="An honest outline of the security practices described for the product."
        />
        <SecurityContent />
      </div>
    </main>
  );
}
