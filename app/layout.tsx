import type { Metadata } from "next";
import { Manrope, Sora } from "next/font/google";
import "./globals.css";

const manrope = Manrope({
  variable: "--font-manrope",
  subsets: ["latin"],
});

const sora = Sora({
  variable: "--font-sora",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"
  ),
  title: "Trustloop - Security questionnaires, drafted from your own documents",
  description:
    "Trustloop drafts sourced answers to customer security questionnaires from your own documents. Your team reviews and approves every response before sharing.",
  icons: {
    icon: "/icon.svg",
    apple: "/apple-icon.png",
  },
  openGraph: {
    title: "Trustloop - Security questionnaires, drafted from your own documents",
    description:
      "Trustloop drafts sourced answers to customer security questionnaires from your own documents. Your team reviews and approves every response before sharing.",
    siteName: "Trustloop",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Trustloop - Security questionnaires, drafted from your own documents",
    description:
      "Trustloop drafts sourced answers to customer security questionnaires from your own documents. Your team reviews and approves every response before sharing.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${manrope.variable} ${sora.variable}`}
    >
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}
