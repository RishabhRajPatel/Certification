import { NextResponse } from "next/server";
import { apiRaw } from "@/lib/api";
import { AUTH_COOKIE, authCookieOptions } from "@/lib/auth";

export const runtime = "nodejs";

export async function POST() {
  // Best-effort backend session revocation (forwards the bearer cookie).
  await apiRaw("/auth/logout", { method: "POST" }).catch(() => {});
  const out = NextResponse.json({ ok: true });
  out.cookies.set(AUTH_COOKIE, "", authCookieOptions(0));
  return out;
}
