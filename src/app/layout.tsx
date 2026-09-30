import type { Metadata, Viewport } from "next";
import { Bricolage_Grotesque } from "next/font/google";
import Script from "next/script";
import type { ReactNode } from "react";
import ContactForm from "@/components/ContactForm";
import Header from "@/components/Header";
import Loader from "@/components/Loader";
import SceneRoot from "@/components/SceneRoot";
import SceneVisibility from "@/components/SceneVisibility";
import SmoothScroll from "@/components/SmoothScroll";
import "./globals.css";

const sans = Bricolage_Grotesque({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Verve — Digital Agency",
  description:
    "Nine capabilities, one accountable crew. We build the brand, the platform, and the growth systems that make your market orbit you. Own your space.",
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
  return (
    <html lang="en" className={sans.variable}>
      <body>
        <Script
          src="https://www.googletagmanager.com/gtag/js?id=G-4NRQQHXF7X"
          strategy="afterInteractive"
        />
        <Script id="google-analytics" strategy="afterInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', 'G-4NRQQHXF7X');
          `}
        </Script>
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
