import Link from "next/link";
import ChannelIcon from "@/components/ChannelIcon";
import CookieSettingsButton from "@/components/CookieSettingsButton";
import { copyrightNotice, socialLinks } from "@/lib/seo";

export default function LegalLinks({ className = "" }: { className?: string }) {
  return (
    <nav className={`legal-links${className ? ` ${className}` : ""}`} aria-label="Legal links">
      <span>{copyrightNotice}</span>
      <Link href="/privacy">Privacy Policy</Link>
      <Link href="/terms">Terms of Use</Link>
      {/* The consent banner only exists where analytics do (production). */}
      {process.env.NODE_ENV === "production" ? <CookieSettingsButton /> : null}
      <span className="legal-social">
        {socialLinks.map((s) => (
          <a key={s.id} href={s.href} target="_blank" rel="noopener noreferrer" aria-label={`Verve on ${s.label}`}>
            <ChannelIcon id={s.id} />
          </a>
        ))}
      </span>
    </nav>
  );
}
