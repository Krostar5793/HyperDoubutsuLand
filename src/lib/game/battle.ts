import { resolveHit, type Combatant } from "./hit";
import { DEFAULT_RANK_TABLE, getRank, type RankTable } from "./ranks";
import { DEFAULT_RESISTANCE_TABLE, type ResistanceLevelCode, type ResistanceTable } from "./resistance";
import type { Stat, Stats } from "./growth";

/**
 * ターン制コマンドバトルの計算（サーバー側で使う純粋な関数）
 *
 *   ・毎ターン、場に出ている味方全員のコマンドを受け取り、敵のコマンドを決め、
 *     交代・防御 → アイテム → それ以外（素早さ順）の順に行動する
 *   ・ダメージ = (使い手の[攻撃ステータス] × 威力/100 − 受け手の[防御ステータス]/2) × 0.9〜1.1
 *               × 会心 1.5（5%）× 防御中 0.5 × 属性耐性（反射・とばっちりを含む）。最低 1
 *   ・ステータスダウン: 1 段階 20%、最大 4 段階。戦闘が終わるまで続く
 *   ・場の味方が倒れたら、スタンバイ（枠の小さい順）が自動で入る。全員倒れたら負け
 */

export const BATTLE = {
  critRate: 0.05,
  critMultiplier: 1.5,
  defendMultiplier: 0.5,
  variance: 0.1,
  /** 1 段階で下がる割合（%） */
  downPercentPerStage: 20,
  maxDownStages: 4,
  /** 経験値: 敵 1 体あたり baseExp × レベル × ランク係数 × 種族の倍率 */
  baseExp: 10,
  /** スタンバイ（場に出ていない生存者）が受け取る割合 */
  standbyExpRate: 0.5,
  fieldSize: 4,
} as const;

export type DownStat = "atk" | "def" | "int" | "spd";
export const DOWN_STATS: DownStat[] = ["atk", "def", "int", "spd"];

export type SkillTarget = "enemy" | "all_enemies" | "ally" | "all_allies" | "self";

export type SkillDef = {
  id: number;
  name: string;
  category: "attack" | "heal" | "support";
  attack_stat: Stat;
  defense_stat: Stat;
  power: number;
  mp_cost: number;
  target: SkillTarget;
  accuracy: number;
  element_id: number | null;
  effects: { status_effect_id: number; chance: number }[];
};

export type StatusEffectDef = {
  id: number;
  name: string;
  effect_type: "stat_down";
  stat: DownStat;
  stages: number;
};

export type Fighter = {
  key: string;
  side: "ally" | "enemy";
  name: string;
  speciesId: number;
  /** 味方のみ: Player_Monsters.id */
  monsterId: string | null;
  level: number;
  rank: string | null;
  expMultiplier: number;
  isBoss: boolean;
  /** 味方: パーティの枠（1〜8）/ 敵: 並び順 */
  slot: number;
  /** 最大値（HP・MP は最大値、その他は能力値） */
  stats: Stats;
  hp: number;
  mp: number;
  onField: boolean;
  fainted: boolean;
  defending: boolean;
  downs: Record<DownStat, number>;
  skillIds: number[];
  /** 攻撃の属性 id → 耐性段階（ないものは普通） */
  elementResist: Record<string, ResistanceLevelCode>;
  /** 状態異常 id → 耐性段階（ないものは普通） */
  statusResist: Record<string, ResistanceLevelCode>;
};

export type BattleState = {
  turn: number;
  boss: boolean;
  fighters: Fighter[];
  skills: Record<string, SkillDef>;
  statusEffects: Record<string, StatusEffectDef>;
  resistance: ResistanceTable;
  /** 仲間になる確率を上げるアイテムの倍率（敵の key → 倍率の一覧）。その戦闘の間有効 */
  itemBoosts: Record<string, number[]>;
  result: null | "won" | "lost";
  /** ターンごとのメッセージ */
  log: string[][];
};

