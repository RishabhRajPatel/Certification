import Link from "next/link";
import { FileText, Award, Check, Eye, Plus, Pencil, Trash2, FileImage, UploadCloud } from "lucide-react";
import { apiGet } from "@/lib/api";
import { getSettings } from "@/lib/settings";
import type { Template } from "@/lib/types";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Flash } from "@/components/flash";
import { ConfirmForm } from "@/components/confirm-form";
import { setDefaultTemplate, deleteTemplate, revertTemplateBackground } from "@/lib/actions/templates";
import { mediaUrl } from "@/lib/utils";

export const dynamic = "force-dynamic";
export const metadata = { title: "Templates" };

export default async function TemplatesPage({
  searchParams,
}: {
  searchParams: Promise<{ flash?: string }>;
}) {
  const sp = await searchParams;
  const [templates, settings] = await Promise.all([
    apiGet<Template[]>("/templates"),
    getSettings(),
  ]);
  const all = templates ?? [];
  const offer = all.filter((t) => t.type === "OFFER");
  const cert = all.filter((t) => t.type === "CERTIFICATE");

  function Section({
    title, icon: Icon, items, defaultKey, type, generateHref,
  }: {
    title: string;
    icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>;
    items: Template[];
    defaultKey: string;
    type: "OFFER" | "CERTIFICATE";
    generateHref: string;
  }) {
    return (
      <div>
        <div className="mb-3 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Icon className="h-4 w-4 text-slate-400" />
            <h2 className="text-sm font-semibold text-slate-900">{title}</h2>
          </div>
          <Link href={`/templates/new?type=${type}`}>
            <Button variant="outline" size="sm"><Plus className="h-4 w-4" /> Upload custom</Button>
          </Link>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((t) => {
            const isDefault = t.key === defaultKey;
            const accent = t.accent || "#4F46E5";
            return (
              <Card key={t.id} className="overflow-hidden">
                <div className="relative h-28" style={{ background: `linear-gradient(135deg, ${accent}22, ${accent}05)` }}>
                  {t.isCustom && t.backgroundType === "IMAGE" && t.backgroundUrl ? (
                    <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: `url(${mediaUrl(t.backgroundUrl)})` }} />
                  ) : t.isCustom ? (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="flex h-14 w-20 items-center justify-center rounded-md border-2 bg-white shadow-sm" style={{ borderColor: accent }}>
                        <FileImage className="h-5 w-5" style={{ color: accent }} />
                      </div>
                    </div>
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="flex h-14 w-20 items-center justify-center rounded-md border-2 bg-white shadow-sm" style={{ borderColor: accent }}>
                        <Icon className="h-5 w-5" style={{ color: accent }} />
                      </div>
                    </div>
                  )}
                  <div className="absolute right-2 top-2 flex items-center gap-1.5">
                    {t.isCustom && <Badge className="bg-white/90 text-slate-600 ring-slate-300">Custom</Badge>}
                    {isDefault && (
                      <Badge className="bg-emerald-50 text-emerald-700 ring-emerald-600/20"><Check className="h-3 w-3" /> Default</Badge>
                    )}
                  </div>
                </div>
                <CardContent className="space-y-3">
                  <div>
                    <p className="text-sm font-semibold text-slate-900">{t.name}</p>
                    <p className="mt-0.5 text-xs text-slate-500">{t.description}</p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Link href={generateHref} className="flex-1">
                      <Button variant="outline" size="sm" className="w-full"><Eye className="h-4 w-4" /> Use</Button>
                    </Link>
                    {isDefault ? (
                      <Button size="sm" variant="ghost" disabled className="flex-1">Default</Button>
                    ) : (
                      <form action={setDefaultTemplate.bind(null, type, t.key)} className="flex-1">
                        <Button size="sm" type="submit" className="w-full">Set default</Button>
                      </form>
                    )}
                    {t.isCustom && (
                      <>
                        <Link href={`/templates/${t.id}/edit`}>
                          <Button size="sm" variant="ghost" aria-label="Edit positions"><Pencil className="h-4 w-4" /></Button>
                        </Link>
                        <Link href={`/templates/${t.id}/attach`}>
                          <Button size="sm" variant="ghost" aria-label="Replace design"><UploadCloud className="h-4 w-4" /></Button>
                        </Link>
                      </>
                    )}
                    {t.isCustom && t.key.startsWith("custom-") && (
                      <ConfirmForm
                        action={deleteTemplate.bind(null, t.id)}
                        confirmText={`Delete template "${t.name}"? This cannot be undone.`}
                      >
                        <Button type="submit" size="sm" variant="ghost" className="text-rose-500 hover:bg-rose-50" aria-label="Delete template">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </ConfirmForm>
                    )}
                    {t.isCustom && !t.key.startsWith("custom-") && (
                      <ConfirmForm
                        action={revertTemplateBackground.bind(null, t.id)}
                        confirmText={`Remove the attached design from "${t.name}" and go back to the built-in look?`}
                      >
                        <Button type="submit" size="sm" variant="ghost" className="text-rose-500 hover:bg-rose-50" aria-label="Revert to built-in">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </ConfirmForm>
                    )}
                    {!t.isCustom && (
                      <Link href={`/templates/${t.id}/attach`}>
                        <Button size="sm" variant="ghost" aria-label="Use your own design"><UploadCloud className="h-4 w-4" /> Use my design</Button>
                      </Link>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <PageHeader title="Templates" description="Preview designs and set defaults for offer letters and certificates." />
      <Flash code={sp.flash} />
      <Section title="Offer Letter templates" icon={FileText} items={offer} defaultKey={settings.defaultOfferTemplate} type="OFFER" generateHref="/offers/generate" />
      <Section title="Certificate templates" icon={Award} items={cert} defaultKey={settings.defaultCertTemplate} type="CERTIFICATE" generateHref="/certificates/generate" />
    </div>
  );
}
