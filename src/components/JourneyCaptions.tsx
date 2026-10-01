"use client";

import { useEffect, useRef } from "react";
import { TERMINAL_STOPS, type TerminalLine, type TerminalLineKind } from "@/data/terminals";
import { pagerPosition, pagerState } from "@/lib/journeyPager";
import { subscribeFrame } from "@/lib/frameLoop";
import { prefersReducedMotion } from "@/lib/device";
import { trackEvent } from "@/lib/analytics";

const CORE_PARAM = TERMINAL_STOPS[TERMINAL_STOPS.length - 1].param;

/** Distance (in pages) over which a stop's screen content fades out. */
const CONTENT_WINDOW = 0.42;
/** Blinking cursor on an empty screen before the first visit starts typing. */
const BOOT_MS = 520;
/** Per-character cost. Commands type at "human" speed, output prints fast. */
const CHAR_MS: Record<TerminalLineKind, number> = {
  cmd: 34,
  meta: 9,
  hi: 12,
  out: 10,
  prompt: 10,
};
/** Pause after finishing a line, before the next one starts. */
const LINE_PAUSE_MS: Record<TerminalLineKind, number> = {
  cmd: 260,
  meta: 140,
  hi: 140,
  out: 140,
  prompt: 0,
};

const PREFIX: Record<TerminalLineKind, string> = {
  cmd: "> ",
  meta: "",
  hi: "",
  out: "",
  prompt: "",
};

type Phase = "boot" | "typing" | "done";

type LineEl = { typed: HTMLSpanElement; rest: HTMLSpanElement; text: string; kind: TerminalLineKind };

function smoothstep(x: number) {
  const t = Math.max(0, Math.min(1, x));
  return t * t * (3 - 2 * t);
}

function restartAnimation(el: HTMLElement, cls: string) {
  el.classList.remove(cls);
  void el.offsetWidth;
  el.classList.add(cls);
}

