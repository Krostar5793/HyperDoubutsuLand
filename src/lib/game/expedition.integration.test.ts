/**
 * 探索と戦闘の結合テスト（ローカルの Supabase が必要）
 *   npx supabase start のあと、次の環境変数を付けて実行する:
 *   TEST_SUPABASE_URL=http://127.0.0.1:54321 TEST_SUPABASE_SERVICE_ROLE_KEY=... npx vitest run expedition.integration
 * 環境変数がなければスキップする。DB の中身を書き換えるので、本番のプロジェクトには絶対に向けないこと
 */
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { beforeAll, describe, expect, it } from "vitest";
import type { Database } from "@/lib/supabase/database.types";
import { fieldOf } from "./battle";
import { submitBattleTurn } from "./battle-server";
import { advanceExpedition, retreatExpedition, startExpedition } from "./expedition";

const url = process.env.TEST_SUPABASE_URL;
const key = process.env.TEST_SUPABASE_SERVICE_ROLE_KEY;
const run = url && key && /127\.0\.0\.1|localhost/.test(url) ? describe : describe.skip;

run("探索と戦闘（結合テスト）", () => {
  let db: SupabaseClient<Database>;
  let userId = "";
  let areaId = 0;
  let item = 0;
  let slime = 0;
  let heroId = "";

  const ok = (res: { error: { message: string } | null }) => {
    if (res.error) throw new Error(res.error.message);
  };

  /** 戦闘が終わるまで、全員「戦う」を選び続ける */
  async function fightToEnd(battleId: string, random: () => number) {
    for (let i = 0; i < 50; i++) {
      const b = (await db.from("Battles").select("state").eq("id", battleId).single()).data!;
      const state = b.state as never as Parameters<typeof fieldOf>[0];
      const cmds = fieldOf(state, "ally").map((f) => ({ actor: f.key, type: "fight" as const }));
      const r = await submitBattleTurn(db, userId, battleId, cmds, random);
      if (r.finished) return r;
    }
    throw new Error("戦闘が終わりません");
  }

  beforeAll(async () => {
    db = createClient<Database>(url!, key!, { auth: { persistSession: false } });
    const { data, error } = await db.auth.admin.createUser({
      email: `explorer-${Date.now()}@example.com`,
      password: "password123",
      email_confirm: true,
    });
    if (error) throw error;
    userId = data.user.id;

    const sp = await db
      .from("Monster_Species")
      .insert([
        { name: "テストスライム", rank: "E", hp: 10, mp: 0, atk: 1, def: 1, int: 1, spd: 1 },
        { name: "テストボス", rank: "SS", hp: 10, mp: 0, atk: 1, def: 1, int: 1, spd: 1 },
        { name: "テスト勇者", rank: "C", hp: 50, mp: 10, atk: 100, def: 50, int: 10, spd: 50 },
      ])
      .select("id, name");
    const id = (n: string) => sp.data!.find((s) => s.name === n)!.id;
    slime = id("テストスライム");
    item = (await db.from("Items").insert({ name: "テスト薬草" }).select("id").single()).data!.id;

    // 強い勇者をバトルメンバーにする
    const hero = await db.rpc("grant_monster", { p_owner_id: userId, p_species_id: id("テスト勇者"), p_level: 10, p_source: "test" });
    heroId = hero.data![0].monster_id;
    ok(await db.from("Player_Monsters").update({ party_slot: 1 }).eq("id", heroId));

    areaId = (await db.from("Areas").insert({ name: "テストの森", clear_amount: 500, min_enemies: 1, max_enemies: 1 }).select("id").single()).data!.id;
    // 列が揃っていない行をまとめて insert するので defaultToNull: false（省略した列は DB の初期値）
    ok(await db.from("Area_Squares").insert(
      [
        { area_id: areaId, position: 1, item_rate: 100 },
        { area_id: areaId, position: 2, chest_rate: 100 },
        { area_id: areaId, position: 3, monster_rate: 100 },
      ],
      { defaultToNull: false },
    ));
    ok(await db.from("Area_Encounters").insert({ area_id: areaId, species_id: slime, min_level: 3, max_level: 3 }));
    ok(await db.from("Area_Loot").insert(
      [
        { area_id: areaId, source: "field", item_id: item, min_quantity: 2, max_quantity: 2 },
        { area_id: areaId, source: "chest", currency_code: "perica", min_quantity: 100, max_quantity: 100 },
      ],
      { defaultToNull: false },
    ));
    ok(await db.from("Area_Bosses").insert({ area_id: areaId, slot: 1, species_id: id("テストボス"), level: 10 }));
  });

  it("戦闘に勝って進み、クリアすると拾ったもの・クリア報酬・経験値・仲間を受け取る", async () => {
    const { expeditionId } = await startExpedition(db, userId, areaId);
    expect((await startExpedition(db, userId, areaId)).expeditionId).toBe(expeditionId);

    const always = () => 0; // 抽選はすべて当たり（仲間になる判定も成功）
    expect((await advanceExpedition(db, userId, expeditionId, { random: always })).event).toMatchObject({ type: "loot", source: "field" });
    expect((await advanceExpedition(db, userId, expeditionId, { random: always })).event).toMatchObject({ type: "loot", source: "chest" });

    // モンスターのマス → 戦闘
    const r3 = await advanceExpedition(db, userId, expeditionId, { random: always });
    expect(r3.event).toMatchObject({ type: "battle_start", boss: false });
    expect(r3.battleId).toBeTruthy();
    // 戦闘中は進めない・引き返せない
    await expect(advanceExpedition(db, userId, expeditionId)).rejects.toThrow("戦闘中");
    await expect(retreatExpedition(db, userId, expeditionId)).rejects.toThrow("戦闘中");

    const b1 = await fightToEnd(r3.battleId!, always);
    expect(b1.state.result).toBe("won");
    expect(b1.details).toMatchObject({ recruit: { species_id: slime, level: 3 } });

    // ボス戦
    const r4 = await advanceExpedition(db, userId, expeditionId, { random: always });
    expect(r4.event).toMatchObject({ type: "battle_start", boss: true });
    const b2 = await fightToEnd(r4.battleId!, always);
    expect(b2.state.result).toBe("won");

    const exp = (await db.from("Expeditions").select("status, position, log").eq("id", expeditionId).single()).data!;
    expect(exp.status).toBe("cleared");
    expect((await db.from("Player_Items").select("quantity").eq("owner_id", userId)).data).toEqual([{ quantity: 2 }]);
    expect((await db.from("Player_Currencies").select("amount").eq("owner_id", userId)).data).toEqual([{ amount: 600 }]);
    const hero = (await db.from("Player_Monsters").select("level, exp").eq("id", heroId).single()).data!;
    expect(hero.level).toBeGreaterThan(10); // スライム 24 EXP + ボス 2000 EXP
    const monsters = (await db.from("Player_Monsters").select("source").eq("owner_id", userId).eq("source", "explore")).data;
    expect(monsters).toHaveLength(1);
  });

  it("全滅すると拾ったものは消える", async () => {
    // 勇者を弱くしてスライムに負けるようにする
    ok(await db.from("Monster_Species").update({ hp: 1, atk: 0, def: 0 }).eq("name", "テスト勇者"));
    ok(await db.from("Monster_Species").update({ atk: 999 }).eq("id", slime));
    const before = (await db.from("Player_Items").select("quantity").eq("owner_id", userId)).data;
    const { expeditionId } = await startExpedition(db, userId, areaId);
    await advanceExpedition(db, userId, expeditionId, { random: () => 0 });
    await advanceExpedition(db, userId, expeditionId, { random: () => 0 });
    const r = await advanceExpedition(db, userId, expeditionId, { random: () => 0 });
    const b = await fightToEnd(r.battleId!, () => 0.5);
    expect(b.state.result).toBe("lost");
    expect((await db.from("Expeditions").select("status").eq("id", expeditionId).single()).data!.status).toBe("failed");
    expect((await db.from("Player_Items").select("quantity").eq("owner_id", userId)).data).toEqual(before);
    ok(await db.from("Monster_Species").update({ hp: 50, atk: 100, def: 50 }).eq("name", "テスト勇者"));
    ok(await db.from("Monster_Species").update({ atk: 1 }).eq("id", slime));
  });

  it("引き返すと拾ったものは受け取れるが、クリア報酬はない", async () => {
    const { expeditionId } = await startExpedition(db, userId, areaId);
    await advanceExpedition(db, userId, expeditionId, { random: () => 0 });
    await advanceExpedition(db, userId, expeditionId, { random: () => 0 });
    await retreatExpedition(db, userId, expeditionId);
    expect((await db.from("Player_Items").select("quantity").eq("owner_id", userId)).data).toEqual([{ quantity: 4 }]);
    expect((await db.from("Player_Currencies").select("amount").eq("owner_id", userId)).data).toEqual([{ amount: 700 }]);
  });

  it("同じターンを 2 回送ると拒否される（二重送信対策）", async () => {
    const { expeditionId } = await startExpedition(db, userId, areaId);
    await advanceExpedition(db, userId, expeditionId, { random: () => 0 });
    await advanceExpedition(db, userId, expeditionId, { random: () => 0 });
    const r = await advanceExpedition(db, userId, expeditionId, { random: () => 0 });
    const b = (await db.from("Battles").select("state, turn").eq("id", r.battleId!).single()).data!;
    const args = { p_battle_id: r.battleId!, p_expected_turn: b.turn, p_state: b.state };
    expect((await db.rpc("commit_battle_turn", args)).error).toBeNull();
    expect((await db.rpc("commit_battle_turn", args)).error?.message).toContain("状態が変わっています");
  });
});
