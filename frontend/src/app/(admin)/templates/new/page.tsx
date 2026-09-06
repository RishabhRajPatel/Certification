import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { TemplateUploadForm } from "@/components/template-upload-form";

export const metadata = { title: "Upload Template" };

export default async function NewTemplatePage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string }>;
}) {
  const { type } = await searchParams;
  const defaultType = type === "OFFER" ? "OFFER" : type === "CERTIFICATE" ? "CERTIFICATE" : undefined;

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <Link href="/templates" className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700">
        <ArrowLeft className="h-4 w-4" /> Back to templates
      </Link>
      <PageHeader title="Upload custom template" description="Bring your own certificate or offer letter design." />
      <TemplateUploadForm defaultType={defaultType} />
    </div>
  );
}
