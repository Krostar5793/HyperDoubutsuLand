"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import type { BattleState } from "@/lib/game/battle";
import type { StepEvent } from "@/lib/game/explore";
import { GuideModal, type Guide } from "@/components/GuideModal";
import { StarterPicker, type StarterOption } from "@/components/StarterPicker";
import { chooseStarterAction } from "../../welcome/actions";
import { advanceAction, loadBattleAction, retreatAction } from "../actions";
import { BattleView, type BattleItem } from "./BattleView";

type LogEntry = StepEvent | { type: "retreat"; position: number };
type Status = "exploring" | "cleared" | "failed" | "retreated";
type Names = {
  species: Record<number, string>;
  items: Record<number, string>;
  currencies: Record<string, string>;
};
type BattleSummary = {
  outcome: "won" | "lost";
  exp: { name: string; amount: number; levels: number }[];
  recruited: string | null;
  inStorage: boolean;
};

/** 1 マス進むまでの間隔（ミリ秒） */
const STEP_INTERVAL = 900;

function describe(e: LogEntry, names: Names): string {
  const sp = (id: number) => names.species[id] ?? `モンスター#${id}`;
  switch (e.type) {
    case "nothing":
      return "何も見つからなかった。";
    case "choice":
      return "分かれ道があった。（選択イベントは準備中）";
    case "retreat":
      return "探索を切り上げて引き返した。";
    case "loot": {
      const where = e.source === "chest" ? "宝箱を開けた！" : "何か落ちている！";
      if (!e.gain) return `${where} …中身は空っぽだった。`;
      const what =
        "item_id" in e.gain
          ? `${names.items[e.gain.item_id] ?? "アイテム"} ×${e.gain.quantity}`
          : `${e.gain.quantity.toLocaleString()} ${names.currencies[e.gain.currency_code] ?? e.gain.currency_code}`;
      return `${where} ${what} を手に入れた。`;
    }
    case "battle_start": {
      const enemies = e.enemies.map((x) => `${sp(x.species_id)} Lv${x.level}`).join("、");
      return e.boss ? `ボス ${enemies} が立ちはだかる！` : `${enemies} が現れた！`;
    }
    case "battle_end": {
      if (e.outcome === "lose") return "パーティは全滅してしまった…";
      const join = e.recruited ? ` ${sp(e.recruited.species_id)} Lv${e.recruited.level} が仲間になった！` : "";
      return `戦闘に勝利した。${join}`;
    }
    case "battle": {
      const enemies = e.enemies.map((x) => `${sp(x.species_id)} Lv${x.level}`).join("、");
      return `${enemies} と戦った。（${e.outcome === "win" ? "勝利" : "敗北"}）`;
    }
  }
}

