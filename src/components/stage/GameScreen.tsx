import { requireUser } from "@/lib/auth";
import { loadScreenLayout } from "@/lib/ui/load";
import { SCREENS, type ScreenKey } from "@/lib/ui/types";
import { ScreenRenderer, type WidgetMap } from "./ScreenRenderer";
import { StatusBar } from "./StatusBar";

/**
 * UI エディタで設定した配置で画面を描く。
 * main には、その画面の中身（モンスター一覧など）を渡す。
 */
export async function GameScreen({ screen, main }: { screen: ScreenKey; main: React.ReactNode }) {
  const { supabase } = await requireUser();
  const layout = await loadScreenLayout(supabase, screen);
  const widgets: WidgetMap = {
    status_bar: <StatusBar />,
    [SCREENS[screen].main]: <div className="p-4">{main}</div>,
  };
  return <ScreenRenderer layout={layout} widgets={widgets} />;
}
