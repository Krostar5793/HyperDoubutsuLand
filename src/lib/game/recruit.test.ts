import { describe, expect, it } from "vitest";
import { recruitProbability, resolveRecruit, type RecruitCandidate } from "./recruit";

const c = (over: Partial<RecruitCandidate>): RecruitCandidate => ({
  id: "x", speciesId: 1, rank: "E", level: 10, ...over,
});
const none = new Set<number>();

/** 決まった値を順番に返す乱数 */
const seq = (...values: number[]) => {
  let i = 0;
  return () => values[i++ % values.length];
};

describe("recruitProbability", () => {
  it("ランクごとの基本確率", () => {
    const expected = { E: 0.2, D: 0.1, C: 0.05, B: 0.02, A: 0.01, S: 0.005, SS: 0.001 };
    for (const [rank, p] of Object.entries(expected)) {
      expect(recruitProbability(c({ rank }), none)).toBeCloseTo(p);
    }
  });
  it("所持している種族は半分", () => {
    expect(recruitProbability(c({ rank: "E" }), new Set([1]))).toBeCloseTo(0.1);
  });
  it("アイテムの倍率をかける（複数なら掛け合わせ）", () => {
    expect(recruitProbability(c({ rank: "SS", itemMultipliers: [2] }), none)).toBeCloseTo(0.002);
    expect(recruitProbability(c({ rank: "E", itemMultipliers: [2, 3] }), new Set([1]))).toBeCloseTo(0.6);
  });
  it("上限は 100%", () => {
    expect(recruitProbability(c({ rank: "E", itemMultipliers: [10] }), none)).toBe(1);
  });
  it("ボスは仲間にならない", () => {
    expect(recruitProbability(c({ isBoss: true, itemMultipliers: [100] }), none)).toBe(0);
  });
});

describe("resolveRecruit", () => {
  it("外れたら誰も仲間にならない", () => {
    expect(resolveRecruit([c({})], none, { random: () => 0.5 }).joined).toBeNull();
  });
  it("当たったら仲間になる。レベルは最大 50", () => {
    expect(resolveRecruit([c({ level: 30 })], none, { random: () => 0 }).joined).toEqual({ id: "x", speciesId: 1, level: 30 });
    expect(resolveRecruit([c({ level: 80 })], none, { random: () => 0 }).joined?.level).toBe(50);
  });
  it("複数当たったら確率が低い方", () => {
    const r = resolveRecruit(
      [c({ id: "e", rank: "E" }), c({ id: "c", rank: "C", speciesId: 2 })],
      none,
      { random: () => 0 },
    );
    expect(r.joined?.id).toBe("c");
  });
  it("同じ確率ならランダム", () => {
    const cs = [c({ id: "a" }), c({ id: "b", speciesId: 2 })];
    // 抽選 2 回（どちらも当たり）→ 選択
    expect(resolveRecruit(cs, none, { random: seq(0, 0, 0) }).joined?.id).toBe("a");
    expect(resolveRecruit(cs, none, { random: seq(0, 0, 0.99) }).joined?.id).toBe("b");
  });
  it("外れた候補は選ばれない", () => {
    const r = resolveRecruit(
      [c({ id: "c", rank: "C" }), c({ id: "e", rank: "E", speciesId: 2 })],
      none,
      { random: seq(0.9, 0.1, 0) }, // C は外れ（0.9 ≥ 0.05）、E は当たり（0.1 < 0.2）
    );
    expect(r.joined?.id).toBe("e");
  });
});
