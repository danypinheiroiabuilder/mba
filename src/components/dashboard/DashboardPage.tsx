"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { format } from "date-fns";
import {
  ResponsiveContainer,
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";
import { pt } from "date-fns/locale";

import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { AnimatedNumber } from "@/components/AnimatedNumber";
import { PageHeader } from "@/components/PageHeader";
import { MonthNavigator } from "@/components/MonthNavigator";
import { TransactionRow } from "@/components/TransactionRow";
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
  const router = useRouter();
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
        label="Dashboard"
        title={monthLabelFromKey(safeMonthKey)}
        actions={<MonthNavigator monthKey={safeMonthKey} onMonthChange={setMonthKey} />}
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

      <Card className="p-0">
        <div className="flex items-center justify-between border-b border-border px-4 py-4 sm:px-6">
          <div>
            <div className="text-sm font-medium text-muted">Fluxo de caixa</div>
            <div className="text-base font-semibold tracking-tight text-text">
              Últimos 12 meses (linha/coluna)
            </div>
          </div>
        </div>

        <div className="h-[380px] px-2 pb-4 pt-4 sm:px-6">
          {mounted ? (
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={chartData} margin={{ left: 8, right: 8, top: 20, bottom: 0 }}>
                <CartesianGrid stroke="rgba(255,255,255,0.06)" vertical={false} />
                <XAxis
                  dataKey="month"
                  tickLine={false}
                  axisLine={false}
                  height={48}
                  tick={{ fill: "rgba(233,238,255,0.62)", fontSize: 11 }}
                  angle={-35}
                  textAnchor="end"
                  dy={4}
                />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  width={64}
                  tick={{ fill: "rgba(233,238,255,0.62)", fontSize: 12 }}
                  tickFormatter={(v) =>
                    new Intl.NumberFormat("pt-BR", {
                      notation: "compact",
                      maximumFractionDigits: 1,
                    }).format(v as number)
                  }
                />
                <Tooltip
                  contentStyle={{
                    background: "rgba(11,18,36,0.92)",
                    border: "1px solid rgba(255,255,255,0.10)",
                    borderRadius: 16,
                    color: "rgba(233,238,255,0.92)",
                    padding: "8px 12px",
                  }}
                  formatter={(value: unknown, name: unknown) => {
                    const n = String(name);
                    const label =
                      n === "income"
                        ? "Receitas"
                        : n === "expense"
                          ? "Despesas"
                          : n === "balance"
                            ? "Saldo"
                            : String(name);
                    return [formatBRL(Number(value) || 0), label];
                  }}
                  labelFormatter={(
                    label: unknown,
                    payload: readonly { payload?: { monthKey?: string } }[],
                  ) => {
                    const key = payload?.[0]?.payload?.monthKey;
                    return key ? monthLabelFromKey(key) : String(label);
                  }}
                  cursor={{ fill: "rgba(255,255,255,0.05)" }}
                />

                <Legend
                  wrapperStyle={{
                    paddingTop: "12px",
                    paddingBottom: "0",
                    color: "rgba(233,238,255,0.62)",
                    fontSize: 12,
                  }}
                  formatter={(value: unknown) => {
                    const v = String(value);
                    return v === "income"
                      ? "Receitas"
                      : v === "expense"
                        ? "Despesas"
                        : v === "balance"
                          ? "Saldo"
                          : v;
                  }}
                />

                <Bar
                  dataKey="income"
                  name="income"
                  fill="rgba(46,229,157,0.85)"
                  radius={[10, 10, 4, 4]}
                  animationDuration={650}
                />
                <Bar
                  dataKey="expense"
                  name="expense"
                  fill="rgba(255,91,138,0.85)"
                  radius={[10, 10, 4, 4]}
                  animationDuration={650}
                />
                <Line
                  type="monotone"
                  dataKey="balance"
                  name="balance"
                  stroke="rgba(110,123,255,1)"
                  strokeWidth={3}
                  dot={{ fill: "rgba(110,123,255,1)", r: 3 }}
                  activeDot={{ r: 5 }}
                  animationDuration={650}
                  isAnimationActive={true}
                />
              </ComposedChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full w-full animate-pulse rounded-3xl bg-card/25" />
          )}
        </div>
      </Card>

      <Card className="p-0">
        <details className="group">
          <summary className="flex cursor-pointer items-center justify-between border-b border-border px-4 py-4 sm:px-6 hover:bg-card/20">
            <div>
              <div className="text-sm font-medium text-muted">Controle Geral</div>
              <div className="text-base font-semibold tracking-tight text-text">
                Resumo anual
              </div>
            </div>
            <span className="text-muted transition-transform group-open:rotate-180">▼</span>
          </summary>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="px-4 py-3 text-left font-medium text-muted sm:px-6">Mês</th>
                  <th className="px-4 py-3 text-right font-medium text-muted sm:px-6">Receitas</th>
                  <th className="px-4 py-3 text-right font-medium text-muted sm:px-6">Despesas</th>
                  <th className="px-4 py-3 text-right font-medium text-muted sm:px-6">Saldo</th>
                  <th className="px-4 py-3 text-right font-medium text-muted sm:px-6">Comprometimento</th>
                </tr>
              </thead>
              <tbody>
                {chartData.map((month, idx) => {
                  const ratio = month.income > 0 ? month.expense / month.income : 0;
                  const commitment = Math.round(ratio * 100);
                  const c = month.income > 0 ? classifyCommitment(ratio) : null;
                  return (
                    <tr key={month.monthKey} className={idx % 2 === 0 ? "bg-card/20" : ""}>
                      <td className="px-4 py-3 font-medium text-text sm:px-6">
                        {monthLabelFromKey(month.monthKey)}
                      </td>
                      <td className="px-4 py-3 text-right text-income sm:px-6">
                        {formatBRL(month.income)}
                      </td>
                      <td className="px-4 py-3 text-right text-expense sm:px-6">
                        {formatBRL(month.expense)}
                      </td>
                      <td className={`px-4 py-3 text-right font-medium sm:px-6 ${
                        month.balance > 0 ? "text-income" : month.balance < 0 ? "text-expense" : "text-muted"
                      }`}>
                        {formatBRL(month.balance)}
                      </td>
                      <td className={`px-4 py-3 text-right font-medium sm:px-6 ${c?.color ?? "text-muted"}`}>
                        {commitment}%
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </details>
      </Card>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Card>
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-medium text-muted">Atividades</div>
              <div className="text-base font-semibold tracking-tight text-text">
                Últimos lançamentos
              </div>
            </div>
            <div className="text-xs text-muted">
              {monthTotals.latest.length} itens
            </div>
          </div>

          <div className="mt-4 space-y-2">
            {monthTotals.latest.length === 0 ? (
              <div className="rounded-2xl border border-border bg-card/30 p-4 text-sm text-muted">
                Nenhuma movimentação neste mês ainda.
              </div>
            ) : (
              monthTotals.latest.map((t) => (
                <TransactionRow
                  key={t.id}
                  transaction={t}
                  category={categoryById.get(t.categoryId)}
                  showActions={false}
                />
              ))
            )}
          </div>
        </Card>

        <Card>
          <div className="text-sm font-medium text-muted">Dica</div>
          <div className="mt-1 text-base font-semibold tracking-tight text-text">
            Cadastre por categoria e acompanhe o saldo mês a mês
          </div>
          <div className="mt-3 text-sm text-muted">
            Vá em <span className="text-text">Receitas &amp; Despesas</span> para
            lançar valores. Você pode adicionar novas{" "}
            <span className="text-text">Categorias</span> com cor para facilitar a
            leitura.
          </div>
          <div className="mt-5 flex flex-wrap gap-2">
            <Button variant="primary" onClick={() => router.push("/transacoes")}>
              Lançar agora
            </Button>
            <Button variant="ghost" onClick={() => router.push("/categorias")}>
              Gerenciar categorias
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
}

