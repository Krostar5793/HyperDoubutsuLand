import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import {
  battleExp,
  createBattle,
  partyState,
  runTurn,
  type BattleState,
  type Command,
  type FighterInput,
  type SkillDef,
  type StatusEffectDef,
} from "./battle";
import { check, one, rows } from "./db";
import type { Enemy } from "./explore";
import { statsAt } from "./growth";
import { toRankTable, type RankData } from "./ranks";
import { resolveRecruit } from "./recruit";
import type { ResistanceLevelCode, ResistanceLevel } from "./resistance";
import { toResistanceTable } from "./resistance";

/**
 * 戦闘のサーバー側の処理。引数の supabase は管理者クライアント（createAdminClient）。
 * 呼び出し側で userId がログイン中のユーザー本人であることを確認してから使う。
 */

type Admin = SupabaseClient<Database>;

const NO_ALLOC = { alloc_hp: 0, alloc_mp: 0, alloc_atk: 0, alloc_def: 0, alloc_int: 0, alloc_spd: 0 };

type SpeciesRow = Database["public"]["Tables"]["Monster_Species"]["Row"];

/** 戦闘に必要な種族の情報（ステータス・特技・耐性）をまとめて読み込む */
async function loadSpeciesData(supabase: Admin, speciesIds: number[]) {
  const [species, speciesSkills, statusRes, elementOverrides, matchups] = await Promise.all([
    supabase.from("Monster_Species").select("*").in("id", speciesIds),
    supabase.from("Species_Skills").select("species_id, slot, skill_id").in("species_id", speciesIds).order("slot"),
    supabase.from("Species_Status_Resistances").select("species_id, status_effect_id, level").in("species_id", speciesIds),
    supabase.from("Species_Element_Resistances").select("species_id, element_id, level").in("species_id", speciesIds),
    supabase.from("Element_Matchups").select("attack_element_id, defense_element_id, level"),
  ]);
  const byId = new Map(rows(species).map((s) => [s.id, s]));

  const elementResist = (s: SpeciesRow): Record<string, ResistanceLevelCode> => {
    const r: Record<string, ResistanceLevelCode> = {};
    // すくみ → 種族ごとの上書き の順に重ねる
    for (const m of rows(matchups)) {
      if (s.element_id !== null && m.defense_element_id === s.element_id) {
        r[String(m.attack_element_id)] = m.level as ResistanceLevelCode;
      }
    }
    for (const o of rows(elementOverrides)) {
      if (o.species_id === s.id) r[String(o.element_id)] = o.level as ResistanceLevelCode;
    }
    return r;
  };
  const statusResist = (id: number): Record<string, ResistanceLevelCode> =>
    Object.fromEntries(
      rows(statusRes).filter((r) => r.species_id === id).map((r) => [String(r.status_effect_id), r.level as ResistanceLevelCode]),
    );
  const skillsOf = (id: number) => rows(speciesSkills).filter((r) => r.species_id === id).map((r) => r.skill_id);

  return { byId, elementResist, statusResist, skillsOf };
}

async function loadSkillDefs(supabase: Admin, skillIds: number[]): Promise<SkillDef[]> {
  if (skillIds.length === 0) return [];
  const [skills, effects] = await Promise.all([
    supabase.from("Skills").select("*").in("id", skillIds),
    supabase.from("Skill_Effects").select("skill_id, status_effect_id, chance").in("skill_id", skillIds),
  ]);
  return rows(skills).map((s) => ({
    id: s.id,
    name: s.name ?? "特技",
    category: s.category as SkillDef["category"],
    attack_stat: s.attack_stat as SkillDef["attack_stat"],
    defense_stat: s.defense_stat as SkillDef["defense_stat"],
    power: Number(s.power),
    mp_cost: s.mp_cost,
    target: s.target as SkillDef["target"],
    accuracy: Number(s.accuracy),
    element_id: s.element_id,
    effects: rows(effects)
      .filter((e) => e.skill_id === s.id)
      .map((e) => ({ status_effect_id: e.status_effect_id, chance: Number(e.chance) })),
  }));
}

