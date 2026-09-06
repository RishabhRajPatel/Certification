import "server-only";
import { apiGet } from "./api";
import { withScheme } from "./utils";
import type { Settings } from "./types";

/** Authenticated read of the singleton settings. Redirects to /login on 401. */
export async function getSettings(): Promise<Settings> {
  const s = await apiGet<Settings>("/settings");
  return s as Settings;
}

export function appUrl(): string {
  return withScheme(process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000").replace(/\/$/, "");
}
