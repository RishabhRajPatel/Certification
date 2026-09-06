// Shared constants + typed status unions (enum-free for DB portability).

export const INTERN_STATUS = ["UPCOMING", "ACTIVE", "COMPLETED", "TERMINATED"] as const;
export type InternStatus = (typeof INTERN_STATUS)[number];

export const OFFER_STATUS = ["DRAFT", "GENERATED", "SENT", "VOID"] as const;
export type OfferStatus = (typeof OFFER_STATUS)[number];

export const COMPENSATION_TYPE = ["UNPAID", "FIXED", "PERFORMANCE"] as const;
export type CompensationType = (typeof COMPENSATION_TYPE)[number];

export const COMPENSATION_TYPE_META: Record<
  CompensationType,
  { label: string; description: string; recommended?: boolean }
> = {
  UNPAID: { label: "Unpaid", description: "No fixed monthly stipend." },
  FIXED: { label: "Fixed Stipend", description: "A guaranteed monthly amount." },
  PERFORMANCE: {
    label: "Performance-Based",
    description: "Determined by performance, targets and evaluation criteria.",
    recommended: true,
  },
};

export const EVALUATION_FREQUENCY = ["Monthly", "Quarterly", "Half-Yearly", "Annually"] as const;
export type EvaluationFrequency = (typeof EVALUATION_FREQUENCY)[number];

export const CERTIFICATE_TYPE = ["COMPLETION", "EXCELLENCE", "PARTICIPATION", "APPRECIATION"] as const;
export type CertificateType = (typeof CERTIFICATE_TYPE)[number];
export const CERTIFICATE_TYPE_LABELS: Record<CertificateType, string> = {
  COMPLETION: "Certificate of Completion",
  EXCELLENCE: "Certificate of Excellence",
  PARTICIPATION: "Certificate of Participation",
  APPRECIATION: "Certificate of Appreciation",
};

export const WORK_MODE = ["REMOTE", "ON_SITE", "HYBRID"] as const;
export type WorkMode = (typeof WORK_MODE)[number];
export const WORK_MODE_LABELS: Record<WorkMode, string> = {
  REMOTE: "Remote",
  ON_SITE: "On-site",
  HYBRID: "Hybrid",
};

export const PERFORMANCE_RATING_LABELS: Record<number, string> = {
  1: "Needs Improvement",
  2: "Developing",
  3: "Good",
  4: "Very Good",
  5: "Outstanding",
};

export const OFFER_LETTER_VARIABLES = [
  "candidate_name", "position", "department", "company_name", "joining_date",
  "duration", "stipend", "compensation_type", "compensation_details",
  "authorized_by", "designation", "offer_id", "issue_date",
] as const;

// Mirrors backend DEFAULT_OFFER_LETTER_TEMPLATE (core/constants.py) exactly —
// used for the Settings "Reset to default" button.
export const DEFAULT_OFFER_LETTER_TEMPLATE =
  "Dear {{candidate_name}},\n" +
  "\n" +
  "We are pleased to offer you an internship as {{position}} in the {{department}} " +
  "department at {{company_name}}. Your internship will commence on {{joining_date}} " +
  "and continue for {{duration}}.\n" +
  "\n" +
  "{{compensation_details}}\n" +
  "\n" +
  "We look forward to having you as part of our team.";

/** Mirrors backend services/email.py:render() — {{var}} substitution, leaves
 * unknown placeholders untouched. Used for the offer letter live preview. */
export function renderTemplate(template: string | null | undefined, variables: Record<string, string>): string {
  if (!template) return "";
  return template.replace(/\{\{(\w+)\}\}/g, (match, key) =>
    Object.prototype.hasOwnProperty.call(variables, key) ? variables[key] : match
  );
}

/** Mirrors backend offer_letter_paragraphs() (services/pdf_offer.py) exactly —
 * blank-line-separated blocks become paragraphs, internal whitespace runs
 * (including the double space a blank {{department}} leaves behind) collapse
 * to one. Keeps the live preview pixel-faithful to the generated PDF. */
export function renderOfferLetterParagraphs(template: string | null | undefined, variables: Record<string, string>): string[] {
  const rendered = renderTemplate(template, variables);
  return rendered
    .split(/(?:\r?\n)\s*(?:\r?\n)/)
    .map((block) => block.split(/\s+/).filter(Boolean).join(" "))
    .filter(Boolean);
}

const OFFER_COMPENSATION_TYPE_LABELS: Record<string, string> = {
  UNPAID: "Unpaid",
  FIXED: "Fixed Stipend",
  PERFORMANCE: "Performance-Based",
};

/** Mirrors backend compensation_sentence() (services/pdf_offer.py). */
export function offerCompensationSentence(compensationType: string, stipend?: number): string {
  if (compensationType === "UNPAID") {
    return "This internship is unpaid and does not include a fixed monthly stipend.";
  }
  if (compensationType === "PERFORMANCE") {
    return (
      "Performance-Based Compensation: Any stipend, incentive, or compensation will be " +
      "determined based on the intern's performance, assigned responsibilities, achievement " +
      "of targets, and the Company's evaluation criteria."
    );
  }
  const amount = stipend ? stipend.toLocaleString("en-IN") : "0";
  return `You will receive a monthly stipend of ₹${amount}, subject to applicable company policies.`;
}

/** Builds the full {{variable}} map for the offer letter template preview —
 * mirrors offer_letter_paragraphs() in services/pdf_offer.py. */
