import Link from "next/link";
import { Logo } from "./logo";

const columns = [
  {
    title: "Product",
    items: [
      { label: "Features", href: "/#features" },
      { label: "How it works", href: "/#how-it-works" },
      { label: "Pricing", href: "/pricing" },
      { label: "FAQ", href: "/#faq" },
      { label: "Security", href: "/security" },
    ],
  },
  {
    title: "Company",
    items: [
      { label: "About", href: "/about" },
      { label: "Contact", href: "/contact" },
      { label: "Log in", href: "/login" },
      { label: "Get Early Access", href: "/signup" },
    ],
  },
];

const legalItems = ["Privacy Policy", "Terms of Service"];

export function SiteFooter() {
  return (
    <footer className="bg-gray-950 text-gray-400">
      <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="grid gap-10 md:grid-cols-2 lg:grid-cols-4">
          <div>
            <Logo markClassName="bg-primary-600" textClassName="text-white" />
            <p className="mt-4 text-sm leading-6 text-gray-400">
              Answer customer security questionnaires in minutes, not weeks —
              with answers drafted from your own documents and reviewed by you.
            </p>
          </div>

          {columns.map((column) => (
            <div key={column.title}>
              <h3 className="text-sm font-semibold text-white">
                {column.title}
              </h3>
              <ul className="mt-4 space-y-3">
                {column.items.map((item) => (
                  <li key={item.label}>
                    <Link
                      href={item.href}
                      className="text-sm text-gray-400 transition-colors duration-150 hover:text-white"
                    >
                      {item.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}

          <div>
            <h3 className="text-sm font-semibold text-white">Legal</h3>
            <ul className="mt-4 space-y-3">
              {legalItems.map((item) => (
                <li
                  key={item}
                  className="text-sm text-gray-500"
                  title="Coming soon"
                >
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="mt-14 border-t border-gray-800 pt-8">
          <div className="flex flex-col gap-3 text-sm text-gray-500 sm:flex-row sm:items-center sm:justify-between">
            <p>
              [COMPANY NAME], [CITY, COUNTRY]
              <span className="mx-2 text-gray-700">·</span>
              [SUPPORT EMAIL]
            </p>
            <p>Powered by Rivox</p>
          </div>
        </div>
      </div>
    </footer>
  );
}
