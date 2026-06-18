"use client";

import { useEffect, useMemo, useState } from "react";
import { format } from "date-fns";
import { pt } from "date-fns/locale";

import { Card } from "@/components/ui/Card";
import { AnimatedNumber } from "@/components/AnimatedNumber";
import { PageHeader } from "@/components/PageHeader";
import { MonthNavigator } from "@/components/MonthNavigator";
import { clampMonthKey, monthLabelFromKey, shiftMonthKey } from "@/lib/dates";
import { formatBRL } from "@/lib/money";
import { buildCategoryMap, sumBy } from "@/lib/helpers";
import { toast } from "sonner";
import { useAuthStore } from "@/stores/auth";
import { useDataStore } from "@/stores/data";

type CommitmentLevel = { label: string; color: string };

function classifyCommitment(ratio: number): CommitmentLevel {
  if (ratio < 0.7) return { label: "✓ Saudável", color: "text-income" };
  if (ratio < 0.9) return { label: "⚠ Atenção", color: "text-[#f4a261]" };
  return { label: "✕ Alto", color: "text-expense" };
}

function TrendBadge({ value, percentage }: { value: number; percentage?: number }) {
  if (value === 0) return <span className="text-xs text-muted">—</span>;
  const isPositive = value > 0;
  const symbol = isPositive ? "↑" : "↓";
  const color = isPositive ? "text-income" : "text-expense";
  return (
    <span className={`text-xs font-medium ${color}`}>
      {symbol} {percentage !== undefined ? `${percentage.toFixed(1)}%` : formatBRL(Math.abs(value))}
    </span>
  );
}

