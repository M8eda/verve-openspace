import type { TerminalLine, TerminalLineKind, TerminalOption } from "@/data/terminals";
import { playGlassHover } from "@/lib/audio";
import { isCoarsePointer } from "@/lib/device";

/** Blinking cursor on an empty screen before the first visit starts typing. */
export const BOOT_MS = 520;
/** Per-character cost. Commands type at "human" speed, output prints fast. */
const CHAR_MS: Record<TerminalLineKind, number> = {
  cmd: 34,
  meta: 9,
  hi: 12,
  out: 10,
  prompt: 10,
  check: 9,
};
/** Pause after finishing a line, before the next one starts. */
const LINE_PAUSE_MS: Record<TerminalLineKind, number> = {
  cmd: 260,
  meta: 140,
  hi: 140,
  out: 140,
  prompt: 0,
  // Long enough that each [OK] lands as its own beat in the scene.
  check: 110,
};

const PREFIX: Record<TerminalLineKind, string> = {
  cmd: "> ",
  meta: "",
  hi: "",
  out: "",
  prompt: "",
  check: "",
};

export type TypePhase = "boot" | "typing" | "done";

type LineEl = {
  row: HTMLDivElement;
  typed: HTMLSpanElement;
  rest: HTMLSpanElement;
  text: string;
  kind: TerminalLineKind;
};

export function restartAnimation(el: HTMLElement, cls: string) {
  el.classList.remove(cls);
  void el.offsetWidth;
  el.classList.add(cls);
}

/**
 * Types terminal lines into a body element, one character at a time, driven
 * by whatever frame loop owns it (advance(delta) each frame). Pure DOM, no
 * React state, so it can run every frame without re-renders.
 */
export class TerminalTyper {
  phase: TypePhase = "done";
  private lines: LineEl[] = [];
  private li = 0;
  private ci = 0;
  private budget = 0;
  private bootLeft = 0;

  constructor(
    private body: HTMLElement,
    private cursor: HTMLElement,
    /** Called on every phase change, before the cursor is placed. */
    private onPhase: (phase: TypePhase) => void,
    /** Where the cursor rests once typing is done; null leaves it after the text. */
    private doneCursorHost: () => HTMLElement | null,
  ) {}

  /** Replace the screen with new lines; `instant` skips the typing. */
  load(lines: TerminalLine[], instant: boolean) {
    this.body.replaceChildren();
    this.lines = lines.map((l, i) => {
      const row = document.createElement("div");
      row.className = `terminal-line terminal-line-${l.kind}`;
      // Lines typing hasn't reached yet. CSS may collapse these so the screen
      // grows as it prints instead of opening on a mostly empty box.
      if (i > 0 && !instant) row.classList.add("is-pending");
      if (l.color) row.style.setProperty("--phosphor", l.color);
      const typed = document.createElement("span");
      const rest = document.createElement("span");
      // The untyped remainder holds its space so the screen never reflows.
      rest.className = "terminal-rest";
      row.append(typed, rest);
      this.body.appendChild(row);
      const line = { row, typed, rest, text: PREFIX[l.kind] + l.text, kind: l.kind };
      this.render(line, 0);
      return line;
    });

    this.li = 0;
    this.ci = 0;
    this.budget = 0;
    if (instant) {
      this.finish();
    } else {
      this.bootLeft = BOOT_MS;
      this.setPhase("boot");
      this.placeCursor();
    }
  }

  advance(delta: number) {
    if (this.phase === "boot") {
      this.bootLeft -= delta;
      if (this.bootLeft > 0) return;
      this.budget = -this.bootLeft;
      this.setPhase("typing");
    }
    if (this.phase !== "typing") return;

    this.budget += delta;
    const startLine = this.li;
    while (this.li < this.lines.length) {
      const line = this.lines[this.li];
      const cost = CHAR_MS[line.kind];
      if (this.ci < line.text.length) {
        if (this.budget < cost) break;
        this.budget -= cost;
        this.ci++;
        continue;
      }
      const pause = LINE_PAUSE_MS[line.kind];
      if (this.budget < pause) break;
      this.budget -= pause;
      this.render(line, this.ci);
      this.li++;
      this.ci = 0;
    }

    if (this.li >= this.lines.length) {
      this.finish();
      return;
    }
    this.render(this.lines[this.li], this.ci);
    if (this.li !== startLine) {
      this.lines[this.li].row.classList.remove("is-pending");
      this.placeCursor();
    }
  }

  finish() {
    for (const line of this.lines) {
      line.row.classList.remove("is-pending");
      this.render(line, line.text.length);
    }
    this.li = this.lines.length;
    this.setPhase("done");
    this.placeCursor();
  }

  skip() {
    if (this.phase !== "done") this.finish();
  }

