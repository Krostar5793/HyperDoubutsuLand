import type { SupabaseClient } from "@supabase/supabase-js";
import type { Guide } from "@/components/GuideModal";
import type { StarterOption } from "@/components/StarterPicker";
import type { Database } from "@/lib/supabase/database.types";
import { rows } from "./db";
import { loadStarterOptions } from "./tutorial";

/** 画面に渡す形の「最初のモンスターの候補」 */
export async function starterOptionsForView(supabase: SupabaseClient<Database>): Promise<StarterOption[]> {
  return (await loadStarterOptions(supabase))
    .filter((o) => o.species)
    .map((o) => ({
      speciesId: o.species_id,
      name: o.species!.name,
      rank: o.species!.rank,
      element: o.species!.element?.name ?? null,
      imagePath: o.species!.image_path,
      message: o.message ?? o.species!.description,
      level: o.level,
    }));
}

export async function loadGuides(supabase: SupabaseClient<Database>): Promise<Record<string, Guide>> {
  const list = rows(await supabase.from("Guide_Pages").select("key, title, body").order("sort_order"));
  return Object.fromEntries(list.map((g) => [g.key, g]));
}
