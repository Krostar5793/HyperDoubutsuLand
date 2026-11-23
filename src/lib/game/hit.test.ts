import { describe, expect, it } from "vitest";
import { resolveHit, type ResolveHitInput } from "./hit";
import { DEFAULT_RESISTANCE_TABLE, lowerOneStep } from "./resistance";

const base = (over: Partial<ResolveHitInput>): ResolveHitInput => ({
  kind: "damage",
  baseAmount: 100,
  target: { id: "T", level: "normal" },
  attacker: { id: "A", level: "normal" },
  attackerAllies: [],
  table: DEFAULT_RESISTANCE_TABLE,
  random: () => 0,
  ...over,
});

describe("lowerOneStep", () => {
  it("反射・吸収 → 無効 → 適応 → 耐性 → 普通 → 弱点 → 弱点", () => {
    expect(lowerOneStep("reflect")).toBe("immune");
    expect(lowerOneStep("absorb")).toBe("immune");
    expect(lowerOneStep("immune")).toBe("adapt");
    expect(lowerOneStep("adapt")).toBe("resist");
    expect(lowerOneStep("resist")).toBe("normal");
    expect(lowerOneStep("normal")).toBe("weak");
    expect(lowerOneStep("weak")).toBe("weak");
  });
});

describe("resolveHit", () => {
  it("通常の耐性で判定する", () => {
    expect(resolveHit(base({ target: { id: "T", level: "weak" } })).outcome).toEqual(
      { type: "hit", monsterId: "T", amount: 200 },
    );
    expect(resolveHit(base({ target: { id: "T", level: "resist" } })).outcome).toEqual(
      { type: "hit", monsterId: "T", amount: 60 },
    );
    expect(resolveHit(base({ target: { id: "T", level: "immune" } })).outcome).toEqual(
      { type: "hit", monsterId: "T", amount: 0 },
    );
  });

  it("吸収なら防御側が回復する", () => {
    expect(resolveHit(base({ target: { id: "T", level: "absorb" } })).outcome).toEqual(
      { type: "absorb", monsterId: "T", amount: 100 },
    );
  });

  it("反射は攻撃側の耐性で判定する", () => {
    const r = resolveHit(
      base({
        target: { id: "T", level: "reflect" },
        attacker: { id: "A", level: "weak" },
      }),
    );
    expect(r.outcome).toEqual({ type: "hit", monsterId: "A", amount: 200 });
    expect(r.steps.map((s) => s.stage)).toEqual(["direct", "reflected"]);
  });

  it("反射されたものを攻撃側が吸収すると攻撃側が回復する", () => {
    const r = resolveHit(
      base({
        target: { id: "T", level: "reflect" },
        attacker: { id: "A", level: "absorb" },
      }),
    );
    expect(r.outcome).toEqual({ type: "absorb", monsterId: "A", amount: 100 });
  });

  it("攻撃側も反射ならとばっちり: 一段階下げて最も不利な味方が受ける", () => {
    const r = resolveHit(
      base({
        target: { id: "T", level: "reflect" },
        attacker: { id: "A", level: "reflect" },
        attackerAllies: [
          { id: "B", level: "immune" }, // → 適応 0.2
          { id: "C", level: "normal" }, // → 弱点 2.0 ← 選ばれる
          { id: "D", level: "resist" }, // → 普通 1.0
        ],
      }),
    );
    expect(r.outcome).toEqual({ type: "hit", monsterId: "C", amount: 200 });
    expect(r.steps.at(-1)).toEqual({ stage: "tobacchiri", monsterId: "C", level: "weak" });
  });

  it("無効の味方しかいなければ適応（0.2倍）で受ける", () => {
    const r = resolveHit(
      base({
        target: { id: "T", level: "reflect" },
        attacker: { id: "A", level: "reflect" },
        attackerAllies: [{ id: "B", level: "immune" }],
      }),
    );
    expect(r.outcome).toEqual({ type: "hit", monsterId: "B", amount: 20 });
  });

  it("反射・吸収の味方は候補外。候補がいなければ霧散する", () => {
    const r = resolveHit(
      base({
        target: { id: "T", level: "reflect" },
        attacker: { id: "A", level: "reflect" },
        attackerAllies: [
          { id: "B", level: "reflect" },
          { id: "C", level: "absorb" },
        ],
      }),
    );
    expect(r.outcome).toEqual({ type: "dissipated" });
  });

  it("味方がいなければ霧散する", () => {
    const r = resolveHit(
      base({
        target: { id: "T", level: "reflect" },
        attacker: { id: "A", level: "reflect" },
      }),
    );
    expect(r.outcome).toEqual({ type: "dissipated" });
  });

  it("同じ倍率の候補が複数いれば乱数で選ぶ", () => {
    const input = base({
      target: { id: "T", level: "reflect" },
      attacker: { id: "A", level: "reflect" },
      attackerAllies: [
        { id: "B", level: "normal" },
        { id: "C", level: "normal" },
      ],
    });
    expect(resolveHit({ ...input, random: () => 0 }).outcome).toMatchObject({ monsterId: "B" });
    expect(resolveHit({ ...input, random: () => 0.99 }).outcome).toMatchObject({ monsterId: "C" });
  });

  it("状態異常も同じ流れで判定し、付与率に倍率がかかる", () => {
    const r = resolveHit(
      base({
        kind: "status",
        baseAmount: 0.5,
        target: { id: "T", level: "reflect" },
        attacker: { id: "A", level: "reflect" },
        attackerAllies: [{ id: "B", level: "adapt" }], // → 耐性 0.6
      }),
    );
    expect(r.outcome).toEqual({ type: "hit", monsterId: "B", amount: 0.3 });
  });

  it("状態異常に吸収はエラー", () => {
    expect(() =>
      resolveHit(base({ kind: "status", target: { id: "T", level: "absorb" } })),
    ).toThrow();
  });
});
