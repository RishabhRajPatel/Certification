"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  ShieldCheck,
  Eye,
  EyeOff,
  Loader2,
  Lock,
  Mail,
  BadgeCheck,
  FileText,
  Award,
} from "lucide-react";
import { Label } from "@/components/ui/field";
import { cn } from "@/lib/utils";

export function LoginForm({
  nextPath,
  companyName,
}: {
  nextPath?: string;
  companyName: string;
}) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(true);
  const [show, setShow] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, remember }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || "Login failed. Please try again.");
        setLoading(false);
        return;
      }
      const dest = nextPath && nextPath.startsWith("/") ? nextPath : "/dashboard";
      router.replace(dest);
      router.refresh();
    } catch {
      setError("Network error. Please try again.");
      setLoading(false);
    }
  }

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      {/* Left — branding */}
      <div className="relative hidden overflow-hidden bg-sidebar text-white lg:flex lg:flex-col lg:justify-between lg:p-12">
        <div
          className="pointer-events-none absolute inset-0 opacity-30"
          style={{
            background:
              "radial-gradient(600px circle at 20% 10%, rgb(var(--brand)/0.55), transparent 45%), radial-gradient(500px circle at 90% 90%, rgb(var(--brand)/0.35), transparent 40%)",
          }}
        />
        <div className="relative flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand text-brand-fg">
            <ShieldCheck className="h-6 w-6" />
          </div>
          <span className="text-lg font-semibold">Maayad</span>
        </div>

        <div className="relative max-w-md">
          <h1 className="text-3xl font-semibold leading-tight">
            Internship, offers & certificates — managed in one place.
          </h1>
          <p className="mt-4 text-sm text-slate-300">
            Generate verifiable offer letters and certificates with automatic
            numbering, QR verification, and a complete audit trail.
          </p>
          <ul className="mt-8 space-y-3 text-sm text-slate-200">
            {[
              { icon: FileText, t: "Auto-numbered offer letters (OFF-YYYY-#####)" },
              { icon: Award, t: "QR-verifiable certificates (MAAYAD-INT-YYYY-#####)" },
              { icon: BadgeCheck, t: "Secure, admin-only document generation" },
            ].map(({ icon: Icon, t }) => (
              <li key={t} className="flex items-center gap-3">
                <span className="flex h-8 w-8 items-center justify-center rounded-md bg-white/10">
                  <Icon className="h-4 w-4" />
                </span>
                {t}
              </li>
            ))}
          </ul>
        </div>

        <p className="relative text-xs text-slate-400">
          © {new Date().getFullYear()} {companyName}. All rights reserved.
        </p>
      </div>

      {/* Right — form */}
      <div className="flex items-center justify-center bg-slate-50 px-4 py-12 sm:px-6">
        <div className="w-full max-w-sm">
          <div className="mb-8 flex items-center gap-3 lg:hidden">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand text-brand-fg">
              <ShieldCheck className="h-6 w-6" />
            </div>
            <span className="text-lg font-semibold text-slate-900">Maayad</span>
          </div>

          <h2 className="text-2xl font-semibold tracking-tight text-slate-900">
            Admin sign in
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Sign in to the administration portal.
          </p>

          <form onSubmit={onSubmit} className="mt-8 space-y-4">
            {error && (
              <div
                role="alert"
                className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2.5 text-sm text-rose-700"
              >
                {error}
              </div>
            )}

            <div>
              <Label htmlFor="email">Email address</Label>
              <div className="relative">
                <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  id="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@company.com"
                  className="h-11 w-full rounded-md border border-slate-300 bg-white pl-10 pr-3 text-sm shadow-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/30"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between">
                <Label htmlFor="password">Password</Label>
                <button
                  type="button"
                  className="mb-1.5 text-xs font-medium text-brand-700 hover:underline"
                  onClick={() =>
                    setError(
                      "Password reset is configured by your administrator. Contact your system admin."
                    )
                  }
                >
                  Forgot password?
                </button>
              </div>
              <div className="relative">
                <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  id="password"
                  type={show ? "text" : "password"}
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="h-11 w-full rounded-md border border-slate-300 bg-white pl-10 pr-10 text-sm shadow-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/30"
                />
                <button
                  type="button"
                  onClick={() => setShow((s) => !s)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  aria-label={show ? "Hide password" : "Show password"}
                >
                  {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <label className="flex items-center gap-2 text-sm text-slate-600">
              <input
                type="checkbox"
                checked={remember}
                onChange={(e) => setRemember(e.target.checked)}
                className="h-4 w-4 rounded border-slate-300 text-brand focus:ring-brand"
              />
              Remember me on this device
            </label>

            <button
              type="submit"
              disabled={loading}
              className={cn(
                "flex h-11 w-full items-center justify-center gap-2 rounded-md bg-brand text-sm font-semibold text-brand-fg shadow-sm transition-colors hover:bg-brand-700",
                "disabled:cursor-not-allowed disabled:opacity-70"
              )}
            >
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              {loading ? "Signing in…" : "Sign in"}
            </button>
          </form>

          <div className="mt-6 rounded-md border border-slate-200 bg-white px-4 py-3 text-xs text-slate-500">
            <p className="font-medium text-slate-600">Demo credentials</p>
            <p className="mt-1">
              <span className="font-mono">admin@maayad.com</span> /{" "}
              <span className="font-mono">Admin@12345</span>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