/** 同じ名前が複数いるときに A / B / C… を付ける */
function distinguishNames(fighters: FighterInput[]) {
  const counts = new Map<string, number>();
  for (const f of fighters) counts.set(f.name, (counts.get(f.name) ?? 0) + 1);
  const seen = new Map<string, number>();
  for (const f of fighters) {
    if ((counts.get(f.name) ?? 0) > 1) {
      const n = seen.get(f.name) ?? 0;
      seen.set(f.name, n + 1);
      f.name = `${f.name} ${String.fromCharCode(65 + n)}`;
    }
  }
}

/** 探索で出会った敵と、今のパーティ（枠 1〜8）で戦闘の状態を作る */
export async function buildBattle(
  supabase: Admin,
  userId: string,
  enemies: Enemy[],
  boss: boolean,
  carried: Record<string, { hp: number; mp: number }>,
): Promise<BattleState> {
  const party = rows(
    await supabase
      .from("Player_Monsters")
      .select("*")
      .eq("owner_id", userId)
      .not("party_slot", "is", null)
      .order("party_slot"),
  );
  if (!party.some((m) => (m.party_slot ?? 99) <= 4)) {
    throw new Error("バトルメンバーが 1 体もいません。モンスター画面で編成してください");
  }

  const speciesIds = [...new Set([...party.map((m) => m.species_id), ...enemies.map((e) => e.species_id)])];
  const data = await loadSpeciesData(supabase, speciesIds);
  const monsterSkills = rows(
    await supabase.from("Monster_Skills").select("monster_id, slot, skill_id").in("monster_id", party.map((m) => m.id)).order("slot"),
  );

  const allies: FighterInput[] = party.map((m) => {
    const s = data.byId.get(m.species_id)!;
    const own = monsterSkills.filter((r) => r.monster_id === m.id).map((r) => r.skill_id);
    return {
      key: `a${m.party_slot}`,
      side: "ally",
      name: m.nickname ?? s.name,
      speciesId: s.id,
      monsterId: m.id,
      level: m.level,
      rank: s.rank,
      expMultiplier: Number(s.exp_multiplier),
      isBoss: false,
      slot: m.party_slot!,
      stats: statsAt(s, m),
      hp: carried[m.id]?.hp,
      mp: carried[m.id]?.mp,
      // 個体の特技が 1 つでもあれば、そちらを優先
      skillIds: own.length ? own : data.skillsOf(s.id),
      elementResist: data.elementResist(s),
      statusResist: data.statusResist(s.id),
    };
  });

  const foes: FighterInput[] = enemies.map((e, i) => {
    const s = data.byId.get(e.species_id)!;
    return {
      key: e.id,
      side: "enemy",
      name: s.name,
      speciesId: s.id,
      monsterId: null,
      level: e.level,
      rank: s.rank,
      expMultiplier: Number(s.exp_multiplier),
      isBoss: e.isBoss,
      slot: i + 1,
      stats: statsAt(s, { level: e.level, ...NO_ALLOC }),
      skillIds: data.skillsOf(s.id),
      elementResist: data.elementResist(s),
      statusResist: data.statusResist(s.id),
    };
  });

  // 味方と見分けるため、通常の敵には「野生の」を付ける。同じ名前が並ぶときは A / B / C… も付ける
  for (const f of foes) if (!f.isBoss) f.name = `野生の${f.name}`;
  distinguishNames(foes);
  distinguishNames(allies);

  const skillIds = [...new Set([...allies, ...foes].flatMap((f) => f.skillIds))];
  const [skills, effects, levels] = await Promise.all([
    loadSkillDefs(supabase, skillIds),
    supabase.from("Status_Effects").select("id, name, effect_type, stat, stages"),
    supabase.from("Resistance_Levels").select("code, name, multiplier, effect"),
  ]);

  return createBattle({
    allies,
    enemies: foes,
    skills,
    statusEffects: rows(effects)
      .filter((e) => e.stat)
      .map((e) => ({ id: e.id, name: e.name, effect_type: "stat_down", stat: e.stat as StatusEffectDef["stat"], stages: e.stages })),
    resistance: toResistanceTable(rows(levels) as ResistanceLevel[]),
    boss,
  });
}

