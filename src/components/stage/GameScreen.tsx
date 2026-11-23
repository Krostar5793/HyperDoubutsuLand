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
  const { data: p } = await supabase.from("profiles").select("tutorial_state, starter_chosen").eq("id", user.id).maybeSingle();
  if (p?.tutorial_state === "pending") redirect("/welcome");
  if (p?.tutorial_state === "in_progress" && screen !== "explore_run") {
    const exp = await activeTutorialExpedition(createAdminClient(), user.id);
    if (exp) redirect(`/explore/${exp}`);
  }
  if (p && !p.starter_chosen && screen !== "explore_run") redirect("/welcome/starter");

  const layout = await loadScreenLayout(supabase, screen);
  const widgets: WidgetMap = {
    status_bar: <StatusBar />,
    [SCREENS[screen].main]: <div className="p-4">{main}</div>,
  };
  return <ScreenRenderer layout={layout} widgets={widgets} />;
}
