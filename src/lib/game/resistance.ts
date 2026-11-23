/**
 * 耐性の段階。DB の Resistance_Levels.code と対応する。
 * 倍率の正は DB 側（Resistance_Levels.multiplier）。ここの値は初期値の参考。
 */
export const RESISTANCE_LEVELS = [
  "weak", // 弱点（2倍）
  "normal", // 普通（等倍）
  "resist", // 耐性（0.6倍）
  "adapt", // 適応（0.2倍）
  "immune", // 無効（0倍）
  "absorb", // 吸収（等倍吸収）
  "reflect", // 反射（等倍反射）
] as const;

export type ResistanceLevelCode = (typeof RESISTANCE_LEVELS)[number];

export type ResistanceLevel = {
  code: ResistanceLevelCode;
  name: string;
  multiplier: number;
  effect: "damage" | "absorb" | "reflect";
};

/** 属性つきの攻撃を受けたときの結果 */
export type HitResult = {
  /** 防御側が受けるダメージ */
  damageToTarget: number;
  /** 防御側が回復する HP（吸収） */
  healTarget: number;
  /** 攻撃側に返るダメージ（反射） */
  damageToAttacker: number;
};

/** 基礎ダメージに耐性段階を適用する */
export function applyResistance(
  baseDamage: number,
  level: ResistanceLevel,
): HitResult {
  const amount = Math.floor(baseDamage * level.multiplier);
  switch (level.effect) {
    case "absorb":
      return { damageToTarget: 0, healTarget: amount, damageToAttacker: 0 };
    case "reflect":
      return { damageToTarget: 0, healTarget: 0, damageToAttacker: amount };
    default:
      return { damageToTarget: amount, healTarget: 0, damageToAttacker: 0 };
  }
}
