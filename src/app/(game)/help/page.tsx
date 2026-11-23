import { GameScreen } from "@/components/stage/GameScreen";
import { requireUser } from "@/lib/auth";

/** ヘルプ: チュートリアルのガイドをいつでも読める */
async function HelpContent() {
  const { supabase } = await requireUser();
  const { data: guides } = await supabase
    .from("Guide_Pages")
    .select("key, title, body")
    .eq("show_in_help", true)
    .order("sort_order");

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">ヘルプ</h1>
      {(guides ?? []).map((g) => (
        <details key={g.key} className="rounded-xl border border-black/10 p-4 open:bg-black/[0.03] dark:border-white/15 dark:open:bg-white/5">
          <summary className="cursor-pointer text-lg font-bold">{g.title}</summary>
          <p className="mt-2 whitespace-pre-wrap leading-relaxed">{g.body}</p>
        </details>
      ))}
    </div>
  );
}

export default async function HelpPage() {
  return <GameScreen screen="help" main={<HelpContent />} />;
}