  /** How many lines have printed in full so far. */
  get linesDone(): number {
    return this.li;
  }

  private setPhase(next: TypePhase) {
    this.phase = next;
    this.onPhase(next);
  }

  private render(line: LineEl, count: number) {
    line.typed.textContent = line.text.slice(0, count);
    line.rest.textContent = line.text.slice(count);
  }

  private placeCursor() {
    if (this.phase === "done") {
      const host = this.doneCursorHost();
      if (host) {
        host.appendChild(this.cursor);
      } else {
        this.lines[this.lines.length - 1]?.typed.after(this.cursor);
      }
      return;
    }
    this.lines[Math.min(this.li, this.lines.length - 1)]?.typed.after(this.cursor);
  }
}

export type RenderedOptions = {
  /** Every choosable element, in option order. */
  items: HTMLElement[];
  /** The element the cursor rests in once typing is done (null: after the text). */
  cursorHost: HTMLElement | null;
};

/** A touch that travels further than this was a swipe, not a tap. */
const TAP_SLOP_PX = 12;

const span = (className: string, text: string) => {
  const el = document.createElement("span");
  el.className = className;
  el.textContent = text;
  return el;
};

/**
 * Builds the option area as a grid of glass buttons that read as pressable
 * without hovering (phones have no hover). One option is a single
 * full-width button; with several, an odd first one spans the row as the
 * primary action. Menus get a "TAP / CLICK TO SELECT" prompt, and on
 * mouse devices small keycaps for the number keys that also pick them.
 * Links are real <a href>s so middle-click and "open in new tab" still work.
 */
export function renderOptions(
  container: HTMLElement,
  options: TerminalOption[],
  onChoose: (index: number, event: MouseEvent) => void,
): RenderedOptions {
  container.replaceChildren();
  if (options.length === 0) return { items: [], cursorHost: null };

  const menu = options.length > 1;
  const touch = isCoarsePointer();

  if (menu) {
    const prompt = span("terminal-select", touch ? "Tap to select" : "Click to select");
    prompt.setAttribute("aria-hidden", "true");
    container.appendChild(prompt);
  }

  const grid = document.createElement("div");
  grid.className = "terminal-actions";
  grid.dataset.count = String(options.length);

  const items = options.map((opt, i) => {
    let el: HTMLElement;
    if (opt.action.type === "link") {
      const a = document.createElement("a");
      a.href = opt.action.href;
      el = a;
    } else {
      const b = document.createElement("button");
      b.type = "button";
      el = b;
    }
    el.className = "terminal-action";
    if (options.length % 2 === 1 && i === 0) el.classList.add("is-primary");
    el.tabIndex = -1;

    const mark = span("terminal-action-mark", "▸");
    mark.setAttribute("aria-hidden", "true");
    const label = span("terminal-action-label", opt.label);
    const arrow = span("terminal-action-arrow", "→");
    arrow.setAttribute("aria-hidden", "true");
    el.append(mark, label);
    if (menu) {
      const key = span("terminal-action-key", String(i + 1));
      key.setAttribute("aria-hidden", "true");
      el.append(key);
    }
    el.append(arrow);

    // A swipe that happens to start on a button moves the journey; it must
    // not also press the button.
    let startX = 0;
    let startY = 0;
    let swiped = false;
    el.addEventListener(
      "touchstart",
      (e) => {
        startX = e.touches[0].clientX;
        startY = e.touches[0].clientY;
        swiped = false;
      },
      { passive: true },
    );
    el.addEventListener(
      "touchend",
      (e) => {
        const t = e.changedTouches[0];
        swiped = Math.hypot(t.clientX - startX, t.clientY - startY) > TAP_SLOP_PX;
      },
      { passive: true },
    );
    el.addEventListener("pointerenter", (e) => {
      if (e.pointerType === "mouse") playGlassHover();
    });
    el.addEventListener("click", (e) => {
      e.stopPropagation();
      if (swiped) {
        swiped = false;
        e.preventDefault();
        return;
      }
      onChoose(i, e);
    });

    grid.appendChild(el);
    return el;
  });

  container.appendChild(grid);
  return { items, cursorHost: null };
}

/** Press feedback on a chosen option: a quick flash, and a short buzz on
    phones that support it. */
export function markChosen(el: HTMLElement | undefined) {
  if (!el) return;
  restartAnimation(el, "is-chosen");
  if (isCoarsePointer()) navigator.vibrate?.(10);
}

/** Plain left-clicks get client-side navigation; anything else is left to
 *  the browser (new tab, download, etc.). */
export function isPlainClick(e: MouseEvent): boolean {
  return e.button === 0 && !e.metaKey && !e.ctrlKey && !e.shiftKey && !e.altKey;
}
