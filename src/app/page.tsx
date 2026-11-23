import { createClient } from "@/lib/supabase/server";

export default async function Home() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name")
    .eq("id", user!.id)
    .single();

  return (
    <main className="mx-auto max-w-2xl space-y-6 p-6">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">ハイパーどうぶつランド</h1>
        <form action="/auth/signout" method="post">
          <button className="text-sm underline opacity-70 hover:opacity-100">
            ログアウト
          </button>
        </form>
      </header>

      <section className="rounded-xl border border-black/10 p-6 dark:border-white/15">
        <p>
          ようこそ、
          <span className="font-semibold">
            {profile?.display_name ?? user?.email}
          </span>
          さん！
        </p>
        <p className="mt-2 text-sm opacity-70">
          ここにモンスター育成の機能を追加していきます。
        </p>
      </section>
    </main>
  );
}
