"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  MoreHorizontal,
  Eye,
  Pencil,
  FileText,
  Award,
  Trash2,
} from "lucide-react";

export function InternRowActions({
  id,
  deleteAction,
}: {
  id: string;
  deleteAction: () => Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const item = "flex items-center gap-2.5 rounded-md px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 w-full";

  return (
    <div className="relative flex justify-end" ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        className="inline-flex h-8 w-8 items-center justify-center rounded-md text-slate-500 hover:bg-slate-100"
        aria-label="Actions"
      >
        <MoreHorizontal className="h-4 w-4" />
      </button>

      {open && (
        <div className="absolute right-0 top-9 z-20 w-52 overflow-hidden rounded-lg border border-slate-200 bg-white p-1 shadow-lg animate-fade-in">
          <Link href={`/interns/${id}`} className={item}>
            <Eye className="h-4 w-4 text-slate-400" /> View details
          </Link>
          <Link href={`/interns/${id}/edit`} className={item}>
            <Pencil className="h-4 w-4 text-slate-400" /> Edit
          </Link>
          <Link href={`/offers/generate?intern=${id}`} className={item}>
            <FileText className="h-4 w-4 text-slate-400" /> Generate offer
          </Link>
          <Link href={`/certificates/generate?intern=${id}`} className={item}>
            <Award className="h-4 w-4 text-slate-400" /> Generate certificate
          </Link>
          <div className="my-1 h-px bg-slate-100" />
          <form
            action={deleteAction}
            onSubmit={(e) => {
              if (!confirm("Delete this intern? This also removes their offers, certificates and documents. This cannot be undone.")) {
                e.preventDefault();
              }
            }}
          >
            <button type="submit" className="flex w-full items-center gap-2.5 rounded-md px-3 py-2 text-sm text-rose-600 hover:bg-rose-50">
              <Trash2 className="h-4 w-4" /> Delete
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
