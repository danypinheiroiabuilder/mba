"use client";

import { create } from "zustand";

import type { Category, Transaction } from "@/lib/types";
import { createCategory, deleteCategory, listCategories, updateCategory as updateCategoryService } from "@/services/categories";
import {
  deleteTransaction,
  listMonthlyCashflow,
  listTransactionsByMonth,
  listTransactionsByRange,
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

  // Lançamentos brutos do período analisado no Resumo Anual, para permitir
  // filtrar por categoria (a view agregada não guarda essa informação).
  analysisTransactions: Transaction[];
  analysisRange: { from: string; to: string } | null;
  analysisLoading: boolean;
  analysisError: string | null;

  // Momento da última busca bem-sucedida de cada consulta, para o cache curto.
  fetchedAt: Record<string, number>;

  refreshCategories: (options?: FetchOptions) => Promise<void>;
  refreshTransactions: (monthKey: string, options?: FetchOptions) => Promise<void>;
  refreshCashflow12m: (options?: FetchOptions) => Promise<void>;
  refreshAnalysisTransactions: (
    from: string,
    to: string,
    options?: FetchOptions,
  ) => Promise<void>;

  addCategory: (input: Parameters<typeof createCategory>[0], userId: string) => Promise<void>;
  updateCategory: (id: string, input: Parameters<typeof createCategory>[0]) => Promise<void>;
  removeCategory: (id: string) => Promise<void>;

  saveTransaction: (
    input: Parameters<typeof upsertTransaction>[0],
    userId: string,
    editingId?: string,
  ) => Promise<void>;
  removeTransaction: (id: string) => Promise<void>;

  resetData: () => void;
};

/**
 * Janela em que um dado já carregado é reaproveitado em vez de reconsultado.
 * Sem isso, cada troca de página refaz todas as consultas do zero e a tela
 * fica esperando a rede para mostrar o que já estava em memória.
 * Mutações (salvar/excluir) invalidam na hora, então o valor não atrasa edição.
 */
const CACHE_TTL_MS = 30_000;

type FetchOptions = { force?: boolean };

function isFresh(fetchedAt: Record<string, number>, key: string): boolean {
  const at = fetchedAt[key];
  return at !== undefined && Date.now() - at < CACHE_TTL_MS;
}

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

  analysisTransactions: [],
  analysisRange: null,
  analysisLoading: false,
  analysisError: null,

  fetchedAt: {},

  refreshCategories: async (options) => {
    if (!options?.force && isFresh(get().fetchedAt, "categories")) return;
    set({ categoriesLoading: true, categoriesError: null });
    try {
      const categories = await listCategories();
      set((state) => ({
        categories,
        categoriesError: null,
        fetchedAt: { ...state.fetchedAt, categories: Date.now() },
      }));
    } catch (error) {
      const message = extractMessage(error, "Failed to load categories");
      set({ categoriesError: message });
    } finally {
      set({ categoriesLoading: false });
    }
  },

  refreshTransactions: async (monthKey: string, options) => {
    const cacheKey = `transactions:${monthKey}`;
    if (!options?.force && get().monthKey === monthKey && isFresh(get().fetchedAt, cacheKey)) {
      return;
    }
    set({ transactionsLoading: true, monthKey, transactionsError: null });
    try {
      const transactions = await listTransactionsByMonth(monthKey);
      set((state) => ({
        transactions,
        transactionsError: null,
        fetchedAt: { ...state.fetchedAt, [cacheKey]: Date.now() },
      }));
    } catch (error) {
      const message = extractMessage(error, "Failed to load transactions");
      set({ transactionsError: message });
    } finally {
      set({ transactionsLoading: false });
    }
  },

  refreshCashflow12m: async (options) => {
    if (!options?.force && isFresh(get().fetchedAt, "cashflow12m")) return;
    set({ cashflowLoading: true, cashflowError: null });
    try {
      const cashflow12m = await listMonthlyCashflow(12);
      set((state) => ({
        cashflow12m,
        cashflowError: null,
        fetchedAt: { ...state.fetchedAt, cashflow12m: Date.now() },
      }));
    } catch (error) {
      const message = extractMessage(error, "Failed to load cashflow");
      set({ cashflowError: message });
    } finally {
      set({ cashflowLoading: false });
    }
  },

  refreshAnalysisTransactions: async (from: string, to: string, options) => {
    const cacheKey = `analysis:${from}:${to}`;
    if (!options?.force && isFresh(get().fetchedAt, cacheKey)) return;
    set({ analysisLoading: true, analysisError: null });
    try {
      const analysisTransactions = await listTransactionsByRange(from, to);
      set((state) => ({
        analysisTransactions,
        analysisRange: { from, to },
        analysisError: null,
        fetchedAt: { ...state.fetchedAt, [cacheKey]: Date.now() },
      }));
    } catch (error) {
      const message = extractMessage(error, "Failed to load analysis transactions");
      set({ analysisError: message });
    } finally {
      set({ analysisLoading: false });
    }
  },

  addCategory: async (input, userId) => {
    await createCategory(input, userId);
    await get().refreshCategories({ force: true });
  },

  updateCategory: async (id, input) => {
    await updateCategoryService(id, input);
    await get().refreshCategories({ force: true });
  },

  removeCategory: async (id) => {
    await deleteCategory(id);
    await get().refreshCategories({ force: true });
  },

  saveTransaction: async (input, userId, editingId) => {
    await upsertTransaction(input, userId, editingId);
    const monthKey = get().monthKey;
    if (monthKey) await get().refreshTransactions(monthKey, { force: true });
    await get().refreshCashflow12m({ force: true });
    // Mantém o Resumo Anual em dia sem forçar quem não abriu a tela a buscar.
    const range = get().analysisRange;
    if (range) await get().refreshAnalysisTransactions(range.from, range.to, { force: true });
  },

  removeTransaction: async (id) => {
    await deleteTransaction(id);
    const monthKey = get().monthKey;
    if (monthKey) await get().refreshTransactions(monthKey, { force: true });
    await get().refreshCashflow12m({ force: true });
    // Mantém o Resumo Anual em dia sem forçar quem não abriu a tela a buscar.
    const range = get().analysisRange;
    if (range) await get().refreshAnalysisTransactions(range.from, range.to, { force: true });
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
      analysisTransactions: [],
      analysisRange: null,
      analysisError: null,
      fetchedAt: {},
    });
  },
}));

