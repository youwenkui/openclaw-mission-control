import * as React from "react";

import { cn } from "@/lib/utils";

export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => {
    return (
      <input
        ref={ref}
        className={cn(
          "h-9 w-full rounded-md border border-slate-800 bg-slate-950/70 px-3 text-sm text-slate-100 outline-none transition focus:border-cyan-400/50",
          className,
        )}
        {...props}
      />
    );
  },
);

Input.displayName = "Input";
