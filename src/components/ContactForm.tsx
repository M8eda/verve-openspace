"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type CSSProperties, type FormEvent, type KeyboardEvent } from "react";
import {
  isContactOpen,
  closeContactPanel,
  contactService,
  subscribeContactPanel,
} from "@/lib/contactPanel";
import { services, getServiceBySlug, type Service } from "@/data/services";
import type { TerminalLine } from "@/data/terminals";
import { BUDGET_OPTIONS, newMissionId, type BriefQuestion } from "@/data/missionBriefs";
import {
  BRIEF_LIMITS,
  activeQuestions,
  composeBrief,
  type Answers,
  type Brief,
  type BriefInput,
} from "@/lib/missionBrief";
import ChannelIcon, { type ChannelId } from "@/components/ChannelIcon";
import { TerminalTyper } from "@/lib/terminalTyper";
import { isCoarsePointer, prefersReducedMotion } from "@/lib/device";
import { playGlassHover, playGlassClick } from "@/lib/audio";
import { trackEvent } from "@/lib/analytics";
import {
  contactEmail,
  contactPhoneDisplay,
  contactPhoneHref,
  copyrightNotice,
  socialLinks,
  whatsappHref,
} from "@/lib/seo";

const BRAND = "#cdf757";
/** Gap between the transmission log's lines. */
const LOG_STEP_MS = 420;

type Phase = "form" | "sending" | "sent" | "error";
type Fields = { name: string; email: string; message: string };
type Delivery = { via: "api"; confirmation: boolean } | { via: "mailto" };
type Outcome = Delivery | { via: "invalid"; field: keyof Fields } | { via: "error"; reason: "rate" | "failed" };

const pad = (n: number) => String(n).padStart(2, "0");

const CHANNELS: { id: ChannelId; label: string; href: string; external?: boolean }[] = [
  { id: "email", label: `Email ${contactEmail}`, href: `mailto:${contactEmail}` },
  { id: "phone", label: `Call ${contactPhoneDisplay}`, href: contactPhoneHref },
  { id: "whatsapp", label: "WhatsApp", href: whatsappHref, external: true },
  ...socialLinks.map((s) => ({ id: s.id, label: `Verve on ${s.label}`, href: s.href, external: true })),
];

function bootLines(service: Service | undefined): TerminalLine[] {
  if (!service) {
    return [
      { kind: "cmd", text: "open --channel verve" },
      { kind: "meta", text: "LINK SECURE · REPLY WITHIN 1 BUSINESS DAY" },
      { kind: "hi", text: "Not sure where to start?" },
      { kind: "out", text: "Tell us the space you're trying to own. We'll map the fastest path there." },
    ];
  }
  return [
    { kind: "cmd", text: `plot --course ${service.slug}` },
    { kind: "meta", text: service.process.map((step) => step.title.toUpperCase()).join(" → ") },
    { kind: "hi", text: "New mission. Let's plot it." },
    { kind: "out", text: "A few coordinates and we'll come back with a flight plan within 1 business day." },
  ];
}

/**
 * Uplinks the brief to /api/contact. If the server has no mail set up it
 * answers 503, and the brief goes out through the visitor's own mail app
 * instead, as it did before the API.
 */
async function transmit(
  input: BriefInput,
  brief: Brief,
  guard: { callsign: string; elapsed: number },
): Promise<Outcome> {
  let res: Response;
  try {
    res = await fetch("/api/contact", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...input, ...guard }),
    });
  } catch {
    return { via: "error", reason: "failed" };
  }
  const data: { ok?: boolean; confirmation?: boolean; field?: string } = await res.json().catch(() => ({}));

  if (res.ok && data.ok) return { via: "api", confirmation: !!data.confirmation };
  if (res.status === 503) {
    window.location.href = `mailto:${contactEmail}?subject=${encodeURIComponent(brief.subject)}&body=${encodeURIComponent(brief.text)}`;
    return { via: "mailto" };
  }
  if (res.status === 429) return { via: "error", reason: "rate" };
  if (res.status === 400 && (data.field === "name" || data.field === "email" || data.field === "message")) {
    return { via: "invalid", field: data.field };
  }
  return { via: "error", reason: "failed" };
}

