"use client";

import { useEffect, useRef, useState } from "react";
import { animate } from "framer-motion";

import { formatBRL } from "@/lib/money";

export function AnimatedNumber({
  value,
  className = "",
}: {
  value: number;
  className?: string;
}) {
  const [display, setDisplay] = useState(0);
  const latestRef = useRef(0);

  useEffect(() => {
    const from = latestRef.current;
    const controls = animate(from, value, {
      duration: 0.5,
      ease: "easeOut",
      onUpdate: (latest) => {
        latestRef.current = latest;
        setDisplay(latest);
      },
    });
    return () => controls.stop();
  }, [value]);

  return (
    <span
      className={className}
      aria-live="polite"
      aria-atomic="true"
    >
      {formatBRL(display)}
    </span>
  );
}

