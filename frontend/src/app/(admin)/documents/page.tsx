import Link from "next/link";
import { FolderOpen, Search, Download, QrCode, FileText, Award, File } from "lucide-react";
import { apiGet } from "@/lib/api";
import type { DocItem } from "@/lib/types";
import { PageHeader } from "@/components/page-header";
import { Card } from "@/components/ui/card";
import { Input, Select } from "@/components/ui/field";
import { Button } from "@/components/ui/button";
import { Table, Thead, Tbody, Tr, Th, Td } from "@/components/ui/table";
import { Badge, StatusBadge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { formatDate } from "@/lib/utils";

export const dynamic = "force-dynamic";
export const metadata = { title: "Documents" };

const TYPE_META: Record<string, { label: string; icon: any; badge: string }> = {
  OFFER: { label: "Offer Letter", icon: FileText, badge: "bg-blue-50 text-blue-700 ring-blue-600/20" },
  CERTIFICATE: { label: "Certificate", icon: Award, badge: "bg-emerald-50 text-emerald-700 ring-emerald-600/20" },
  OTHER: { label: "Other", icon: File, badge: "bg-slate-100 text-slate-600 ring-slate-500/20" },
};

function downloadHref(d: DocItem): string | null {
  if (d.type === "OFFER") return `/api/offers/${d.id}/pdf`;
  if (d.type === "CERTIFICATE") return `/api/certificates/${d.id}/pdf`;
  return d.downloadUrl ?? null;
}

export default async function DocumentsPage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string; q?: string }>;
}) {
  const sp = await searchParams;
  const type = sp.type ?? "";
  const q = (sp.q ?? "").trim();

  const params = new URLSearchParams();
  if (type) params.set("type", type);
  if (q) params.set("q", q);
  const qs = params.toString();
  const docs = (await apiGet<DocItem[]>(`/documents${qs ? `?${qs}` : ""}`)) ?? [];

  return (
    <div className="space-y-5">
      <PageHeader title="Documents" description="All offer letters, certificates and files in one place." />

      <Card>
        <form method="get" className="flex flex-col gap-3 border-b border-slate-100 p-4 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input name="q" defaultValue={q} placeholder="Search by title, number or intern…" className="pl-10" />
          </div>
          <Select name="type" defaultValue={type} className="sm:w-52">
            <option value="">All types</option>
            <option value="OFFER">Offer Letters</option>
            <option value="CERTIFICATE">Certificates</option>
            <option value="OTHER">Other</option>
          </Select>
          <Button type="submit" variant="outline">Filter</Button>
        </form>

        {docs.length === 0 ? (
          <EmptyState icon={FolderOpen} title="No documents found" description="Generated offer letters and certificates will appear here." />
        ) : (
          <Table>
            <Thead>
              <Tr><Th>Document</Th><Th>Type</Th><Th>Intern</Th><Th>Date</Th><Th>Status</Th><Th className="text-right">Actions</Th></Tr>
            </Thead>
            <Tbody>
              {docs.map((d) => {
                const meta = TYPE_META[d.type] ?? TYPE_META.OTHER;
                const Icon = meta.icon;
                const href = downloadHref(d);
                return (
                  <Tr key={`${d.type}-${d.id}`}>
                    <Td>
                      <div className="flex items-center gap-2.5">
                        <span className="flex h-8 w-8 items-center justify-center rounded-md bg-slate-100 text-slate-500"><Icon className="h-4 w-4" /></span>
                        <div className="min-w-0">
                          <p className="truncate font-medium text-slate-900">{d.title}</p>
                          {d.number && <p className="font-mono text-xs text-slate-500">{d.number}</p>}
                        </div>
                      </div>
                    </Td>
                    <Td><Badge className={meta.badge}>{meta.label}</Badge></Td>
                    <Td>{d.internName ?? "—"}</Td>
                    <Td>{formatDate(d.date)}</Td>
                    <Td><StatusBadge status={d.status} /></Td>
                    <Td>
                      <div className="flex items-center justify-end gap-1">
                        {d.type === "CERTIFICATE" && d.verifyUrl && (
                          <Link href={d.verifyUrl} target="_blank"><Button variant="ghost" size="icon" aria-label="Verify"><QrCode className="h-4 w-4" /></Button></Link>
                        )}
                        {href && (
                          <a href={href} target="_blank" rel="noreferrer"><Button variant="ghost" size="sm"><Download className="h-4 w-4" /> Download</Button></a>
                        )}
                      </div>
                    </Td>
                  </Tr>
                );
              })}
            </Tbody>
          </Table>
        )}
      </Card>
    </div>
  );
}
