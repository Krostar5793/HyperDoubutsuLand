"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import {
  advanceExpedition,
  retreatExpedition,
  startExpedition,
  type AdvanceResult,
} from "@/lib/game/expedition";
import { createAdminClient } from "@/lib/supabase/admin";

export async function startExpeditionAction(areaId: number) {
  const { supabase, user } = await requireUser();

  // バトルメンバー（枠 1〜4）が 1 体もいなければ出発できない
  const { count } = await supabase
    .from("Player_Monsters")
    .select("id", { count: "exact", head: true })
    .eq("owner_id", user.id)
    .gte("party_slot", 1)
    .lte("party_slot", 4);
  if (!count) {
    return { error: "バトルメンバーが 1 体もいません。モンスター画面で編成してください" };
  }

  const { expeditionId } = await startExpedition(createAdminClient(), user.id, areaId);
  redirect(`/explore/${expeditionId}`);
}

export async function advanceAction(
  expeditionId: string,
): Promise<{ result?: AdvanceResult; error?: string }> {
  const { user } = await requireUser();
  try {
    const result = await advanceExpedition(createAdminClient(), user.id, expeditionId);
    if (result.finish) revalidatePath("/", "layout");
    return { result };
  } catch (e) {
    return { error: e instanceof Error ? e.message : String(e) };
  }
}

export async function retreatAction(expeditionId: string): Promise<{ error?: string }> {
  const { user } = await requireUser();
  try {
    await retreatExpedition(createAdminClient(), user.id, expeditionId);
    revalidatePath("/", "layout");
    return {};
  } catch (e) {
    return { error: e instanceof Error ? e.message : String(e) };
  }
}
