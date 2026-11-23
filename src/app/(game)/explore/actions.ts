"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import {
  advanceExpedition,
  retreatExpedition,
  startExpedition,
  type AdvanceResult,
} from "@/lib/game/expedition";
import type { BattleState, Command } from "@/lib/game/battle";
import { submitBattleTurn, type TurnResult } from "@/lib/game/battle-server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function startExpeditionAction(areaId: number) {
  const { supabase, user } = await requireUser();

  // バトルメンバー（枠 1〜4）が 1 体もいなければ出発できない
  const { count } = await supabase
    .from("Player_Monsters")
    .select("id", { count: "exact", head: true })
    .eq("owner_id", user.id)
    .gte("party_slot", 1)
    .lte("party_slot", 4);
  if (!count) {
    return { error: "バトルメンバーが 1 体もいません。モンスター画面で編成してください" };
  }

  const { expeditionId } = await startExpedition(createAdminClient(), user.id, areaId);
  redirect(`/explore/${expeditionId}`);
}

export async function advanceAction(
  expeditionId: string,
): Promise<{ result?: AdvanceResult; error?: string }> {
  const { user } = await requireUser();
  try {
    const result = await advanceExpedition(createAdminClient(), user.id, expeditionId);
    if (result.finish) revalidatePath("/", "layout");
    return { result };
  } catch (e) {
    return { error: e instanceof Error ? e.message : String(e) };
  }
}

export async function retreatAction(expeditionId: string): Promise<{ error?: string }> {
  const { user } = await requireUser();
  try {
    await retreatExpedition(createAdminClient(), user.id, expeditionId);
    revalidatePath("/", "layout");
    return {};
  } catch (e) {
    return { error: e instanceof Error ? e.message : String(e) };
  }
}

export async function battleTurnAction(
  battleId: string,
  commands: Command[],
): Promise<{ result?: TurnResult; error?: string }> {
  const { user } = await requireUser();
  try {
    const result = await submitBattleTurn(createAdminClient(), user.id, battleId, commands);
    if (result.finished) revalidatePath("/", "layout");
    return { result };
  } catch (e) {
    return { error: e instanceof Error ? e.message : String(e) };
  }
}

/** 探索中の戦闘の状態を読み込む（画面の再読み込みや、探索の途中から戻ったとき） */
export async function loadBattleAction(battleId: string): Promise<{ state?: BattleState; error?: string }> {
  const { supabase } = await requireUser();
  const { data, error } = await supabase.from("Battles").select("state").eq("id", battleId).maybeSingle();
  if (error || !data) return { error: error?.message ?? "戦闘が見つかりません" };
  return { state: data.state as unknown as BattleState };
}
