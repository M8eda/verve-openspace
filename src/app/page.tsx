import type { CSSProperties } from "react";
import DebugHud from "@/components/DebugHud";
import JourneyCaptions from "@/components/JourneyCaptions";
import JourneyTimeline from "@/components/JourneyTimeline";
import JourneyPager from "@/components/JourneyPager";
import { services } from "@/data/services";

type AssemblyWordStyle = CSSProperties & { "--idx": number };

function assemblyDelay(index: number): AssemblyWordStyle {
  return { "--idx": index };
}

export default function HomePage() {
  return (
    <>
      <section className="hero">
        <div className="hero-content">
          <p className="hero-eyebrow">Verve / Digital Growth System</p>
          <h1 className="hero-title">
            <span className="hero-line hero-line-1">
              <span className="assembly-word" style={assemblyDelay(0)}>Own&nbsp;</span>
              <span className="assembly-word" style={assemblyDelay(1)}>your&nbsp;</span>
              <br className="mobile-title-break" />
              <span className="assembly-word" style={assemblyDelay(2)}>
                <span className="plasma-text">space</span>.
              </span>
            </span>
          </h1>
          <p className="hero-support">
            <span>We don&rsquo;t just launch brands.</span>
            <span>We engineer the gravity they orbit.</span>
          </p>
          <div className="hero-subtitle">
            <span className="scroll-indicator reveal-delayed">
              <span className="scroll-copy-desktop">Scroll to enter the system.</span>
              <span className="scroll-copy-mobile">Swipe to enter the system.</span>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                <path d="M6 9l6 6 6-6" />
              </svg>
            </span>
          </div>
        </div>
      </section>

      <JourneyPager />

      <JourneyTimeline />
      <JourneyCaptions />
      <DebugHud />

      <section className="sr-only" aria-label="Service overview">
        <h2>Services</h2>
        <ul>
          {services.map((s) => (
            <li key={s.slug}>
              <h3>{s.name}</h3>
              <p>{s.description}</p>
            </li>
          ))}
        </ul>
      </section>
    </>
  );
}
