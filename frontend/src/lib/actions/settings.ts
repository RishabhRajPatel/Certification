"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { apiSend } from "@/lib/api";
import type { FormState } from "./interns";

function str(fd: FormData, k: string): string | undefined {
  const v = fd.get(k);
  if (v == null) return undefined;
  const s = String(v).trim();
  return s === "" ? undefined : s;
}

function bool(fd: FormData, k: string): boolean {
  return fd.get(k) != null;
}

export async function updateSettings(_prev: FormState, formData: FormData): Promise<FormState> {
  const payload = {
    companyName: str(formData, "companyName"),
    companyLogoUrl: str(formData, "companyLogoUrl"),
    companyAddress: str(formData, "companyAddress"),
    companyEmail: str(formData, "companyEmail"),
    companyPhone: str(formData, "companyPhone"),
    companyWebsite: str(formData, "companyWebsite"),
    letterPrefix: str(formData, "letterPrefix"),
    certPrefix: str(formData, "certPrefix"),
    internPrefix: str(formData, "internPrefix"),
    signatureName: str(formData, "signatureName"),
    signatureDesignation: str(formData, "signatureDesignation"),
    signatureImageUrl: str(formData, "signatureImageUrl"),
    stampImageUrl: str(formData, "stampImageUrl"),
    defaultOfferTemplate: str(formData, "defaultOfferTemplate"),
    defaultCertTemplate: str(formData, "defaultCertTemplate"),
    brandColor: str(formData, "brandColor"),
    certEmailAutoSend: bool(formData, "certEmailAutoSend"),
    certEmailSubject: str(formData, "certEmailSubject"),
    certEmailAttachPdf: bool(formData, "certEmailAttachPdf"),
    certEmailIncludeVerifyLink: bool(formData, "certEmailIncludeVerifyLink"),
    offerEmailAutoSend: bool(formData, "offerEmailAutoSend"),
    offerEmailSubject: str(formData, "offerEmailSubject"),
    offerEmailAttachPdf: bool(formData, "offerEmailAttachPdf"),
    offerLetterTemplate: str(formData, "offerLetterTemplate"),
  };
  const res = await apiSend("/settings", "PUT", payload);
  if (!res.ok) return { error: res.error, fieldErrors: res.fieldErrors };
  revalidatePath("/settings");
  revalidatePath("/dashboard");
  redirect("/settings?flash=settings-saved");
}

export async function changePassword(_prev: FormState, formData: FormData): Promise<FormState> {
  const payload = {
    currentPassword: str(formData, "currentPassword"),
    newPassword: str(formData, "newPassword"),
  };
  const res = await apiSend("/auth/change-password", "POST", payload);
  if (!res.ok) return { error: res.error, fieldErrors: res.fieldErrors };
  redirect("/settings?flash=password-changed");
}

export async function revokeOtherSessions() {
  await apiSend("/auth/sessions/revoke-others", "POST");
  revalidatePath("/settings");
  redirect("/settings?flash=sessions-revoked");
}
