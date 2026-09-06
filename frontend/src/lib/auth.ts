// Small, runtime-agnostic auth constants (safe to import from Edge middleware).
export const AUTH_COOKIE = "cf_token";

// Keep in sync with the backend ACCESS_TOKEN_EXPIRE_HOURS.
export const SESSION_TTL_SECONDS = 8 * 3600;

export function authCookieOptions(maxAgeSeconds: number) {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: maxAgeSeconds,
  };
}
