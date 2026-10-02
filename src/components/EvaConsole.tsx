"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { evaScreen } from "@/data/terminals";
import { BODIES, bodyLabel, bodyNumber } from "@/lib/bodies";
import { closeFreeMode, isFreeMode, subscribeFreeMode } from "@/lib/freeMode";
import { isContactOpen } from "@/lib/contactPanel";
import { evaFlight, focusBody, getFocus, subscribeFocus } from "@/lib/planetFocus";
import { subscribeFrame } from "@/lib/frameLoop";
import { isCoarsePointer, prefersReducedMotion } from "@/lib/device";
import { runTerminalAction } from "@/lib/terminalActions";
import { playGlassClick, playGlassHover } from "@/lib/audio";
import { trackEvent } from "@/lib/analytics";
import {
  TerminalTyper,
  isPlainClick,
  markChosen,
  renderOptions,
  restartAnimation,
  type RenderedOptions,
} from "@/lib/terminalTyper";

const GUIDE_SEEN_KEY = "verve:eva-guide-seen";

function guideSeen(): boolean {
  try {
    return window.localStorage.getItem(GUIDE_SEEN_KEY) === "1";
  } catch {
    return false;
  }
}

function markGuideSeen() {
  try {
    window.localStorage.setItem(GUIDE_SEEN_KEY, "1");
  } catch {
    // Private mode: the guide just shows again next time.
  }
}

/**
 * EVA's on-screen layer: a status bar with the way out, a first-visit
 * controls guide, a "fly to" list, and the data terminal that boots when
 * the camera docks at a body. Lives outside .content (which EVA hides).
 */
