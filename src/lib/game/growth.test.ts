import { describe, expect, it } from "vitest";
import {
  allocationCost,
  expToNext,
  gainExp,
  statsAt,
  type SpeciesGrowthData,
} from "./growth";

const noAlloc = { alloc_hp: 0, alloc_mp: 0, alloc_atk: 0, alloc_def: 0, alloc_int: 0, alloc_spd: 0 };
const sp = (over: Partial<SpeciesGrowthData> = {}): SpeciesGrowthData => ({
  rank: "C", hp: 10, mp: 10, atk: 5, def: 5, int: 5, spd: 5, ...over,
});

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
    expect(statsAt(sp(), { level: 1, ...noAlloc })).toEqual({ hp: 10, mp: 10, atk: 5, def: 5, int: 5, spd: 5 });
  });
  it("Lv50 の目安: HP 10〜50 → 約500〜1000、MP 10〜50 → 100〜500、その他 5〜30 → 約200〜500", () => {
    const low = statsAt(sp(), { level: 50, ...noAlloc });
    expect(low).toEqual({ hp: 514, mp: 100, atk: 205, def: 205, int: 205, spd: 205 });
    const high = statsAt(sp({ hp: 50, mp: 50, atk: 30, def: 30, int: 30, spd: 30 }), { level: 50, ...noAlloc });
    expect(high).toEqual({ hp: 1005, mp: 500, atk: 500, def: 500, int: 500, spd: 500 });
  });
  it("初期値が小さくても毎レベル伸びる", () => {
    let prev = statsAt(sp(), { level: 1, ...noAlloc });
    for (let level = 2; level <= 50; level++) {
      const now = statsAt(sp(), { level, ...noAlloc });
      for (const k of ["hp", "mp", "atk"] as const) expect(now[k]).toBeGreaterThan(prev[k]);
      prev = now;
    }
  });
  it("atk〜spd の合計: 初期値合計 35 → 約1000、95 → 約1700", () => {
    const sum = (s: ReturnType<typeof statsAt>) => s.atk + s.def + s.int + s.spd;
    expect(sum(statsAt(sp({ atk: 5, def: 5, int: 10, spd: 15 }), { level: 50, ...noAlloc }))).toBe(997);
    expect(sum(statsAt(sp({ atk: 30, def: 30, int: 20, spd: 15 }), { level: 50, ...noAlloc }))).toBe(1705);
  });
  it("Lv50 で成長が止まる", () => {
    expect(statsAt(sp(), { level: 99, ...noAlloc })).toEqual(statsAt(sp(), { level: 50, ...noAlloc }));
  });
  it("LP: HP は 1回 +10、MP は +5、その他は +1", () => {
    const s = statsAt(sp(), { level: 1, ...noAlloc, alloc_hp: 2, alloc_mp: 2, alloc_atk: 3 });
    expect(s).toMatchObject({ hp: 30, mp: 20, atk: 8 });
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
  const m = { level: 1, exp: 0, level_cap: 99, limit_points: 0 };
  it("足りなければレベルは上がらない", () => {
    expect(gainExp(m, "D", 49)).toMatchObject({ level: 1, exp: 49, levelsGained: 0 });
  });
  it("一度に複数レベル上がり、余りは持ち越す", () => {
    // D: Lv1→2 = 50, Lv2→3 = 55
    expect(gainExp(m, "D", 110)).toMatchObject({ level: 3, exp: 5, levelsGained: 2 });
  });
  it("Lv51 以降は 1レベルごとに 5 LP", () => {
    const r = gainExp({ ...m, level: 49 }, "E", 1_000_000);
    expect(r.level).toBeGreaterThan(52);
    expect(r.limit_points).toBe((r.level - 50) * 5);
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
