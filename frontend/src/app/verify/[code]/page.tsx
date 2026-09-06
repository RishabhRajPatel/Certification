import Link from "next/link";
import {
  ShieldCheck, ShieldX, ShieldAlert, Building2, Award, BadgeCheck,
  KeyRound, QrCode, Fingerprint, CalendarCheck, Clock,
} from "lucide-react";
import { apiRaw, toCamel } from "@/lib/api";
import type { Verify } from "@/lib/types";
import { formatDate } from "@/lib/utils";
import { ShareVerification } from "@/components/share-verification";

export const dynamic = "force-dynamic";
export const metadata = {
  title: "Certificate Verification",
  // Candidate names and document details shouldn't show up in search results
  // unless an admin explicitly opts a document in.
  robots: { index: false, follow: false },
};

const APP_URL = (process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000").replace(/\/$/, "");

function formatDateTime(d: Date): string {
  return d.toLocaleString("en-GB", {
    day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit",
  });
}

function Row({ label, value }: { label: string; value?: React.ReactNode }) {
  if (!value) return null;
  return (
    <div className="flex justify-between gap-4 border-b border-slate-100 py-2.5 text-sm last:border-0">
      <span className="text-slate-500">{label}</span>
      <span className="text-right font-medium text-slate-900">{value}</span>
    </div>
  );
}

function CompanyLogo({ url, name, size = 36 }: { url?: string | null; name: string; size?: number }) {
  if (url) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={url} alt={name} style={{ height: size, width: size }} className="rounded-md object-contain" />;
  }
  return (
    <span
      style={{ height: size, width: size }}
      className="flex items-center justify-center rounded-md bg-brand/10 text-brand-700"
    >
      <Building2 className="h-1/2 w-1/2" />
    </span>
  );
}

