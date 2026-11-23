import { DEFAULT_RANK_TABLE, getRank, type RankTable } from "./ranks";

/**
 * 育成（レベル・経験値・ステータス・リミットポイント（LP））の計算。
 *
 * ※ 同じ計算を DB 関数（grant_exp / allocate_limit_point）でも行っている。
 *   ここの定数や式を変えるときは、マイグレーションの SQL も合わせて変えること。
 */

export { RANKS, type Rank } from "./ranks";

export const GROWTH = {
  /** Lv1→2 の必要経験値の基準 */
  baseExp: 50,
  /** レベルごとの必要経験値の増加率（1.1 = 毎レベル1割増） */
  expGrowth: 1.1,
  /**
   * Lv50 までに増える量 = (flat + 図鑑の初期値 × rate) × 49。途中の伸び方は curveExponent で決まる
   * Lv50 の目安: HP 初期値10〜50 → 約500〜1000 / MP 10〜50 → 100〜500 /
   *             その他 5〜30 → 約200〜500（atk〜spd の合計は 588 + 初期値合計 × 11.8）
   */
  statGrowth: {
    hp: { flat: 8, rate: 0.23 },
    mp: { flat: 0, rate: 0.184 },
    atk: { flat: 3, rate: 0.22 },
    def: { flat: 3, rate: 0.22 },
    int: { flat: 3, rate: 0.22 },
    spd: { flat: 3, rate: 0.22 },
  },
  /**
   * 成長カーブの指数。Lv50 までの成長量（上の flat + rate × 49 レベル分）を、
   * (上がったレベル数 / 49) ^ curveExponent の割合で配分する。
   * 1 なら毎レベル同じだけ伸びる。1 より大きいほど序盤の伸びがなだらかになり、Lv50 の値は変わらない
   */
  curveExponent: 1.3,
  /** 1 レベルごとに必ず伸びる最低量（序盤に伸びないレベルができないように） */
  minGrowthPerLevel: 1,
  /** 基礎ステータスの成長が止まるレベル */
  growthStopLevel: 50,
  /** 成長が止まった後、1レベルごとに得られる LP */
  limitPointsPerLevel: 5,
  /** LP を振るときの最初の消費量 */
  allocationBaseCost: 5,
  /** 何回振るごとに消費量が増えるか */
  allocationCostStepEvery: 10,
  /** 消費量の増え幅 */
  allocationCostStep: 5,
  /** 1回振ったときの上昇量 */
  allocationGain: { hp: 10, mp: 5, atk: 1, def: 1, int: 1, spd: 1 },
  /** 標準のレベル上限 */
  defaultLevelCap: 99,
} as const;

export const STATS = ["hp", "mp", "atk", "def", "int", "spd"] as const;
export type Stat = (typeof STATS)[number];
export type Stats = Record<Stat, number>;

/** 図鑑（Monster_Species）のうち育成に関係する列 */
export type SpeciesGrowthData = {
  rank: string | null;
} & Record<Stat, number | null>;

/** 所持モンスター（Player_Monsters）のうち育成に関係する列 */
export type MonsterGrowthData = {
  level: number;
  /** 現在のレベルで貯まっている経験値（レベルアップで 0 から数え直す） */
  exp: number;
  level_cap: number;
  limit_points: number;
} & Record<`alloc_${Stat}`, number>;

/** level → level+1 に必要な経験値（ランク係数は Ranks.exp_rate） */
export function expToNext(
  level: number,
  rank: string | null,
  ranks: RankTable = DEFAULT_RANK_TABLE,
): number {
  return Math.floor(
    GROWTH.baseExp * Math.pow(GROWTH.expGrowth, level - 1) * getRank(rank, ranks).exp_rate,
  );
}

/** 指定レベルのステータス（LP を振った分を含む） */
export function statsAt(
  species: SpeciesGrowthData,
  monster: Pick<MonsterGrowthData, "level"> & Record<`alloc_${Stat}`, number>,
): Stats {
  const grownLevels = Math.min(monster.level, GROWTH.growthStopLevel) - 1;
  const result = {} as Stats;
  for (const stat of STATS) {
    const base = species[stat] ?? 0;
    const { flat, rate } = GROWTH.statGrowth[stat];
    // Lv50 までの成長量を、カーブに沿って配分する。切り捨ては最後に 1 回
    const span = GROWTH.growthStopLevel - 1;
    const total = (flat + base * rate) * span;
    const curved = Math.floor(total * Math.pow(grownLevels / span, GROWTH.curveExponent));
    const growth = Math.max(curved, GROWTH.minGrowthPerLevel * grownLevels);
    const bonus = monster[`alloc_${stat}`] * GROWTH.allocationGain[stat];
    result[stat] = base + growth + bonus;
  }
  return result;
}

/** そのステータスに次の 1 回を振るのに必要な LP */
export function allocationCost(timesAllocated: number): number {
  return (
    GROWTH.allocationBaseCost +
    GROWTH.allocationCostStep *
      Math.floor(timesAllocated / GROWTH.allocationCostStepEvery)
  );
}

/** このレベルに上がったときに得られる LP */
export function limitPointsForReaching(level: number): number {
  return level > GROWTH.growthStopLevel ? GROWTH.limitPointsPerLevel : 0;
}

export type ExpGainResult = {
  level: number;
  exp: number;
  limit_points: number;
  levelsGained: number;
  /** 上限に達して捨てられた経験値 */
  overflow: number;
};

/**
 * 経験値を加える。上限レベルに達したら、それ以上の経験値は捨てる。
 */
export function gainExp(
  monster: Pick<MonsterGrowthData, "level" | "exp" | "level_cap" | "limit_points">,
  rank: string | null,
  amount: number,
  ranks: RankTable = DEFAULT_RANK_TABLE,
): ExpGainResult {
  let { level, exp, limit_points } = monster;
  let rest = exp + amount;
  let levelsGained = 0;

  while (level < monster.level_cap) {
    const need = expToNext(level, rank, ranks);
    if (rest < need) break;
    rest -= need;
    level += 1;
    levelsGained += 1;
    limit_points += limitPointsForReaching(level);
  }

  let overflow = 0;
  if (level >= monster.level_cap) {
    overflow = rest;
    rest = 0;
  }
  exp = rest;
  return { level, exp, limit_points, levelsGained, overflow };
}
