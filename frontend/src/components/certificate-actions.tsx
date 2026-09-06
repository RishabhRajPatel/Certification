"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, XCircle, Clock, Loader2, Send, RotateCcw, ShieldCheck } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/badge";
import { issueCertificate, sendCertificateEmail } from "@/lib/actions/certificates";
import type { Cert } from "@/lib/types";

const HISTORY_LABELS: Record<string, string> = {
  GENERATE_CERTIFICATE: "Certificate created (draft)",
  ISSUE_CERTIFICATE: "Certificate issued",
  SEND_CERT_EMAIL: "Email sent",
  EMAIL_SEND_FAILED: "Email failed to send",
  DOWNLOAD_CERTIFICATE: "PDF downloaded",
  REVOKE_CERTIFICATE: "Status changed",
};

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString("en-GB", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

export function CertificateActions({ cert, autoSendEnabled }: { cert: Cert; autoSendEnabled: boolean }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | undefined>();

  function handleIssue() {
    if (!confirm("Issue this certificate? It will become publicly verifiable" + (autoSendEnabled ? " and the email will be sent immediately." : "."))) return;
    setError(undefined);
    startTransition(async () => {
      const res = await issueCertificate(cert.id);
      if (res?.error) setError(res.error);
      else router.refresh();
    });
  }

  function handleSendEmail() {
    setError(undefined);
    startTransition(async () => {
      const res = await sendCertificateEmail(cert.id);
      if (res?.error) setError(res.error);
      else router.refresh();
    });
  }

  const isDraft = cert.status === "DRAFT";
  const history = cert.history ?? [];

  return (
    <div className="space-y-5">
      <Card>
        <CardHeader><CardTitle>Status</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <StatusBadge status={cert.status} />
          {error && <div className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">{error}</div>}

          {isDraft ? (
            <Button onClick={handleIssue} disabled={pending} className="w-full">
              {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
              {pending ? "Issuing…" : autoSendEnabled ? "Issue & Send Email" : "Issue Certificate"}
            </Button>
          ) : (
            !autoSendEnabled && !cert.emailStatus && (
              <p className="text-xs text-slate-400">Auto-send is off — you can send the email manually below.</p>
            )
          )}
        </CardContent>
      </Card>

      {!isDraft && (
        <Card>
          <CardHeader><CardTitle>Email status</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {cert.emailStatus === "SENT" && (
              <div className="flex items-center gap-2 text-sm text-emerald-700">
                <CheckCircle2 className="h-4 w-4" /> Sent to {cert.emailRecipient}
                {cert.emailSentAt && <span className="text-slate-400">· {formatDateTime(cert.emailSentAt)}</span>}
              </div>
            )}
            {cert.emailStatus === "FAILED" && (
              <div className="space-y-1.5">
                <div className="flex items-center gap-2 text-sm text-rose-600"><XCircle className="h-4 w-4" /> Failed</div>
                {cert.emailError && <p className="text-xs text-slate-500">Reason: {cert.emailError}</p>}
              </div>
            )}
            {!cert.emailStatus && (
              <div className="flex items-center gap-2 text-sm text-slate-500"><Clock className="h-4 w-4" /> Not sent yet</div>
            )}
            <Button onClick={handleSendEmail} disabled={pending} variant="outline" className="w-full">
              {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : cert.emailStatus === "FAILED" ? <RotateCcw className="h-4 w-4" /> : <Send className="h-4 w-4" />}
              {pending ? "Sending…" : cert.emailStatus === "FAILED" ? "Retry Email" : cert.emailStatus === "SENT" ? "Resend Email" : "Send Email"}
            </Button>
          </CardContent>
        </Card>
      )}

      {history.length > 0 && (
        <Card>
          <CardHeader><CardTitle>History</CardTitle></CardHeader>
          <CardContent className="p-0">
            <ul className="divide-y divide-slate-100">
              {history.map((h, i) => (
                <li key={i} className="px-5 py-3 text-sm">
                  <p className="font-medium text-slate-800">{HISTORY_LABELS[h.action] ?? h.action}</p>
                  <p className="text-xs text-slate-400">{formatDateTime(h.createdAt)}</p>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
