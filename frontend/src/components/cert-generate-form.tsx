"use client";

import { useActionState, useMemo, useState } from "react";
import Link from "next/link";
import { Award, CheckCircle2, FileImage, RotateCcw, Star } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input, Label, Select, Textarea, FieldError, Hint } from "@/components/ui/field";
import { SubmitButton } from "@/components/ui/submit-button";
import { Button } from "@/components/ui/button";
import { cn, mediaUrl } from "@/lib/utils";
import { generateCertificate } from "@/lib/actions/certificates";
import type { InternLite } from "@/components/offer-generate-form";
import type { FormState } from "@/lib/actions/interns";
import type { Template } from "@/lib/types";
import {
  CERTIFICATE_TYPE,
  CERTIFICATE_TYPE_LABELS,
  WORK_MODE,
  WORK_MODE_LABELS,
  buildDefaultCertificateText,
} from "@/lib/constants";

export function CertGenerateForm({
  interns,
  templates,
  defaultInternId,
  signatureName,
  signatureDesignation,
  defaultTemplate,
  companyName,
}: {
  interns: (InternLite & { endDate: string })[];
  templates: Template[];
  defaultInternId?: string;
  signatureName: string;
  signatureDesignation: string;
  defaultTemplate: string;
  companyName: string;
}) {
  const [state, formAction] = useActionState(generateCertificate, {} as FormState);
  const [internId, setInternId] = useState(defaultInternId ?? interns[0]?.id ?? "");
  const [template, setTemplate] = useState(defaultTemplate);
  const err = (f: string) => state.fieldErrors?.[f]?.[0];
  const selected = useMemo(() => interns.find((i) => i.id === internId), [interns, internId]);

  const [role, setRole] = useState(selected?.role ?? "");
  const [department, setDepartment] = useState(selected?.department ?? "");
  const [durationLabel, setDurationLabel] = useState(selected?.durationLabel ?? "");
  const [certificateType, setCertificateType] = useState<(typeof CERTIFICATE_TYPE)[number]>("COMPLETION");
  const [workMode, setWorkMode] = useState<(typeof WORK_MODE)[number] | "">("");
  const [performanceRating, setPerformanceRating] = useState<number | undefined>(undefined);
  const [skills, setSkills] = useState("");
  const [remarks, setRemarks] = useState("");

  const autoText = useMemo(
    () =>
      buildDefaultCertificateText({
        role: role || selected?.role || "",
        department: department || undefined,
        workMode: workMode || undefined,
        durationLabel: durationLabel || undefined,
        companyName,
        performanceRating,
        skills: skills || undefined,
        remarks: remarks || undefined,
      }),
    [role, department, workMode, durationLabel, companyName, performanceRating, skills, remarks, selected]
  );

  const [certificateText, setCertificateText] = useState(autoText);
  const [textDirty, setTextDirty] = useState(false);
  const effectiveText = textDirty ? certificateText : autoText;

  function selectIntern(id: string) {
    setInternId(id);
    const i = interns.find((x) => x.id === id);
    setRole(i?.role ?? "");
    setDepartment(i?.department ?? "");
    setDurationLabel(i?.durationLabel ?? "");
  }

  return (
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
                <option key={i.id} value={i.id}>{i.fullName} — {i.internCode}</option>
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
                <span className="text-slate-500">Role</span><span>{selected.role ?? "—"}</span>
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
                    <span className="flex h-8 w-8 items-center justify-center rounded-md text-white" style={{ background: t.accent || "#4F46E5" }}>
                      {t.isCustom ? <FileImage className="h-4 w-4" /> : <Award className="h-4 w-4" />}
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
        <CardHeader><CardTitle>3 · Certificate details</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="certificateType">Certificate type *</Label>
            <input type="hidden" name="certificateType" value={certificateType} />
            <Select
              id="certificateType"
              value={certificateType}
              onChange={(e) => setCertificateType(e.target.value as typeof certificateType)}
              required
            >
              {CERTIFICATE_TYPE.map((ct) => (
                <option key={ct} value={ct}>{CERTIFICATE_TYPE_LABELS[ct]}</option>
              ))}
            </Select>
          </div>
          <div>
            <Label htmlFor="workMode">Work mode</Label>
            <Select id="workMode" name="workMode" value={workMode} onChange={(e) => setWorkMode(e.target.value as typeof workMode)}>
              <option value="">—</option>
              {WORK_MODE.map((m) => (
                <option key={m} value={m}>{WORK_MODE_LABELS[m]}</option>
              ))}
            </Select>
          </div>
          <div className="sm:col-span-2">
            <Label htmlFor="title">Certificate title *</Label>
            <Input id="title" name="title" defaultValue={CERTIFICATE_TYPE_LABELS[certificateType]} key={`title-${certificateType}`} required />
            <FieldError>{err("title")}</FieldError>
          </div>
          <div>
            <Label htmlFor="role">Internship role *</Label>
            <Input id="role" name="role" value={role} onChange={(e) => setRole(e.target.value)} required />
            <FieldError>{err("role")}</FieldError>
          </div>
          <div>
            <Label htmlFor="department">Department</Label>
            <Input id="department" name="department" value={department} onChange={(e) => setDepartment(e.target.value)} />
          </div>
          <div>
            <Label htmlFor="durationLabel">Duration</Label>
            <Input id="durationLabel" name="durationLabel" value={durationLabel} onChange={(e) => setDurationLabel(e.target.value)} />
          </div>
          <div className="hidden sm:block" />
          <div>
            <Label htmlFor="startDate">Start date *</Label>
            <Input id="startDate" name="startDate" type="date" defaultValue={selected?.startDate} key={`sd-${internId}`} required />
            <FieldError>{err("startDate")}</FieldError>
          </div>
          <div>
            <Label htmlFor="endDate">End date *</Label>
            <Input id="endDate" name="endDate" type="date" defaultValue={selected?.endDate} key={`ed-${internId}`} required />
            <FieldError>{err("endDate")}</FieldError>
          </div>
          <div>
            <Label htmlFor="expiresAt">Expiry date (optional)</Label>
            <Input id="expiresAt" name="expiresAt" type="date" />
            <FieldError>{err("expiresAt")}</FieldError>
          </div>
          <div className="hidden sm:block" />
          <div>
            <Label htmlFor="authorizedName">Authorized by *</Label>
            <Input id="authorizedName" name="authorizedName" defaultValue={signatureName} required />
            <FieldError>{err("authorizedName")}</FieldError>
          </div>
          <div>
            <Label htmlFor="authorizedDesignation">Designation *</Label>
            <Input id="authorizedDesignation" name="authorizedDesignation" defaultValue={signatureDesignation} required />
            <FieldError>{err("authorizedDesignation")}</FieldError>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>4 · Performance details</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <Label>Performance rating</Label>
            <input type="hidden" name="performanceRating" value={performanceRating ?? ""} />
            <div className="flex items-center gap-1">
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setPerformanceRating(performanceRating === n ? undefined : n)}
                  className="p-1"
                  aria-label={`${n} star`}
                >
                  <Star
                    className={cn(
                      "h-6 w-6 transition-colors",
                      performanceRating && n <= performanceRating
                        ? "fill-amber-400 text-amber-400"
                        : "text-slate-300"
                    )}
                  />
                </button>
              ))}
              {performanceRating && (
                <span className="ml-2 text-sm text-slate-500">{performanceRating}/5</span>
              )}
            </div>
          </div>
          <div className="sm:col-span-2">
            <Label htmlFor="skills">Skills demonstrated</Label>
            <Input id="skills" name="skills" value={skills} onChange={(e) => setSkills(e.target.value)} placeholder="e.g. React, API design, teamwork" maxLength={300} />
            <Hint>Comma-separated — used in the auto-generated certificate text below.</Hint>
          </div>
          <div className="sm:col-span-2">
            <Label htmlFor="remarks">Remarks (optional)</Label>
            <Textarea id="remarks" name="remarks" value={remarks} onChange={(e) => setRemarks(e.target.value)} className="min-h-[70px]" maxLength={400} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="items-start">
          <div>
            <CardTitle>5 · Certificate content</CardTitle>
          </div>
          {textDirty && (
            <button
              type="button"
              onClick={() => { setCertificateText(autoText); setTextDirty(false); }}
              className="flex items-center gap-1 text-xs font-medium text-brand-700 hover:underline"
            >
              <RotateCcw className="h-3 w-3" /> Reset to auto-generated
            </button>
          )}
        </CardHeader>
        <CardContent>
          <Label htmlFor="certificateText">Certificate text</Label>
          <Textarea
            id="certificateText"
            name="certificateText"
            value={effectiveText}
            onChange={(e) => { setCertificateText(e.target.value); setTextDirty(true); }}
            className="min-h-[110px]"
            maxLength={1200}
          />
          <Hint>Auto-generated from the details above — edit freely, it won&apos;t regenerate once you do.</Hint>
        </CardContent>
      </Card>

      <div className="flex items-center justify-end gap-3">
        <Link href="/certificates"><Button type="button" variant="outline">Cancel</Button></Link>
        <SubmitButton pendingText="Generating…"><Award className="h-4 w-4" /> Generate certificate</SubmitButton>
      </div>
    </form>
  );
}
