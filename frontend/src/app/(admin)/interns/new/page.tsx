import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { InternForm } from "@/components/intern-form";
import { createIntern } from "@/lib/actions/interns";

export const metadata = { title: "Add Intern" };

export default function NewInternPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <Link href="/interns" className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700">
        <ArrowLeft className="h-4 w-4" /> Back to interns
      </Link>
      <PageHeader title="Add Intern" description="Create a new intern record." />
      <InternForm action={createIntern} submitLabel="Create intern" />
    </div>
  );
}
