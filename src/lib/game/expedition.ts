import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import { buildBattle } from "./battle-server";
import { check, one, rows } from "./db";
import { planStep, type AreaConfig, type AreaLoot, type StepEvent } from "./explore";

/**
 * 探索の進行（サーバー専用）。引数の supabase は管理者クライアント（createAdminClient）を渡す。
 * 呼び出し側（Server Action など）で、userId がログイン中のユーザー本人であることを確認してから使う。
 *
 * 画面側は advanceExpedition を繰り返し呼んで自動で進め、
 * ポーズ中は呼ぶのを止める。引き返すときは retreatExpedition を呼ぶ。
 */

type Admin = SupabaseClient<Database>;

export async function loadAreaConfig(supabase: Admin, areaId: number): Promise<AreaConfig> {
  const area = one(
    await supabase.from("Areas").select("id, min_enemies, max_enemies, is_active").eq("id", areaId).single(),
  );
  if (!area.is_active) throw new Error("このエリアは現在探索できません");
  const [squares, encounters, loot, bosses] = await Promise.all([
    supabase.from("Area_Squares").select("position, monster_rate, item_rate, chest_rate, choice_rate").eq("area_id", areaId),
    supabase.from("Area_Encounters").select("species_id, weight, min_level, max_level").eq("area_id", areaId),
    supabase.from("Area_Loot").select("source, item_id, currency_code, weight, min_quantity, max_quantity").eq("area_id", areaId),
    supabase.from("Area_Bosses").select("slot, species_id, level").eq("area_id", areaId),
  ]);
  return {
    id: area.id,
    min_enemies: area.min_enemies,
    max_enemies: area.max_enemies,
    squares: rows(squares),
    encounters: rows(encounters),
    loot: rows(loot) as AreaLoot[],
    bosses: rows(bosses),
  };
}

/** 探索を始める。すでに探索中なら、その探索を返す */
export async function startExpedition(supabase: Admin, userId: string, areaId: number) {
  const active = check(
    await supabase.from("Expeditions").select("id, area_id").eq("owner_id", userId).eq("status", "exploring").maybeSingle(),
  );
  if (active) return { expeditionId: active.id as string, resumed: true };

  await loadAreaConfig(supabase, areaId); // エリアが探索できるか確認
  const row = one(
    await supabase.from("Expeditions").insert({ owner_id: userId, area_id: areaId }).select("id").single(),
  );
  return { expeditionId: row.id as string, resumed: false };
}

export type AdvanceResult = {
  event: StepEvent;
  finish: "cleared" | null;
  position: number;
  totalSquares: number;
  /** 戦闘が始まったときの戦闘 ID */
  battleId: string | null;
};

/** 1 マス進める（モンスターやボスに出会ったら戦闘を始める） */
export async function advanceExpedition(
  supabase: Admin,
  userId: string,
  expeditionId: string,
  options: { random?: () => number } = {},
): Promise<AdvanceResult> {
  const exp = one(
    await supabase
      .from("Expeditions")
      .select("id, owner_id, area_id, status, position, battle_id, party_state")
      .eq("id", expeditionId)
      .single(),
  );
  if (exp.owner_id !== userId) throw new Error("探索が見つかりません");
  if (exp.status !== "exploring") throw new Error("この探索はすでに終わっています");
  if (exp.battle_id) throw new Error("戦闘中です");

  const area = await loadAreaConfig(supabase, exp.area_id);
  const plan = planStep(area, exp.position, { random: options.random });

  if (plan.encounter) {
    const state = await buildBattle(
      supabase,
      userId,
      plan.encounter.enemies,
      plan.encounter.boss,
      exp.party_state as Record<string, { hp: number; mp: number }>,
    );
    const battleId = check(
      await supabase.rpc("begin_expedition_battle", {
        p_expedition_id: expeditionId,
        p_expected_position: exp.position,
        p_state: state as never,
        p_event: plan.event as never,
      }),
    ) as string;
    return { event: plan.event, finish: null, position: exp.position, totalSquares: area.squares.length, battleId };
  }

  check(
    await supabase.rpc("commit_expedition_step", {
      p_expedition_id: expeditionId,
      p_expected_position: exp.position,
      p_advance: plan.advance,
      p_event: plan.event as never,
      p_loot: plan.loot as never,
      p_recruit: null as never,
      p_finish: plan.finish as string,
    }),
  );

  return {
    event: plan.event,
    finish: plan.finish,
    position: exp.position + (plan.advance ? 1 : 0),
    totalSquares: area.squares.length,
    battleId: null,
  };
}

/** 引き返す（拾ったものは受け取れる。クリア報酬はなし） */
export async function retreatExpedition(supabase: Admin, userId: string, expeditionId: string) {
  const exp = one(
    await supabase.from("Expeditions").select("owner_id, status, position, battle_id").eq("id", expeditionId).single(),
  );
  if (exp.owner_id !== userId) throw new Error("探索が見つかりません");
  if (exp.status !== "exploring") throw new Error("この探索はすでに終わっています");
  if (exp.battle_id) throw new Error("戦闘中は引き返せません");

  check(
    await supabase.rpc("commit_expedition_step", {
      p_expedition_id: expeditionId,
      p_expected_position: exp.position,
      p_advance: false,
      p_event: { type: "retreat", position: exp.position },
      p_loot: [],
      p_recruit: null as never,
      p_finish: "retreated",
    }),
  );
}
