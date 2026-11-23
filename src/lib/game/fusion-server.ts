import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import { check, rows } from "./db";
import {
  checkParents,
  checkSkillChoice,
  fusionBonuses,
  fusionCandidates,
  type FusionParent,
  type FusionSpecies,
} from "./fusion";

/**
 * 合成のサーバー側の処理。supabase は管理者クライアント。
 * userId がログイン中のユーザー本人であることを呼び出し側で確認する。
 */

type Admin = SupabaseClient<Database>;

const SPECIES_COLUMNS = "id, name, rank, element_id, fusion_selectable, hp, mp, atk, def, int, spd, size";

async function loadParents(supabase: Admin, userId: string, ids: [string, string]) {
  const monsters = rows(
    await supabase
      .from("Player_Monsters")
      .select(`*, species:Monster_Species(${SPECIES_COLUMNS})`)
      .eq("owner_id", userId)
      .in("id", ids),
  );
  const skillRows = rows(
    await supabase.from("Monster_Skills").select("monster_id, slot, skill_id").in("monster_id", ids).order("slot"),
  );
  const speciesSkills = rows(
    await supabase
      .from("Species_Skills")
      .select("species_id, slot, skill_id")
      .in("species_id", monsters.map((m) => m.species_id))
      .order("slot"),
  );
  const toParent = (id: string): FusionParent => {
    const m = monsters.find((x) => x.id === id);
    if (!m || !m.species) throw new Error("モンスターが見つかりません");
    const own = skillRows.filter((r) => r.monster_id === id).map((r) => r.skill_id);
    return {
      ...m,
      species: m.species as FusionSpecies,
      skillIds: own.length ? own : speciesSkills.filter((r) => r.species_id === m.species_id).map((r) => r.skill_id),
    };
  };
  return [toParent(ids[0]), toParent(ids[1])];
}

async function loadRules(supabase: Admin) {
  const [species, recipes, ranks, sizes] = await Promise.all([
    supabase.from("Monster_Species").select(SPECIES_COLUMNS),
    supabase.from("Fusion_Recipes").select("parent_a_species_id, parent_b_species_id, child_species_id"),
    supabase.from("Ranks").select("code, fusion_rankup_level_sum, fusion_item_id, fusion_item_quantity, item:Items(name)"),
    supabase.from("Size_Rules").select("size, skill_slots"),
  ]);
  return { species: rows(species), recipes: rows(recipes), ranks: rows(ranks), sizes: rows(sizes) };
}

const slotsFor = (size: number | null, sizes: { size: number; skill_slots: number }[]) =>
  sizes.find((s) => s.size === size)?.skill_slots ?? 5;

export type FusionPreview = {
  error: string | null;
  candidates: {
    speciesId: number;
    name: string;
    rank: string | null;
    elementId: number | null;
    kind: "normal" | "rankup" | "recipe";
    skillSlots: number;
    cost: { itemId: number; itemName: string; quantity: number; owned: number } | null;
  }[];
  /** 両親の特技（子に引き継げる候補） */
  skills: { id: number; name: string; slotCost: number }[];
  bonus: { bestStat: string; growthRate: number; statBonus: Record<string, number> };
};

/** 合成の候補・特技・ボーナスを調べる */
export async function previewFusion(supabase: Admin, userId: string, a: string, b: string): Promise<FusionPreview> {
  const [pa, pb] = await loadParents(supabase, userId, [a, b]);
  const rules = await loadRules(supabase);
  const err = checkParents(pa, pb);
  const bonus = fusionBonuses(pa, pb);

  const skillIds = [...new Set([...pa.skillIds, ...pb.skillIds])];
  const skills = skillIds.length
    ? rows(await supabase.from("Skills").select("id, name, slot_cost").in("id", skillIds))
    : [];

  const owned = rows(await supabase.from("Player_Items").select("item_id, quantity").eq("owner_id", userId));
  const candidates = err
    ? []
    : fusionCandidates(pa, pb, rules.species, rules.recipes, rules.ranks).map((c) => {
        const s = rules.species.find((x) => x.id === c.speciesId)!;
        const rank = rules.ranks.find((r) => r.code === s.rank);
        return {
          speciesId: s.id,
          name: s.name,
          rank: s.rank,
          elementId: s.element_id,
          kind: c.kind,
          skillSlots: slotsFor(s.size, rules.sizes),
          cost: rank?.fusion_item_id
            ? {
                itemId: rank.fusion_item_id,
                itemName: rank.item?.name ?? "アイテム",
                quantity: rank.fusion_item_quantity,
                owned: owned.find((o) => o.item_id === rank.fusion_item_id)?.quantity ?? 0,
              }
            : null,
        };
      });

  return {
    error: err ?? (candidates.length === 0 ? "この 2 体の組み合わせで生まれるモンスターがいません" : null),
    candidates,
    skills: skillIds
      .map((id) => skills.find((s) => s.id === id))
      .filter((s): s is NonNullable<typeof s> => !!s)
      .map((s) => ({ id: s.id, name: s.name ?? "特技", slotCost: s.slot_cost })),
    bonus: { bestStat: bonus.bestStat, growthRate: bonus.growth_bonus[bonus.bestStat] ?? 0, statBonus: bonus.stat_bonus as Record<string, number> },
  };
}

/** 合成する。候補・特技・アイテムを検証してから DB 関数を呼ぶ */
export async function performFusion(
  supabase: Admin,
  userId: string,
  a: string,
  b: string,
  childSpeciesId: number,
  skillIds: number[],
): Promise<{ monsterId: string; inStorage: boolean }> {
  const preview = await previewFusion(supabase, userId, a, b);
  if (preview.error) throw new Error(preview.error);
  const child = preview.candidates.find((c) => c.speciesId === childSpeciesId);
  if (!child) throw new Error("そのモンスターは、この 2 体からは生まれません");

  const [pa, pb] = await loadParents(supabase, userId, [a, b]);
  const cost = (id: number) => preview.skills.find((s) => s.id === id)?.slotCost ?? 1;
  const skillErr = checkSkillChoice(skillIds, pa, pb, cost, child.skillSlots);
  if (skillErr) throw new Error(skillErr);
  if (child.cost && child.cost.owned < child.cost.quantity) {
    throw new Error(`${child.cost.itemName} が足りません（必要 ${child.cost.quantity}、所持 ${child.cost.owned}）`);
  }

  const bonus = fusionBonuses(pa, pb);
  const result = check(
    await supabase.rpc("fuse_monsters", {
      p_owner_id: userId,
      p_parent_a: a,
      p_parent_b: b,
      p_child_species_id: childSpeciesId,
      p_skill_ids: skillIds,
      p_growth_bonus: bonus.growth_bonus as never,
      p_stat_bonus: bonus.stat_bonus as never,
      p_item_id: child.cost?.itemId as number,
      p_item_quantity: child.cost?.quantity ?? 1,
    }),
  );
  const row = result?.[0];
  if (!row) throw new Error("合成に失敗しました");
  return { monsterId: row.monster_id, inStorage: row.in_storage };
}
