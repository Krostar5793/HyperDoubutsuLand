import { GameScreen } from "@/components/stage/GameScreen";
import { requireUser } from "@/lib/auth";
import { UseItemButton } from "./UseItemButton";

async function ItemsPageContent() {
  const { supabase, user } = await requireUser();
  const [{ data: owned }, { data: money }] = await Promise.all([
    supabase
      .from("Player_Items")
      .select("quantity, item:Items(id, name, description, usable_in_field, usable_in_battle)")
      .eq("owner_id", user.id)
      .gt("quantity", 0)
      .order("item_id"),
    supabase.from("Player_Currencies").select("amount, currency:Currencies(name, short_name, sort_order)").eq("owner_id", user.id),
  ]);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">アイテム</h1>

      <section>
        <h2 className="mb-2 font-bold">所持金</h2>
        <ul className="flex flex-wrap gap-2">
          {(money ?? []).length === 0 && <li className="text-sm opacity-60">0 P</li>}
          {(money ?? []).map((c, i) => (
            <li key={i} className="rounded-full bg-amber-100 px-3 py-1 text-sm font-semibold text-amber-900 dark:bg-amber-900/40 dark:text-amber-200">
              {c.currency?.name} {c.amount.toLocaleString()} {c.currency?.short_name}
            </li>
          ))}
        </ul>
      </section>

      <section>
        <h2 className="mb-2 font-bold">所持品</h2>
        {!owned?.length ? (
          <p className="text-sm opacity-60">アイテムを持っていません</p>
        ) : (
          <ul className="divide-y divide-black/5 rounded-xl border border-black/10 dark:divide-white/10 dark:border-white/15">
            {owned.map((o) =>
              o.item ? (
                <li key={o.item.id} className="flex items-center gap-3 p-3">
                  <div className="min-w-0 flex-1">
                    <div className="font-semibold">
                      {o.item.name} <span className="font-normal opacity-70">×{o.quantity}</span>
                    </div>
                    {o.item.description && <div className="text-xs opacity-70">{o.item.description}</div>}
                    {o.item.usable_in_battle && <div className="text-xs text-emerald-700 dark:text-emerald-400">戦闘中に使えます</div>}
                  </div>
                  {o.item.usable_in_field && <UseItemButton itemId={o.item.id} name={o.item.name} />}
                </li>
              ) : null,
            )}
          </ul>
        )}
      </section>
    </div>
  );
}

export default async function ItemsPage() {
  return <GameScreen screen="items" main={<ItemsPageContent />} />;
}
