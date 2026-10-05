import type { Metadata } from "next";
import { ArrowUpRight } from "lucide-react";
import { PageIntro } from "@/components/marketing/inner";

const title = "About — Trustloop";
const description =
  "Trustloop helps software teams answer customer security questionnaires with their source documents in one workflow.";

export const metadata: Metadata = {
  title,
  description,
  openGraph: { title, description, type: "website" },
  twitter: { card: "summary", title, description },
};

export default function AboutPage() {
  return (
    <main className="inner-page">
      <div className="site-shell">
        <PageIntro
          eyebrow="ABOUT TRUSTLOOP"
          title="A clearer way to answer security reviews."
          description="Trustloop is built to help software teams work through questionnaire answers with their source documents in one place."
        />
        <article className="editorial-content">
          <h2>Why Trustloop</h2>
          <p>
            Security questionnaires are an important part of earning customer trust, but the manual
            process is repetitive and easy to get wrong. Trustloop brings your source documents and
            questionnaire review into one focused workflow.
          </p>
          <h2>Our mission</h2>
          <p>
            Make security reviews more manageable for the teams doing the work—without taking people
            out of the decision-making process.
          </p>
          <p className="about-rivox">
            Trustloop is a Rivox product.{" "}
            <a href="https://rivoxcloud.com" target="_blank" rel="noreferrer">
              Visit Rivox <ArrowUpRight />
            </a>
          </p>
          <p className="last-updated">Last updated: [DATE]</p>
        </article>
      </div>
    </main>
  );
}
