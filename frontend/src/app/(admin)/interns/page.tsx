import Link from "next/link";
import { Plus, Search, Users } from "lucide-react";
import { apiGet } from "@/lib/api";
import type { Intern } from "@/lib/types";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input, Select } from "@/components/ui/field";
import { Table, Thead, Tbody, Tr, Th, Td } from "@/components/ui/table";
import { Avatar } from "@/components/ui/avatar";
import { StatusBadge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { Flash } from "@/components/flash";
import { InternRowActions } from "@/components/intern-row-actions";
import { INTERN_STATUS, INTERN_STATUS_META } from "@/lib/constants";
import { formatDate } from "@/lib/utils";
import { deleteIntern } from "@/lib/actions/interns";

export const dynamic = "force-dynamic";
export const metadata = { title: "Interns" };

export default async function InternsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string; flash?: string }>;
}) {
  const sp = await searchParams;
  const q = (sp.q ?? "").trim();
  const status = sp.status ?? "";

  const params = new URLSearchParams();
  if (q) params.set("q", q);
  if (status) params.set("status", status);
  const qs = params.toString();
  const interns = (await apiGet<Intern[]>(`/interns${qs ? `?${qs}` : ""}`)) ?? [];

  return (
    <div className="space-y-5">
      <PageHeader title="Interns" description="Manage all interns and their records.">
        <Link href="/interns/new">
          <Button><Plus className="h-4 w-4" /> Add Intern</Button>
        </Link>
      </PageHeader>

      <Flash code={sp.flash} />

      <Card>
        <form method="get" className="flex flex-col gap-3 border-b border-slate-100 p-4 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input name="q" defaultValue={q} placeholder="Search by name, email, ID or role…" className="pl-10" />
          </div>
          <Select name="status" defaultValue={status} className="sm:w-52">
            <option value="">All statuses</option>
            {INTERN_STATUS.map((s) => (
              <option key={s} value={s}>{INTERN_STATUS_META[s].label}</option>
            ))}
          </Select>
          <Button type="submit" variant="outline">Filter</Button>
        </form>

        {interns.length === 0 ? (
          <EmptyState
            icon={Users}
            title={q || status ? "No matching interns" : "No interns yet"}
            description={q || status ? "Try adjusting your search or filters." : "Add your first intern to get started."}
            action={!q && !status ? (<Link href="/interns/new"><Button><Plus className="h-4 w-4" /> Add Intern</Button></Link>) : null}
          />
        ) : (
          <Table>
            <Thead>
              <Tr>
                <Th>Intern</Th>
                <Th>Intern ID</Th>
                <Th>Course</Th>
                <Th>Start</Th>
                <Th>End</Th>
                <Th>Status</Th>
                <Th className="text-right">Actions</Th>
              </Tr>
            </Thead>
            <Tbody>
              {interns.map((i) => (
                <Tr key={i.id}>
                  <Td>
                    <Link href={`/interns/${i.id}`} className="flex items-center gap-3">
                      <Avatar name={i.fullName} src={i.photoUrl} size={36} />
                      <span className="min-w-0">
                        <span className="block truncate font-medium text-slate-900">{i.fullName}</span>
                        <span className="block truncate text-xs text-slate-500">{i.email}</span>
                      </span>
                    </Link>
                  </Td>
                  <Td className="font-mono text-xs text-slate-500">{i.internCode}</Td>
                  <Td>{i.course ?? "—"}</Td>
                  <Td>{formatDate(i.startDate)}</Td>
                  <Td>{formatDate(i.endDate)}</Td>
                  <Td><StatusBadge status={i.status} /></Td>
                  <Td>
                    <InternRowActions id={i.id} deleteAction={deleteIntern.bind(null, i.id)} />
                  </Td>
                </Tr>
              ))}
            </Tbody>
          </Table>
        )}
      </Card>

      <p className="text-xs text-slate-400">Showing {interns.length} intern{interns.length === 1 ? "" : "s"}.</p>
    </div>
  );
}
