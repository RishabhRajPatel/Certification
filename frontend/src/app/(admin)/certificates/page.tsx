import Link from "next/link";
import { Plus, Award, Download, QrCode, Ban, RotateCcw, Eye } from "lucide-react";
import { apiGet } from "@/lib/api";
import type { Cert } from "@/lib/types";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Table, Thead, Tbody, Tr, Th, Td } from "@/components/ui/table";
import { Avatar } from "@/components/ui/avatar";
import { Badge, StatusBadge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { Flash } from "@/components/flash";
import { ConfirmForm } from "@/components/confirm-form";
import { formatDate } from "@/lib/utils";
import { setCertificateStatus } from "@/lib/actions/certificates";

export const dynamic = "force-dynamic";
export const metadata = { title: "Certificates" };

export default async function CertificatesPage({
  searchParams,
}: {
  searchParams: Promise<{ flash?: string; highlight?: string }>;
}) {
  const sp = await searchParams;
  const certs = (await apiGet<Cert[]>("/certificates")) ?? [];

  return (
    <div className="space-y-5">
      <PageHeader title="Certificates" description="All generated certificates with QR verification.">
        <Link href="/certificates/generate"><Button><Plus className="h-4 w-4" /> Generate Certificate</Button></Link>
      </PageHeader>

      <Flash code={sp.flash} />

      <Card>
        {certs.length === 0 ? (
          <EmptyState icon={Award} title="No certificates yet" description="Issue your first certificate for a completed internship."
            action={<Link href="/certificates/generate"><Button><Plus className="h-4 w-4" /> Generate Certificate</Button></Link>} />
        ) : (
          <Table>
            <Thead>
              <Tr>
                <Th>Certificate No.</Th><Th>Intern</Th><Th>Role</Th><Th>Issued</Th><Th>Status</Th><Th className="text-right">Actions</Th>
              </Tr>
            </Thead>
            <Tbody>
              {certs.map((c) => (
                <Tr key={c.id} className={c.id === sp.highlight ? "bg-emerald-50/60" : ""}>
                  <Td className="font-mono text-xs">{c.number}</Td>
                  <Td>
                    <Link href={`/interns/${c.internId}`} className="flex items-center gap-2.5">
                      <Avatar name={c.internName ?? "—"} size={30} />
                      <span className="font-medium text-slate-900">{c.internName}</span>
                    </Link>
                  </Td>
                  <Td>{c.role}</Td>
                  <Td>{formatDate(c.issueDate)}</Td>
                  <Td>
                    <div className="flex items-center gap-1.5">
                      <StatusBadge status={c.status} />
                      {c.isExpired && <Badge className="bg-amber-50 text-amber-700 ring-amber-600/20">Expired</Badge>}
                    </div>
                    {c.verificationCount > 0 && (
                      <p className="mt-1 text-[11px] text-slate-400">
                        Verified {c.verificationCount}× · last {formatDate(c.lastVerifiedAt)}
                      </p>
                    )}
                  </Td>
                  <Td>
                    <div className="flex items-center justify-end gap-1">
                      {c.status === "DRAFT" ? (
                        <Link href={`/certificates/${c.id}/preview`}>
                          <Button variant="outline" size="sm"><Eye className="h-4 w-4" /> Review draft</Button>
                        </Link>
                      ) : (
                        <>
                          <a href={`/api/certificates/${c.id}/pdf`} target="_blank" rel="noreferrer"><Button variant="ghost" size="sm"><Download className="h-4 w-4" /> PDF</Button></a>
                          {c.verifyUrl && (
                            <Link href={c.verifyUrl} target="_blank"><Button variant="ghost" size="icon" aria-label="Verify"><QrCode className="h-4 w-4" /></Button></Link>
                          )}
                          {c.status === "VALID" ? (
                            <ConfirmForm action={setCertificateStatus.bind(null, c.id, "REVOKED")} confirmText={`Revoke certificate ${c.number}? It will show as invalid on public verification.`}>
                              <Button type="submit" variant="ghost" size="icon" className="text-rose-500 hover:bg-rose-50" aria-label="Revoke"><Ban className="h-4 w-4" /></Button>
                            </ConfirmForm>
                          ) : c.status === "REVOKED" ? (
                            <ConfirmForm action={setCertificateStatus.bind(null, c.id, "VALID")} confirmText={`Reinstate certificate ${c.number}?`}>
                              <Button type="submit" variant="ghost" size="icon" className="text-emerald-600 hover:bg-emerald-50" aria-label="Reinstate"><RotateCcw className="h-4 w-4" /></Button>
                            </ConfirmForm>
                          ) : null}
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
