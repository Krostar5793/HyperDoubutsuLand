import Link from "next/link";
import { requireUser } from "@/lib/auth";

const NAV = [
  { href: "/", label: "ホーム" },
  { href: "/monsters", label: "モンスター" },
  { href: "/explore", label: "探索" },
  { href: "/items", label: "アイテム" },
];

export default async function GameLayout({ children }: { children: React.ReactNode }) {
  const { supabase, user } = await requireUser();
  const [{ data: profile }, { data: money }] = await Promise.all([
    supabase.from("profiles").select("display_name").eq("id", user.id).maybeSingle(),
    supabase.from("Player_Currencies").select("amount").eq("owner_id", user.id).eq("currency_code", "perica").maybeSingle(),
  ]);

  return (
    <div className="mx-auto flex min-h-screen max-w-3xl flex-col">
      <header className="sticky top-0 z-10 flex items-center justify-between gap-3 border-b border-black/10 bg-white/90 px-4 py-3 backdrop-blur dark:border-white/15 dark:bg-neutral-950/90">
        <Link href="/" className="font-bold">
          ハイパーどうぶつランド
        </Link>
        <div className="flex items-center gap-3 text-sm">
          <span className="rounded-full bg-amber-100 px-3 py-1 font-semibold text-amber-900 dark:bg-amber-900/40 dark:text-amber-200">
            {(money?.amount ?? 0).toLocaleString()} P
          </span>
          <span className="hidden opacity-70 sm:inline">{profile?.display_name ?? user.email}</span>
          <form action="/auth/signout" method="post">
            <button className="underline opacity-70 hover:opacity-100">ログアウト</button>
          </form>
        </div>
      </header>

      <main className="flex-1 px-4 py-5 pb-24">{children}</main>

      <nav className="fixed inset-x-0 bottom-0 z-10 border-t border-black/10 bg-white/95 backdrop-blur dark:border-white/15 dark:bg-neutral-950/95">
        <ul className="mx-auto grid max-w-3xl grid-cols-4">
          {NAV.map((n) => (
            <li key={n.href}>
              <Link href={n.href} className="block py-3 text-center text-sm font-medium hover:bg-black/5 dark:hover:bg-white/10">
                {n.label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  );
}
