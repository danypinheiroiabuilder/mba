"use client";

import { motion } from "framer-motion";
import type { Transaction } from "@/lib/types";
import { formatBRL } from "@/lib/money";
import { Button } from "@/components/ui/Button";

interface TransactionRowProps {
  transaction: Transaction;
  category?: { name: string; color: string };
  onEdit?: (transaction: Transaction) => void;
  onDelete?: (transactionId: string) => void;
  showActions?: boolean;
  runningBalance?: number;
}

export function TransactionRow({
  transaction: t,
  category: c,
  onEdit,
  onDelete,
  showActions = true,
  runningBalance,
}: TransactionRowProps) {
  return (
    <motion.div
      layout
      className="flex items-center justify-between gap-3 rounded-2xl border border-border bg-card/30 px-3 py-2"
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.16, ease: "easeOut" }}
    >
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <span
            className="h-2.5 w-2.5 rounded-full"
            style={{ background: c?.color ?? "rgba(255,255,255,0.25)" }}
          />
          <div className="truncate text-sm font-medium text-text">
            {t.description}
          </div>
        </div>
        <div className="mt-0.5 text-xs text-muted">
          {c?.name ?? "Sem categoria"} • {t.date}
          {t.tag ? ` • #${t.tag}` : ""}
          {runningBalance !== undefined && <> • Saldo: {formatBRL(runningBalance)}</>}
        </div>
      </div>

      <div className="flex shrink-0 flex-wrap items-center justify-end gap-1 sm:gap-2">
        <div
          className={[
            "w-full text-right text-sm font-semibold",
            t.type === "income" ? "text-income" : "text-expense",
          ].join(" ")}
        >
          {t.type === "income" ? "+" : "-"}
          {formatBRL(t.amount)}
        </div>
        {showActions && (
          <>
            {onEdit && (
              <Button
                variant="ghost"
                className="px-2 sm:px-3"
                onClick={() => onEdit(t)}
              >
                Editar
              </Button>
            )}
            {onDelete && (
              <Button
                variant="ghost"
                className="px-2 sm:px-3"
                onClick={() => onDelete(t.id)}
              >
                Excluir
              </Button>
            )}
          </>
        )}
      </div>
    </motion.div>
  );
}
