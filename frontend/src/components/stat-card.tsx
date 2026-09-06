import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export function StatCard({
  label,
  value,
  icon: Icon,
  tint = "brand",
  href,
  sub,
}: {
  label: string;
  value: number | string;
  icon: React.ComponentType<{ className?: string }>;
  tint?: "brand" | "emerald" | "amber" | "blue";
  href?: string;
  sub?: string;
}) {
  const tints: Record<string, string> = {
    brand: "bg-brand/10 text-brand-700",
    emerald: "bg-emerald-50 text-emerald-600",
    amber: "bg-amber-50 text-amber-600",
    blue: "bg-blue-50 text-blue-600",
  };

  const inner = (
    <Card className={cn("p-5 transition-shadow", href && "hover:shadow-card-hover")}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-slate-500">{label}</p>
          <p className="mt-2 text-3xl font-semibold tracking-tight text-slate-900">{value}</p>
          {sub && <p className="mt-1 text-xs text-slate-400">{sub}</p>}
        </div>
        <div className={cn("flex h-11 w-11 items-center justify-center rounded-lg", tints[tint])}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
      {href && (
        <div className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-brand-700">
          View all <ArrowUpRight className="h-3.5 w-3.5" />
        </div>
      )}
    </Card>
  );

  return href ? <Link href={href}>{inner}</Link> : inner;
}
