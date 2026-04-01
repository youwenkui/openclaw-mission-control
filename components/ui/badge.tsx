import { cn } from "@/lib/utils";

export function Badge({
  children,
  tone = "neutral",
  className,
}: {
  children: React.ReactNode;
  tone?: "neutral" | "success" | "warning" | "danger" | "info";
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium uppercase tracking-wide",
        tone === "neutral" && "border-slate-700 bg-slate-800/70 text-slate-300",
        tone === "success" && "border-emerald-500/30 bg-emerald-500/10 text-emerald-300",
        tone === "warning" && "border-amber-500/30 bg-amber-500/10 text-amber-300",
        tone === "danger" && "border-red-500/30 bg-red-500/10 text-red-300",
        tone === "info" && "border-sky-500/30 bg-sky-500/10 text-sky-300",
        className,
      )}
    >
      {children}
    </span>
  );
}
