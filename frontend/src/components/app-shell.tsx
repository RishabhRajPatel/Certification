"use client";

import { useState } from "react";
import { X } from "lucide-react";
import { Sidebar } from "./sidebar";
import { Topbar } from "./topbar";
import { cn } from "@/lib/utils";

export function AppShell({
  user,
  companyName,
  children,
}: {
  user: { name: string; email: string; role: string };
  companyName: string;
  children: React.ReactNode;
}) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="min-h-screen lg:pl-64">
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 lg:block">
        <Sidebar companyName={companyName} />
      </aside>

      {/* Mobile drawer */}
      <div className={cn("fixed inset-0 z-50 lg:hidden", mobileOpen ? "" : "pointer-events-none")}>
        <div
          className={cn("absolute inset-0 bg-slate-900/50 transition-opacity", mobileOpen ? "opacity-100" : "opacity-0")}
          onClick={() => setMobileOpen(false)}
        />
        <aside
          className={cn(
            "absolute inset-y-0 left-0 w-64 transition-transform duration-200",
            mobileOpen ? "translate-x-0" : "-translate-x-full"
          )}
        >
          <button
            onClick={() => setMobileOpen(false)}
            className="absolute -right-11 top-3 inline-flex h-9 w-9 items-center justify-center rounded-md bg-white/10 text-white"
            aria-label="Close menu"
          >
            <X className="h-5 w-5" />
          </button>
          <Sidebar companyName={companyName} onNavigate={() => setMobileOpen(false)} />
        </aside>
      </div>

      <Topbar user={user} onMenu={() => setMobileOpen(true)} />

      <main className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8 animate-fade-in">
        {children}
      </main>
    </div>
  );
}