export function ExpeditionRunner({
  tutorial,
  expeditionId,
  areaName,
  clearAmount,
  totalSquares,
  initial,
  initialBattle,
  battleItems,
  names,
}: {
  expeditionId: string;
  areaName: string;
  clearAmount: number;
  totalSquares: number;
  initial: { status: Status; position: number; log: LogEntry[] };
  initialBattle: { id: string; state: BattleState } | null;
  battleItems: BattleItem[];
  names: Names;
  /** チュートリアル中なら、ガイドと最初のモンスターの候補 */
  tutorial: { guides: Record<string, Guide>; starterOptions: StarterOption[] } | null;
}) {
  // チュートリアルのガイド（表示待ちの列）と、すでに見たガイド
  const [guideQueue, setGuideQueue] = useState<Guide[]>(() =>
    tutorial && initial.log.length === 0 ? (["intro", "explore"].map((k) => tutorial.guides[k]).filter(Boolean)) : [],
  );
  const shown = useRef(new Set<string>(["intro", "explore"]));
  const showGuides = (...keys: string[]) => {
    if (!tutorial) return;
    const next = keys.filter((k) => !shown.current.has(k) && tutorial.guides[k]);
    next.forEach((k) => shown.current.add(k));
    if (next.length) setGuideQueue((q) => [...q, ...next.map((k) => tutorial.guides[k])]);
  };
  const [needStarter, setNeedStarter] = useState(false);
  const [status, setStatus] = useState<Status>(initial.status);
  const [position, setPosition] = useState(initial.position);
  const [log, setLog] = useState<LogEntry[]>(initial.log);
  const [battle, setBattle] = useState(initialBattle);
  const [summary, setSummary] = useState<BattleSummary | null>(null);
  const [paused, setPaused] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const logEnd = useRef<HTMLLIElement>(null);

  // 自動で 1 マスずつ進める（ポーズ中・戦闘中・通信中・エラー時は止める）
  useEffect(() => {
    if (status !== "exploring" || paused || busy || error || battle || summary || needStarter || guideQueue.length) return;
    const timer = setTimeout(async () => {
      setBusy(true);
      const res = await advanceAction(expeditionId);
      if (res.error || !res.result) {
        setBusy(false);
        setError(res.error ?? "通信に失敗しました");
        return;
      }
      const r = res.result;
      if (r.event.type === "need_starter") {
        setBusy(false);
        setNeedStarter(true);
        showGuides("starter");
        return;
      }
      const ev = r.event;
      setLog((l) => [...l, ev]);
      if (ev.type === "loot") showGuides("loot");
      setPosition(r.position);
      if (r.finish) setStatus(r.finish);
      if (r.battleId) {
        const b = await loadBattleAction(r.battleId);
        if (b.state) {
          setBattle({ id: r.battleId, state: b.state });
          showGuides("battle");
        }
        else setError(b.error ?? "戦闘を読み込めませんでした");
      }
      setBusy(false);
    }, STEP_INTERVAL);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, paused, busy, error, battle, summary, needStarter, guideQueue.length, expeditionId]);

  // チュートリアルの終わり
  useEffect(() => {
    if (status !== "exploring" && !battle) showGuides("party", "finish");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, battle]);

  useEffect(() => {
    logEnd.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [log.length]);

  const onBattleFinished = (details: Record<string, unknown>, state: BattleState) => {
    const won = state.result === "won";
    const recruit = details.recruit as { species_id: number; level: number } | null;
    const levels = (details.levels_gained ?? {}) as Record<string, number>;
    const exp = (details.exp ?? []) as { monster_id: string; amount: number }[];
    const nameOf = (id: string) => state.fighters.find((f) => f.monsterId === id)?.name ?? "？";
    setSummary({
      outcome: won ? "won" : "lost",
      exp: exp.map((e) => ({ name: nameOf(e.monster_id), amount: e.amount, levels: levels[e.monster_id] ?? 0 })),
      recruited: recruit ? `${names.species[recruit.species_id] ?? "モンスター"} Lv${recruit.level}` : null,
      inStorage: !!details.recruited_in_storage,
    });
    setLog((l) => [
      ...l,
      { type: "battle_end", position: position + 1, boss: state.boss, outcome: won ? "win" : "lose", recruited: recruit },
    ]);
    if (!won) setStatus("failed");
    else if (state.boss) setStatus("cleared");
    else setPosition((p) => p + 1);
  };

  const closeBattle = () => {
    setSummary(null);
    setBattle(null);
    showGuides("recruit");
  };

  const guide = guideQueue[0] ?? null;
  const guideModal = guide && (
    <GuideModal guide={guide} onClose={() => setGuideQueue((q) => q.slice(1))} buttonLabel={guideQueue.length > 1 ? "次へ" : "閉じる"} />
  );

  // チュートリアル: 初めての戦闘の前に、最初のモンスターを選ぶ
  if (needStarter && tutorial) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-bold">最初の仲間を選ぼう</h1>
        <StarterPicker
          options={tutorial.starterOptions}
          onChoose={async (id) => {
            const res = await chooseStarterAction(id);
            if (!res.error) setNeedStarter(false);
            return res;
          }}
        />
        {guideModal}
      </div>
    );
  }

  const retreat = async () => {
    if (!confirm("引き返しますか？ここまでに拾ったものは持ち帰れますが、クリア報酬はもらえません。")) return;
    setBusy(true);
    const res = await retreatAction(expeditionId);
    setBusy(false);
    if (res.error) setError(res.error);
    else {
      setLog((l) => [...l, { type: "retreat", position }]);
      setStatus("retreated");
    }
  };

  const progress = totalSquares > 0 ? Math.min(position / totalSquares, 1) : 1;
  const atBoss = position >= totalSquares;

  // 戦闘中
  if (battle) {
    return (
      <div className="flex h-[590px] flex-col gap-2">
        <div className="flex items-baseline justify-between">
          <h1 className="text-xl font-bold">
            {areaName} — {battle.state.boss ? "ボス戦" : "戦闘"}
          </h1>
        </div>
        <div className="min-h-0 flex-1">
          <BattleView battleId={battle.id} initial={battle.state} items={battleItems} onFinished={onBattleFinished} />
        </div>
        {guideModal}
        {summary && (
          <div className="rounded-lg bg-black/5 p-3 text-sm dark:bg-white/10">
            <p className="font-bold">{summary.outcome === "won" ? "戦闘に勝利した！" : "パーティは全滅してしまった…"}</p>
            {summary.exp.length > 0 && (
              <p>
                {summary.exp
                  .map((e) => `${e.name} +${e.amount.toLocaleString()} EXP${e.levels ? `（Lv が ${e.levels} 上がった！）` : ""}`)
                  .join("　")}
              </p>
            )}
            {summary.recruited && (
              <p className="font-semibold text-emerald-700 dark:text-emerald-400">
                {summary.recruited} が仲間になった！{summary.inStorage && "（控えがいっぱいなので預り所へ）"}
              </p>
            )}
            <button onClick={closeBattle} className="mt-2 rounded-md bg-emerald-600 px-4 py-2 font-medium text-white">
              {status === "exploring" ? "探索を続ける" : "結果を見る"}
            </button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-baseline justify-between gap-3">
        <h1 className="text-2xl font-bold">{areaName}</h1>
        <span className="text-sm tabular-nums opacity-70">{atBoss ? "ボス" : `${position} / ${totalSquares} マス`}</span>
      </div>

      <div
        className="h-3 overflow-hidden rounded-full bg-black/10 dark:bg-white/15"
        role="progressbar"
        aria-valuenow={Math.round(progress * 100)}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <div className="h-full bg-emerald-500 transition-all" style={{ width: `${progress * 100}%` }} />
      </div>

      <ol className="max-h-[400px] space-y-2 overflow-y-auto rounded-xl border border-black/10 p-3 text-sm dark:border-white/15">
        {log.length === 0 && <li className="opacity-60">探索を始めます…</li>}
        {log.map((e, i) => (
          <li key={i} className="flex gap-2">
            <span className="w-14 shrink-0 text-xs tabular-nums opacity-50">
              {"boss" in e && e.boss ? "ボス" : e.type === "retreat" || e.type === "battle_end" ? "" : `${e.position} マス目`}
            </span>
            <span>{describe(e, names)}</span>
          </li>
        ))}
        <li ref={logEnd} />
      </ol>

      {error && (
        <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
          {error}
          <button onClick={() => setError(null)} className="ml-3 underline">
            再試行
          </button>
        </div>
      )}

      {guideModal}
      {status === "exploring" ? (
        <div className="flex gap-2">
          <button
            onClick={() => setPaused((p) => !p)}
            className="flex-1 rounded-md bg-emerald-600 px-4 py-3 font-medium text-white hover:bg-emerald-700"
          >
            {paused ? "再開" : "ポーズ"}
          </button>
          {paused && !tutorial && (
            <button
              disabled={busy}
              onClick={retreat}
              className="flex-1 rounded-md border border-red-600 px-4 py-3 font-medium text-red-700 disabled:opacity-50 dark:text-red-400"
            >
              引き返す
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-3 rounded-xl bg-black/5 p-4 dark:bg-white/10">
          <p className="text-lg font-bold">
            {status === "cleared" && (tutorial ? "チュートリアルクリア！" : "探索クリア！")}
            {status === "failed" && "全滅してしまった…"}
            {status === "retreated" && "探索から戻った"}
          </p>
          <p className="text-sm">
            {status === "cleared" && `拾ったものとクリア報酬 ${clearAmount.toLocaleString()} P を受け取った。`}
            {status === "failed" && "この探索で拾ったアイテムと通貨は失われた。仲間になったモンスターは無事だ。"}
            {status === "retreated" && "拾ったものを持ち帰った。"}
          </p>
          <div className="flex gap-2">
            <Link href="/explore" className="rounded-md bg-emerald-600 px-4 py-2 font-medium text-white">
              エリア選択へ
            </Link>
            <Link href="/monsters" className="rounded-md border border-black/20 px-4 py-2 dark:border-white/20">
              モンスターを見る
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
