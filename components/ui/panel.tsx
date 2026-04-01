import { cn } from "@/lib/utils";

export function Panel({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <section className={cn("rounded-xl border border-slate-800 bg-slate-950/60 shadow-panel backdrop-blur-sm", className)}>
      {children}
    </section>
  );
}

export function PanelHeader({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-slate-800 px-4 py-3">
      <div>
        <h2 className="text-sm font-semibold text-slate-100">{title}</h2>
        {subtitle ? <p className="mt-1 text-xs text-slate-400">{subtitle}</p> : null}
      </div>
      {action}
    </div>
  );
}