export default function JourneyCaptions() {
  const rootRef = useRef<HTMLDivElement>(null);
  const bezelRef = useRef<HTMLDivElement>(null);
  const screenRef = useRef<HTMLDivElement>(null);
  const tagRef = useRef<HTMLSpanElement>(null);
  const sysRef = useRef<HTMLSpanElement>(null);
  const plateRef = useRef<HTMLSpanElement>(null);
  const bodyRef = useRef<HTMLDivElement>(null);
  const cursorRef = useRef<HTMLSpanElement>(null);
  const optionRef = useRef<HTMLAnchorElement>(null);
  const optionLabelRef = useRef<HTMLSpanElement>(null);
  const srRef = useRef<HTMLParagraphElement>(null);
  const skipRef = useRef<() => void>(() => {});

  useEffect(() => {
    const reduceMotion = prefersReducedMotion();
    const compactQuery = window.matchMedia("(max-width: 768px)");
    /** Stops whose text has fully typed once; revisits print instantly. */
    const seen = new Set<number>();

    let hidden = true;
    let lastOpacity = "";
    let lastTransform = "";
    let lastContent = "";
    let interactive: boolean | null = null;

    let stopIdx = -1;
    let lines: LineEl[] = [];
    let phase: Phase = "done";
    let bootLeft = 0;
    let li = 0;
    let ci = 0;
    let budget = 0;
    let announced = -1;

    const setPhase = (next: Phase) => {
      phase = next;
      rootRef.current?.setAttribute("data-phase", next);
    };

    const placeCursor = () => {
      const cursor = cursorRef.current;
      if (!cursor) return;
      if (phase === "done") {
        const opt = optionRef.current;
        if (opt && opt.style.display !== "none") {
          opt.appendChild(cursor);
        } else {
          const last = lines[lines.length - 1];
          if (last) last.typed.after(cursor);
        }
        return;
      }
      const line = lines[Math.min(li, lines.length - 1)];
      if (line) line.typed.after(cursor);
    };

    const renderLine = (line: LineEl, count: number) => {
      line.typed.textContent = line.text.slice(0, count);
      line.rest.textContent = line.text.slice(count);
    };

    const finish = () => {
      for (const line of lines) renderLine(line, line.text.length);
      li = lines.length;
      setPhase("done");
      seen.add(stopIdx);
      if (optionRef.current) optionRef.current.style.visibility = "visible";
      placeCursor();
    };
    skipRef.current = () => {
      if (phase !== "done") finish();
    };

    const build = (idx: number) => {
      const stop = TERMINAL_STOPS[idx];
      const body = bodyRef.current;
      if (!body) return;

      // Leaving a stop after it started typing counts as a visit, so coming
      // back prints it instantly instead of making them sit through it again.
      if (stopIdx >= 0 && phase !== "boot") seen.add(stopIdx);
      stopIdx = idx;
      const compact = compactQuery.matches;
      const visibleLines: TerminalLine[] = compact
        ? stop.lines.filter((l) => l.kind !== "meta")
        : stop.lines;

      if (tagRef.current) tagRef.current.textContent = stop.tag;
      if (sysRef.current) sysRef.current.textContent = stop.sysId;
      if (plateRef.current) plateRef.current.textContent = `Verve data terminal · ${stop.sysId}`;
      bezelRef.current?.style.setProperty("--phosphor", stop.color);
      if (tagRef.current && !reduceMotion) restartAnimation(tagRef.current, "is-flicker");

      body.replaceChildren();
      lines = visibleLines.map((l) => {
        const row = document.createElement("div");
        row.className = `terminal-line terminal-line-${l.kind}`;
        const typed = document.createElement("span");
        const rest = document.createElement("span");
        rest.className = "terminal-rest";
        row.append(typed, rest);
        body.appendChild(row);
        const line = { typed, rest, text: PREFIX[l.kind] + l.text, kind: l.kind };
        renderLine(line, 0);
        return line;
      });

      const opt = optionRef.current;
      if (opt) {
        if (stop.link) {
          opt.href = stop.link.href;
          opt.style.display = "";
          if (optionLabelRef.current) optionLabelRef.current.textContent = stop.link.label;
        } else {
          opt.removeAttribute("href");
          opt.style.display = "none";
        }
        opt.style.visibility = "hidden";
      }

      li = 0;
      ci = 0;
      budget = 0;
      if (reduceMotion || seen.has(idx)) {
        finish();
        if (!reduceMotion && screenRef.current) restartAnimation(screenRef.current, "is-flicker");
      } else {
        bootLeft = BOOT_MS;
        setPhase("boot");
        placeCursor();
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

    const advance = (delta: number) => {
      if (phase === "boot") {
        bootLeft -= delta;
        if (bootLeft > 0) return;
        budget = -bootLeft;
        setPhase("typing");
      }
      if (phase !== "typing") return;

      budget += delta;
      const startLine = li;
      while (li < lines.length) {
        const line = lines[li];
        const cost = CHAR_MS[line.kind];
        if (ci < line.text.length) {
          if (budget < cost) break;
          budget -= cost;
          ci++;
          continue;
        }
        const pause = LINE_PAUSE_MS[line.kind];
        if (budget < pause) break;
        budget -= pause;
        renderLine(line, ci);
        li++;
        ci = 0;
      }

      if (li >= lines.length) {
        finish();
        return;
      }
      renderLine(lines[li], ci);
      if (li !== startLine) placeCursor();
    };

    return subscribeFrame((_time, delta) => {
      const root = rootRef.current;
      if (!root) return;

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
        } else {
          root.style.display = "";
          root.removeAttribute("data-hidden");
        }
      }
      if (nextHidden) return;

      if (best !== stopIdx) build(best);

      const nextOpacity = frame.toFixed(3);
      if (nextOpacity !== lastOpacity) {
        root.style.opacity = nextOpacity;
        lastOpacity = nextOpacity;
      }
      const nextTransform = `translateY(${((1 - frame) * -28).toFixed(1)}px)`;
      if (nextTransform !== lastTransform) {
        root.style.transform = nextTransform;
        lastTransform = nextTransform;
      }
      const nextContent = content.toFixed(3);
      if (nextContent !== lastContent) {
        screenRef.current?.style.setProperty("--content", nextContent);
        lastContent = nextContent;
      }

      const nextInteractive = content > 0.6;
      if (nextInteractive !== interactive) {
        interactive = nextInteractive;
        if (screenRef.current) screenRef.current.style.pointerEvents = nextInteractive ? "auto" : "none";
        if (optionRef.current) optionRef.current.tabIndex = nextInteractive ? 0 : -1;
      }

      // Typing only runs once the camera has settled on this stop; leaving
      // mid-sentence freezes it, and moving to another stop rebuilds.
      const settled = !pagerState.locked && bestDist < 0.01;
      if (settled) {
        announce(best);
        // Real elapsed time, so slow frames don't slow the typing; capped so
        // a backgrounded tab doesn't dump a whole screen in one frame.
        advance(Math.min(delta, 250));
      }
    });
  }, []);

  return (
    <div ref={rootRef} className="journey-terminal" data-hidden="true" data-phase="done" style={{ display: "none", opacity: 0 }}>
      <div ref={bezelRef} className="terminal-bezel">
        <div ref={screenRef} className="terminal-screen" onClick={() => skipRef.current()}>
          <div className="terminal-header">
            <span ref={tagRef} className="terminal-tag" />
            <span ref={sysRef} className="terminal-sysid" />
          </div>
          <div ref={bodyRef} className="terminal-body" aria-hidden="true" />
          <a
            ref={optionRef}
            className="terminal-option"
            tabIndex={-1}
            onClick={(e) => {
              e.stopPropagation();
              const link = optionRef.current;
              if (!link?.href) return;
              trackEvent("journey_caption_click", {
                target: link.pathname,
                label: optionLabelRef.current?.textContent ?? "",
              });
            }}
          >
            <span aria-hidden="true">ENTER OPTION: [ </span>
            <span ref={optionLabelRef} className="terminal-option-label" />
            <span aria-hidden="true"> ]</span>
          </a>
          <span ref={cursorRef} className="terminal-cursor" aria-hidden="true" />
          <p ref={srRef} className="sr-only" aria-live="polite" />
        </div>
        <div className="terminal-plate" aria-hidden="true">
          <span className="terminal-led" />
          <span ref={plateRef} />
        </div>
      </div>
    </div>
  );
}
