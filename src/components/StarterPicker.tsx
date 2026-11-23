"use client";

import { useState, useTransition } from "react";
import { MonsterImage } from "@/components/MonsterImage";

export type StarterOption = {
  speciesId: number;
  name: string;
  rank: string | null;
  element: string | null;
  imagePath: string | null;
  message: string | null;
  level: number;
};

/** 最初のモンスターを 3 体の中から選ぶ */
export function StarterPicker({
  options,
  onChoose,
}: {
  options: StarterOption[];
  onChoose: (speciesId: number) => Promise<{ error?: string } | void>;
}) {
  const [selected, setSelected] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const chosen = options.find((o) => o.speciesId === selected);

  if (options.length === 0) {
    return <p className="text-red-600">最初のモンスターの候補（Starter_Options）が登録されていません。</p>;
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-4">
        {options.map((o) => (
          <button
            key={o.speciesId}
            onClick={() => setSelected(o.speciesId)}
            className={`flex flex-col items-center gap-2 rounded-2xl border-2 p-4 text-center ${
              o.speciesId === selected ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-950" : "border-black/10 hover:border-emerald-400 dark:border-white/15"
            }`}
          >
            <MonsterImage imagePath={o.imagePath} name={o.name} size={120} />
            <div className="text-xl font-bold">{o.name}</div>
            <div className="text-sm opacity-70">
              {[o.element && `${o.element}属性`, o.rank && `ランク ${o.rank}`, `Lv${o.level}`].filter(Boolean).join(" / ")}
            </div>
            {o.message && <p className="text-sm">{o.message}</p>}
          </button>
        ))}
      </div>
      {error && <p className="text-red-600">{error}</p>}
      <div className="text-center">
        <button
          disabled={!chosen || pending}
          onClick={() =>
            chosen &&
            confirm(`${chosen.name} を最初の仲間にします。あとから変更はできません。よろしいですか？`) &&
            startTransition(async () => {
              const res = await onChoose(chosen.speciesId);
              if (res && res.error) setError(res.error);
            })
          }
          className="rounded-md bg-emerald-600 px-8 py-3 text-lg font-semibold text-white hover:bg-emerald-700 disabled:opacity-40"
        >
          {chosen ? `${chosen.name} にする` : "モンスターを選んでください"}
        </button>
      </div>
    </div>
  );
}
