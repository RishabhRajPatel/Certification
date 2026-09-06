import { NextRequest, NextResponse } from "next/server";
import { apiUpload } from "@/lib/api";
import type { Template } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// A Route Handler rather than a Server Action: Server Actions default to a
// 1MB request body cap, too small for uploaded template backgrounds.
export async function POST(req: NextRequest) {
  const formData = await req.formData();
  const res = await apiUpload<Template>("/templates/upload", formData);
  if (!res.ok) {
    return NextResponse.json({ error: res.error, fieldErrors: res.fieldErrors }, { status: res.status });
  }
  return NextResponse.json(res.data, { status: res.status });
}
