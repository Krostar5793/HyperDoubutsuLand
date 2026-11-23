"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { fieldOf, FIGHT, reservesOf, type BattleState, type Command, type Fighter } from "@/lib/game/battle";
import { STAT_LABELS } from "@/lib/game/names";
import { battleTurnAction } from "../actions";

export type BattleItem = { id: number; name: string; quantity: number };

type Step =
  | { kind: "menu" }
  | { kind: "skills" }
  | { kind: "items" }
  | { kind: "target"; side: "enemy" | "ally"; make: (target: string) => Command }
  | { kind: "switch" };

function Bar({ value, max, color }: { value: number; max: number; color: string }) {
  const pct = max > 0 ? Math.max(0, Math.min(100, (value / max) * 100)) : 0;
  return (
    <div className="h-2 overflow-hidden rounded-full bg-black/15 dark:bg-white/15">
      <div className={`h-full ${color} transition-all duration-500`} style={{ width: `${pct}%` }} />
    </div>
  );
}

function FighterCard({ f, active, onClick, selectable }: { f: Fighter; active?: boolean; onClick?: () => void; selectable?: boolean }) {
  const downs = Object.entries(f.downs).filter(([, v]) => v > 0);
  return (
    <button
      type="button"
      disabled={!selectable}
      onClick={onClick}
      className={`w-full rounded-lg border p-2 text-left text-sm ${
        f.fainted ? "opacity-40" : ""
      } ${active ? "border-emerald-500 ring-2 ring-emerald-500" : selectable ? "border-sky-500 hover:bg-sky-500/10" : "border-black/10 dark:border-white/15"}`}
    >
      <div className="flex items-baseline justify-between gap-2">
        <span className="truncate font-semibold">{f.name}</span>
        <span className="shrink-0 text-xs opacity-70">Lv{f.level}</span>
      </div>
      <div className="mt-1 space-y-1">
        <div className="flex items-center gap-2 text-xs">
          <span className="w-6">HP</span>
          <div className="flex-1">
            <Bar value={f.hp} max={f.stats.hp} color="bg-emerald-500" />
          </div>
          {f.side === "ally" && <span className="w-16 text-right tabular-nums">{f.hp}/{f.stats.hp}</span>}
        </div>
        {f.side === "ally" && (
          <div className="flex items-center gap-2 text-xs">
            <span className="w-6">MP</span>
            <div className="flex-1">
              <Bar value={f.mp} max={f.stats.mp} color="bg-sky-500" />
            </div>
            <span className="w-16 text-right tabular-nums">{f.mp}/{f.stats.mp}</span>
          </div>
        )}
      </div>
      {downs.length > 0 && (
        <div className="mt-1 text-xs text-red-600 dark:text-red-400">
          {downs.map(([k, v]) => `${STAT_LABELS[k as keyof typeof STAT_LABELS]}↓${v}`).join(" ")}
        </div>
      )}
    </button>
  );
}

/**
 * 戦闘画面。場に出ている味方のコマンドを 1 体ずつ選び、全員分そろったらサーバーに送る。
 */