export default function EvaConsole() {
  const router = useRouter();
  const [free, setFree] = useState(false);
  const [focus, setFocus] = useState<string | null>(null);
  const [guide, setGuide] = useState(false);
  const [flyOpen, setFlyOpen] = useState(false);
  const [touch, setTouch] = useState(false);

  const rootRef = useRef<HTMLDivElement>(null);
  const bezelRef = useRef<HTMLDivElement>(null);
  const screenRef = useRef<HTMLDivElement>(null);
  const tagRef = useRef<HTMLSpanElement>(null);
  const sysRef = useRef<HTMLSpanElement>(null);
  const plateRef = useRef<HTMLSpanElement>(null);
  const bodyRef = useRef<HTMLDivElement>(null);
  const cursorRef = useRef<HTMLSpanElement>(null);
  const optionsRef = useRef<HTMLDivElement>(null);
  const srRef = useRef<HTMLParagraphElement>(null);
  const skipRef = useRef<() => void>(() => {});
  const chooseRef = useRef<(index: number) => boolean>(() => false);

  useEffect(() => {
    setTouch(isCoarsePointer());
    setFree(isFreeMode());
    setFocus(getFocus());
    const offFree = subscribeFreeMode((open) => {
      setFree(open);
      setFlyOpen(false);
      setGuide(open && !guideSeen());
    });
    const offFocus = subscribeFocus((id) => {
      setFocus(id);
      if (id) {
        setFlyOpen(false);
        setGuide(false);
        markGuideSeen();
      }
    });
    return () => {
      offFree();
      offFocus();
    };
  }, []);

  // Docked terminal: builds once the flight has landed, typed by the shared
  // engine and driven from the frame loop like the journey terminal.
  useEffect(() => {
    if (!free) return;
    const body = bodyRef.current;
    const cursor = cursorRef.current;
    const optionsEl = optionsRef.current;
    const root = rootRef.current;
    if (!body || !cursor || !optionsEl || !root) return;

    const reduceMotion = prefersReducedMotion();
    const seen = new Set<string>();
    let shownId: string | null = null;
    let rendered: RenderedOptions = { items: [], cursorHost: null };

    const typer = new TerminalTyper(
      body,
      cursor,
      (phase) => {
        root.setAttribute("data-phase", phase);
        if (phase === "done") {
          if (shownId) seen.add(shownId);
          optionsEl.style.visibility = "visible";
        }
      },
      () => rendered.cursorHost,
    );
    skipRef.current = () => typer.skip();

    const navigate = (href: string) => {
      closeFreeMode();
      router.push(href);
    };

    const choose = (index: number, event?: MouseEvent): boolean => {
      const screen = shownId ? evaScreen(shownId) : null;
      const option = screen?.options[index];
      if (!option) return false;
      if (event && option.action.type === "link" && !isPlainClick(event)) return true;
      event?.preventDefault();
      markChosen(rendered.items[index]);
      playGlassClick();
      runTerminalAction(option.action, navigate, `eva_terminal_${shownId}`);
      return true;
    };
    chooseRef.current = (index) => {
      typer.skip();
      return choose(index);
    };

    const show = (id: string) => {
      const screen = evaScreen(id);
      if (!screen) return;
      shownId = id;
      if (tagRef.current) tagRef.current.textContent = screen.tag;
      if (sysRef.current) sysRef.current.textContent = screen.sysId;
      if (plateRef.current) plateRef.current.textContent = `EVA link · ${screen.sysId}`;
      bezelRef.current?.style.setProperty("--phosphor", screen.color);
      rendered = renderOptions(optionsEl, screen.options, choose);
      for (const el of rendered.items) el.tabIndex = 0;
      optionsEl.style.visibility = "hidden";
      const compact = window.matchMedia("(max-width: 768px)").matches;
      typer.load(
        compact ? screen.lines.filter((l) => l.kind !== "meta") : screen.lines,
        reduceMotion || seen.has(id),
      );
      if (srRef.current) {
        srRef.current.textContent = `${screen.tag}. ${screen.lines
          .filter((l) => l.kind !== "cmd")
          .map((l) => l.text)
          .join(" ")}`;
      }
      root.removeAttribute("data-hidden");
      if (!reduceMotion) {
        if (tagRef.current) restartAnimation(tagRef.current, "is-flicker");
        if (screenRef.current) restartAnimation(screenRef.current, "is-flicker");
      }
    };

    const hide = () => {
      if (!shownId) return;
      shownId = null;
      rendered = { items: [], cursorHost: null };
      root.setAttribute("data-hidden", "true");
    };

    const unsubscribe = subscribeFrame((_time, delta) => {
      const id = getFocus();
      if (!id || evaFlight.active) {
        hide();
        return;
      }
      if (id !== shownId) show(id);
      typer.advance(Math.min(delta, 250));
    });

    return () => {
      unsubscribe();
      hide();
      chooseRef.current = () => false;
    };
  }, [free, router]);

  // Esc backs out one level: undock first, then leave EVA.
  useEffect(() => {
    if (!free) return;
    const onKey = (e: KeyboardEvent) => {
      if (isContactOpen() || e.metaKey || e.ctrlKey || e.altKey) return;
      const active = document.activeElement;
      if (active && (active.tagName === "INPUT" || active.tagName === "TEXTAREA")) return;

      if (e.key === "Escape") {
        e.preventDefault();
        if (getFocus()) {
          focusBody(null);
        } else {
          trackEvent("eva_toggle", { state: "exit", source: "escape" });
          closeFreeMode();
        }
        return;
      }
      const n = Number(e.key);
      if (Number.isInteger(n) && n >= 1 && getFocus() && chooseRef.current(n - 1)) {
        e.preventDefault();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [free]);

  if (!free) return null;

  const dismissGuide = () => {
    markGuideSeen();
    setGuide(false);
  };

  return (
    <div className={`eva-ui${focus ? " has-focus" : ""}`}>
      <div className="eva-status" role="status">
        <span className="eva-status-live" aria-hidden="true" />
        <span>EVA // Free roam</span>
        <button
          type="button"
          className="eva-key"
          onMouseEnter={() => playGlassHover()}
          onClick={() => {
            playGlassClick();
            if (getFocus()) {
              focusBody(null);
            } else {
              trackEvent("eva_toggle", { state: "exit", source: "eva_status" });
              closeFreeMode();
            }
          }}
        >
          {touch ? "" : "[Esc] "}
          {focus ? "Undock" : "Exit"}
        </button>
      </div>

      {guide && (
        <div className="eva-guide" role="dialog" aria-label="EVA controls">
          <p className="eva-guide-title">&gt; EVA controls</p>
          <ul>
            {touch ? (
              <>
                <li><span>Drag</span> orbit the view</li>
                <li><span>Pinch</span> zoom in and out</li>
                <li><span>Two-finger drag</span> pan</li>
                <li><span>Tap a planet</span> fly to it</li>
              </>
            ) : (
              <>
                <li><span>Drag</span> orbit the view</li>
                <li><span>Scroll</span> zoom in and out</li>
                <li><span>Right-drag</span> pan</li>
                <li><span>Click a planet</span> fly to it</li>
                <li><span>Esc</span> undock / exit EVA</li>
              </>
            )}
          </ul>
          <button type="button" className="eva-key eva-guide-ok" onClick={dismissGuide}>
            [ OK ]
          </button>
        </div>
      )}

      <nav className={`eva-fly${flyOpen ? " is-open" : ""}`} aria-label="Fly to">
        {flyOpen && (
          <ul className="eva-fly-list">
            {BODIES.map((b) => (
              <li key={b.id}>
                <button
                  type="button"
                  className={`eva-fly-item${focus === b.id ? " is-current" : ""}`}
                  style={{ "--tag": b.color } as React.CSSProperties}
                  onMouseEnter={() => playGlassHover()}
                  onClick={() => {
                    playGlassClick();
                    trackEvent("eva_fly_to", { target: b.id, source: "fly_list" });
                    focusBody(b.id);
                  }}
                >
                  <span className="eva-fly-num">{bodyNumber(b)}</span>
                  {bodyLabel(b)}
                </button>
              </li>
            ))}
          </ul>
        )}
        <button
          type="button"
          className="eva-key eva-fly-toggle"
          aria-expanded={flyOpen}
          onMouseEnter={() => playGlassHover()}
          onClick={() => {
            playGlassClick();
            setFlyOpen((o) => !o);
          }}
        >
          [ Fly to {flyOpen ? "▼" : "▲"} ]
        </button>
      </nav>

      <div ref={rootRef} className="journey-terminal eva-terminal" data-hidden="true" data-phase="done">
        <div ref={bezelRef} className="terminal-bezel">
          <div ref={screenRef} className="terminal-screen" onClick={() => skipRef.current()}>
            <span className="terminal-roll" aria-hidden="true" />
            <div className="terminal-header">
              <span ref={tagRef} className="terminal-tag" />
              <span ref={sysRef} className="terminal-sysid" />
            </div>
            <div ref={bodyRef} className="terminal-body" aria-hidden="true" />
            <div ref={optionsRef} className="terminal-options" />
            <span ref={cursorRef} className="terminal-cursor" aria-hidden="true" />
            <p ref={srRef} className="sr-only" aria-live="polite" />
          </div>
          <div className="terminal-plate" aria-hidden="true">
            <span className="terminal-led" />
            <span ref={plateRef} />
          </div>
        </div>
      </div>
    </div>
  );
}
