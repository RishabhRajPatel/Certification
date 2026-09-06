import { NextRequest, NextResponse } from "next/server";
import { apiUpload } from "@/lib/api";
import type { Template } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Route Handler (not a Server Action) for the same reason as ../upload/route.ts:
// Server Actions cap request bodies at 1MB, too small for a design upload.
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const formData = await req.formData();
  const res = await apiUpload<Template>(`/templates/${id}/background`, formData);
  if (!res.ok) {
    return NextResponse.json({ error: res.error, fieldErrors: res.fieldErrors }, { status: res.status });
  }
  return NextResponse.json(res.data, { status: res.status });
}
