import Link from "next/link";
import { ArrowRight } from "lucide-react";
import "@/components/marketing/marketing.css";

export default function NotFound() {
  return (
    <div className="tl-marketing not-found-page">
      <div className="site-shell nf-inner">
        <div className="eyebrow">
          <span />
          404
        </div>
        <h1>Page not found.</h1>
        <p>The page you are looking for does not exist or has moved.</p>
        <Link href="/" className="m-btn button-dark nf-cta">
          Go home <ArrowRight />
        </Link>
      </div>
    </div>
  );
}
