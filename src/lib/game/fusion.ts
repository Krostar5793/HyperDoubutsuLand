import { GROWTH, STATS, statsAt, type Stat, type StatBonusMap } from "./growth";
import { RANKS, type Rank } from "./ranks";

/**
 * 合成のルール（サーバー側で検証・計算に使う。画面の表示にも使う）
 *
 *   ・親は Lv10 以上の 2 体（同じ種族どうしも可）
 *   ・子の候補: 属性が親のどちらかと同じ（属性なしの親がいれば属性なしも）で、
 *              ランクが親の低い方とちょうど同じもの（Monster_Species.fusion_selectable = true のみ）
 *   ・親が同じランクで、レベル合計が Ranks.fusion_rankup_level_sum 以上なら、1 つ上のランクも候補
 *   ・特別な組み合わせ（Fusion_Recipes）なら、その子も候補（fusion_selectable に関係なく）
 *   ・子の特技: 両親の特技から選ぶ。使用枠（Skills.slot_cost）の合計が子の枠の数まで
 *   ・成長ボーナス: 両親の 攻撃・防御・賢さ・素早さ のうち最も高い項目の、Lv50 までの成長量を 2 割増
 *   ・LP ボーナス: 両親が LP で上げた分の 3 割を、子のステータスに足す
 *   ・ボーナスは親から子へ引き継がない（毎回、その時点の親から計算する）
 */

export const FUSION = {
  minParentLevel: 10,
  /** 成長ボーナスの割合 */
  growthBonusRate: 0.2,
  /** 成長ボーナスの対象を比べるステータス（HP・MP は除く） */
  growthBonusStats: ["atk", "def", "int", "spd"] as Stat[],
  /** LP で上げた分のうち、子に足す割合 */
  limitPointBonusRate: 0.3,
} as const;

export type FusionSpecies = {
  id: number;
  name: string;
  rank: string | null;
  element_id: number | null;
  fusion_selectable: boolean;
  /** 統計の計算用（初期値） */
  hp: number | null;
  mp: number | null;
  atk: number | null;
  def: number | null;
  int: number | null;
  spd: number | null;
};

export type FusionParent = {
  id: string;
  level: number;
  species: FusionSpecies;
  alloc_hp: number;
  alloc_mp: number;
  alloc_atk: number;
  alloc_def: number;
  alloc_int: number;
  alloc_spd: number;
  growth_bonus?: unknown;
  stat_bonus?: unknown;
  /** その個体が今使える特技（個体の特技があればそれ、なければ図鑑の特技） */
  skillIds: number[];
};

export type FusionRecipe = { parent_a_species_id: number; parent_b_species_id: number; child_species_id: number };
export type RankRule = { code: string; fusion_rankup_level_sum: number | null };

export type FusionCandidate = {
  speciesId: number;
  /** normal: 通常 / rankup: ランクアップ / recipe: 特別な組み合わせ */
  kind: "normal" | "rankup" | "recipe";
};

const rankIndex = (r: string | null) => (r === null ? -1 : RANKS.indexOf(r as Rank));

/** 親 2 体の合成で生まれる候補 */
export function fusionCandidates(
  a: FusionParent,
  b: FusionParent,
  allSpecies: FusionSpecies[],
  recipes: FusionRecipe[],
  rankRules: RankRule[],
): FusionCandidate[] {
  const ia = rankIndex(a.species.rank);
  const ib = rankIndex(b.species.rank);
  if (ia < 0 || ib < 0) return [];
  // RANKS は SS → E の順なので、インデックスが大きいほど低いランク
  const lower = Math.max(ia, ib);
  const elements = new Set([a.species.element_id, b.species.element_id]);

  const result = new Map<number, FusionCandidate>();
  const add = (s: FusionSpecies, kind: FusionCandidate["kind"]) => {
    if (!result.has(s.id)) result.set(s.id, { speciesId: s.id, kind });
  };

  for (const s of allSpecies) {
    if (s.fusion_selectable && elements.has(s.element_id) && rankIndex(s.rank) === lower) add(s, "normal");
  }

  // ランクアップ: 同じランクで、レベル合計が基準以上
  const rule = rankRules.find((r) => r.code === a.species.rank);
  if (ia === ib && lower > 0 && rule?.fusion_rankup_level_sum && a.level + b.level >= rule.fusion_rankup_level_sum) {
    for (const s of allSpecies) {
      if (s.fusion_selectable && elements.has(s.element_id) && rankIndex(s.rank) === lower - 1) add(s, "rankup");
    }
  }

  // 特別な組み合わせ（親の順番は問わない）
  const pair = [a.species.id, b.species.id].sort((x, y) => x - y).join("-");
  for (const r of recipes) {
    if ([r.parent_a_species_id, r.parent_b_species_id].sort((x, y) => x - y).join("-") === pair) {
      const s = allSpecies.find((x) => x.id === r.child_species_id);
      if (s) result.set(s.id, { speciesId: s.id, kind: "recipe" });
    }
  }

  return [...result.values()];
}

/** 合成できる親か（レベルと、同じ個体でないか） */
export function checkParents(a: FusionParent, b: FusionParent): string | null {
  if (a.id === b.id) return "同じモンスターどうしは合成できません";
  if (a.level < FUSION.minParentLevel || b.level < FUSION.minParentLevel) {
    return `合成できるのは Lv${FUSION.minParentLevel} 以上のモンスターです`;
  }
  return null;
}

/** 子に付くボーナス */
export function fusionBonuses(a: FusionParent, b: FusionParent): { growth_bonus: StatBonusMap; stat_bonus: StatBonusMap; bestStat: Stat } {
  // 成長ボーナス: 両親の中で最も高い項目（同じ値なら 攻撃→防御→賢さ→素早さ の順）
  let bestStat: Stat = FUSION.growthBonusStats[0];
  let best = -Infinity;
  for (const p of [a, b]) {
    const s = statsAt(p.species, p);
    for (const stat of FUSION.growthBonusStats) {
      if (s[stat] > best) {
        best = s[stat];
        bestStat = stat;
      }
    }
  }

  // LP ボーナス: 両親が LP で上げた分の 3 割
  const stat_bonus: StatBonusMap = {};
  for (const stat of STATS) {
    const gained = (a[`alloc_${stat}`] + b[`alloc_${stat}`]) * GROWTH.allocationGain[stat];
    const v = Math.floor(gained * FUSION.limitPointBonusRate);
    if (v > 0) stat_bonus[stat] = v;
  }

  return { growth_bonus: { [bestStat]: FUSION.growthBonusRate }, stat_bonus, bestStat };
}

/** 子の特技の選び方が正しいか（両親の特技の中から・重複なし・使用枠が枠の数まで） */
export function checkSkillChoice(
  chosen: number[],
  a: FusionParent,
  b: FusionParent,
  slotCost: (skillId: number) => number,
  slots: number,
): string | null {
  const allowed = new Set([...a.skillIds, ...b.skillIds]);
  if (new Set(chosen).size !== chosen.length) return "同じ特技を 2 つは選べません";
  if (chosen.some((id) => !allowed.has(id))) return "両親が持っていない特技は選べません";
  const used = chosen.reduce((sum, id) => sum + slotCost(id), 0);
  if (used > slots) return `特技の枠が足りません（使用 ${used} / 枠 ${slots}）`;
  return null;
}
