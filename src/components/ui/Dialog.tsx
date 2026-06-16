"use client";

import { useEffect, useId, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";

import { Button } from "./Button";

export function Dialog({
  open,
  title,
  label = "Cadastro",
  children,
  footer,
  onClose,
}: {
  open: boolean;
  title: string;
  label?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  onClose: () => void;
}) {
  const titleId = useId();
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        onClose();
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, onClose]);
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 flex items-end justify-center p-4 sm:items-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.div
            role="presentation"
            className="absolute inset-0 bg-black/55 backdrop-blur-sm"
            onClick={onClose}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          />

          <motion.div
            ref={dialogRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            className="relative w-full max-w-lg rounded-3xl border border-border bg-surface p-4 shadow-[0_40px_90px_-60px_rgba(0,0,0,0.9)] sm:p-6"
            initial={{ y: 16, scale: 0.98, opacity: 0 }}
            animate={{ y: 0, scale: 1, opacity: 1 }}
            exit={{ y: 8, scale: 0.98, opacity: 0 }}
            transition={{ type: "spring", stiffness: 420, damping: 32 }}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="text-sm font-medium text-muted">{label}</div>
                <div id={titleId} className="text-lg font-semibold tracking-tight text-text">
                  {title}
                </div>
              </div>
              <Button variant="ghost" onClick={onClose} className="px-3">
                Fechar
              </Button>
            </div>

            <div className="mt-5">{children}</div>

            {footer && <div className="mt-6 flex justify-end">{footer}</div>}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

