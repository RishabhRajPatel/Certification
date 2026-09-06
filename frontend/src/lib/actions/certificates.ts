"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { apiSend } from "@/lib/api";
import type { FormState } from "./interns";
import type { Cert } from "@/lib/types";

function str(fd: FormData, k: string): string | undefined {
  const v = fd.get(k);
  if (v == null) return undefined;
  const s = String(v).trim();
  return s === "" ? undefined : s;
}

export async function generateCertificate(_prev: FormState, formData: FormData): Promise<FormState> {
  const rating = str(formData, "performanceRating");
  const payload = {
    internId: str(formData, "internId"),
    templateKey: str(formData, "templateKey") ?? "premium",
    certificateType: str(formData, "certificateType") ?? "COMPLETION",
    title: str(formData, "title") ?? "Certificate of Completion",
    role: str(formData, "role"),
    department: str(formData, "department"),
    durationLabel: str(formData, "durationLabel"),
    workMode: str(formData, "workMode"),
    startDate: str(formData, "startDate"),
    endDate: str(formData, "endDate"),
    performanceRating: rating != null ? Number(rating) : undefined,
    skills: str(formData, "skills"),
    remarks: str(formData, "remarks"),
    certificateText: str(formData, "certificateText"),
    expiresAt: str(formData, "expiresAt"),
    authorizedName: str(formData, "authorizedName"),
    authorizedDesignation: str(formData, "authorizedDesignation"),
  };
  const res = await apiSend<Cert>("/certificates", "POST", payload);
  if (!res.ok) return { error: res.error, fieldErrors: res.fieldErrors };
  revalidatePath("/certificates");
  revalidatePath("/documents");
  revalidatePath("/dashboard");
  redirect(`/certificates/${res.data!.id}/preview`);
}

export async function setCertificateStatus(id: string, status: "VALID" | "REVOKED") {
  const path = status === "REVOKED" ? `/certificates/${id}/revoke` : `/certificates/${id}/reinstate`;
  await apiSend(path, "POST");
  revalidatePath("/certificates");
  revalidatePath("/documents");
  redirect(`/certificates?flash=${status === "REVOKED" ? "revoked" : "updated"}`);
}

export async function issueCertificate(id: string) {
  const res = await apiSend<Cert>(`/certificates/${id}/issue`, "POST");
  if (!res.ok) return { error: res.error };
  revalidatePath("/certificates");
  revalidatePath("/documents");
  revalidatePath("/dashboard");
  revalidatePath(`/certificates/${id}/preview`);
  return { error: undefined };
}

export async function sendCertificateEmail(id: string) {
  const res = await apiSend<Cert>(`/certificates/${id}/send-email`, "POST");
  if (!res.ok) return { error: res.error };
  revalidatePath(`/certificates/${id}/preview`);
  return { error: undefined };
}
