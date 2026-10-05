import Link from "next/link";
import { ArrowRight } from "lucide-react";

export default function NotFound() {
  return (
    <main className="not-found-shell">
      <div className="not-found-code">404</div>
      <h1 className="not-found-title">Page not found.</h1>
      <p className="not-found-copy">
        The page you are looking for does not exist or has moved.
      </p>
      <Link href="/" className="button-dark">
        Go home <ArrowRight />
      </Link>
    </main>
  );
}
