"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import type { Stat } from "@/lib/game/growth";
import type { BoardMonster } from "./MonsterBoard";

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

/** 画面を移動しないリリース（探索中の編成パネル用） */
export async function releaseMonsterAction(monsterId: string): Promise<ActionResult> {
  const { supabase } = await requireUser();
  const { error } = await supabase.rpc("release_monster", { p_monster_id: monsterId });
  revalidatePath("/monsters");
  return error ? { error: error.message } : {};
}

/** 編成画面に出すモンスターの一覧 */
export async function loadBoardAction(): Promise<{ monsters: BoardMonster[]; boxCapacity: number }> {
  const { supabase, user } = await requireUser();
  const [{ data: monsters }, { data: profile }] = await Promise.all([
    supabase
      .from("Player_Monsters")
      .select("id, nickname, level, party_slot, in_storage, species:Monster_Species(name, rank, image_path)")
      .eq("owner_id", user.id)
      .order("obtained_at"),
    supabase.from("profiles").select("box_capacity").eq("id", user.id).maybeSingle(),
  ]);
  return {
    monsters: (monsters ?? []).map((m) => ({
      id: m.id,
      name: m.nickname ?? m.species?.name ?? "？",
      speciesName: m.species?.name ?? "？",
      rank: m.species?.rank ?? null,
      imagePath: m.species?.image_path ?? null,
      level: m.level,
      slot: m.party_slot,
      inStorage: m.in_storage,
    })),
    boxCapacity: profile?.box_capacity ?? 0,
  };
}
