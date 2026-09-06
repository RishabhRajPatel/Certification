"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { UploadCloud, Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input, Label, Hint } from "@/components/ui/field";
import { Button } from "@/components/ui/button";
import type { Template } from "@/lib/types";

export function AttachDesignForm({ template }: { template: Template }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | undefined>();

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(undefined);
    setPending(true);
    try {
      const fd = new FormData(e.currentTarget);
      const res = await fetch(`/api/templates/${template.id}/background`, { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Could not attach design.");
        setPending(false);
        return;
      }
      router.push(`/templates/${template.id}/edit`);
    } catch {
      setError("Could not attach design. Please try again.");
      setPending(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="rounded-md border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>
      )}

      <Card>
        <CardHeader><CardTitle>{template.name}</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          <Label htmlFor="file">Design file (PNG, JPG, PDF or Word .docx, max 15 MB) *</Label>
          <Input
            id="file"
            name="file"
            type="file"
            accept="image/png,image/jpeg,application/pdf,.docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
            required
          />
          <Hint>
            {template.isCustom
              ? "This replaces the current design — your field positions carry over."
              : `This turns "${template.name}" into your own design instead of the built-in layout. You'll position fields on it next.`}
          </Hint>
        </CardContent>
      </Card>

      <div className="flex items-center justify-end gap-3">
        <Button type="button" variant="outline" onClick={() => router.push("/templates")} disabled={pending}>
          Cancel
        </Button>
        <Button type="submit" disabled={pending}>
          {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <UploadCloud className="h-4 w-4" />}
          {pending ? "Uploading…" : "Use this design"}
        </Button>
      </div>
    </form>
  );
}
