import { requireSupabase } from "@/services/supabase/client";
import type { Category, CategoryInput, CashflowType } from "@/lib/types";

type CategoryRow = {
  id: string;
  user_id: string;
  name: string;
  type: CashflowType;
  color: string;
  created_at: string;
};

function mapCategory(row: CategoryRow): Category {
  return {
    id: row.id,
    name: row.name,
    type: row.type,
    color: row.color,
    createdAt: row.created_at,
  };
}

export async function listCategories(): Promise<Category[]> {
  const supabase = requireSupabase();
  const { data, error } = await supabase
    .from("categories")
    .select("id,user_id,name,type,color,created_at")
    .order("name", { ascending: true });
  if (error) throw error;
  return (data ?? []).map(mapCategory);
}

export async function createCategory(input: CategoryInput, userId: string): Promise<Category> {
  const supabase = requireSupabase();
  const { data, error } = await supabase
    .from("categories")
    .insert({
      user_id: userId,
      name: input.name.trim(),
      type: input.type,
      color: input.color,
    })
    .select("id,user_id,name,type,color,created_at")
    .single();
  if (error) throw error;
  return mapCategory(data as CategoryRow);
}

export async function updateCategory(id: string, input: CategoryInput): Promise<Category> {
  const supabase = requireSupabase();
  const { data, error } = await supabase
    .from("categories")
    .update({
      name: input.name.trim(),
      type: input.type,
      color: input.color,
    })
    .eq("id", id)
    .select("id,user_id,name,type,color,created_at")
    .single();
  if (error) throw error;
  return mapCategory(data as CategoryRow);
}

// Postgres: foreign_key_violation. Ocorre ao excluir categoria que ainda tem
// lançamentos, já que a FK é ON DELETE RESTRICT.
const FOREIGN_KEY_VIOLATION = "23503";

export const CATEGORY_IN_USE_MESSAGE =
  "Esta categoria possui lançamentos vinculados e não pode ser excluída. Reclassifique os lançamentos antes de tentar novamente.";

export async function deleteCategory(id: string): Promise<void> {
  const supabase = requireSupabase();
  const { error } = await supabase.from("categories").delete().eq("id", id);
  if (!error) return;

  // PostgrestError é um objeto simples, não uma instância de Error — a UI
  // depende de `instanceof Error` para exibir a mensagem, então convertemos.
  if (error.code === FOREIGN_KEY_VIOLATION) {
    throw new Error(CATEGORY_IN_USE_MESSAGE);
  }

  throw new Error(error.message);
}