export default async function VerifyPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  let data: Verify | null = null;
  let rateLimited = false;
  try {
    const res = await apiRaw(`/verify/${encodeURIComponent(code)}`, { auth: false });
    if (res.status === 429) rateLimited = true;
    else if (res.ok) data = toCamel<Verify>(await res.json());
  } catch {
    data = null;
  }

  const valid = data?.valid === true;
  const revoked = data?.status === "REVOKED";
  const expired = data?.status === "EXPIRED";
  const companyName = data?.companyName || "Verification System";
  const verifiedAt = formatDateTime(new Date());

  // ── Non-verified states (not found / revoked / expired / rate-limited): a single, minimal card. ──
  if (!valid) {
    const theme = rateLimited
      ? { icon: ShieldAlert, band: "from-amber-500 to-amber-600", ring: "bg-amber-500", label: "Try again shortly" }
      : revoked
        ? { icon: ShieldAlert, band: "from-rose-500 to-rose-600", ring: "bg-rose-500", label: "Revoked" }
        : expired
          ? { icon: ShieldAlert, band: "from-amber-500 to-amber-600", ring: "bg-amber-500", label: "Expired" }
          : { icon: ShieldX, band: "from-slate-500 to-slate-600", ring: "bg-slate-500", label: "Not found" };
    const Icon = theme.icon;

    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-12">
        <div className="w-full max-w-lg">
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-card">
            <div className={`bg-gradient-to-r ${theme.band} px-6 py-8 text-center text-white`}>
              <div className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-full bg-white/20">
                <Icon className="h-9 w-9" />
              </div>
              <h1 className="text-lg font-semibold">
                {rateLimited
                  ? "Too Many Requests"
                  : revoked
                    ? "Certificate Revoked"
                    : expired
                      ? "Certificate Expired"
                      : "Certificate Not Found"}
              </h1>
              <p className="mt-1 text-sm text-white/85">
                {rateLimited
                  ? "Too many verification attempts. Please wait a moment and try again."
                  : data?.message ?? "We could not verify this certificate."}
              </p>
            </div>

            <div className="p-6">
              {!rateLimited && (
                <div className="mb-4 flex items-center justify-between">
                  <span className="font-mono text-sm text-slate-500">{data?.number ?? "—"}</span>
                  <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold text-white ${theme.ring}`}>{theme.label}</span>
                </div>
              )}

              {!rateLimited && data && data.status !== "NOT_FOUND" ? (
                <div className="rounded-lg border border-slate-200 p-4">
                  <Row label="Recipient" value={data.internName} />
                  <Row label="Certificate" value={data.title} />
                  <Row label="Issue date" value={data.issueDate ? formatDate(data.issueDate) : undefined} />
                  {expired && <Row label="Expiration date" value={data.expiresAt ? formatDate(data.expiresAt) : undefined} />}
                  <Row label="Status" value={data.status} />
                </div>
              ) : !rateLimited ? (
                <p className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-center text-sm text-slate-500">
                  No record matches this certificate ID. Please check the code and try again.
                </p>
              ) : null}

              <p className="mt-6 flex items-center justify-center gap-1.5 text-xs text-slate-400">
                <ShieldCheck className="h-3.5 w-3.5" /> Official Certificate Verification System
              </p>
            </div>
          </div>

          <p className="mt-4 text-center text-xs text-slate-400">
            Are you an administrator? <Link href="/login" className="font-medium text-brand-700 hover:underline">Sign in</Link>
          </p>
        </div>
      </div>
    );
  }

  // ── Verified state: the full premium layout. ──
  if (!data) return null; // unreachable: `valid` is only true when `data` is set
  const period = data.startDate && data.endDate ? `${formatDate(data.startDate)} – ${formatDate(data.endDate)}` : null;
  const shareUrl = `${APP_URL}/verify/${code}`;

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-8 sm:py-12">
      <div className="mx-auto w-full max-w-3xl">
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-card">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
            <div className="flex items-center gap-2.5">
              <CompanyLogo url={data.companyLogoUrl} name={companyName} />
              <span className="text-sm font-semibold uppercase tracking-wide text-slate-800">{companyName}</span>
            </div>
            <span className="hidden text-xs font-medium text-slate-400 sm:block">Official Verification</span>
          </div>

          {/* Hero */}
          <div className="bg-gradient-to-b from-emerald-50 to-white px-6 py-10 text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500 text-white shadow-sm">
              <ShieldCheck className="h-9 w-9" />
            </div>
            <h1 className="text-xl font-bold tracking-tight text-slate-900">VERIFIED CREDENTIAL</h1>
            <p className="mt-1 text-sm font-medium text-emerald-700">This certificate is authentic</p>
            <p className="mx-auto mt-2 max-w-md text-sm text-slate-500">
              Officially verified against the official records of {companyName}.
            </p>
          </div>

          {/* Body: certificate + details */}
          <div className="grid grid-cols-1 gap-0 border-t border-slate-100 sm:grid-cols-2">
            <div className="border-b border-slate-100 p-6 sm:border-b-0 sm:border-r">
              <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-400">Certificate</h2>
              <div
                className="flex aspect-[4/3] flex-col items-center justify-center gap-2 rounded-lg text-white"
                style={{ background: "linear-gradient(135deg, #B45309, #92400E)" }}
              >
                <Award className="h-9 w-9" />
                <p className="px-4 text-center text-sm font-semibold">{data.title}</p>
              </div>
            </div>

            <div className="p-6">
              <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-400">Verification Details</h2>
              <Row label="Recipient" value={data.internName} />
              <Row label="Program" value={data.role} />
              <Row label="Department" value={data.department} />
              <Row label="Duration" value={period ?? data.durationLabel} />
              <Row label="Certificate ID" value={<span className="font-mono">{data.number}</span>} />
              <div className="flex items-center justify-between py-2.5 text-sm">
                <span className="text-slate-500">Status</span>
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-700 ring-1 ring-inset ring-emerald-600/20">
                  <BadgeCheck className="h-3.5 w-3.5" /> VALID &amp; AUTHENTIC
                </span>
              </div>
            </div>
          </div>

          {/* Issued & verified by */}
          <div className="border-t border-slate-100 px-6 py-6 text-center">
            <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-400">Issued &amp; Verified By</h2>
            <div className="flex items-center justify-center gap-2.5">
              <CompanyLogo url={data.companyLogoUrl} name={companyName} size={28} />
              <span className="text-sm font-semibold text-slate-900">{companyName}</span>
            </div>
            {data.authorizedName && (
              <p className="mt-1 text-xs text-slate-500">
                {data.authorizedName}{data.authorizedDesignation ? `, ${data.authorizedDesignation}` : ""}
              </p>
            )}
          </div>

          {/* Authenticity & security */}
          <div className="border-t border-slate-100 bg-slate-50 px-6 py-6">
            <h2 className="mb-3 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-slate-500">
              <ShieldCheck className="h-3.5 w-3.5" /> Authenticity &amp; Security
            </h2>
            <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
              {[
                { icon: BadgeCheck, label: "Official issuer" },
                { icon: KeyRound, label: "Cryptographically secure verification" },
                { icon: Fingerprint, label: "Unique, unpredictable credential ID" },
                { icon: QrCode, label: "QR-verified document" },
              ].map(({ icon: Icon, label }) => (
                <div key={label} className="flex items-center gap-2 text-sm text-slate-600">
                  <Icon className="h-4 w-4 text-emerald-600" /> {label}
                </div>
              ))}
            </div>
          </div>

          {/* Verification history */}
          <div className="border-t border-slate-100 px-6 py-6">
            <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-400">Verification History</h2>
            <ol className="space-y-3">
              <li className="flex items-start gap-3 text-sm">
                <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-brand/10 text-brand-700">
                  <CalendarCheck className="h-3 w-3" />
                </span>
                <span>
                  <span className="font-medium text-slate-900">Issued</span>{" "}
                  <span className="text-slate-500">{data.issueDate ? formatDate(data.issueDate) : "—"}</span>
                </span>
              </li>
              <li className="flex items-start gap-3 text-sm">
                <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-emerald-700">
                  <Clock className="h-3 w-3" />
                </span>
                <span>
                  <span className="font-medium text-slate-900">Verified</span>{" "}
                  <span className="text-slate-500">{verifiedAt}</span>
                </span>
              </li>
            </ol>
          </div>

          {/* Share */}
          <div className="border-t border-slate-100 px-6 py-6">
            <h2 className="mb-3 text-center text-xs font-semibold uppercase tracking-wide text-slate-400">Share This Credential</h2>
            <ShareVerification url={shareUrl} title={data.title || "Certificate"} />
          </div>

          <p className="border-t border-slate-100 px-6 py-4 text-center text-xs text-slate-400">
            Official Certificate Verification System · © {new Date().getFullYear()} {companyName}
          </p>
        </div>

        <p className="mt-4 text-center text-xs text-slate-400">
          Are you an administrator? <Link href="/login" className="font-medium text-brand-700 hover:underline">Sign in</Link>
        </p>
      </div>
    </div>
  );
}
