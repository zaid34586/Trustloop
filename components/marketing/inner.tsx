import { ArrowUpRight, FileText, ShieldCheck } from "lucide-react";

export function PageIntro({ eyebrow, title, description }: { eyebrow: string; title: string; description: string }) {
  return (
    <header className="inner-intro">
      <div className="eyebrow">
        <span />
        {eyebrow}
      </div>
      <h1>{title}</h1>
      <p>{description}</p>
    </header>
  );
}

export function ContactDetails() {
  return (
    <div className="contact-layout">
      <div className="contact-details">
        <div className="contact-icon">
          <FileText />
        </div>
        <h2>Email the team</h2>
        <a href="mailto:[SUPPORT EMAIL]">
          [SUPPORT EMAIL] <ArrowUpRight />
        </a>
        <p>
          Send a note about early access, product questions, or support and the team will reply by
          email.
        </p>
      </div>
    </div>
  );
}

const securityPoints = [
  "Documents are stored privately per account.",
  "Each customer's data is kept separate from others.",
  "HTTPS is used for data in transit.",
  "AI answers are drafted only from your own uploaded documents and always reviewed by a human.",
  "Excerpts of documents are sent to third-party AI model providers to generate draft answers.",
];

export function SecurityContent() {
  return (
    <article className="editorial-content security-content">
      <h2>How your information is handled</h2>
      <ul className="security-list">
        {securityPoints.map((point) => (
          <li key={point}>
            <ShieldCheck />
            {point}
          </li>
        ))}
      </ul>
      <aside className="honesty-note">
        <h2>What we do not claim yet</h2>
        <p>Trustloop does not currently hold a SOC 2 or ISO 27001 certification.</p>
      </aside>
      <p className="last-updated">Last updated: [DATE]</p>
    </article>
  );
}

const legalContent: Record<"terms" | "privacy" | "refund", { intro: string; sections: [string, string][] }> = {
  terms: {
    intro:
      "These draft terms describe a framework for using Trustloop. Complete the placeholders and have this document reviewed before publication.",
    sections: [
      [
        "1. About these terms",
        "These terms are between [COMPANY LEGAL NAME], located in [CITY, COUNTRY] (\"Company\"), and the person or organization using Trustloop (\"Customer\"). The service is provided subject to these terms.",
      ],
      [
        "2. Using the service",
        "Customer is responsible for its account, the documents it provides, and reviewing and approving questionnaire answers before sharing them. Customer must have the rights and permissions needed to upload and process its content.",
      ],
      [
        "3. Customer content and AI",
        "Trustloop uses documents provided by Customer to draft questionnaire responses. Excerpts of documents may be processed by third-party AI model providers. AI-generated drafts may be incomplete or inaccurate and must be reviewed by a person.",
      ],
      [
        "4. Fees and cancellation",
        "Subscription prices, billing frequency, and cancellation terms are shown on the pricing page. Prices are in USD. Customer may cancel anytime.",
      ],
      [
        "5. Availability and changes",
        "The Company may update or modify the service. No specific uptime or uninterrupted availability is promised by this draft template.",
      ],
      ["6. Contact", "Questions about these terms may be directed to [SUPPORT EMAIL]."],
    ],
  },
  privacy: {
    intro:
      "This draft privacy notice explains the types of information that may be handled when you use Trustloop. Have it reviewed and completed before publication.",
    sections: [
      [
        "1. Information we handle",
        "Trustloop may handle account details, the documents and questionnaires you upload, and information you provide when contacting the Company. Replace this draft with a complete inventory before publishing.",
      ],
      [
        "2. How information is used",
        "Information is used to provide and support Trustloop, draft questionnaire responses, and communicate about the service.",
      ],
      [
        "3. Third-party AI processing",
        "Excerpts of document text may be sent to third-party AI providers to generate draft answers. A person should review each answer before sharing it.",
      ],
      [
        "4. Storage and security",
        "Documents are stored privately per account, customer data is kept separate, and HTTPS is used in transit. Do not interpret this summary as a security certification.",
      ],
      [
        "5. Retention and your choices",
        "The Company should complete this section with its actual retention, deletion, and data access practices before publishing.",
      ],
      ["6. Contact", "For privacy questions, contact [SUPPORT EMAIL]."],
    ],
  },
  refund: {
    intro:
      "This draft refund policy is a starting point only. Complete the details and have it reviewed before publication.",
    sections: [
      [
        "1. Subscription fees",
        "Subscription fees and billing periods are displayed on the Trustloop pricing page. Prices are shown in USD.",
      ],
      [
        "2. Cancellation",
        "Subscriptions may be cancelled at any time. Cancellation stops future renewals; access continues according to the applicable billing period.",
      ],
      [
        "3. Refund requests",
        "Contact [SUPPORT EMAIL] with your account and billing details to discuss a refund request. Requests are reviewed within [REFUND WINDOW]. Any applicable refund will be assessed under the final published policy and applicable law.",
      ],
      ["4. Contact", "Questions about billing may be sent to [SUPPORT EMAIL]."],
    ],
  },
};

const legalTitles: Record<"terms" | "privacy" | "refund", string> = {
  terms: "Terms of Service",
  privacy: "Privacy Policy",
  refund: "Refund Policy",
};

export function LegalPage({ kind }: { kind: "terms" | "privacy" | "refund" }) {
  const content = legalContent[kind];
  return (
    <main className="inner-page">
      <div className="site-shell">
        <div className="draft-notice">Template - must be reviewed by a lawyer before launch.</div>
        <PageIntro eyebrow="LEGAL" title={legalTitles[kind]} description={content.intro} />
        <article className="editorial-content legal-content">
          {content.sections.map(([heading, body]) => (
            <section key={heading}>
              <h2>{heading}</h2>
              <p>{body}</p>
            </section>
          ))}
          <p className="last-updated">Last updated: [DATE]</p>
        </article>
      </div>
    </main>
  );
}
