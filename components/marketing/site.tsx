"use client";

import { useState, useEffect, useRef, type ReactNode } from "react";
import Link from "next/link";
import {
  ArrowDown,
  ArrowRight,
  ArrowUpRight,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  CircleHelp,
  FileCheck2,
  FileSpreadsheet,
  FileText,
  LockKeyhole,
  Menu,
  PanelLeft,
  Search,
  ShieldCheck,
  Sparkles,
  X,
} from "lucide-react";
import { Brand, Logo } from "@/components/brand/logo";
import { Reveal } from "@/components/marketing/reveal";
import { site } from "@/config/site";

const navItems = [
  { label: "Features", href: "/#features" },
  { label: "How it works", href: "/#how-it-works" },
  { label: "Pricing", href: "/pricing" },
  { label: "FAQ", href: "/#faq" },
];

export const pricingPlans = [
  {
    name: "Starter",
    description: "For small teams getting started.",
    monthly: 149,
    annualMonthly: 119,
    annual: 1428,
    features: [
      "3 team members",
      "5 questionnaires per month",
      "20 documents",
      "AI answers with sources",
      "Review and approval",
      "Excel export",
      "Email support",
    ],
  },
  {
    name: "Growth",
    description: "For teams moving deals forward.",
    monthly: 349,
    annualMonthly: 279,
    annual: 3348,
    popular: true,
    features: [
      "10 team members",
      "25 questionnaires per month",
      "100 documents",
      "Everything in Starter",
      "Priority support — Coming soon",
    ],
  },
  {
    name: "Business",
    description: "For growing security programs.",
    monthly: 799,
    annualMonthly: 639,
    annual: 7668,
    features: [
      "Unlimited team members",
      "Unlimited questionnaires",
      "500 documents",
      "Everything in Growth",
      "Onboarding call — Coming soon",
      "Dedicated support — Coming soon",
    ],
  },
];

export const faqItems = [
  {
    question: "What is Trustloop?",
    answer:
      "Trustloop helps software teams draft answers to customer security questionnaires from their own company documents, then review and approve each answer before it is sent.",
  },
  {
    question: "Which files can I upload?",
    answer:
      "Trustloop is designed for your security and compliance documents and for Excel questionnaires. Ask the Trustloop team to confirm the currently supported document formats before uploading.",
  },
  {
    question: "Does the AI make up answers?",
    answer:
      "Trustloop drafts answers using your uploaded documents. When it cannot find supporting information, it marks the question as not found instead of presenting an invented answer.",
  },
  {
    question: "Who reviews the answers?",
    answer:
      "A person on your team reviews and approves each answer. Trustloop does not send answers to your customer on its own.",
  },
  {
    question: "How is my data handled?",
    answer:
      "Documents are stored privately per account and customer data is kept separate. Excerpts of documents are sent to third-party AI model providers to generate draft answers.",
  },
  {
    question: "Can I cancel anytime?",
    answer: "The listed subscriptions can be cancelled at any time.",
  },
];

