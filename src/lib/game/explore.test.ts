import { describe, expect, it } from "vitest";
import {
  pickWeighted,
  planStep,
  rollEnemies,
  rollSquareEvent,
  type AreaConfig,
  type StepContext,
} from "./explore";

const seq = (...values: number[]) => {
  let i = 0;
  return () => values[Math.min(i++, values.length - 1)];
};

const area: AreaConfig = {
  id: 1,
  min_enemies: 1,
  max_enemies: 3,
  squares: [
    { position: 1, monster_rate: 50, item_rate: 20, chest_rate: 10, choice_rate: 0 },
    { position: 2, monster_rate: 0, item_rate: 0, chest_rate: 0, choice_rate: 0 },
  ],
  encounters: [
    { species_id: 1, weight: 3, min_level: 5, max_level: 8 },
    { species_id: 2, weight: 1, min_level: 60, max_level: 60 },
  ],
  loot: [
    { source: "field", item_id: 10, currency_code: null, weight: 1, min_quantity: 1, max_quantity: 3 },
    { source: "chest", item_id: null, currency_code: "perica", weight: 1, min_quantity: 100, max_quantity: 100 },
  ],
  bosses: [{ slot: 1, species_id: 9, level: 20 }],
};

const ctx = (over: Partial<StepContext> = {}): StepContext => ({ ...over });

describe("rollSquareEvent", () => {
  const sq = area.squares[0];
  it("確率（%）の順に判定し、残りは何も起きない", () => {
    expect(rollSquareEvent(sq, () => 0.49)).toBe("monster");
    expect(rollSquareEvent(sq, () => 0.5)).toBe("item");
    expect(rollSquareEvent(sq, () => 0.7)).toBe("chest");
    expect(rollSquareEvent(sq, () => 0.8)).toBe("nothing");
    expect(rollSquareEvent(area.squares[1], () => 0)).toBe("nothing");
  });
});

describe("pickWeighted", () => {
  it("重みの比率で選ぶ", () => {
    expect(pickWeighted(area.encounters, () => 0.74)?.species_id).toBe(1);
    expect(pickWeighted(area.encounters, () => 0.75)?.species_id).toBe(2);
    expect(pickWeighted([], () => 0)).toBeNull();
  });
});

describe("rollEnemies", () => {
  it("1〜3 体。レベルは範囲内", () => {
    const one = rollEnemies(area, () => 0);
    expect(one).toHaveLength(1);
    expect(one[0]).toMatchObject({ species_id: 1, level: 5 });
    const three = rollEnemies(area, () => 0.99);
    expect(three).toHaveLength(3);
    expect(three.every((e) => e.species_id === 2 && e.level === 60)).toBe(true);
  });
});

describe("planStep", () => {
  it("落とし物を拾う", () => {
    // マス抽選 0.6 → item、候補選択、個数 0.99 → 3
    const plan = planStep(area, 0, ctx({ random: seq(0.6, 0, 0.99) }));
    expect(plan).toMatchObject({ advance: true, finish: null, loot: [{ item_id: 10, quantity: 3 }] });
  });

  it("宝箱からペリーカ", () => {
    const plan = planStep(area, 0, ctx({ random: seq(0.75, 0, 0) }));
    expect(plan.loot).toEqual([{ currency_code: "perica", quantity: 100 }]);
    expect(plan.event).toMatchObject({ type: "loot", source: "chest" });
  });

  it("モンスターのマスでは戦闘が始まる（マスは戦闘に勝ってから進む）", () => {
    const plan = planStep(area, 0, ctx({ random: () => 0 }));
    expect(plan.advance).toBe(false);
    expect(plan.event).toMatchObject({ type: "battle_start", boss: false, position: 1 });
    expect(plan.encounter?.enemies.length).toBeGreaterThan(0);
  });

  it("何も起きないマス", () => {
    expect(planStep(area, 1, ctx({ random: () => 0 }))).toMatchObject({
      advance: true,
      event: { type: "nothing", position: 2 },
    });
  });

  it("全マスを進んだらボス戦", () => {
    const plan = planStep(area, 2, ctx({ random: () => 0 }));
    expect(plan.event).toMatchObject({ type: "battle_start", boss: true, position: 3 });
    expect(plan.encounter).toMatchObject({ boss: true, enemies: [{ species_id: 9, level: 20, isBoss: true }] });
  });
});
