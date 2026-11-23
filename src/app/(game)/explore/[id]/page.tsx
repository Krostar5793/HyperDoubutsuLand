import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import type { StepEvent } from "@/lib/game/explore";
import { ExpeditionRunner } from "./ExpeditionRunner";

export default async function ExpeditionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase, user } = await requireUser();

  const { data: exp } = await supabase
    .from("Expeditions")
    .select("id, status, position, log, area:Areas(id, name, clear_amount)")
    .eq("id", id)
    .eq("owner_id", user.id)
    .maybeSingle();
  if (!exp || !exp.area) notFound();

  // 画面に表示する名前（種族・アイテム・通貨）
  const [{ count: totalSquares }, { data: species }, { data: items }, { data: currencies }] = await Promise.all([
    supabase.from("Area_Squares").select("position", { count: "exact", head: true }).eq("area_id", exp.area.id),
    supabase.from("Monster_Species").select("id, name"),
    supabase.from("Items").select("id, name"),
    supabase.from("Currencies").select("code, short_name"),
  ]);

  return (
    <ExpeditionRunner
      expeditionId={exp.id}
      areaName={exp.area.name}
      clearAmount={exp.area.clear_amount}
      totalSquares={totalSquares ?? 0}
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
