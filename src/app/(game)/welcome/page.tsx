import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { skipTutorialAction, startTutorialAction } from "./actions";

/** 初回ログイン時: チュートリアルを遊ぶかスキップするか */
export default async function WelcomePage() {
  const { supabase, user } = await requireUser();
  const { data: p } = await supabase.from("profiles").select("tutorial_state, display_name").eq("id", user.id).maybeSingle();
  if (p?.tutorial_state !== "pending") redirect("/");

  return (
    <div className="flex h-full flex-col items-center justify-center gap-8 bg-gradient-to-b from-emerald-50 to-white p-12 text-center text-neutral-900 dark:from-emerald-950 dark:to-neutral-950 dark:text-neutral-100">
      <h1 className="text-5xl font-bold">ハイパーどうぶつランドへようこそ！</h1>
      <p className="text-xl">
        {p?.display_name} さん、はじめまして。
        <br />
        まずはチュートリアルで、探索と戦闘の流れを体験してみませんか？
      </p>
      <div className="flex gap-6">
        <form action={startTutorialAction}>
          <button className="rounded-xl bg-emerald-600 px-10 py-4 text-2xl font-bold text-white hover:bg-emerald-700">チュートリアルを遊ぶ</button>
        </form>
        <form action={skipTutorialAction}>
          <button className="rounded-xl border-2 border-emerald-600 px-10 py-4 text-2xl font-bold text-emerald-700 hover:bg-emerald-50 dark:text-emerald-300 dark:hover:bg-emerald-950">
            スキップする
          </button>
        </form>
      </div>
      <p className="text-sm opacity-70">チュートリアルは 1 回だけ遊べます。スキップしても、説明は「ヘルプ」でいつでも読めます。</p>
    </div>
  );
}
