import Link from "next/link";
import { ArrowLeft, Users, Plus } from "lucide-react";
import { apiGet } from "@/lib/api";
import { getSettings } from "@/lib/settings";
import type { Intern, Template } from "@/lib/types";
import { PageHeader } from "@/components/page-header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { OfferGenerateForm } from "@/components/offer-generate-form";
import { DEFAULT_OFFER_TERMS } from "@/lib/constants";

export const dynamic = "force-dynamic";
export const metadata = { title: "Generate Offer Letter" };

const toInput = (d: string) => (d ? d.slice(0, 10) : "");

export default async function GenerateOfferPage({
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
  const templates = (allTemplates ?? []).filter((t) => t.type === "OFFER");

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
  }));

  return (
    <div className="mx-auto max-w-6xl space-y-5">
      <Link href="/offers" className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700">
        <ArrowLeft className="h-4 w-4" /> Back to offer letters
      </Link>
      <PageHeader title="Generate Offer Letter" description="Create an auto-numbered offer letter and export it as a PDF." />

      {interns.length === 0 ? (
        <Card>
          <EmptyState icon={Users} title="No interns to select" description="Add an intern first, then generate their offer letter."
            action={<Link href="/interns/new"><Button><Plus className="h-4 w-4" /> Add Intern</Button></Link>} />
        </Card>
      ) : (
        <OfferGenerateForm
          interns={interns}
          templates={templates}
          defaultInternId={sp.intern}
          signatureName={settings.signatureName}
          signatureDesignation={settings.signatureDesignation}
          defaultTemplate={settings.defaultOfferTemplate}
          defaultTerms={DEFAULT_OFFER_TERMS}
          companyName={settings.companyName}
          offerLetterTemplate={settings.offerLetterTemplate}
        />
      )}
    </div>
  );
}
