"use server";

/**
 * 開発用の操作（テストプレイ用）。本番（NODE_ENV=production）では動かない。
 */
import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";

function assertDev() {
  if (process.env.NODE_ENV === "production") {
    throw new Error("開発用の機能は本番では使えません");
  }
}

/** 図鑑からランダムに 1 体受け取る。バトルメンバーに空きがあればそこへ入れる */
export async function devGrantMonster() {
  assertDev();
  const { user } = await requireUser();
  const admin = createAdminClient();

  const { data: species } = await admin.from("Monster_Species").select("id");
  if (!species?.length) throw new Error("図鑑（Monster_Species）にモンスターがいません");
  const pick = species[Math.floor(Math.random() * species.length)];

  const { data, error } = await admin.rpc("grant_monster", {
    p_owner_id: user.id,
    p_species_id: pick.id,
    p_level: 1,
    p_source: "dev",
  });
  if (error) throw new Error(error.message);

  const granted = data?.[0];
  if (granted && !granted.in_storage) {
    const { data: party } = await admin
      .from("Player_Monsters")
      .select("party_slot")
      .eq("owner_id", user.id)
      .not("party_slot", "is", null);
    const used = new Set((party ?? []).map((m) => m.party_slot));
    const free = [1, 2, 3, 4].find((s) => !used.has(s));
    if (free) {
      await admin.from("Player_Monsters").update({ party_slot: free }).eq("id", granted.monster_id);
    }
  }
  revalidatePath("/", "layout");
}

export async function devGrantPerica() {
  assertDev();
  const { user } = await requireUser();
  const { error } = await createAdminClient().rpc("grant_currency", {
    p_owner_id: user.id,
    p_currency_code: "perica",
    p_amount: 1000,
  });
  if (error) throw new Error(error.message);
  revalidatePath("/", "layout");
}

export async function devGrantItems() {
  assertDev();
  const { user } = await requireUser();
  const admin = createAdminClient();
  const { data: items } = await admin.from("Items").select("id");
  for (const item of items ?? []) {
    const { error } = await admin.rpc("grant_item", { p_owner_id: user.id, p_item_id: item.id, p_quantity: 5 });
    if (error) throw new Error(error.message);
  }
  revalidatePath("/", "layout");
}
