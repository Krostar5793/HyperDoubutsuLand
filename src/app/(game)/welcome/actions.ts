"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { chooseStarter, skipTutorial, startTutorial } from "@/lib/game/tutorial";
import { createAdminClient } from "@/lib/supabase/admin";

export async function startTutorialAction() {
  const { user } = await requireUser();
  const expeditionId = await startTutorial(createAdminClient(), user.id);
  redirect(expeditionId ? `/explore/${expeditionId}` : "/welcome/starter");
}

export async function skipTutorialAction() {
  const { user } = await requireUser();
  await skipTutorial(createAdminClient(), user.id);
  redirect("/welcome/starter");
}

/** 最初のモンスターを選ぶ。redirectTo を指定しなければ、画面は移動しない（チュートリアル中） */
export async function chooseStarterAction(speciesId: number, redirectTo?: string): Promise<{ error?: string }> {
  const { user } = await requireUser();
  try {
    await chooseStarter(createAdminClient(), user.id, speciesId);
  } catch (e) {
    return { error: e instanceof Error ? e.message : String(e) };
  }
  revalidatePath("/", "layout");
  if (redirectTo) redirect(redirectTo);
  return {};
}
