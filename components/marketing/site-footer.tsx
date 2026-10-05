import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { footerColumns } from "./site-data";
import { Brand } from "./brand";

export function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="site-shell">
        <div className="footer-top">
          <div className="footer-brand-block">
            <Brand className="footer-brand" />
            <p>Security questionnaires, answered with confidence.</p>
            <p className="powered-by">
              Powered by{" "}
              <a href="https://rivoxcloud.com" target="_blank" rel="noreferrer">
                Rivox <ArrowUpRight />
              </a>
            </p>
          </div>
          {footerColumns.map((column) => (
            <div className="footer-column" key={column.title}>
              <h3>{column.title}</h3>
              {column.links.map(([label, href]) =>
                href.startsWith("/") ? (
                  <Link key={label} href={href}>
                    {label}
                  </Link>
                ) : (
                  <a key={label} href={href}>
                    {label}
                  </a>
                ),
              )}
            </div>
          ))}
        </div>
        <div className="footer-bottom">
          <span>© 2026 [COMPANY LEGAL NAME]. All rights reserved.</span>
          <span>
            [CITY, COUNTRY] <span className="footer-dot">·</span>{" "}
            <a href="mailto:[SUPPORT EMAIL]">[SUPPORT EMAIL]</a>
          </span>
        </div>
      </div>
    </footer>
  );
}
