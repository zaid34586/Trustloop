"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowUpRight, ChevronRight, Menu, X } from "lucide-react";
import { navItems } from "./site-data";
import { Brand } from "./brand";

export function SiteNav() {
  const [open, setOpen] = useState(false);
  return (
    <header className="site-header">
      <div className="site-shell nav-inner">
        <Brand />
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
          <Link className="m-btn button-dark nav-cta" href="/signup">
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
            <Link key={item.label} href={item.href} onClick={() => setOpen(false)}>
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
