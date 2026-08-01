"use client";

import { memo } from "react";
import { motion } from "framer-motion";
import type { Transaction } from "@/lib/types";
import { formatBRL } from "@/lib/money";
import { formatDateBR } from "@/lib/dates";
import { Button } from "@/components/ui/Button";

const exitAnimation = {
  opacity: 0,
  x: -16,
  height: 0,
  marginBottom: 0,
};

interface TransactionRowProps {
  transaction: Transaction;
  category?: { name: string; color: string };
  onEdit?: (transaction: Transaction) => void;
  onDelete?: (transactionId: string) => void;
  showActions?: boolean;
  runningBalance?: number;
}

export const TransactionRow = memo(function TransactionRow({
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
      className="flex flex-col gap-2 rounded-2xl border border-border bg-card/30 px-3 py-2 sm:flex-row sm:items-center sm:justify-between sm:gap-3"
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={exitAnimation}
      transition={{ duration: 0.16, ease: "easeOut" }}
    >
      <div className="min-w-0 sm:flex-1">
        <div className="truncate text-sm font-medium text-text">
          {t.description}
        </div>
        {/* Metadados em blocos que não quebram no meio: a data inteira cabe
            numa linha só, e a bolinha fica colada no nome da categoria para
            deixar claro que a cor pertence à categoria, não à tag. */}
        <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted">
          <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
            <span
              className="h-2.5 w-2.5 shrink-0 rounded-full"
              style={{ background: c?.color ?? "var(--swatch-empty)" }}
            />
            {c?.name ?? "Sem categoria"}
          </span>
          <span aria-hidden="true">•</span>
          <span className="whitespace-nowrap">{formatDateBR(t.date)}</span>
          {t.tag && (
            <span className="whitespace-nowrap rounded-full border border-border px-1.5 py-0.5">
              #{t.tag}
            </span>
          )}
          {runningBalance !== undefined && (
            <>
              <span aria-hidden="true">•</span>
              <span className="whitespace-nowrap">Saldo: {formatBRL(runningBalance)}</span>
            </>
          )}
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-1 sm:shrink-0 sm:justify-end sm:gap-2">
        <span
          className={[
            "whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-medium",
            t.type === "income"
              ? "bg-income/10 text-income"
              : "bg-expense/10 text-expense",
          ].join(" ")}
        >
          {t.type === "income" ? "Receita" : "Despesa"}
        </span>
        <div
          className={[
            "ml-auto whitespace-nowrap text-right text-sm font-semibold sm:ml-0",
            t.type === "income" ? "text-income" : "text-expense",
          ].join(" ")}
        >
          {t.type === "income" ? "+" : "-"}
          {formatBRL(t.amount)}
        </div>
        {showActions && (
          // No celular os botões ganham a própria linha, alinhados à direita,
          // em vez de disputar espaço com o valor.
          <div className="flex w-full items-center justify-end gap-2 sm:w-auto sm:gap-2">
            {onEdit && (
              <Button
                variant="ghost"
                className="px-2 sm:px-3"
                aria-label={`Editar: ${t.description}`}
                onClick={() => onEdit(t)}
              >
                Editar
              </Button>
            )}
            {onDelete && (
              <Button
                variant="ghost"
                className="px-2 sm:px-3"
                aria-label={`Excluir: ${t.description}`}
                onClick={() => onDelete(t.id)}
              >
                Excluir
              </Button>
            )}
          </div>
        )}
      </div>
    </motion.div>
  );
});
