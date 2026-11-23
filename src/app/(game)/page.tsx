import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { devGrantItems, devGrantMonster, devGrantPerica } from "./dev-actions";

const MENU = [
  { href: "/explore", title: "探索", text: "エリアを選んで探索に出かけよう" },
  { href: "/monsters", title: "モンスター", text: "パーティの編成と育成" },
  { href: "/items", title: "アイテム", text: "持っているアイテムを確認・使用" },
];

export default async function Home() {
  const { supabase, user } = await requireUser();
  const [{ data: profile }, { count: monsterCount }, { data: active }] = await Promise.all([
    supabase.from("profiles").select("display_name").eq("id", user.id).maybeSingle(),
    supabase.from("Player_Monsters").select("id", { count: "exact", head: true }).eq("owner_id", user.id),
    supabase.from("Expeditions").select("id").eq("owner_id", user.id).eq("status", "exploring").maybeSingle(),
  ]);

  return (
    <div className="space-y-6">
      <section>
        <h1 className="text-2xl font-bold">ようこそ、{profile?.display_name ?? user.email} さん</h1>
        <p className="mt-1 text-sm opacity-70">所持モンスター {monsterCount ?? 0} 体</p>
      </section>

      {active && (
        <Link
          href={`/explore/${active.id}`}
          className="block rounded-xl border-2 border-emerald-500 bg-emerald-50 p-4 font-semibold text-emerald-900 dark:bg-emerald-950 dark:text-emerald-100"
        >
          探索の途中です。続きから再開する →
        </Link>
      )}

      <section className="grid gap-3 sm:grid-cols-3">
        {MENU.map((m) => (
          <Link
            key={m.href}
            href={m.href}
            className="rounded-xl border border-black/10 p-4 hover:border-emerald-500 dark:border-white/15"
          >
            <div className="text-lg font-bold">{m.title}</div>
            <div className="mt-1 text-sm opacity-70">{m.text}</div>
          </Link>
        ))}
      </section>

      {process.env.NODE_ENV !== "production" && (
        <section className="rounded-xl border border-dashed border-amber-500 p-4">
          <h2 className="font-bold text-amber-700 dark:text-amber-400">開発用ツール</h2>
          <p className="mt-1 text-xs opacity-70">テストプレイ用です。本番環境では表示されません。</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <form action={devGrantMonster}>
              <button className="rounded-md border border-amber-500 px-3 py-1.5 text-sm">モンスターを1体もらう</button>
            </form>
            <form action={devGrantPerica}>
              <button className="rounded-md border border-amber-500 px-3 py-1.5 text-sm">1000 P もらう</button>
            </form>
            <form action={devGrantItems}>
              <button className="rounded-md border border-amber-500 px-3 py-1.5 text-sm">全アイテムを5個ずつもらう</button>
            </form>
          </div>
        </section>
      )}
    </div>
  );
}
