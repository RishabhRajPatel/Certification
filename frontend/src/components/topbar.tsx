"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Menu, ChevronDown, LogOut, User as UserIcon, Loader2 } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";

export function Topbar({
  user,
  onMenu,
}: {
  user: { name: string; email: string; role: string };
  onMenu: () => void;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  async function logout() {
    setLoggingOut(true);
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } finally {
      router.replace("/login");
      router.refresh();
    }
  }

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between gap-4 border-b border-slate-200 bg-white/90 px-4 backdrop-blur sm:px-6">
      <button
        onClick={onMenu}
        className="inline-flex h-9 w-9 items-center justify-center rounded-md text-slate-500 hover:bg-slate-100 lg:hidden"
        aria-label="Open menu"
      >
        <Menu className="h-5 w-5" />
      </button>

      <div className="hidden text-sm text-slate-400 sm:block">
        Admin Portal
      </div>

      <div className="relative ml-auto" ref={menuRef}>
        <button
          onClick={() => setOpen((o) => !o)}
          className="flex items-center gap-2.5 rounded-full py-1 pl-1 pr-2.5 hover:bg-slate-100"
        >
          <Avatar name={user.name} size={32} />
          <span className="hidden text-left sm:block">
            <span className="block text-sm font-medium leading-tight text-slate-900">{user.name}</span>
            <span className="block text-[11px] leading-tight text-slate-500">{user.role}</span>
          </span>
          <ChevronDown className="h-4 w-4 text-slate-400" />
        </button>

        {open && (
          <div className="absolute right-0 mt-2 w-60 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-lg animate-fade-in">
            <div className="border-b border-slate-100 px-4 py-3">
              <p className="text-sm font-medium text-slate-900">{user.name}</p>
              <p className="truncate text-xs text-slate-500">{user.email}</p>
            </div>
            <div className="p-1">
              <a
                href="/settings"
                className="flex items-center gap-2.5 rounded-md px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
              >
                <UserIcon className="h-4 w-4 text-slate-400" />
                Account & Security
              </a>
              <button
                onClick={logout}
                disabled={loggingOut}
                className="flex w-full items-center gap-2.5 rounded-md px-3 py-2 text-sm text-rose-600 hover:bg-rose-50 disabled:opacity-60"
              >
                {loggingOut ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogOut className="h-4 w-4" />}
                Sign out
              </button>
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
