import {
  ArrowUpRight,
  Check,
  ChevronRight,
  FileCheck2,
  FileSpreadsheet,
  FileText,
  Fingerprint,
  LockKeyhole,
  PanelLeft,
  Sparkles,
} from "lucide-react";

const rows = [
  {
    question: "How do you manage access to production systems?",
    answer: "Access is restricted to authorized personnel and reviewed regularly.",
    confidence: "High",
    status: "Approved",
  },
  {
    question: "Do you encrypt customer data at rest?",
    answer: "Customer data is encrypted at rest using managed storage controls.",
    confidence: "Medium",
    status: "Drafted",
  },
  {
    question: "How often do you conduct penetration testing?",
    answer: "I could not find this in your documents.",
    confidence: "None",
    status: "Not found",
  },
  {
    question: "What is your incident response process?",
    answer: "Incidents are triaged, documented, and escalated to the response team.",
    confidence: "High",
    status: "Approved",
  },
];

const sidebarLinks = [
  { icon: PanelLeft, label: "Dashboard" },
  { icon: FileText, label: "Documents" },
  { icon: Sparkles, label: "Ask" },
  { icon: FileCheck2, label: "Questionnaires" },
  { icon: LockKeyhole, label: "Settings" },
];

export function ProductMockup() {
  return (
    <div className="mockup-wrap" aria-label="Sample questionnaire review screen">
      <div className="mockup-window">
        <div className="window-bar">
          <div className="window-dots">
            <i />
            <i />
            <i />
          </div>
          <div className="window-address">
            <LockKeyhole /> app.trustloop.com / questionnaires / review
          </div>
          <div className="window-avatar">JD</div>
        </div>
        <div className="product-layout">
          <aside className="product-sidebar">
            <div className="sidebar-logo">
              <span>
                <Fingerprint size={17} />
              </span>
              Trustloop
            </div>
            <div className="workspace-label">WORKSPACE</div>
            {sidebarLinks.map(({ icon: Icon, label }) => (
              <div className={`sidebar-item${label === "Questionnaires" ? " active" : ""}`} key={label}>
                <Icon size={15} />
                {label}
              </div>
            ))}
            <div className="sidebar-account">
              <div className="sidebar-account-avatar">AC</div>
              <div>
                Acme Cloud
                <small>Team workspace</small>
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
              <button type="button" className="m-btn mock-export">
                <FileSpreadsheet /> Export Excel
              </button>
            </div>
            <div className="review-progress">
              <div className="progress-label">
                <span>Review progress</span>
                <b>2 of 4 approved</b>
              </div>
              <div className="progress-track">
                <span />
              </div>
            </div>
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
                  {rows.map((row) => (
                    <tr key={row.question}>
                      <td className="question-cell">{row.question}</td>
                      <td className={row.confidence === "None" ? "not-found-answer" : "answer-cell"}>
                        {row.answer}
                        <span className="mock-source">
                          Sources <ArrowUpRight />
                        </span>
                      </td>
                      <td>
                        <span className={`confidence confidence-${row.confidence.toLowerCase()}`}>
                          <i />
                          {row.confidence}
                        </span>
                      </td>
                      <td>
                        <span className={`status status-${row.status.toLowerCase().replace(" ", "-")}`}>
                          {row.status === "Approved" && <Check size={11} />}
                          {row.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
      <p className="mockup-caption">Sample data for illustration</p>
    </div>
  );
}
