
/**
 * 探索の 1 マス分の抽選（サーバー側で使う。結果は commit_expedition_step で保存する）
 *
 *   ・position（進んだマス数）がマス数より少なければ、次のマスのイベントを抽選する
 *     - monster: 敵 1〜3 体との戦闘を始める（戦闘は battle.ts。勝てば次のマスへ）
 *     - item   : 落とし物（エリアの field 候補から 1 つ）
 *     - chest  : 宝箱（エリアの chest 候補から 1 つ）
 *     - choice : 選択イベント（※内容は未定。今は何も起きない扱い）
 *     - nothing: 何も起きない
 *   ・全マスを進んだらボス戦。勝てばクリア
 *   ・戦闘に負けたら全滅（探索で拾ったものは消える。仲間になったモンスターは残る）
 *   ・戦闘の勝ち負け・仲間になる判定・経験値は、戦闘の終わりに battle-server.ts で処理する
 */

export type SquareEvent = "monster" | "item" | "chest" | "choice" | "nothing";

export type AreaSquare = {
  position: number;
  monster_rate: number;
  item_rate: number;
  chest_rate: number;
  choice_rate: number;
};

export type AreaEncounter = {
  species_id: number;
  weight: number;
  min_level: number;
  max_level: number;
};

export type AreaLoot = {
  source: "field" | "chest";
  item_id: number | null;
  currency_code: string | null;
  weight: number;
  min_quantity: number;
  max_quantity: number;
};

export type AreaBoss = { slot: number; species_id: number; level: number };

export type AreaConfig = {
  id: number;
  min_enemies: number;
  max_enemies: number;
  squares: AreaSquare[];
  encounters: AreaEncounter[];
  loot: AreaLoot[];
  bosses: AreaBoss[];
};

export type Enemy = {
  id: string;
  species_id: number;
  level: number;
  isBoss: boolean;
};

export type LootGain =
  | { item_id: number; quantity: number }
  | { currency_code: string; quantity: number };

export type StepEvent =
  | { type: "nothing" | "choice"; position: number }
  | { type: "loot"; source: "field" | "chest"; position: number; gain: LootGain | null }
  /** 戦闘の開始 */
  | { type: "battle_start"; position: number; boss: boolean; enemies: Enemy[] }
  /** 戦闘の終わり */
  | {
      type: "battle_end";
      position: number;
      boss: boolean;
      outcome: "win" | "lose";
      recruited: { species_id: number; level: number } | null;
    }
  /** 以前の版の記録（戦闘を自動で勝ちにしていたころ）。表示のためだけに残す */
  | {
      type: "battle";
      position: number;
      boss: boolean;
      enemies: Enemy[];
      outcome: "win" | "lose";
      recruited: { species_id: number; level: number } | null;
    };

export type StepPlan = {
  /** マスを 1 つ進めるか（戦闘は勝ってから進める） */
  advance: boolean;
  event: StepEvent;
  loot: LootGain[];
  /** 戦闘が始まる場合の敵 */
  encounter: { enemies: Enemy[]; boss: boolean } | null;
  finish: "cleared" | null;
};

export type StepContext = {
  random?: () => number;
};

/** 重み付きで 1 つ選ぶ（候補がなければ null） */
export function pickWeighted<T extends { weight: number }>(
  items: readonly T[],
  random: () => number,
): T | null {
  const total = items.reduce((sum, i) => sum + Number(i.weight), 0);
  if (items.length === 0 || total <= 0) return null;
  let r = random() * total;
  for (const item of items) {
    r -= Number(item.weight);
    if (r < 0) return item;
  }
  return items[items.length - 1];
}

/** min 以上 max 以下の整数 */
export function randomInt(min: number, max: number, random: () => number): number {
  return min + Math.floor(random() * (max - min + 1));
}

/** マスのイベントを抽選する（確率は %。合計 100 未満の残りは何も起きない） */
export function rollSquareEvent(square: AreaSquare, random: () => number): SquareEvent {
  let r = random() * 100;
  const table: [SquareEvent, number][] = [
    ["monster", Number(square.monster_rate)],
    ["item", Number(square.item_rate)],
    ["chest", Number(square.chest_rate)],
    ["choice", Number(square.choice_rate)],
  ];
  for (const [event, rate] of table) {
    r -= rate;
    if (r < 0) return event;
  }
  return "nothing";
}

export function rollEnemies(area: AreaConfig, random: () => number): Enemy[] {
  const count = randomInt(area.min_enemies, area.max_enemies, random);
  const enemies: Enemy[] = [];
  for (let i = 0; i < count; i++) {
    const e = pickWeighted(area.encounters, random);
    if (!e) break;
    enemies.push({
      id: `e${i + 1}`,
      species_id: e.species_id,
      level: randomInt(e.min_level, e.max_level, random),
      isBoss: false,
    });
  }
  return enemies;
}

export function rollLoot(
  area: AreaConfig,
  source: "field" | "chest",
  random: () => number,
): LootGain | null {
  const row = pickWeighted(area.loot.filter((l) => l.source === source), random);
  if (!row) return null;
  const quantity = randomInt(row.min_quantity, row.max_quantity, random);
  return row.item_id !== null
    ? { item_id: row.item_id, quantity }
    : { currency_code: row.currency_code!, quantity };
}

function encounter(enemies: Enemy[], position: number, boss: boolean): StepPlan {
  return {
    advance: false,
    event: { type: "battle_start", position, boss, enemies },
    loot: [],
    encounter: { enemies, boss },
    finish: null,
  };
}

/**
 * 次の 1 マス（またはボス戦）を抽選する
 * @param position 今までに進んだマス数
 */
export function planStep(area: AreaConfig, position: number, ctx: StepContext = {}): StepPlan {
  const random = ctx.random ?? Math.random;
  const squares = [...area.squares].sort((a, b) => a.position - b.position);

  // ボス戦
  if (position >= squares.length) {
    const enemies = [...area.bosses]
      .sort((a, b) => a.slot - b.slot)
      .map((b) => ({ id: `boss${b.slot}`, species_id: b.species_id, level: b.level, isBoss: true }));
    if (enemies.length === 0) {
      // ボスが設定されていなければそのままクリア
      return {
        advance: false,
        event: { type: "nothing", position: squares.length + 1 },
        loot: [],
        encounter: null,
        finish: "cleared",
      };
    }
    return encounter(enemies, squares.length + 1, true);
  }

  const square = squares[position];
  const event = rollSquareEvent(square, random);

  switch (event) {
    case "monster": {
      const enemies = rollEnemies(area, random);
      if (enemies.length === 0) break; // 出現モンスターが未設定
      return encounter(enemies, square.position, false);
    }
    case "item":
    case "chest": {
      const source = event === "item" ? "field" : "chest";
      const gain = rollLoot(area, source, random);
      return {
        advance: true,
        event: { type: "loot", source, position: square.position, gain },
        loot: gain ? [gain] : [],
        encounter: null,
        finish: null,
      };
    }
    case "choice":
      return {
        advance: true,
        event: { type: "choice", position: square.position },
        loot: [],
        encounter: null,
        finish: null,
      };
  }

  return {
    advance: true,
    event: { type: "nothing", position: square.position },
    loot: [],
    encounter: null,
    finish: null,
  };
}
