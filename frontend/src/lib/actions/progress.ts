"use server";

import { revalidatePath } from "next/cache";
import { apiSend } from "@/lib/api";

export async function toggleProgressTask(taskId: string) {
  await apiSend(`/progress/tasks/${taskId}/toggle`, "POST");
  revalidatePath("/progress");
}

export async function addProgressTask(internId: string, formData: FormData) {
  const title = String(formData.get("title") ?? "").trim();
  if (!title) return;
  await apiSend(`/progress/interns/${internId}/tasks`, "POST", { title });
  revalidatePath("/progress");
  revalidatePath(`/interns/${internId}`);
}

export async function deleteProgressTask(taskId: string) {
  await apiSend(`/progress/tasks/${taskId}`, "DELETE");
  revalidatePath("/progress");
}

export async function updateInternStatus(internId: string, formData: FormData) {
  const status = String(formData.get("status") ?? "");
  if (!status) return;
  await apiSend(`/progress/interns/${internId}/status`, "POST", { status });
  revalidatePath("/progress");
  revalidatePath("/dashboard");
  revalidatePath(`/interns/${internId}`);
}
