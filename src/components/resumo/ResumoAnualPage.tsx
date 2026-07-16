"use client";

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
import { PageHeader } from "@/components/PageHeader";
import { clampMonthKey, monthLabelFromKey, shiftMonthKey } from "@/lib/dates";
import { formatBRL } from "@/lib/money";
import { useAuthStore } from "@/stores/auth";
import { useDataStore } from "@/stores/data";

type CommitmentLevel = { label: string; color: string };

function classifyCommitment(ratio: number): CommitmentLevel {
  if (ratio < 0.7) return { label: "✓ Saudável", color: "text-income" };
  if (ratio < 0.9) return { label: "⚠ Atenção", color: "text-[#f4a261]" };
  return { label: "✕ Alto", color: "text-expense" };
}

export function ResumoAnualPage() {
  const [monthKey, setMonthKey] = useState(() => format(new Date(), "yyyy-MM"));
  const [mounted, setMounted] = useState(false);
  const safeMonthKey = clampMonthKey(monthKey);

  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 0);
    return () => clearTimeout(t);
  }, []);

  const { user } = useAuthStore();
  const { cashflow12m, cashflowError, refreshCashflow12m } = useDataStore();

  useEffect(() => {
    if (!user) return;
    void refreshCashflow12m();
  }, [user, refreshCashflow12m]);

  const chartData = useMemo(() => {
    const months = Array.from({ length: 12 }, (_, i) =>
      shiftMonthKey(safeMonthKey, -11 + i),
    );
    return months.map((monthKey) => {
      const cashflow = cashflow12m.find((cf) => cf.monthKey === monthKey);
      return {
        monthKey,
        month: monthLabelFromKey(monthKey),
        income: cashflow?.income ?? 0,
        expense: cashflow?.expense ?? 0,
        balance: cashflow?.balance ?? 0,
      };
    });
  }, [cashflow12m, safeMonthKey]);

  return (
    <div className="space-y-6">
      <PageHeader
        label="Análise"
        title="Resumo Anual"
        subtitle="Fluxo de caixa dos últimos 12 meses"
      />

      <Card className="p-0">
        <div className="flex items-center justify-between border-b border-border px-4 py-4 sm:px-6">
          <div>
            <div className="text-sm font-medium text-muted">Fluxo de caixa</div>
            <div className="text-base font-semibold tracking-tight text-text">
              Últimos 12 meses (linha/coluna)
            </div>
          </div>
        </div>

        <div className="flex h-[280px] flex-col px-2 pb-4 pt-4 sm:h-[380px] sm:px-6">
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
                Tabela anual
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
