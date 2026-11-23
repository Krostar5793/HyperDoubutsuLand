import { GameScreen } from "@/components/stage/GameScreen";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import type { BattleState } from "@/lib/game/battle";
import type { StepEvent } from "@/lib/game/explore";
import { loadGuides, starterOptionsForView } from "@/lib/game/tutorial-data";
import { ExpeditionRunner } from "./ExpeditionRunner";

async function ExpeditionPageContent({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase, user } = await requireUser();

  const { data: exp } = await supabase
    .from("Expeditions")
    .select("id, status, position, log, battle_id, area:Areas(id, name, clear_amount, is_tutorial)")
    .eq("id", id)
    .eq("owner_id", user.id)
    .maybeSingle();
  if (!exp || !exp.area) notFound();

  // 画面に表示する名前（種族・アイテム・通貨）
  const [{ count: totalSquares }, { data: species }, { data: items }, { data: currencies }, { data: battle }, { data: owned }] =
    await Promise.all([
      supabase.from("Area_Squares").select("position", { count: "exact", head: true }).eq("area_id", exp.area.id),
      supabase.from("Monster_Species").select("id, name"),
      supabase.from("Items").select("id, name"),
      supabase.from("Currencies").select("code, short_name"),
      exp.battle_id
        ? supabase.from("Battles").select("id, state").eq("id", exp.battle_id).maybeSingle()
        : Promise.resolve({ data: null }),
      // 戦闘で使えるアイテム（仲間になりやすくするもの）
      supabase
        .from("Player_Items")
        .select("quantity, item:Items!inner(id, name, usable_in_battle, effect_type)")
        .eq("owner_id", user.id)
        .gt("quantity", 0)
        .eq("item.usable_in_battle", true)
        .eq("item.effect_type", "recruit_boost"),
    ]);

  const isTutorial = exp.area.is_tutorial;
  const [guides, starterOptions] = isTutorial
    ? await Promise.all([loadGuides(supabase), starterOptionsForView(supabase)])
    : [{}, []];

  return (
    <ExpeditionRunner
      tutorial={isTutorial ? { guides, starterOptions } : null}
      expeditionId={exp.id}
      areaName={exp.area.name}
      clearAmount={exp.area.clear_amount}
      totalSquares={totalSquares ?? 0}
      initialBattle={battle ? { id: battle.id, state: battle.state as unknown as BattleState } : null}
      battleItems={(owned ?? []).map((o) => ({ id: o.item.id, name: o.item.name, quantity: o.quantity }))}
      initial={{
        status: exp.status as "exploring" | "cleared" | "failed" | "retreated",
        position: exp.position,
        log: exp.log as unknown as (StepEvent | { type: "retreat"; position: number })[],
      }}
      names={{
        species: Object.fromEntries((species ?? []).map((s) => [s.id, s.name])),
        items: Object.fromEntries((items ?? []).map((i) => [i.id, i.name])),
        currencies: Object.fromEntries((currencies ?? []).map((c) => [c.code, c.short_name])),
      }}
    />
  );
}

export default async function ExpeditionPage(props: { params: Promise<{ id: string }> }) {
  return <GameScreen screen="explore_run" main={<ExpeditionPageContent {...props} />} />;
}