export type Command =
  | { actor: string; type: "fight"; target?: string }
  | { actor: string; type: "skill"; skillId: number; target?: string }
  | { actor: string; type: "item"; itemId: number; itemName: string; multiplier: number; target: string }
  | { actor: string; type: "defend" }
  | { actor: string; type: "switch"; with: string };

export type FighterInput = Omit<Fighter, "onField" | "fainted" | "defending" | "downs" | "hp" | "mp"> & {
  hp?: number;
  mp?: number;
};

/** 通常攻撃（戦う） */
export const FIGHT: SkillDef = {
  id: 0,
  name: "戦う",
  category: "attack",
  attack_stat: "atk",
  defense_stat: "def",
  power: 100,
  mp_cost: 0,
  target: "enemy",
  accuracy: 100,
  element_id: null,
  effects: [],
};

const noDowns = (): Record<DownStat, number> => ({ atk: 0, def: 0, int: 0, spd: 0 });

export function createBattle(input: {
  allies: FighterInput[];
  enemies: FighterInput[];
  skills: SkillDef[];
  statusEffects: StatusEffectDef[];
  resistance?: ResistanceTable;
  boss: boolean;
}): BattleState {
  const make = (f: FighterInput): Fighter => {
    const hp = Math.min(f.hp ?? f.stats.hp, f.stats.hp);
    return {
      ...f,
      hp,
      mp: Math.min(f.mp ?? f.stats.mp, f.stats.mp),
      fainted: hp <= 0,
      onField: false,
      defending: false,
      downs: noDowns(),
    };
  };
  const state: BattleState = {
    turn: 1,
    boss: input.boss,
    fighters: [...input.allies.map(make), ...input.enemies.map(make)],
    skills: Object.fromEntries(input.skills.map((s) => [s.id, s])),
    statusEffects: Object.fromEntries(input.statusEffects.map((s) => [s.id, s])),
    resistance: input.resistance ?? DEFAULT_RESISTANCE_TABLE,
    itemBoosts: {},
    result: null,
    log: [],
  };
  for (const f of state.fighters) {
    f.onField = !f.fainted && (f.side === "enemy" || f.slot <= BATTLE.fieldSize);
  }
  // 最初から倒れているバトルメンバーの代わりにスタンバイを出す
  const fallen = state.fighters.filter((f) => f.side === "ally" && f.slot <= BATTLE.fieldSize && f.fainted).length;
  for (let i = 0; i < fallen; i++) bringReserve(state, []);
  state.result = judge(state);
  return state;
}

// ---------------------------------------------------------------- 参照

export const alive = (f: Fighter) => !f.fainted;
export const fieldOf = (s: BattleState, side: Fighter["side"]) =>
  s.fighters.filter((f) => f.side === side && f.onField && !f.fainted);
export const reservesOf = (s: BattleState) =>
  s.fighters.filter((f) => f.side === "ally" && !f.onField && !f.fainted).sort((a, b) => a.slot - b.slot);
const get = (s: BattleState, key: string) => s.fighters.find((f) => f.key === key);

/** ダウンを反映したステータス（HP・MP は現在値） */
export function effectiveStat(f: Fighter, stat: Stat): number {
  if (stat === "hp") return f.hp;
  if (stat === "mp") return f.mp;
  const down = (DOWN_STATS as Stat[]).includes(stat) ? f.downs[stat as DownStat] : 0;
  // 小数の誤差を避けるため、% の整数で計算する
  const percent = Math.max(0, 100 - BATTLE.downPercentPerStage * down);
  return Math.floor((f.stats[stat] * percent) / 100);
}

export function skillOf(s: BattleState, id: number): SkillDef | undefined {
  return id === 0 ? FIGHT : s.skills[id];
}

function judge(s: BattleState): BattleState["result"] {
  if (s.fighters.filter((f) => f.side === "enemy").every((f) => f.fainted)) return "won";
  if (s.fighters.filter((f) => f.side === "ally").every((f) => f.fainted)) return "lost";
  return null;
}

