import Link from "next/link";
import { ArrowLeft, Users, Plus } from "lucide-react";
import { apiGet } from "@/lib/api";
import { getSettings } from "@/lib/settings";
import type { Intern, Template } from "@/lib/types";
import { PageHeader } from "@/components/page-header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { CertGenerateForm } from "@/components/cert-generate-form";

export const dynamic = "force-dynamic";
export const metadata = { title: "Generate Certificate" };

const toInput = (d: string) => (d ? d.slice(0, 10) : "");

export default async function GenerateCertPage({
  searchParams,
}: {
  searchParams: Promise<{ intern?: string }>;
}) {
  const sp = await searchParams;
  const [rows, settings, allTemplates] = await Promise.all([
    apiGet<Intern[]>("/interns"),
    getSettings(),
    apiGet<Template[]>("/templates"),
  ]);
  const templates = (allTemplates ?? []).filter((t) => t.type === "CERTIFICATE");

  const interns = (rows ?? []).map((i) => ({
    id: i.id,
    fullName: i.fullName,
    internCode: i.internCode,
    email: i.email,
    college: i.college,
    role: i.role,
    department: i.department,
    durationLabel: i.durationLabel,
    startDate: toInput(i.startDate),
    endDate: toInput(i.endDate),
  }));

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <Link href="/certificates" className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700">
        <ArrowLeft className="h-4 w-4" /> Back to certificates
      </Link>
      <PageHeader title="Generate Certificate" description="Create a QR-verifiable, auto-numbered certificate and export it as a PDF." />

      {interns.length === 0 ? (
        <Card>
          <EmptyState icon={Users} title="No interns to select" description="Add an intern first, then issue their certificate."
            action={<Link href="/interns/new"><Button><Plus className="h-4 w-4" /> Add Intern</Button></Link>} />
        </Card>
      ) : (
        <CertGenerateForm
          interns={interns}
          templates={templates}
          defaultInternId={sp.intern}
          signatureName={settings.signatureName}
          signatureDesignation={settings.signatureDesignation}
          defaultTemplate={settings.defaultCertTemplate}
          companyName={settings.companyName}
        />
      )}
    </div>
  );
}
