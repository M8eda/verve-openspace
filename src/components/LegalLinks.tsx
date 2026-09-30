import Link from "next/link";
import { copyrightNotice } from "@/lib/seo";

export default function LegalLinks({ className = "" }: { className?: string }) {
  return (
    <nav className={`legal-links${className ? ` ${className}` : ""}`} aria-label="Legal links">
      <span>{copyrightNotice}</span>
      <Link href="/privacy">Privacy Policy</Link>
      <Link href="/terms">Terms of Use</Link>
    </nav>
  );
}
