import { after } from "next/server";
import nodemailer, { type Transporter } from "nodemailer";
import { getServiceBySlug } from "@/data/services";
import { BUDGET_OPTIONS, newMissionId } from "@/data/missionBriefs";
import {
  BRIEF_LIMITS,
  EMAIL_PATTERN,
  activeQuestions,
  composeBrief,
  isPhone,
  type Answers,
  type BriefInput,
} from "@/lib/missionBrief";
import { siteName } from "@/lib/seo";

/**
 * The contact terminal's uplink. Sends the brief to CONTACT_TO with
 * Reply-To set to the visitor, then a short "transmission received" note
 * back to them (CONTACT_CONFIRM=off turns that off).
 *
 * Spam guards, none of which a real visitor sees: a hidden field only bots
 * fill in, a minimum time on the form, and a few transmissions per IP an
 * hour. Tripping the first two gets a fake success, so there's nothing to
 * tune against.
 */

/** Requests larger than this aren't a contact form. */
const MAX_BODY = 20_000;
/** Faster than this from first opening the form, it wasn't typed. */
const MIN_FILL_MS = 3_000;
const RATE_WINDOW_MS = 60 * 60 * 1000;
const RATE_LIMIT = 5;
/** Shared bucket for requests that arrive without a client IP. */
const RATE_LIMIT_UNKNOWN = 30;
const MISSION_PATTERN = /^MSN-\d{4}-\d{3}$/;

type Failure = { status: number; error: "invalid" | "rate" | "unavailable" | "failed"; field?: string };

const json = (body: object, status = 200) => Response.json(body, { status });
const failure = ({ status, ...body }: Failure) => json({ ok: false, ...body }, status);

// ---- Rate limit (per server process; enough for a single Node instance) ----

const hits = new Map<string, number[]>();

function rateLimited(ip: string | null): boolean {
  const now = Date.now();
  const key = ip ?? "unknown";
  const recent = (hits.get(key) ?? []).filter((t) => now - t < RATE_WINDOW_MS);
  if (recent.length >= (ip ? RATE_LIMIT : RATE_LIMIT_UNKNOWN)) {
    hits.set(key, recent);
    return true;
  }
  recent.push(now);
  hits.set(key, recent);

  if (hits.size > 2000) {
    for (const [k, times] of hits) {
      if (times.every((t) => now - t >= RATE_WINDOW_MS)) hits.delete(k);
    }
  }
  return false;
}

function clientIp(request: Request): string | null {
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return forwarded || request.headers.get("x-real-ip")?.trim() || null;
}

// ---- Input ----

/** One line of text: no control characters, collapsed, capped. */
function line(value: unknown, max: number): string {
  if (typeof value !== "string") return "";
  return value.replace(/[\u0000-\u001f\u007f]+/g, " ").replace(/\s+/g, " ").trim().slice(0, max);
}

/** Free text: keeps line breaks, drops other control characters. */
function block(value: unknown, max: number): string {
  if (typeof value !== "string") return "";
  return value
    .replace(/\r\n?/g, "\n")
    .replace(/[\u0000-\u0008\u000b-\u001f\u007f]/g, "")
    .trim()
    .slice(0, max);
}

/** Keeps only answers to questions on screen, and only their real options. */
function cleanAnswers(raw: unknown, selected: string[]): Answers {
  const source = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  const answers: Answers = {};
  for (const { service, question } of activeQuestions(selected)) {
    const key = `${service.slug}.${question.id}`;
    const value = source[key];
    if (question.kind === "text") {
      const text = line(value, BRIEF_LIMITS.answer);
      if (text) answers[key] = text;
    } else if (question.kind === "multi") {
      const picked = Array.isArray(value) ? question.options.filter((o) => value.includes(o)) : [];
      if (picked.length > 0) answers[key] = picked;
    } else if (typeof value === "string" && question.options.includes(value)) {
      answers[key] = value;
    }
  }
  return answers;
}

function parse(body: Record<string, unknown>): BriefInput | Failure {
  const name = line(body.name, BRIEF_LIMITS.name);
  const email = line(body.email, BRIEF_LIMITS.email);
  const phone = line(body.phone, BRIEF_LIMITS.phone);
  const message = block(body.message, BRIEF_LIMITS.message);
  const selected = Array.isArray(body.services)
    ? [...new Set(body.services.filter((s): s is string => typeof s === "string" && !!getServiceBySlug(s)))]
    : [];

  if (!name) return { status: 400, error: "invalid", field: "name" };
  if (!EMAIL_PATTERN.test(email)) return { status: 400, error: "invalid", field: "email" };
  if (phone && !isPhone(phone)) return { status: 400, error: "invalid", field: "phone" };
  if (!message && selected.length === 0) return { status: 400, error: "invalid", field: "message" };

  const missionId = typeof body.missionId === "string" && MISSION_PATTERN.test(body.missionId)
    ? body.missionId
    : newMissionId();
  const budget = typeof body.budget === "string" && BUDGET_OPTIONS.includes(body.budget) ? body.budget : "";
  const focus = typeof body.focus === "string" && getServiceBySlug(body.focus) ? body.focus : undefined;
  const page = line(body.page, BRIEF_LIMITS.page);

  return {
    missionId,
    name,
    email,
    phone,
    message,
    services: selected,
    budget,
    answers: cleanAnswers(body.answers, selected),
    focus,
    page: /^https?:\/\//.test(page) ? page : undefined,
  };
}

