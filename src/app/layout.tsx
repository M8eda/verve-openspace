import type { Metadata, Viewport } from "next";
import { Bricolage_Grotesque } from "next/font/google";
import Script from "next/script";
import type { ReactNode } from "react";
import { Suspense } from "react";
import AnalyticsPageView from "@/components/AnalyticsPageView";
import ContactForm from "@/components/ContactForm";
import Header from "@/components/Header";
import Loader from "@/components/Loader";
import SceneRoot from "@/components/SceneRoot";
import SceneVisibility from "@/components/SceneVisibility";
import SmoothScroll from "@/components/SmoothScroll";
import {
  defaultDescription,
  defaultOgImage,
  defaultTitle,
  organizationJsonLd,
  seoKeywords,
  siteName,
  siteUrl,
  websiteJsonLd,
} from "@/lib/seo";
import "./globals.css";

const sans = Bricolage_Grotesque({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  applicationName: siteName,
  title: {
    default: defaultTitle,
    template: `%s | ${siteName}`,
  },
  description: defaultDescription,
  keywords: seoKeywords,
  authors: [{ name: siteName, url: siteUrl }],
  creator: siteName,
  publisher: siteName,
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "/",
    siteName,
    title: defaultTitle,
    description: defaultDescription,
    images: [
      {
        url: defaultOgImage,
        width: 1200,
        height: 630,
        alt: "Verve digital agency homepage with a cinematic space system.",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: defaultTitle,
    description: defaultDescription,
    images: [defaultOgImage],
  },
  icons: {
    icon: "/icon.svg",
    apple: "/icon.svg",
  },
};

export const viewport: Viewport = {
  themeColor: "#01020a",
  colorScheme: "dark",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  const structuredData = [organizationJsonLd(), websiteJsonLd()];

  return (
    <html lang="en" className={sans.variable}>
      <body>
        <Script
          id="site-structured-data"
          type="application/ld+json"
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(structuredData).replace(/</g, "\\u003c"),
          }}
        />
        <Script
          src="https://www.googletagmanager.com/gtag/js?id=G-4NRQQHXF7X"
          strategy="afterInteractive"
        />
        <Script id="google-analytics" strategy="afterInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', 'G-4NRQQHXF7X', { send_page_view: false });
          `}
        </Script>
        <Suspense fallback={null}>
          <AnalyticsPageView />
        </Suspense>
        <SceneRoot />
        <SceneVisibility />
        <SmoothScroll />
        <Loader />
        <Header />
        <ContactForm />
        <main className="content">{children}</main>
      </body>
    </html>
  );
}
