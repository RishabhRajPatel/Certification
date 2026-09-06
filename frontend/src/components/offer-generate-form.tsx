"use client";

import { useActionState, useMemo, useState } from "react";
import Link from "next/link";
import { FileText, CheckCircle2, FileImage, Star } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input, Label, Select, Textarea, FieldError, Hint } from "@/components/ui/field";
import { SubmitButton } from "@/components/ui/submit-button";
import { Button } from "@/components/ui/button";
import { cn, formatDateLong, mediaUrl } from "@/lib/utils";
import { generateOffer } from "@/lib/actions/offers";
import type { FormState } from "@/lib/actions/interns";
import type { Template } from "@/lib/types";
import {
  COMPENSATION_TYPE,
  COMPENSATION_TYPE_META,
  EVALUATION_FREQUENCY,
  type CompensationType,
  buildOfferLetterVariables,
  renderOfferLetterParagraphs,
  DEFAULT_OFFER_LETTER_TEMPLATE,
} from "@/lib/constants";

export interface InternLite {
  id: string;
  fullName: string;
  internCode: string;
  email: string;
  college?: string | null;
  role?: string | null;
  department?: string | null;
  durationLabel?: string | null;
  startDate: string; // yyyy-mm-dd
}

export function OfferGenerateForm({
  interns,
  templates,
  defaultInternId,
  signatureName,
  signatureDesignation,
  defaultTemplate,
  defaultTerms,
  companyName,
  offerLetterTemplate,
}: {
  interns: InternLite[];
  templates: Template[];
  defaultInternId?: string;
  signatureName: string;
  signatureDesignation: string;
  defaultTemplate: string;
  defaultTerms: string;
  companyName: string;
  offerLetterTemplate?: string;
}) {
  const [state, formAction] = useActionState(generateOffer, {} as FormState);
  const [internId, setInternId] = useState(defaultInternId ?? interns[0]?.id ?? "");
  const [template, setTemplate] = useState(defaultTemplate);
  const [compensationType, setCompensationType] = useState<CompensationType>("FIXED");
  const err = (f: string) => state.fieldErrors?.[f]?.[0];

  const selected = useMemo(() => interns.find((i) => i.id === internId), [interns, internId]);

  const [position, setPosition] = useState(selected?.role ?? "");
  const [department, setDepartment] = useState(selected?.department ?? "");
  const [durationLabel, setDurationLabel] = useState(selected?.durationLabel ?? "");
  const [joiningDate, setJoiningDate] = useState(selected?.startDate ?? "");
  const [stipend, setStipend] = useState("");
  const [authorizedName, setAuthorizedName] = useState(signatureName);
  const [authorizedDesignation, setAuthorizedDesignation] = useState(signatureDesignation);

  function selectIntern(id: string) {
    setInternId(id);
    const i = interns.find((x) => x.id === id);
    setPosition(i?.role ?? "");
    setDepartment(i?.department ?? "");
    setDurationLabel(i?.durationLabel ?? "");
    setJoiningDate(i?.startDate ?? "");
  }

  const previewText = useMemo(() => {
    const vars = buildOfferLetterVariables({
      candidateName: selected?.fullName ?? "",
      position,
      department,
      companyName,
      joiningDate: joiningDate ? formatDateLong(joiningDate) : undefined,
      duration: durationLabel,
      stipend: stipend ? Number(stipend) : undefined,
      compensationType,
      authorizedBy: authorizedName,
      designation: authorizedDesignation,
    });
    return renderOfferLetterParagraphs(offerLetterTemplate || DEFAULT_OFFER_LETTER_TEMPLATE, vars);
  }, [selected, position, department, companyName, joiningDate, durationLabel, stipend, compensationType, authorizedName, authorizedDesignation, offerLetterTemplate]);

  return (
    <div className="grid grid-cols-1 gap-5 lg:grid-cols-[1fr_380px]">
      <form action={formAction} className="space-y-6">
        {state.error && (
          <div className="rounded-md border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {state.error}
          </div>
        )}

        <Card>
          <CardHeader><CardTitle>1 · Select intern</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="internId">Intern *</Label>
              <Select id="internId" name="internId" value={internId} onChange={(e) => selectIntern(e.target.value)} required>
                <option value="" disabled>Select an intern…</option>
                {interns.map((i) => (
                  <option key={i.id} value={i.id}>
                    {i.fullName} — {i.internCode}
                  </option>
                ))}
              </Select>
              <FieldError>{err("internId")}</FieldError>
            </div>

            {selected && (
              <div className="rounded-md border border-slate-200 bg-slate-50 p-4 text-sm">
                <p className="mb-2 flex items-center gap-1.5 text-xs font-medium text-slate-500">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" /> Verify details
                </p>
                <div className="grid grid-cols-2 gap-2 text-slate-700">
                  <span className="text-slate-500">Email</span><span>{selected.email}</span>
                  <span className="text-slate-500">College</span><span>{selected.college ?? "—"}</span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>2 · Choose template</CardTitle></CardHeader>
          <CardContent>
            <input type="hidden" name="templateKey" value={template} />
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              {templates.map((t) => (
                <button
                  type="button"
                  key={t.key}
                  onClick={() => setTemplate(t.key)}
                  className={cn(
                    "overflow-hidden rounded-lg border text-left transition-all",
                    template === t.key ? "border-brand ring-2 ring-brand/30 bg-brand/5" : "border-slate-200 hover:border-slate-300"
                  )}
                >
                  {t.isCustom && t.backgroundType === "IMAGE" && t.backgroundUrl && (
                    <div className="h-16 bg-cover bg-center" style={{ backgroundImage: `url(${mediaUrl(t.backgroundUrl)})` }} />
                  )}
                  <div className="p-4">
                    <div className="mb-2 flex items-center justify-between">
                      <span className="flex h-8 w-8 items-center justify-center rounded-md bg-brand/10 text-brand-700">
                        {t.isCustom ? <FileImage className="h-4 w-4" /> : <FileText className="h-4 w-4" />}
                      </span>
                      {template === t.key && <CheckCircle2 className="h-4 w-4 text-brand" />}
                    </div>
                    <p className="text-sm font-semibold text-slate-900">{t.name}</p>
                    <p className="mt-0.5 text-xs text-slate-500">{t.description}</p>
                  </div>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>3 · Offer details</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <Label htmlFor="position">Position *</Label>
              <Input id="position" name="position" value={position} onChange={(e) => setPosition(e.target.value)} placeholder="e.g. Full-Stack Developer Intern" required />
              <FieldError>{err("position")}</FieldError>
            </div>
            <div>
              <Label htmlFor="department">Department</Label>
              <Input id="department" name="department" value={department} onChange={(e) => setDepartment(e.target.value)} />
            </div>
            <div>
              <Label htmlFor="durationLabel">Duration</Label>
              <Input id="durationLabel" name="durationLabel" value={durationLabel} onChange={(e) => setDurationLabel(e.target.value)} placeholder="e.g. 3 Months" />
            </div>
            <div>
              <Label htmlFor="joiningDate">Joining date *</Label>
              <Input id="joiningDate" name="joiningDate" type="date" value={joiningDate} onChange={(e) => setJoiningDate(e.target.value)} required />
              <FieldError>{err("joiningDate")}</FieldError>
            </div>
            <div className="sm:col-span-2">
              <Label>Compensation Type *</Label>
              <input type="hidden" name="compensationType" value={compensationType} />
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                {COMPENSATION_TYPE.map((ct) => {
                  const meta = COMPENSATION_TYPE_META[ct];
                  return (
                    <button
                      type="button"
                      key={ct}
                      onClick={() => setCompensationType(ct)}
                      className={cn(
                        "rounded-lg border p-3 text-left transition-all",
                        compensationType === ct ? "border-brand ring-2 ring-brand/30 bg-brand/5" : "border-slate-200 hover:border-slate-300"
                      )}
                    >
                      <div className="mb-1 flex items-center justify-between">
                        <span className="flex items-center gap-1 text-sm font-semibold text-slate-900">
                          {meta.label}
                          {meta.recommended && <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />}
                        </span>
                        {compensationType === ct && <CheckCircle2 className="h-4 w-4 text-brand" />}
                      </div>
                      <p className="text-xs text-slate-500">{meta.description}</p>
                    </button>
                  );
                })}
              </div>
              <FieldError>{err("compensationType")}</FieldError>
            </div>

            {compensationType === "FIXED" && (
              <div>
                <Label htmlFor="stipend">Monthly stipend (₹) *</Label>
                <Input id="stipend" name="stipend" type="number" min={1} value={stipend} onChange={(e) => setStipend(e.target.value)} placeholder="e.g. 10000" required />
                <FieldError>{err("stipend")}</FieldError>
              </div>
            )}

            {compensationType === "PERFORMANCE" && (
              <>
                <div className="sm:col-span-2">
                  <Label htmlFor="performanceCriteria">Performance criteria *</Label>
                  <Textarea
                    id="performanceCriteria"
                    name="performanceCriteria"
                    defaultValue="Based on work quality, targets and overall performance"
                    required
                  />
                  <FieldError>{err("performanceCriteria")}</FieldError>
                </div>
                <div>
                  <Label htmlFor="evaluationFrequency">Evaluation frequency *</Label>
                  <Select id="evaluationFrequency" name="evaluationFrequency" defaultValue="Monthly" required>
                    {EVALUATION_FREQUENCY.map((f) => (
                      <option key={f} value={f}>{f}</option>
                    ))}
                  </Select>
                  <FieldError>{err("evaluationFrequency")}</FieldError>
                </div>
                <div>
                  <Label htmlFor="stipend">Maximum incentive / stipend (optional)</Label>
                  <Input id="stipend" name="stipend" type="number" min={0} value={stipend} onChange={(e) => setStipend(e.target.value)} placeholder="e.g. 10000" />
                  <Hint>Shown internally only — the offer letter uses evaluation-based wording, not a guaranteed amount.</Hint>
                </div>
              </>
            )}

            <div>
              <Label htmlFor="authorizedName">Authorized by *</Label>
              <Input id="authorizedName" name="authorizedName" value={authorizedName} onChange={(e) => setAuthorizedName(e.target.value)} required />
              <FieldError>{err("authorizedName")}</FieldError>
            </div>
            <div>
              <Label htmlFor="authorizedDesignation">Designation *</Label>
              <Input id="authorizedDesignation" name="authorizedDesignation" value={authorizedDesignation} onChange={(e) => setAuthorizedDesignation(e.target.value)} required />
              <FieldError>{err("authorizedDesignation")}</FieldError>
            </div>
            <div className="sm:col-span-2">
              <Label htmlFor="terms">Terms &amp; conditions (one per line)</Label>
              <Textarea id="terms" name="terms" defaultValue={defaultTerms} className="min-h-[120px]" />
            </div>
          </CardContent>
        </Card>

        <div className="flex items-center justify-end gap-3">
          <Link href="/offers"><Button type="button" variant="outline">Cancel</Button></Link>
          <SubmitButton pendingText="Generating…"><FileText className="h-4 w-4" /> Generate offer letter</SubmitButton>
        </div>
      </form>

      <div className="lg:sticky lg:top-5 lg:self-start">
        <Card>
          <CardHeader><CardTitle>Live preview</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-3 rounded-md border border-slate-200 bg-slate-50 p-4 text-sm leading-relaxed text-slate-700">
              {previewText.map((para, i) => <p key={i}>{para}</p>)}
            </div>
            <Hint>Uses the master template from Settings → Offer letter template.</Hint>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
