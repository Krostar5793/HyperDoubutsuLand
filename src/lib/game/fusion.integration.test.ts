/**
 * 合成の結合テスト（ローカルの Supabase が必要。実行方法は expedition.integration.test.ts と同じ）
 */
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { beforeAll, describe, expect, it } from "vitest";
import type { Database } from "@/lib/supabase/database.types";
import { performFusion, previewFusion } from "./fusion-server";
import { statsAt } from "./growth";

const url = process.env.TEST_SUPABASE_URL;
const key = process.env.TEST_SUPABASE_SERVICE_ROLE_KEY;
const run = url && key && /127\.0\.0\.1|localhost/.test(url) ? describe : describe.skip;

run("合成（結合テスト）", () => {
  let db: SupabaseClient<Database>;
  let userId = "";
  const sp: Record<string, number> = {};
  const skill: Record<string, number> = {};

  const ok = <T,>(res: { data: T; error: { message: string } | null }) => {
    if (res.error) throw new Error(res.error.message);
    return res.data;
  };
  const grant = async (species: number, level: number, extra: Record<string, unknown> = {}) => {
    const id = ok(await db.rpc("grant_monster", { p_owner_id: userId, p_species_id: species, p_level: level, p_source: "test" }))![0].monster_id;
    if (Object.keys(extra).length) ok(await db.from("Player_Monsters").update(extra).eq("id", id));
    return id;
  };

  beforeAll(async () => {
    db = createClient<Database>(url!, key!, { auth: { persistSession: false } });
    userId = ok(await db.auth.admin.createUser({ email: `fusion-${Date.now()}@example.com`, password: "password123", email_confirm: true })).user!.id;
    const el = ok(await db.from("Elements").insert({ name: `テスト属性${Date.now()}` }).select("id").single())!.id;
    const species = ok(
      await db
        .from("Monster_Species")
        .insert([
          { name: "合成E1", rank: "E", element_id: el, size: 1, hp: 10, mp: 10, atk: 5, def: 5, int: 5, spd: 20 },
          { name: "合成E2", rank: "E", element_id: el, size: 1, hp: 10, mp: 10, atk: 5, def: 5, int: 5, spd: 5 },
          { name: "合成D", rank: "D", element_id: el, size: 1, hp: 10, mp: 10, atk: 5, def: 5, int: 5, spd: 5 },
          { name: "合成ひみつ", rank: "SS", element_id: el, size: 1, fusion_selectable: false, hp: 10, mp: 10, atk: 5, def: 5, int: 5, spd: 5 },
        ], { defaultToNull: false })
        .select("id, name"),
    )!;
    for (const s of species) sp[s.name] = s.id;
    const skills = ok(
      await db.from("Skills").insert([
        { name: "合成技A", slot_cost: 1 },
        { name: "合成技B", slot_cost: 1 },
        { name: "合成大技", slot_cost: 4 },
      ]).select("id, name"),
    )!;
    for (const s of skills) skill[s.name] = s.id;
    ok(await db.from("Species_Skills").insert([
      { species_id: sp["合成E1"], slot: 1, skill_id: skill["合成技A"] },
      { species_id: sp["合成E1"], slot: 2, skill_id: skill["合成大技"] },
      { species_id: sp["合成E2"], slot: 1, skill_id: skill["合成技B"] },
    ]));
    ok(await db.from("Fusion_Recipes").insert({ parent_a_species_id: sp["合成E2"], parent_b_species_id: sp["合成E1"], child_species_id: sp["合成ひみつ"] }));
  });

  it("候補: 同ランク・合計 Lv50 以上でランクアップ、特別な組み合わせも出る。Lv10 未満は合成できない", async () => {
    const a = await grant(sp["合成E1"], 25);
    const b = await grant(sp["合成E2"], 25);
    const low = await grant(sp["合成E2"], 9);
    const p = await previewFusion(db, userId, a, b);
    expect(p.error).toBeNull();
    const kinds = Object.fromEntries(p.candidates.map((c) => [c.name, c.kind]));
    expect(kinds).toMatchObject({ 合成E1: "normal", 合成E2: "normal", 合成D: "rankup", 合成ひみつ: "recipe" });
    expect((await previewFusion(db, userId, a, low)).error).toContain("Lv10");
  });

  it("合成すると親はいなくなり、Lv1 の子にボーナスと選んだ特技が付く", async () => {
    const a = await grant(sp["合成E1"], 30, { alloc_atk: 10 });
    const b = await grant(sp["合成E2"], 30, { alloc_atk: 10, alloc_hp: 2 });
    // 使用枠が足りない（5 枠に 1 + 4 + 1 = 6）
    await expect(performFusion(db, userId, a, b, sp["合成D"], [skill["合成技A"], skill["合成大技"], skill["合成技B"]])).rejects.toThrow("枠");
    // 親が持っていない特技
    const r = await performFusion(db, userId, a, b, sp["合成D"], [skill["合成大技"], skill["合成技B"]]);
    const child = ok(await db.from("Player_Monsters").select("*").eq("id", r.monsterId).single())!;
    expect(child).toMatchObject({ level: 1, source: "fusion", growth_bonus: { spd: 0.2 }, stat_bonus: { atk: 6, hp: 6 } });
    expect(ok(await db.from("Player_Monsters").select("id").in("id", [a, b]))).toEqual([]);
    const skills = ok(await db.from("Monster_Skills").select("slot, skill_id").eq("monster_id", r.monsterId).order("slot"))!;
    expect(skills.map((s) => s.skill_id)).toEqual([skill["合成大技"], skill["合成技B"]]);
    // ボーナスはステータスに反映される
    const species = ok(await db.from("Monster_Species").select("*").eq("id", sp["合成D"]).single())!;
    expect(statsAt(species, child).atk).toBe(5 + 6);
  });

  it("ランクごとの必要アイテムが足りなければ合成できない", async () => {
    const item = ok(await db.from("Items").insert({ name: "Dの結晶" }).select("id").single())!.id;
    ok(await db.from("Ranks").update({ fusion_item_id: item, fusion_item_quantity: 2 }).eq("code", "D"));
    const a = await grant(sp["合成E1"], 25);
    const b = await grant(sp["合成E2"], 25);
    await expect(performFusion(db, userId, a, b, sp["合成D"], [])).rejects.toThrow("足りません");
    ok(await db.rpc("grant_item", { p_owner_id: userId, p_item_id: item, p_quantity: 2 }));
    await performFusion(db, userId, a, b, sp["合成D"], []);
    expect(ok(await db.from("Player_Items").select("quantity").eq("owner_id", userId).eq("item_id", item).single())!.quantity).toBe(0);
    ok(await db.from("Ranks").update({ fusion_item_id: null, fusion_item_quantity: 1 }).eq("code", "D"));
  });

  it("探索中は合成できない", async () => {
    const a = await grant(sp["合成E1"], 25);
    const b = await grant(sp["合成E2"], 25);
    const area = ok(await db.from("Areas").insert({ name: "合成テストの森" }).select("id").single())!.id;
    const exp = ok(await db.from("Expeditions").insert({ owner_id: userId, area_id: area }).select("id").single())!.id;
    await expect(performFusion(db, userId, a, b, sp["合成E1"], [])).rejects.toThrow("探索中");
    ok(await db.from("Expeditions").update({ status: "retreated" }).eq("id", exp));
  });
});
