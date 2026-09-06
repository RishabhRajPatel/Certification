"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, X } from "lucide-react";

const MESSAGES: Record<string, string> = {
  created: "Record created successfully.",
  updated: "Changes saved successfully.",
  deleted: "Record deleted.",
  "intern-created": "Intern added successfully.",
  "offer-generated": "Offer letter generated.",
  "cert-generated": "Certificate generated.",
  "settings-saved": "Settings updated.",
  "password-changed": "Password changed successfully.",
  "sessions-revoked": "Other sessions have been signed out.",
  revoked: "Document revoked.",
  "template-uploaded": "Template uploaded. Position its fields, then save.",
  "template-deleted": "Template deleted.",
  "design-reverted": "Reverted to the built-in design.",
};

export function Flash({ code }: { code?: string }) {
  const [visible, setVisible] = useState(Boolean(code && MESSAGES[code]));

  useEffect(() => {
    if (!visible) return;
    const t = setTimeout(() => setVisible(false), 4000);
    return () => clearTimeout(t);
  }, [visible]);

  if (!visible || !code || !MESSAGES[code]) return null;

  return (
    <div className="flex items-center gap-2.5 rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800 animate-fade-in">
      <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
      <span className="flex-1">{MESSAGES[code]}</span>
      <button onClick={() => setVisible(false)} className="text-emerald-500 hover:text-emerald-700" aria-label="Dismiss">
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