export function BattleView({
  battleId,
  initial,
  items,
  onFinished,
}: {
  battleId: string;
  initial: BattleState;
  items: BattleItem[];
  onFinished: (details: Record<string, unknown>, state: BattleState) => void;
}) {
  const [state, setState] = useState(initial);
  const [commands, setCommands] = useState<Command[]>([]);
  const [step, setStep] = useState<Step>({ kind: "menu" });
  const [busy, setBusy] = useState(false);
  const [auto, setAuto] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [itemStock, setItemStock] = useState(items);
  const logEnd = useRef<HTMLLIElement>(null);

  const allies = state.fighters.filter((f) => f.side === "ally");
  const field = fieldOf(state, "ally").sort((a, b) => a.slot - b.slot);
  const enemies = state.fighters.filter((f) => f.side === "enemy");
  const current = field[commands.length] ?? null;
  const itemChosen = commands.some((c) => c.type === "item");
  const switching = new Set(commands.flatMap((c) => (c.type === "switch" ? [c.with] : [])));
  const reserves = reservesOf(state).filter((r) => !switching.has(r.key));

  const send = async (cmds: Command[]) => {
    setBusy(true);
    setError(null);
    const res = await battleTurnAction(battleId, cmds);
    setBusy(false);
    setCommands([]);
    setStep({ kind: "menu" });
    if (res.error || !res.result) {
      setError(res.error ?? "通信に失敗しました");
      setAuto(false);
      return;
    }
    const used = cmds.find((c) => c.type === "item");
    if (used && used.type === "item") {
      setItemStock((s) => s.map((i) => (i.id === used.itemId ? { ...i, quantity: i.quantity - 1 } : i)).filter((i) => i.quantity > 0));
    }
    setState(res.result.state);
    if (res.result.finished) {
      setAuto(false);
      onFinished(res.result.details, res.result.state);
    }
  };

  const choose = (c: Command) => {
    const next = [...commands, c];
    setStep({ kind: "menu" });
    if (next.length >= field.length) send(next);
    else setCommands(next);
  };

  // オート: 全員「戦う」（狙いはランダム）
  useEffect(() => {
    if (!auto || busy || state.result || error) return;
    const t = setTimeout(() => send(field.map((f) => ({ actor: f.key, type: "fight" as const }))), 600);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auto, busy, state, error]);

  useEffect(() => {
    logEnd.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [state.log.length]);

  const skills = useMemo(
    () => (current ? current.skillIds.map((id) => state.skills[id]).filter(Boolean) : []),
    [current, state.skills],
  );

  const targetStep = step.kind === "target" ? step : null;

  return (
    <div className="grid h-full grid-cols-[1fr_340px] gap-3">
      <div className="flex min-h-0 flex-col gap-3">
        {/* 敵 */}
        <div className="grid grid-cols-3 gap-2">
          {enemies.map((e) => (
            <FighterCard
              key={e.key}
              f={e}
              selectable={targetStep?.side === "enemy" && !e.fainted}
              onClick={() => targetStep && choose(targetStep.make(e.key))}
            />
          ))}
        </div>

        {/* ログ */}
        <ol className="min-h-0 flex-1 space-y-1 overflow-y-auto rounded-lg border border-black/10 p-2 text-sm dark:border-white/15">
          {state.log.length === 0 && <li className="opacity-60">モンスターが現れた！</li>}
          {state.log.map((turn, i) => (
            <li key={i}>
              <div className="text-xs opacity-50">ターン {i + 1}</div>
              {turn.map((m, j) => (
                <div key={j}>{m}</div>
              ))}
            </li>
          ))}
          <li ref={logEnd} />
        </ol>

        {/* 味方 */}
        <div className="grid grid-cols-4 gap-2">
          {field.map((a) => (
            <FighterCard
              key={a.key}
              f={a}
              active={a.key === current?.key && !state.result}
              selectable={targetStep?.side === "ally"}
              onClick={() => targetStep && choose(targetStep.make(a.key))}
            />
          ))}
        </div>
      </div>

      {/* コマンド */}
      <div className="flex min-h-0 flex-col gap-2 rounded-lg border border-black/10 p-3 dark:border-white/15">
        {error && <p className="rounded bg-red-50 p-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">{error}</p>}
        {state.result ? (
          <p className="font-bold">{state.result === "won" ? "勝利！" : "全滅…"}</p>
        ) : busy ? (
          <p className="opacity-70">行動中…</p>
        ) : current ? (
          <>
            <p className="font-bold">{current.name} はどうする？</p>
            {step.kind === "menu" && (
              <div className="grid grid-cols-2 gap-2">
                <CommandButton onClick={() => setStep({ kind: "target", side: "enemy", make: (t) => ({ actor: current.key, type: "fight", target: t }) })}>
                  戦う
                </CommandButton>
                <CommandButton disabled={skills.length === 0} onClick={() => setStep({ kind: "skills" })}>
                  特技
                </CommandButton>
                <CommandButton disabled={itemChosen || itemStock.length === 0 || state.boss} onClick={() => setStep({ kind: "items" })}>
                  アイテム
                </CommandButton>
                <CommandButton onClick={() => choose({ actor: current.key, type: "defend" })}>防御</CommandButton>
                <CommandButton disabled={reserves.length === 0} onClick={() => setStep({ kind: "switch" })}>
                  交代
                </CommandButton>
                {commands.length > 0 && (
                  <CommandButton onClick={() => setCommands(commands.slice(0, -1))}>ひとつ戻る</CommandButton>
                )}
              </div>
            )}
            {step.kind === "skills" && (
              <ul className="min-h-0 flex-1 space-y-1 overflow-y-auto">
                {skills.map((sk) => (
                  <li key={sk.id}>
                    <button
                      disabled={sk.mp_cost > current.mp}
                      onClick={() => {
                        if (sk.target === "enemy" || sk.target === "ally") {
                          setStep({
                            kind: "target",
                            side: sk.target,
                            make: (t) => ({ actor: current.key, type: "skill", skillId: sk.id, target: t }),
                          });
                        } else {
                          choose({ actor: current.key, type: "skill", skillId: sk.id });
                        }
                      }}
                      className="flex w-full justify-between rounded border border-black/10 px-2 py-1.5 text-left text-sm hover:bg-black/5 disabled:opacity-40 dark:border-white/15 dark:hover:bg-white/10"
                    >
                      <span>{sk.name}</span>
                      <span className="opacity-70">MP {sk.mp_cost}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
            {step.kind === "items" && (
              <ul className="space-y-1">
                {itemStock.map((it) => (
                  <li key={it.id}>
                    <button
                      onClick={() =>
                        setStep({
                          kind: "target",
                          side: "enemy",
                          make: (t) => ({ actor: current.key, type: "item", itemId: it.id, itemName: it.name, multiplier: 1, target: t }),
                        })
                      }
                      className="flex w-full justify-between rounded border border-black/10 px-2 py-1.5 text-sm hover:bg-black/5 dark:border-white/15 dark:hover:bg-white/10"
                    >
                      <span>{it.name}</span>
                      <span className="opacity-70">×{it.quantity}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
            {step.kind === "switch" && (
              <ul className="space-y-1">
                {reserves.map((r) => (
                  <li key={r.key}>
                    <button
                      onClick={() => choose({ actor: current.key, type: "switch", with: r.key })}
                      className="flex w-full justify-between rounded border border-black/10 px-2 py-1.5 text-sm hover:bg-black/5 dark:border-white/15 dark:hover:bg-white/10"
                    >
                      <span>{r.name}</span>
                      <span className="opacity-70">HP {r.hp}/{r.stats.hp}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
            {targetStep && <p className="text-sm text-sky-700 dark:text-sky-300">対象を選んでください</p>}
            {step.kind !== "menu" && (
              <button onClick={() => setStep({ kind: "menu" })} className="text-sm underline">
                戻る
              </button>
            )}
          </>
        ) : null}

        <div className="mt-auto space-y-2 border-t border-black/10 pt-2 dark:border-white/15">
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={auto} onChange={(e) => setAuto(e.target.checked)} disabled={!!state.result} />
            オート（全員「{FIGHT.name}」）
          </label>
          {allies.some((a) => !a.onField) && (
            <div className="text-xs opacity-70">
              控えの仲間:{" "}
              {allies
                .filter((a) => !a.onField)
                .map((a) => `${a.name}${a.fainted ? "（倒れている）" : ` HP${a.hp}`}`)
                .join("、")}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function CommandButton({ children, onClick, disabled }: { children: React.ReactNode; onClick: () => void; disabled?: boolean }) {
  return (
    <button
      disabled={disabled}
      onClick={onClick}
      className="rounded-md bg-emerald-600 px-3 py-3 font-semibold text-white hover:bg-emerald-700 disabled:opacity-30"
    >
      {children}
    </button>
  );
}
