"use client";

import { useRef, useState, useTransition } from "react";
import { CheckCircle2, Loader2, Move } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label, Select } from "@/components/ui/field";
import { cn, mediaUrl } from "@/lib/utils";
import { saveTemplateLayout } from "@/lib/actions/templates";
import type { FieldLayout, Template } from "@/lib/types";

const FIELD_LABELS: Record<string, string> = {
  name: "Recipient name",
  role: "Role / position",
  department: "Department",
  duration: "Duration",
  startDate: "Start / joining date",
  endDate: "End date",
  issueDate: "Issue date",
  signatureName: "Signature — name",
  signatureDesignation: "Signature — designation",
  qr: "QR verification code",
};

const OFFER_FIELDS = ["name", "role", "department", "duration", "startDate", "issueDate", "signatureName", "signatureDesignation"];
const CERT_FIELDS = [...OFFER_FIELDS.slice(0, 4), "startDate", "endDate", "issueDate", "signatureName", "signatureDesignation", "qr"];

const DEFAULT_FIELD: FieldLayout = { x: 0.5, y: 0.5, fontSize: 11, align: "center" };
const DEFAULT_QR: FieldLayout = { x: 0.5, y: 0.5, size: 0.09 };

export function TemplateLayoutEditor({ template }: { template: Template }) {
  const fields = template.type === "OFFER" ? OFFER_FIELDS : CERT_FIELDS;
  const [layout, setLayout] = useState<Record<string, FieldLayout>>(() => {
    const initial: Record<string, FieldLayout> = {};
    for (const key of fields) {
      initial[key] = template.layout?.[key] ?? (key === "qr" ? DEFAULT_QR : DEFAULT_FIELD);
    }
    return initial;
  });
  const [selected, setSelected] = useState<string>(fields[0]);
  const [pending, startTransition] = useTransition();
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | undefined>();
  const containerRef = useRef<HTMLDivElement>(null);
  const draggingRef = useRef<string | null>(null);

  const aspect = (template.bgWidthPt ?? 841.89) / (template.bgHeightPt ?? 595.27);

  function updateField(key: string, patch: Partial<FieldLayout>) {
    setLayout((prev) => ({ ...prev, [key]: { ...prev[key], ...patch } }));
    setSaved(false);
  }

  function pointFromEvent(e: React.PointerEvent | PointerEvent): { x: number; y: number } | null {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return null;
    const x = Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width));
    const y = Math.min(1, Math.max(0, (e.clientY - rect.top) / rect.height));
    return { x, y };
  }

  function handlePointerDown(key: string, e: React.PointerEvent) {
    e.preventDefault();
    setSelected(key);
    draggingRef.current = key;
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  }

  function handlePointerMove(e: React.PointerEvent) {
    const key = draggingRef.current;
    if (!key) return;
    const p = pointFromEvent(e);
    if (!p) return;
    updateField(key, { x: Math.round(p.x * 1000) / 1000, y: Math.round(p.y * 1000) / 1000 });
  }

  function handlePointerUp() {
    draggingRef.current = null;
  }

  function handleSave() {
    setError(undefined);
    startTransition(async () => {
      const res = await saveTemplateLayout(template.id, layout);
      if (res.error) setError(res.error);
      else setSaved(true);
    });
  }

  const current = layout[selected] ?? DEFAULT_FIELD;
  const isQr = selected === "qr";

  return (
    <div className="grid grid-cols-1 gap-5 lg:grid-cols-[1fr_320px]">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-1.5"><Move className="h-4 w-4 text-slate-400" /> Drag fields onto the design</CardTitle>
        </CardHeader>
        <CardContent>
          <div
            ref={containerRef}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerLeave={handlePointerUp}
            className="relative w-full select-none overflow-hidden rounded-lg border border-slate-200 bg-slate-100"
            style={{ aspectRatio: aspect }}
          >
            {template.backgroundType === "PDF" ? (
              <embed
                src={mediaUrl(template.backgroundUrl)}
                type="application/pdf"
                className="absolute inset-0 h-full w-full"
                style={{ pointerEvents: "none" }}
              />
            ) : (
              <div
                className="absolute inset-0 h-full w-full bg-cover bg-center"
                style={{ backgroundImage: `url(${mediaUrl(template.backgroundUrl)})` }}
              />
            )}

            {fields.map((key) => {
              const f = layout[key];
              if (!f) return null;
              const active = selected === key;
              return (
                <button
                  key={key}
                  type="button"
                  onPointerDown={(e) => handlePointerDown(key, e)}
                  onClick={() => setSelected(key)}
                  className={cn(
                    "absolute -translate-x-1/2 -translate-y-1/2 cursor-move touch-none whitespace-nowrap rounded-full border px-2.5 py-1 text-[11px] font-medium shadow-sm",
                    active ? "border-brand bg-brand text-brand-fg z-10" : "border-slate-300 bg-white/90 text-slate-700 hover:border-slate-400"
                  )}
                  style={{ left: `${f.x * 100}%`, top: `${f.y * 100}%` }}
                >
                  {FIELD_LABELS[key] ?? key}
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <div className="space-y-4">
        <Card>
          <CardHeader><CardTitle>Field list</CardTitle></CardHeader>
          <CardContent className="space-y-1">
            {fields.map((key) => (
              <button
                key={key}
                type="button"
                onClick={() => setSelected(key)}
                className={cn(
                  "block w-full rounded-md px-3 py-2 text-left text-sm",
                  selected === key ? "bg-brand/10 text-brand-700 font-medium" : "text-slate-600 hover:bg-slate-50"
                )}
              >
                {FIELD_LABELS[key] ?? key}
              </button>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>{FIELD_LABELS[selected] ?? selected}</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {isQr ? (
              <div>
                <Label htmlFor="qr-size">QR size</Label>
                <input
                  id="qr-size"
                  type="range"
                  min={0.04}
                  max={0.2}
                  step={0.005}
                  value={current.size ?? 0.09}
                  onChange={(e) => updateField(selected, { size: Number(e.target.value) })}
                  className="w-full"
                />
              </div>
            ) : (
              <>
                <div>
                  <Label htmlFor="font-size">Font size</Label>
                  <input
                    id="font-size"
                    type="range"
                    min={7}
                    max={40}
                    step={0.5}
                    value={current.fontSize ?? 11}
                    onChange={(e) => updateField(selected, { fontSize: Number(e.target.value) })}
                    className="w-full"
                  />
                </div>
                <div>
                  <Label htmlFor="align">Alignment</Label>
                  <Select
                    id="align"
                    value={current.align ?? "center"}
                    onChange={(e) => updateField(selected, { align: e.target.value as FieldLayout["align"] })}
                  >
                    <option value="left">Left</option>
                    <option value="center">Center</option>
                    <option value="right">Right</option>
                  </Select>
                </div>
                <label className="flex items-center gap-2 text-sm text-slate-700">
                  <input
                    type="checkbox"
                    checked={Boolean(current.bold)}
                    onChange={(e) => updateField(selected, { bold: e.target.checked })}
                  />
                  Bold
                </label>
                <div>
                  <Label htmlFor="color">Color</Label>
                  <input
                    id="color"
                    type="color"
                    value={current.color ?? "#0f172a"}
                    onChange={(e) => updateField(selected, { color: e.target.value })}
                    className="h-9 w-16 rounded border border-slate-300 p-1"
                  />
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {error && <div className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">{error}</div>}

        <Button onClick={handleSave} disabled={pending} className="w-full">
          {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : saved ? <CheckCircle2 className="h-4 w-4" /> : null}
          {pending ? "Saving…" : saved ? "Saved" : "Save positions"}
        </Button>
      </div>
    </div>
  );
}
