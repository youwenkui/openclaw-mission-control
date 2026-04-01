import { X } from "lucide-react";

import { cn } from "@/lib/utils";

export function Drawer({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-slate-950/60 backdrop-blur-sm">
      <div className={cn("h-full w-full max-w-xl border-l border-slate-800 bg-[#0d1420] shadow-panel")}>
        <div className="flex items-center justify-between border-b border-slate-800 px-4 py-3">
          <h3 className="text-sm font-semibold text-slate-100">{title}</h3>
          <button onClick={onClose} className="rounded-md p-1 text-slate-400 hover:bg-slate-800 hover:text-slate-100">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="h-[calc(100%-57px)] overflow-auto p-4">{children}</div>
      </div>
    </div>
  );
}
