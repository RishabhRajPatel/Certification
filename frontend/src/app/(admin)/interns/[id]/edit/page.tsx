import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { apiGet } from "@/lib/api";
import type { InternDetail } from "@/lib/types";
import { PageHeader } from "@/components/page-header";
import { InternForm } from "@/components/intern-form";
import { updateIntern } from "@/lib/actions/interns";

export const dynamic = "force-dynamic";
export const metadata = { title: "Edit Intern" };

const toInput = (d: string) => (d ? d.slice(0, 10) : "");

export default async function EditInternPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  let intern: InternDetail | null = null;
  try {
    intern = await apiGet<InternDetail>(`/interns/${id}`);
  } catch {
    notFound();
  }
  if (!intern) notFound();

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <Link href={`/interns/${intern.id}`} className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700">
        <ArrowLeft className="h-4 w-4" /> Back to intern
      </Link>
      <PageHeader title="Edit Intern" description={`Update ${intern.fullName}'s record.`} />
      <InternForm
        action={updateIntern.bind(null, intern.id)}
        submitLabel="Save changes"
        cancelHref={`/interns/${intern.id}`}
        initial={{
          fullName: intern.fullName,
          email: intern.email,
          phone: intern.phone,
          college: intern.college,
          course: intern.course,
          role: intern.role,
          department: intern.department,
          startDate: toInput(intern.startDate),
          endDate: toInput(intern.endDate),
          durationLabel: intern.durationLabel,
          reportingManager: intern.reportingManager,
          stipend: intern.stipend,
          photoUrl: intern.photoUrl,
          status: intern.status,
        }}
      />
    </div>
  );
}
