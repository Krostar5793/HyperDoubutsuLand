/**
 * ランク。DB の Ranks テーブルと対応する（値の正は DB 側。ここは初期値）。
 */
export const RANKS = ["SS", "S", "A", "B", "C", "D", "E"] as const;
export type Rank = (typeof RANKS)[number];

export type RankData = {
  code: Rank;
  /** 必要経験値の係数 */
  exp_rate: number;
  /** 戦闘後に仲間になる確率（0〜1） */
  recruit_rate: number;
};

export type RankTable = Record<Rank, RankData>;

export const DEFAULT_RANK_TABLE: RankTable = {
  SS: { code: "SS", exp_rate: 2.0, recruit_rate: 0.001 },
  S: { code: "S", exp_rate: 1.8, recruit_rate: 0.005 },
  A: { code: "A", exp_rate: 1.6, recruit_rate: 0.01 },
  B: { code: "B", exp_rate: 1.4, recruit_rate: 0.02 },
  C: { code: "C", exp_rate: 1.2, recruit_rate: 0.05 },
  D: { code: "D", exp_rate: 1.0, recruit_rate: 0.1 },
  E: { code: "E", exp_rate: 0.8, recruit_rate: 0.2 },
};

/** DB から取得した Ranks の行を、code で引ける表にする */
export function toRankTable(rows: RankData[]): RankTable {
  const table = { ...DEFAULT_RANK_TABLE };
  for (const row of rows) {
    table[row.code] = {
      ...row,
      exp_rate: Number(row.exp_rate),
      recruit_rate: Number(row.recruit_rate),
    };
  }
  return table;
}

export function getRank(rank: string | null, table: RankTable = DEFAULT_RANK_TABLE): RankData {
  if (rank === null || !(rank in table)) {
    throw new Error(`ランクが未設定または不正です: ${rank}`);
  }
  return table[rank as Rank];
}
