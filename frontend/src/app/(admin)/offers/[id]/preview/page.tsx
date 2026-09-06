import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { apiGet } from "@/lib/api";
import { getSettings } from "@/lib/settings";
import type { Offer } from "@/lib/types";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { OfferActions } from "@/components/offer-actions";
import { formatDate, formatCurrency } from "@/lib/utils";

function compensationValue(offer: Offer): string {
  if (offer.compensationType === "UNPAID") return "Unpaid";
  if (offer.compensationType === "PERFORMANCE") {
    return offer.stipend ? `Performance-Based (max ${formatCurrency(offer.stipend)}/mo)` : "Performance-Based";
  }
  return offer.stipend ? `${formatCurrency(offer.stipend)} / month` : "—";
}

export const dynamic = "force-dynamic";
export const metadata = { title: "Preview Offer Letter" };

function Row({ label, value }: { label: string; value?: React.ReactNode }) {
  if (!value) return null;
  return (
    <div className="flex justify-between gap-4 border-b border-slate-100 py-2.5 text-sm last:border-0">
      <span className="text-slate-500">{label}</span>
      <span className="text-right font-medium text-slate-900">{value}</span>
    </div>
  );
}

export default async function OfferPreviewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [offer, settings] = await Promise.all([
    apiGet<Offer>(`/offers/${id}`).catch(() => null),
    getSettings(),
  ]);
  if (!offer) notFound();

  return (
    <div className="space-y-5">
      <Link href="/offers" className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700">
        <ArrowLeft className="h-4 w-4" /> Back to offer letters
      </Link>
      <PageHeader title={offer.number} description={offer.position} />

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[1fr_360px]">
        <div className="space-y-5">
          <Card className="overflow-hidden">
            <CardHeader><CardTitle>Document preview</CardTitle></CardHeader>
            <embed src={`/api/offers/${offer.id}/pdf`} type="application/pdf" className="h-[70vh] w-full" />
          </Card>

          <Card>
            <CardHeader><CardTitle>Details</CardTitle></CardHeader>
            <CardContent>
              <Row label="Candidate" value={offer.internName} />
              <Row label="Position" value={offer.position} />
              <Row label="Department" value={offer.department} />
              <Row label="Duration" value={offer.durationLabel} />
              <Row label="Joining date" value={formatDate(offer.joiningDate)} />
              <Row label="Compensation" value={compensationValue(offer)} />
              {offer.compensationType === "PERFORMANCE" && (
                <>
                  <Row label="Performance criteria" value={offer.performanceCriteria} />
                  <Row label="Evaluation frequency" value={offer.evaluationFrequency} />
                </>
              )}
              <Row label="Authorized by" value={`${offer.authorizedName}, ${offer.authorizedDesignation}`} />
            </CardContent>
          </Card>
        </div>

        <OfferActions offer={offer} autoSendEnabled={settings.offerEmailAutoSend} />
      </div>
    </div>
  );
}