export function buildOfferLetterVariables(opts: {
  candidateName: string;
  position: string;
  department?: string;
  companyName: string;
  joiningDate?: string; // already formatted for display
  duration?: string;
  stipend?: number;
  compensationType: string;
  authorizedBy: string;
  designation: string;
  offerId?: string;
  issueDate?: string;
}): Record<string, string> {
  return {
    candidate_name: opts.candidateName || "—",
    position: opts.position || "—",
    department: opts.department || "",
    company_name: opts.companyName,
    joining_date: opts.joiningDate || "—",
    duration: opts.duration || "",
    stipend: opts.stipend ? `₹${opts.stipend.toLocaleString("en-IN")}` : "—",
    compensation_type: OFFER_COMPENSATION_TYPE_LABELS[opts.compensationType] ?? opts.compensationType,
    compensation_details: offerCompensationSentence(opts.compensationType, opts.stipend),
    authorized_by: opts.authorizedBy || "—",
    designation: opts.designation || "—",
    offer_id: opts.offerId || "(generated on save)",
    issue_date: opts.issueDate || "—",
  };
}

/** Mirrors backend default_certificate_text() (services/pdf_certificate.py) —
 * used to live-preview the certificate body as the admin fills the form. */
export function buildDefaultCertificateText(opts: {
  role: string;
  department?: string;
  workMode?: string;
  durationLabel?: string;
  companyName: string;
  performanceRating?: number;
  skills?: string;
  remarks?: string;
}): string {
  const dept = opts.department ? ` in the ${opts.department} department` : "";
  const modeLabel = opts.workMode ? WORK_MODE_LABELS[opts.workMode as WorkMode] : undefined;
  const mode = modeLabel ? ` (${modeLabel})` : "";
  const dur = opts.durationLabel ? ` for a duration of ${opts.durationLabel}` : "";
  const parts = [
    `has successfully completed an internship as a ${opts.role || "—"}${dept} at ${opts.companyName}${mode}${dur}.`,
  ];
  if (opts.performanceRating) {
    const ratingWord = {
      1: "developing",
      2: "satisfactory",
      3: "good",
      4: "very good",
      5: "outstanding",
    }[opts.performanceRating];
    if (ratingWord) {
      parts.push(`Their overall performance during the internship was rated ${ratingWord} (${opts.performanceRating}/5).`);
    }
  }
  if (opts.skills) parts.push(`Key skills demonstrated include ${opts.skills}.`);
  if (opts.remarks) parts.push(opts.remarks);
  return parts.join(" ");
}

export const CERT_STATUS = ["DRAFT", "VALID", "REVOKED"] as const;
export type CertStatus = (typeof CERT_STATUS)[number];

export const INTERN_STATUS_META: Record<
  InternStatus,
  { label: string; dot: string; badge: string }
> = {
  ACTIVE: { label: "Active", dot: "bg-emerald-500", badge: "bg-emerald-50 text-emerald-700 ring-emerald-600/20" },
  COMPLETED: { label: "Completed", dot: "bg-blue-500", badge: "bg-blue-50 text-blue-700 ring-blue-600/20" },
  UPCOMING: { label: "Upcoming", dot: "bg-amber-500", badge: "bg-amber-50 text-amber-700 ring-amber-600/20" },
  TERMINATED: { label: "Terminated", dot: "bg-rose-500", badge: "bg-rose-50 text-rose-700 ring-rose-600/20" },
};

export const DOC_STATUS_META: Record<string, { label: string; badge: string }> = {
  DRAFT: { label: "Draft", badge: "bg-amber-50 text-amber-700 ring-amber-600/20" },
  GENERATED: { label: "Generated", badge: "bg-emerald-50 text-emerald-700 ring-emerald-600/20" },
  SENT: { label: "Sent", badge: "bg-blue-50 text-blue-700 ring-blue-600/20" },
  VOID: { label: "Void", badge: "bg-slate-100 text-slate-600 ring-slate-500/20" },
  VALID: { label: "Valid", badge: "bg-emerald-50 text-emerald-700 ring-emerald-600/20" },
  REVOKED: { label: "Revoked", badge: "bg-rose-50 text-rose-700 ring-rose-600/20" },
  ACTIVE: { label: "Active", badge: "bg-emerald-50 text-emerald-700 ring-emerald-600/20" },
};

export const OFFER_TEMPLATES = [
  { key: "modern", name: "Modern", description: "Clean, spacious layout with a bold header band.", accent: "#4F46E5" },
  { key: "corporate", name: "Corporate", description: "Classic letterhead — formal and trustworthy.", accent: "#1D4ED8" },
  { key: "minimal", name: "Minimal", description: "Understated, typographic, no heavy graphics.", accent: "#0F172A" },
] as const;

export const CERT_TEMPLATES = [
  { key: "modern", name: "Modern", description: "Contemporary certificate with accent side-bar.", accent: "#4F46E5" },
  { key: "corporate", name: "Corporate", description: "Formal bordered certificate with seal.", accent: "#1D4ED8" },
  { key: "premium", name: "Premium", description: "Elegant gold-accented award design.", accent: "#B45309" },
] as const;

export const DEFAULT_OFFER_TERMS = [
  "This is an internship engagement and does not constitute an offer of permanent employment.",
  "The intern is expected to maintain the confidentiality of all proprietary information.",
  "Working hours and leave policy will be as per company guidelines communicated separately.",
  "Either party may terminate this internship with prior written notice of seven (7) days.",
].join("\n");
