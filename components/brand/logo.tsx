import Link from "next/link";
import { Fingerprint } from "lucide-react";

export const BRAND_NAME = "Trustloop";

export type LogoVariant = "light" | "dark" | "tile";

export type LogoProps = {
  variant?: LogoVariant;
  /** Size of the icon in px. Wordmark font size is size / 1.25, gap is size / 2.5. */
  size?: number;
  showWordmark?: boolean;
  className?: string;
};

const FINGERPRINT_PATHS = [
  "M12 10a2 2 0 0 0-2 2c0 1.02-.1 2.51-.26 4",
  "M14 13.12c0 2.38 0 6.38-1 8.88",
  "M17.29 21.02c.12-.6.43-2.3.5-3.02",
  "M2 12a10 10 0 0 1 18-6",
  "M2 16h.01",
  "M21.8 16c.2-2 .131-5.354 0-6",
  "M5 19.5C5.5 18 6 15 6 12a6 6 0 0 1 .34-2",
  "M8.65 22c.21-.66.45-1.32.57-2",
  "M9 6.8a6 6 0 0 1 9 5.2v2",
];

function TileMark({ size }: { size: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      focusable="false"
    >
      <rect width="24" height="24" rx="5.25" fill="#0B2A21" />
      <g
        stroke="#FFFFFF"
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      >
        {FINGERPRINT_PATHS.map((d) => (
          <path key={d} d={d} />
        ))}
      </g>
    </svg>
  );
}

export function Logo({
  variant = "light",
  size = 22,
  showWordmark = true,
  className,
}: LogoProps) {
  const wordSize = size / 1.25;
  return (
    <span
      className={`logo${variant === "light" ? "" : ` logo--${variant}`}${
        className ? ` ${className}` : ""
      }`}
      style={{ gap: size / 2.5 }}
    >
      <span className="logo-mark" style={{ width: size, height: size }}>
        {variant === "tile" ? (
          <TileMark size={size} />
        ) : (
          <Fingerprint size={size} strokeWidth={2.1} />
        )}
      </span>
      {showWordmark && (
        <span className="logo-word" style={{ fontSize: wordSize }}>
          {BRAND_NAME}
        </span>
      )}
    </span>
  );
}

export function Brand({ variant, size, showWordmark, className }: LogoProps) {
  return (
    <Link
      href="/"
      className={className ? `brand ${className}` : "brand"}
      aria-label={`${BRAND_NAME} home`}
    >
      <Logo
        variant={variant}
        size={size}
        showWordmark={showWordmark}
      />
    </Link>
  );
}
