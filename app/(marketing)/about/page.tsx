import type { Metadata } from "next";
import { AboutPage } from "@/components/marketing/site";

const title = "About Trustloop — A Rivox product";
const description =
  "Learn about Trustloop's mission to make customer security reviews more manageable for software teams.";

export const metadata: Metadata = {
  title,
  description,
  openGraph: {
    title,
    description:
      "A clearer, human-reviewed workflow for customer security questionnaires.",
    type: "website",
  },
  twitter: { card: "summary_large_image", title, description },
};

export default function About() {
  return <AboutPage />;
}
