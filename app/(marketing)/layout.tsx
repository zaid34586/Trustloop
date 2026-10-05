import "@/components/marketing/marketing.css";
import { SiteNav } from "@/components/marketing/site-nav";
import { SiteFooter } from "@/components/marketing/site-footer";

export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="tl-marketing">
      <SiteNav />
      {children}
      <SiteFooter />
    </div>
  );
}