const FIELD_ERRORS: Record<keyof Fields, string> = {
  name: "[ERR] NAME REQUIRED",
  email: "[ERR] EMAIL LOOKS OFF",
  message: "[ERR] PICK A SERVICE OR TELL US ABOUT THE MISSION",
};

function Chip({
  label,
  pressed,
  color,
  onToggle,
}: {
  label: string;
  pressed: boolean;
  color?: string;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      className="contact-chip"
      aria-pressed={pressed}
      style={color ? ({ "--chip": color } as CSSProperties) : undefined}
      onMouseEnter={() => playGlassHover()}
      onClick={() => {
        playGlassClick();
        if (isCoarsePointer()) navigator.vibrate?.(8);
        onToggle();
      }}
    >
      {label}
    </button>
  );
}

/**
 * Mission control: the contact form as a terminal, in the same glass and
 * phosphor as the journey. Opened from a service page's "Start project" it
 * comes up in that planet's colour with the service picked and its own
 * questions asked. The draft survives closing the panel.
 */
export default function ContactForm() {
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const screenRef = useRef<HTMLDivElement>(null);
  const bootRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const resultRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);
  const skipRef = useRef<() => void>(() => {});
  const sentRef = useRef(false);
  /** When this draft was first opened; the server checks the time taken. */
  const startedRef = useRef(0);

  const [open, setOpen] = useState(false);
  const [focusSlug, setFocusSlug] = useState<string | null>(null);
  const [missionId, setMissionId] = useState("");
  const [phase, setPhase] = useState<Phase>("form");
  const [logStep, setLogStep] = useState(0);
  const [fields, setFields] = useState<Fields>({ name: "", email: "", message: "" });
  const [selected, setSelected] = useState<string[]>([]);
  const [budget, setBudget] = useState("");
  const [answers, setAnswers] = useState<Answers>({});
  const [error, setError] = useState<{ field: keyof Fields | null; text: string } | null>(null);
  const [brief, setBrief] = useState<Brief | null>(null);
  const [outcome, setOutcome] = useState<Outcome | null>(null);
  const [copied, setCopied] = useState(false);

  const focusService = focusSlug ? getServiceBySlug(focusSlug) : undefined;
  const phosphor = focusService?.visual.color ?? BRAND;
  const tag = focusService
    ? `${pad(focusService.index)} // ${focusService.shortName} · New mission`
    : "Mission control";

  useEffect(() => {
    const sync = (next: boolean) => {
      setOpen(next);
      if (!next) return;
      // A finished transmission starts the next opening on a clean form;
      // anything else is a draft and stays.
      if (sentRef.current) {
        sentRef.current = false;
        setPhase("form");
        setFields({ name: "", email: "", message: "" });
        setSelected([]);
        setBudget("");
        setAnswers({});
        setBrief(null);
        setOutcome(null);
        startedRef.current = 0;
      }
      if (!startedRef.current) startedRef.current = Date.now();
      const slug = contactService();
      setFocusSlug(slug);
      setMissionId(newMissionId());
      setError(null);
      setCopied(false);
      if (slug) setSelected((s) => (s.includes(slug) ? s : [...s, slug]));
    };
    sync(isContactOpen());
    return subscribeContactPanel(sync);
  }, []);

  useEffect(() => {
    if (!open) {
      previousFocusRef.current?.focus();
      previousFocusRef.current = null;
      return;
    }

    previousFocusRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    closeButtonRef.current?.focus();
    scrollRef.current?.scrollTo({ top: 0 });

    const onKeyDown = (e: globalThis.KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        closeContactPanel();
        return;
      }

      if (e.key !== "Tab") return;

      const panel = panelRef.current;
      if (!panel) return;

      const focusable = Array.from(
        panel.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])',
        ),
      ).filter((el) => !el.hasAttribute("disabled") && el.getAttribute("aria-hidden") !== "true");

      if (focusable.length === 0) {
        e.preventDefault();
        panel.focus();
        return;
      }

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const active = document.activeElement;

      if (e.shiftKey && active === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && active === last) {
        e.preventDefault();
        first.focus();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open]);

  // Boot readout, typed by the journey's engine on its own rAF loop (the
  // scene's frame loop may be paused behind the panel).
  useEffect(() => {
    const body = bootRef.current;
    const screen = screenRef.current;
    if (!open || !body || !screen) return;

    const cursor = document.createElement("span");
    cursor.className = "terminal-cursor";
    cursor.setAttribute("aria-hidden", "true");
    const typer = new TerminalTyper(body, cursor, (p) => screen.setAttribute("data-phase", p), () => null);
    typer.load(bootLines(focusSlug ? getServiceBySlug(focusSlug) : undefined), prefersReducedMotion());
    skipRef.current = () => typer.skip();

    let raf = 0;
    let last = performance.now();
    const tick = (now: number) => {
      typer.advance(Math.min(now - last, 250));
      last = now;
      if (typer.phase !== "done") raf = requestAnimationFrame(tick);
    };
    if (typer.phase !== "done") raf = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(raf);
      skipRef.current = () => {};
    };
  }, [open, focusSlug]);

  // Transmission log: one line per beat, holding on UPLINKING until the
  // server answers, then the result.
  useEffect(() => {
    if (phase !== "sending") return;
    if (logStep === 2 && !outcome) return;
    const t = window.setTimeout(
      () => {
        if (logStep < 2) {
          setLogStep((s) => s + 1);
        } else if (outcome?.via === "invalid") {
          // The server disagreed with the browser's checks: back to the field
          const field = outcome.field;
          setPhase("form");
          setError({ field, text: FIELD_ERRORS[field] });
          requestAnimationFrame(() => {
            panelRef.current?.querySelector<HTMLElement>(`[name="${field}"]`)?.focus();
          });
        } else if (outcome?.via === "error") {
          setPhase("error");
        } else if (logStep < 3) {
          setLogStep(3);
        } else {
          sentRef.current = true;
          setPhase("sent");
        }
      },
      prefersReducedMotion() ? 0 : LOG_STEP_MS,
    );
    return () => window.clearTimeout(t);
  }, [phase, logStep, outcome]);

  useEffect(() => {
    if (phase === "sent" || phase === "error") resultRef.current?.focus();
  }, [phase]);

  const setField = (key: keyof Fields, value: string) => {
    setFields((f) => ({ ...f, [key]: value }));
    if (error?.field === key) setError(null);
  };

  const toggleService = (slug: string) => {
    setSelected((s) => (s.includes(slug) ? s.filter((x) => x !== slug) : [...s, slug]));
    if (error?.field === "message") setError(null);
  };

  const setAnswer = (key: string, question: BriefQuestion, option: string) => {
    setAnswers((a) => {
      const current = a[key];
      if (question.kind === "multi") {
        const list = Array.isArray(current) ? current : [];
        return { ...a, [key]: list.includes(option) ? list.filter((x) => x !== option) : [...list, option] };
      }
      return { ...a, [key]: current === option ? "" : option };
    });
  };

  const fail = (field: keyof Fields, text: string) => {
    setError({ field, text });
    panelRef.current?.querySelector<HTMLElement>(`[name="${field}"]`)?.focus();
  };

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (phase === "sending") return;
    const emailInput = e.currentTarget.elements.namedItem("email") as HTMLInputElement | null;

    if (!fields.name.trim()) return fail("name", FIELD_ERRORS.name);
    if (!fields.email.trim() || (emailInput && !emailInput.checkValidity())) {
      return fail("email", FIELD_ERRORS.email);
    }
    if (!fields.message.trim() && selected.length === 0) {
      return fail("message", FIELD_ERRORS.message);
    }

    playGlassClick();
    setError(null);
    const input: BriefInput = {
      missionId,
      name: fields.name,
      email: fields.email,
      message: fields.message,
      services: selected,
      budget,
      answers,
      focus: focusSlug ?? undefined,
      page: window.location.href,
    };
    const next = composeBrief(input);
    setBrief(next);
    setOutcome(null);
    setLogStep(0);
    setPhase("sending");

    const trap = e.currentTarget.elements.namedItem("callsign") as HTMLInputElement | null;
    const result = await transmit(input, next, {
      callsign: trap?.value ?? "",
      elapsed: Date.now() - startedRef.current,
    });
    setOutcome(result);
    trackEvent("contact_submit", {
      method: result.via === "mailto" ? "mailto" : "api",
      result: result.via === "error" ? result.reason : result.via === "invalid" ? "invalid" : "ok",
      service_slug: focusSlug ?? undefined,
      services: selected.length,
      budget: budget || undefined,
      has_message: fields.message.trim().length > 0,
    });
  }

  const onFieldEnter = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key !== "Enter") return;
    // Enter walks to the next field instead of firing the whole form.
    e.preventDefault();
    const inputs = Array.from(
      panelRef.current?.querySelectorAll<HTMLElement>(".contact-input") ?? [],
    );
    inputs[inputs.indexOf(e.currentTarget) + 1]?.focus();
  };

  const copyBrief = async () => {
    if (!brief) return;
    try {
      await navigator.clipboard.writeText(`${brief.subject}\n\n${brief.text}`);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  };

  const questions = activeQuestions(selected);
  const showForm = phase === "form" || phase === "error";
  const whatsappBrief = brief
    ? `${whatsappHref}?text=${encodeURIComponent(`${brief.subject}\n\n${brief.text}`)}`
    : whatsappHref;
  const mailBrief = brief
    ? `mailto:${contactEmail}?subject=${encodeURIComponent(brief.subject)}&body=${encodeURIComponent(brief.text)}`
    : `mailto:${contactEmail}`;
  const rateLimited = outcome?.via === "error" && outcome.reason === "rate";
  const handedOff = outcome?.via === "mailto";

  return (
    <section
      id="contact"
      className={`contact-section${open ? " contact-section-open" : ""}`}
      aria-hidden={!open}
      inert={!open}
      onWheel={(e) => e.stopPropagation()}
      onTouchMove={(e) => e.stopPropagation()}
    >
      <div
        ref={panelRef}
        className="terminal-bezel contact-term"
        role="dialog"
        aria-modal="true"
        aria-labelledby="contact-heading"
        aria-describedby="contact-lede"
        tabIndex={-1}
        style={{ "--phosphor": phosphor } as CSSProperties}
      >
        <div ref={screenRef} className="terminal-screen contact-screen" data-phase="done">
          <span className="terminal-roll" aria-hidden="true" />
          <div className="terminal-header contact-header">
            <h2 id="contact-heading" className="terminal-tag">
              {tag}
            </h2>
            <span className="terminal-sysid" aria-label="Mission number">
              {missionId}
            </span>
            <button
              ref={closeButtonRef}
              type="button"
              className="contact-close"
              onMouseEnter={() => playGlassHover()}
              onClick={() => {
                playGlassClick();
                closeContactPanel();
              }}
              aria-label="Close"
            >
              ✕
            </button>
          </div>

          <div ref={scrollRef} className="contact-scroll">
            <div ref={bootRef} className="terminal-body contact-boot" aria-hidden="true" onClick={() => skipRef.current()} />
            <p id="contact-lede" className="sr-only">
              {focusService
                ? `Start a ${focusService.name} project. A few quick questions and we'll reply within 1 business day.`
                : "Tell us the space you're trying to own. We reply within 1 business day."}
            </p>

            {phase === "error" && (
              <div ref={resultRef} className="contact-result is-error" role="alert" tabIndex={-1}>
                <p className="contact-log-line contact-log-err">
                  {rateLimited ? "[ERR] CHANNEL BUSY" : "[ERR] SIGNAL LOST"}
                </p>
                <p className="contact-result-copy">
                  {rateLimited
                    ? "Too many transmissions from this connection. Give it a little while, or reach us directly:"
                    : "The link dropped before your brief got through. Nothing’s lost, it’s all still below. Try again, or reach us directly:"}
                </p>
                <div className="contact-fallback">
                  <a className="contact-chip" href={mailBrief}>Email</a>
                  <a className="contact-chip" href={contactPhoneHref}>Call</a>
                  <a className="contact-chip" href={whatsappBrief} target="_blank" rel="noopener noreferrer">WhatsApp</a>
                </div>
              </div>
            )}

            {showForm ? (
              <form className="contact-form" onSubmit={handleSubmit} noValidate>
                <label className={`contact-field${error?.field === "name" ? " is-invalid" : ""}`}>
                  <span className="contact-prompt">Name &gt;</span>
                  <input
                    className="contact-input"
                    type="text"
                    name="name"
                    value={fields.name}
                    onChange={(e) => setField("name", e.target.value)}
                    onKeyDown={onFieldEnter}
                    autoComplete="name"
                    autoCapitalize="words"
                    enterKeyHint="next"
                    maxLength={BRIEF_LIMITS.name}
                    required
                    aria-invalid={error?.field === "name"}
                  />
                </label>
                <label className={`contact-field${error?.field === "email" ? " is-invalid" : ""}`}>
                  <span className="contact-prompt">Email &gt;</span>
                  <input
                    className="contact-input"
                    type="email"
                    name="email"
                    value={fields.email}
                    onChange={(e) => setField("email", e.target.value)}
                    onKeyDown={onFieldEnter}
                    autoComplete="email"
                    inputMode="email"
                    autoCapitalize="off"
                    spellCheck={false}
                    enterKeyHint="next"
                    maxLength={BRIEF_LIMITS.email}
                    required
                    aria-invalid={error?.field === "email"}
                  />
                </label>
                {/* Bot trap: hidden from people and screen readers, bots fill it in */}
                <div className="contact-trap" aria-hidden="true">
                  <label>
                    Leave this empty
                    <input type="text" name="callsign" tabIndex={-1} autoComplete="off" defaultValue="" />
                  </label>
                </div>

                <div className="contact-q" role="group" aria-labelledby="contact-q-services">
                  <span id="contact-q-services" className="contact-prompt">
                    Services &gt; <span className="contact-hint">pick any</span>
                  </span>
                  <div className="contact-chips">
                    {services.map((s) => (
                      <Chip
                        key={s.slug}
                        label={s.shortName}
                        color={s.visual.color}
                        pressed={selected.includes(s.slug)}
                        onToggle={() => toggleService(s.slug)}
                      />
                    ))}
                  </div>
                </div>

                {questions.map(({ service, question }) => {
                  const key = `${service.slug}.${question.id}`;
                  const labelId = `contact-q-${key.replace(/\W/g, "-")}`;
                  const value = answers[key];
                  return (
                    <div
                      key={key}
                      className="contact-q contact-q-service"
                      role={question.kind === "text" ? undefined : "group"}
                      aria-labelledby={question.kind === "text" ? undefined : labelId}
                      style={{ "--chip": service.visual.color } as CSSProperties}
                    >
                      {question.kind === "text" ? (
                        <label className="contact-field">
                          <span id={labelId} className="contact-prompt">
                            {selected.length > 1 ? <span className="contact-q-tag">{service.shortName} · </span> : null}
                            {question.label} &gt;
                          </span>
                          <input
                            className="contact-input"
                            type="text"
                            name={key}
                            value={typeof value === "string" ? value : ""}
                            placeholder={question.placeholder}
                            onChange={(e) => setAnswers((a) => ({ ...a, [key]: e.target.value }))}
                            onKeyDown={onFieldEnter}
                            inputMode={question.url ? "url" : "text"}
                            autoComplete={question.url ? "url" : "off"}
                            autoCapitalize="off"
                            spellCheck={false}
                            enterKeyHint="next"
                            maxLength={BRIEF_LIMITS.answer}
                          />
                        </label>
                      ) : (
                        <>
                          <span id={labelId} className="contact-prompt">
                            {selected.length > 1 ? <span className="contact-q-tag">{service.shortName} · </span> : null}
                            {question.label} &gt;
                            {question.kind === "multi" ? <span className="contact-hint"> pick any</span> : null}
                          </span>
                          <div className="contact-chips">
                            {question.options.map((option) => (
                              <Chip
                                key={option}
                                label={option}
                                color={service.visual.color}
                                pressed={Array.isArray(value) ? value.includes(option) : value === option}
                                onToggle={() => setAnswer(key, question, option)}
                              />
                            ))}
                          </div>
                        </>
                      )}
                    </div>
                  );
                })}

                <div className="contact-q" role="group" aria-labelledby="contact-q-budget">
                  <span id="contact-q-budget" className="contact-prompt">
                    Budget &gt; <span className="contact-hint">optional</span>
                  </span>
                  <div className="contact-chips">
                    {BUDGET_OPTIONS.map((option) => (
                      <Chip
                        key={option}
                        label={option}
                        pressed={budget === option}
                        onToggle={() => setBudget((b) => (b === option ? "" : option))}
                      />
                    ))}
                  </div>
                </div>

                <label className={`contact-field contact-field-block${error?.field === "message" ? " is-invalid" : ""}`}>
                  <span className="contact-prompt">Message &gt;</span>
                  <textarea
                    className="contact-input contact-textarea"
                    name="message"
                    rows={4}
                    value={fields.message}
                    onChange={(e) => setField("message", e.target.value)}
                    placeholder="Where are you headed? Timeline, goals, what success looks like."
                    maxLength={BRIEF_LIMITS.message}
                    aria-invalid={error?.field === "message"}
                  />
                </label>

                <div className="contact-dock">
                  <p className="contact-status" role="status" aria-live="polite">
                    {error?.text ?? ""}
                  </p>
                  <button
                    type="submit"
                    className="terminal-action is-primary contact-transmit"
                    onMouseEnter={() => playGlassHover()}
                  >
                    <span className="terminal-action-mark" aria-hidden="true">▸</span>
                    <span className="terminal-action-label">{phase === "error" ? "Retry transmit" : "Transmit"}</span>
                    <span className="terminal-action-arrow" aria-hidden="true">→</span>
                  </button>
                </div>
              </form>
            ) : (
              <div className="contact-log" role="status" aria-live="polite">
                <p className="contact-log-line">&gt; transmit --mission {brief?.missionId}</p>
                {logStep >= 1 && <p className="contact-log-line">ENCRYPTING…</p>}
                {logStep >= 2 && <p className="contact-log-line">UPLINKING…</p>}
                {logStep >= 3 && (
                  <p className="contact-log-line contact-log-ok">
                    {handedOff ? "[OK] TRANSMISSION READY" : "[OK] TRANSMISSION RECEIVED"}
                  </p>
                )}
                {phase === "sent" && handedOff && (
                  <div ref={resultRef} className="contact-result" tabIndex={-1}>
                    <p className="contact-result-hi">Over to your mail app.</p>
                    <p className="contact-result-copy">
                      Your brief for mission {brief?.missionId} is loaded into an email. Hit send there and
                      we&rsquo;ll reply within 1 business day.
                    </p>
                    <p className="contact-result-copy contact-result-dim">Mail app didn&rsquo;t open?</p>
                    <div className="contact-fallback">
                      <a className="contact-chip" href={whatsappBrief} target="_blank" rel="noopener noreferrer">
                        Send on WhatsApp
                      </a>
                      <button type="button" className="contact-chip" aria-pressed={copied} onClick={copyBrief}>
                        {copied ? "Brief copied" : "Copy brief"}
                      </button>
                      <a className="contact-chip" href={`mailto:${contactEmail}`}>
                        {contactEmail}
                      </a>
                    </div>
                  </div>
                )}
                {phase === "sent" && !handedOff && (
                  <div ref={resultRef} className="contact-result" tabIndex={-1}>
                    <p className="contact-result-hi">Brief received.</p>
                    <p className="contact-result-copy">
                      Mission {brief?.missionId} is with the team. We&rsquo;ll reply to {fields.email.trim()} within
                      1 business day.
                    </p>
                    {outcome?.via === "api" && outcome.confirmation ? (
                      <p className="contact-result-copy contact-result-dim">
                        A confirmation is on its way to your inbox. Not there? Check spam.
                      </p>
                    ) : null}
                    <div className="contact-fallback">
                      <a className="contact-chip" href={whatsappBrief} target="_blank" rel="noopener noreferrer">
                        Follow up on WhatsApp
                      </a>
                    </div>
                  </div>
                )}
              </div>
            )}

            <nav className="contact-channels" aria-label="Other ways to reach Verve">
              <span className="contact-prompt">Channels &gt;</span>
              <div className="contact-channel-row">
                {CHANNELS.map((c) => (
                  <a
                    key={c.id}
                    className="contact-channel"
                    href={c.href}
                    aria-label={c.label}
                    title={c.label}
                    {...(c.external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
                    onMouseEnter={() => playGlassHover()}
                    onClick={() => trackEvent("contact_channel", { channel: c.id })}
                  >
                    <ChannelIcon id={c.id} />
                  </a>
                ))}
              </div>
            </nav>

            <div className="contact-legal">
              <p>
                By transmitting, you agree that Verve may use your details to respond to your inquiry. See our{" "}
                <Link href="/privacy" onClick={() => closeContactPanel()}>Privacy Policy</Link> and{" "}
                <Link href="/terms" onClick={() => closeContactPanel()}>Terms of Use</Link>.
              </p>
              <p>{copyrightNotice}</p>
            </div>
          </div>
        </div>
        <div className="terminal-plate" aria-hidden="true">
          <span className="terminal-led" />
        </div>
      </div>
    </section>
  );
}
