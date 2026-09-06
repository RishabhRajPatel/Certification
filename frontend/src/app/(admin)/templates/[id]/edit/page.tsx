import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, UploadCloud } from "lucide-react";
import { apiGet } from "@/lib/api";
import type { Template } from "@/lib/types";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { TemplateLayoutEditor } from "@/components/template-layout-editor";

export const dynamic = "force-dynamic";
export const metadata = { title: "Position Template Fields" };

export default async function EditTemplatePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  let template: Template | null = null;
  try {
    template = await apiGet<Template>(`/templates/${id}`);
  } catch {
    notFound();
  }
  if (!template || !template.isCustom) notFound();

  return (
    <div className="space-y-5">
      <Link href="/templates" className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700">
        <ArrowLeft className="h-4 w-4" /> Back to templates
      </Link>
      <PageHeader title={`Position fields — ${template.name}`} description="Drag each field onto your design, then save.">
        <Link href={`/templates/${template.id}/attach`}>
          <Button variant="outline" size="sm"><UploadCloud className="h-4 w-4" /> Replace design</Button>
        </Link>
      </PageHeader>
      <TemplateLayoutEditor template={template} />
    </div>
  );
}
