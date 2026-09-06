"use client";

import { CheckCircle2, Circle, Plus, X } from "lucide-react";
import { INTERN_STATUS, INTERN_STATUS_META } from "@/lib/constants";

export function TaskToggle({
  done,
  title,
  toggleAction,
  deleteAction,
}: {
  done: boolean;
  title: string;
  toggleAction: () => Promise<void>;
  deleteAction: () => Promise<void>;
}) {
  return (
    <div className="group flex items-center gap-2">
      <form action={toggleAction} className="flex-1">
        <button type="submit" className="flex w-full items-center gap-2 text-left text-sm">
          {done ? (
            <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500" />
          ) : (
            <Circle className="h-4 w-4 shrink-0 text-slate-300" />
          )}
          <span className={done ? "text-slate-400 line-through" : "text-slate-700"}>{title}</span>
        </button>
      </form>
      <form action={deleteAction}>
        <button
          type="submit"
          className="text-slate-300 opacity-0 transition-opacity hover:text-rose-500 group-hover:opacity-100"
          aria-label="Delete task"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </form>
    </div>
  );
}

export function AddTaskForm({ addAction }: { addAction: (fd: FormData) => Promise<void> }) {
  return (
    <form action={addAction} className="mt-2 flex items-center gap-2">
      <input
        name="title"
        placeholder="Add a task…"
        required
        className="h-8 flex-1 rounded-md border border-slate-300 bg-white px-2.5 text-xs focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/30"
      />
      <button type="submit" className="inline-flex h-8 items-center gap-1 rounded-md bg-brand/10 px-2.5 text-xs font-medium text-brand-700 hover:bg-brand/20">
        <Plus className="h-3.5 w-3.5" /> Add
      </button>
    </form>
  );
}

export function StatusSelect({
  current,
  updateAction,
}: {
  current: string;
  updateAction: (fd: FormData) => Promise<void>;
}) {
  return (
    <form action={updateAction}>
      <select
        name="status"
        defaultValue={current}
        onChange={(e) => e.currentTarget.form?.requestSubmit()}
        className="h-8 rounded-md border border-slate-300 bg-white pl-2 pr-7 text-xs font-medium focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/30"
      >
        {INTERN_STATUS.map((s) => (
          <option key={s} value={s}>{INTERN_STATUS_META[s].label}</option>
        ))}
      </select>
    </form>
  );
}
