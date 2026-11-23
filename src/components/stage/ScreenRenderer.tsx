import Link from "next/link";
import { publicImageUrl } from "@/lib/game/storage";
import type { ScreenLayout, UiElement, WidgetKind } from "@/lib/ui/types";

export type WidgetMap = Partial<Record<WidgetKind, React.ReactNode>>;

export function elementStyle(e: UiElement): React.CSSProperties {
  return {
    position: "absolute",
    left: e.x,
    top: e.y,
    width: e.width,
    height: e.height,
    zIndex: e.z_index,
  };
}

/** text / button / image の見た目（ゲーム画面とエディタで共通） */
export function ElementBody({ element }: { element: UiElement }) {
  const p = element.props;
  if (element.type === "image") {
    const url = publicImageUrl(p.imagePath ?? null);
    if (!url) {
      return <div className="flex h-full w-full items-center justify-center border border-dashed border-current text-sm opacity-50">画像</div>;
    }
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={url} alt="" className="h-full w-full" style={{ objectFit: p.fit ?? "contain" }} draggable={false} />
    );
  }
  if (element.type === "text" || element.type === "button") {
    return (
      <div
        className="flex h-full w-full items-center overflow-hidden px-2"
        style={{
          fontSize: p.fontSize ?? 20,
          color: p.color,
          backgroundColor: p.backgroundColor,
          borderRadius: p.borderRadius,
          fontWeight: p.bold ? 700 : 400,
          justifyContent: p.align === "left" ? "flex-start" : p.align === "right" ? "flex-end" : "center",
          textAlign: p.align ?? "center",
          whiteSpace: "pre-wrap",
          lineHeight: 1.3,
        }}
      >
        {p.text}
      </div>
    );
  }
  return null;
}

/** 保存された配置どおりに画面を描く */
export function ScreenRenderer({ layout, widgets }: { layout: ScreenLayout; widgets: WidgetMap }) {
  const bg = publicImageUrl(layout.backgroundImagePath);
  return (
    <div
      className="absolute inset-0"
      style={{
        backgroundColor: layout.backgroundColor ?? undefined,
        backgroundImage: bg ? `url(${bg})` : undefined,
        backgroundSize: "cover",
        backgroundPosition: "center",
      }}
    >
      {layout.elements.map((e) => {
        const style = elementStyle(e);
        if (e.type === "widget") {
          const content = e.props.widget ? widgets[e.props.widget] : null;
          if (!content) return null;
          return (
            <div key={e.id} style={style} className="overflow-auto">
              {content}
            </div>
          );
        }
        if (e.type === "button") {
          const action = e.props.action;
          const body = <ElementBody element={e} />;
          if (action?.type === "navigate") {
            return (
              <Link key={e.id} href={action.to} style={style} className="block transition hover:brightness-110 active:scale-[0.98]">
                {body}
              </Link>
            );
          }
          return (
            <button key={e.id} type="button" style={style} className="block">
              {body}
            </button>
          );
        }
        return (
          <div key={e.id} style={style}>
            <ElementBody element={e} />
          </div>
        );
      })}
    </div>
  );
}
