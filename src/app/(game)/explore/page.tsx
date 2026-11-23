import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { StartButton } from "./StartButton";

export default async function ExplorePage() {
  const { supabase, user } = await requireUser();
  const [{ data: areas }, { data: active }] = await Promise.all([
    supabase
      .from("Areas")
      .select("id, name, description, clear_amount, clear_currency_code, squares:Area_Squares(count)")
      .eq("is_active", true)
      .order("sort_order")
      .order("id"),
    supabase
      .from("Expeditions")
      .select("id, area:Areas(name)")
      .eq("owner_id", user.id)
      .eq("status", "exploring")
      .maybeSingle(),
  ]);

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">探索</h1>

      {active && (
        <Link
          href={`/explore/${active.id}`}
          className="block rounded-xl border-2 border-emerald-500 bg-emerald-50 p-4 font-semibold text-emerald-900 dark:bg-emerald-950 dark:text-emerald-100"
        >
          「{active.area?.name}」を探索中です。続きから再開する →
        </Link>
      )}

      {!areas?.length ? (
        <p className="text-sm opacity-70">
          探索できるエリアがありません。Table Editor で Areas と Area_Squares を登録してください。
        </p>
      ) : (
        <ul className="space-y-3">
          {areas.map((a) => (
            <li key={a.id} className="rounded-xl border border-black/10 p-4 dark:border-white/15">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-lg font-bold">{a.name}</h2>
                  {a.description && <p className="mt-1 text-sm opacity-80">{a.description}</p>}
                  <p className="mt-2 text-xs opacity-70">
                    {a.squares?.[0]?.count ?? 0} マス + ボス / クリア報酬 {a.clear_amount.toLocaleString()} P
                  </p>
                </div>
                {!active && <StartButton areaId={a.id} />}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
