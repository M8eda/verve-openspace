"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type FormEvent } from "react";
import {
  isContactOpen,
  closeContactPanel,
  subscribeContactPanel,
} from "@/lib/contactPanel";
import { playGlassHover, playGlassClick } from "@/lib/audio";
import { trackEvent } from "@/lib/analytics";
import { contactEmail, contactPhoneDisplay, contactPhoneHref, copyrightNotice } from "@/lib/seo";

export default function ContactForm() {
  const formRef = useRef<HTMLFormElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);
  const [sent, setSent] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    setOpen(isContactOpen());
    return subscribeContactPanel(setOpen);
  }, []);

  useEffect(() => {
    if (!open) {
      previousFocusRef.current?.focus();
      previousFocusRef.current = null;
      return;
    }

    setSent(false);
    previousFocusRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    closeButtonRef.current?.focus();

    const onKeyDown = (e: KeyboardEvent) => {
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

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    const name = (data.get("name") as string).trim();
    const email = (data.get("email") as string).trim();
    const message = (data.get("message") as string).trim();

    const subject = encodeURIComponent(`New inquiry from ${name || "the website"}`);
    const body = encodeURIComponent(
      `Name: ${name}\nEmail: ${email}\n\n${message}`,
    );

    trackEvent("contact_submit", {
      method: "mailto",
      has_message: message.length > 0,
    });
    window.location.href = `mailto:${contactEmail}?subject=${subject}&body=${body}`;
    setSent(true);
  }

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
        className="contact-glass"
        role="dialog"
        aria-modal="true"
        aria-labelledby="contact-heading"
        aria-describedby="contact-lede"
        tabIndex={-1}
      >
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
        <span className="contact-eyebrow">MISSION CONTROL</span>
        <h2 id="contact-heading" className="contact-heading">Not sure where to start?</h2>
        <p id="contact-lede" className="contact-lede">
          Tell us the space you&rsquo;re trying to own. We&rsquo;ll map the fastest path,
          and the exact forces that&rsquo;ll move the needle first.
        </p>
        <p className="contact-direct">
          Prefer direct contact? Email{" "}
          <a href={`mailto:${contactEmail}`}>{contactEmail}</a> or call{" "}
          <a href={contactPhoneHref}>{contactPhoneDisplay}</a>.
        </p>

        {sent ? (
          <div className="contact-thanks" role="status" aria-live="polite">
            <p>Thanks for reaching out. Your email client should have opened. If it didn&rsquo;t, reach us directly at{" "}
              <a href={`mailto:${contactEmail}`}>{contactEmail}</a> or{" "}
              <a href={contactPhoneHref}>{contactPhoneDisplay}</a>.
            </p>
          </div>
        ) : (
          <form ref={formRef} className="contact-form" onSubmit={handleSubmit}>
            <div className="contact-row">
              <label className="contact-label">
                <span>Name</span>
                <input
                  type="text"
                  name="name"
                  required
                  autoComplete="name"
                  className="contact-input"
                  onFocus={() => playGlassHover()}
                />
              </label>
              <label className="contact-label">
                <span>Email</span>
                <input
                  type="email"
                  name="email"
                  required
                  autoComplete="email"
                  className="contact-input"
                  onFocus={() => playGlassHover()}
                />
              </label>
            </div>
            <label className="contact-label">
              <span>What are you working on?</span>
              <textarea
                name="message"
                required
                rows={5}
                className="contact-textarea"
                placeholder="Tell us about your project, timeline, and what success looks like."
                onFocus={() => playGlassHover()}
              />
            </label>
            <button
              type="submit"
              className="contact-submit"
              onMouseEnter={() => playGlassHover()}
              onClick={() => playGlassClick()}
            >
              Book consultation
            </button>
          </form>
        )}

        <div className="contact-legal">
          <p>
            By submitting, you agree that Verve may use your details to respond
            to your inquiry. See our{" "}
            <Link href="/privacy" onClick={() => closeContactPanel()}>Privacy Policy</Link> and{" "}
            <Link href="/terms" onClick={() => closeContactPanel()}>Terms of Use</Link>.
          </p>
          <p>{copyrightNotice}</p>
        </div>
      </div>
    </section>
  );
}
