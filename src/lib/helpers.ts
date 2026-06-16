import type { Category, Transaction } from "./types";

export function calculateTotals(transactions: Transaction[]) {
  const income = transactions
    .filter((t) => t.type === "income")
    .reduce((sum, t) => sum + t.amount, 0);
  const expense = transactions
    .filter((t) => t.type === "expense")
    .reduce((sum, t) => sum + t.amount, 0);
  const balance = income - expense;
  return { income, expense, balance };
}

export function buildCategoryMap(categories: Category[]): Map<string, { name: string; color: string }> {
  const map = new Map<string, { name: string; color: string }>();
  for (const c of categories) {
    map.set(c.id, { name: c.name, color: c.color });
  }
  return map;
}

export function sumBy<T>(items: T[], pick: (t: T) => number): number {
  return items.reduce((acc, t) => acc + pick(t), 0);
}
