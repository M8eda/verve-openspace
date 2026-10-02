"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { TERMINAL_STOPS, type TerminalLine } from "@/data/terminals";
import { pagerPosition, pagerState } from "@/lib/journeyPager";
import JourneyNav from "@/components/JourneyNav";
import { subscribeFrame } from "@/lib/frameLoop";
import { isCoarsePointer, prefersReducedMotion } from "@/lib/device";
import { isFreeMode } from "@/lib/freeMode";
import { isContactOpen, openContactPanel } from "@/lib/contactPanel";
import { planetHover } from "@/lib/planetFocus";
import { runTerminalAction } from "@/lib/terminalActions";
import { playGlassClick } from "@/lib/audio";
import { finale, finaleLayout, journeyLog, journeySummary, resetFinale } from "@/lib/finale";
import {
  TerminalTyper,
  isPlainClick,
  markChosen,
  renderOptions,
  restartAnimation,
  type RenderedOptions,
} from "@/lib/terminalTyper";

const CORE_STOP = TERMINAL_STOPS.length - 1;
const CORE_PARAM = TERMINAL_STOPS[CORE_STOP].param;
const FINALE_CHECKS = TERMINAL_STOPS[CORE_STOP].lines.filter((l) => l.kind === "check").length;

/** Distance (in pages) over which a stop's screen content fades out. */
const CONTENT_WINDOW = 0.42;
/** How long a finished screen sits untouched before the scroll nudge blinks in. */
const IDLE_HINT_MS = 4000;

function smoothstep(x: number) {
  const t = Math.max(0, Math.min(1, x));
  return t * t * (3 - 2 * t);
}

