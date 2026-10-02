/**
 * The contact terminal's questions. Every visitor gets the service chips
 * and the budget row; "Start project" on a service page also asks that
 * service's own questions. All of these are optional, so a visitor who
 * just wants to say hello is never blocked by them.
 */
export type BriefQuestion =
  | {
      id: string;
      /** Prompt label, rendered as "LABEL >". */
      label: string;
      kind: "single" | "multi";
      options: string[];
    }
  | {
      id: string;
      label: string;
      kind: "text";
      placeholder: string;
      url?: boolean;
    };

export const BUDGET_OPTIONS = ["< $1k", "$1–5k", "$5–15k", "$15k+", "Not sure"];

export const SERVICE_QUESTIONS: Record<string, BriefQuestion[]> = {
  "branding-strategy": [
    { id: "stage", label: "Stage", kind: "single", options: ["New brand", "Rebrand", "Refresh"] },
    { id: "logo", label: "Have a logo?", kind: "single", options: ["Yes", "Needs work", "No"] },
  ],
  "ui-ux-design": [
    { id: "stage", label: "Starting from", kind: "single", options: ["Idea", "Live product", "Redesign"] },
    { id: "platform", label: "Platform", kind: "single", options: ["Web", "App", "Both"] },
  ],
  "web-development": [
    { id: "type", label: "Project", kind: "single", options: ["New site", "Redesign", "E-commerce"] },
    { id: "url", label: "Current URL", kind: "text", placeholder: "yoursite.com (if any)", url: true },
  ],
  "mobile-apps": [
    { id: "platform", label: "Platforms", kind: "single", options: ["iOS", "Android", "Both"] },
    { id: "designs", label: "Designs ready?", kind: "single", options: ["Yes", "In progress", "No"] },
  ],
  seo: [
    { id: "url", label: "Website", kind: "text", placeholder: "yoursite.com", url: true },
    { id: "reach", label: "Reach", kind: "single", options: ["Local", "National", "International"] },
  ],
  "digital-marketing": [
    {
      id: "channels",
      label: "Channels",
      kind: "multi",
      options: ["Social", "Content", "Influencer", "Video", "Community"],
    },
  ],
  "paid-advertising": [
    {
      id: "platforms",
      label: "Platforms",
      kind: "multi",
      options: ["Meta", "Google", "TikTok", "LinkedIn", "Snapchat"],
    },
    { id: "spend", label: "Monthly ad spend", kind: "single", options: ["< $1k", "$1–5k", "$5–20k", "$20k+"] },
  ],
  "email-marketing": [
    { id: "platform", label: "Current platform", kind: "text", placeholder: "Klaviyo, Mailchimp, none…" },
    { id: "list", label: "List size", kind: "single", options: ["< 1k", "1–10k", "10–50k", "50k+"] },
  ],
  "cloud-devops-infrastructure": [
    { id: "host", label: "Current host", kind: "text", placeholder: "AWS, Vercel, shared hosting…" },
    { id: "need", label: "Need", kind: "single", options: ["Migration", "New setup", "Support"] },
  ],
};

/** A fresh mission number, e.g. MSN-2610-047 (year, month, then random). */
export function newMissionId(date = new Date()): string {
  const yy = String(date.getFullYear()).slice(-2);
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const n = String(Math.floor(Math.random() * 1000)).padStart(3, "0");
  return `MSN-${yy}${mm}-${n}`;
}
