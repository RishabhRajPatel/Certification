import "server-only";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { AUTH_COOKIE } from "./auth";
import { withScheme } from "./utils";

const BASE = withScheme(process.env.BACKEND_URL || "http://localhost:8000").replace(/\/$/, "");
const API = `${BASE}/api/v1`;

// ── case conversion ────────────────────────────────────────────
const camelKey = (s: string) => s.replace(/_([a-z0-9])/g, (_, c) => c.toUpperCase());
const snakeKey = (s: string) => s.replace(/[A-Z]/g, (c) => "_" + c.toLowerCase());

function deepConvert(input: any, keyFn: (k: string) => string): any {
  if (Array.isArray(input)) return input.map((v) => deepConvert(v, keyFn));
  if (input && typeof input === "object" && !(input instanceof Date)) {
    const out: Record<string, any> = {};
    for (const [k, v] of Object.entries(input)) out[keyFn(k)] = deepConvert(v, keyFn);
    return out;
  }
  return input;
}

export const toCamel = <T = any>(o: any): T => deepConvert(o, camelKey);
export const toSnake = (o: any): any => deepConvert(o, snakeKey);

// ── request core ───────────────────────────────────────────────
async function authHeader(): Promise<Record<string, string>> {
  const token = (await cookies()).get(AUTH_COOKIE)?.value;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

// Every request to the backend originates from this Next.js server, not the
// visitor's browser — without this, the backend's per-IP rate limiting
// (login brute-force, /verify abuse) sees every user as the same IP. Forward
// the address this server received the request from so the backend can key
// on the real visitor instead.
async function forwardedForHeader(): Promise<Record<string, string>> {
  const h = await headers();
  const xff = h.get("x-forwarded-for");
  const ip = (xff ? xff.split(",")[0] : h.get("x-real-ip"))?.trim();
  return ip ? { "X-Forwarded-For": ip } : {};
}

export interface ApiResult<T = any> {
  ok: boolean;
  status: number;
  data?: T;
  error?: string;
  fieldErrors?: Record<string, string[]>;
}

function parseError(data: any, status: number): string {
  if (!data) return `Request failed (${status}).`;
  const d = data.detail ?? data.error;
  if (typeof d === "string") return d;
  if (Array.isArray(d) && d[0]?.msg) return String(d[0].msg).replace(/^Value error,\s*/, "");
  return `Request failed (${status}).`;
}

// Map FastAPI 422 validation detail into per-field errors (camelCased keys).
function parseFieldErrors(data: any): Record<string, string[]> | undefined {
  const d = data?.detail;
  if (!Array.isArray(d)) return undefined;
  const out: Record<string, string[]> = {};
  for (const item of d) {
    const loc = Array.isArray(item?.loc) ? item.loc : [];
    const field = camelKey(String(loc[loc.length - 1] ?? "form"));
    const msg = String(item?.msg ?? "Invalid value").replace(/^Value error,\s*/, "");
    (out[field] ||= []).push(msg);
  }
  return Object.keys(out).length ? out : undefined;
}

export async function apiRaw(
  path: string,
  init: RequestInit & { auth?: boolean } = {}
): Promise<Response> {
  const { auth = true, headers: extraHeaders, ...rest } = init;
  return fetch(`${API}${path}`, {
    ...rest,
    headers: {
      ...(await forwardedForHeader()),
      ...(auth ? await authHeader() : {}),
      ...(extraHeaders || {}),
    },
    cache: "no-store",
  });
}

/** Authenticated GET returning camelCased JSON. Redirects to /login on 401
 * (set redirectOnUnauthorized=false to receive null instead). */
export async function apiGet<T = any>(
  path: string,
  opts: { redirectOnUnauthorized?: boolean } = {}
): Promise<T | null> {
  const { redirectOnUnauthorized = true } = opts;
  const res = await apiRaw(path, { method: "GET" });
  if (res.status === 401) {
    if (redirectOnUnauthorized) redirect("/login");
    return null;
  }
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new Error(parseError(body, res.status));
  }
  return toCamel<T>(await res.json());
}

/** Mutation helper (POST/PUT/DELETE). Body is camel→snake converted.
 * Never throws — returns an ApiResult for inline error handling. */
export async function apiSend<T = any>(
  path: string,
  method: "POST" | "PUT" | "DELETE",
  body?: any
): Promise<ApiResult<T>> {
  const res = await apiRaw(path, {
    method,
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(toSnake(body)) : undefined,
  });
  if (res.status === 204) return { ok: true, status: 204 };
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    return {
      ok: false,
      status: res.status,
      error: parseError(data, res.status),
      fieldErrors: parseFieldErrors(data),
    };
  }
  return { ok: true, status: res.status, data: data ? toCamel<T>(data) : undefined };
}

/** Multipart upload (POST). Unlike apiSend, the body is sent as-is — no JSON
 * serialization or camel→snake conversion — and Content-Type is left unset
 * so fetch can attach the multipart boundary itself. Never throws. */
export async function apiUpload<T = any>(path: string, formData: FormData): Promise<ApiResult<T>> {
  const res = await apiRaw(path, { method: "POST", body: formData });
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    return {
      ok: false,
      status: res.status,
      error: parseError(data, res.status),
      fieldErrors: parseFieldErrors(data),
    };
  }
  return { ok: true, status: res.status, data: data ? toCamel<T>(data) : undefined };
}
