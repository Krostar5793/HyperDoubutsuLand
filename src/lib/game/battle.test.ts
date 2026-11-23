import { describe, expect, it } from "vitest";
import {
  battleExp,
  createBattle,
  effectiveStat,
  partyState,
  runTurn,
  type FighterInput,
  type SkillDef,
  type StatusEffectDef,
} from "./battle";

const stats = (o: Partial<Record<string, number>> = {}) => ({ hp: 100, mp: 50, atk: 50, def: 20, int: 30, spd: 10, ...o });

const ally = (slot: number, o: Partial<FighterInput> = {}): FighterInput => ({
  key: `a${slot}`, side: "ally", name: `味方${slot}`, speciesId: 1, monsterId: `m${slot}`, level: 10, rank: "C",
  expMultiplier: 1, isBoss: false, slot, stats: stats(), skillIds: [], elementResist: {}, statusResist: {}, ...o,
});
const enemy = (i: number, o: Partial<FighterInput> = {}): FighterInput => ({
  key: `e${i}`, side: "enemy", name: `敵${i}`, speciesId: 2, monsterId: null, level: 5, rank: "E",
  expMultiplier: 1, isBoss: false, slot: i, stats: stats({ spd: 1 }), skillIds: [], elementResist: {}, statusResist: {}, ...o,
});

const fire: SkillDef = {
  id: 1, name: "ひのこ", category: "attack", attack_stat: "int", defense_stat: "int", power: 150, mp_cost: 10,
  target: "enemy", accuracy: 100, element_id: 1, effects: [],
};
const weaken: SkillDef = {
  id: 2, name: "にらみつける", category: "support", attack_stat: "atk", defense_stat: "def", power: 0, mp_cost: 0,
  target: "all_enemies", accuracy: 100, element_id: null, effects: [{ status_effect_id: 10, chance: 100 }, { status_effect_id: 11, chance: 100 }],
};
const heal: SkillDef = {
  id: 3, name: "いやし", category: "heal", attack_stat: "int", defense_stat: "def", power: 100, mp_cost: 5,
  target: "ally", accuracy: 100, element_id: null, effects: [],
};
const effects: StatusEffectDef[] = [
  { id: 10, name: "攻撃ダウン", effect_type: "stat_down", stat: "atk", stages: 1 },
  { id: 11, name: "防御ダウン", effect_type: "stat_down", stat: "def", stages: 2 },
];

/** 0.5 を返し続ける（揺れなし・会心なし・命中） */
const mid = () => 0.5;

const battle = (allies: FighterInput[], enemies: FighterInput[]) =>
  createBattle({ allies, enemies, skills: [fire, weaken, heal], statusEffects: effects, boss: false });

describe("createBattle", () => {
  it("枠 1〜4 が場に出て、5〜8 はスタンバイ", () => {
    const s = battle([ally(1), ally(5)], [enemy(1)]);
    expect(s.fighters.find((f) => f.key === "a1")?.onField).toBe(true);
    expect(s.fighters.find((f) => f.key === "a5")?.onField).toBe(false);
  });
  it("最初から倒れているバトルメンバーの代わりにスタンバイが出る", () => {
    const s = battle([ally(1, { hp: 0 }), ally(5)], [enemy(1)]);
    expect(s.fighters.find((f) => f.key === "a5")?.onField).toBe(true);
  });
});

