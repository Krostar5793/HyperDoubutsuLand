"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { MonsterImage } from "@/components/MonsterImage";
import { FUSION } from "@/lib/game/fusion";
import type { FusionPreview } from "@/lib/game/fusion-server";
import { STAT_LABELS } from "@/lib/game/names";
import { fuseAction, previewFusionAction } from "./actions";

export type LabMonster = {
  id: string;
  name: string;
  speciesName: string;
  rank: string | null;
  element: string | null;
  imagePath: string | null;
  level: number;
  place: string;
};

const KIND_LABEL = { normal: "", rankup: "ランクアップ", recipe: "特別な組み合わせ" } as const;

export function FusionLab({ monsters, elementNames }: { monsters: LabMonster[]; elementNames: Record<string, string> }) {
  const router = useRouter();
  const [parents, setParents] = useState<string[]>([]);
  const [preview, setPreview] = useState<FusionPreview | null>(null);
  const [child, setChild] = useState<number | null>(null);
  const [skills, setSkills] = useState<number[]>([]);
  const [message, setMessage] = useState<{ text: string; error?: boolean } | null>(null);
  const [pending, startTransition] = useTransition();

  const eligible = monsters.filter((m) => m.level >= FUSION.minParentLevel);
  const chosen = preview?.candidates.find((c) => c.speciesId === child) ?? null;
  const used = skills.reduce((sum, id) => sum + (preview?.skills.find((s) => s.id === id)?.slotCost ?? 1), 0);

  const toggleParent = (id: string) => {
    setMessage(null);
    const next = parents.includes(id) ? parents.filter((p) => p !== id) : [...parents, id].slice(-2);
    setParents(next);
    setPreview(null);
    setChild(null);
    setSkills([]);
    if (next.length === 2) {
      startTransition(async () => {
        const res = await previewFusionAction(next[0], next[1]);
        if (res.error) setMessage({ text: res.error, error: true });
        else setPreview(res.preview ?? null);
      });
    }
  };

  const toggleSkill = (id: number) =>
    setSkills((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));

  const fuse = () => {
    if (!chosen || parents.length !== 2) return;
    const names = parents.map((id) => monsters.find((m) => m.id === id)?.name).join(" と ");
    if (!confirm(`${names} を合成して ${chosen.name} を生み出します。親の 2 体はいなくなります。よろしいですか？`)) return;
    startTransition(async () => {
      const res = await fuseAction(parents[0], parents[1], chosen.speciesId, skills);
      if (res.error) {
        setMessage({ text: res.error, error: true });
        return;
      }
      setMessage({ text: `${chosen.name} が生まれた！${res.inStorage ? "（控えがいっぱいなので預り所へ）" : ""}` });
      setParents([]);
      setPreview(null);
      setChild(null);
      setSkills([]);
      router.refresh();
    });
  };

  return (
    <div className="grid grid-cols-[1fr_420px] gap-4">
      {/* 親を選ぶ */}
      <section>
        <h2 className="mb-2 font-bold">親を 2 体選ぶ（{parents.length} / 2）</h2>
        {eligible.length < 2 ? (
          <p className="text-sm opacity-70">Lv{FUSION.minParentLevel} 以上のモンスターが 2 体以上必要です。</p>
        ) : (
          <ul className="grid max-h-[480px] grid-cols-2 gap-2 overflow-y-auto">
            {eligible.map((m) => {
              const on = parents.includes(m.id);
              return (
                <li key={m.id}>
                  <button
                    disabled={pending}
                    onClick={() => toggleParent(m.id)}
                    className={`flex w-full items-center gap-2 rounded-xl border p-2 text-left ${
                      on ? "border-emerald-500 ring-2 ring-emerald-500" : "border-black/10 dark:border-white/15"
                    }`}
                  >
                    <MonsterImage imagePath={m.imagePath} name={m.speciesName} size={40} />
                    <span className="min-w-0">
                      <span className="block truncate font-semibold">{m.name}</span>
                      <span className="block text-xs opacity-70">
                        Lv{m.level} / {m.rank ?? "-"} / {m.element ? `${m.element}属性` : "属性なし"} / {m.place}
                      </span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {/* 子を選ぶ */}
      <section className="space-y-3">
        {message && (
          <p className={`rounded-lg p-3 text-sm ${message.error ? "bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-300" : "bg-emerald-50 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200"}`}>
            {message.text}
          </p>
        )}
        {pending && !preview && <p className="text-sm opacity-70">調べています…</p>}
        {preview && !preview.error && (
          <>
            <div>
              <h2 className="mb-2 font-bold">生まれるモンスター</h2>
              <ul className="space-y-1">
                {preview.candidates.map((c) => (
                  <li key={c.speciesId}>
                    <button
                      onClick={() => {
                        setChild(c.speciesId);
                        setSkills([]);
                      }}
                      className={`flex w-full items-center justify-between rounded-lg border px-3 py-2 text-left text-sm ${
                        c.speciesId === child ? "border-emerald-500 ring-2 ring-emerald-500" : "border-black/10 dark:border-white/15"
                      }`}
                    >
                      <span>
                        <span className="font-semibold">{c.name}</span>{" "}
                        <span className="opacity-70">
                          {c.rank} / {c.elementId ? `${elementNames[c.elementId] ?? ""}属性` : "属性なし"} / 特技枠 {c.skillSlots}
                        </span>
                      </span>
                      {KIND_LABEL[c.kind] && (
                        <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-900 dark:bg-amber-900/40 dark:text-amber-200">
                          {KIND_LABEL[c.kind]}
                        </span>
                      )}
                    </button>
                  </li>
                ))}
              </ul>
            </div>

            <div className="rounded-lg bg-black/5 p-3 text-sm dark:bg-white/10">
              <div className="font-semibold">子に付くボーナス</div>
              <div>
                成長ボーナス: {STAT_LABELS[preview.bonus.bestStat as keyof typeof STAT_LABELS]} の伸びが{" "}
                {Math.round(preview.bonus.growthRate * 100)}% アップ
              </div>
              <div>
                LP ボーナス:{" "}
                {Object.keys(preview.bonus.statBonus).length
                  ? Object.entries(preview.bonus.statBonus)
                      .map(([k, v]) => `${STAT_LABELS[k as keyof typeof STAT_LABELS]} +${v}`)
                      .join("、")
                  : "なし（親が LP を振っていない）"}
              </div>
            </div>

            {chosen && (
              <div>
                <h2 className="mb-1 font-bold">
                  引き継ぐ特技{" "}
                  <span className={`text-sm font-normal ${used > chosen.skillSlots ? "text-red-600" : "opacity-70"}`}>
                    使用枠 {used} / {chosen.skillSlots}
                  </span>
                </h2>
                <p className="mb-2 text-xs opacity-70">選ばなければ、図鑑の初期の特技になります。</p>
                <ul className="grid grid-cols-2 gap-1">
                  {preview.skills.map((s) => (
                    <li key={s.id}>
                      <label className="flex items-center gap-2 rounded border border-black/10 px-2 py-1 text-sm dark:border-white/15">
                        <input type="checkbox" checked={skills.includes(s.id)} onChange={() => toggleSkill(s.id)} />
                        <span className="flex-1">{s.name}</span>
                        <span className="text-xs opacity-60">{s.slotCost}枠</span>
                      </label>
                    </li>
                  ))}
                </ul>
                {chosen.cost && (
                  <p className={`mt-2 text-sm ${chosen.cost.owned < chosen.cost.quantity ? "text-red-600" : ""}`}>
                    必要なアイテム: {chosen.cost.itemName} ×{chosen.cost.quantity}（所持 {chosen.cost.owned}）
                  </p>
                )}
                <button
                  disabled={pending || used > chosen.skillSlots || (!!chosen.cost && chosen.cost.owned < chosen.cost.quantity)}
                  onClick={fuse}
                  className="mt-3 w-full rounded-md bg-emerald-600 px-4 py-3 font-semibold text-white hover:bg-emerald-700 disabled:opacity-40"
                >
                  {chosen.name} を生み出す
                </button>
              </div>
            )}
          </>
        )}
        {preview?.error && <p className="text-sm text-red-600">{preview.error}</p>}
        {!preview && parents.length < 2 && <p className="text-sm opacity-70">左から親を 2 体選んでください。</p>}
      </section>
    </div>
  );
}
