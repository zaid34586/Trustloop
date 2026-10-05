import Link from "next/link";
import { Fingerprint } from "lucide-react";

export const BRAND_NAME = "Trustloop";

export function Brand({ className }: { className?: string }) {
  return (
    <Link
      href="/"
      className={className ? `brand ${className}` : "brand"}
      aria-label={`${BRAND_NAME} home`}
    >
      <span className="brand-mark">
        <Fingerprint size={21} strokeWidth={2.1} />
      </span>
      <span>{BRAND_NAME}</span>
    </Link>
  );
}
