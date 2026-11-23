import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { starterOptionsForView } from "@/lib/game/tutorial-data";
import { StarterChoice } from "./StarterChoice";

/** チュートリアルをスキップしたとき: 最初のモンスターだけ選ぶ */
export default async function StarterPage() {
  const { supabase, user } = await requireUser();
  const { data: p } = await supabase.from("profiles").select("tutorial_state, starter_chosen").eq("id", user.id).maybeSingle();
  if (!p || p.starter_chosen) redirect("/");
  if (p.tutorial_state === "pending") redirect("/welcome");

  return (
    <div className="flex h-full flex-col justify-center gap-6 p-12 text-neutral-900 dark:text-neutral-100">
      <div className="text-center">
        <h1 className="text-4xl font-bold">最初の仲間を選ぼう</h1>
        <p className="mt-2 text-lg opacity-80">いっしょに旅をするモンスターを 1 体選んでください。</p>
      </div>
      <StarterChoice options={await starterOptionsForView(supabase)} />
    </div>
  );
}
