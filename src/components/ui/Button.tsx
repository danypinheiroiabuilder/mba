"use client";

import type { ButtonHTMLAttributes } from "react";

type Variant = "primary" | "ghost";

export function Button({
  className = "",
  variant = "primary",
  type = "button",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }) {
  const base =
    "inline-flex items-center justify-center gap-2 rounded-2xl px-4 py-2 text-sm font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-60 disabled:cursor-not-allowed min-h-[40px]";

  const variants: Record<Variant, string> = {
    primary:
      "bg-primary text-bg shadow-[0_12px_28px_-18px_rgba(110,123,255,0.65)] hover:brightness-110",
    ghost:
      "bg-transparent text-text hover:bg-card/60 border border-border backdrop-blur",
  };

  return (
    <button
      type={type}
      {...props}
      className={[base, variants[variant], className].join(" ")}
    />
  );
}

