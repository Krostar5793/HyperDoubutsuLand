import { describe, expect, it } from "vitest";
import {
  allocationCost,
  expToNext,
  gainExp,
  statsAt,
  type SpeciesGrowthData,
} from "./growth";

const species: SpeciesGrowthData = { rank: "C", hp: 100, atk: 37, def: 5, int: 20, spd: 10 };
const noMp = { mp_hp: 0, mp_atk: 0, mp_def: 0, mp_int: 0, mp_spd: 0 };

describe("expToNext", () => {
  it("50 × 1.1^(Lv-1) × ランク係数（切り捨て）", () => {
    expect(expToNext(1, "SS")).toBe(100);
    expect(expToNext(1, "E")).toBe(40);
    expect(expToNext(1, "D")).toBe(50);
    expect(expToNext(2, "D")).toBe(55);
    expect(expToNext(49, "SS")).toBe(9701);
    expect(expToNext(49, "E")).toBe(3880);
  });
  it("ランクが未設定ならエラー", () => {
    expect(() => expToNext(1, null)).toThrow();
    expect(() => expToNext(1, "Z")).toThrow();
  });
});

describe("statsAt", () => {
  it("Lv1 は図鑑の初期値", () => {
    expect(statsAt(species, { level: 1, ...noMp })).toEqual({ hp: 100, atk: 37, def: 5, int: 20, spd: 10 });
  });
  it("HP は 5%、他は 10% ずつ。切り捨ては最後に 1 回", () => {
    // Lv50: 49 レベル分成長
    expect(statsAt(species, { level: 50, ...noMp })).toEqual({
      hp: 100 + 245, // 100 × 0.05 × 49
      atk: 37 + 181, // floor(37 × 0.1 × 49 = 181.3)
      def: 5 + 24, // floor(24.5)
      int: 20 + 98,
      spd: 10 + 49,
    });
  });
  it("Lv50 で成長が止まる", () => {
    expect(statsAt(species, { level: 99, ...noMp })).toEqual(statsAt(species, { level: 50, ...noMp }));
  });
  it("マスターポイント: HP は 1回 +10、他は +1", () => {
    const s = statsAt(species, { level: 1, ...noMp, mp_hp: 2, mp_atk: 3 });
    expect(s.hp).toBe(120);
    expect(s.atk).toBe(40);
  });
});

describe("allocationCost", () => {
  it("10回ごとに 5 増える", () => {
    expect(allocationCost(0)).toBe(5);
    expect(allocationCost(9)).toBe(5);
    expect(allocationCost(10)).toBe(10);
    expect(allocationCost(19)).toBe(10);
    expect(allocationCost(20)).toBe(15);
  });
});

describe("gainExp", () => {
  const m = { level: 1, exp: 0, level_cap: 99, master_points: 0 };
  it("足りなければレベルは上がらない", () => {
    expect(gainExp(m, "D", 49)).toMatchObject({ level: 1, exp: 49, levelsGained: 0 });
  });
  it("一度に複数レベル上がり、余りは持ち越す", () => {
    // D: Lv1→2 = 50, Lv2→3 = 55
    expect(gainExp(m, "D", 110)).toMatchObject({ level: 3, exp: 5, levelsGained: 2 });
  });
  it("Lv51 以降は 1レベルごとに 5 マスターポイント", () => {
    const r = gainExp({ ...m, level: 49 }, "E", 1_000_000);
    expect(r.level).toBeGreaterThan(52);
    expect(r.master_points).toBe((r.level - 50) * 5);
  });
  it("上限に達したら残りは捨てる", () => {
    const r = gainExp({ ...m, level: 98 }, "E", 10_000_000);
    expect(r).toMatchObject({ level: 99, exp: 0, levelsGained: 1 });
    expect(r.overflow).toBe(10_000_000 - expToNext(98, "E"));
    expect(gainExp({ ...m, level: 99 }, "E", 100)).toMatchObject({ level: 99, exp: 0, overflow: 100 });
  });
  it("上限を変えられる", () => {
    expect(gainExp({ ...m, level_cap: 3 }, "D", 10_000).level).toBe(3);
  });
});
