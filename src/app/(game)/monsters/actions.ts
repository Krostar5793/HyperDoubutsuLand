"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import type { Stat } from "@/lib/game/growth";

export type ActionResult = { error?: string };

/** 編成の移動・入れ替え（slot が null なら控えへ） */
export async function moveMonsterAction(monsterId: string, slot: number | null): Promise<ActionResult> {
  const { supabase } = await requireUser();
  const { error } = await supabase.rpc("move_monster", {
    p_monster_id: monsterId,
    // 控えへ移すときは null を渡す（関数の引数は NULL を受け付ける）
    p_target_slot: slot as number,
  });
  revalidatePath("/monsters");
  return error ? { error: error.message } : {};
}

export async function withdrawAction(monsterId: string): Promise<ActionResult> {
  const { supabase } = await requireUser();
  const { error } = await supabase.rpc("withdraw_from_storage", { p_monster_id: monsterId });
  revalidatePath("/monsters");
  return error ? { error: error.message } : {};
}

export async function releaseAction(monsterId: string): Promise<ActionResult> {
  const { supabase } = await requireUser();
  const { error } = await supabase.rpc("release_monster", { p_monster_id: monsterId });
  if (error) return { error: error.message };
  revalidatePath("/monsters");
  redirect("/monsters");
}

export async function allocateLimitPointAction(monsterId: string, stat: Stat): Promise<ActionResult> {
  const { supabase } = await requireUser();
  const { error } = await supabase.rpc("allocate_limit_point", { p_monster_id: monsterId, p_stat: stat });
  revalidatePath(`/monsters/${monsterId}`);
  return error ? { error: error.message } : {};
}
