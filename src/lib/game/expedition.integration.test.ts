/**
 * 探索の結合テスト（ローカルの Supabase が必要）
 *   npx supabase start のあと、次の環境変数を付けて実行する:
 *   TEST_SUPABASE_URL=http://127.0.0.1:54321 TEST_SUPABASE_SERVICE_ROLE_KEY=... npx vitest run expedition.integration
 * 環境変数がなければスキップする。DB の中身を書き換えるので、本番のプロジェクトには絶対に向けないこと
 */
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { beforeAll, describe, expect, it } from "vitest";
import { advanceExpedition, retreatExpedition, startExpedition } from "./expedition";

const url = process.env.TEST_SUPABASE_URL;
const key = process.env.TEST_SUPABASE_SERVICE_ROLE_KEY;
const run = url && key && /127\.0\.0\.1|localhost/.test(url) ? describe : describe.skip;

run("探索（結合テスト）", () => {
  let db: SupabaseClient;
  let userId = "";
  let areaId = 0;

  beforeAll(async () => {
    db = createClient(url!, key!, { auth: { persistSession: false } });
    const email = `explorer-${Date.now()}@example.com`;
    const { data, error } = await db.auth.admin.createUser({ email, password: "password123", email_confirm: true });
    if (error) throw error;
    userId = data.user.id;

    const sp = await db.from("Monster_Species").insert([
      { name: "テストスライム", rank: "E" },
      { name: "テストボス", rank: "SS" },
    ]).select("id, name");
    const slime = sp.data!.find((s) => s.name === "テストスライム")!.id;
    const boss = sp.data!.find((s) => s.name === "テストボス")!.id;
    const item = (await db.from("Items").insert({ name: "テスト薬草" }).select("id").single()).data!.id;

    areaId = (await db.from("Areas").insert({ name: "テストの森", clear_amount: 500, min_enemies: 1, max_enemies: 1 }).select("id").single()).data!.id;
    // 列が揃っていない行をまとめて insert するので defaultToNull: false（省略した列は DB の初期値）
    const ok = (res: { error: { message: string } | null }) => {
      if (res.error) throw new Error(res.error.message);
    };
    ok(await db.from("Area_Squares").insert([
      { area_id: areaId, position: 1, item_rate: 100 },
      { area_id: areaId, position: 2, chest_rate: 100 },
      { area_id: areaId, position: 3, monster_rate: 100 },
    ], { defaultToNull: false }));
    ok(await db.from("Area_Encounters").insert({ area_id: areaId, species_id: slime, min_level: 3, max_level: 3 }));
    ok(await db.from("Area_Loot").insert([
      { area_id: areaId, source: "field", item_id: item, min_quantity: 2, max_quantity: 2 },
      { area_id: areaId, source: "chest", currency_code: "perica", min_quantity: 100, max_quantity: 100 },
    ], { defaultToNull: false }));
    ok(await db.from("Area_Bosses").insert({ area_id: areaId, slot: 1, species_id: boss, level: 10 }));
  });

  it("クリアすると拾ったものとクリア報酬を受け取り、仲間も増える", async () => {
    const { expeditionId } = await startExpedition(db, userId, areaId);
    // 同時に 2 つ目は始まらない（同じ探索が返る）
    expect((await startExpedition(db, userId, areaId)).expeditionId).toBe(expeditionId);

    const always = () => 0; // すべて当たり（仲間になる判定も成功）
    const r1 = await advanceExpedition(db, userId, expeditionId, { random: always });
    expect(r1.event).toMatchObject({ type: "loot", source: "field" });
    const r2 = await advanceExpedition(db, userId, expeditionId, { random: always });
    expect(r2.event).toMatchObject({ type: "loot", source: "chest" });
    const r3 = await advanceExpedition(db, userId, expeditionId, { random: always });
    expect(r3.event).toMatchObject({ type: "battle", outcome: "win", recruited: { level: 3 } });
    expect(r3.details).toHaveProperty("recruited_monster_id");

    // クリア前は所持品に入っていない
    expect((await db.from("Player_Items").select("quantity").eq("owner_id", userId)).data).toEqual([]);

    const r4 = await advanceExpedition(db, userId, expeditionId, { random: always });
    expect(r4).toMatchObject({ finish: "cleared", event: { type: "battle", boss: true } });

    const items = (await db.from("Player_Items").select("quantity").eq("owner_id", userId)).data;
    const money = (await db.from("Player_Currencies").select("amount").eq("owner_id", userId)).data;
    const monsters = (await db.from("Player_Monsters").select("level, source").eq("owner_id", userId)).data;
    expect(items).toEqual([{ quantity: 2 }]);
    expect(money).toEqual([{ amount: 600 }]); // 宝箱 100 + クリア 500
    expect(monsters).toEqual([{ level: 3, source: "explore" }]);

    const exp = (await db.from("Expeditions").select("status, position, log").eq("id", expeditionId).single()).data!;
    expect(exp.status).toBe("cleared");
    expect(exp.log).toHaveLength(4);
    await expect(advanceExpedition(db, userId, expeditionId)).rejects.toThrow();
  });

  it("全滅すると拾ったものは消える（仲間は残る）", async () => {
    const before = (await db.from("Player_Items").select("quantity").eq("owner_id", userId)).data;
    const { expeditionId } = await startExpedition(db, userId, areaId);
    await advanceExpedition(db, userId, expeditionId, { random: () => 0 }); // 薬草を拾う
    await advanceExpedition(db, userId, expeditionId, { random: () => 0 }); // 宝箱
    const r = await advanceExpedition(db, userId, expeditionId, { random: () => 0, battle: () => "lose" });
    expect(r.finish).toBe("failed");
    expect((await db.from("Player_Items").select("quantity").eq("owner_id", userId)).data).toEqual(before);
    expect((await db.from("Player_Currencies").select("amount").eq("owner_id", userId)).data).toEqual([{ amount: 600 }]);
  });

  it("引き返すと拾ったものは受け取れるが、クリア報酬はない", async () => {
    const { expeditionId } = await startExpedition(db, userId, areaId);
    await advanceExpedition(db, userId, expeditionId, { random: () => 0 });
    await advanceExpedition(db, userId, expeditionId, { random: () => 0 });
    await retreatExpedition(db, userId, expeditionId);
    expect((await db.from("Player_Items").select("quantity").eq("owner_id", userId)).data).toEqual([{ quantity: 4 }]);
    expect((await db.from("Player_Currencies").select("amount").eq("owner_id", userId)).data).toEqual([{ amount: 700 }]);
  });

  it("同じ position で 2 回記録しようとすると拒否される（二重送信対策）", async () => {
    const { expeditionId } = await startExpedition(db, userId, areaId);
    const args = {
      p_expedition_id: expeditionId, p_expected_position: 0, p_advance: true,
      p_event: { type: "nothing", position: 1 }, p_loot: [], p_recruit: null, p_finish: null,
    };
    expect((await db.rpc("commit_expedition_step", args)).error).toBeNull();
    expect((await db.rpc("commit_expedition_step", args)).error?.message).toContain("状態が変わっています");
    await retreatExpedition(db, userId, expeditionId);
  });
});
