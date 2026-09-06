import "server-only";
import { redirect } from "next/navigation";
import { apiGet } from "./api";
import type { Me } from "./types";

export async function getCurrentUser(): Promise<Me | null> {
  return apiGet<Me>("/auth/me", { redirectOnUnauthorized: false });
}

export async function requireUser(): Promise<Me> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}
