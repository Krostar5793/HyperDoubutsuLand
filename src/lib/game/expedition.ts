import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { planStep, type AreaConfig, type BattleResolver, type StepEvent } from "./explore";
import { toRankTable, type RankData } from "./ranks";

/**
 * 探索の進行（サーバー専用）。引数の supabase は管理者クライアント（createAdminClient）を渡す。
 * 呼び出し側（Server Action など）で、userId がログイン中のユーザー本人であることを確認してから使う。
 *
 * 画面側は advanceExpedition を繰り返し呼んで自動で進め、
 * ポーズ中は呼ぶのを止める。引き返すときは retreatExpedition を呼ぶ。
 */

type Admin = SupabaseClient;

type Res<T> = { data: T; error: { message: string } | null };

function check<T>(res: Res<T>): T {
  if (res.error) throw new Error(res.error.message);
  return res.data;
}

/** 1 行だけ返るはずのクエリ（.single()）用。見つからなければエラー */
function one<T>(res: Res<T>): NonNullable<T> {
  const data = check(res);
  if (data === null || data === undefined) throw new Error("データが見つかりません");
  return data as NonNullable<T>;
}

/** 複数行のクエリ用（null なら空配列） */
function rows<T>(res: Res<T[] | null>): T[] {
  return check(res) ?? [];
}

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
    loot: rows(loot),
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
  finish: "cleared" | "failed" | null;
  position: number;
  totalSquares: number;
  details: Record<string, unknown>;
};

/** 1 マス進める（またはボス戦） */
export async function advanceExpedition(
  supabase: Admin,
  userId: string,
  expeditionId: string,
  options: { battle?: BattleResolver; random?: () => number } = {},
): Promise<AdvanceResult> {
  const exp = one(
    await supabase.from("Expeditions").select("id, owner_id, area_id, status, position").eq("id", expeditionId).single(),
  );
  if (exp.owner_id !== userId) throw new Error("探索が見つかりません");
  if (exp.status !== "exploring") throw new Error("この探索はすでに終わっています");

  const area = await loadAreaConfig(supabase, exp.area_id);

  const speciesIds = [
    ...new Set([...area.encounters.map((e) => e.species_id), ...area.bosses.map((b) => b.species_id)]),
  ];
  const [owned, species, ranks] = await Promise.all([
    supabase.from("Player_Monsters").select("species_id").eq("owner_id", userId).in("species_id", speciesIds),
    supabase.from("Monster_Species").select("id, rank").in("id", speciesIds),
    supabase.from("Ranks").select("code, exp_rate, recruit_rate"),
  ]);

  const plan = planStep(area, exp.position, {
    ownedSpeciesIds: new Set(rows(owned).map((m) => m.species_id as number)),
    speciesRanks: new Map(rows(species).map((s) => [s.id as number, s.rank as string | null])),
    ranks: toRankTable(rows(ranks) as RankData[]),
    battle: options.battle,
    random: options.random,
  });

  const details = check(
    await supabase.rpc("commit_expedition_step", {
      p_expedition_id: expeditionId,
      p_expected_position: exp.position,
      p_advance: plan.advance,
      p_event: plan.event,
      p_loot: plan.loot,
      p_recruit: plan.recruit,
      p_finish: plan.finish,
    }),
  ) as Record<string, unknown>;

  return {
    event: plan.event,
    finish: plan.finish,
    position: exp.position + (plan.advance ? 1 : 0),
    totalSquares: area.squares.length,
    details,
  };
}

/** 引き返す（拾ったものは受け取れる。クリア報酬はなし） */
export async function retreatExpedition(supabase: Admin, userId: string, expeditionId: string) {
  const exp = one(
    await supabase.from("Expeditions").select("owner_id, status, position").eq("id", expeditionId).single(),
  );
  if (exp.owner_id !== userId) throw new Error("探索が見つかりません");
  if (exp.status !== "exploring") throw new Error("この探索はすでに終わっています");

  check(
    await supabase.rpc("commit_expedition_step", {
      p_expedition_id: expeditionId,
      p_expected_position: exp.position,
      p_advance: false,
      p_event: { type: "retreat", position: exp.position },
      p_loot: [],
      p_recruit: null,
      p_finish: "retreated",
    }),
  );
}