/** スタンバイを 1 体、場に出す */
function bringReserve(s: BattleState, log: string[]) {
  const next = reservesOf(s)[0];
  if (!next) return;
  next.onField = true;
  log.push(`${next.name} が戦いに加わった！`);
}

// ---------------------------------------------------------------- 敵の行動

/** 敵のコマンド: 使える特技と「戦う」からランダムに選ぶ */
export function enemyCommands(s: BattleState, random: () => number): Command[] {
  return fieldOf(s, "enemy").map((e) => {
    const usable = e.skillIds.map((id) => s.skills[id]).filter((sk) => sk && sk.mp_cost <= e.mp);
    const pick = [FIGHT, ...usable][Math.floor(random() * (usable.length + 1))];
    return pick.id === 0
      ? { actor: e.key, type: "fight" as const }
      : { actor: e.key, type: "skill" as const, skillId: pick.id };
  });
}

// ---------------------------------------------------------------- 1 ターン

/** プレイヤーのコマンドを検証して、足りない分は「戦う」で補う */
export function normalizeCommands(s: BattleState, commands: Command[]): Command[] {
  const result: Command[] = [];
  let itemUsed = false;
  const switching = new Set<string>();
  for (const ally of fieldOf(s, "ally")) {
    const c = commands.find((x) => x.actor === ally.key);
    if (!c) {
      result.push({ actor: ally.key, type: "fight" });
      continue;
    }
    if (c.type === "skill") {
      const sk = s.skills[c.skillId];
      if (!sk || !ally.skillIds.includes(c.skillId)) throw new Error("その特技は使えません");
    } else if (c.type === "item") {
      if (itemUsed) throw new Error("アイテムは 1 ターンに 1 回までです");
      const target = get(s, c.target);
      if (!target || target.side !== "enemy" || target.fainted) throw new Error("アイテムの対象が不正です");
      itemUsed = true;
    } else if (c.type === "switch") {
      const w = get(s, c.with);
      if (!w || w.side !== "ally" || w.onField || w.fainted || switching.has(w.key)) {
        throw new Error("交代できる相手ではありません");
      }
      switching.add(w.key);
    }
    result.push(c);
  }
  return result;
}

const priority = (c: Command) => (c.type === "switch" || c.type === "defend" ? 0 : c.type === "item" ? 1 : 2);

export function runTurn(
  prev: BattleState,
  playerCommands: Command[],
  random: () => number = Math.random,
): BattleState {
  if (prev.result) throw new Error("この戦闘は終わっています");
  const s: BattleState = structuredClone(prev);
  const log: string[] = [];
  const commands = [...normalizeCommands(s, playerCommands), ...enemyCommands(s, random)];

  const speedRoll = new Map(
    commands.map((c) => [c.actor, effectiveStat(get(s, c.actor)!, "spd") * (1 - BATTLE.variance + random() * BATTLE.variance * 2)]),
  );
  commands.sort((a, b) => priority(a) - priority(b) || speedRoll.get(b.actor)! - speedRoll.get(a.actor)!);

  for (const c of commands) {
    if (s.result) break;
    const actor = get(s, c.actor);
    if (!actor || actor.fainted || !actor.onField) continue;
    act(s, actor, c, log, random);
    s.result = judge(s);
  }

  for (const f of s.fighters) f.defending = false;
  if (s.result === "won") log.push("戦闘に勝利した！");
  if (s.result === "lost") log.push("パーティは全滅してしまった…");
  s.log.push(log);
  s.turn += 1;
  return s;
}