export default function JourneyCaptions() {
  const router = useRouter();
  const rootRef = useRef<HTMLDivElement>(null);
  const bezelRef = useRef<HTMLDivElement>(null);
  const screenRef = useRef<HTMLDivElement>(null);
  const tagRef = useRef<HTMLSpanElement>(null);
  const sysRef = useRef<HTMLSpanElement>(null);
  const bodyRef = useRef<HTMLDivElement>(null);
  const cursorRef = useRef<HTMLSpanElement>(null);
  const optionsRef = useRef<HTMLDivElement>(null);
  const hintRef = useRef<HTMLDivElement>(null);
  const srRef = useRef<HTMLParagraphElement>(null);
  const summaryRef = useRef<HTMLDivElement>(null);
  const ctaRef = useRef<HTMLButtonElement>(null);
  const skipRef = useRef<() => void>(() => {});

  useEffect(() => {
    const body = bodyRef.current;
    const cursor = cursorRef.current;
    const optionsEl = optionsRef.current;
    if (!body || !cursor || !optionsEl) return;

    const reduceMotion = prefersReducedMotion();
    const compactQuery = window.matchMedia("(max-width: 768px)");
    const touch = isCoarsePointer();
    /** Stops whose text has fully typed once; revisits print instantly. */
    const seen = new Set<number>();

    let hidden = true;
    let lastOpacity = "";
    let lastTransform = "";
    let lastContent = "";
    let interactive: boolean | null = null;

    let stopIdx = -1;
    let rendered: RenderedOptions = { items: [], cursorHost: null };
    let announced = -1;
    let idleMs = 0;
    let hintShown = false;
    let armed = false;
    /** Index of the first systems-check line on the current screen, or -1. */
    let checkStart = -1;
    let finaleLayoutOn = false;

    const navigate = (href: string) => router.push(href);

    // The finale's last beat: the stamp, the all-colour progress bar, the
    // journey summary and the launch button, all keyed off data-complete.
    const setComplete = (complete: boolean) => {
      const root = rootRef.current;
      if (!root || root.hasAttribute("data-complete") === complete) return;
      root.toggleAttribute("data-complete", complete);
      if (ctaRef.current) ctaRef.current.tabIndex = complete ? 0 : -1;
      if (!complete) return;
      if (!journeyLog.finishedAt) journeyLog.finishedAt = performance.now();
      if (summaryRef.current) summaryRef.current.textContent = journeySummary();
    };

    const typer = new TerminalTyper(
      body,
      cursor,
      (phase) => {
        rootRef.current?.setAttribute("data-phase", phase);
        if (phase === "done") {
          seen.add(stopIdx);
          optionsEl.style.visibility = "visible";
        }
        setComplete(phase === "done" && stopIdx === CORE_STOP);
      },
      () => rendered.cursorHost,
    );
    skipRef.current = () => typer.skip();

    const choose = (index: number, event?: MouseEvent) => {
      const stop = TERMINAL_STOPS[stopIdx];
      const option = stop?.options[index];
      if (!option) return;
      // Ctrl/middle clicks on a link keep the browser's own behaviour.
      if (event && option.action.type === "link" && !isPlainClick(event)) return;
      event?.preventDefault();
      markChosen(rendered.items[index]);
      playGlassClick();
      runTerminalAction(option.action, navigate, `journey_terminal_${stop.param}`);
    };

    const setHint = (show: boolean) => {
      if (show === hintShown) return;
      hintShown = show;
      hintRef.current?.classList.toggle("is-visible", show);
    };

    const build = (idx: number) => {
      const stop = TERMINAL_STOPS[idx];

      // Leaving a stop after it started typing counts as a visit, so coming
      // back prints it instantly instead of making them sit through it again.
      if (stopIdx >= 0 && typer.phase !== "boot") seen.add(stopIdx);
      stopIdx = idx;
      idleMs = 0;
      setHint(false);
      armed = false;

      const compact = compactQuery.matches;
      const visibleLines: TerminalLine[] = compact
        ? stop.lines.filter((l) => l.kind !== "meta")
        : stop.lines;

      if (tagRef.current) tagRef.current.textContent = stop.tag;
      if (sysRef.current) sysRef.current.textContent = stop.sysId;
      bezelRef.current?.style.setProperty("--phosphor", stop.color);
      if (tagRef.current && !reduceMotion) restartAnimation(tagRef.current, "is-flicker");

      rendered = renderOptions(optionsEl, stop.options, choose);
      optionsEl.style.visibility = "hidden";
      // Re-apply the current interactivity to the fresh option elements.
      for (const el of rendered.items) el.tabIndex = interactive ? 0 : -1;

      const hint = hintRef.current;
      if (hint) {
        hint.dataset.kind = stop.hint ?? "none";
        hint.textContent =
          stop.hint === "primary"
            ? touch
              ? "> SWIPE UP TO CONTINUE ▲"
              : "> SCROLL TO CONTINUE ▼"
            : touch
              ? "Swipe up for the next stop"
              : "Scroll for the next stop ▼";
      }

      const instant = reduceMotion || seen.has(idx);
      checkStart = visibleLines.findIndex((l) => l.kind === "check");
      resetFinale();
      if (idx === CORE_STOP) finale.instant = instant;
      typer.load(visibleLines, instant);
      if (instant && !reduceMotion && screenRef.current) {
        restartAnimation(screenRef.current, "is-flicker");
      }
    };

    const announce = (idx: number) => {
      if (announced === idx || !srRef.current) return;
      announced = idx;
      const stop = TERMINAL_STOPS[idx];
      const text = stop.lines
        .filter((l) => l.kind !== "cmd")
        .map((l) => l.text)
        .join(" ");
      srRef.current.textContent = `${stop.tag}. ${text}`;
    };

    // Any deliberate input resets the idle timer for the scroll nudge.
    const resetIdle = () => {
      idleMs = 0;
      setHint(TERMINAL_STOPS[stopIdx]?.hint === "subtle" && typer.phase === "done");
    };

    const onKey = (e: KeyboardEvent) => {
      resetIdle();
      if (hidden || !interactive || isFreeMode() || isContactOpen()) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const active = document.activeElement;
      if (active && (active.tagName === "INPUT" || active.tagName === "TEXTAREA")) return;
      const stop = TERMINAL_STOPS[stopIdx];
      if (!stop || stop.options.length < 2) return;
      const n = Number(e.key);
      if (!Number.isInteger(n) || n < 1 || n > stop.options.length) return;
      e.preventDefault();
      typer.skip();
      choose(n - 1);
    };

    window.addEventListener("keydown", onKey);
    window.addEventListener("wheel", resetIdle, { passive: true });
    window.addEventListener("touchstart", resetIdle, { passive: true });

    const unsubscribe = subscribeFrame((_time, delta) => {
      const root = rootRef.current;
      const bezel = bezelRef.current;
      if (!root || !bezel) return;

      const p = pagerPosition();
      let best = 0;
      let bestDist = Infinity;
      for (let i = 0; i < TERMINAL_STOPS.length; i++) {
        const d = Math.abs(p - TERMINAL_STOPS[i].param);
        if (d < bestDist) {
          bestDist = d;
          best = i;
        }
      }

      // The frame stays up for the whole journey so its header label keeps
      // naming the nearest stop, even mid-flight. Only the screen content
      // fades between stops.
      let frame = smoothstep((p - 0.6) / 0.4);
      if (p > CORE_PARAM + 0.4) frame = 0;
      const content = smoothstep(1 - bestDist / CONTENT_WINDOW);

      const nextHidden = frame <= 0.005;
      if (nextHidden !== hidden) {
        hidden = nextHidden;
        if (nextHidden) {
          root.style.display = "none";
          root.setAttribute("data-hidden", "true");
          stopIdx = -1;
          resetFinale();
        } else {
          root.style.display = "";
          root.removeAttribute("data-hidden");
        }
      }
      if (nextHidden) return;
      if (!journeyLog.startedAt) journeyLog.startedAt = performance.now();

      if (best !== stopIdx) build(best);

      // On the way into the core the frame dips out mid-flight (the text is
      // already gone by then) and comes back in the finale layout: centred
      // along the bottom, under the core.
      const layout = finaleLayout();
      const nextFinaleOn = layout >= 0.5;
      if (nextFinaleOn !== finaleLayoutOn) {
        finaleLayoutOn = nextFinaleOn;
        root.toggleAttribute("data-finale", nextFinaleOn);
      }
      const shown = frame * Math.abs(1 - 2 * layout);

      // Faded on the bezel, not the root: an ancestor below full opacity
      // would cut the glass blur off from the scene behind it.
      const nextOpacity = shown.toFixed(3);
      if (nextOpacity !== lastOpacity) {
        bezel.style.opacity = nextOpacity;
        lastOpacity = nextOpacity;
      }
      const nextTransform = `translateY(${((1 - shown) * -28).toFixed(1)}px)`;
      if (nextTransform !== lastTransform) {
        bezel.style.transform = nextTransform;
        lastTransform = nextTransform;
      }
      const nextContent = content.toFixed(3);
      if (nextContent !== lastContent) {
        // The bezel carries it for the launch button under the screen; the
        // screen declares its own, so it gets set there too.
        bezel.style.setProperty("--content", nextContent);
        screenRef.current?.style.setProperty("--content", nextContent);
        lastContent = nextContent;
      }

      const nextInteractive = content > 0.6;
      if (nextInteractive !== interactive) {
        interactive = nextInteractive;
        if (screenRef.current) screenRef.current.style.pointerEvents = nextInteractive ? "auto" : "none";
        for (const el of rendered.items) el.tabIndex = nextInteractive ? 0 : -1;
      }

      // Pointing at this stop's planet in the scene lights up its option,
      // so it's clear that clicking the planet does the same thing.
      const stop = TERMINAL_STOPS[best];
      const nextArmed =
        !!stop.bodyId && planetHover.id === stop.bodyId && typer.phase === "done" && content > 0.6;
      if (nextArmed !== armed) {
        armed = nextArmed;
        rendered.items[0]?.classList.toggle("is-armed", nextArmed);
      }

      // Typing only runs once the camera has settled on this stop; leaving
      // mid-sentence freezes it, and moving to another stop rebuilds.
      const settled = !pagerState.locked && bestDist < 0.01;
      if (!settled) {
        idleMs = 0;
        setHint(false);
        return;
      }

      announce(best);
      if (stop.bodyId && best !== CORE_STOP) journeyLog.scanned.add(stop.bodyId);
      // Real elapsed time, so slow frames don't slow the typing; capped so
      // a backgrounded tab doesn't dump a whole screen in one frame.
      typer.advance(Math.min(delta, 250));

      // The scene follows the finale's typing: the dock command sets off the
      // shockwave, and each [OK] lights that planet's orbit.
      if (best === CORE_STOP) {
        finale.elapsed += Math.min(delta, 250);
        finale.docked = typer.linesDone >= 1;
        finale.lit =
          checkStart < 0 ? 0 : Math.max(0, Math.min(FINALE_CHECKS, typer.linesDone - checkStart));
      }

      if (typer.phase === "done" && stop.hint) {
        idleMs += Math.min(delta, 250);
        setHint(stop.hint === "subtle" || idleMs >= IDLE_HINT_MS);
      }
    });

    return () => {
      unsubscribe();
      resetFinale();
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("wheel", resetIdle);
      window.removeEventListener("touchstart", resetIdle);
    };
  }, [router]);

  return (
    <div ref={rootRef} className="journey-terminal" data-hidden="true" data-phase="done" style={{ display: "none" }}>
      <div ref={bezelRef} className="terminal-bezel" style={{ opacity: 0 }}>
        <div ref={screenRef} className="terminal-screen" onClick={() => skipRef.current()}>
          <span className="terminal-roll" aria-hidden="true" />
          <div className="terminal-header">
            <span ref={tagRef} className="terminal-tag" />
            <span ref={sysRef} className="terminal-sysid" />
          </div>
          <span className="terminal-stamp" aria-hidden="true">
            Mission complete
          </span>
          <div ref={bodyRef} className="terminal-body" aria-hidden="true" />
          <div ref={summaryRef} className="terminal-summary" aria-hidden="true" />
          <div ref={optionsRef} className="terminal-options" />
          <div ref={hintRef} className="terminal-hint" aria-hidden="true" />
          <span ref={cursorRef} className="terminal-cursor" aria-hidden="true" />
          <p ref={srRef} className="sr-only" aria-live="polite" />
        </div>
        <div className="terminal-launch">
          <div className="terminal-launch-inner">
            <button
              ref={ctaRef}
              type="button"
              className="terminal-cta"
              tabIndex={-1}
              onClick={() => {
                playGlassClick();
                openContactPanel("journey_finale");
              }}
            >
              Launch your mission <span aria-hidden="true">→</span>
            </button>
          </div>
        </div>
        <div className="terminal-plate">
          <span className="terminal-led" aria-hidden="true" />
          <JourneyNav />
        </div>
      </div>
    </div>
  );
}
