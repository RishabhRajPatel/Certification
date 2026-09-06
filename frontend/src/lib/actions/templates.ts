"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { apiSend } from "@/lib/api";
import type { FieldLayout } from "@/lib/types";

export async function setDefaultTemplate(type: "OFFER" | "CERTIFICATE", key: string) {
  await apiSend("/templates/set-default", "POST", { type, key });
  revalidatePath("/templates");
  redirect("/templates?flash=settings-saved");
}

export async function saveTemplateLayout(id: string, layout: Record<string, FieldLayout>) {
  const res = await apiSend(`/templates/${id}/layout`, "PUT", { layout });
  if (!res.ok) return { error: res.error };
  revalidatePath("/templates");
  revalidatePath(`/templates/${id}/edit`);
  return { error: undefined };
}

export async function deleteTemplate(id: string) {
  await apiSend(`/templates/${id}`, "DELETE");
  revalidatePath("/templates");
  redirect("/templates?flash=template-deleted");
}

export async function revertTemplateBackground(id: string) {
  await apiSend(`/templates/${id}/background`, "DELETE");
  revalidatePath("/templates");
  redirect("/templates?flash=design-reverted");
}
