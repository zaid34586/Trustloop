import Link from "next/link";

export function Logo({
  className = "",
  markClassName = "bg-primary-600",
  textClassName = "text-white",
}: {
  className?: string;
  markClassName?: string;
  textClassName?: string;
}) {
  return (
    <Link
      href="/"
      className={`group inline-flex items-center gap-2.5 ${className}`}
      aria-label="Trustloop home"
    >
      <span
        className={`inline-flex h-8 w-8 items-center justify-center rounded-xl shadow-sm transition-transform duration-200 group-hover:scale-105 ${markClassName}`}
      >
        <svg
          className="h-4 w-4 text-white"
          viewBox="0 0 24 24"
          fill="none"
          aria-hidden="true"
        >
          <path
            d="M12 2.75l7.25 3.1v5.4c0 4.6-3.05 8.1-7.25 9.9-4.2-1.8-7.25-5.3-7.25-9.9v-5.4L12 2.75z"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinejoin="round"
          />
          <path
            d="M8.75 12.1l2.3 2.3 4.2-4.7"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </span>
      <span className={`text-lg font-bold tracking-tight ${textClassName}`}>
        Trustloop
      </span>
    </Link>
  );
}
