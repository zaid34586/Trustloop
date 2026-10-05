import type { Metadata } from "next";
import { ContactDetails, PageIntro } from "@/components/marketing/inner";

const title = "Contact — Trustloop";
const description = "For questions about early access, product details, or support, reach out by email.";

export const metadata: Metadata = {
  title,
  description,
  openGraph: { title, description, type: "website" },
  twitter: { card: "summary", title, description },
};

export default function ContactPage() {
  return (
    <main className="inner-page">
      <div className="site-shell">
        <PageIntro
          eyebrow="CONTACT"
          title="Talk to the Trustloop team."
          description="For questions about early access, product details, or support, reach out by email."
        />
        <ContactDetails />
        <p className="last-updated">Last updated: [DATE]</p>
      </div>
    </main>
  );
}
