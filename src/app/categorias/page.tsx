"use client";

import { useEffect, useMemo, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";

import type { CashflowType } from "@/lib/types";
import { categorySchema, type CategoryInput } from "@/lib/types";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { PageHeader } from "@/components/PageHeader";
import { FieldError } from "@/components/ui/FieldError";
import { useAuthStore } from "@/stores/auth";
import { useDataStore } from "@/stores/data";

type DeleteError = { categoryId: string; message: string } | null;

export default function CategoriasPage() {
  const { user } = useAuthStore();
  const {
    categories,
    categoriesError,
    refreshCategories,
    addCategory,
    removeCategory: removeCategoryAction,
  } = useDataStore();
  const [open, setOpen] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<DeleteError>(null);

  useEffect(() => {
    void refreshCategories();
  }, [refreshCategories]);

  useEffect(() => {
    if (categoriesError) toast.error(`Erro ao carregar categorias: ${categoriesError}`);
  }, [categoriesError]);

  const byType = useMemo(() => {
    const income = categories.filter((c) => c.type === "income");
    const expense = categories.filter((c) => c.type === "expense");
    return { income, expense };
  }, [categories]);

  const form = useForm<CategoryInput>({
    resolver: zodResolver(categorySchema),
    defaultValues: { name: "", type: "expense", color: "#6E7BFF" },
  });
  const color = useWatch({ control: form.control, name: "color" });

  async function onSubmit(values: CategoryInput) {
    if (!user) return;
    try {
      await addCategory(values, user.id);
      toast.success("Categoria criada");
      setOpen(false);
      form.reset({ name: "", type: values.type, color: values.color });
    } catch {
      toast.error("Erro ao criar categoria");
    }
  }

  async function handleRemoveCategory(id: string) {
    try {
      setDeleteError(null);
      await removeCategoryAction(id);
      toast.success("Categoria removida");
      setDeleteConfirm(null);
    } catch (e: unknown) {
      const message =
        e instanceof Error
          ? e.message
          : "Não foi possível excluir. Se houver lançamentos usando esta categoria, remova/edite os lançamentos primeiro.";
      setDeleteError({ categoryId: id, message });
      toast.error(message);
    }
  }

  function typeLabel(t: CashflowType) {
    return t === "income" ? "Receitas" : "Despesas";
  }

  return (
    <div className="space-y-6">
      <PageHeader
        label="Cadastros"
        title="Categorias"
        actions={
          <Button variant="primary" onClick={() => setOpen(true)}>
            Nova categoria
          </Button>
        }
      />

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {(["income", "expense"] as const).map((t) => {
          const list = t === "income" ? byType.income : byType.expense;
          return (
            <Card key={t}>
              <div className="space-y-2">
                <div>
                  <div className="text-sm font-medium text-muted">
                    {t === "income" ? "Entrada" : "Saída"}
                  </div>
                  <div className="text-base font-semibold tracking-tight text-text">
                    {typeLabel(t)}
                  </div>
                </div>
                <div className="mt-3 space-y-2">
                  {list.length === 0 ? (
                    <div className="rounded-2xl border border-border bg-card/30 p-4 text-sm text-muted">
                      Nenhuma categoria de {typeLabel(t).toLowerCase()} cadastrada.
                    </div>
                  ) : (
                    list.map((c) => (
                      <div
                        key={c.id}
                        className="flex items-center justify-between rounded-2xl border border-border bg-card/30 px-3 py-2"
                      >
                        <div className="flex min-w-0 items-center gap-2">
                          <span
                            className="h-2.5 w-2.5 rounded-full"
                            style={{ background: c.color }}
                          />
                          <div className="truncate text-sm font-medium text-text">
                            {c.name}
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          className="px-3"
                          aria-label={`Excluir categoria: ${c.name}`}
                          onClick={() => {
                            setDeleteConfirm(c.id);
                            setDeleteError(null);
                          }}
                        >
                          Excluir
                        </Button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      <Dialog
        open={!!deleteConfirm}
        title="Excluir categoria"
        onClose={() => {
          setDeleteConfirm(null);
          setDeleteError(null);
        }}
        footer={
          <div className="flex gap-2">
            <Button
              variant="ghost"
              type="button"
              onClick={() => {
                setDeleteConfirm(null);
                setDeleteError(null);
              }}
            >
              Cancelar
            </Button>
            <Button
              variant="primary"
              type="button"
              className="bg-expense/80 hover:bg-expense text-text"
              onClick={() => deleteConfirm && void handleRemoveCategory(deleteConfirm)}
            >
              Excluir
            </Button>
          </div>
        }
      >
        <div className="space-y-3">
          {deleteError && deleteError.categoryId === deleteConfirm && (
            <div
              role="alert"
              aria-live="polite"
              className="rounded-2xl border border-expense/30 bg-expense/10 p-3 text-sm text-expense"
            >
              {deleteError.message}
            </div>
          )}
          <p className="text-sm text-muted">
            Tem certeza que deseja excluir esta categoria? Esta ação não pode ser desfeita.
          </p>
        </div>
      </Dialog>

      <Dialog
        open={open}
        title="Categoria"
        onClose={() => setOpen(false)}
        footer={
          <div className="flex gap-2">
            <Button variant="ghost" type="button" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button
              variant="primary"
              type="button"
              onClick={form.handleSubmit(onSubmit)}
            >
              Salvar
            </Button>
          </div>
        }
      >
        <form className="space-y-4">
          <div className="space-y-1">
            <label htmlFor="name" className="text-xs font-medium text-muted">
              Nome
            </label>
            <Input
              id="name"
              placeholder="Ex.: Alimentação"
              {...form.register("name")}
            />
            <FieldError message={form.formState.errors.name?.message} />
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="space-y-1">
              <label htmlFor="type" className="text-xs font-medium text-muted">
                Tipo
              </label>
              <Select id="type" {...form.register("type")}>
                <option value="income">Receita</option>
                <option value="expense">Despesa</option>
              </Select>
              <FieldError message={form.formState.errors.type?.message} />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-muted">
                Cor
              </label>
              <div className="flex items-center gap-2">
                <Input
                  type="color"
                  className="h-10 w-14 p-1"
                  value={color}
                  onChange={(e) => form.setValue("color", e.target.value, { shouldValidate: true })}
                  aria-label="Seletor de cor"
                />
                <Input
                  id="colorHex"
                  placeholder="#6E7BFF"
                  value={color}
                  onChange={(e) => form.setValue("color", e.target.value, { shouldValidate: true })}
                  aria-label="Código de cor HEX"
                />
              </div>
              <FieldError message={form.formState.errors.color?.message} />
            </div>
          </div>
        </form>
      </Dialog>
    </div>
  );
}