function FaqList({
  items,
  idPrefix = "faq",
}: {
  items: typeof faqItems;
  idPrefix?: string;
}) {
  const [open, setOpen] = useState<number | null>(null);
  return (
    <div className="faq-list">
      {items.map((item, index) => {
        const isOpen = open === index;
        return (
          <div
            className="faq-item"
            data-open={isOpen ? "true" : "false"}
            key={item.question}
          >
            <button
              type="button"
              id={`${idPrefix}-trigger-${index}`}
              className="faq-trigger"
              aria-expanded={isOpen}
              aria-controls={`${idPrefix}-content-${index}`}
              onClick={() => setOpen(isOpen ? null : index)}
            >
              {item.question}
              <ChevronDown className="faq-chevron" aria-hidden="true" />
            </button>
            <div
              className="faq-content"
              id={`${idPrefix}-content-${index}`}
              role="region"
              aria-labelledby={`${idPrefix}-trigger-${index}`}
              aria-hidden={!isOpen}
            >
              <div className="faq-content-inner">{item.answer}</div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function SectionHeading({
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
    <div
      className={`section-heading${centered ? " section-heading-centered" : ""}`}
    >
      <div className="eyebrow">
        <span />
        {eyebrow}
      </div>
      <h2>{title}</h2>
      {body && <p>{body}</p>}
    </div>
  );
}

export function Navbar() {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
  return (
    <header className={`site-header${scrolled ? " is-scrolled" : ""}`}>
      <div className="site-shell nav-inner">
        <Brand size={22} />
        <nav aria-label="Main navigation" className="desktop-nav">
          <div className="nav-pill">
            {navItems.map((item) => (
              <Link key={item.label} href={item.href}>
                {item.label}
              </Link>
            ))}
          </div>
        </nav>
        <div className="nav-actions">
          <Link className="login-link" href="/login">
            Log in
          </Link>
          <Link href="/signup" className="button-dark nav-cta">
            Get early access <ArrowUpRight />
          </Link>
          <button
            type="button"
            className="mobile-menu-toggle"
            aria-label={open ? "Close menu" : "Open menu"}
            onClick={() => setOpen(!open)}
          >
            {open ? <X /> : <Menu />}
          </button>
        </div>
      </div>
      {open && (
        <nav className="mobile-nav" aria-label="Mobile navigation">
          {navItems.map((item) => (
            <Link
              key={item.label}
              href={item.href}
              onClick={() => setOpen(false)}
            >
              {item.label}
              <ChevronRight />
            </Link>
          ))}
          <Link href="/login" className="mobile-login" onClick={() => setOpen(false)}>
            Log in <ArrowUpRight />
          </Link>
        </nav>
      )}
    </header>
  );
}

export function Footer() {
  return (
    <footer className="site-footer">
      <Reveal className="footer-wordmark">
        <span aria-hidden="true">Trustloop</span>
      </Reveal>
      <div className="site-shell">
        <div className="footer-top">
          <div className="footer-brand-block">
            <Brand variant="dark" size={26} className="footer-brand" />
            <p>Security questionnaires, answered with confidence.</p>
            <p className="powered-by">
              Powered by{" "}
              <a
                href={site.rivoxUrl}
                target="_blank"
                rel="noopener noreferrer"
              >
                Rivox <ArrowUpRight />
              </a>
            </p>
          </div>
          <FooterColumn
            title="Product"
            links={[
              ["Features", "/#features"],
              ["How it works", "/#how-it-works"],
              ["Pricing", "/pricing"],
              ["FAQ", "/#faq"],
              ["Log in", "/login"],
            ]}
          />
          <FooterColumn
            title="Company"
            links={[
              ["About", "/about"],
              ["Contact", "/contact"],
              ["Security", "/security"],
            ]}
          />
          <FooterColumn
            title="Legal"
            links={[
              ["Terms of Service", "/terms"],
              ["Privacy Policy", "/privacy"],
              ["Refund Policy", "/refund-policy"],
            ]}
          />
        </div>
        <div className="footer-bottom">
          <span>
            © 2026 {site.companyName}. {site.brandName} is a product of{" "}
            {site.companyName}.
          </span>
          <span>
            {site.cityCountry} <span className="footer-dot">·</span>{" "}
            <a href={`mailto:${site.supportEmail}`}>{site.supportEmail}</a>
          </span>
        </div>
      </div>
    </footer>
  );
}

function FooterColumn({
  title,
  links,
}: {
  title: string;
  links: [string, string][];
}) {
  return (
    <div className="footer-column">
      <h3>{title}</h3>
      {links.map(([label, href]) => (
        <Link key={label} href={href}>
          {label}
        </Link>
      ))}
    </div>
  );
}

const DEMO_ROW = 1;
const DEMO_STATUSES = ["Pending", "Drafted", "Approved"];

export function ProductMockup() {
  const rows = [
    {
      question: "How do you manage access to production systems?",
      answer:
        "Access is restricted to authorized personnel and reviewed regularly.",
      confidence: "High",
      status: "Approved",
      source: "Access control policy · Section 2.1",
      excerpt:
        "Production access is granted by role and reviewed on a regular basis.",
    },
    {
      question: "Do you encrypt customer data at rest?",
      answer:
        "Customer data is encrypted at rest using managed storage controls.",
      confidence: "Medium",
      status: "Drafted",
      source: "Data protection policy · Section 3.2",
      excerpt:
        "Customer data stored in managed systems is encrypted at rest.",
    },
    {
      question: "How often do you conduct penetration testing?",
      answer: "I could not find this in your documents.",
      confidence: "None",
      status: "Not found",
      source: null as string | null,
      excerpt: null as string | null,
    },
    {
      question: "What is your incident response process?",
      answer:
        "Incidents are triaged, documented, and escalated to the response team.",
      confidence: "High",
      status: "Approved",
      source: "Incident response plan · Section 1.4",
      excerpt:
        "All incidents are triaged, documented, and escalated to the response team.",
    },
  ];
  const [active, setActive] = useState(0);
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const [demoStep, setDemoStep] = useState<number | null>(null);
  const [inView, setInView] = useState(false);
  const [paused, setPaused] = useState(false);
  const [tabVisible, setTabVisible] = useState(true);

  useEffect(() => {
    const el = wrapRef.current;
    if (!el || typeof IntersectionObserver === "undefined") {
      setInView(true);
      return;
    }
    const observer = new IntersectionObserver(
      ([entry]) => setInView(entry.isIntersecting),
      { threshold: 0.25 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const onVisibility = () =>
      setTabVisible(document.visibilityState === "visible");
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, []);

  useEffect(() => {
    if (!inView || paused || !tabVisible) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    setDemoStep((step) => step ?? 0);
    const timer = window.setInterval(() => {
      setDemoStep((step) => ((step ?? 0) + 1) % DEMO_STATUSES.length);
    }, 2400);
    return () => window.clearInterval(timer);
  }, [inView, paused, tabVisible]);

  const statusOf = (index: number, original: string) =>
    index === DEMO_ROW && demoStep !== null
      ? DEMO_STATUSES[demoStep]
      : original;
  const current = rows[active];
  const currentStatus = statusOf(active, current.status);
  const approvedCount = rows.filter(
    (row, index) => statusOf(index, row.status) === "Approved",
  ).length;
  const sidebarLinks = [
    { icon: PanelLeft, label: "Dashboard" },
    { icon: FileText, label: "Documents" },
    { icon: Sparkles, label: "Ask" },
    { icon: FileCheck2, label: "Questionnaires" },
    { icon: LockKeyhole, label: "Settings" },
  ];
  return (
    <div
      className="mockup-wrap"
      aria-label="Sample questionnaire review screen"
      ref={wrapRef}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
          setPaused(false);
        }
      }}
    >
      <div className="mockup-window">
        <div className="window-bar">
          <div className="window-dots">
            <i />
            <i />
            <i />
          </div>
          <div className="window-address">
            <LockKeyhole /> Questionnaire review
          </div>
          <div className="window-avatar">JD</div>
        </div>
        <div className="product-layout">
          <aside className="product-sidebar">
            <div className="sidebar-logo">
              <Logo variant="tile" size={17} showWordmark={false} />
              Trustloop
            </div>
            <div className="workspace-label">WORKSPACE</div>
            {sidebarLinks.map(({ icon: Icon, label }) => (
              <div
                className={`sidebar-item${label === "Questionnaires" ? " active" : ""}`}
                key={label}
              >
                <Icon size={15} />
                {label}
              </div>
            ))}
            <div className="sidebar-account">
              <div className="sidebar-account-avatar">AC</div>
              <div>
                Acme Cloud<small>Team workspace</small>
              </div>
              <ChevronRight size={13} />
            </div>
          </aside>
          <div className="product-main">
            <div className="mock-breadcrumb">
              Questionnaires <ChevronRight /> <span>Vendor security review</span>
            </div>
            <div className="mock-title-line">
              <div>
                <div className="mock-title">Vendor security review</div>
                <div className="mock-subtitle">Acme Cloud · Updated just now</div>
              </div>
              <button type="button" className="mock-export">
                <FileSpreadsheet /> Export Excel
              </button>
            </div>
            <div className="review-progress">
              <div className="progress-label">
                <span>Review progress</span>
                <b>
                  {approvedCount} of {rows.length} approved
                </b>
              </div>
              <div className="progress-track">
                <span
                  style={{
                    width: `${(approvedCount / rows.length) * 100}%`,
                  }}
                />
              </div>
            </div>
            <div className="mock-workspace">
              <div className="table-scroll">
                <table className="review-table">
                  <thead>
                    <tr>
                      <th>QUESTION</th>
                      <th>AI DRAFT ANSWER</th>
                      <th>CONFIDENCE</th>
                      <th>STATUS</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((row, index) => {
                      const status = statusOf(index, row.status);
                      return (
                        <tr
                          key={row.question}
                          className={index === active ? "is-active" : ""}
                          tabIndex={0}
                          title="Show details"
                          onClick={() => setActive(index)}
                          onKeyDown={(event) => {
                            if (event.key === "Enter" || event.key === " ") {
                              event.preventDefault();
                              setActive(index);
                            }
                          }}
                        >
                          <td className="question-cell">{row.question}</td>
                          <td
                            className={
                              row.confidence === "None"
                                ? "not-found-answer"
                                : "answer-cell"
                            }
                          >
                            {row.answer}
                            <a href="#sources">
                              Sources <ArrowUpRight />
                            </a>
                          </td>
                          <td>
                            <span
                              className={`confidence confidence-${row.confidence.toLowerCase()}`}
                            >
                              <i />
                              {row.confidence}
                            </span>
                          </td>
                          <td>
                            <span
                              className={`status status-${status.toLowerCase().replace(" ", "-")}`}
                            >
                              {status === "Approved" && <Check size={11} />}
                              {status}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <aside className="mock-detail">
                <div className="mock-detail-label">SELECTED QUESTION</div>
                <p className="mock-detail-q">{current.question}</p>
                <span
                  className={`status status-${currentStatus.toLowerCase().replace(" ", "-")}`}
                >
                  {currentStatus === "Approved" && <Check size={11} />}
                  {currentStatus}
                </span>
                <div className="mock-detail-label">ANSWER</div>
                <p className="mock-detail-answer">{current.answer}</p>
                <div className="mock-detail-label">SOURCE</div>
                {current.source ? (
                  <div className="mock-detail-source">
                    <FileText size={13} />
                    <div>
                      <b>{current.source}</b>
                      <q>{current.excerpt}</q>
                    </div>
                  </div>
                ) : (
                  <div className="mock-detail-flag">
                    <CircleHelp size={13} />
                    Not found in your documents — flagged for your team.
                  </div>
                )}
              </aside>
            </div>
          </div>
        </div>
      </div>
      <div className="float-card float-source">
        <FileText />
        <span>
          <b>Source</b> Data protection policy, Section 3.2
        </span>
      </div>
      <div className="float-card float-flag">
        <CircleHelp />
        <span>
          <b>Not found</b> flagged for your team
        </span>
      </div>
      <p className="mockup-caption">Sample data for illustration</p>
    </div>
  );
}

function Hero() {
  return (
    <section className="hero-stage">
      <div className="site-shell hero-content">
        <div className="hero-badge">
          <span className="badge-pulse" />A clearer way through every security
          review
        </div>
        <h1>
          <span className="hero-line">
            <span>Security answers,</span>
          </span>
          <span className="hero-line hero-line-accent">
            <span>without the search.</span>
          </span>
        </h1>
        <p className="hero-copy">
          Turn scattered policies and past answers into a review-ready first
          draft. Trustloop finds the relevant evidence, drafts a response, and
          keeps your team in control of what gets shared.
        </p>
        <div className="hero-actions">
          <Link href="/signup" className="button-dark">
            Get early access <ArrowRight />
          </Link>
          <a className="text-link" href="#how-it-works">
            See how it works <ArrowDown />
          </a>
        </div>
        <div className="hero-checks">
          {[
            "Grounded in your documents",
            "Sources alongside answers",
            "Reviewed by your team",
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

const withoutItems = [
  {
    icon: FileText,
    title: "The same manual work, repeated",
    body: "Every new review means researching and rewriting the same questions again.",
  },
  {
    icon: CircleHelp,
    title: "Deals waiting on reviews",
    body: "Security reviews slow down sales while everyone waits for complete answers.",
  },
  {
    icon: Search,
    title: "Answers scattered across documents",
    body: "The right policy is somewhere in a shared drive, spreadsheet, or old response.",
  },
];

const withItems = [
  {
    icon: CheckCircle2,
    title: "Drafts start from your documents",
    body: "Every answer begins with the policies and past responses your team provides.",
  },
  {
    icon: FileText,
    title: "Sources sit next to every answer",
    body: "See the document and section behind a draft before you use it.",
  },
  {
    icon: CircleHelp,
    title: "Missing answers are flagged, not guessed",
    body: "Questions without support in your documents are marked for your team.",
  },
  {
    icon: CheckCircle2,
    title: "Your team approves before anything ships",
    body: "Nothing leaves your hands until a person reviews and approves it.",
  },
];

const featureItems = [
  {
    icon: FileText,
    title: "Answers from your documents",
    body: "Draft responses grounded in the security and compliance files you provide.",
  },
  {
    icon: Search,
    title: "A source for every answer",
    body: "Trace each draft back to the material that informed it.",
  },
  {
    icon: CheckCircle2,
    title: "Human review and approval",
    body: "Your team reviews and approves answers before they leave your hands.",
  },
  {
    icon: FileSpreadsheet,
    title: "Works with Excel",
    body: "Work through customer questionnaires in their familiar spreadsheet format.",
  },
  {
    icon: CircleHelp,
    title: "Honest when it cannot find an answer",
    body: "Questions without supporting documents are flagged instead of guessed at.",
  },
  {
    icon: ArrowUpRight,
    title: "Export to your original file",
    body: "Download reviewed answers back to the questionnaire for your customer.",
  },
];

function ComparisonSection() {
  return (
    <section className="section-band problem-band">
      <Reveal className="site-shell">
        <SectionHeading
          eyebrow="WITHOUT AND WITH"
          title="Same review, a calmer way through it."
          body="The questionnaire does not change. What changes is where the answers come from and who stays in control."
          centered
        />
        <div className="compare-grid">
          <div className="compare-col compare-without">
            <div className="compare-head compare-head-without">
              <X /> Without Trustloop
            </div>
            <ul>
              {withoutItems.map(({ icon: Icon, title, body }) => (
                <li key={title}>
                  <Icon />
                  <div>
                    <b>{title}</b>
                    <span>{body}</span>
                  </div>
                </li>
              ))}
            </ul>
          </div>
          <div className="compare-col compare-with">
            <div className="compare-head compare-head-with">
              <CheckCircle2 /> With Trustloop
            </div>
            <ul>
              {withItems.map(({ icon: Icon, title, body }) => (
                <li key={title}>
                  <Icon />
                  <div>
                    <b>{title}</b>
                    <span>{body}</span>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </Reveal>
    </section>
  );
}

function Features() {
  return (
    <section id="features" className="section-band feature-band">
      <Reveal className="site-shell">
        <SectionHeading
          eyebrow="MADE FOR THE REAL WORK"
          title="Every answer, in context."
          body="A practical workflow that keeps your source material and your judgment in the loop."
          centered
        />
        <div className="feature-grid">
          {featureItems.map(({ icon: Icon, title, body }, index) => (
            <article
              className="feature-item"
              key={title}
              tabIndex={0}
              onMouseMove={(event) => {
                const el = event.currentTarget;
                const rect = el.getBoundingClientRect();
                el.style.setProperty("--mx", `${event.clientX - rect.left}px`);
                el.style.setProperty("--my", `${event.clientY - rect.top}px`);
              }}
            >
              <div className="feature-icon">
                <Icon />
              </div>
              <span className="feature-index">0{index + 1}</span>
              <h3>{title}</h3>
              <p>{body}</p>
            </article>
          ))}
        </div>
      </Reveal>
    </section>
  );
}

function EvidenceSection() {
  return (
    <section className="evidence-band">
      <Reveal className="site-shell evidence-layout">
        <div className="evidence-copy">
          <div className="eyebrow">
            <span />
            THE DETAIL BEHIND THE DRAFT
          </div>
          <h2>Know where every answer comes from.</h2>
          <p>
            When a customer asks how you protect their data, the answer should
            be more than a confident-sounding sentence. Trustloop brings the
            supporting material into the same review so your team can check the
            wording against its source.
          </p>
          <div className="evidence-notes">
            <div>
              <span>01</span>
              <div>
                <h3>Find the relevant context</h3>
                <p>
                  Work from the policies and security documents your team
                  provides, not a generic answer bank.
                </p>
              </div>
            </div>
            <div>
              <span>02</span>
              <div>
                <h3>Keep uncertainty visible</h3>
                <p>
                  If the documents do not support an answer, mark it as not
                  found and investigate before responding.
                </p>
              </div>
            </div>
            <div>
              <span>03</span>
              <div>
                <h3>Make the final call</h3>
                <p>
                  Edit, review, and approve the response before exporting the
                  completed questionnaire.
                </p>
              </div>
            </div>
          </div>
        </div>
        <div
          className="evidence-example"
          aria-label="Sample answer and source"
        >
          <div className="example-top">
            <span>QUESTION 02 / 04</span>
            <span>
              <CheckCircle2 size={15} /> SOURCE AVAILABLE
            </span>
          </div>
          <h3>Do you encrypt customer data at rest?</h3>
          <div className="example-label">SUGGESTED ANSWER</div>
          <p>
            Customer data is encrypted at rest using managed storage controls.
          </p>
          <div className="example-source">
            <div>
              <FileText size={18} />
              <span>
                SOURCE DOCUMENT
                <small>Data protection policy · Section 3.2</small>
              </span>
            </div>
            <blockquote>
              “Customer data stored in managed systems is encrypted at rest.”
            </blockquote>
          </div>
          <div className="example-footer">
            <span>Sample data for illustration</span>
            <span>
              Ready for human review <ArrowUpRight size={15} />
            </span>
          </div>
        </div>
      </Reveal>
    </section>
  );
}

function HowItWorks() {
  const steps = [
    "Upload your security documents",
    "Upload the customer's questionnaire",
    "Review, approve and download",
  ];
  const bodies = [
    "Bring your policies and security materials into one place.",
    "Start a review from the customer's Excel questionnaire.",
    "Check sources, approve the drafts, and export your answers.",
  ];
  const stepRefs = useRef<Array<HTMLDivElement | null>>([]);
  const [howActive, setHowActive] = useState(0);

  useEffect(() => {
    const els = stepRefs.current.filter(Boolean) as HTMLDivElement[];
    if (!els.length || typeof IntersectionObserver === "undefined") return;
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            const idx = Number((entry.target as HTMLElement).dataset.step);
            if (!Number.isNaN(idx)) setHowActive(idx);
          }
        }
      },
      { rootMargin: "-45% 0px -45% 0px" },
    );
    els.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, []);

  const panels = [
    (
      <>
        <div className="how-panel-label">DOCUMENTS</div>
        <ul className="how-docs">
          {[
            "Access control policy",
            "Data protection policy",
            "Incident response plan",
          ].map((doc) => (
            <li key={doc}>
              <FileText />
              <span>{doc}</span>
              <Check className="how-check" size={14} />
            </li>
          ))}
        </ul>
      </>
    ),
    (
      <>
        <div className="how-panel-label">QUESTIONNAIRE</div>
        <div className="how-file-card">
          <FileSpreadsheet />
          <div>
            <b>Vendor security review.xlsx</b>
            <small>4 questions</small>
          </div>
        </div>
      </>
    ),
    (
      <>
        <div className="how-panel-label">REVIEW &amp; EXPORT</div>
        <div className="how-review-rows">
          <span className="status status-approved">
            <Check size={11} /> Approved
          </span>
          <span className="status status-approved">
            <Check size={11} /> Approved
          </span>
          <span className="status status-drafted">Drafted</span>
          <span className="status status-not-found">Not found</span>
        </div>
        <div className="how-export">
          <FileSpreadsheet /> Export Excel
        </div>
      </>
    ),
  ];

  return (
    <section id="how-it-works" className="section-band how-band">
      <Reveal className="site-shell how-layout">
        <SectionHeading
          eyebrow="A CLEARER WORKFLOW"
          title="From questionnaire to reviewed answer."
          body="Keep each step visible, with your team making the final call."
        />
        <div className="how-story">
          <div className="steps-list">
            <div className="how-progress" aria-hidden="true">
              <span
                style={{
                  height: `${((howActive + 1) / steps.length) * 100}%`,
                }}
              />
            </div>
            {steps.map((step, index) => (
              <div
                className={`step-row${index === howActive ? " is-active" : ""}`}
                key={step}
                data-step={index}
                ref={(el) => {
                  stepRefs.current[index] = el;
                }}
              >
                <div className="step-number">0{index + 1}</div>
                <div>
                  <h3>{step}</h3>
                  <p>{bodies[index]}</p>
                </div>
                <ArrowRight />
              </div>
            ))}
          </div>
          <div className="how-visual">
            <div className="how-panel-stack">
              {panels.map((panel, index) => (
                <div
                  key={index}
                  className={`how-panel${index === howActive ? " is-active" : ""}`}
                  aria-hidden={index !== howActive}
                >
                  {panel}
                </div>
              ))}
            </div>
            <p className="mockup-caption how-caption">
              Sample data for illustration
            </p>
          </div>
        </div>
      </Reveal>
    </section>
  );
}

function TrustSection() {
  return (
    <section className="trust-band">
      <Reveal className="site-shell trust-layout">
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
          <p>
            Trustloop assists with the busywork. Your team stays responsible for
            what gets shared.
          </p>
        </div>
        <div className="trust-points">
          {[
            "AI drafts only from the documents you upload.",
            "Every answer is reviewed and approved by a person.",
            "Each account's data is kept separate and private.",
            "If an answer isn't in your documents, Trustloop says so.",
          ].map((item) => (
            <div key={item}>
              <ShieldCheck />
              {item}
            </div>
          ))}
        </div>
      </Reveal>
    </section>
  );
}

function BuiltFor() {
  const builtForItems = [
    {
      icon: ShieldCheck,
      title: "Security teams",
      body: "Keep questionnaire answers grounded in current policies and evidence.",
    },
    {
      icon: FileCheck2,
      title: "Compliance leads",
      body: "Trace each response back to the document it came from.",
    },
    {
      icon: Sparkles,
      title: "Founders and small teams",
      body: "Work through first security reviews without a dedicated reviewer.",
    },
    {
      icon: FileSpreadsheet,
      title: "Sales and customer success",
      body: "Keep customer questionnaires moving while the conversation is live.",
    },
  ];
  return (
    <section className="section-band builtfor-band">
      <Reveal className="site-shell">
        <SectionHeading
          eyebrow="BUILT FOR"
          title="Who feels the difference first."
          body="Teams that answer security questionnaires as part of the deal."
          centered
        />
        <div className="builtfor-grid">
          {builtForItems.map(({ icon: Icon, title, body }) => (
            <article className="builtfor-item" key={title}>
              <div className="builtfor-icon">
                <Icon />
              </div>
              <h3>{title}</h3>
              <p>{body}</p>
            </article>
          ))}
        </div>
      </Reveal>
    </section>
  );
}

function SecurityBand() {
  const points = [
    "Traffic is encrypted in transit over HTTPS.",
    "Your documents are stored privately and kept separate for each account.",
    "Only signed-in members of your workspace can reach your data.",
    "A person reviews and approves every answer before it is exported.",
    "Every draft shows the source document it came from.",
  ];
  return (
    <section className="section-band security-band">
      <Reveal className="site-shell security-layout">
        <div className="security-copy">
          <div className="eyebrow">
            <span />
            SECURITY AND PRIVACY
          </div>
          <h2>Built to keep your material yours.</h2>
          <p>
            Trustloop works with sensitive security documents. These are the
            commitments the product is built on today.
          </p>
          <Link href="/security" className="text-link">
            Read the security overview <ArrowRight />
          </Link>
        </div>
        <ul className="security-list">
          {points.map((point) => (
            <li key={point}>
              <ShieldCheck />
              {point}
            </li>
          ))}
        </ul>
      </Reveal>
    </section>
  );
}

function PricingToggle({
  yearly,
  setYearly,
}: {
  yearly: boolean;
  setYearly: (value: boolean) => void;
}) {
  return (
    <div className="billing-control" role="group" aria-label="Billing frequency">
      <span
        className="billing-pill"
        aria-hidden="true"
        style={{ transform: yearly ? "translateX(100%)" : "translateX(0)" }}
      />
      <button
        type="button"
        className={!yearly ? "selected" : ""}
        aria-pressed={!yearly}
        onClick={() => setYearly(false)}
      >
        Monthly
      </button>
      <button
        type="button"
        className={yearly ? "selected" : ""}
        aria-pressed={yearly}
        onClick={() => setYearly(true)}
      >
        Yearly <span>Save 20%</span>
      </button>
    </div>
  );
}

function PricingCards({ yearly }: { yearly: boolean }) {
  return (
    <div className="pricing-grid">
      {pricingPlans.map((plan) => (
        <article
          className={`price-plan${plan.popular ? " price-plan-popular" : ""}`}
          key={plan.name}
        >
          {plan.popular && <div className="popular-label">MOST POPULAR</div>}
          <div className="plan-name">{plan.name}</div>
          <p className="plan-description">{plan.description}</p>
          <div className="plan-price">
            <span className="currency">$</span>
            <span
              className="price-value"
              key={yearly ? "yearly" : "monthly"}
            >
              {yearly ? plan.annualMonthly : plan.monthly}
            </span>
            <span className="per-month">/ month</span>
          </div>
          <p className="billing-note">
            {yearly
              ? `Billed yearly · $${plan.annual.toLocaleString()} per year`
              : "Billed monthly"}
          </p>
          <Link
            href="/signup"
            className={
              plan.popular ? "button-dark plan-cta" : "plan-cta plan-cta-light"
            }
          >
            Get early access <ArrowRight />
          </Link>
          <div className="plan-features-title">INCLUDED</div>
          <ul>
            {plan.features.map((feature) => (
              <li key={feature}>
                <Check />
                {feature}
              </li>
            ))}
          </ul>
        </article>
      ))}
    </div>
  );
}

function ComparisonTable() {
  const comparison = [
    ["Team members", "3", "10", "Unlimited"],
    ["Questionnaires / month", "5", "25", "Unlimited"],
    ["Documents", "20", "100", "500"],
    ["AI answers with sources", "Included", "Included", "Included"],
    ["Review, approval & Excel export", "Included", "Included", "Included"],
    ["Support", "Email", "Priority", "Dedicated"],
  ];
  return (
    <div className="comparison-wrap">
      <h3>Compare plans</h3>
      <div className="comparison-scroll">
        <table className="comparison-table">
          <thead>
            <tr>
              <th>Plan details</th>
              <th>Starter</th>
              <th>Growth</th>
              <th>Business</th>
            </tr>
          </thead>
          <tbody>
            {comparison.map((row) => (
              <tr key={row[0]}>
                {row.map((cell, index) =>
                  index === 0 ? (
                    <th key={cell}>{cell}</th>
                  ) : (
                    <td key={cell + index}>{cell}</td>
                  ),
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="pricing-note">Prices in USD. Cancel anytime.</p>
    </div>
  );
}

function PricingSection({ fullPage = false }: { fullPage?: boolean }) {
  const [yearly, setYearly] = useState(false);
  return (
    <section
      id="pricing"
      className={`section-band pricing-band${fullPage ? " pricing-page-band" : ""}`}
    >
      <Reveal className="site-shell">
        <SectionHeading
          eyebrow="SIMPLE, TRANSPARENT PRICING"
          title={
            fullPage
              ? "Plans that scale with your team."
              : "Less time answering. More time moving forward."
          }
          body="Choose the plan that fits the way your team works."
          centered
        />
        <PricingToggle yearly={yearly} setYearly={setYearly} />
        <PricingCards yearly={yearly} />
        <ComparisonTable />
      </Reveal>
    </section>
  );
}

function FAQ() {
  return (
    <section id="faq" className="section-band faq-band">
      <Reveal className="site-shell faq-layout">
        <SectionHeading
          eyebrow="GOOD QUESTIONS"
          title="A little more clarity."
          body="Have another question? Get in touch with the team."
        />
        <FaqList items={faqItems} />
      </Reveal>
    </section>
  );
}

function FinalCTA() {
  return (
    <section className="cta-band">
      <Reveal className="site-shell cta-inner">
        <div>
          <div className="eyebrow">
            <span />
            MAKE SPACE FOR THE WORK AHEAD
          </div>
          <h2>Stop losing deals to security questionnaires.</h2>
        </div>
        <Link href="/signup" className="button-light">
          Get early access <ArrowRight />
        </Link>
      </Reveal>
    </section>
  );
}

export function HomePage() {
  return (
    <>
      <Hero />
      <ComparisonSection />
      <Features />
      <EvidenceSection />
      <HowItWorks />
      <BuiltFor />
      <SecurityBand />
      <TrustSection />
      <PricingSection />
      <FAQ />
      <FinalCTA />
    </>
  );
}

export function PricingPage() {
  return (
    <main className="inner-page">
      <div className="site-shell">
        <header className="inner-intro">
          <div className="eyebrow">
            <span />
            PRICING
          </div>
          <h1>Plans that scale with your team.</h1>
          <p>
            Clear monthly pricing for a better way to work through customer
            security reviews.
          </p>
        </header>
      </div>
      <PricingSection fullPage />
      <section className="inner-faq">
      <Reveal className="site-shell faq-layout">
          <SectionHeading
            eyebrow="PLAN DETAILS"
            title="Pricing questions."
          />
          <FaqList
            items={[faqItems[0], faqItems[2], faqItems[5]]}
            idPrefix="pricing-faq"
          />
        </Reveal>
      </section>
      <FinalCTA />
    </main>
  );
}

function PageIntro({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string;
  title: string;
  description: string;
}) {
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

export function AboutPage() {
  return (
    <main className="inner-page">
      <div className="site-shell">
        <PageIntro
          eyebrow="ABOUT TRUSTLOOP"
          title="A clearer way to answer security reviews."
          description="Trustloop is built to help software teams spend less time reworking questionnaire answers and more time focused on their customers."
        />
        <article className="editorial-content">
          <h2>Why Trustloop</h2>
          <p>
            Security questionnaires are an important part of earning customer
            trust, but answering them repeatedly can take time away from the
            work of building software. Trustloop brings your source documents
            and questionnaire review into one focused workflow.
          </p>
          <p>
            For many teams, the information already exists. It lives in
            policies, internal documents, and responses from previous reviews.
            The difficult part is finding the right detail, adapting it to a new
            question, and making sure it still reflects how the company works
            today.
          </p>
          <h2>A workflow built around judgment</h2>
          <p>
            Trustloop starts with the material your team provides. It drafts
            answers with supporting sources, makes gaps visible, and leaves the
            final decision with the people who know the business. It is designed
            to support a careful review, not replace one.
          </p>
          <h2>Our mission</h2>
          <p>
            Make security reviews more manageable for the teams doing the
            work—without taking people out of the decision-making process. When
            a response is ready to share, your team should know what it says and
            why.
          </p>
          <p className="about-rivox">
            Trustloop is a Rivox product.{" "}
            <a href="https://rivoxcloud.com" target="_blank" rel="noopener noreferrer">
              Visit Rivox <ArrowUpRight />
            </a>
          </p>
          <p>
            Trustloop is provided by {site.companyName}, which owns the service
            and its content, policies, and intellectual property.{" "}
            {site.companyName} is completing its {site.companyStatus}; these
            details will be updated here when it is complete.
          </p>
          <p className="last-updated">Last updated: {site.lastUpdated}</p>
        </article>
      </div>
    </main>
  );
}

export function ContactPage() {
  return (
    <main className="inner-page">
      <div className="site-shell">
        <PageIntro
          eyebrow="CONTACT"
          title="Talk to the Trustloop team."
          description="For questions about early access, product details, or support, reach out by email."
        />
        <div className="contact-layout">
          <div className="contact-details">
            <div className="contact-icon">
              <FileText />
            </div>
            <h2>Email the team</h2>
            <a href={`mailto:${site.supportEmail}`}>
              {site.supportEmail} <ArrowUpRight />
            </a>
            <p>
              We reply to questions about early access, product details, and
              support.
            </p>
          </div>
          <div className="contact-form">
            <p>
              Prefer your own email app? Write to us directly and we will get
              back to you.
            </p>
            <a
              className="button-dark form-send"
              href={`mailto:${site.supportEmail}?subject=Trustloop%20question`}
            >
              Write an email <ArrowRight />
            </a>
            <p>
              This site has no contact form — nothing is sent or stored from
              this page.
            </p>
          </div>
        </div>
        <p className="last-updated">Last updated: {site.lastUpdated}</p>
      </div>
    </main>
  );
}

export function SecurityPage() {
  const points = [
    "Documents are stored privately per account.",
    "Each customer's data is kept separate from others.",
    "HTTPS is used for data in transit.",
    "AI answers are drafted only from your own uploaded documents and always reviewed by a human.",
    "Excerpts of documents are sent to third-party AI model providers to generate draft answers.",
    "Trustloop runs on Supabase (database, storage, and account login), Vercel (hosting), OpenRouter and its routed model providers (AI drafting), and Paddle (payments).",
  ];
  return (
    <main className="inner-page">
      <div className="site-shell">
        <PageIntro
          eyebrow="SECURITY"
          title="A clear view of how Trustloop handles data."
          description="An honest outline of the security practices described for the product."
        />
        <article className="editorial-content security-content">
          <h2>How your information is handled</h2>
          <ul className="security-list">
            {points.map((point) => (
              <li key={point}>
                <ShieldCheck />
                {point}
              </li>
            ))}
          </ul>
          <aside className="honesty-note">
            <h2>What we do not claim yet</h2>
            <p>
              Trustloop does not currently hold a SOC 2 or ISO 27001
              certification.
            </p>
          </aside>
          <p className="last-updated">Last updated: {site.lastUpdated}</p>
        </article>
      </div>
    </main>
  );
}

const legalContent: Record<
  string,
  { intro: string; sections: [string, string][] }
> = {
  terms: {
    intro: `These terms govern your use of ${site.brandName}, a service provided by ${site.companyName}. They should be reviewed by a legal professional before publication.`,
    sections: [
      [
        "1. About these terms",
        `These terms are between ${site.companyName}, located in ${site.cityCountry} ("${site.companyName}" or the "Company"), and the person or organization using ${site.brandName} ("Customer"). ${site.companyName} is completing its ${site.companyStatus}; these details will be updated here when it is complete. The service is provided subject to these terms.`,
      ],
      [
        "2. Eligibility and business use",
        `You must be at least 18 years old and able to enter into a binding agreement to use the service. ${site.brandName} is a business tool and may only be used for business purposes, not for personal, family, or household use.`,
      ],
      [
        "3. Using the service",
        "Customer is responsible for its account, the documents it provides, and reviewing and approving questionnaire answers before sharing them. Customer must have the rights and permissions needed to upload and process its content.",
      ],
      [
        "4. Customer content and AI",
        `${site.brandName} uses documents provided by Customer to draft questionnaire responses. Excerpts of documents may be processed by third-party AI model providers. AI-generated drafts may be incomplete or inaccurate and must be reviewed by a person. ${site.companyName} retains all right, title, and interest in ${site.brandName}, including the site, the product, its content, policies, and intellectual property. Customer retains its rights in the documents it provides.`,
      ],
      [
        "5. Fees and cancellation",
        "Subscription prices, billing frequency, and cancellation terms are shown on the pricing page. Prices are in USD. Customer may cancel anytime.",
      ],
      [
        "6. Availability and changes",
        "The Company may update or modify the service. No specific uptime or uninterrupted availability is promised by this draft template.",
      ],
      [
        "7. Assignment",
        "The Company may assign or transfer these terms, in whole or in part, in connection with a merger, acquisition, reorganization, or sale of assets. Any successor or transferee will be bound by these terms, and Customer's agreement continues with any successor to the Company's business. Customer may not assign these terms without the Company's written consent.",
      ],
      [
        "8. Governing law",
        "[GOVERNING LAW AND COURTS]",
      ],
      [
        "9. Contact",
        `Questions about these terms may be directed to ${site.supportEmail}.`,
      ],
    ],
  },
  privacy: {
    intro: `This notice explains how information is handled when you use ${site.brandName}, provided by ${site.companyName}. It should be reviewed by a legal professional before publication.`,
    sections: [
      [
        "1. Information we handle",
        `${site.brandName} handles your account details (such as your email address), the documents and questionnaires you upload, and information you provide when contacting ${site.companyName}.`,
      ],
      [
        "2. How information is used",
        `Information is used to provide and support ${site.brandName}, draft questionnaire responses, process payments, and communicate about the service.`,
      ],
      [
        "3. Service providers",
        "The service relies on third-party providers: Supabase (database, file storage, and account login), Vercel (hosting), OpenRouter and its routed model providers (AI drafting), and Paddle (payments, acting as merchant of record). These providers process information only as needed to provide their services.",
      ],
      [
        "4. Third-party AI processing",
        `Excerpts of your documents are sent to third-party AI model providers to generate draft answers. ${site.companyName} does not train its own models on your documents. A person should review each answer before sharing it.`,
      ],
      [
        "5. Storage and security",
        "Documents are stored privately per account, customer data is kept separate between accounts, and HTTPS is used in transit. This summary is not a security certification.",
      ],
      [
        "6. Retention and deletion",
        `Information is retained for as long as your account is active or as needed to provide the service, comply with legal obligations, and resolve disputes. You can request deletion of your documents and account data at any time by contacting ${site.supportEmail}.`,
      ],
      [
        "7. Your rights",
        `Depending on where you live, you may have the right to access, correct, export, or delete your personal information. Contact ${site.supportEmail} with a verified request and ${site.companyName} will respond.`,
      ],
      [
        "8. Children",
        `${site.brandName} is a business service and is not directed to children. It is not for use by anyone under 18.`,
      ],
      [
        "9. Contact",
        `For privacy questions, contact ${site.supportEmail}.`,
      ],
    ],
  },
  refund: {
    intro: `This refund policy explains how refund requests for ${site.brandName} are handled by ${site.companyName}. It should be reviewed by a legal professional before publication.`,
    sections: [
      [
        "1. Subscription fees",
        `Subscription fees and billing periods are displayed on the ${site.brandName} pricing page. Prices are shown in USD and are billed through Paddle, the merchant of record.`,
      ],
      [
        "2. Cancellation",
        "Subscriptions may be cancelled at any time. Cancellation stops future renewals; access continues according to the applicable billing period.",
      ],
      [
        "3. Refund requests",
        `Contact ${site.supportEmail} with your account and billing details to discuss a refund request. Refunds are processed through Paddle; any applicable refund will be assessed under the final published policy and applicable law.`,
      ],
      [
        "4. Contact",
        `Questions about billing may be sent to ${site.supportEmail}.`,
      ],
    ],
  },
};

const legalTitles: Record<string, string> = {
  terms: "Terms of Service",
  privacy: "Privacy Policy",
  refund: "Refund Policy",
};

export function LegalPage({ kind }: { kind: "terms" | "privacy" | "refund" }) {
  const content = legalContent[kind];
  return (
    <main className="inner-page">
      <div className="site-shell">
        <div className="draft-notice">
          Draft template. Have it reviewed by a legal professional before
          publishing.
        </div>
        <PageIntro
          eyebrow="LEGAL"
          title={legalTitles[kind]}
          description={content.intro}
        />
        <article className="editorial-content legal-content">
          {content.sections.map(([heading, body]) => (
            <section key={heading}>
              <h2>{heading}</h2>
              <p>{body}</p>
            </section>
          ))}
          <p className="last-updated">Last updated: {site.lastUpdated}</p>
        </article>
      </div>
    </main>
  );
}
