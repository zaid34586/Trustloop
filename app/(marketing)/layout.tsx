import { Navbar, Footer } from "@/components/marketing/site";
import { ScrollProgress } from "@/components/marketing/scroll-progress";

export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <ScrollProgress />
      <Navbar />
      {children}
      <Footer />
    </>
  );
}
