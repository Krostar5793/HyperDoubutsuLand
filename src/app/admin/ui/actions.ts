"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { SCREENS, type ScreenKey, type ScreenLayout } from "@/lib/ui/types";

function assertScreen(key: string): asserts key is ScreenKey {
  if (!(key in SCREENS)) throw new Error(`不明な画面です: ${key}`);
}

export async function saveLayoutAction(layout: ScreenLayout): Promise<{ error?: string }> {
  assertScreen(layout.key);
  const { supabase } = await requireUser();
  const { error } = await supabase.rpc("save_ui_layout", {
    p_screen_key: layout.key,
    p_background_color: layout.backgroundColor as string,
    p_background_image_path: layout.backgroundImagePath as string,
    p_elements: layout.elements.map((e) => ({
      type: e.type,
      x: Math.round(e.x),
      y: Math.round(e.y),
      width: Math.round(e.width),
      height: Math.round(e.height),
      z_index: e.z_index,
      props: e.props,
    })),
  });
  revalidatePath("/", "layout");
  return error ? { error: error.message } : {};
}

export async function resetLayoutAction(key: string): Promise<{ error?: string }> {
  assertScreen(key);
  const { supabase } = await requireUser();
  const { error } = await supabase.rpc("reset_ui_layout", { p_screen_key: key });
  revalidatePath("/", "layout");
  return error ? { error: error.message } : {};
}
