import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, QrCode } from "lucide-react";
import { apiGet } from "@/lib/api";
import { getSettings } from "@/lib/settings";
import type { Cert } from "@/lib/types";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CertificateActions } from "@/components/certificate-actions";
import { formatDate } from "@/lib/utils";
import { CERTIFICATE_TYPE_LABELS, WORK_MODE_LABELS, PERFORMANCE_RATING_LABELS, type CertificateType, type WorkMode } from "@/lib/constants";

export const dynamic = "force-dynamic";
export const metadata = { title: "Preview Certificate" };

function Row({ label, value }: { label: string; value?: React.ReactNode }) {
  if (!value) return null;
  return (
    <div className="flex justify-between gap-4 border-b border-slate-100 py-2.5 text-sm last:border-0">
      <span className="text-slate-500">{label}</span>
      <span className="text-right font-medium text-slate-900">{value}</span>
    </div>
  );
}

export default async function CertificatePreviewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [cert, settings] = await Promise.all([
    apiGet<Cert>(`/certificates/${id}`).catch(() => null),
    getSettings(),
  ]);
  if (!cert) notFound();

  return (
    <div className="space-y-5">
      <Link href="/certificates" className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700">
        <ArrowLeft className="h-4 w-4" /> Back to certificates
      </Link>
      <PageHeader title={cert.number} description={cert.title}>
        {cert.status !== "DRAFT" && cert.verifyUrl && (
          <Link href={cert.verifyUrl} target="_blank"><Button variant="outline" size="sm"><QrCode className="h-4 w-4" /> Public verify page</Button></Link>
        )}
      </PageHeader>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[1fr_360px]">
        <div className="space-y-5">
          <Card className="overflow-hidden">
            <CardHeader><CardTitle>Document preview</CardTitle></CardHeader>
            <embed src={`/api/certificates/${cert.id}/pdf`} type="application/pdf" className="h-[70vh] w-full" />
          </Card>

          <Card>
            <CardHeader><CardTitle>Details</CardTitle></CardHeader>
            <CardContent>
              <Row label="Certificate type" value={CERTIFICATE_TYPE_LABELS[cert.certificateType as CertificateType] ?? cert.certificateType} />
              <Row label="Recipient" value={cert.internName} />
              <Row label="Program" value={cert.role} />
              <Row label="Department" value={cert.department} />
              <Row label="Work mode" value={cert.workMode ? WORK_MODE_LABELS[cert.workMode as WorkMode] : undefined} />
              <Row label="Duration" value={cert.durationLabel ?? (cert.startDate && cert.endDate ? `${formatDate(cert.startDate)} – ${formatDate(cert.endDate)}` : undefined)} />
              <Row label="Issue date" value={formatDate(cert.issueDate)} />
              <Row label="Expiry date" value={cert.expiresAt ? formatDate(cert.expiresAt) : "Never"} />
              <Row label="Performance rating" value={cert.performanceRating ? `${PERFORMANCE_RATING_LABELS[cert.performanceRating]} (${cert.performanceRating}/5)` : undefined} />
              <Row label="Skills" value={cert.skills} />
              <Row label="Remarks" value={cert.remarks} />
              <Row label="Authorized by" value={`${cert.authorizedName}, ${cert.authorizedDesignation}`} />
            </CardContent>
          </Card>

          {cert.certificateText && (
            <Card>
              <CardHeader><CardTitle>Certificate text</CardTitle></CardHeader>
              <CardContent>
                <p className="text-sm text-slate-700">{cert.certificateText}</p>
              </CardContent>
            </Card>
          )}
        </div>

        <CertificateActions cert={cert} autoSendEnabled={settings.certEmailAutoSend} />
      </div>
    </div>
  );
}
