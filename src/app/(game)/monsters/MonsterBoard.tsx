"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { MonsterImage } from "@/components/MonsterImage";
import { BATTLE_SLOTS, STANDBY_SLOTS } from "@/lib/game/party";
import { moveMonsterAction, withdrawAction } from "./actions";

export type BoardMonster = {
  id: string;
  name: string;
  speciesName: string;
  rank: string | null;
  imagePath: string | null;
  level: number;
  slot: number | null;
  inStorage: boolean;
};

/**
 * 編成画面。モンスターを選んでから、移動先（枠・控え）を押すと移動・入れ替えする。
 */
export function MonsterBoard({ monsters, boxCapacity }: { monsters: BoardMonster[]; boxCapacity: number }) {
  const [selected, setSelected] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const bySlot = new Map(monsters.filter((m) => m.slot !== null).map((m) => [m.slot!, m]));
  const box = monsters.filter((m) => m.slot === null && !m.inStorage);
  const storage = monsters.filter((m) => m.inStorage);
  const selectedMonster = monsters.find((m) => m.id === selected) ?? null;

  const run = (fn: () => Promise<{ error?: string }>) => {
    setError(null);
    startTransition(async () => {
      const res = await fn();
      if (res.error) setError(res.error);
      else setSelected(null);
    });
  };

  const moveTo = (slot: number | null) => {
    if (!selected) return;
    run(() => moveMonsterAction(selected, slot));
  };

  const onSlotClick = (slot: number) => {
    const occupant = bySlot.get(slot);
    if (selected && selected !== occupant?.id) return moveTo(slot);
    setSelected(occupant ? (selected === occupant.id ? null : occupant.id) : null);
  };

  return (
    <div className="space-y-6">
      {selectedMonster && (
        <div className="sticky top-16 z-10 flex flex-wrap items-center gap-2 rounded-xl bg-emerald-600 p-3 text-sm text-white shadow">
          <span className="font-semibold">{selectedMonster.name}</span> を選択中。移動先の枠を押してください。
          {selectedMonster.slot !== null && (
            <button onClick={() => moveTo(null)} className="rounded bg-white/20 px-2 py-1">
              控えへ戻す
            </button>
          )}
          <Link href={`/monsters/${selectedMonster.id}`} className="rounded bg-white/20 px-2 py-1">
            詳細
          </Link>
          <button onClick={() => setSelected(null)} className="ml-auto rounded bg-white/20 px-2 py-1">
            やめる
          </button>
        </div>
      )}
      {error && <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">{error}</p>}

      {[
        { title: "バトルメンバー", slots: BATTLE_SLOTS },
        { title: "スタンバイメンバー", slots: STANDBY_SLOTS },
      ].map((group) => (
        <section key={group.title}>
          <h2 className="mb-2 font-bold">{group.title}</h2>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {group.slots.map((slot) => {
              const m = bySlot.get(slot);
              const isSelected = m && m.id === selected;
              return (
                <button
                  key={slot}
                  disabled={pending}
                  onClick={() => onSlotClick(slot)}
                  className={`flex min-h-20 items-center gap-2 rounded-xl border p-2 text-left ${
                    isSelected
                      ? "border-emerald-500 ring-2 ring-emerald-500"
                      : selected
                        ? "border-dashed border-emerald-500"
                        : "border-black/10 dark:border-white/15"
                  }`}
                >
                  {m ? (
                    <>
                      <MonsterImage imagePath={m.imagePath} name={m.speciesName} size={44} />
                      <span className="min-w-0">
                        <span className="block truncate font-semibold">{m.name}</span>
                        <span className="block text-xs opacity-70">
                          Lv{m.level}
                          {m.rank && ` / ${m.rank}`}
                        </span>
                      </span>
                    </>
                  ) : (
                    <span className="text-sm opacity-50">空き</span>
                  )}
                </button>
              );
            })}
          </div>
        </section>
      ))}

      <section>
        <h2 className="mb-2 font-bold">
          控え{" "}
          <span className="text-sm font-normal opacity-70">
            {box.length} / {boxCapacity}
          </span>
        </h2>
        {box.length === 0 ? (
          <p className="text-sm opacity-60">控えにモンスターはいません</p>
        ) : (
          <ul className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {box.map((m) => (
              <li key={m.id}>
                <button
                  disabled={pending}
                  onClick={() => setSelected(selected === m.id ? null : m.id)}
                  className={`flex w-full items-center gap-2 rounded-xl border p-2 text-left ${
                    m.id === selected ? "border-emerald-500 ring-2 ring-emerald-500" : "border-black/10 dark:border-white/15"
                  }`}
                >
                  <MonsterImage imagePath={m.imagePath} name={m.speciesName} size={40} />
                  <span className="min-w-0">
                    <span className="block truncate font-semibold">{m.name}</span>
                    <span className="block text-xs opacity-70">Lv{m.level}</span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      {storage.length > 0 && (
        <section>
          <h2 className="mb-1 font-bold">預り所 <span className="text-sm font-normal opacity-70">{storage.length} 体</span></h2>
          <p className="mb-2 text-xs opacity-70">控えに空きを作ると引き取れます。預り所のモンスターは編成できません。</p>
          <ul className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {storage.map((m) => (
              <li key={m.id} className="flex items-center gap-2 rounded-xl border border-black/10 p-2 dark:border-white/15">
                <MonsterImage imagePath={m.imagePath} name={m.speciesName} size={40} />
                <span className="min-w-0 flex-1">
                  <Link href={`/monsters/${m.id}`} className="block truncate font-semibold underline">
                    {m.name}
                  </Link>
                  <span className="block text-xs opacity-70">Lv{m.level}</span>
                </span>
                <button
                  disabled={pending}
                  onClick={() => run(() => withdrawAction(m.id))}
                  className="rounded border border-emerald-600 px-2 py-1 text-xs text-emerald-700 dark:text-emerald-400"
                >
                  引き取る
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
