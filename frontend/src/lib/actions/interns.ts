"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { apiSend } from "@/lib/api";
import type { Intern } from "@/lib/types";

export type FormState = {
  ok?: boolean;
  error?: string;
  fieldErrors?: Record<string, string[]>;
};

function str(fd: FormData, k: string): string | undefined {
  const v = fd.get(k);
  if (v == null) return undefined;
  const s = String(v).trim();
  return s === "" ? undefined : s;
}

function internPayload(fd: FormData) {
  const stipend = str(fd, "stipend");
  return {
    fullName: str(fd, "fullName"),
    email: str(fd, "email"),
    phone: str(fd, "phone"),
    college: str(fd, "college"),
    course: str(fd, "course"),
    role: str(fd, "role"),
    department: str(fd, "department"),
    startDate: str(fd, "startDate"),
    endDate: str(fd, "endDate"),
    durationLabel: str(fd, "durationLabel"),
    reportingManager: str(fd, "reportingManager"),
    stipend: stipend != null ? Number(stipend) : undefined,
    photoUrl: str(fd, "photoUrl"),
    status: str(fd, "status") ?? "UPCOMING",
  };
}

export async function createIntern(_prev: FormState, formData: FormData): Promise<FormState> {
  const res = await apiSend<Intern>("/interns", "POST", internPayload(formData));
  if (!res.ok) return { error: res.error, fieldErrors: res.fieldErrors };
  revalidatePath("/interns");
  revalidatePath("/dashboard");
  redirect(`/interns/${res.data!.id}?flash=created`);
}

export async function updateIntern(id: string, _prev: FormState, formData: FormData): Promise<FormState> {
  const res = await apiSend<Intern>(`/interns/${id}`, "PUT", internPayload(formData));
  if (!res.ok) return { error: res.error, fieldErrors: res.fieldErrors };
  revalidatePath("/interns");
  revalidatePath(`/interns/${id}`);
  revalidatePath("/dashboard");
  redirect(`/interns/${id}?flash=updated`);
}

export async function deleteIntern(id: string) {
  await apiSend(`/interns/${id}`, "DELETE");
  revalidatePath("/interns");
  revalidatePath("/dashboard");
  redirect("/interns?flash=deleted");
}
