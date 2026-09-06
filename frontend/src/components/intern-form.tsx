"use client";

import { useActionState } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input, Label, Select, Textarea, FieldError } from "@/components/ui/field";
import { SubmitButton } from "@/components/ui/submit-button";
import { Button } from "@/components/ui/button";
import { INTERN_STATUS, INTERN_STATUS_META } from "@/lib/constants";
import type { FormState } from "@/lib/actions/interns";

export interface InternInitial {
  fullName?: string;
  email?: string;
  phone?: string | null;
  college?: string | null;
  course?: string | null;
  role?: string | null;
  department?: string | null;
  startDate?: string;
  endDate?: string;
  durationLabel?: string | null;
  reportingManager?: string | null;
  stipend?: number | null;
  photoUrl?: string | null;
  status?: string;
}

export function InternForm({
  action,
  initial = {},
  submitLabel = "Save intern",
  cancelHref = "/interns",
}: {
  action: (prev: FormState, fd: FormData) => Promise<FormState>;
  initial?: InternInitial;
  submitLabel?: string;
  cancelHref?: string;
}) {
  const [state, formAction] = useActionState(action, {} as FormState);
  const err = (f: string) => state.fieldErrors?.[f]?.[0];

  return (
    <form action={formAction} className="space-y-6">
      {state.error && (
        <div className="rounded-md border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {state.error}
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Personal details</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <Label htmlFor="fullName">Full name *</Label>
            <Input id="fullName" name="fullName" defaultValue={initial.fullName} placeholder="e.g. Rishabh Raj" required />
            <FieldError>{err("fullName")}</FieldError>
          </div>
          <div>
            <Label htmlFor="email">Email *</Label>
            <Input id="email" name="email" type="email" defaultValue={initial.email} placeholder="name@example.com" required />
            <FieldError>{err("email")}</FieldError>
          </div>
          <div>
            <Label htmlFor="phone">Phone</Label>
            <Input id="phone" name="phone" defaultValue={initial.phone ?? ""} placeholder="+91 …" />
            <FieldError>{err("phone")}</FieldError>
          </div>
          <div>
            <Label htmlFor="photoUrl">Profile photo URL</Label>
            <Input id="photoUrl" name="photoUrl" defaultValue={initial.photoUrl ?? ""} placeholder="https://…" />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Academic</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="college">College / University</Label>
            <Input id="college" name="college" defaultValue={initial.college ?? ""} />
          </div>
          <div>
            <Label htmlFor="course">Course</Label>
            <Input id="course" name="course" defaultValue={initial.course ?? ""} placeholder="e.g. B.Tech CSE" />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Internship</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="role">Internship role</Label>
            <Input id="role" name="role" defaultValue={initial.role ?? ""} placeholder="e.g. Full-Stack Developer Intern" />
          </div>
          <div>
            <Label htmlFor="department">Department</Label>
            <Input id="department" name="department" defaultValue={initial.department ?? ""} placeholder="e.g. Engineering" />
          </div>
          <div>
            <Label htmlFor="startDate">Start date *</Label>
            <Input id="startDate" name="startDate" type="date" defaultValue={initial.startDate} required />
            <FieldError>{err("startDate")}</FieldError>
          </div>
          <div>
            <Label htmlFor="endDate">End date *</Label>
            <Input id="endDate" name="endDate" type="date" defaultValue={initial.endDate} required />
            <FieldError>{err("endDate")}</FieldError>
          </div>
          <div>
            <Label htmlFor="durationLabel">Duration (auto if blank)</Label>
            <Input id="durationLabel" name="durationLabel" defaultValue={initial.durationLabel ?? ""} placeholder="e.g. 3 Months" />
          </div>
          <div>
            <Label htmlFor="reportingManager">Reporting manager</Label>
            <Input id="reportingManager" name="reportingManager" defaultValue={initial.reportingManager ?? ""} />
          </div>
          <div>
            <Label htmlFor="stipend">Stipend (₹ / month, optional)</Label>
            <Input id="stipend" name="stipend" type="number" min={0} defaultValue={initial.stipend ?? ""} placeholder="e.g. 15000" />
            <FieldError>{err("stipend")}</FieldError>
          </div>
          <div>
            <Label htmlFor="status">Status</Label>
            <Select id="status" name="status" defaultValue={initial.status ?? "UPCOMING"}>
              {INTERN_STATUS.map((s) => (
                <option key={s} value={s}>
                  {INTERN_STATUS_META[s].label}
                </option>
              ))}
            </Select>
          </div>
        </CardContent>
      </Card>

      <div className="flex items-center justify-end gap-3">
        <Link href={cancelHref}>
          <Button type="button" variant="outline">Cancel</Button>
        </Link>
        <SubmitButton pendingText="Saving…">{submitLabel}</SubmitButton>
      </div>
    </form>
  );
}
