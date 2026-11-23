import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { activeTutorialExpedition } from "@/lib/game/tutorial";
import { createAdminClient } from "@/lib/supabase/admin";
import { loadScreenLayout } from "@/lib/ui/load";
import { SCREENS, type ScreenKey } from "@/lib/ui/types";
import { ScreenRenderer, type WidgetMap } from "./ScreenRenderer";
import { StatusBar } from "./StatusBar";

/**
 * UI エディタで設定した配置で画面を描く。
 * main には、その画面の中身（モンスター一覧など）を渡す。
 */
export async function GameScreen({ screen, main }: { screen: ScreenKey; main: React.ReactNode }) {
  const { supabase, user } = await requireUser();

  // チュートリアルが終わっていなければ、そちらへ案内する
  const { data: p, error } = await supabase
    .from("profiles")
    .select("tutorial_state, starter_chosen")
    .eq("id", user.id)
    .maybeSingle();
  // 読み込めないときに黙って先へ進まないよう、原因を表示する
  if (error) throw new Error(`プロフィールを読み込めませんでした: ${error.message}`);
  if (!p) throw new Error("プロフィールが見つかりません。ログインし直してください");
  if (p.tutorial_state === "pending") redirect("/welcome");
  if (screen !== "explore_run") {
    if (p.tutorial_state === "in_progress") {
      const exp = await activeTutorialExpedition(createAdminClient(), user.id);
      if (exp) redirect(`/explore/${exp}`);
    }
    if (!p.starter_chosen) redirect("/welcome/starter");
    // 探索中は、探索の画面（編成の入れ替え・リリースもそこでできる）から離れられない
    const { data: active } = await supabase
      .from("Expeditions")
      .select("id")
      .eq("owner_id", user.id)
      .eq("status", "exploring")
      .maybeSingle();
    if (active) redirect(`/explore/${active.id}`);
  }

  const layout = await loadScreenLayout(supabase, screen);
  const widgets: WidgetMap = {
    status_bar: <StatusBar />,
    [SCREENS[screen].main]: <div className="p-4">{main}</div>,
  };
  return <ScreenRenderer layout={layout} widgets={widgets} />;
}
