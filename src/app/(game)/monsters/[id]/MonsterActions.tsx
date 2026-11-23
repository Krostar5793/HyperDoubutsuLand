"use client";

import { useState, useTransition } from "react";
import type { Stat } from "@/lib/game/growth";
import { allocateLimitPointAction, releaseAction } from "../actions";

type Allocation = { stat: Stat; label: string; value: number; times: number; cost: number; gain: number };

export function MonsterActions({
  monsterId,
  limitPoints,
  allocations,
}: {
  monsterId: string;
  limitPoints: number;
  allocations: Allocation[];
}) {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const run = (fn: () => Promise<{ error?: string }>) => {
    setError(null);
    startTransition(async () => {
      const res = await fn();
      if (res?.error) setError(res.error);
    });
  };

  return (
    <div className="space-y-6">
      <section>
        <div className="mb-2 flex items-baseline justify-between">
          <h2 className="font-bold">ステータス</h2>
          <span className="text-sm">
            リミットポイント <span className="font-bold">{limitPoints}</span> LP
          </span>
        </div>
        <table className="w-full text-sm">
          <tbody>
            {allocations.map((a) => (
              <tr key={a.stat} className="border-b border-black/5 dark:border-white/10">
                <th className="py-2 text-left font-medium">{a.label}</th>
                <td className="py-2 text-right text-lg font-semibold tabular-nums">{a.value.toLocaleString()}</td>
                <td className="py-2 pl-3 text-right text-xs opacity-70">振った回数 {a.times}</td>
                <td className="py-2 pl-3 text-right">
                  <button
                    disabled={pending || limitPoints < a.cost}
                    onClick={() => run(() => allocateLimitPointAction(monsterId, a.stat))}
                    className="rounded border border-emerald-600 px-2 py-1 text-xs text-emerald-700 disabled:opacity-40 dark:text-emerald-400"
                    title={`${a.cost} LP で ${a.label} +${a.gain}`}
                  >
                    +{a.gain}（{a.cost} LP）
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="mt-2 text-xs opacity-60">LP は Lv51 以降、1 レベルごとに 5 もらえます。</p>
      </section>

      {error && <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">{error}</p>}

      <section>
        <button
          disabled={pending}
          onClick={() => {
            if (confirm("このモンスターをリリースします。元に戻せません。よろしいですか？")) {
              run(() => releaseAction(monsterId));
            }
          }}
          className="rounded-md border border-red-600 px-3 py-2 text-sm text-red-700 dark:text-red-400"
        >
          リリースする
        </button>
      </section>
    </div>
  );
}
