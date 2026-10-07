"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const tabs = [
  { href: "/dashboard/admin", label: "Overview" },
  { href: "/dashboard/admin/plans", label: "Plans" },
  { href: "/dashboard/admin/offers", label: "Offers" },
  { href: "/dashboard/admin/users", label: "Users" },
];

export default function AdminTabs() {
  const pathname = usePathname();
  return (
    <nav className="mb-6 flex flex-wrap gap-2 border-b border-border pb-3">
      {tabs.map((tab) => {
        const active =
          tab.href === "/dashboard/admin"
            ? pathname === tab.href
            : pathname.startsWith(tab.href);
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={`pill ${active ? "pill-primary" : "pill-gray"}`}
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
