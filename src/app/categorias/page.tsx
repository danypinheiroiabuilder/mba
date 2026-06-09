"use client";

import { useEffect, useMemo, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, useWatch } from "react-hook-form";

import type { CashflowType } from "@/lib/types";
import { categorySchema, type CategoryInput } from "@/lib/types";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { useAuthStore } from "@/stores/auth";
import { useDataStore } from "@/stores/data";

function Section({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <div>
        <div className="text-sm font-medium text-muted">{subtitle}</div>
        <div className="text-base font-semibold tracking-tight text-text">
          {title}
        </div>
      </div>
      {children}
    </div>
  );
}

export default function CategoriasPage() {
  const { user } = useAuthStore();
  const {
    categories,
    refreshCategories,
    addCategory,
    removeCategory: removeCategoryAction,
  } = useDataStore();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    void refreshCategories();
  }, [refreshCategories]);

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
    await addCategory(values, user.id);
    setOpen(false);
    form.reset({ name: "", type: values.type, color: values.color });
  }

  async function handleRemoveCategory(id: string) {
    try {
      await removeCategoryAction(id);
    } catch (e: unknown) {
      alert(
        e instanceof Error
          ? e.message
          : "Não foi possível excluir. Se houver lançamentos usando esta categoria, remova/edite os lançamentos primeiro.",
      );
    }
  }

  function typeLabel(t: CashflowType) {
    return t === "income" ? "Receitas" : "Despesas";
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="text-sm font-medium text-muted">Cadastros</div>
          <div className="text-2xl font-semibold tracking-tight text-text">
            Categorias
          </div>
        </div>
        <Button variant="primary" onClick={() => setOpen(true)}>
          Nova categoria
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {(["income", "expense"] as const).map((t) => {
          const list = t === "income" ? byType.income : byType.expense;
          return (
            <Card key={t}>
              <Section
                title={typeLabel(t)}
                subtitle={t === "income" ? "Entrada" : "Saída"}
              >
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
                          onClick={() => void handleRemoveCategory(c.id)}
                        >
                          Excluir
                        </Button>
                      </div>
                    ))
                  )}
                </div>
              </Section>
            </Card>
          );
        })}
      </div>

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
            <div className="text-xs font-medium text-muted">Nome</div>
            <Input placeholder="Ex.: Alimentação" {...form.register("name")} />
            {form.formState.errors.name && (
              <div className="text-xs text-expense">
                {form.formState.errors.name.message}
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="space-y-1">
              <div className="text-xs font-medium text-muted">Tipo</div>
              <Select {...form.register("type")}>
                <option value="income">Receita</option>
                <option value="expense">Despesa</option>
              </Select>
              {form.formState.errors.type && (
                <div className="text-xs text-expense">
                  {form.formState.errors.type.message}
                </div>
              )}
            </div>

            <div className="space-y-1">
              <div className="text-xs font-medium text-muted">Cor</div>
              <div className="flex items-center gap-2">
                <Input
                  type="color"
                  className="h-10 w-14 p-1"
                  value={color}
                  onChange={(e) => form.setValue("color", e.target.value, { shouldValidate: true })}
                />
                <Input
                  placeholder="#6E7BFF"
                  value={color}
                  onChange={(e) => form.setValue("color", e.target.value, { shouldValidate: true })}
                />
              </div>
              {form.formState.errors.color && (
                <div className="text-xs text-expense">
                  {form.formState.errors.color.message}
                </div>
              )}
            </div>
          </div>
        </form>
      </Dialog>
    </div>
  );
}

