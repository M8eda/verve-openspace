import type { TerminalLine, TerminalLineKind, TerminalOption } from "@/data/terminals";

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
    /** Where the cursor rests once typing is done (e.g. the option slot). */
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
  /** The element the cursor rests in once typing is done. */
  cursorHost: HTMLElement | null;
  /** The "[ ]" input slot of a numbered menu (shows the pressed key). */
  slot: HTMLElement | null;
};

/**
 * Builds the option area. One option is a single "ENTER OPTION: [ LABEL ]"
 * control; several become a numbered menu ending in "ENTER OPTION: [ ]".
 * Links are real <a href>s so middle-click and "open in new tab" still work.
 */
export function renderOptions(
  container: HTMLElement,
  options: TerminalOption[],
  onChoose: (index: number, event: MouseEvent) => void,
): RenderedOptions {
  container.replaceChildren();
  if (options.length === 0) return { items: [], cursorHost: null, slot: null };

  const make = (opt: TerminalOption, index: number, className: string) => {
    const el =
      opt.action.type === "link" ? document.createElement("a") : document.createElement("button");
    if (el instanceof HTMLAnchorElement && opt.action.type === "link") el.href = opt.action.href;
    if (el instanceof HTMLButtonElement) el.type = "button";
    el.className = className;
    el.tabIndex = -1;
    (el as HTMLElement).addEventListener("click", (e) => {
      e.stopPropagation();
      onChoose(index, e);
    });
    return el;
  };

  if (options.length === 1) {
    const el = make(options[0], 0, "terminal-option");
    const pre = document.createElement("span");
    pre.setAttribute("aria-hidden", "true");
    pre.textContent = "ENTER OPTION: [ ";
    const label = document.createElement("span");
    label.className = "terminal-option-label";
    label.textContent = options[0].label;
    const post = document.createElement("span");
    post.setAttribute("aria-hidden", "true");
    post.textContent = " ]";
    el.append(pre, label, post);
    container.appendChild(el);
    return { items: [el], cursorHost: el, slot: null };
  }

  const menu = document.createElement("div");
  menu.className = "terminal-menu";
  const items = options.map((opt, i) => {
    const el = make(opt, i, "terminal-menu-item");
    el.dataset.key = String(i + 1);
    const key = document.createElement("span");
    key.className = "terminal-menu-key";
    key.setAttribute("aria-hidden", "true");
    key.textContent = `[${i + 1}]`;
    const label = document.createElement("span");
    label.textContent = opt.label;
    el.append(key, label);
    menu.appendChild(el);
    return el;
  });

  const input = document.createElement("div");
  input.className = "terminal-input";
  input.setAttribute("aria-hidden", "true");
  const slot = document.createElement("span");
  slot.className = "terminal-input-slot";
  input.append("ENTER OPTION: [", slot, "]");

  container.append(menu, input);
  return { items, cursorHost: slot, slot };
}

/** Plain left-clicks get client-side navigation; anything else is left to
 *  the browser (new tab, download, etc.). */
export function isPlainClick(e: MouseEvent): boolean {
  return e.button === 0 && !e.metaKey && !e.ctrlKey && !e.shiftKey && !e.altKey;
}
