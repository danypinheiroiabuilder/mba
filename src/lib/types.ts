import { z } from "zod";

export type CashflowType = "income" | "expense";
export type PaymentMethod = "pix" | "debito" | "credito" | "dinheiro" | "transferencia" | "outro";

export const PAYMENT_METHODS: { value: PaymentMethod; label: string }[] = [
  { value: "pix", label: "Pix" },
  { value: "debito", label: "Débito" },
  { value: "credito", label: "Crédito" },
  { value: "dinheiro", label: "Dinheiro" },
  { value: "transferencia", label: "Transferência" },
  { value: "outro", label: "Outro" },
];

export type Category = {
  id: string;
  name: string;
  type: CashflowType;
  color: string;
  createdAt: string; // ISO
};

export type Transaction = {
  id: string;
  description: string;
  type: CashflowType;
  categoryId: string;
  amount: number; // always positive
  date: string; // YYYY-MM-DD
  tag?: string;
  paymentMethod?: PaymentMethod;
  createdAt: string; // ISO
};

export const categorySchema = z.object({
  name: z.string().trim().min(2, "Informe a descrição da categoria"),
  type: z.enum(["income", "expense"]),
  color: z
    .string()
    .trim()
    .regex(/^#([0-9a-fA-F]{6})$/, "Use uma cor HEX (#RRGGBB)"),
});

export type CategoryInput = z.infer<typeof categorySchema>;

export const transactionSchema = z.object({
  description: z.string().trim().min(2, "Informe a descrição"),
  type: z.enum(["income", "expense"]),
  categoryId: z.string().trim().min(1, "Selecione uma categoria"),
  amount: z
    .number()
    .finite("Informe o valor")
    .positive("O valor deve ser maior que 0"),
  date: z
    .string()
    .trim()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Use a data no formato AAAA-MM-DD"),
  tag: z.string().trim().optional(),
  paymentMethod: z.enum(["pix", "debito", "credito", "dinheiro", "transferencia", "outro"]).optional(),
});

export type TransactionInput = z.infer<typeof transactionSchema>;

