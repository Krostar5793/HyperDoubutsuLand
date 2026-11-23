import { GameScreen } from "@/components/stage/GameScreen";
import { requireUser } from "@/lib/auth";
import { MonsterBoard, type BoardMonster } from "./MonsterBoard";

async function MonstersPageContent() {
  const { supabase, user } = await requireUser();
  const [{ data: monsters, error }, { data: profile }] = await Promise.all([
    supabase
      .from("Player_Monsters")
      .select("id, nickname, level, party_slot, in_storage, species:Monster_Species(name, rank, image_path)")
      .eq("owner_id", user.id)
      .order("obtained_at"),
    supabase.from("profiles").select("box_capacity").eq("id", user.id).maybeSingle(),
  ]);
  if (error) throw new Error(error.message);

  const list: BoardMonster[] = (monsters ?? []).map((m) => ({
    id: m.id,
    name: m.nickname ?? m.species?.name ?? "？",
    speciesName: m.species?.name ?? "？",
    rank: m.species?.rank ?? null,
    imagePath: m.species?.image_path ?? null,
    level: m.level,
    slot: m.party_slot,
    inStorage: m.in_storage,
  }));

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">モンスター</h1>
      <MonsterBoard monsters={list} boxCapacity={profile?.box_capacity ?? 0} />
    </div>
  );
}

export default async function MonstersPage() {
  return <GameScreen screen="monsters" main={<MonstersPageContent />} />;
}
