/**
 * 耐性の段階。DB の Resistance_Levels.code と対応する。
 * 倍率の正は DB 側（Resistance_Levels.multiplier）。ここの値は初期値。
 */
export const RESISTANCE_LEVELS = [
  "weak", // 弱点（2倍）
  "normal", // 普通（等倍）
  "resist", // 耐性（0.6倍）
  "adapt", // 適応（0.2倍）
  "immune", // 無効（0倍）
  "absorb", // 吸収（等倍吸収）※状態異常には設定できない
  "reflect", // 反射（等倍反射）
] as const;

export type ResistanceLevelCode = (typeof RESISTANCE_LEVELS)[number];

export type ResistanceLevel = {
  code: ResistanceLevelCode;
  name: string;
  multiplier: number;
  effect: "damage" | "absorb" | "reflect";
};

export type ResistanceTable = Record<ResistanceLevelCode, ResistanceLevel>;

/** Resistance_Levels の初期値（DB から読めないときやテスト用） */
export const DEFAULT_RESISTANCE_TABLE: ResistanceTable = {
  weak: { code: "weak", name: "弱点", multiplier: 2.0, effect: "damage" },
  normal: { code: "normal", name: "普通", multiplier: 1.0, effect: "damage" },
  resist: { code: "resist", name: "耐性", multiplier: 0.6, effect: "damage" },
  adapt: { code: "adapt", name: "適応", multiplier: 0.2, effect: "damage" },
  immune: { code: "immune", name: "無効", multiplier: 0.0, effect: "damage" },
  absorb: { code: "absorb", name: "吸収", multiplier: 1.0, effect: "absorb" },
  reflect: { code: "reflect", name: "反射", multiplier: 1.0, effect: "reflect" },
};

/** DB から取得した Resistance_Levels の行を、code で引ける表にする */
export function toResistanceTable(rows: ResistanceLevel[]): ResistanceTable {
  const table = { ...DEFAULT_RESISTANCE_TABLE };
  for (const row of rows) {
    table[row.code] = { ...row, multiplier: Number(row.multiplier) };
  }
  return table;
}

/**
 * 耐性を一段階下げる（とばっちり用）。
 * 強い順: 反射 = 吸収 > 無効 > 適応 > 耐性 > 普通 > 弱点
 * 弱点はそれ以上下がらない。
 */
export function lowerOneStep(code: ResistanceLevelCode): ResistanceLevelCode {
  switch (code) {
    case "reflect":
    case "absorb":
      return "immune";
    case "immune":
      return "adapt";
    case "adapt":
      return "resist";
    case "resist":
      return "normal";
    case "normal":
    case "weak":
      return "weak";
  }
}
