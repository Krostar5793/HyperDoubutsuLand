"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";

export async function applyFieldItemAction(itemId: number): Promise<{ error?: string }> {
  const { supabase } = await requireUser();
  const { error } = await supabase.rpc("use_field_item", { p_item_id: itemId });
  revalidatePath("/", "layout");
  return error ? { error: error.message } : {};
}
