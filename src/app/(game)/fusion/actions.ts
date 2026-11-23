"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { performFusion, previewFusion, type FusionPreview } from "@/lib/game/fusion-server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function previewFusionAction(a: string, b: string): Promise<{ preview?: FusionPreview; error?: string }> {
  const { user } = await requireUser();
  try {
    return { preview: await previewFusion(createAdminClient(), user.id, a, b) };
  } catch (e) {
    return { error: e instanceof Error ? e.message : String(e) };
  }
}

export async function fuseAction(
  a: string,
  b: string,
  childSpeciesId: number,
  skillIds: number[],
): Promise<{ monsterId?: string; inStorage?: boolean; error?: string }> {
  const { user } = await requireUser();
  try {
    const r = await performFusion(createAdminClient(), user.id, a, b, childSpeciesId, skillIds);
    revalidatePath("/", "layout");
    return r;
  } catch (e) {
    return { error: e instanceof Error ? e.message : String(e) };
  }
}
