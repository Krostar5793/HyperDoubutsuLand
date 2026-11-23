import {
  lowerOneStep,
  type ResistanceLevelCode,
  type ResistanceTable,
} from "./resistance";

/**
 * 属性つきの技・状態異常を受けたときの判定（反射・とばっちりを含む）
 *
 * 流れ:
 *   1. 防御側の耐性で判定する
 *   2. 防御側が「反射」なら、攻撃側の耐性で判定する
 *   3. 攻撃側も「反射」なら「とばっちり」:
 *      攻撃側を除く攻撃側パーティから 1 体を選び、耐性を一段階下げて判定する。
 *      候補は反射・吸収を持たない（= 無効以下の）モンスターで、
 *      攻撃側が最も不利になる（倍率が最も高い）モンスターを選ぶ。
 *      候補がいなければ効果は霧散する。
 */

export type HitKind = "damage" | "status";

/** 判定を受ける 1 体と、今回の属性 / 状態異常に対するその耐性 */
export type Combatant = {
  id: string;
  level: ResistanceLevelCode;
};

export type ResolveHitInput = {
  /** damage: 属性ダメージ / status: 状態異常 */
  kind: HitKind;
  /**
   * 基礎値。damage なら基礎ダメージ、status なら基礎の付与率など。
   * 判定を受けたモンスターの耐性倍率がかけられる。
   */
  baseAmount: number;
  target: Combatant;
  attacker: Combatant;
  /** 攻撃側パーティのうち、攻撃したモンスター以外（とばっちりの候補） */
  attackerAllies: Combatant[];
  table: ResistanceTable;
  /** 同じ倍率の候補が複数いるときの選択に使う乱数（0 以上 1 未満） */
  random?: () => number;
};

export type HitStage = "direct" | "reflected" | "tobacchiri";

/** 1 回の判定の記録（ログ・演出用） */
export type HitStep = {
  stage: HitStage;
  monsterId: string;
  /** 判定に使った耐性（とばっちりでは一段階下げた後の値） */
  level: ResistanceLevelCode;
};

/** 最終的に効果を受けたモンスターと、その内容 */
export type HitOutcome =
  /** damage: HP が amount 減る / status: 付与率 amount で状態異常の判定を行う */
  | { type: "hit"; monsterId: string; amount: number }
  /** 吸収: HP が amount 回復する（damage のみ） */
  | { type: "absorb"; monsterId: string; amount: number }
  /** とばっちりの候補がいなかった */
  | { type: "dissipated" };

export type HitResult = {
  steps: HitStep[];
  outcome: HitOutcome;
};

function round(kind: HitKind, value: number) {
  return kind === "damage" ? Math.floor(value) : value;
}

/** 反射しない耐性（ダメージ・無効・吸収）で最終結果を作る */
function settle(
  input: ResolveHitInput,
  monsterId: string,
  level: ResistanceLevelCode,
  amount: number,
): HitOutcome {
  const def = input.table[level];
  const value = round(input.kind, amount * def.multiplier);
  if (def.effect === "absorb") {
    if (input.kind === "status") {
      throw new Error("状態異常に「吸収」は設定できません");
    }
    return { type: "absorb", monsterId, amount: value };
  }
  return { type: "hit", monsterId, amount: value };
}

export function resolveHit(input: ResolveHitInput): HitResult {
  const { table, target, attacker } = input;
  const random = input.random ?? Math.random;
  const steps: HitStep[] = [];

  // 1. 防御側
  steps.push({ stage: "direct", monsterId: target.id, level: target.level });
  if (table[target.level].effect !== "reflect") {
    return {
      steps,
      outcome: settle(input, target.id, target.level, input.baseAmount),
    };
  }
  const reflected = input.baseAmount * table[target.level].multiplier;

  // 2. 反射 → 攻撃側
  steps.push({
    stage: "reflected",
    monsterId: attacker.id,
    level: attacker.level,
  });
  if (table[attacker.level].effect !== "reflect") {
    return { steps, outcome: settle(input, attacker.id, attacker.level, reflected) };
  }
  const bounced = reflected * table[attacker.level].multiplier;

  // 3. とばっちり: 反射・吸収を持たない味方から、最も不利になる 1 体を選ぶ
  const candidates = input.attackerAllies
    .filter((m) => m.id !== attacker.id)
    .filter((m) => m.level !== "reflect" && m.level !== "absorb")
    .map((m) => ({ id: m.id, level: lowerOneStep(m.level) }));

  if (candidates.length === 0) {
    return { steps, outcome: { type: "dissipated" } };
  }

  const worst = Math.max(...candidates.map((c) => table[c.level].multiplier));
  const pool = candidates.filter((c) => table[c.level].multiplier === worst);
  const chosen = pool[Math.floor(random() * pool.length)];

  steps.push({ stage: "tobacchiri", monsterId: chosen.id, level: chosen.level });
  return { steps, outcome: settle(input, chosen.id, chosen.level, bounced) };
}
