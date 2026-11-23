import { DEFAULT_RANK_TABLE, getRank, type RankTable } from "./ranks";

/**
 * 戦闘後に仲間になるモンスターの判定
 *
 *   確率 = ランクの基本確率
 *          × 0.5（同じ種族を今 1 体以上持っている場合）
 *          × 専用アイテムの倍率（その戦闘中にそのモンスターに使ったもの。複数なら掛け合わせ）
 *   （上限 100%）
 *
 *   ・候補ごとに抽選し、当たったものの中から 1 体だけ仲間になる
 *   ・複数当たったら、確率が最も低いものが優先。同じ確率ならランダム
 *   ・仲間になるときのレベルは出会ったときのレベル。ただし最大 Lv50
 *
 * 専用アイテムは戦闘中、1 ターンに 1 回だけ使える（ターン制コマンドバトル。バトルの仕組みで制御する）
 */

export const RECRUIT = {
  /** 同じ種族を持っているときの倍率 */
  ownedMultiplier: 0.5,
  /** 仲間になったときのレベルの上限 */
  maxJoinLevel: 50,
} as const;

export type RecruitCandidate = {
  /** 戦闘内でのモンスターの識別子 */
  id: string;
  speciesId: number;
  rank: string | null;
  level: number;
  /** ボスは仲間にならない */
  isBoss?: boolean;
  /** 専用アイテムの倍率（例: [2, 3]）。使っていなければ空 */
  itemMultipliers?: number[];
};

export type RecruitChance = { id: string; probability: number };

export type RecruitResult = {
  /** 候補ごとの確率（表示・ログ用） */
  chances: RecruitChance[];
  /** 仲間になったモンスター（いなければ null） */
  joined: { id: string; speciesId: number; level: number } | null;
};

export function recruitProbability(
  candidate: RecruitCandidate,
  ownedSpeciesIds: ReadonlySet<number>,
  ranks: RankTable = DEFAULT_RANK_TABLE,
): number {
  if (candidate.isBoss) return 0;
  let p = getRank(candidate.rank, ranks).recruit_rate;
  if (ownedSpeciesIds.has(candidate.speciesId)) p *= RECRUIT.ownedMultiplier;
  for (const m of candidate.itemMultipliers ?? []) p *= m;
  return Math.min(p, 1);
}

export function resolveRecruit(
  candidates: RecruitCandidate[],
  /** プレイヤーが今持っている種族（パーティ・控え・預り所を含む） */
  ownedSpeciesIds: ReadonlySet<number>,
  options: { ranks?: RankTable; random?: () => number } = {},
): RecruitResult {
  const random = options.random ?? Math.random;
  const chances = candidates.map((c) => ({
    id: c.id,
    probability: recruitProbability(c, ownedSpeciesIds, options.ranks),
  }));

  const hits = candidates.filter((_, i) => random() < chances[i].probability);
  if (hits.length === 0) return { chances, joined: null };

  const probOf = (id: string) => chances.find((c) => c.id === id)!.probability;
  const lowest = Math.min(...hits.map((h) => probOf(h.id)));
  const pool = hits.filter((h) => probOf(h.id) === lowest);
  const chosen = pool[Math.floor(random() * pool.length)];

  return {
    chances,
    joined: {
      id: chosen.id,
      speciesId: chosen.speciesId,
      level: Math.min(chosen.level, RECRUIT.maxJoinLevel),
    },
  };
}
