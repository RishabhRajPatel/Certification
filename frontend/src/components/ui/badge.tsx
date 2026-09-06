import { cn } from "@/lib/utils";
import { DOC_STATUS_META, INTERN_STATUS_META } from "@/lib/constants";

export function Badge({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset",
        className
      )}
    >
      {children}
    </span>
  );
}

export function StatusBadge({ status }: { status: string }) {
  const internMeta = INTERN_STATUS_META[status as keyof typeof INTERN_STATUS_META];
  if (internMeta) {
    return (
      <Badge className={internMeta.badge}>
        <span className={cn("h-1.5 w-1.5 rounded-full", internMeta.dot)} />
        {internMeta.label}
      </Badge>
    );
  }
  const docMeta = DOC_STATUS_META[status];
  return <Badge className={docMeta?.badge ?? "bg-slate-100 text-slate-600 ring-slate-500/20"}>{docMeta?.label ?? status}</Badge>;
}
