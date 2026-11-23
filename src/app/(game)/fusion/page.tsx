import { GameScreen } from "@/components/stage/GameScreen";
import { requireUser } from "@/lib/auth";
import { FUSION } from "@/lib/game/fusion";
import { FusionLab, type LabMonster } from "./FusionLab";

async function FusionContent() {
  const { supabase, user } = await requireUser();
  const [{ data: monsters }, { data: elements }] = await Promise.all([
    supabase
      .from("Player_Monsters")
      .select("id, nickname, level, party_slot, in_storage, species:Monster_Species(id, name, rank, image_path, element_id)")
      .eq("owner_id", user.id)
      .order("level", { ascending: false }),
    supabase.from("Elements").select("id, name"),
  ]);
  const elementName = new Map((elements ?? []).map((e) => [e.id, e.name]));
  const list: LabMonster[] = (monsters ?? []).map((m) => ({
    id: m.id,
    name: m.nickname ?? m.species?.name ?? "？",
    speciesName: m.species?.name ?? "？",
    rank: m.species?.rank ?? null,
    element: m.species?.element_id ? (elementName.get(m.species.element_id) ?? null) : null,
    imagePath: m.species?.image_path ?? null,
    level: m.level,
    place: m.in_storage ? "預り所" : m.party_slot === null ? "控え" : m.party_slot <= 4 ? "バトル" : "スタンバイ",
  }));

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">合成</h1>
      <p className="text-sm opacity-80">
        Lv{FUSION.minParentLevel} 以上のモンスター 2 体を合成して、新しいモンスターを生み出します。合成した 2 体はいなくなり、子は Lv1 から育て直しです。
      </p>
      <FusionLab monsters={list} elementNames={Object.fromEntries(elementName)} />
    </div>
  );
}

export default async function FusionPage() {
  return <GameScreen screen="fusion" main={<FusionContent />} />;
}
