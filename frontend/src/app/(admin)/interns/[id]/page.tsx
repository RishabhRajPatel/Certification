import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft, Pencil, FileText, Award, Mail, Phone, GraduationCap,
  Building2, UserCog, CalendarDays, Wallet, Download, QrCode, CheckCircle2, Circle, Eye,
} from "lucide-react";
import { apiGet } from "@/lib/api";
import type { InternDetail } from "@/lib/types";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar } from "@/components/ui/avatar";
import { StatusBadge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { Flash } from "@/components/flash";
import { formatDate, formatCurrency } from "@/lib/utils";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const intern = await apiGet<InternDetail>(`/interns/${id}`).catch(() => null);
  return { title: intern?.fullName ?? "Intern" };
}

function InfoRow({ icon: Icon, label, value }: { icon: React.ComponentType<{ className?: string }>; label: string; value?: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3 py-2.5">
      <Icon className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
      <div className="min-w-0">
        <p className="text-xs text-slate-500">{label}</p>
        <p className="text-sm font-medium text-slate-900">{value || "—"}</p>
      </div>
    </div>
  );
}

export default async function InternDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ flash?: string }>;
}) {
  const { id } = await params;
  const sp = await searchParams;
  let intern: InternDetail | null = null;
  try {
    intern = await apiGet<InternDetail>(`/interns/${id}`);
  } catch {
    notFound();
  }
  if (!intern) notFound();

  const progress = intern.progress;
  const tasksDone = intern.tasks.filter((t) => t.isDone).length;

  return (
    <div className="space-y-5">
      <Link href="/interns" className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700">
        <ArrowLeft className="h-4 w-4" /> Back to interns
      </Link>

      <Flash code={sp.flash} />

      <Card>
        <CardContent className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <Avatar name={intern.fullName} src={intern.photoUrl} size={64} className="text-xl" />
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-xl font-semibold text-slate-900">{intern.fullName}</h1>
                <StatusBadge status={intern.status} />
              </div>
              <p className="mt-0.5 text-sm text-slate-500">
                {intern.role ?? "Intern"} · <span className="font-mono text-xs">{intern.internCode}</span>
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Link href={`/interns/${intern.id}/edit`}><Button variant="outline"><Pencil className="h-4 w-4" /> Edit</Button></Link>
            <Link href={`/offers/generate?intern=${intern.id}`}><Button variant="outline"><FileText className="h-4 w-4" /> Offer</Button></Link>
            <Link href={`/certificates/generate?intern=${intern.id}`}><Button><Award className="h-4 w-4" /> Certificate</Button></Link>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader><CardTitle>Profile</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-1 gap-x-8 sm:grid-cols-2">
            <InfoRow icon={Mail} label="Email" value={intern.email} />
            <InfoRow icon={Phone} label="Phone" value={intern.phone} />
            <InfoRow icon={GraduationCap} label="College / University" value={intern.college} />
            <InfoRow icon={GraduationCap} label="Course" value={intern.course} />
            <InfoRow icon={Building2} label="Department" value={intern.department} />
            <InfoRow icon={UserCog} label="Reporting manager" value={intern.reportingManager} />
            <InfoRow icon={CalendarDays} label="Start date" value={formatDate(intern.startDate)} />
            <InfoRow icon={CalendarDays} label="End date" value={formatDate(intern.endDate)} />
            <InfoRow icon={CalendarDays} label="Duration" value={intern.durationLabel} />
            <InfoRow icon={Wallet} label="Stipend" value={intern.stipend ? `${formatCurrency(intern.stipend)} / month` : "Unpaid"} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Progress</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="mb-1.5 flex items-center justify-between text-sm">
                <span className="text-slate-500">Timeline</span>
                <span className="font-semibold text-slate-900">{progress.percent}%</span>
              </div>
              <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-100">
                <div className="h-full rounded-full bg-brand transition-all" style={{ width: `${progress.percent}%` }} />
              </div>
              <div className="mt-2 flex justify-between text-xs text-slate-500">
                <span>{progress.daysCompleted} days done</span>
                <span>{progress.daysRemaining} days left</span>
              </div>
            </div>

            <div>
              <p className="mb-2 text-xs font-medium text-slate-500">Tasks · {tasksDone}/{intern.tasks.length}</p>
              <ul className="space-y-1.5">
                {intern.tasks.map((t) => (
                  <li key={t.id} className="flex items-center gap-2 text-sm">
                    {t.isDone ? <CheckCircle2 className="h-4 w-4 text-emerald-500" /> : <Circle className="h-4 w-4 text-slate-300" />}
                    <span className={t.isDone ? "text-slate-500 line-through" : "text-slate-700"}>{t.title}</span>
                  </li>
                ))}
                {intern.tasks.length === 0 && <li className="text-sm text-slate-400">No tasks defined.</li>}
              </ul>
              <Link href="/progress" className="mt-3 inline-block text-xs font-medium text-brand-700 hover:underline">Manage progress →</Link>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle>Documents</CardTitle></CardHeader>
        <CardContent className="p-0">
          {intern.offerLetters.length === 0 && intern.certificates.length === 0 ? (
            <EmptyState icon={FileText} title="No documents yet" description="Generate an offer letter or certificate for this intern." />
          ) : (
            <ul className="divide-y divide-slate-100">
              {intern.offerLetters.map((o) => (
                <li key={o.id} className="flex items-center gap-3 px-5 py-3">
                  <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-50 text-blue-600"><FileText className="h-4 w-4" /></span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-slate-900">Offer Letter · {o.position}</p>
                    <p className="truncate text-xs text-slate-500">{o.number} · {formatDate(o.issueDate)}</p>
                  </div>
                  <StatusBadge status={o.status} />
                  {o.status === "DRAFT" ? (
                    <Link href={`/offers/${o.id}/preview`}><Button variant="ghost" size="sm"><Eye className="h-4 w-4" /> Review draft</Button></Link>
                  ) : (
                    <a href={`/api/offers/${o.id}/pdf`} target="_blank" rel="noreferrer"><Button variant="ghost" size="sm"><Download className="h-4 w-4" /> PDF</Button></a>
                  )}
                </li>
              ))}
              {intern.certificates.map((c) => (
                <li key={c.id} className="flex items-center gap-3 px-5 py-3">
                  <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600"><Award className="h-4 w-4" /></span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-slate-900">{c.title}</p>
                    <p className="truncate text-xs text-slate-500">{c.number} · {formatDate(c.issueDate)}</p>
                  </div>
                  <StatusBadge status={c.status} />
                  {c.status === "DRAFT" ? (
                    <Link href={`/certificates/${c.id}/preview`}><Button variant="ghost" size="sm"><Eye className="h-4 w-4" /> Review draft</Button></Link>
                  ) : (
                    <>
                      {c.verifyUrl && (
                        <Link href={c.verifyUrl} target="_blank"><Button variant="ghost" size="sm"><QrCode className="h-4 w-4" /> Verify</Button></Link>
                      )}
                      <a href={`/api/certificates/${c.id}/pdf`} target="_blank" rel="noreferrer"><Button variant="ghost" size="sm"><Download className="h-4 w-4" /> PDF</Button></a>
                    </>
                  )}
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
