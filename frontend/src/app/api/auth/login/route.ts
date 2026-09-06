import { NextRequest, NextResponse } from "next/server";
import { apiRaw } from "@/lib/api";
import { AUTH_COOKIE, authCookieOptions, SESSION_TTL_SECONDS } from "@/lib/auth";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  if (!body?.email || !body?.password) {
    return NextResponse.json({ error: "Email and password are required." }, { status: 400 });
  }

  const res = await apiRaw("/auth/login", {
    method: "POST",
    auth: false,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: body.email, password: body.password }),
  });

  const data = await res.json().catch(() => null);
  if (!res.ok) {
    return NextResponse.json(
      { error: data?.detail || "Invalid email or password." },
      { status: res.status }
    );
  }

  const out = NextResponse.json({ ok: true });
  out.cookies.set(AUTH_COOKIE, data.access_token, authCookieOptions(SESSION_TTL_SECONDS));
  return out;
}
