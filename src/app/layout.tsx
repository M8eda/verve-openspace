import type { Metadata, Viewport } from "next";
import { Bricolage_Grotesque, VT323 } from "next/font/google";
import Script from "next/script";
import type { ReactNode } from "react";
import { Suspense } from "react";
import AnalyticsPageView from "@/components/AnalyticsPageView";
import ContactForm from "@/components/ContactForm";
import EvaConsole from "@/components/EvaConsole";
import Header from "@/components/Header";
import Loader from "@/components/Loader";
import SceneRoot from "@/components/SceneRoot";
import SceneVisibility from "@/components/SceneVisibility";
import SmoothScroll from "@/components/SmoothScroll";
import ConsentBanner from "@/components/ConsentBanner";
import { CONSENT_KEY, GA_MEASUREMENT_ID } from "@/lib/analytics";
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

const isProduction = process.env.NODE_ENV === "production";
const siteHost = new URL(siteUrl).hostname;

const sans = Bricolage_Grotesque({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

const terminal = VT323({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-terminal",
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
    <html lang="en" className={`${sans.variable} ${terminal.variable}`}>
      <body>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(structuredData).replace(/</g, "\\u003c"),
          }}
        />
        {/* Analytics only ship in production builds, and only report from the
            live domain, so local runs and preview deploys don't skew the data. */}
        {isProduction ? (
          <>
            {/* Cookies stay denied until the visitor allows them in the
                consent banner; a stored choice is applied before GA starts. */}
            <Script id="google-analytics" strategy="afterInteractive">
              {`
                if (location.hostname !== '${siteHost}') window['ga-disable-${GA_MEASUREMENT_ID}'] = true;
                window.dataLayer = window.dataLayer || [];
                function gtag(){dataLayer.push(arguments);}
                var consent = null;
                try { consent = localStorage.getItem('${CONSENT_KEY}'); } catch (e) {}
                gtag('consent', 'default', {
                  analytics_storage: consent === 'granted' ? 'granted' : 'denied',
                  ad_storage: 'denied',
                  ad_user_data: 'denied',
                  ad_personalization: 'denied'
                });
                gtag('js', new Date());
                gtag('config', '${GA_MEASUREMENT_ID}', { send_page_view: false });
              `}
            </Script>
            <Script
              src={`https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`}
              strategy="afterInteractive"
            />
          </>
        ) : null}
        <Suspense fallback={null}>
          <AnalyticsPageView />
        </Suspense>
        <SceneRoot />
        <SceneVisibility />
        <SmoothScroll />
        <Loader />
        <Header />
        <EvaConsole />
        <ContactForm />
        <main className="content">{children}</main>
        {isProduction ? <ConsentBanner /> : null}
      </body>
    </html>
  );
}
