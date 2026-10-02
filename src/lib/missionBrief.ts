import { services, getServiceBySlug, type Service } from "@/data/services";
import { SERVICE_QUESTIONS, type BriefQuestion } from "@/data/missionBriefs";

export type Answers = Record<string, string | string[]>;

/** What the contact terminal sends to /api/contact. */
export type BriefInput = {
  missionId: string;
  name: string;
  email: string;
  message: string;
  /** Service slugs, in any order. */
  services: string[];
  budget: string;
  /** Keyed "<service slug>.<question id>". */
  answers: Answers;
  /** The service page the terminal was opened from, if any. */
  focus?: string;
  /** Where the visitor was when they sent it. */
  page?: string;
};

export type Brief = {
  missionId: string;
  subject: string;
  text: string;
};

/** Shared by the inputs' maxLength and the server's checks. */
export const BRIEF_LIMITS = {
  name: 100,
  email: 254,
  message: 5000,
  answer: 200,
  page: 500,
};

export const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function answerText(value: string | string[] | undefined): string {
  if (!value) return "";
  return Array.isArray(value) ? value.join(", ") : value.trim();
}

/** The questions on screen: every selected service's own, in planet order. */
export function activeQuestions(selected: string[]): { service: Service; question: BriefQuestion }[] {
  return services
    .filter((s) => selected.includes(s.slug))
    .flatMap((s) => (SERVICE_QUESTIONS[s.slug] ?? []).map((question) => ({ service: s, question })));
}

/** The brief as it lands in the inbox (and in the WhatsApp/copy fallbacks). */
export function composeBrief(input: BriefInput): Brief {
  const name = input.name.trim();
  const focus = input.focus ? getServiceBySlug(input.focus) : undefined;
  const picked = services.filter((s) => input.services.includes(s.slug));
  const subjectTag = focus
    ? `[${focus.shortName}] `
    : picked.length > 0 && picked.length <= 2
      ? `[${picked.map((s) => s.shortName).join(" + ")}] `
      : "";

  const lines = [`Mission: ${input.missionId}`, `Name: ${name}`, `Email: ${input.email.trim()}`];
  if (picked.length > 0) lines.push(`Services: ${picked.map((s) => s.shortName).join(", ")}`);
  if (input.budget) lines.push(`Budget: ${input.budget}`);
  for (const { service, question } of activeQuestions(input.services)) {
    const value = answerText(input.answers[`${service.slug}.${question.id}`]);
    if (value) lines.push(`${service.shortName} · ${question.label}: ${value}`);
  }
  const message = input.message.trim();
  if (message) lines.push("", message);
  if (input.page) lines.push("", `Sent from ${input.page}`);

  return {
    missionId: input.missionId,
    subject: `${subjectTag}New mission from ${name} · ${input.missionId}`,
    text: lines.join("\n"),
  };
}