function pickTargets(s: BattleState, actor: Fighter, target: SkillTarget, chosen: string | undefined, random: () => number) {
  const foes = fieldOf(s, actor.side === "ally" ? "enemy" : "ally");
  const friends = fieldOf(s, actor.side);
  switch (target) {
    case "self":
      return [actor];
    case "all_enemies":
      return foes;
    case "all_allies":
      return friends;
    case "enemy":
    case "ally": {
      const pool = target === "enemy" ? foes : friends;
      const c = chosen ? pool.find((f) => f.key === chosen) : undefined;
      // 狙った相手が倒れていたら、別の相手を狙う
      return c ? [c] : pool.length ? [pool[Math.floor(random() * pool.length)]] : [];
    }
  }
}

function act(s: BattleState, actor: Fighter, c: Command, log: string[], random: () => number) {
  switch (c.type) {
    case "defend":
      actor.defending = true;
      log.push(`${actor.name} は身を守っている。`);
      return;
    case "switch": {
      const w = get(s, c.with);
      if (!w || w.fainted || w.onField) return;
      actor.onField = false;
      w.onField = true;
      log.push(`${actor.name} と ${w.name} が入れ替わった。`);
      return;
    }
    case "item": {
      const t = get(s, c.target);
      if (!t || t.fainted) {
        log.push(`${actor.name} は ${c.itemName} を使おうとしたが、相手がいなかった。`);
        return;
      }
      (s.itemBoosts[t.key] ??= []).push(c.multiplier);
      log.push(`${actor.name} は ${c.itemName} を使った！ ${t.name} が仲間になりやすくなった。`);
      return;
    }
    case "fight":
    case "skill": {
      const skill = c.type === "fight" ? FIGHT : skillOf(s, c.skillId);
      if (!skill) return;
      if (skill.mp_cost > actor.mp) {
        log.push(`${actor.name} は ${skill.name} を使おうとしたが、MP が足りない！`);
        return;
      }
      actor.mp -= skill.mp_cost;
      log.push(skill.id === 0 ? `${actor.name} の攻撃！` : `${actor.name} の ${skill.name}！`);
      for (const t of pickTargets(s, actor, skill.target, c.target, random)) {
        if (t.fainted) continue;
        applySkillTo(s, actor, t, skill, log, random);
      }
    }
  }
}

function applySkillTo(s: BattleState, actor: Fighter, target: Fighter, skill: SkillDef, log: string[], random: () => number) {
  if (random() * 100 >= skill.accuracy) {
    log.push(`${target.name} には当たらなかった。`);
    return;
  }

  if (skill.category === "heal") {
    const amount = Math.max(
      1,
      Math.floor(effectiveStat(actor, skill.attack_stat) * (skill.power / 100) * (1 - BATTLE.variance + random() * BATTLE.variance * 2)),
    );
    const healed = Math.min(amount, target.stats.hp - target.hp);
    target.hp += healed;
    log.push(`${target.name} の HP が ${healed} 回復した。`);
  }

  if (skill.category === "attack") {
    let base =
      (effectiveStat(actor, skill.attack_stat) * skill.power) / 100 - effectiveStat(target, skill.defense_stat) / 2;
    base *= 1 - BATTLE.variance + random() * BATTLE.variance * 2;
    const crit = random() < BATTLE.critRate;
    if (crit) {
      base *= BATTLE.critMultiplier;
      log.push("会心の一撃！");
    }
    if (target.defending) base *= BATTLE.defendMultiplier;
    base = Math.max(1, Math.floor(base));

    const el = skill.element_id === null ? null : String(skill.element_id);
    const level = (f: Fighter): ResistanceLevelCode => (el === null ? "normal" : (f.elementResist[el] ?? "normal"));
    applyHit(s, actor, target, "damage", base, level, log, random, (f, r) => {
      if (r.type === "absorb") {
        const healed = Math.min(r.amount, f.stats.hp - f.hp);
        f.hp += healed;
        log.push(`${f.name} は攻撃を吸収して HP が ${healed} 回復した！`);
      } else {
        damage(s, f, r.amount, log);
      }
    });
  }

  // 付与する効果（ステータスダウンなど）
  for (const eff of skill.effects) {
    const def = s.statusEffects[eff.status_effect_id];
    if (!def || target.fainted) continue;
    const id = String(def.id);
    applyHit(s, actor, target, "status", eff.chance / 100, (f) => f.statusResist[id] ?? "normal", log, random, (f, r) => {
      if (random() >= r.amount) {
        log.push(`${f.name} には ${def.name} の効果がなかった。`);
        return;
      }
      const before = f.downs[def.stat];
      f.downs[def.stat] = Math.min(BATTLE.maxDownStages, before + def.stages);
      log.push(
        f.downs[def.stat] === before
          ? `${f.name} の ${def.name} はこれ以上効かない。`
          : `${f.name} に ${def.name}！（${f.downs[def.stat]} 段階）`,
      );
    });
  }
}

