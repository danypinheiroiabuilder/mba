"use client";

import { useEffect, useMemo, useState } from "react";
import { format } from "date-fns";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";
import { AnimatePresence } from "framer-motion";
import { ArrowUpCircle, ArrowDownCircle, Wallet, ListPlus } from "lucide-react";

import type { Transaction } from "@/lib/types";
import { transactionSchema, type TransactionInput, PAYMENT_METHODS } from "@/lib/types";
import { clampMonthKey, monthLabelFromKey, shiftMonthKey } from "@/lib/dates";
import { formatBRL } from "@/lib/money";
import { calculateTotals } from "@/lib/helpers";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { PageHeader } from "@/components/PageHeader";
import { MonthNavigator } from "@/components/MonthNavigator";
import { TransactionRow } from "@/components/TransactionRow";
import { FieldError } from "@/components/ui/FieldError";
import { useAuthStore } from "@/stores/auth";
import { useDataStore } from "@/stores/data";

export default function TransacoesPage() {
  const { user } = useAuthStore();
  const [monthKey, setMonthKey] = useState(() => format(new Date(), "yyyy-MM"));
  const safeMonthKey = clampMonthKey(monthKey);

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Transaction | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const {
    categories: allCategories,
    categoriesError,
    transactions: tx,
    transactionsError,
    refreshCategories,
    refreshTransactions,
    saveTransaction,
    removeTransaction,
  } = useDataStore();

  useEffect(() => {
    if (!user) return;
    void refreshCategories();
  }, [user, refreshCategories]);

  useEffect(() => {
    if (!user) return;
    void refreshTransactions(safeMonthKey);
  }, [user, refreshTransactions, safeMonthKey]);

  useEffect(() => {
    if (categoriesError) toast.error(`Erro ao carregar categorias: ${categoriesError}`);
  }, [categoriesError]);

  useEffect(() => {
    if (transactionsError) toast.error(`Erro ao carregar lançamentos: ${transactionsError}`);
  }, [transactionsError]);

  const categoryById = useMemo(() => {
    const mapWithType = new Map<string, { name: string; color: string; type: string }>();
    for (const c of allCategories) {
      mapWithType.set(c.id, { name: c.name, color: c.color, type: c.type });
    }
    return mapWithType;
  }, [allCategories]);

  const form = useForm<TransactionInput>({
    resolver: zodResolver(transactionSchema),
    defaultValues: {
      description: "",
      type: "expense",
      categoryId: "",
      amount: 0,
      date: format(new Date(), "yyyy-MM-dd"),
      tag: "",
      paymentMethod: undefined,
    },
  });

  const selectedType = useWatch({ control: form.control, name: "type" });
  const categoriesForType = useMemo(() => {
    return allCategories.filter((c) => c.type === selectedType);
  }, [allCategories, selectedType]);

  function openNew() {
    setEditing(null);
    form.reset({
      description: "",
      type: "expense",
      categoryId: "",
      amount: 0,
      date: format(new Date(), "yyyy-MM-dd"),
      tag: "",
      paymentMethod: undefined,
    });
    setOpen(true);
  }

  function openEdit(t: Transaction) {
    setEditing(t);
    form.reset({
      description: t.description,
      type: t.type,
      categoryId: t.categoryId,
      amount: t.amount,
      date: t.date,
      tag: t.tag ?? "",
      paymentMethod: t.paymentMethod,
    });
    setOpen(true);
  }

  async function onSubmit(values: TransactionInput) {
    if (!user) return;
    try {
      await saveTransaction(values, user.id, editing?.id);
      toast.success(editing ? "Lançamento atualizado" : "Lançamento salvo");
      setOpen(false);
      setEditing(null);
    } catch {
      toast.error("Erro ao salvar lançamento");
    }
  }

  const [filterCategoryId, setFilterCategoryId] = useState("");
  const [filterTag, setFilterTag] = useState("");

  const filteredTx = useMemo(() => {
    const tag = filterTag.trim().replace(/^#/, "").toLowerCase();
    return tx.filter((t) => {
      if (filterCategoryId && t.categoryId !== filterCategoryId) return false;
      if (tag) {
        const has = (t.tag ?? "").toLowerCase().includes(tag);
        if (!has) return false;
      }
      return true;
    });
  }, [tx, filterCategoryId, filterTag]);

  const totals = useMemo(() => calculateTotals(filteredTx), [filteredTx]);

  const runningBalances = useMemo(() => {
    const balanceMap = new Map<string, number>();
    let accumulated = 0;

    filteredTx
      .slice()
      .sort((a, b) => (a.date < b.date ? -1 : 1))
      .forEach((t) => {
        accumulated += t.type === "income" ? t.amount : -t.amount;
        balanceMap.set(t.id, accumulated);
      });

    return balanceMap;
  }, [filteredTx]);

  async function removeTx(id: string) {
    try {
      await removeTransaction(id);
      toast.success("Lançamento removido");
      setDeleteConfirm(null);
    } catch {
      toast.error("Erro ao remover lançamento");
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        label="Cadastros"
        title="Receitas &amp; Despesas"
        subtitle={monthLabelFromKey(safeMonthKey)}
        actions={
          <div className="flex flex-wrap gap-2">
            <MonthNavigator monthKey={safeMonthKey} setMonthKey={setMonthKey} />
            <Button variant="primary" onClick={openNew}>
              Novo lançamento
            </Button>
          </div>
        }
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Card>
          <div className="flex items-start justify-between">
            <div>
              <div className="text-sm font-medium text-muted">Receitas</div>
              <div className="mt-1 text-xl font-semibold text-income">{formatBRL(totals.income)}</div>
            </div>
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-income/15 ring-1 ring-income/25">
              <ArrowUpCircle className="h-4 w-4 text-income" strokeWidth={1.75} aria-hidden="true" />
            </div>
          </div>
        </Card>
        <Card>
          <div className="flex items-start justify-between">
            <div>
              <div className="text-sm font-medium text-muted">Despesas</div>
              <div className="mt-1 text-xl font-semibold text-expense">{formatBRL(totals.expense)}</div>
            </div>
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-expense/15 ring-1 ring-expense/25">
              <ArrowDownCircle className="h-4 w-4 text-expense" strokeWidth={1.75} aria-hidden="true" />
            </div>
          </div>
        </Card>
        <Card>
          <div className="flex items-start justify-between">
            <div>
              <div className="text-sm font-medium text-muted">Saldo</div>
              <div className="mt-1 text-xl font-semibold text-text">{formatBRL(totals.balance)}</div>
            </div>
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/15 ring-1 ring-primary/25">
              <Wallet className="h-4 w-4 text-primary" strokeWidth={1.75} aria-hidden="true" />
            </div>
          </div>
        </Card>
      </div>

      <Card>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/15 ring-1 ring-primary/25">
              <ListPlus className="h-4 w-4 text-primary" strokeWidth={1.75} aria-hidden="true" />
            </div>
            <div>
              <div className="text-sm font-medium text-muted">Lançamentos</div>
              <div className="text-base font-semibold tracking-tight text-text">
                Lista do mês
              </div>
            </div>
          </div>
          <div className="text-xs text-muted">{filteredTx.length} itens</div>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
          <div className="space-y-1">
            <label htmlFor="filter-category" className="text-xs font-medium text-muted">
              Filtrar por categoria
            </label>
            <Select
              id="filter-category"
              value={filterCategoryId}
              onChange={(e) => setFilterCategoryId(e.target.value)}
            >
              <option value="">Todas</option>
              {allCategories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </Select>
          </div>
          <div className="space-y-1">
            <label htmlFor="filter-tag" className="text-xs font-medium text-muted">
              Buscar por tag
            </label>
            <Input
              id="filter-tag"
              placeholder="Ex.: mercado"
              value={filterTag}
              onChange={(e) => setFilterTag(e.target.value)}
            />
          </div>
        </div>

        <div className="mt-4 space-y-2">
          {filteredTx.length === 0 ? (
            <div className="rounded-2xl border border-border bg-card/30 p-4 text-sm text-muted">
              Nenhum lançamento com os filtros atuais.
            </div>
          ) : (
            <AnimatePresence>
              {filteredTx
                .slice()
                .sort((a, b) => (a.date < b.date ? 1 : -1))
                .map((t) => (
                  <TransactionRow
                    key={t.id}
                    transaction={t}
                    category={categoryById.get(t.categoryId)}
                    onEdit={openEdit}
                    onDelete={setDeleteConfirm}
                    runningBalance={runningBalances.get(t.id)}
                  />
                ))}
            </AnimatePresence>
          )}
        </div>
      </Card>

      <Dialog
        open={open}
        title={editing ? "Editar lançamento" : "Novo lançamento"}
        onClose={() => {
          setOpen(false);
          setEditing(null);
        }}
        footer={
          <div className="flex gap-2">
            <Button
              variant="ghost"
              type="button"
              onClick={() => {
                setOpen(false);
                setEditing(null);
              }}
            >
              Cancelar
            </Button>
            <Button variant="primary" type="button" onClick={form.handleSubmit(onSubmit)}>
              Salvar
            </Button>
          </div>
        }
      >
        <form className="space-y-4">
          <div className="space-y-1">
            <label htmlFor="description" className="text-xs font-medium text-muted">
              Descrição
            </label>
            <Input
              id="description"
              placeholder="Ex.: Compra no mercado"
              {...form.register("description")}
            />
            <FieldError message={form.formState.errors.description?.message} />
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="space-y-1">
              <label htmlFor="type" className="text-xs font-medium text-muted">
                Tipo
              </label>
              <Select
                id="type"
                {...form.register("type")}
                onChange={(e) => {
                  form.setValue(
                    "type",
                    e.target.value as TransactionInput["type"],
                    { shouldValidate: true },
                  );
                  form.setValue("categoryId", "", { shouldValidate: true });
                }}
              >
                <option value="income">Receita</option>
                <option value="expense">Despesa</option>
              </Select>
              <FieldError message={form.formState.errors.type?.message} />
            </div>

            <div className="space-y-1">
              <label htmlFor="date" className="text-xs font-medium text-muted">
                Data
              </label>
              <Input id="date" type="date" {...form.register("date")} />
              <FieldError message={form.formState.errors.date?.message} />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="space-y-1">
              <label htmlFor="categoryId" className="text-xs font-medium text-muted">
                Categoria
              </label>
              <Select id="categoryId" {...form.register("categoryId")}>
                <option value="">Selecione...</option>
                {categoriesForType.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </Select>
              <FieldError message={form.formState.errors.categoryId?.message} />
              {categoriesForType.length === 0 && (
                <div className="text-xs text-muted">
                  Não há categorias para este tipo. Cadastre em{" "}
                  <span className="text-text">Categorias</span>.
                </div>
              )}
            </div>

            <div className="space-y-1">
              <label htmlFor="amount" className="text-xs font-medium text-muted">
                Valor
              </label>
              <Input
                id="amount"
                type="number"
                step="0.01"
                inputMode="decimal"
                {...form.register("amount", { valueAsNumber: true })}
              />
              <FieldError message={form.formState.errors.amount?.message} />
            </div>
          </div>

          <div className="space-y-1">
            <label htmlFor="tag" className="text-xs font-medium text-muted">
              Tag (opcional)
            </label>
            <Input id="tag" placeholder="Ex.: mercado" {...form.register("tag")} />
            <FieldError message={form.formState.errors.tag?.message} />
          </div>

          <div className="space-y-1">
            <label htmlFor="paymentMethod" className="text-xs font-medium text-muted">
              Forma de pagamento (opcional)
            </label>
            <Select id="paymentMethod" {...form.register("paymentMethod")}>
              <option value="">Selecione...</option>
              {PAYMENT_METHODS.map(({ value, label }) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </Select>
            <FieldError message={form.formState.errors.paymentMethod?.message} />
          </div>
        </form>
      </Dialog>

      <Dialog
        open={!!deleteConfirm}
        title="Excluir lançamento"
        onClose={() => setDeleteConfirm(null)}
        footer={
          <div className="flex gap-2">
            <Button variant="ghost" type="button" onClick={() => setDeleteConfirm(null)}>
              Cancelar
            </Button>
            <Button
              variant="primary"
              type="button"
              className="bg-expense/80 hover:bg-expense text-text"
              onClick={() => deleteConfirm && void removeTx(deleteConfirm)}
            >
              Excluir
            </Button>
          </div>
        }
      >
        <div className="space-y-2">
          <p className="text-sm text-muted">
            Tem certeza que deseja excluir este lançamento? Esta ação não pode ser desfeita.
          </p>
        </div>
      </Dialog>
    </div>
  );
}

