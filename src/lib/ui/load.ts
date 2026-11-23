import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import { defaultLayout, SCREENS, type ElementProps, type ScreenKey, type ScreenLayout, type UiElement } from "./types";

/** 画面の配置を読み込む。保存されていなければ初期配置 */
export async function loadScreenLayout(
  supabase: SupabaseClient<Database>,
  key: ScreenKey,
): Promise<ScreenLayout> {
  const { data: screen } = await supabase
    .from("UI_Screens")
    .select("key, background_color, background_image_path, elements:UI_Elements(*)")
    .eq("key", key)
    .maybeSingle();
  if (!screen) return defaultLayout(key);

  const elements: UiElement[] = (screen.elements ?? []).map((e) => ({
    id: e.id,
    type: e.type as UiElement["type"],
    x: Number(e.x),
    y: Number(e.y),
    width: Number(e.width),
    height: Number(e.height),
    z_index: e.z_index,
    props: (e.props ?? {}) as ElementProps,
  }));
  return {
    key,
    backgroundColor: screen.background_color,
    backgroundImagePath: screen.background_image_path,
    elements,
    isDefault: false,
  };
}

export async function loadAllLayouts(supabase: SupabaseClient<Database>) {
  const keys = Object.keys(SCREENS) as ScreenKey[];
  return Promise.all(keys.map((k) => loadScreenLayout(supabase, k)));
}
