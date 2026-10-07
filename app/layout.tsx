import type { Metadata } from "next";
import { Inter, Sora } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

const sora = Sora({
  variable: "--font-sora",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"
  ),
  title: "Trustloop - Security questionnaires, drafted from your own documents",
  description:
    "Trustloop drafts sourced answers to customer security questionnaires from your own documents. Answers stay drafts until your team approves them.",
  icons: {
    icon: ["/icon.svg", "/favicon.ico"],
    apple: "/apple-icon.png",
  },
  manifest: "/manifest.webmanifest",
  openGraph: {
    title: "Trustloop - Security questionnaires, drafted from your own documents",
    description:
      "Trustloop drafts sourced answers to customer security questionnaires from your own documents. Answers stay drafts until your team approves them.",
    siteName: "Trustloop",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Trustloop - Security questionnaires, drafted from your own documents",
    description:
      "Trustloop drafts sourced answers to customer security questionnaires from your own documents. Answers stay drafts until your team approves them.",
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
      className={`${inter.variable} ${sora.variable}`}
    >
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `document.documentElement.classList.add("js");`,
          }}
        />
      </head>
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}
