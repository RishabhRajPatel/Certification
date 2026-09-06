import { NextRequest, NextResponse } from "next/server";
import { AUTH_COOKIE } from "@/lib/auth";

// Cheap gate: require the session cookie to be present. The backend is the
// authority — page-level API calls re-check the token and redirect on 401.
const PUBLIC_PREFIXES = ["/login", "/verify"];
const PUBLIC_API = ["/api/auth/login"];

export function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (PUBLIC_PREFIXES.some((p) => pathname === p || pathname.startsWith(p + "/"))) {
    return NextResponse.next();
  }
  if (PUBLIC_API.includes(pathname)) return NextResponse.next();

  const hasToken = Boolean(req.cookies.get(AUTH_COOKIE)?.value);
  if (!hasToken) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js)$).*)",
  ],
};