// ---- Mail ----

let transporter: Transporter | null = null;

function mailer(): { transport: Transporter; from: string; to: string } | null {
  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, CONTACT_TO } = process.env;
  if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS) return null;
  const port = Number(SMTP_PORT) || 465;
  transporter ??= nodemailer.createTransport({
    host: SMTP_HOST,
    port,
    secure: port === 465,
    auth: { user: SMTP_USER, pass: SMTP_PASS },
    connectionTimeout: 10_000,
    greetingTimeout: 10_000,
    socketTimeout: 20_000,
  });
  return { transport: transporter, from: SMTP_USER, to: CONTACT_TO || SMTP_USER };
}

const escapeHtml = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/**
 * The visitor's copy. Deliberately echoes nothing they typed beyond a
 * first name, so the form can't be used to mail arbitrary text to a
 * stranger's address.
 */
function confirmation(input: BriefInput) {
  // Only a plain name gets through, never a link or a message
  const given = input.name.split(" ")[0];
  const first = /^[\p{L}\p{M}'’-]{1,30}$/u.test(given) ? given : "there";
  const picked = input.services.map((s) => getServiceBySlug(s)?.name).filter(Boolean).join(", ");
  const subject = `Transmission received · ${input.missionId}`;
  const lines = [
    `Hi ${first},`,
    "",
    `Your brief reached ${siteName} mission control. We'll reply within 1 business day.`,
    "",
    `Mission: ${input.missionId}`,
    ...(picked ? [`Services: ${picked}`] : []),
    "",
    "Anything to add? Just reply to this email.",
    "",
    `${siteName} · https://verve-marketing.space`,
  ];
  const html = `<div style="font-family:ui-monospace,Consolas,monospace;font-size:14px;line-height:1.5;color:#111">
<p>Hi ${escapeHtml(first)},</p>
<p>Your brief reached ${siteName} mission control. We&rsquo;ll reply within 1 business day.</p>
<p style="padding:10px 14px;border-left:3px solid #cdf757;background:#f6f8f0">
Mission: <strong>${escapeHtml(input.missionId)}</strong>${picked ? `<br>Services: ${escapeHtml(picked)}` : ""}</p>
<p>Anything to add? Just reply to this email.</p>
<p style="color:#666">${siteName} · <a href="https://verve-marketing.space" style="color:#4a6b00">verve-marketing.space</a></p>
</div>`;
  return { subject, text: lines.join("\n"), html };
}

// ---- Handler ----

export async function POST(request: Request) {
  const raw = await request.text().catch(() => "");
  if (!raw || raw.length > MAX_BODY) return failure({ status: 400, error: "invalid" });

  let body: Record<string, unknown>;
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new Error("not an object");
    body = parsed as Record<string, unknown>;
  } catch {
    return failure({ status: 400, error: "invalid" });
  }

  // Bots: a filled trap field, or a form "filled in" faster than a person could
  const elapsed = typeof body.elapsed === "number" ? body.elapsed : 0;
  if (line(body.callsign, 200) || elapsed < MIN_FILL_MS) {
    return json({ ok: true, confirmation: false });
  }

  if (rateLimited(clientIp(request))) return failure({ status: 429, error: "rate" });

  const input = parse(body);
  if ("error" in input) return failure(input);

  const mail = mailer();
  if (!mail) {
    console.error("[contact] SMTP is not configured (SMTP_HOST, SMTP_USER, SMTP_PASS)");
    return failure({ status: 503, error: "unavailable" });
  }

  const brief = composeBrief(input);
  try {
    await mail.transport.sendMail({
      from: { name: `${siteName} Mission Control`, address: mail.from },
      to: mail.to,
      replyTo: { name: input.name, address: input.email },
      subject: brief.subject,
      text: brief.text,
    });
  } catch (err) {
    console.error(`[contact] ${input.missionId} failed to send`, err);
    return failure({ status: 502, error: "failed" });
  }

  const confirm = process.env.CONTACT_CONFIRM !== "off";
  if (confirm) {
    // After the response: the visitor doesn't wait on their own copy
    after(async () => {
      const note = confirmation(input);
      try {
        await mail.transport.sendMail({
          from: { name: siteName, address: mail.from },
          to: { name: input.name, address: input.email },
          replyTo: mail.to,
          ...note,
        });
      } catch (err) {
        console.error(`[contact] ${input.missionId} confirmation failed`, err);
      }
    });
  }

  return json({ ok: true, confirmation: confirm });
}
