import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { apiGet } from "@/lib/api";
import type { Template } from "@/lib/types";
import { PageHeader } from "@/components/page-header";
import { AttachDesignForm } from "@/components/attach-design-form";

export const dynamic = "force-dynamic";
export const metadata = { title: "Use Your Own Design" };

export default async function AttachTemplateDesignPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  let template: Template | null = null;
  try {
    template = await apiGet<Template>(`/templates/${id}`);
  } catch {
    notFound();
  }
  if (!template) notFound();

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <Link href="/templates" className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700">
        <ArrowLeft className="h-4 w-4" /> Back to templates
      </Link>
      <PageHeader
        title={template.isCustom ? "Replace design" : "Use your own design"}
        description={`Upload a background for "${template.name}" — it'll be used instead of the built-in layout whenever this template is selected.`}
      />
      <AttachDesignForm template={template} />
    </div>
  );
}