export function DashboardPage() {
  const { user } = useAuthStore();
  const [monthKey, setMonthKey] = useState(() => format(new Date(), "yyyy-MM"));
  const [mounted, setMounted] = useState(false);
  const safeMonthKey = clampMonthKey(monthKey);

  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 0);
    return () => clearTimeout(t);
  }, []);

  const {
    categories,
    categoriesError,
    transactions: monthTx,
    transactionsError,
    cashflow12m,
    cashflowError,
    refreshCategories,
    refreshTransactions,
    refreshCashflow12m,
  } = useDataStore();

  useEffect(() => {
    if (!user) return;
    void refreshCategories();
    void refreshTransactions(safeMonthKey);
    void refreshCashflow12m();
  }, [user, refreshCategories, refreshTransactions, refreshCashflow12m, safeMonthKey]);

  useEffect(() => {
    if (categoriesError) toast.error(`Erro ao carregar categorias: ${categoriesError}`);
  }, [categoriesError]);

  useEffect(() => {
    if (transactionsError) toast.error(`Erro ao carregar lançamentos: ${transactionsError}`);
  }, [transactionsError]);

  useEffect(() => {
    if (cashflowError) toast.error(`Erro ao carregar fluxo de caixa: ${cashflowError}`);
  }, [cashflowError]);

  const categoryById = useMemo(() => buildCategoryMap(categories), [categories]);

  const chartData = useMemo(() => {
    const months = Array.from({ length: 12 }, (_, i) =>
      shiftMonthKey(safeMonthKey, -11 + i),
    );
    const map = new Map(cashflow12m.map((p) => [p.monthKey, p]));

    return months.map((m) => {
      const p = map.get(m);
      const [year, monthNum] = m.split("-");
      const monthDate = new Date(parseInt(year), parseInt(monthNum) - 1, 1);
      const monthLabel = format(monthDate, "MMM/yyyy", { locale: pt }).toLowerCase();

      return {
        month: monthLabel,
        monthKey: m,
        income: p?.income ?? 0,
        expense: p?.expense ?? 0,
        balance: p?.balance ?? 0,
      };
    });
  }, [cashflow12m, safeMonthKey]);

  const monthTotals = useMemo(() => {
    const incomes = monthTx.filter((t) => t.type === "income");
    const expenses = monthTx.filter((t) => t.type === "expense");
    const totalIncome = sumBy(incomes, (t) => t.amount);
    const totalExpense = sumBy(expenses, (t) => t.amount);
    const balance = totalIncome - totalExpense;

    const prevMonthKey = shiftMonthKey(safeMonthKey, -1);
    const prevMonthData = chartData.find((d) => d.monthKey === prevMonthKey);
    const prevIncome = prevMonthData?.income ?? 0;
    const prevExpense = prevMonthData?.expense ?? 0;
    const prevBalance = prevMonthData?.balance ?? 0;

    const incomePercentage = prevIncome > 0 ? ((totalIncome - prevIncome) / prevIncome) * 100 : 0;
    const expensePercentage = prevExpense > 0 ? ((totalExpense - prevExpense) / prevExpense) * 100 : 0;
    const balancePercentage = prevBalance !== 0 ? ((balance - prevBalance) / Math.abs(prevBalance)) * 100 : 0;

    return {
      totalIncome,
      totalExpense,
      balance,
      incomeChange: totalIncome - prevIncome,
      expenseChange: totalExpense - prevExpense,
      balanceChange: balance - prevBalance,
      incomePercentage,
      expensePercentage,
      balancePercentage,
      latest: [...monthTx]
        .sort((a, b) => (a.date < b.date ? 1 : -1))
        .slice(0, 8),
    };
  }, [monthTx, chartData, safeMonthKey]);

  return (
    <div className="space-y-6">
      <PageHeader
        as="h1"
        label="Dashboard"
        title={monthLabelFromKey(safeMonthKey)}
        actions={<MonthNavigator monthKey={safeMonthKey} setMonthKey={setMonthKey} />}
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="text-sm font-medium text-muted">Receitas</div>
              <div className="mt-1 text-2xl font-semibold tracking-tight text-text">
                <AnimatedNumber value={monthTotals.totalIncome} />
              </div>
              <div className="mt-2">
                <TrendBadge value={monthTotals.incomeChange} percentage={monthTotals.incomePercentage} />
              </div>
            </div>
            <div className="h-10 w-10 shrink-0 rounded-2xl bg-income/15 ring-1 ring-income/25" />
          </div>
        </Card>

        <Card>
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="text-sm font-medium text-muted">Despesas</div>
              <div className="mt-1 text-2xl font-semibold tracking-tight text-text">
                <AnimatedNumber value={monthTotals.totalExpense} />
              </div>
              <div className="mt-2">
                <TrendBadge value={-monthTotals.expenseChange} percentage={monthTotals.expensePercentage} />
              </div>
            </div>
            <div className="h-10 w-10 shrink-0 rounded-2xl bg-expense/15 ring-1 ring-expense/25" />
          </div>
        </Card>

        <Card>
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="text-sm font-medium text-muted">Saldo</div>
              <div className="mt-1 text-2xl font-semibold tracking-tight text-text">
                <AnimatedNumber value={monthTotals.balance} />
              </div>
              <div className="mt-2 space-y-1">
                <div className="text-xs text-muted">
                  {monthTotals.balance > 0 ? "Positivo" : monthTotals.balance < 0 ? "Negativo" : "Neutro"}
                </div>
                <TrendBadge value={monthTotals.balanceChange} percentage={monthTotals.balancePercentage} />
              </div>
            </div>
            <div className="h-10 w-10 shrink-0 rounded-2xl bg-primary/15 ring-1 ring-primary/25" />
          </div>
        </Card>

        <Card>
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="text-sm font-medium text-muted">Comprometimento</div>
              <div className="mt-1 text-2xl font-semibold tracking-tight text-text">
                {monthTotals.totalIncome > 0
                  ? `${Math.round((monthTotals.totalExpense / monthTotals.totalIncome) * 100)}%`
                  : "—"}
              </div>
              <div className="mt-2">
                {monthTotals.totalIncome > 0 && (() => {
                  const c = classifyCommitment(monthTotals.totalExpense / monthTotals.totalIncome);
                  return <span className={`text-xs font-medium ${c.color}`}>{c.label}</span>;
                })()}
              </div>
            </div>
            <div className="h-10 w-10 shrink-0 rounded-2xl bg-primary/15 ring-1 ring-primary/25" />
          </div>
        </Card>
      </div>
    </div>
  );
}

