import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Some hosts (Render's `fromService` blueprint var) inject a bare hostname
 * with no scheme — assume https so the value is still a usable URL. */
export function withScheme(url: string): string {
  return /^https?:\/\//i.test(url) ? url : `https://${url}`;
}

/** Resolves a backend-relative asset path (e.g. "/media/templates/x.png",
 * from Template.backgroundUrl) into a URL the browser can actually fetch.
 * The backend and frontend run on different origins, so a bare "/media/..."
 * path resolves against the Next.js origin instead and 404s. Absolute URLs
 * (http/https) pass through untouched. */
export function mediaUrl(path: string | null | undefined): string | undefined {
  if (!path) return undefined;
  if (/^https?:\/\//i.test(path)) return path;
  const base = withScheme(process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000").replace(/\/$/, "");
  return `${base}${path}`;
}

export function formatDate(d: Date | string | null | undefined): string {
  if (!d) return "—";
  const date = typeof d === "string" ? new Date(d) : d;
  return date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function formatDateLong(d: Date | string | null | undefined): string {
  if (!d) return "—";
  const date = typeof d === "string" ? new Date(d) : d;
  return date.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export function formatCurrency(n: number | null | undefined): string {
  if (n == null) return "—";
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(n);
}

export function initials(name: string): string {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("");
}

/** Deterministic pastel avatar color from a string. */
export function avatarColor(seed: string): string {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) hash = seed.charCodeAt(i) + ((hash << 5) - hash);
  const hue = Math.abs(hash) % 360;
  return `hsl(${hue} 55% 45%)`;
}

export interface ProgressInfo {
  percent: number;
  totalDays: number;
  daysCompleted: number;
  daysRemaining: number;
  phase: "UPCOMING" | "ACTIVE" | "COMPLETED";
}

export function computeProgress(
  startDate: Date | string,
  endDate: Date | string,
  now: Date = new Date()
): ProgressInfo {
  const start = new Date(startDate);
  const end = new Date(endDate);
  const day = 1000 * 60 * 60 * 24;
  const totalDays = Math.max(1, Math.round((end.getTime() - start.getTime()) / day));

  if (now < start) {
    return { percent: 0, totalDays, daysCompleted: 0, daysRemaining: totalDays, phase: "UPCOMING" };
  }
  if (now >= end) {
    return { percent: 100, totalDays, daysCompleted: totalDays, daysRemaining: 0, phase: "COMPLETED" };
  }
  const daysCompleted = Math.max(0, Math.round((now.getTime() - start.getTime()) / day));
  const daysRemaining = Math.max(0, totalDays - daysCompleted);
  const percent = Math.min(100, Math.round((daysCompleted / totalDays) * 100));
  return { percent, totalDays, daysCompleted, daysRemaining, phase: "ACTIVE" };
}

export function monthsBetweenLabel(start: Date | string, end: Date | string): string {
  const s = new Date(start);
  const e = new Date(end);
  const months =
    (e.getFullYear() - s.getFullYear()) * 12 + (e.getMonth() - s.getMonth());
  if (months <= 0) {
    const days = Math.round((e.getTime() - s.getTime()) / (1000 * 60 * 60 * 24));
    return `${days} Day${days === 1 ? "" : "s"}`;
  }
  return `${months} Month${months === 1 ? "" : "s"}`;
}
