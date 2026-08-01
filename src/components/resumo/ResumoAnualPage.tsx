"use client";

import { useEffect, useMemo, useState } from "react";
import { format, lastDayOfMonth, parseISO } from "date-fns";
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
import { BarChart2 } from "lucide-react";

import { Card } from "@/components/ui/Card";
import { PageHeader } from "@/components/PageHeader";
import { clampMonthKey, monthLabelFromKey, shiftMonthKey } from "@/lib/dates";
import { formatBRL } from "@/lib/money";
import { useAuthStore } from "@/stores/auth";
import { useDataStore } from "@/stores/data";

type CommitmentLevel = { label: string; color: string };

function classifyCommitment(ratio: number): CommitmentLevel {
  if (ratio < 0.7) return { label: "✓ Saudável", color: "text-income" };
  if (ratio < 0.9) return { label: "⚠ Atenção", color: "text-warn" };
  return { label: "✕ Alto", color: "text-expense" };
}

const PERIOD_OPTIONS = [
  { months: 3, label: "3 meses" },
  { months: 6, label: "6 meses" },
  { months: 12, label: "12 meses" },
] as const;

const SERIES_OPTIONS = [
  { key: "income", label: "Receitas", color: "var(--chart-income)" },
  { key: "expense", label: "Despesas", color: "var(--chart-expense)" },
  { key: "balance", label: "Saldo", color: "var(--chart-balance)" },
] as const;

type SeriesKey = (typeof SERIES_OPTIONS)[number]["key"];

/** Botão de filtro no estilo slicer: ligado/desligado, com estado acessível. */
function SlicerChip({
  active,
  onClick,
  children,
  swatch,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
  swatch?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={[
        "inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border px-3 py-1.5 text-xs font-medium transition",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        active
          ? "border-primary/40 bg-primary/15 text-text"
          : "border-border bg-transparent text-muted hover:text-text",
      ].join(" ")}
    >
      {swatch && (
        <span
          className="h-2.5 w-2.5 shrink-0 rounded-full"
          style={{ background: swatch, opacity: active ? 1 : 0.4 }}
        />
      )}
      {children}
    </button>
  );
}

