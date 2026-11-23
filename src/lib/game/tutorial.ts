import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import { check, one, rows } from "./db";

/**
 * チュートリアルと最初のモンスター（サーバー専用）。
 * supabase は管理者クライアント。userId がログイン中のユーザー本人であることを呼び出し側で確認する。
 */

type Admin = SupabaseClient<Database>;
export type TutorialState = "pending" | "in_progress" | "completed" | "skipped";

export async function getTutorialStatus(supabase: Admin, userId: string) {
  const p = one(
    await supabase.from("profiles").select("tutorial_state, starter_chosen").eq("id", userId).single(),
  );
  return { state: p.tutorial_state as TutorialState, starterChosen: p.starter_chosen };
}

async function setState(supabase: Admin, userId: string, state: TutorialState) {
  check(await supabase.from("profiles").update({ tutorial_state: state }).eq("id", userId));
}

/** チュートリアルのエリアを探す（なければ null） */
export async function findTutorialArea(supabase: Admin) {
  return check(await supabase.from("Areas").select("id").eq("is_tutorial", true).maybeSingle());
}

/**
 * チュートリアルを始める。チュートリアルのエリアがなければ、スキップと同じ扱い（モンスター選びだけ）
 * 戻り値: 始まった探索の ID（なければ null）
 */
export async function startTutorial(supabase: Admin, userId: string): Promise<string | null> {
  const status = await getTutorialStatus(supabase, userId);
  if (status.state !== "pending") throw new Error("チュートリアルはすでに遊んでいます");

  const area = await findTutorialArea(supabase);
  if (!area) {
    await setState(supabase, userId, "skipped");
    return null;
  }
  const exp = one(
    await supabase.from("Expeditions").insert({ owner_id: userId, area_id: area.id }).select("id").single(),
  );
  await setState(supabase, userId, "in_progress");
  return exp.id;
}

export async function skipTutorial(supabase: Admin, userId: string) {
  const status = await getTutorialStatus(supabase, userId);
  if (status.state !== "pending") throw new Error("チュートリアルはすでに遊んでいます");
  await setState(supabase, userId, "skipped");
}

/** チュートリアル中の探索の ID（なければ null） */
export async function activeTutorialExpedition(supabase: Admin, userId: string) {
  const area = await findTutorialArea(supabase);
  if (!area) return null;
  const exp = check(
    await supabase
      .from("Expeditions")
      .select("id")
      .eq("owner_id", userId)
      .eq("area_id", area.id)
      .eq("status", "exploring")
      .maybeSingle(),
  );
  return exp?.id ?? null;
}

export async function loadStarterOptions(supabase: SupabaseClient<Database>) {
  return rows(
    await supabase
      .from("Starter_Options")
      .select("species_id, level, message, sort_order, species:Monster_Species(id, name, rank, description, image_path, element:Elements!Monster_Species_element_id_fkey(name))")
      .order("sort_order"),
  );
}

/** 最初のモンスターを受け取る（1 回だけ）。バトルメンバーの 1 番目に入れる */
export async function chooseStarter(supabase: Admin, userId: string, speciesId: number) {
  const status = await getTutorialStatus(supabase, userId);
  if (status.starterChosen) throw new Error("最初のモンスターはすでに選んでいます");
  if (status.state === "pending") throw new Error("先にチュートリアルを遊ぶかどうか選んでください");

  const option = check(
    await supabase.from("Starter_Options").select("species_id, level").eq("species_id", speciesId).maybeSingle(),
  );
  if (!option) throw new Error("そのモンスターは選べません");

  // 先に「選んだ」ことを記録する（二重に受け取れないように）
  const { data: claimed, error } = await supabase
    .from("profiles")
    .update({ starter_chosen: true })
    .eq("id", userId)
    .eq("starter_chosen", false)
    .select("id");
  if (error) throw new Error(error.message);
  if (!claimed?.length) throw new Error("最初のモンスターはすでに選んでいます");

  const res = await supabase.rpc("grant_monster", {
    p_owner_id: userId,
    p_species_id: option.species_id,
    p_level: option.level,
    p_source: "starter",
  });
  if (res.error) {
    // 受け取りに失敗したら、選び直せるように戻す
    await supabase.from("profiles").update({ starter_chosen: false }).eq("id", userId);
    throw new Error(res.error.message);
  }
  const granted = res.data;
  const monsterId = granted?.[0]?.monster_id;
  if (monsterId) {
    // バトルメンバーの空いている枠（なければ控えのまま）
    const party = rows(
      await supabase.from("Player_Monsters").select("party_slot").eq("owner_id", userId).not("party_slot", "is", null),
    );
    const used = new Set(party.map((m) => m.party_slot));
    const free = [1, 2, 3, 4].find((s) => !used.has(s));
    if (free) check(await supabase.from("Player_Monsters").update({ party_slot: free }).eq("id", monsterId));
  }
  return monsterId;
}

/** チュートリアルの探索が終わったら、チュートリアルを完了にする */
export async function completeTutorialIfEnded(supabase: Admin, userId: string, expeditionId: string) {
  const exp = check(
    await supabase.from("Expeditions").select("status, area:Areas(is_tutorial)").eq("id", expeditionId).maybeSingle(),
  );
  if (!exp?.area?.is_tutorial || exp.status === "exploring") return;
  const status = await getTutorialStatus(supabase, userId);
  if (status.state === "in_progress") await setState(supabase, userId, "completed");
}
