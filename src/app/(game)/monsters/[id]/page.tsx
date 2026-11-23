import { GameScreen } from "@/components/stage/GameScreen";
import Link from "next/link";
import { notFound } from "next/navigation";
import { MonsterImage } from "@/components/MonsterImage";
import { requireUser } from "@/lib/auth";
import { allocationCost, expToNext, GROWTH, STATS, statsAt } from "@/lib/game/growth";
import { SLOT_LABEL, STAT_LABELS } from "@/lib/game/names";
import { toRankTable } from "@/lib/game/ranks";
import { MonsterActions } from "./MonsterActions";

async function MonsterDetailPageContent({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase, user } = await requireUser();
  const [{ data: m }, { data: ranks }] = await Promise.all([
    supabase
      .from("Player_Monsters")
      .select("*, species:Monster_Species(*)")
      .eq("id", id)
      .eq("owner_id", user.id)
      .maybeSingle(),
    supabase.from("Ranks").select("code, exp_rate, recruit_rate"),
  ]);
  if (!m || !m.species) notFound();

  const species = m.species;
  const stats = statsAt(species, m);
  const rankTable = toRankTable((ranks ?? []) as Parameters<typeof toRankTable>[0]);
  const atCap = m.level >= m.level_cap;
  const need = !atCap && species.rank ? expToNext(m.level, species.rank, rankTable) : null;

  const allocations = STATS.map((stat) => ({
    stat,
    label: STAT_LABELS[stat],
    value: stats[stat],
    times: m[`alloc_${stat}`],
    cost: allocationCost(m[`alloc_${stat}`]),
    gain: GROWTH.allocationGain[stat],
  }));

  return (
    <div className="space-y-6">
      <Link href="/monsters" className="inline-block text-sm underline opacity-70">
        ← モンスター一覧
      </Link>

      <section className="flex items-center gap-4">
        <MonsterImage imagePath={species.image_path} name={species.name} size={96} />
        <div>
          <h1 className="text-2xl font-bold">{m.nickname ?? species.name}</h1>
          <p className="text-sm opacity-70">
            {species.name}
            {species.rank && ` / ランク ${species.rank}`} / {SLOT_LABEL(m.party_slot, m.in_storage)}
          </p>
          <p className="mt-1 font-semibold">
            Lv {m.level} <span className="text-sm font-normal opacity-70">/ 上限 {m.level_cap}</span>
          </p>
          <p className="text-sm opacity-70">
            {atCap ? "レベル上限に達しています" : need !== null ? `次のレベルまで ${(need - m.exp).toLocaleString()} EXP` : ""}
          </p>
        </div>
      </section>

      {species.description && <p className="text-sm">{species.description}</p>}

      <MonsterActions
        monsterId={m.id}
        limitPoints={m.limit_points}
        allocations={allocations}
      />
    </div>
  );
}

export default async function MonsterDetailPage(props: { params: Promise<{ id: string }> }) {
  return <GameScreen screen="monster_detail" main={<MonsterDetailPageContent {...props} />} />;
}
