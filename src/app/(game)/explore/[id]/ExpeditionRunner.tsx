"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import type { StepEvent } from "@/lib/game/explore";
import { advanceAction, retreatAction } from "../actions";

type LogEntry = StepEvent | { type: "retreat"; position: number };
type Status = "exploring" | "cleared" | "failed" | "retreated";
type Names = {
  species: Record<number, string>;
  items: Record<number, string>;
  currencies: Record<string, string>;
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
    case "battle": {
      const enemies = e.enemies.map((x) => `${sp(x.species_id)} Lv${x.level}`).join("、");
      const head = e.boss ? `ボス ${enemies} が立ちはだかる！` : `${enemies} が現れた！`;
      if (e.outcome === "lose") return `${head} …パーティは全滅してしまった。`;
      const join = e.recruited ? ` ${sp(e.recruited.species_id)} Lv${e.recruited.level} が仲間になった！` : "";
      return `${head} 戦闘に勝利した。${join}`;
    }
  }
}

export function ExpeditionRunner({
  expeditionId,
  areaName,
  clearAmount,
  totalSquares,
  initial,
  names,
}: {
  expeditionId: string;
  areaName: string;
  clearAmount: number;
  totalSquares: number;
  initial: { status: Status; position: number; log: LogEntry[] };
  names: Names;
}) {
  const [status, setStatus] = useState<Status>(initial.status);
  const [position, setPosition] = useState(initial.position);
  const [log, setLog] = useState<LogEntry[]>(initial.log);
  const [paused, setPaused] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notes, setNotes] = useState<string[]>([]);
  const logEnd = useRef<HTMLLIElement>(null);

  // 自動で 1 マスずつ進める（ポーズ中・通信中・エラー時は止める）
  useEffect(() => {
    if (status !== "exploring" || paused || busy || error) return;
    const timer = setTimeout(async () => {
      setBusy(true);
      const res = await advanceAction(expeditionId);
      setBusy(false);
      if (res.error || !res.result) {
        setError(res.error ?? "通信に失敗しました");
        return;
      }
      const r = res.result;
      setLog((l) => [...l, r.event]);
      setPosition(r.position);
      if (r.details.recruited_in_storage) {
        setNotes((n) => [...n, "控えがいっぱいだったので、仲間は預り所に送られた。"]);
      }
      if (r.finish) setStatus(r.finish);
    }, STEP_INTERVAL);
    return () => clearTimeout(timer);
  }, [status, paused, busy, error, expeditionId]);

  useEffect(() => {
    logEnd.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [log.length]);

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

  return (
    <div className="space-y-4">
      <div className="flex items-baseline justify-between gap-3">
        <h1 className="text-2xl font-bold">{areaName}</h1>
        <span className="text-sm tabular-nums opacity-70">
          {atBoss ? "ボス" : `${position} / ${totalSquares} マス`}
        </span>
      </div>

      <div className="h-3 overflow-hidden rounded-full bg-black/10 dark:bg-white/15" role="progressbar" aria-valuenow={Math.round(progress * 100)} aria-valuemin={0} aria-valuemax={100}>
        <div className="h-full bg-emerald-500 transition-all" style={{ width: `${progress * 100}%` }} />
      </div>

      <ol className="max-h-[55vh] space-y-2 overflow-y-auto rounded-xl border border-black/10 p-3 text-sm dark:border-white/15">
        {log.length === 0 && <li className="opacity-60">探索を始めます…</li>}
        {log.map((e, i) => (
          <li key={i} className="flex gap-2">
            <span className="w-14 shrink-0 text-xs tabular-nums opacity-50">
              {e.type === "battle" && e.boss ? "ボス" : e.type === "retreat" ? "" : `${e.position} マス目`}
            </span>
            <span>{describe(e, names)}</span>
          </li>
        ))}
        {notes.map((n, i) => (
          <li key={`n${i}`} className="text-amber-700 dark:text-amber-400">
            {n}
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

      {status === "exploring" ? (
        <div className="flex gap-2">
          <button
            onClick={() => setPaused((p) => !p)}
            className="flex-1 rounded-md bg-emerald-600 px-4 py-3 font-medium text-white hover:bg-emerald-700"
          >
            {paused ? "再開" : "ポーズ"}
          </button>
          {paused && (
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
            {status === "cleared" && "探索クリア！"}
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