describe("runTurn", () => {
  it("戦う: (攻撃 − 防御/2) のダメージ", () => {
    const s = runTurn(battle([ally(1)], [enemy(1)]), [{ actor: "a1", type: "fight", target: "e1" }], mid);
    // 50 − 20/2 = 40
    expect(s.fighters.find((f) => f.key === "e1")?.hp).toBe(60);
    expect(s.turn).toBe(2);
  });

  it("特技は指定したステータスで計算し、MP を使う。属性の弱点で 2 倍", () => {
    const s0 = battle([ally(1, { skillIds: [1] })], [enemy(1, { elementResist: { "1": "weak" } })]);
    const s = runTurn(s0, [{ actor: "a1", type: "skill", skillId: 1, target: "e1" }], mid);
    // (30 × 1.5 − 30/2) = 30 → 弱点 60
    expect(s.fighters.find((f) => f.key === "e1")?.hp).toBe(40);
    expect(s.fighters.find((f) => f.key === "a1")?.mp).toBe(40);
  });

  it("ステータスダウン: 複数の効果を同時に。1 段階 20%、最大 4 段階", () => {
    let s = battle([ally(1, { skillIds: [2] })], [enemy(1)]);
    s = runTurn(s, [{ actor: "a1", type: "skill", skillId: 2 }], mid);
    const e = () => s.fighters.find((f) => f.key === "e1")!;
    expect(e().downs).toMatchObject({ atk: 1, def: 2 });
    expect(effectiveStat(e(), "atk")).toBe(40);
    s = runTurn(s, [{ actor: "a1", type: "skill", skillId: 2 }], mid);
    s = runTurn(s, [{ actor: "a1", type: "skill", skillId: 2 }], mid);
    expect(e().downs).toMatchObject({ atk: 3, def: 4 });
    expect(effectiveStat(e(), "def")).toBe(4);
  });

  it("状態異常の耐性: 無効なら効かない", () => {
    let s = battle([ally(1, { skillIds: [2] })], [enemy(1, { statusResist: { "10": "immune" } })]);
    s = runTurn(s, [{ actor: "a1", type: "skill", skillId: 2 }], mid);
    expect(s.fighters.find((f) => f.key === "e1")?.downs).toMatchObject({ atk: 0, def: 2 });
  });

  it("反射された攻撃は使い手が受ける", () => {
    const s0 = battle([ally(1, { skillIds: [1] })], [enemy(1, { elementResist: { "1": "reflect" } })]);
    const s = runTurn(s0, [{ actor: "a1", type: "skill", skillId: 1, target: "e1" }], mid);
    expect(s.fighters.find((f) => f.key === "e1")?.hp).toBe(100);
    expect(s.fighters.find((f) => f.key === "a1")!.hp).toBeLessThan(100);
  });

  it("防御中はダメージ半分", () => {
    const s = runTurn(battle([ally(1)], [enemy(1, { stats: stats({ spd: 1, atk: 60 }) })]), [{ actor: "a1", type: "defend" }], mid);
    // 敵: 60 − 10 = 50 → 防御 25
    expect(s.fighters.find((f) => f.key === "a1")?.hp).toBe(75);
  });

  it("回復", () => {
    const s = runTurn(battle([ally(1, { skillIds: [3], hp: 10 })], [enemy(1, { stats: stats({ atk: 0, spd: 1 }) })]), [{ actor: "a1", type: "skill", skillId: 3, target: "a1" }], mid);
    // 30 回復 → 40、敵の攻撃は 1
    expect(s.fighters.find((f) => f.key === "a1")?.hp).toBe(39);
  });

  it("倒れたらスタンバイが入り、全員倒れたら負け", () => {
    const strong = enemy(1, { stats: stats({ atk: 500, spd: 99 }) });
    let s = battle([ally(1), ally(5)], [strong]);
    s = runTurn(s, [{ actor: "a1", type: "defend" }], mid);
    expect(s.fighters.find((f) => f.key === "a5")?.onField).toBe(true);
    expect(s.result).toBeNull();
    s = runTurn(s, [{ actor: "a5", type: "defend" }], mid);
    expect(s.result).toBe("lost");
  });

  it("敵を全員倒すと勝ち", () => {
    const s = runTurn(battle([ally(1, { stats: stats({ atk: 999 }) })], [enemy(1)]), [{ actor: "a1", type: "fight" }], mid);
    expect(s.result).toBe("won");
  });

  it("交代", () => {
    const s = runTurn(battle([ally(1), ally(5)], [enemy(1)]), [{ actor: "a1", type: "switch", with: "a5" }], mid);
    expect(s.fighters.find((f) => f.key === "a5")?.onField).toBe(true);
    expect(s.fighters.find((f) => f.key === "a1")?.onField).toBe(false);
  });

  it("アイテムは 1 ターンに 1 回まで。倍率は戦闘中ずっと残る", () => {
    const s0 = battle([ally(1), ally(2)], [enemy(1)]);
    const item = { type: "item" as const, itemId: 1, itemName: "なかまの鈴", multiplier: 2, target: "e1" };
    expect(() => runTurn(s0, [{ actor: "a1", ...item }, { actor: "a2", ...item }], mid)).toThrow();
    let s = runTurn(s0, [{ actor: "a1", ...item }, { actor: "a2", type: "defend" }], mid);
    s = runTurn(s, [{ actor: "a1", ...item }, { actor: "a2", type: "defend" }], mid);
    expect(s.itemBoosts.e1).toEqual([2, 2]);
  });

  it("使えない特技はエラー", () => {
    expect(() => runTurn(battle([ally(1)], [enemy(1)]), [{ actor: "a1", type: "skill", skillId: 1 }], mid)).toThrow();
  });

  it("MP が足りなければ失敗する", () => {
    const s = runTurn(battle([ally(1, { skillIds: [1], mp: 0 })], [enemy(1)]), [{ actor: "a1", type: "skill", skillId: 1 }], mid);
    expect(s.fighters.find((f) => f.key === "e1")?.hp).toBe(100);
    expect(s.log[0].join()).toContain("MP が足りない");
  });
});

describe("battleExp / partyState", () => {
  it("経験値: 10 × Lv × ランク係数 × 種族の倍率 を場の味方で等分、スタンバイは半分", () => {
    const s = battle([ally(1), ally(2), ally(5)], [enemy(1, { level: 5, rank: "E", expMultiplier: 10 })]);
    // 10 × 5 × 0.8 × 10 = 400 → 200 ずつ、スタンバイ 100
    expect(battleExp(s)).toEqual([
      { monster_id: "m1", amount: 200 },
      { monster_id: "m2", amount: 200 },
      { monster_id: "m5", amount: 100 },
    ]);
  });
  it("HP・MP を持ち越す", () => {
    const s = battle([ally(1, { hp: 30, mp: 5 })], [enemy(1)]);
    expect(partyState(s)).toEqual({ m1: { hp: 30, mp: 5 } });
  });
});
