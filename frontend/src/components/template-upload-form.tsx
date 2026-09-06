"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { UploadCloud } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input, Label, Select, Textarea, Hint } from "@/components/ui/field";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import type { Template } from "@/lib/types";

export function TemplateUploadForm({ defaultType }: { defaultType?: "OFFER" | "CERTIFICATE" }) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | undefined>();

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(undefined);
    setPending(true);
    try {
      const fd = new FormData(e.currentTarget);
      const res = await fetch("/api/templates/upload", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Could not upload template.");
        setPending(false);
        return;
      }
      const template = data as Template;
      router.push(`/templates/${template.id}/edit`);
    } catch {
      setError("Could not upload template. Please try again.");
      setPending(false);
    }
  }

  return (
    <form ref={formRef} onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="rounded-md border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>
      )}

      <Card>
        <CardHeader><CardTitle>Template details</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="type">Document type *</Label>
            <Select id="type" name="type" defaultValue={defaultType ?? "CERTIFICATE"} required>
              <option value="CERTIFICATE">Certificate</option>
              <option value="OFFER">Offer letter</option>
            </Select>
          </div>
          <div>
            <Label htmlFor="name">Template name *</Label>
            <Input id="name" name="name" placeholder="e.g. Company Gold Certificate" required />
          </div>
          <div className="sm:col-span-2">
            <Label htmlFor="description">Description</Label>
            <Textarea id="description" name="description" placeholder="Optional short description" />
          </div>
          <div>
            <Label htmlFor="accent">Accent color</Label>
            <Input id="accent" name="accent" type="color" defaultValue="#4F46E5" className="h-10 w-20 p-1" />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Background</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          <Label htmlFor="file">Design file (PNG, JPG, PDF or Word .docx, max 15 MB) *</Label>
          <Input
            id="file"
            name="file"
            type="file"
            accept="image/png,image/jpeg,application/pdf,.docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
            required
          />
          <Hint>Upload the background you want documents printed on — you'll position name, date, QR and signature on top of it next. Word files are converted to PDF automatically on upload.</Hint>
        </CardContent>
      </Card>

      <div className="flex items-center justify-end gap-3">
        <Button type="button" variant="outline" onClick={() => router.push("/templates")} disabled={pending}>
          Cancel
        </Button>
        <Button type="submit" disabled={pending}>
          {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <UploadCloud className="h-4 w-4" />}
          {pending ? "Uploading…" : "Upload & position fields"}
        </Button>
      </div>
    </form>
  );
}