export function ResumoAnualPage() {
  const [mounted, setMounted] = useState(false);
  const [months, setMonths] = useState<number>(12);
  const [activeSeries, setActiveSeries] = useState<SeriesKey[]>(["income", "expense", "balance"]);
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<string[]>([]);

  const endMonthKey = clampMonthKey(format(new Date(), "yyyy-MM"));

  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 0);
    return () => clearTimeout(t);
  }, []);

  const { user } = useAuthStore();
  const {
    categories,
    analysisTransactions,
    analysisError,
    refreshCategories,
    refreshAnalysisTransactions,
  } = useDataStore();

  // Meses exibidos, do mais antigo ao mais recente.
  const monthKeys = useMemo(
    () => Array.from({ length: months }, (_, i) => shiftMonthKey(endMonthKey, -(months - 1) + i)),
    [months, endMonthKey],
  );

  useEffect(() => {
    if (!user) return;
    void refreshCategories();
  }, [user, refreshCategories]);

  useEffect(() => {
    if (!user) return;
    const from = `${monthKeys[0]}-01`;
    const to = format(lastDayOfMonth(parseISO(`${endMonthKey}-01`)), "yyyy-MM-dd");
    void refreshAnalysisTransactions(from, to);
  }, [user, monthKeys, endMonthKey, refreshAnalysisTransactions]);

  // Agrega os lançamentos por mês já aplicando o filtro de categoria.
  const chartData = useMemo(() => {
    const totals = new Map<string, { income: number; expense: number }>();
    for (const key of monthKeys) totals.set(key, { income: 0, expense: 0 });

    for (const t of analysisTransactions) {
      if (selectedCategoryIds.length > 0 && !selectedCategoryIds.includes(t.categoryId)) continue;
      const key = t.date.slice(0, 7);
      const bucket = totals.get(key);
      if (!bucket) continue;
      if (t.type === "income") bucket.income += t.amount;
      else bucket.expense += t.amount;
    }

    return monthKeys.map((monthKey) => {
      const bucket = totals.get(monthKey) ?? { income: 0, expense: 0 };
      return {
        monthKey,
        month: monthLabelFromKey(monthKey),
        income: bucket.income,
        expense: bucket.expense,
        balance: bucket.income - bucket.expense,
      };
    });
  }, [analysisTransactions, monthKeys, selectedCategoryIds]);

  function toggleSeries(key: SeriesKey) {
    setActiveSeries((current) =>
      current.includes(key) ? current.filter((s) => s !== key) : [...current, key],
    );
  }

  function toggleCategory(id: string) {
    setSelectedCategoryIds((current) =>
      current.includes(id) ? current.filter((c) => c !== id) : [...current, id],
    );
  }

  const periodLabel =
    months === 12 ? "Últimos 12 meses" : `Últimos ${months} meses`;
  const filteringByCategory = selectedCategoryIds.length > 0;

  return (
    <div className="space-y-6">
      <PageHeader
        label="Análise"
        title="Resumo Anual"
        subtitle={`Fluxo de caixa — ${periodLabel.toLowerCase()}`}
      />

      <Card>
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="w-20 shrink-0 text-xs font-medium text-muted">Período</span>
            {PERIOD_OPTIONS.map((option) => (
              <SlicerChip
                key={option.months}
                active={months === option.months}
                onClick={() => setMonths(option.months)}
              >
                {option.label}
              </SlicerChip>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span className="w-20 shrink-0 text-xs font-medium text-muted">Séries</span>
            {SERIES_OPTIONS.map((option) => (
              <SlicerChip
                key={option.key}
                active={activeSeries.includes(option.key)}
                onClick={() => toggleSeries(option.key)}
                swatch={option.color}
              >
                {option.label}
              </SlicerChip>
            ))}
          </div>

          {categories.length > 0 && (
            <div className="flex flex-wrap items-center gap-2">
              <span className="w-20 shrink-0 text-xs font-medium text-muted">Categorias</span>
              <SlicerChip
                active={!filteringByCategory}
                onClick={() => setSelectedCategoryIds([])}
              >
                Todas
              </SlicerChip>
              {categories.map((category) => (
                <SlicerChip
                  key={category.id}
                  active={selectedCategoryIds.includes(category.id)}
                  onClick={() => toggleCategory(category.id)}
                  swatch={category.color}
                >
                  {category.name}
                </SlicerChip>
              ))}
            </div>
          )}
        </div>
      </Card>

      {analysisError && (
        <div
          role="alert"
          aria-live="polite"
          className="rounded-2xl border border-expense/30 bg-expense/10 p-4 text-sm text-expense"
        >
          Erro ao carregar os dados do período: {analysisError}
        </div>
      )}

      <Card className="p-0">
        <div className="flex items-center justify-between border-b border-border px-4 py-4 sm:px-6">
          <div>
            <div className="text-sm font-medium text-muted">Fluxo de caixa</div>
            <div className="text-base font-semibold tracking-tight text-text">
              {periodLabel} (linha/coluna)
            </div>
          </div>
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/15 ring-1 ring-primary/25">
            <BarChart2 className="h-4 w-4 text-primary" strokeWidth={1.75} aria-hidden="true" />
          </div>
        </div>

        <div className="flex h-[280px] flex-col px-2 pb-4 pt-4 sm:h-[380px] sm:px-6">
          {mounted ? (
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={chartData} margin={{ left: 8, right: 8, top: 20, bottom: 0 }}>
                <CartesianGrid stroke="var(--chart-grid)" vertical={false} />
                <XAxis
                  dataKey="month"
                  tickLine={false}
                  axisLine={false}
                  height={48}
                  tick={{ fill: "var(--chart-tick)", fontSize: 11 }}
                  angle={-35}
                  textAnchor="end"
                  dy={4}
                />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  width={64}
                  tick={{ fill: "var(--chart-tick)", fontSize: 12 }}
                  tickFormatter={(v) =>
                    new Intl.NumberFormat("pt-BR", {
                      notation: "compact",
                      maximumFractionDigits: 1,
                    }).format(v as number)
                  }
                />
                <Tooltip
                  // Compacto para não cobrir o gráfico inteiro no celular.
                  wrapperStyle={{ maxWidth: "60%", zIndex: 10 }}
                  contentStyle={{
                    background: "var(--chart-tooltip-bg)",
                    border: "1px solid var(--chart-tooltip-border)",
                    borderRadius: 12,
                    color: "var(--chart-tooltip-text)",
                    padding: "6px 8px",
                    fontSize: 11,
                    lineHeight: 1.35,
                  }}
                  itemStyle={{ padding: 0, margin: 0 }}
                  labelStyle={{ marginBottom: 2, fontSize: 11 }}
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
                  cursor={{ fill: "var(--chart-cursor)" }}
                />

                <Legend
                  wrapperStyle={{
                    paddingTop: "12px",
                    paddingBottom: "0",
                    color: "var(--chart-tick)",
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

                {activeSeries.includes("income") && (
                  <Bar
                    dataKey="income"
                    name="income"
                    fill="var(--chart-income)"
                    radius={[10, 10, 4, 4]}
                    animationDuration={650}
                  />
                )}
                {activeSeries.includes("expense") && (
                  <Bar
                    dataKey="expense"
                    name="expense"
                    fill="var(--chart-expense)"
                    radius={[10, 10, 4, 4]}
                    animationDuration={650}
                  />
                )}
                {activeSeries.includes("balance") && (
                  <Line
                    type="monotone"
                    dataKey="balance"
                    name="balance"
                    stroke="var(--chart-balance)"
                    strokeWidth={3}
                    dot={{ fill: "var(--chart-balance)", r: 3 }}
                    activeDot={{ r: 5 }}
                    animationDuration={650}
                    isAnimationActive={true}
                  />
                )}
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
                Tabela do período
              </div>
            </div>
            <span className="text-muted transition-transform group-open:rotate-180">▼</span>
          </summary>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th scope="col" className="px-4 py-3 text-left font-medium text-muted sm:px-6">
                    Mês
                  </th>
                  <th scope="col" className="px-4 py-3 text-right font-medium text-muted sm:px-6">
                    Receitas
                  </th>
                  <th scope="col" className="px-4 py-3 text-right font-medium text-muted sm:px-6">
                    Despesas
                  </th>
                  <th scope="col" className="px-4 py-3 text-right font-medium text-muted sm:px-6">
                    Saldo
                  </th>
                  <th scope="col" className="px-4 py-3 text-right font-medium text-muted sm:px-6">
                    Comprometimento
                  </th>
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
                      <td
                        className={`px-4 py-3 text-right font-medium sm:px-6 ${
                          month.balance > 0
                            ? "text-income"
                            : month.balance < 0
                              ? "text-expense"
                              : "text-muted"
                        }`}
                      >
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
    </div>
  );
}