/** 耐性（反射・とばっちりを含む）を判定して、最終的に効果を受けたモンスターに apply を呼ぶ */
function applyHit(
  s: BattleState,
  actor: Fighter,
  target: Fighter,
  kind: "damage" | "status",
  baseAmount: number,
  levelOf: (f: Fighter) => ResistanceLevelCode,
  log: string[],
  random: () => number,
  apply: (f: Fighter, r: { type: "hit" | "absorb"; amount: number }) => void,
) {
  const toCombatant = (f: Fighter): Combatant => ({ id: f.key, level: levelOf(f) });
  const result = resolveHit({
    kind,
    baseAmount,
    target: toCombatant(target),
    attacker: toCombatant(actor),
    attackerAllies: fieldOf(s, actor.side).filter((f) => f.key !== actor.key).map(toCombatant),
    table: s.resistance,
    random,
  });
  for (const step of result.steps.slice(1)) {
    const f = get(s, step.monsterId)!;
    if (step.stage === "reflected") log.push(`${target.name} は跳ね返した！`);
    if (step.stage === "tobacchiri") log.push(`${actor.name} も跳ね返した！ とばっちりが ${f.name} に！`);
  }
  const o = result.outcome;
  if (o.type === "dissipated") {
    log.push("跳ね返された効果は霧散した。");
    return;
  }
  apply(get(s, o.monsterId)!, { type: o.type, amount: o.amount });
}

function damage(s: BattleState, f: Fighter, amount: number, log: string[]) {
  f.hp = Math.max(0, f.hp - amount);
  log.push(`${f.name} に ${amount} のダメージ！`);
  if (f.hp === 0) {
    f.fainted = true;
    f.onField = false;
    log.push(`${f.name} は倒れた！`);
    if (f.side === "ally") bringReserve(s, log);
  }
}

// ---------------------------------------------------------------- 戦闘後

/** 経験値の配分: 敵の合計を、場に残った味方で均等に分ける。スタンバイの生存者は半分 */
export function battleExp(s: BattleState, ranks: RankTable = DEFAULT_RANK_TABLE): { monster_id: string; amount: number }[] {
  const total = s.fighters
    .filter((f) => f.side === "enemy")
    .reduce((sum, e) => sum + BATTLE.baseExp * e.level * getRank(e.rank, ranks).exp_rate * e.expMultiplier, 0);
  const field = s.fighters.filter((f) => f.side === "ally" && f.onField && !f.fainted && f.monsterId);
  const reserves = s.fighters.filter((f) => f.side === "ally" && !f.onField && !f.fainted && f.monsterId);
  if (field.length === 0) return [];
  const share = Math.floor(total / field.length);
  return [
    ...field.map((f) => ({ monster_id: f.monsterId!, amount: share })),
    ...reserves.map((f) => ({ monster_id: f.monsterId!, amount: Math.floor(share * BATTLE.standbyExpRate) })),
  ];
}

/** 探索中に持ち越す HP・MP */
export function partyState(s: BattleState): Record<string, { hp: number; mp: number }> {
  return Object.fromEntries(
    s.fighters.filter((f) => f.side === "ally" && f.monsterId).map((f) => [f.monsterId!, { hp: f.hp, mp: f.mp }]),
  );
}
