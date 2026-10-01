import Link from "next/link";
import CookieSettingsButton from "@/components/CookieSettingsButton";
import { copyrightNotice } from "@/lib/seo";

export default function LegalLinks({ className = "" }: { className?: string }) {
  return (
    <nav className={`legal-links${className ? ` ${className}` : ""}`} aria-label="Legal links">
      <span>{copyrightNotice}</span>
      <Link href="/privacy">Privacy Policy</Link>
      <Link href="/terms">Terms of Use</Link>
      {/* The consent banner only exists where analytics do (production). */}
      {process.env.NODE_ENV === "production" ? <CookieSettingsButton /> : null}
    </nav>
  );
}
