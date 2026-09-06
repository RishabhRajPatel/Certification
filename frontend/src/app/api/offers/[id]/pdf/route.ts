import { NextRequest, NextResponse } from "next/server";
import { apiRaw } from "@/lib/api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const res = await apiRaw(`/offers/${id}/pdf`, { method: "GET" });
  if (!res.ok) {
    return NextResponse.json({ error: "Not found" }, { status: res.status });
  }
  const buf = await res.arrayBuffer();
  return new NextResponse(buf, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": res.headers.get("content-disposition") || 'inline; filename="offer.pdf"',
      "Cache-Control": "private, no-store",
    },
  });
}
