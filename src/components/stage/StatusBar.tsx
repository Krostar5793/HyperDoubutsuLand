import Link from "next/link";
import { requireUser } from "@/lib/auth";

/** 画面上部のステータスバー（名前・所持金・ログアウト。管理者には UI エディタへのリンク） */
export async function StatusBar() {
  const { supabase, user } = await requireUser();
  const [{ data: profile }, { data: money }] = await Promise.all([
    supabase.from("profiles").select("display_name, is_admin").eq("id", user.id).maybeSingle(),
    supabase.from("Player_Currencies").select("amount").eq("owner_id", user.id).eq("currency_code", "perica").maybeSingle(),
  ]);
  return (
    <div className="flex h-full items-center justify-between gap-4 border-b border-black/10 bg-white/85 px-6 dark:border-white/15 dark:bg-neutral-900/85">
      <Link href="/" className="text-2xl font-bold">
        ハイパーどうぶつランド
      </Link>
      <div className="flex items-center gap-4 text-base">
        <span className="rounded-full bg-amber-100 px-4 py-1 font-semibold text-amber-900 dark:bg-amber-900/40 dark:text-amber-200">
          {(money?.amount ?? 0).toLocaleString()} P
        </span>
        <span className="opacity-70">{profile?.display_name ?? user.email}</span>
        {profile?.is_admin && (
          <Link href="/admin/ui" className="rounded-md border border-current px-3 py-1 text-sm">
            UIエディタ
          </Link>
        )}
        <form action="/auth/signout" method="post">
          <button className="text-sm underline opacity-70 hover:opacity-100">ログアウト</button>
        </form>
      </div>
    </div>
  );
}