export type TurnResult = {
  state: BattleState;
  finished: boolean;
  details: Record<string, unknown>;
};

/** 戦闘の 1 ターンを進める */
export async function submitBattleTurn(
  supabase: Admin,
  userId: string,
  battleId: string,
  commands: Command[],
  random: () => number = Math.random,
): Promise<TurnResult> {
  const battle = one(
    await supabase.from("Battles").select("id, owner_id, status, turn, state, expedition_id").eq("id", battleId).single(),
  );
  if (battle.owner_id !== userId) throw new Error("戦闘が見つかりません");
  if (battle.status !== "active") throw new Error("この戦闘はすでに終わっています");
  const state = battle.state as unknown as BattleState;

  // アイテムの内容は DB の値で上書きする（画面から送られた倍率は信用しない）
  let itemId: number | null = null;
  const safe: Command[] = [];
  for (const c of commands) {
    if (c.type !== "item") {
      safe.push(c);
      continue;
    }
    const item = check(
      await supabase.from("Items").select("id, name, effect_type, effect_value, usable_in_battle").eq("id", c.itemId).maybeSingle(),
    );
    if (!item || !item.usable_in_battle || item.effect_type !== "recruit_boost") throw new Error("このアイテムは戦闘では使えません");
    const owned = check(
      await supabase.from("Player_Items").select("quantity").eq("owner_id", userId).eq("item_id", item.id).maybeSingle(),
    );
    if (!owned || owned.quantity < 1) throw new Error("アイテムを持っていません");
    if (state.boss) throw new Error("ボスには使えません");
    itemId = item.id;
    safe.push({ ...c, itemName: item.name, multiplier: Number(item.effect_value) });
  }

  const next = runTurn(state, safe, random);

  if (!next.result) {
    check(
      await supabase.rpc("commit_battle_turn", {
        p_battle_id: battleId,
        p_expected_turn: battle.turn,
        p_state: next as never,
        p_item_id: itemId as number,
      }),
    );
    return { state: next, finished: false, details: {} };
  }

  // 戦闘の終わり: 経験値・仲間になる判定・HP の持ち越し
  const enemies = next.fighters.filter((f) => f.side === "enemy");
  let recruit: { species_id: number; level: number } | null = null;
  let exp: { monster_id: string; amount: number }[] = [];
  if (next.result === "won") {
    const ranks = toRankTable(rows(await supabase.from("Ranks").select("code, exp_rate, recruit_rate")) as RankData[]);
    exp = battleExp(next, ranks);
    if (!next.boss) {
      const owned = rows(
        await supabase
          .from("Player_Monsters")
          .select("species_id")
          .eq("owner_id", userId)
          .in("species_id", enemies.map((e) => e.speciesId)),
      );
      const r = resolveRecruit(
        enemies.map((e) => ({
          id: e.key,
          speciesId: e.speciesId,
          rank: e.rank,
          level: e.level,
          isBoss: e.isBoss,
          itemMultipliers: next.itemBoosts[e.key] ?? [],
        })),
        new Set(owned.map((m) => m.species_id)),
        { ranks, random },
      );
      if (r.joined) recruit = { species_id: r.joined.speciesId, level: r.joined.level };
    }
  }

  const position = one(
    await supabase.from("Expeditions").select("position").eq("id", battle.expedition_id).single(),
  ).position;
  const details = check(
    await supabase.rpc("commit_battle_turn", {
      p_battle_id: battleId,
      p_expected_turn: battle.turn,
      p_state: next as never,
      p_item_id: itemId as number,
      p_result: next.result,
      p_exp: exp as never,
      p_party_state: partyState(next) as never,
      p_recruit: recruit as never,
      p_event: {
        type: "battle_end",
        position: position + 1,
        boss: next.boss,
        outcome: next.result === "won" ? "win" : "lose",
        recruited: recruit,
      } as never,
      p_boss: next.boss,
    }),
  ) as Record<string, unknown>;

  return { state: next, finished: true, details: { ...details, exp, recruit } };
}
