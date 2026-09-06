"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { apiSend } from "@/lib/api";
import type { FormState } from "./interns";
import type { Offer } from "@/lib/types";

function str(fd: FormData, k: string): string | undefined {
  const v = fd.get(k);
  if (v == null) return undefined;
  const s = String(v).trim();
  return s === "" ? undefined : s;
}

export async function generateOffer(_prev: FormState, formData: FormData): Promise<FormState> {
  const stipend = str(formData, "stipend");
  const payload = {
    internId: str(formData, "internId"),
    templateKey: str(formData, "templateKey") ?? "corporate",
    position: str(formData, "position"),
    department: str(formData, "department"),
    durationLabel: str(formData, "durationLabel"),
    joiningDate: str(formData, "joiningDate"),
    compensationType: str(formData, "compensationType") ?? "FIXED",
    stipend: stipend != null ? Number(stipend) : undefined,
    performanceCriteria: str(formData, "performanceCriteria"),
    evaluationFrequency: str(formData, "evaluationFrequency"),
    authorizedName: str(formData, "authorizedName"),
    authorizedDesignation: str(formData, "authorizedDesignation"),
    terms: str(formData, "terms"),
  };
  const res = await apiSend<Offer>("/offers", "POST", payload);
  if (!res.ok) return { error: res.error, fieldErrors: res.fieldErrors };
  revalidatePath("/offers");
  revalidatePath("/documents");
  revalidatePath("/dashboard");
  redirect(`/offers/${res.data!.id}/preview`);
}

export async function voidOffer(id: string) {
  await apiSend(`/offers/${id}/void`, "POST");
  revalidatePath("/offers");
  revalidatePath("/documents");
  redirect("/offers?flash=revoked");
}

export async function issueOffer(id: string) {
  const res = await apiSend<Offer>(`/offers/${id}/issue`, "POST");
  if (!res.ok) return { error: res.error };
  revalidatePath("/offers");
  revalidatePath("/documents");
  revalidatePath("/dashboard");
  revalidatePath(`/offers/${id}/preview`);
  return { error: undefined };
}

export async function sendOfferEmail(id: string) {
  const res = await apiSend<Offer>(`/offers/${id}/send-email`, "POST");
  if (!res.ok) return { error: res.error };
  revalidatePath(`/offers/${id}/preview`);
  return { error: undefined };
}
