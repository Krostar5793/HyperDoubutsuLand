import { describe, expect, it } from "vitest";
import { checkParents, checkSkillChoice, fusionBonuses, fusionCandidates, type FusionParent, type FusionSpecies } from "./fusion";
import { statsAt } from "./growth";

const sp = (id: number, rank: string, element: number | null, o: Partial<FusionSpecies> = {}): FusionSpecies => ({
  id, name: `種${id}`, rank, element_id: element, fusion_selectable: true,
  hp: 20, mp: 20, atk: 10, def: 10, int: 10, spd: 10, ...o,
});
const noAlloc = { alloc_hp: 0, alloc_mp: 0, alloc_atk: 0, alloc_def: 0, alloc_int: 0, alloc_spd: 0 };
const parent = (id: string, species: FusionSpecies, level = 10, o: Partial<FusionParent> = {}): FusionParent => ({
  id, level, species, skillIds: [], ...noAlloc, ...o,
});

// 火(1)・水(2)・属性なし(null)
const ALL = [
  sp(1, "E", 1), sp(2, "E", 2), sp(3, "D", 1), sp(4, "D", 2), sp(5, "C", 1),
  sp(6, "E", null), sp(7, "D", 1, { fusion_selectable: false }), sp(8, "S", 2, { fusion_selectable: false }),
];
const RULES = [{ code: "E", fusion_rankup_level_sum: 50 }, { code: "D", fusion_rankup_level_sum: 60 }];

describe("fusionCandidates", () => {
  it("属性は親のどちらか、ランクは低い方とちょうど同じ", () => {
    const c = fusionCandidates(parent("a", ALL[0]), parent("b", ALL[3]), ALL, [], RULES);
    // 火 E + 水 D → 火か水の E
    expect(c.map((x) => x.speciesId).sort()).toEqual([1, 2]);
    expect(c.every((x) => x.kind === "normal")).toBe(true);
  });
  it("属性なしの親がいれば、属性なしも候補", () => {
    const c = fusionCandidates(parent("a", ALL[0]), parent("b", ALL[5]), ALL, [], RULES);
    expect(c.map((x) => x.speciesId).sort()).toEqual([1, 6]);
  });
  it("同ランクでレベル合計が基準以上なら 1 つ上のランクも（同ランクも残る）。選べない種族は出ない", () => {
    const below = fusionCandidates(parent("a", ALL[0], 24), parent("b", ALL[1], 25), ALL, [], RULES);
    expect(below.map((x) => x.speciesId).sort()).toEqual([1, 2]);
    const up = fusionCandidates(parent("a", ALL[0], 25), parent("b", ALL[1], 25), ALL, [], RULES);
    expect(up.map((x) => `${x.speciesId}:${x.kind}`).sort()).toEqual(["1:normal", "2:normal", "3:rankup", "4:rankup"]);
  });
  it("ランクが違えばランクアップしない", () => {
    const c = fusionCandidates(parent("a", ALL[0], 50), parent("b", ALL[3], 50), ALL, [], RULES);
    expect(c.some((x) => x.kind === "rankup")).toBe(false);
  });
  it("特別な組み合わせ（親の順番は問わない。通常は選べない種族も出る）", () => {
    const recipes = [{ parent_a_species_id: 2, parent_b_species_id: 1, child_species_id: 8 }];
    const c = fusionCandidates(parent("a", ALL[0]), parent("b", ALL[1]), ALL, recipes, RULES);
    expect(c.find((x) => x.speciesId === 8)?.kind).toBe("recipe");
  });
});

describe("checkParents", () => {
  it("Lv10 以上の別々の 2 体", () => {
    expect(checkParents(parent("a", ALL[0]), parent("b", ALL[0]))).toBeNull();
    expect(checkParents(parent("a", ALL[0], 9), parent("b", ALL[0]))).toContain("Lv10");
    expect(checkParents(parent("a", ALL[0]), parent("a", ALL[0]))).toContain("同じ");
  });
});

describe("fusionBonuses", () => {
  it("HP・MP を除いて最も高い項目に 2 割の成長ボーナス", () => {
    const fast = sp(9, "E", 1, { hp: 99, spd: 30 });
    const r = fusionBonuses(parent("a", fast), parent("b", ALL[0]));
    expect(r.bestStat).toBe("spd");
    expect(r.growth_bonus).toEqual({ spd: 0.2 });
  });
  it("LP で上げた分の 3 割を足す（HP は 1 回 10）", () => {
    const r = fusionBonuses(parent("a", ALL[0], 60, { alloc_atk: 20, alloc_hp: 3 }), parent("b", ALL[0], 60, { alloc_atk: 10 }));
    expect(r.stat_bonus).toEqual({ atk: 9, hp: 9 });
  });
  it("ボーナスはステータスに反映される", () => {
    const base = statsAt(ALL[0], { level: 50, ...noAlloc });
    const boosted = statsAt(ALL[0], { level: 50, ...noAlloc, growth_bonus: { atk: 0.2 }, stat_bonus: { atk: 9 } });
    expect(boosted.atk).toBeGreaterThan(base.atk + 9);
    expect(boosted.def).toBe(base.def);
  });
});

describe("checkSkillChoice", () => {
  const a = parent("a", ALL[0], 10, { skillIds: [1, 2] });
  const b = parent("b", ALL[0], 10, { skillIds: [3] });
  const cost = (id: number) => (id === 3 ? 2 : 1);
  it("両親の特技から、使用枠が枠の数まで", () => {
    expect(checkSkillChoice([1, 2, 3], a, b, cost, 4)).toBeNull();
    expect(checkSkillChoice([1, 2, 3], a, b, cost, 3)).toContain("枠が足りません");
    expect(checkSkillChoice([9], a, b, cost, 5)).toContain("持っていない");
    expect(checkSkillChoice([1, 1], a, b, cost, 5)).toContain("2 つ");
  });
});
