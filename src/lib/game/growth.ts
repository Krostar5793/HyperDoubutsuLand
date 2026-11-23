/**
 * 育成（レベル・経験値・ステータス・マスターポイント）の計算。
 *
 * ※ 同じ計算を DB 関数（grant_exp / allocate_master_point）でも行っている。
 *   ここの定数や式を変えるときは、マイグレーションの SQL も合わせて変えること。
 */

export const RANKS = ["SS", "S", "A", "B", "C", "D", "E"] as const;
export type Rank = (typeof RANKS)[number];

/** 必要経験値のランク係数 */
export const RANK_EXP_RATE: Record<Rank, number> = {
  SS: 2.0,
  S: 1.8,
  A: 1.6,
  B: 1.4,
  C: 1.2,
  D: 1.0,
  E: 0.8,
};

export const GROWTH = {
  /** Lv1→2 の必要経験値の基準 */
  baseExp: 50,
  /** レベルごとの必要経験値の増加率（1.1 = 毎レベル1割増） */
  expGrowth: 1.1,
  /** 1レベルごとに、図鑑の初期値の何割が加算されるか（HP 以外） */
  statGrowthRate: 0.1,
  /** HP の成長率 */
  hpGrowthRate: 0.05,
  /** 基礎ステータスの成長が止まるレベル */
  growthStopLevel: 50,
  /** 成長が止まった後、1レベルごとに得られるマスターポイント */
  masterPointsPerLevel: 5,
  /** マスターポイントを振るときの最初の消費量 */
  allocationBaseCost: 5,
  /** 何回振るごとに消費量が増えるか */
  allocationCostStepEvery: 10,
  /** 消費量の増え幅 */
  allocationCostStep: 5,
  /** 1回振ったときの上昇量 */
  allocationGain: { hp: 10, atk: 1, def: 1, int: 1, spd: 1 },
  /** 標準のレベル上限 */
  defaultLevelCap: 99,
} as const;

export const STATS = ["hp", "atk", "def", "int", "spd"] as const;
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
  master_points: number;
} & Record<`mp_${Stat}`, number>;

export function rankRate(rank: string | null): number {
  if (rank === null || !(rank in RANK_EXP_RATE)) {
    throw new Error(`ランクが未設定または不正です: ${rank}`);
  }
  return RANK_EXP_RATE[rank as Rank];
}

/** level → level+1 に必要な経験値 */
export function expToNext(level: number, rank: string | null): number {
  return Math.floor(
    GROWTH.baseExp * Math.pow(GROWTH.expGrowth, level - 1) * rankRate(rank),
  );
}

/** 指定レベルのステータス（マスターポイント分を含む） */
export function statsAt(
  species: SpeciesGrowthData,
  monster: Pick<MonsterGrowthData, "level"> & Record<`mp_${Stat}`, number>,
): Stats {
  const grownLevels = Math.min(monster.level, GROWTH.growthStopLevel) - 1;
  const result = {} as Stats;
  for (const stat of STATS) {
    const base = species[stat] ?? 0;
    const rate = stat === "hp" ? GROWTH.hpGrowthRate : GROWTH.statGrowthRate;
    // 切り捨ては最後に 1 回だけ（初期値が小さくても伸びるように）
    const growth = Math.floor(base * rate * grownLevels);
    const bonus = monster[`mp_${stat}`] * GROWTH.allocationGain[stat];
    result[stat] = base + growth + bonus;
  }
  return result;
}

/** そのステータスに次の 1 回を振るのに必要なマスターポイント */
export function allocationCost(timesAllocated: number): number {
  return (
    GROWTH.allocationBaseCost +
    GROWTH.allocationCostStep *
      Math.floor(timesAllocated / GROWTH.allocationCostStepEvery)
  );
}

/** このレベルに上がったときに得られるマスターポイント */
export function masterPointsForReaching(level: number): number {
  return level > GROWTH.growthStopLevel ? GROWTH.masterPointsPerLevel : 0;
}

export type ExpGainResult = {
  level: number;
  exp: number;
  master_points: number;
  levelsGained: number;
  /** 上限に達して捨てられた経験値 */
  overflow: number;
};

/**
 * 経験値を加える。上限レベルに達したら、それ以上の経験値は捨てる。
 */
export function gainExp(
  monster: Pick<MonsterGrowthData, "level" | "exp" | "level_cap" | "master_points">,
  rank: string | null,
  amount: number,
): ExpGainResult {
  let { level, exp, master_points } = monster;
  let rest = exp + amount;
  let levelsGained = 0;

  while (level < monster.level_cap) {
    const need = expToNext(level, rank);
    if (rest < need) break;
    rest -= need;
    level += 1;
    levelsGained += 1;
    master_points += masterPointsForReaching(level);
  }

  let overflow = 0;
  if (level >= monster.level_cap) {
    overflow = rest;
    rest = 0;
  }
  exp = rest;
  return { level, exp, master_points, levelsGained, overflow };
}
