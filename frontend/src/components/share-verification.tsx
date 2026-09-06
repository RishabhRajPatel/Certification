"use client";

import { useState } from "react";
import { Copy, CheckCircle2, MessageCircle, Linkedin, Mail } from "lucide-react";
import { cn } from "@/lib/utils";

export function ShareVerification({ url, title }: { url: string; title: string }) {
  const [copied, setCopied] = useState(false);

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard API can be unavailable (e.g. insecure context) — fail silently.
    }
  }

  const shareText = encodeURIComponent(`${title} — verify this credential:`);
  const encodedUrl = encodeURIComponent(url);

  const links = [
    { label: "WhatsApp", icon: MessageCircle, href: `https://wa.me/?text=${shareText}%20${encodedUrl}` },
    { label: "LinkedIn", icon: Linkedin, href: `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}` },
    { label: "Email", icon: Mail, href: `mailto:?subject=${shareText}&body=${encodedUrl}` },
  ];

  const btnClass =
    "inline-flex items-center gap-1.5 rounded-md border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-600 shadow-sm transition-colors hover:border-slate-300 hover:bg-slate-50";

  return (
    <div className="flex flex-wrap items-center justify-center gap-2">
      <button type="button" onClick={copyLink} className={cn(btnClass, copied && "border-emerald-300 text-emerald-700")}>
        {copied ? <CheckCircle2 className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
        {copied ? "Copied" : "Copy link"}
      </button>
      {links.map(({ label, icon: Icon, href }) => (
        <a key={label} href={href} target="_blank" rel="noopener noreferrer" className={btnClass}>
          <Icon className="h-3.5 w-3.5" />
          {label}
        </a>
      ))}
    </div>
  );
}
