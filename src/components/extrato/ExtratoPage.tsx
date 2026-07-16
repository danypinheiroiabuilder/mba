"use client";

import { useEffect, useMemo, useState } from "react";
import { format } from "date-fns";

import { Card } from "@/components/ui/Card";
import { PageHeader } from "@/components/PageHeader";
import { MonthNavigator } from "@/components/MonthNavigator";
import { TransactionRow } from "@/components/TransactionRow";
import { clampMonthKey, monthLabelFromKey } from "@/lib/dates";
import { buildCategoryMap } from "@/lib/helpers";
import { useAuthStore } from "@/stores/auth";
import { useDataStore } from "@/stores/data";

export function ExtratoPage() {
  const [monthKey, setMonthKey] = useState(() => format(new Date(), "yyyy-MM"));
  const safeMonthKey = clampMonthKey(monthKey);

  const { user } = useAuthStore();
  const { categories, transactions, transactionsError, refreshCategories, refreshTransactions } =
    useDataStore();

  useEffect(() => {
    if (!user) return;
    void refreshCategories();
    void refreshTransactions(safeMonthKey);
  }, [user, safeMonthKey, refreshCategories, refreshTransactions]);

  const categoryById = useMemo(() => buildCategoryMap(categories), [categories]);

  return (
    <div className="space-y-6">
      <PageHeader
        label="Histórico"
        title="Extrato"
        subtitle={`Movimentações de ${monthLabelFromKey(safeMonthKey)}`}
      />

      <MonthNavigator monthKey={monthKey} setMonthKey={setMonthKey} />

      <Card>
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm font-medium text-muted">Lançamentos</div>
            <div className="text-base font-semibold tracking-tight text-text">
              Histórico do mês
            </div>
          </div>
          <div className="text-xs text-muted">{transactions.length} itens</div>
        </div>

        <div className="mt-4 space-y-2">
          {transactions.length === 0 ? (
            <div className="rounded-2xl border border-border bg-card/30 p-4 text-sm text-muted">
              Nenhuma movimentação neste mês.
            </div>
          ) : (
            transactions.map((t) => (
              <TransactionRow
                key={t.id}
                transaction={t}
                category={categoryById.get(t.categoryId)}
                showActions={false}
              />
            ))
          )}
        </div>

        {transactionsError && (
          <div
            role="alert"
            aria-live="polite"
            className="mt-4 rounded-2xl border border-expense/30 bg-expense/10 p-4 text-sm text-expense"
          >
            Erro ao carregar lançamentos: {transactionsError}
          </div>
        )}
      </Card>
    </div>
  );
}
