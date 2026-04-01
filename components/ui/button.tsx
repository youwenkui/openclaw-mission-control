import * as React from "react";

import { cn } from "@/lib/utils";

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "default" | "outline" | "ghost" | "danger" | "success";
  size?: "sm" | "md";
};

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "default", size = "md", ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(
          "inline-flex items-center justify-center rounded-md border transition-colors disabled:cursor-not-allowed disabled:opacity-50",
          size === "sm" ? "h-8 px-3 text-xs" : "h-9 px-4 text-sm",
          variant === "default" && "border-cyan-400/40 bg-cyan-400/10 text-cyan-100 hover:bg-cyan-400/20",
          variant === "outline" && "border-slate-700 bg-slate-900/50 text-slate-200 hover:bg-slate-800",
          variant === "ghost" && "border-transparent bg-transparent text-slate-300 hover:bg-slate-800/80",
          variant === "danger" && "border-red-500/40 bg-red-500/10 text-red-100 hover:bg-red-500/20",
          variant === "success" && "border-emerald-500/40 bg-emerald-500/10 text-emerald-100 hover:bg-emerald-500/20",
          className,
        )}
        {...props}
      />
    );
  },
);

Button.displayName = "Button";
