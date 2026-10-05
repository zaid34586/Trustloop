import type { Metadata } from "next";
import { ContactPage } from "@/components/marketing/site";

const title = "Contact Trustloop";
const description =
  "Contact the Trustloop team about early access, support, and product questions.";

export const metadata: Metadata = {
  title,
  description,
  openGraph: {
    title,
    description: "Get in touch with the Trustloop team.",
    type: "website",
  },
  twitter: { card: "summary_large_image", title, description },
};

export default function Contact() {
  return <ContactPage />;
}
