import { format, parseISO, startOfMonth, subMonths } from "date-fns";

import { requireSupabase } from "@/services/supabase/client";
import type { Transaction, TransactionInput, CashflowType } from "@/lib/types";

type TransactionRow = {
  id: string;
  user_id: string;
  description: string;
  type: CashflowType;
  category_id: string;
  amount: number;
  date: string; // YYYY-MM-DD
  tag: string | null;
  payment_method: string | null;
  created_at: string;
};

function mapTransaction(row: TransactionRow): Transaction {
  return {
    id: row.id,
    description: row.description,
    type: row.type,
    categoryId: row.category_id,
    amount: Number(row.amount),
    date: row.date,
    tag: row.tag ?? undefined,
    paymentMethod: row.payment_method ? (row.payment_method as any) : undefined,
    createdAt: row.created_at,
  };
}

export async function listTransactionsByMonth(monthKey: string): Promise<Transaction[]> {
  const supabase = requireSupabase();
  const from = `${monthKey}-01`;
  const to = `${monthKey}-31`;

  const { data, error } = await supabase
    .from("transactions")
    .select("id,user_id,description,type,category_id,amount,date,tag,payment_method,created_at")
    .gte("date", from)
    .lte("date", to)
    .order("date", { ascending: false })
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []).map(mapTransaction);
}

export async function upsertTransaction(
  input: TransactionInput,
  userId: string,
  editingId?: string,
): Promise<Transaction> {
  const supabase = requireSupabase();
  const tag = input.tag?.trim() ? input.tag.trim().replace(/^#/, "") : null;

  if (editingId) {
    const { data, error } = await supabase
      .from("transactions")
      .update({
        description: input.description.trim(),
        type: input.type,
        category_id: input.categoryId,
        amount: input.amount,
        date: input.date,
        tag,
        payment_method: input.paymentMethod ?? null,
      })
      .eq("id", editingId)
      .select("id,user_id,description,type,category_id,amount,date,tag,payment_method,created_at")
      .single();
    if (error) throw error;
    return mapTransaction(data as TransactionRow);
  }

  const { data, error } = await supabase
    .from("transactions")
    .insert({
      user_id: userId,
      description: input.description.trim(),
      type: input.type,
      category_id: input.categoryId,
      amount: input.amount,
      date: input.date,
      tag,
      payment_method: input.paymentMethod ?? null,
    })
    .select("id,user_id,description,type,category_id,amount,date,tag,payment_method,created_at")
    .single();
  if (error) throw error;
  return mapTransaction(data as TransactionRow);
}

export async function deleteTransaction(id: string): Promise<void> {
  const supabase = requireSupabase();
  const { error } = await supabase.from("transactions").delete().eq("id", id);
  if (error) throw error;
}

export type MonthlyCashflowPoint = {
  monthKey: string; // YYYY-MM
  income: number;
  expense: number;
  balance: number;
};

export async function listMonthlyCashflow(lastNMonths: number): Promise<MonthlyCashflowPoint[]> {
  const supabase = requireSupabase();
  const now = new Date();
  const start = startOfMonth(subMonths(now, lastNMonths - 1));
  const startKey = format(start, "yyyy-MM-01");

  // view monthly_cashflow: user_id, month(date), income, expense, balance
  const { data, error } = await supabase
    .from("monthly_cashflow")
    .select("month,income,expense,balance")
    .gte("month", startKey)
    .order("month", { ascending: true });
  if (error) throw error;

  type MonthlyRow = {
    month: string;
    income: number | null;
    expense: number | null;
    balance: number | null;
  };

  return (data as MonthlyRow[] | null | undefined ?? []).map((row) => {
    const monthDate = typeof row.month === "string" ? parseISO(row.month) : new Date(row.month);
    const monthKey = format(monthDate, "yyyy-MM");
    return {
      monthKey,
      income: Number(row.income ?? 0),
      expense: Number(row.expense ?? 0),
      balance: Number(row.balance ?? 0),
    } satisfies MonthlyCashflowPoint;
  });
}

