"use client";

import { useActionState, useState } from "react";
import { Building2, FileSignature, ShieldCheck, Monitor, Mail, FileText, RotateCcw } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input, Label, Textarea, Select, FieldError, Hint } from "@/components/ui/field";
import { SubmitButton } from "@/components/ui/submit-button";
import { Button } from "@/components/ui/button";
import { OFFER_TEMPLATES, CERT_TEMPLATES, OFFER_LETTER_VARIABLES, DEFAULT_OFFER_LETTER_TEMPLATE } from "@/lib/constants";
import { formatDate } from "@/lib/utils";
import { updateSettings, changePassword, revokeOtherSessions } from "@/lib/actions/settings";
import type { FormState } from "@/lib/actions/interns";
import type { Settings, SessionInfo } from "@/lib/types";

export function SettingsClient({
  settings,
  sessions,
}: {
  settings: Settings;
  sessions: SessionInfo[];
}) {
  const [sState, sAction] = useActionState(updateSettings, {} as FormState);
  const [pState, pAction] = useActionState(changePassword, {} as FormState);
  const sErr = (f: string) => sState.fieldErrors?.[f]?.[0];
  const [offerLetterTemplate, setOfferLetterTemplate] = useState(settings.offerLetterTemplate || DEFAULT_OFFER_LETTER_TEMPLATE);

  return (
    <div className="space-y-6">
      {/* Company + document settings */}
      <form action={sAction} className="space-y-6">
        {sState.error && <div className="rounded-md border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{sState.error}</div>}

        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><Building2 className="h-4 w-4 text-slate-400" /> Company profile</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <Label htmlFor="companyName">Company name *</Label>
              <Input id="companyName" name="companyName" defaultValue={settings.companyName} required />
              <FieldError>{sErr("companyName")}</FieldError>
            </div>
            <div><Label htmlFor="companyEmail">Email</Label><Input id="companyEmail" name="companyEmail" type="email" defaultValue={settings.companyEmail ?? ""} /><FieldError>{sErr("companyEmail")}</FieldError></div>
            <div><Label htmlFor="companyPhone">Phone</Label><Input id="companyPhone" name="companyPhone" defaultValue={settings.companyPhone ?? ""} /></div>
            <div><Label htmlFor="companyWebsite">Website</Label><Input id="companyWebsite" name="companyWebsite" defaultValue={settings.companyWebsite ?? ""} /></div>
            <div><Label htmlFor="companyLogoUrl">Logo URL</Label><Input id="companyLogoUrl" name="companyLogoUrl" defaultValue={settings.companyLogoUrl ?? ""} /></div>
            <div className="sm:col-span-2"><Label htmlFor="companyAddress">Address</Label><Textarea id="companyAddress" name="companyAddress" defaultValue={settings.companyAddress ?? ""} /></div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><FileSignature className="h-4 w-4 text-slate-400" /> Document settings</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div><Label htmlFor="letterPrefix">Offer prefix *</Label><Input id="letterPrefix" name="letterPrefix" defaultValue={settings.letterPrefix} required /></div>
            <div><Label htmlFor="certPrefix">Certificate prefix *</Label><Input id="certPrefix" name="certPrefix" defaultValue={settings.certPrefix} required /></div>
            <div><Label htmlFor="internPrefix">Intern prefix *</Label><Input id="internPrefix" name="internPrefix" defaultValue={settings.internPrefix} required /></div>
            <div><Label htmlFor="signatureName">Signatory name *</Label><Input id="signatureName" name="signatureName" defaultValue={settings.signatureName} required /></div>
            <div><Label htmlFor="signatureDesignation">Signatory designation *</Label><Input id="signatureDesignation" name="signatureDesignation" defaultValue={settings.signatureDesignation} required /></div>
            <div>
              <Label htmlFor="brandColor">Brand color *</Label>
              <div className="flex items-center gap-2">
                <input type="color" defaultValue={settings.brandColor} onChange={(e) => { const t = document.getElementById("brandColor") as HTMLInputElement; if (t) t.value = e.target.value; }} className="h-10 w-12 rounded-md border border-slate-300" />
                <Input id="brandColor" name="brandColor" defaultValue={settings.brandColor} required className="font-mono" />
              </div>
              <FieldError>{sErr("brandColor")}</FieldError>
            </div>
            <div>
              <Label htmlFor="defaultOfferTemplate">Default offer template</Label>
              <Select id="defaultOfferTemplate" name="defaultOfferTemplate" defaultValue={settings.defaultOfferTemplate}>
                {OFFER_TEMPLATES.map((t) => <option key={t.key} value={t.key}>{t.name}</option>)}
              </Select>
            </div>
            <div>
              <Label htmlFor="defaultCertTemplate">Default certificate template</Label>
              <Select id="defaultCertTemplate" name="defaultCertTemplate" defaultValue={settings.defaultCertTemplate}>
                {CERT_TEMPLATES.map((t) => <option key={t.key} value={t.key}>{t.name}</option>)}
              </Select>
            </div>
            <div><Label htmlFor="signatureImageUrl">Signature image URL</Label><Input id="signatureImageUrl" name="signatureImageUrl" defaultValue={settings.signatureImageUrl ?? ""} /></div>
            <div><Label htmlFor="stampImageUrl">Stamp image URL</Label><Input id="stampImageUrl" name="stampImageUrl" defaultValue={settings.stampImageUrl ?? ""} /></div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><Mail className="h-4 w-4 text-slate-400" /> Email automation</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            <div className="space-y-3">
              <p className="text-sm font-semibold text-slate-900">Certificate</p>
              <label className="flex items-center gap-2 text-sm text-slate-700">
                <input type="checkbox" name="certEmailAutoSend" defaultChecked={settings.certEmailAutoSend} />
                Automatically send after issuing
              </label>
              <div>
                <Label htmlFor="certEmailSubject">Subject</Label>
                <Input id="certEmailSubject" name="certEmailSubject" defaultValue={settings.certEmailSubject} required />
              </div>
              <label className="flex items-center gap-2 text-sm text-slate-700">
                <input type="checkbox" name="certEmailAttachPdf" defaultChecked={settings.certEmailAttachPdf} />
                Attach certificate PDF
              </label>
              <label className="flex items-center gap-2 text-sm text-slate-700">
                <input type="checkbox" name="certEmailIncludeVerifyLink" defaultChecked={settings.certEmailIncludeVerifyLink} />
                Include verification link
              </label>
            </div>
            <div className="space-y-3">
              <p className="text-sm font-semibold text-slate-900">Offer letter</p>
              <label className="flex items-center gap-2 text-sm text-slate-700">
                <input type="checkbox" name="offerEmailAutoSend" defaultChecked={settings.offerEmailAutoSend} />
                Automatically send after issuing
              </label>
              <div>
                <Label htmlFor="offerEmailSubject">Subject</Label>
                <Input id="offerEmailSubject" name="offerEmailSubject" defaultValue={settings.offerEmailSubject} required />
              </div>
              <label className="flex items-center gap-2 text-sm text-slate-700">
                <input type="checkbox" name="offerEmailAttachPdf" defaultChecked={settings.offerEmailAttachPdf} />
                Attach offer letter PDF
              </label>
            </div>
            <div className="sm:col-span-2">
              <Hint>
                Available in the subject line: {"{{document_type}}"}, {"{{candidate_name}}"}, {"{{company_name}}"}, {"{{document_id}}"}, {"{{job_title}}"}, {"{{course_name}}"}
              </Hint>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="items-start">
            <CardTitle className="flex items-center gap-2"><FileText className="h-4 w-4 text-slate-400" /> Offer letter template</CardTitle>
            <button
              type="button"
              onClick={() => setOfferLetterTemplate(DEFAULT_OFFER_LETTER_TEMPLATE)}
              className="flex items-center gap-1 text-xs font-medium text-brand-700 hover:underline"
            >
              <RotateCcw className="h-3 w-3" /> Reset to default
            </button>
          </CardHeader>
          <CardContent className="space-y-2">
            <Label htmlFor="offerLetterTemplate">Master template</Label>
            <Textarea
              id="offerLetterTemplate"
              name="offerLetterTemplate"
              value={offerLetterTemplate}
              onChange={(e) => setOfferLetterTemplate(e.target.value)}
              className="min-h-[160px] font-mono text-sm"
              required
            />
            <FieldError>{sErr("offerLetterTemplate")}</FieldError>
            <Hint>
              Blank lines start a new paragraph. Available variables:{" "}
              {OFFER_LETTER_VARIABLES.map((v) => `{{${v}}}`).join(", ")}
            </Hint>
          </CardContent>
        </Card>

        <div className="flex justify-end"><SubmitButton pendingText="Saving…">Save settings</SubmitButton></div>
      </form>

      {/* Security */}
      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-slate-400" /> Change password</CardTitle></CardHeader>
        <CardContent>
          <form action={pAction} className="grid max-w-md grid-cols-1 gap-4">
            {pState.error && <div className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{pState.error}</div>}
            <div><Label htmlFor="currentPassword">Current password</Label><Input id="currentPassword" name="currentPassword" type="password" required /></div>
            <div><Label htmlFor="newPassword">New password</Label><Input id="newPassword" name="newPassword" type="password" required /><p className="mt-1 text-xs text-slate-500">Min 8 chars with upper, lower &amp; a number.</p></div>
            <div><SubmitButton pendingText="Updating…" variant="secondary">Update password</SubmitButton></div>
          </form>
        </CardContent>
      </Card>

      {/* Active sessions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Monitor className="h-4 w-4 text-slate-400" /> Active sessions</CardTitle>
          <form action={revokeOtherSessions}><Button type="submit" variant="outline" size="sm">Sign out other sessions</Button></form>
        </CardHeader>
        <CardContent className="p-0">
          <ul className="divide-y divide-slate-100">
            {sessions.map((s) => (
              <li key={s.jti} className="flex items-center justify-between px-5 py-3 text-sm">
                <div className="min-w-0">
                  <p className="truncate font-medium text-slate-800">{s.userAgent ?? "Unknown device"}</p>
                  <p className="text-xs text-slate-500">{s.ip ?? "—"} · since {formatDate(s.createdAt)}</p>
                </div>
                {s.current && <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-700 ring-1 ring-inset ring-emerald-600/20">This device</span>}
              </li>
            ))}
            {sessions.length === 0 && <li className="px-5 py-4 text-sm text-slate-400">No active sessions.</li>}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
