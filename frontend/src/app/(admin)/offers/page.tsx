import Link from "next/link";
import { Plus, FileText, Download, Ban, Eye } from "lucide-react";
import { apiGet } from "@/lib/api";
import type { Offer } from "@/lib/types";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Table, Thead, Tbody, Tr, Th, Td } from "@/components/ui/table";
import { Avatar } from "@/components/ui/avatar";
import { StatusBadge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { Flash } from "@/components/flash";
import { ConfirmForm } from "@/components/confirm-form";
import { formatDate } from "@/lib/utils";
import { voidOffer } from "@/lib/actions/offers";

export const dynamic = "force-dynamic";
export const metadata = { title: "Offer Letters" };

export default async function OffersPage({
  searchParams,
}: {
  searchParams: Promise<{ flash?: string; highlight?: string }>;
}) {
  const sp = await searchParams;
  const offers = (await apiGet<Offer[]>("/offers")) ?? [];

  return (
    <div className="space-y-5">
      <PageHeader title="Offer Letters" description="All generated offer letters.">
        <Link href="/offers/generate"><Button><Plus className="h-4 w-4" /> Generate Offer</Button></Link>
      </PageHeader>

      <Flash code={sp.flash} />

      <Card>
        {offers.length === 0 ? (
          <EmptyState icon={FileText} title="No offer letters yet" description="Generate your first offer letter for an intern."
            action={<Link href="/offers/generate"><Button><Plus className="h-4 w-4" /> Generate Offer</Button></Link>} />
        ) : (
          <Table>
            <Thead>
              <Tr>
                <Th>Letter No.</Th><Th>Intern</Th><Th>Position</Th><Th>Issued</Th><Th>Status</Th><Th className="text-right">Actions</Th>
              </Tr>
            </Thead>
            <Tbody>
              {offers.map((o) => (
                <Tr key={o.id} className={o.id === sp.highlight ? "bg-emerald-50/60" : ""}>
                  <Td className="font-mono text-xs">{o.number}</Td>
                  <Td>
                    <Link href={`/interns/${o.internId}`} className="flex items-center gap-2.5">
                      <Avatar name={o.internName ?? "—"} size={30} />
                      <span className="font-medium text-slate-900">{o.internName}</span>
                    </Link>
                  </Td>
                  <Td>{o.position}</Td>
                  <Td>{formatDate(o.issueDate)}</Td>
                  <Td><StatusBadge status={o.status} /></Td>
                  <Td>
                    <div className="flex items-center justify-end gap-1">
                      {o.status === "DRAFT" ? (
                        <Link href={`/offers/${o.id}/preview`}>
                          <Button variant="outline" size="sm"><Eye className="h-4 w-4" /> Review draft</Button>
                        </Link>
                      ) : (
                        <>
                          <a href={`/api/offers/${o.id}/pdf`} target="_blank" rel="noreferrer"><Button variant="ghost" size="sm"><Download className="h-4 w-4" /> PDF</Button></a>
                          <Link href={`/interns/${o.internId}`}><Button variant="ghost" size="icon" aria-label="View intern"><Eye className="h-4 w-4" /></Button></Link>
                          {o.status !== "VOID" && (
                            <ConfirmForm action={voidOffer.bind(null, o.id)} confirmText={`Void offer letter ${o.number}?`}>
                              <Button type="submit" variant="ghost" size="icon" className="text-rose-500 hover:bg-rose-50" aria-label="Void offer"><Ban className="h-4 w-4" /></Button>
                            </ConfirmForm>
                          )}
                        </>
                      )}
                    </div>
                  </Td>
                </Tr>
              ))}
            </Tbody>
          </Table>
        )}
      </Card>
    </div>
  );
}
