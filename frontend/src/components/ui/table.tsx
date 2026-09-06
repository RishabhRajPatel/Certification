import { cn } from "@/lib/utils";

export function Table({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className="w-full overflow-x-auto">
      <table className={cn("w-full text-left text-sm", className)}>{children}</table>
    </div>
  );
}

export function Thead({ children }: { children: React.ReactNode }) {
  return (
    <thead className="border-b border-slate-200 bg-slate-50/60 text-xs font-semibold uppercase tracking-wide text-slate-500">
      {children}
    </thead>
  );
}

export function Th({ children, className }: { children?: React.ReactNode; className?: string }) {
  return <th className={cn("whitespace-nowrap px-4 py-3 font-semibold", className)}>{children}</th>;
}

export function Tbody({ children }: { children: React.ReactNode }) {
  return <tbody className="divide-y divide-slate-100">{children}</tbody>;
}

export function Tr({ children, className }: { children: React.ReactNode; className?: string }) {
  return <tr className={cn("transition-colors hover:bg-slate-50/70", className)}>{children}</tr>;
}

export function Td({ children, className }: { children?: React.ReactNode; className?: string }) {
  return <td className={cn("whitespace-nowrap px-4 py-3 text-slate-700", className)}>{children}</td>;
}
