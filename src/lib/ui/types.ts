/**
 * UI エディタの型と、画面ごとの初期配置。
 * 画面は STAGE（1280×720、横向き 16:9）の座標で配置する。
 */

export const STAGE = { width: 1280, height: 720 } as const;

/** 画面の中で、コードが中身を描く領域（モンスター一覧など） */
export const WIDGETS = {
  status_bar: "ステータスバー（所持金・名前）",
  home_menu: "ホームのメニュー",
  monster_board: "モンスター編成",
  monster_detail: "モンスター詳細",
  area_list: "エリア一覧",
  expedition_runner: "探索の進行",
  item_list: "所持品",
  help: "ヘルプ",
} as const;
export type WidgetKind = keyof typeof WIDGETS;

/** 編集できる画面 */
export const SCREENS = {
  home: { name: "ホーム", path: "/", main: "home_menu" },
  monsters: { name: "モンスター", path: "/monsters", main: "monster_board" },
  monster_detail: { name: "モンスター詳細", path: null, main: "monster_detail" },
  explore: { name: "探索（エリア選択）", path: "/explore", main: "area_list" },
  explore_run: { name: "探索中", path: null, main: "expedition_runner" },
  items: { name: "アイテム", path: "/items", main: "item_list" },
  help: { name: "ヘルプ", path: "/help", main: "help" },
} as const satisfies Record<string, { name: string; path: string | null; main: WidgetKind }>;
export type ScreenKey = keyof typeof SCREENS;

/** ボタンを押したときの動作（今は画面移動のみ。ダイアログなどは今後追加） */
export type ButtonAction = { type: "none" } | { type: "navigate"; to: string };

export type ElementProps = {
  /** text / button の文字 */
  text?: string;
  fontSize?: number;
  color?: string;
  backgroundColor?: string;
  borderRadius?: number;
  bold?: boolean;
  align?: "left" | "center" | "right";
  /** image の画像（Images バケット内のパス） */
  imagePath?: string;
  /** image の収め方 */
  fit?: "contain" | "cover" | "fill";
  /** button の動作 */
  action?: ButtonAction;
  /** widget の種類 */
  widget?: WidgetKind;
};

export type UiElement = {
  /** 編集画面での識別用（保存時には使わない） */
  id: string;
  type: "image" | "text" | "button" | "widget";
  x: number;
  y: number;
  width: number;
  height: number;
  z_index: number;
  props: ElementProps;
};

export type ScreenLayout = {
  key: ScreenKey;
  backgroundColor: string | null;
  backgroundImagePath: string | null;
  elements: UiElement[];
  /** true ならコードの初期配置（DB に保存されていない） */
  isDefault: boolean;
};

const NAV: { label: string; to: string }[] = [
  { label: "ホーム", to: "/" },
  { label: "モンスター", to: "/monsters" },
  { label: "探索", to: "/explore" },
  { label: "アイテム", to: "/items" },
  { label: "ヘルプ", to: "/help" },
];

/** 初期配置: 上にステータスバー、左にメニューボタン、右に画面の中身 */
export function defaultLayout(key: ScreenKey): ScreenLayout {
  const elements: UiElement[] = [
    { id: "status", type: "widget", x: 0, y: 0, width: 1280, height: 64, z_index: 10, props: { widget: "status_bar" } },
    ...NAV.map((n, i): UiElement => ({
      id: `nav-${i}`,
      type: "button",
      x: 16,
      y: 88 + i * 68,
      width: 176,
      height: 56,
      z_index: 5,
      props: {
        text: n.label,
        fontSize: 20,
        bold: true,
        color: "#ffffff",
        backgroundColor: "#059669",
        borderRadius: 12,
        align: "center",
        action: { type: "navigate", to: n.to },
      },
    })),
    { id: "main", type: "widget", x: 212, y: 80, width: 1052, height: 624, z_index: 1, props: { widget: SCREENS[key].main } },
  ];
  return { key, backgroundColor: null, backgroundImagePath: null, elements, isDefault: true };
}

/** 画面移動のボタンで選べる移動先 */
export const NAVIGATION_TARGETS = Object.values(SCREENS)
  .filter((s) => s.path !== null)
  .map((s) => ({ label: s.name, to: s.path as string }));
