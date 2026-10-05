import Link from "next/link";
import type { ReactNode } from "react";
import {
  ArrowDown,
  ArrowRight,
  ArrowUpRight,
  CheckCircle2,
  CircleHelp,
  FileSpreadsheet,
  FileText,
  Search,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { ProductMockup } from "./product-mockup";

export function SectionHeading({
  eyebrow,
  title,
  body,
  centered = false,
}: {
  eyebrow: string;
  title: string;
  body?: string;
  centered?: boolean;
}) {
  return (
    <div className={`section-heading${centered ? " section-heading-centered" : ""}`}>
      <div className="eyebrow">
        <span />
        {eyebrow}
      </div>
      <h2>{title}</h2>
      {body && <p>{body}</p>}
    </div>
  );
}

export function Hero() {
  return (
    <section className="hero-stage">
      <div className="hero-glow" />
      <div className="site-shell hero-content">
        <div className="hero-badge">
          <Sparkles />
          AI answers grounded in your own documents
        </div>
        <h1>
          Answer security questionnaires <span>with confidence.</span>
        </h1>
        <p className="hero-copy">
          Trustloop drafts clear, sourced answers from your own documents so your team can review
          every response before it goes out.
        </p>
        <div className="hero-actions">
          <Link href="/signup" className="m-btn button-dark">
            Get early access <ArrowRight />
          </Link>
          <a className="text-link" href="#how-it-works">
            See how it works <ArrowDown />
          </a>
        </div>
        <div className="hero-checks">
          {[
            "Answers from your own documents",
            "Human review before anything is sent",
            "Works with Excel questionnaires",
            "Source shown for every answer",
          ].map((text) => (
            <div key={text}>
              <CheckCircle2 />
              {text}
            </div>
          ))}
        </div>
        <ProductMockup />
      </div>
    </section>
  );
}

const problemItems = [
  {
    icon: FileText,
    title: "Repeated manual work",
    body: "The same questions, researched and rewritten with every new customer review.",
  },
  {
    icon: CircleHelp,
    title: "Deals stuck waiting",
    body: "Security reviews slow down sales while everyone waits for complete answers.",
  },
  {
    icon: Search,
    title: "Answers scattered across documents",
    body: "The right policy is somewhere in a shared drive, spreadsheet, or old response.",
  },
];

export function Problems() {
  return (
    <section className="section-band problem-band">
      <div className="site-shell">
        <SectionHeading
          eyebrow="THE SLOWDOWN"
          title="Security reviews shouldn't stall good work."
          body="The process is familiar: a new deal, a long spreadsheet, and the same scattered answers."
          centered
        />
        <div className="problem-grid">
          {problemItems.map(({ icon: Icon, title, body }, i) => (
            <article className="problem-item" key={title}>
              <div className="problem-number">0{i + 1}</div>
              <Icon />
              <h3>{title}</h3>
              <p>{body}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

const featureItems = [
  { icon: FileText, title: "Answers from your documents", body: "Draft responses grounded in the security and compliance files you provide." },
  { icon: Search, title: "A source for every answer", body: "Trace each draft back to the material that informed it." },
  { icon: CheckCircle2, title: "Human review and approval", body: "Your team reviews and approves answers before they leave your hands." },
  { icon: FileSpreadsheet, title: "Works with Excel", body: "Work through customer questionnaires in their familiar spreadsheet format." },
  { icon: CircleHelp, title: "Honest when it cannot find an answer", body: "Questions without supporting documents are flagged instead of guessed at." },
  { icon: ArrowUpRight, title: "Export to your original file", body: "Download reviewed answers back to the questionnaire for your customer." },
];

export function Features() {
  return (
    <section id="features" className="section-band feature-band">
      <div className="site-shell">
        <SectionHeading
          eyebrow="MADE FOR THE REAL WORK"
          title="Every answer, in context."
          body="A practical workflow that keeps your source material and your judgment in the loop."
          centered
        />
        <div className="feature-grid">
          {featureItems.map(({ icon: Icon, title, body }, index) => (
            <article className="feature-item" key={title}>
              <div className="feature-icon">
                <Icon />
              </div>
              <span className="feature-index">0{index + 1}</span>
              <h3>{title}</h3>
              <p>{body}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

const steps = ["Upload your security documents", "Upload the customer's questionnaire", "Review, approve and download"];
const stepBodies = [
  "Bring your policies and security materials into one place.",
  "Start a review from the customer's Excel questionnaire.",
  "Check sources, approve the drafts, and export your answers.",
];

export function HowItWorks() {
  return (
    <section id="how-it-works" className="section-band how-band">
      <div className="site-shell how-layout">
        <SectionHeading
          eyebrow="A CLEARER WORKFLOW"
          title="From questionnaire to reviewed answer."
          body="Keep each step visible, with your team making the final call."
        />
        <div className="steps-list">
          {steps.map((step, index) => (
            <div className="step-row" key={step}>
              <div className="step-number">0{index + 1}</div>
              <div>
                <h3>{step}</h3>
                <p>{stepBodies[index]}</p>
              </div>
              <ArrowRight />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export function TrustSection() {
  const points = [
    "AI drafts only from the documents you upload.",
    "Every answer is reviewed and approved by a person.",
    "Each account's data is kept separate and private.",
    "If an answer isn't in your documents, Trustloop says so.",
  ];
  return (
    <section className="trust-band">
      <div className="site-shell trust-layout">
        <div className="trust-copy">
          <div className="eyebrow">
            <span />
            BUILT SO YOU STAY IN CONTROL
          </div>
          <h2>
            Helpful drafts.
            <br />
            Your decision.
          </h2>
          <p>Trustloop assists with the busywork. Your team stays responsible for what gets shared.</p>
        </div>
        <div className="trust-points">
          {points.map((item) => (
            <div key={item}>
              <ShieldCheck />
              {item}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export function FinalCTA() {
  return (
    <section className="cta-band">
      <div className="site-shell cta-inner">
        <div>
          <div className="eyebrow">
            <span />
            MAKE SPACE FOR THE WORK AHEAD
          </div>
          <h2>Stop losing deals to security questionnaires.</h2>
        </div>
        <Link href="/signup" className="m-btn button-light">
          Get early access <ArrowRight />
        </Link>
      </div>
    </section>
  );
}

export function Eyebrow({ children }: { children: ReactNode }) {
  return (
    <div className="eyebrow">
      <span />
      {children}
    </div>
  );
}
