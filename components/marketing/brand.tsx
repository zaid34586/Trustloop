import Link from "next/link";
import { Fingerprint } from "lucide-react";

export function Brand({ className }: { className?: string }) {
  return (
    <Link href="/" className={className ? `brand ${className}` : "brand"} aria-label="Trustloop home">
      <span className="brand-mark">
        <Fingerprint size={21} strokeWidth={2.1} />
      </span>
      <span>
        Trustloop<span className="brand-period">.</span>
      </span>
    </Link>
  );
}
