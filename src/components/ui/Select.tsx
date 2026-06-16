"use client";

import { forwardRef, type SelectHTMLAttributes } from "react";
import { ChevronDown } from "lucide-react";

export const Select = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement>>(
  ({ className = "", children, ...props }, ref) => (
    <div className="relative">
      <select
        ref={ref}
        {...props}
        className={[
          "h-10 w-full appearance-none rounded-2xl border border-border bg-card/40 px-3 pr-10 text-sm text-text",
          "focus:outline-none focus:ring-2 focus:ring-ring",
          className,
        ].join(" ")}
      >
        {children}
      </select>
      <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
    </div>
  ),
);
Select.displayName = "Select";

