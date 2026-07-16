"use client";

import { create } from "zustand";

import type { Category, Transaction } from "@/lib/types";
import { createCategory, deleteCategory, listCategories } from "@/services/categories";
import {
  deleteTransaction,
  listMonthlyCashflow,
  listTransactionsByMonth,
  upsertTransaction,
  type MonthlyCashflowPoint,
} from "@/services/transactions";

type DataState = {
  categories: Category[];
  categoriesLoading: boolean;
  categoriesError: string | null;

  monthKey: string | null;
  transactions: Transaction[];
  transactionsLoading: boolean;
  transactionsError: string | null;

  cashflow12m: MonthlyCashflowPoint[];
  cashflowLoading: boolean;
  cashflowError: string | null;

  refreshCategories: () => Promise<void>;
  refreshTransactions: (monthKey: string) => Promise<void>;
  refreshCashflow12m: () => Promise<void>;

  addCategory: (input: Parameters<typeof createCategory>[0], userId: string) => Promise<void>;
  removeCategory: (id: string) => Promise<void>;

  saveTransaction: (
    input: Parameters<typeof upsertTransaction>[0],
    userId: string,
    editingId?: string,
  ) => Promise<void>;
  removeTransaction: (id: string) => Promise<void>;

  resetData: () => void;
};

function extractMessage(error: unknown, fallback: string): string {
  if (error instanceof Error) return error.message;
  if (typeof error === "object" && error !== null && "message" in error) {
    return String((error as { message: unknown }).message);
  }
  return fallback;
}

export const useDataStore = create<DataState>((set, get) => ({
  categories: [],
  categoriesLoading: false,
  categoriesError: null,

  monthKey: null,
  transactions: [],
  transactionsLoading: false,
  transactionsError: null,

  cashflow12m: [],
  cashflowLoading: false,
  cashflowError: null,

  refreshCategories: async () => {
    set({ categoriesLoading: true, categoriesError: null });
    try {
      const categories = await listCategories();
      set({ categories, categoriesError: null });
    } catch (error) {
      const message = extractMessage(error, "Failed to load categories");
      set({ categoriesError: message });
    } finally {
      set({ categoriesLoading: false });
    }
  },

  refreshTransactions: async (monthKey: string) => {
    set({ transactionsLoading: true, monthKey, transactionsError: null });
    try {
      const transactions = await listTransactionsByMonth(monthKey);
      set({ transactions, transactionsError: null });
    } catch (error) {
      const message = extractMessage(error, "Failed to load transactions");
      set({ transactionsError: message });
    } finally {
      set({ transactionsLoading: false });
    }
  },

  refreshCashflow12m: async () => {
    set({ cashflowLoading: true, cashflowError: null });
    try {
      const cashflow12m = await listMonthlyCashflow(12);
      set({ cashflow12m, cashflowError: null });
    } catch (error) {
      const message = extractMessage(error, "Failed to load cashflow");
      set({ cashflowError: message });
    } finally {
      set({ cashflowLoading: false });
    }
  },

  addCategory: async (input, userId) => {
    await createCategory(input, userId);
    await get().refreshCategories();
  },

  removeCategory: async (id) => {
    await deleteCategory(id);
    await get().refreshCategories();
  },

  saveTransaction: async (input, userId, editingId) => {
    await upsertTransaction(input, userId, editingId);
    const monthKey = get().monthKey;
    if (monthKey) await get().refreshTransactions(monthKey);
    await get().refreshCashflow12m();
  },

  removeTransaction: async (id) => {
    await deleteTransaction(id);
    const monthKey = get().monthKey;
    if (monthKey) await get().refreshTransactions(monthKey);
    await get().refreshCashflow12m();
  },

  resetData: () => {
    set({
      categories: [],
      categoriesError: null,
      monthKey: null,
      transactions: [],
      transactionsError: null,
      cashflow12m: [],
      cashflowError: null,
    });
  },
}));

