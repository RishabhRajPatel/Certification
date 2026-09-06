"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  FileText,
  Award,
  Activity,
  FolderOpen,
  LayoutTemplate,
  Settings,
  ShieldCheck,
} from "lucide-react";
import { cn } from "@/lib/utils";

const NAV = [
  { section: "Overview", items: [{ href: "/dashboard", label: "Dashboard", icon: LayoutDashboard }] },
  {
    section: "Management",
    items: [
      { href: "/interns", label: "Interns", icon: Users },
      { href: "/offers", label: "Offer Letters", icon: FileText },
      { href: "/certificates", label: "Certificates", icon: Award },
      { href: "/progress", label: "Internship Progress", icon: Activity },
    ],
  },
  {
    section: "Library",
    items: [
      { href: "/documents", label: "Documents", icon: FolderOpen },
      { href: "/templates", label: "Templates", icon: LayoutTemplate },
    ],
  },
  { section: "System", items: [{ href: "/settings", label: "Settings", icon: Settings }] },
];

export function Sidebar({
  companyName,
  onNavigate,
}: {
  companyName: string;
  onNavigate?: () => void;
}) {
  const pathname = usePathname();

  return (
    <div className="flex h-full flex-col bg-sidebar text-sidebar-fg">
      {/* Brand */}
      <div className="flex h-16 items-center gap-2.5 border-b border-white/10 px-5">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand text-brand-fg shadow-sm">
          <ShieldCheck className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-white">Maayad</p>
          <p className="truncate text-[11px] text-sidebar-muted">{companyName}</p>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 space-y-6 overflow-y-auto px-3 py-5">
        {NAV.map((group) => (
          <div key={group.section}>
            <p className="px-3 pb-2 text-[10px] font-semibold uppercase tracking-wider text-sidebar-muted">
              {group.section}
            </p>
            <ul className="space-y-1">
              {group.items.map((item) => {
                const active =
                  pathname === item.href || pathname.startsWith(item.href + "/");
                const Icon = item.icon;
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      onClick={onNavigate}
                      className={cn(
                        "group flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                        active
                          ? "bg-brand text-brand-fg shadow-sm"
                          : "text-sidebar-fg/80 hover:bg-sidebar-active hover:text-white"
                      )}
                    >
                      <Icon className={cn("h-[18px] w-[18px] shrink-0", active ? "text-brand-fg" : "text-sidebar-muted group-hover:text-white")} />
                      {item.label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      <div className="border-t border-white/10 px-5 py-4">
        <p className="text-[11px] text-sidebar-muted">
          © {new Date().getFullYear()} Maayad
        </p>
      </div>
    </div>
  );
}
