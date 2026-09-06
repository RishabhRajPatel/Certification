import Link from "next/link";
import {
  Users,
  FileText,
  Award,
  Clock,
  Plus,
  ArrowUpRight,
  ShieldCheck,
} from "lucide-react";
import { apiGet } from "@/lib/api";
import type { Dashboard } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatCard } from "@/components/stat-card";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Avatar } from "@/components/ui/avatar";
import { StatusBadge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { INTERN_STATUS, INTERN_STATUS_META } from "@/lib/constants";
import { formatDate } from "@/lib/utils";

export const dynamic = "force-dynamic";
export const metadata = { title: "Dashboard" };

export default async function DashboardPage() {
  const data = (await apiGet<Dashboard>("/dashboard"))!;
  const totalForBar = Math.max(1, data.totalInterns);

  return (
    <div className="space-y-6">
      <PageHeader title="Dashboard" description="Overview of interns, offer letters and certificates.">
        <Link href="/interns/new">
          <Button><Plus className="h-4 w-4" /> Add Intern</Button>
        </Link>
      </PageHeader>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Total Interns" value={data.totalInterns} icon={Users} tint="brand" href="/interns" />
        <StatCard label="Offers Generated" value={data.offersGenerated} icon={FileText} tint="blue" href="/offers" />
        <StatCard label="Certificates" value={data.certificates} icon={Award} tint="emerald" href="/certificates" />
        <StatCard label="Active Internships" value={data.activeInternships} icon={Clock} tint="amber" href="/progress" />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Recent interns</CardTitle>
            <Link href="/interns" className="inline-flex items-center gap-1 text-xs font-medium text-brand-700 hover:underline">
              View all <ArrowUpRight className="h-3.5 w-3.5" />
            </Link>
          </CardHeader>
          <CardContent className="p-0">
            {data.recentInterns.length === 0 ? (
              <EmptyState icon={Users} title="No interns yet" description="Add your first intern to get started." />
            ) : (
              <ul className="divide-y divide-slate-100">
                {data.recentInterns.map((i) => (
                  <li key={i.id}>
                    <Link href={`/interns/${i.id}`} className="flex items-center gap-3 px-5 py-3 hover:bg-slate-50">
                      <Avatar name={i.fullName} src={i.photoUrl} size={38} />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-slate-900">{i.fullName}</p>
                        <p className="truncate text-xs text-slate-500">{i.role ?? "—"} · {i.internCode}</p>
                      </div>
                      <StatusBadge status={i.status} />
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Internship status</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="flex h-3 w-full overflow-hidden rounded-full bg-slate-100">
              {INTERN_STATUS.map((s) => {
                const count = data.statusCounts[s] ?? 0;
                const pct = (count / totalForBar) * 100;
                if (pct === 0) return null;
                return <div key={s} className={INTERN_STATUS_META[s].dot} style={{ width: `${pct}%` }} title={`${INTERN_STATUS_META[s].label}: ${count}`} />;
              })}
            </div>
            <ul className="space-y-2.5">
              {INTERN_STATUS.map((s) => (
                <li key={s} className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-2 text-slate-600">
                    <span className={`h-2.5 w-2.5 rounded-full ${INTERN_STATUS_META[s].dot}`} />
                    {INTERN_STATUS_META[s].label}
                  </span>
                  <span className="font-semibold text-slate-900">{data.statusCounts[s] ?? 0}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Recent certificates</CardTitle>
            <Link href="/certificates" className="inline-flex items-center gap-1 text-xs font-medium text-brand-700 hover:underline">
              View all <ArrowUpRight className="h-3.5 w-3.5" />
            </Link>
          </CardHeader>
          <CardContent className="p-0">
            {data.recentCertificates.length === 0 ? (
              <EmptyState icon={Award} title="No certificates yet" />
            ) : (
              <ul className="divide-y divide-slate-100">
                {data.recentCertificates.map((c) => (
                  <li key={c.id} className="flex items-center gap-3 px-5 py-3">
                    <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
                      <ShieldCheck className="h-4 w-4" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-slate-900">{c.internName}</p>
                      <p className="truncate text-xs text-slate-500">{c.number} · {formatDate(c.date)}</p>
                    </div>
                    <StatusBadge status={c.status} />
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent offer letters</CardTitle>
            <Link href="/offers" className="inline-flex items-center gap-1 text-xs font-medium text-brand-700 hover:underline">
              View all <ArrowUpRight className="h-3.5 w-3.5" />
            </Link>
          </CardHeader>
          <CardContent className="p-0">
            {data.recentOffers.length === 0 ? (
              <EmptyState icon={FileText} title="No offer letters yet" />
            ) : (
              <ul className="divide-y divide-slate-100">
                {data.recentOffers.map((o) => (
                  <li key={o.id} className="flex items-center gap-3 px-5 py-3">
                    <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
                      <FileText className="h-4 w-4" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-slate-900">{o.internName}</p>
                      <p className="truncate text-xs text-slate-500">{o.number} · {o.subtitle}</p>
                    </div>
                    <StatusBadge status={o.status} />
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
