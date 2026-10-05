export const navItems = [
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
    yearlyMonthly: 127,
    yearlyAnnual: 1524,
    popular: false,
    features: ["Document upload", "AI answers with sources", "Review and approval", "Excel export"],
  },
  {
    name: "Growth",
    description: "For teams moving deals forward.",
    monthly: 349,
    yearlyMonthly: 297,
    yearlyAnnual: 3564,
    popular: true,
    features: ["Everything in Starter", "Ask page", "Priority support — Coming soon"],
  },
  {
    name: "Business",
    description: "For growing security programs.",
    monthly: 799,
    yearlyMonthly: 679,
    yearlyAnnual: 8148,
    popular: false,
    features: ["Everything in Growth", "Onboarding call — Coming soon", "Dedicated support — Coming soon"],
  },
];

export const comparisonRows: [string, string, string, string][] = [
  ["Document upload", "Included", "Included", "Included"],
  ["AI answers with sources", "Included", "Included", "Included"],
  ["Review and approval", "Included", "Included", "Included"],
  ["Excel export", "Included", "Included", "Included"],
  ["Ask page", "—", "Included", "Included"],
  ["Monthly price", "$149", "$349", "$799"],
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

export const footerColumns: { title: string; links: [string, string][] }[] = [
  {
    title: "Product",
    links: [
      ["Features", "/#features"],
      ["How it works", "/#how-it-works"],
      ["Pricing", "/pricing"],
      ["FAQ", "/#faq"],
      ["Log in", "/login"],
    ],
  },
  {
    title: "Company",
    links: [
      ["About", "/about"],
      ["Contact", "/contact"],
      ["Security", "/security"],
    ],
  },
  {
    title: "Legal",
    links: [
      ["Terms of Service", "/terms"],
      ["Privacy Policy", "/privacy"],
      ["Refund Policy", "/refund-policy"],
    ],
  },
];
