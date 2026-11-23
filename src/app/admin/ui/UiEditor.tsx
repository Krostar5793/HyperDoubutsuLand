"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { ElementBody } from "@/components/stage/ScreenRenderer";
import { publicImageUrl } from "@/lib/game/storage";
import { createClient } from "@/lib/supabase/client";
import {
  defaultLayout,
  NAVIGATION_TARGETS,
  SCREENS,
  STAGE,
  WIDGETS,
  type ElementProps,
  type ScreenKey,
  type ScreenLayout,
  type UiElement,
  type WidgetKind,
} from "@/lib/ui/types";
import { resetLayoutAction, saveLayoutAction } from "./actions";

const GRID = 8;
const snap = (v: number, on: boolean) => (on ? Math.round(v / GRID) * GRID : Math.round(v));
const newId = () => Math.random().toString(36).slice(2, 10);

type Drag = {
  id: string;
  mode: "move" | "resize";
  startX: number;
  startY: number;
  orig: UiElement;
};

/** 画像を Images バケットの ui/ フォルダにアップロードして、パスを返す */
async function uploadImage(file: File): Promise<string> {
  const ext = file.name.split(".").pop()?.toLowerCase() || "png";
  const path = `ui/${Date.now()}-${newId()}.${ext}`;
  const { error } = await createClient().storage.from("Images").upload(path, file, {
    cacheControl: "3600",
    upsert: false,
    contentType: file.type || undefined,
  });
  if (error) throw new Error(error.message);
  return path;
}

export function UiEditor({ initialLayouts }: { initialLayouts: ScreenLayout[] }) {
  const [layouts, setLayouts] = useState<Record<string, ScreenLayout>>(() =>
    Object.fromEntries(initialLayouts.map((l) => [l.key, l])),
  );
  const [screen, setScreen] = useState<ScreenKey>("home");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [dirty, setDirty] = useState<Set<string>>(new Set());
  const [snapOn, setSnapOn] = useState(true);
  const [message, setMessage] = useState<{ text: string; error?: boolean } | null>(null);
  const [busy, setBusy] = useState(false);
  const [scale, setScale] = useState(0.6);
  const canvasWrap = useRef<HTMLDivElement>(null);
  const drag = useRef<Drag | null>(null);

  const layout = layouts[screen];
  const selected = layout.elements.find((e) => e.id === selectedId) ?? null;

  // キャンバスの幅に合わせて縮小率を決める
  useEffect(() => {
    const el = canvasWrap.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setScale(el.clientWidth / STAGE.width));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const update = useCallback(
    (fn: (l: ScreenLayout) => ScreenLayout) => {
      setLayouts((all) => ({ ...all, [screen]: fn(all[screen]) }));
      setDirty((d) => new Set(d).add(screen));
    },
    [screen],
  );

  const updateElement = useCallback(
    (id: string, patch: Partial<UiElement>) =>
      update((l) => ({ ...l, elements: l.elements.map((e) => (e.id === id ? { ...e, ...patch } : e)) })),
    [update],
  );

  const updateProps = (id: string, patch: Partial<ElementProps>) =>
    update((l) => ({
      ...l,
      elements: l.elements.map((e) => (e.id === id ? { ...e, props: { ...e.props, ...patch } } : e)),
    }));

  const removeElement = useCallback(
    (id: string) => {
      update((l) => ({ ...l, elements: l.elements.filter((e) => e.id !== id) }));
      setSelectedId(null);
    },
    [update],
  );

  // ドラッグで移動・サイズ変更
  useEffect(() => {
    const onMove = (ev: PointerEvent) => {
      const d = drag.current;
      if (!d) return;
      const dx = (ev.clientX - d.startX) / scale;
      const dy = (ev.clientY - d.startY) / scale;
      if (d.mode === "move") {
        updateElement(d.id, { x: snap(d.orig.x + dx, snapOn), y: snap(d.orig.y + dy, snapOn) });
      } else {
        updateElement(d.id, {
          width: Math.max(GRID, snap(d.orig.width + dx, snapOn)),
          height: Math.max(GRID, snap(d.orig.height + dy, snapOn)),
        });
      }
    };
    const onUp = () => (drag.current = null);
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
  }, [scale, snapOn, updateElement]);

  // 矢印キーで 1px（Shift で 10px）移動、Delete で削除
  useEffect(() => {
    const onKey = (ev: KeyboardEvent) => {
      if (!selected) return;
      const tag = (ev.target as HTMLElement).tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
      const step = ev.shiftKey ? 10 : 1;
      const moves: Record<string, [number, number]> = {
        ArrowLeft: [-step, 0],
        ArrowRight: [step, 0],
        ArrowUp: [0, -step],
        ArrowDown: [0, step],
      };
      if (moves[ev.key]) {
        ev.preventDefault();
        const [mx, my] = moves[ev.key];
        updateElement(selected.id, { x: selected.x + mx, y: selected.y + my });
      } else if (ev.key === "Delete" || ev.key === "Backspace") {
        ev.preventDefault();
        removeElement(selected.id);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selected, updateElement, removeElement]);

  const startDrag = (ev: React.PointerEvent, e: UiElement, mode: Drag["mode"]) => {
    ev.stopPropagation();
    ev.preventDefault();
    setSelectedId(e.id);
    drag.current = { id: e.id, mode, startX: ev.clientX, startY: ev.clientY, orig: e };
  };

  const addElement = (type: UiElement["type"], widget?: WidgetKind) => {
    const maxZ = Math.max(0, ...layout.elements.map((e) => e.z_index));
    const base = { id: newId(), x: 520, y: 300, z_index: maxZ + 1 };
    const el: UiElement =
      type === "text"
        ? { ...base, type, width: 320, height: 64, props: { text: "テキスト", fontSize: 28, align: "center" } }
        : type === "button"
          ? {
              ...base,
              type,
              width: 220,
              height: 64,
              props: {
                text: "ボタン",
                fontSize: 22,
                bold: true,
                color: "#ffffff",
                backgroundColor: "#059669",
                borderRadius: 12,
                align: "center",
                action: { type: "none" },
              },
            }
          : type === "image"
            ? { ...base, type, width: 240, height: 240, props: { fit: "contain" } }
            : { ...base, x: 212, y: 80, type, width: 800, height: 560, props: { widget } };
    update((l) => ({ ...l, elements: [...l.elements, el] }));
    setSelectedId(el.id);
  };

  const run = async (fn: () => Promise<{ error?: string } | void>, ok: string) => {
    setBusy(true);
    setMessage(null);
    try {
      const res = await fn();
      if (res && res.error) setMessage({ text: res.error, error: true });
      else setMessage({ text: ok });
    } catch (e) {
      setMessage({ text: e instanceof Error ? e.message : String(e), error: true });
    } finally {
      setBusy(false);
    }
  };

  const save = () =>
    run(async () => {
      const res = await saveLayoutAction(layout);
      if (!res.error) {
        setLayouts((all) => ({ ...all, [screen]: { ...all[screen], isDefault: false } }));
        setDirty((d) => {
          const n = new Set(d);
          n.delete(screen);
          return n;
        });
      }
      return res;
    }, "保存しました");

  const reset = () => {
    if (!confirm(`「${SCREENS[screen].name}」の配置を初期状態に戻します。よろしいですか？`)) return;
    run(async () => {
      const res = await resetLayoutAction(screen);
      if (!res.error) {
        setLayouts((all) => ({ ...all, [screen]: defaultLayout(screen) }));
        setSelectedId(null);
        setDirty((d) => {
          const n = new Set(d);
          n.delete(screen);
          return n;
        });
      }
      return res;
    }, "初期配置に戻しました");
  };

  const onUpload = async (file: File | undefined, apply: (path: string) => void) => {
    if (!file) return;
    await run(async () => apply(await uploadImage(file)), "画像をアップロードしました");
  };

  const usedWidgets = new Set(layout.elements.filter((e) => e.type === "widget").map((e) => e.props.widget));
  const availableWidgets = (["status_bar", SCREENS[screen].main] as WidgetKind[]).filter((w) => !usedWidgets.has(w));
  const bgUrl = publicImageUrl(layout.backgroundImagePath);
  const sorted = [...layout.elements].sort((a, b) => a.z_index - b.z_index);

  return (
    <div className="flex h-screen flex-col bg-neutral-100 text-neutral-900 dark:bg-neutral-900 dark:text-neutral-100">
      {/* ツールバー */}
      <header className="flex flex-wrap items-center gap-2 border-b border-black/10 bg-white px-4 py-2 dark:border-white/15 dark:bg-neutral-950">
        <Link href="/" className="mr-2 text-sm underline">
          ← ゲームへ
        </Link>
        <h1 className="mr-4 font-bold">UIエディタ</h1>
        <select
          value={screen}
          onChange={(e) => {
            setScreen(e.target.value as ScreenKey);
            setSelectedId(null);
          }}
          className="rounded border border-black/20 bg-transparent px-2 py-1 dark:border-white/20"
        >
          {(Object.keys(SCREENS) as ScreenKey[]).map((k) => (
            <option key={k} value={k}>
              {SCREENS[k].name}
              {dirty.has(k) ? " ●" : ""}
            </option>
          ))}
        </select>
        <span className="text-xs opacity-60">{layout.isDefault && !dirty.has(screen) ? "初期配置" : ""}</span>
        <span className="mx-2 h-6 w-px bg-black/10 dark:bg-white/15" />
        <button onClick={() => addElement("text")} className="rounded border px-2 py-1 text-sm">
          ＋テキスト
        </button>
        <button onClick={() => addElement("button")} className="rounded border px-2 py-1 text-sm">
          ＋ボタン
        </button>
        <button onClick={() => addElement("image")} className="rounded border px-2 py-1 text-sm">
          ＋画像
        </button>
        {availableWidgets.map((w) => (
          <button key={w} onClick={() => addElement("widget", w)} className="rounded border px-2 py-1 text-sm">
            ＋{WIDGETS[w]}
          </button>
        ))}
        <label className="ml-2 flex items-center gap-1 text-sm">
          <input type="checkbox" checked={snapOn} onChange={(e) => setSnapOn(e.target.checked)} />
          {GRID}px グリッドに合わせる
        </label>
        <div className="ml-auto flex items-center gap-2">
          {message && (
            <span className={`text-sm ${message.error ? "text-red-600" : "text-emerald-700 dark:text-emerald-400"}`}>{message.text}</span>
          )}
          <button disabled={busy} onClick={reset} className="rounded border border-red-500 px-3 py-1 text-sm text-red-600 disabled:opacity-50">
            初期配置に戻す
          </button>
          <button
            disabled={busy || !dirty.has(screen)}
            onClick={save}
            className="rounded bg-emerald-600 px-4 py-1 text-sm font-semibold text-white disabled:opacity-40"
          >
            保存
          </button>
        </div>
      </header>

      <div className="flex min-h-0 flex-1">
        {/* キャンバス */}
        <div className="min-w-0 flex-1 overflow-auto p-4">
          <div ref={canvasWrap} className="w-full">
            <div style={{ width: STAGE.width * scale, height: STAGE.height * scale }} className="shadow-lg">
              <div
                className="relative origin-top-left overflow-hidden bg-[var(--stage-bg)] text-[var(--stage-fg)]"
                style={{
                  width: STAGE.width,
                  height: STAGE.height,
                  transform: `scale(${scale})`,
                  backgroundColor: layout.backgroundColor ?? undefined,
                  backgroundImage: bgUrl ? `url(${bgUrl})` : undefined,
                  backgroundSize: "cover",
                  backgroundPosition: "center",
                }}
                onPointerDown={() => setSelectedId(null)}
              >
                {sorted.map((e) => (
                  <div
                    key={e.id}
                    onPointerDown={(ev) => startDrag(ev, e, "move")}
                    className={`absolute cursor-move select-none ${
                      e.id === selectedId ? "outline outline-2 outline-sky-500" : "hover:outline hover:outline-1 hover:outline-sky-400"
                    }`}
                    style={{ left: e.x, top: e.y, width: e.width, height: e.height, zIndex: e.z_index }}
                  >
                    {e.type === "widget" ? (
                      <div className="flex h-full w-full items-center justify-center border-2 border-dashed border-sky-500/60 bg-sky-500/10 text-xl font-semibold text-sky-700 dark:text-sky-300">
                        {e.props.widget ? WIDGETS[e.props.widget] : "表示領域"}
                      </div>
                    ) : (
                      <ElementBody element={e} />
                    )}
                    {e.id === selectedId && (
                      <div
                        onPointerDown={(ev) => startDrag(ev, e, "resize")}
                        className="absolute -right-2 -bottom-2 h-5 w-5 cursor-se-resize rounded-sm border-2 border-white bg-sky-500"
                        title="ドラッグでサイズ変更"
                      />
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
          <p className="mt-2 text-xs opacity-60">
            要素をドラッグで移動、右下の四角でサイズ変更。矢印キーで 1px（Shift で 10px）移動、Delete で削除。
          </p>
        </div>

        {/* プロパティパネル */}
        <aside className="w-80 shrink-0 space-y-4 overflow-y-auto border-l border-black/10 bg-white p-4 text-sm dark:border-white/15 dark:bg-neutral-950">
          {!selected ? (
            <section className="space-y-3">
              <h2 className="font-bold">背景（{SCREENS[screen].name}）</h2>
              <Field label="背景色">
                <ColorInput value={layout.backgroundColor} onChange={(v) => update((l) => ({ ...l, backgroundColor: v }))} />
              </Field>
              <Field label="背景画像">
                <ImageInput
                  path={layout.backgroundImagePath}
                  onUpload={(f) => onUpload(f, (path) => update((l) => ({ ...l, backgroundImagePath: path })))}
                  onClear={() => update((l) => ({ ...l, backgroundImagePath: null }))}
                />
              </Field>
              <p className="text-xs opacity-60">要素をクリックすると、その要素の設定が表示されます。</p>
            </section>
          ) : (
            <section className="space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="font-bold">
                  {selected.type === "text" && "テキスト"}
                  {selected.type === "button" && "ボタン"}
                  {selected.type === "image" && "画像"}
                  {selected.type === "widget" && `表示領域: ${selected.props.widget ? WIDGETS[selected.props.widget] : ""}`}
                </h2>
                <button onClick={() => removeElement(selected.id)} className="text-red-600 underline">
                  削除
                </button>
              </div>

              <div className="grid grid-cols-2 gap-2">
                {(["x", "y", "width", "height"] as const).map((k) => (
                  <Field key={k} label={{ x: "X", y: "Y", width: "幅", height: "高さ" }[k]}>
                    <NumberInput value={selected[k]} onChange={(v) => updateElement(selected.id, { [k]: v })} />
                  </Field>
                ))}
              </div>
              <Field label="重なり順（大きいほど前）">
                <div className="flex gap-2">
                  <NumberInput value={selected.z_index} onChange={(v) => updateElement(selected.id, { z_index: v })} />
                  <button
                    className="rounded border px-2"
                    onClick={() => updateElement(selected.id, { z_index: Math.max(...layout.elements.map((e) => e.z_index)) + 1 })}
                  >
                    最前面
                  </button>
                </div>
              </Field>

              {(selected.type === "text" || selected.type === "button") && (
                <>
                  <Field label="文字">
                    <textarea
                      value={selected.props.text ?? ""}
                      onChange={(e) => updateProps(selected.id, { text: e.target.value })}
                      rows={2}
                      className="w-full rounded border border-black/20 bg-transparent px-2 py-1 dark:border-white/20"
                    />
                  </Field>
                  <div className="grid grid-cols-2 gap-2">
                    <Field label="文字サイズ">
                      <NumberInput value={selected.props.fontSize ?? 20} onChange={(v) => updateProps(selected.id, { fontSize: v })} />
                    </Field>
                    <Field label="角の丸み">
                      <NumberInput value={selected.props.borderRadius ?? 0} onChange={(v) => updateProps(selected.id, { borderRadius: v })} />
                    </Field>
                  </div>
                  <Field label="文字色">
                    <ColorInput value={selected.props.color ?? null} onChange={(v) => updateProps(selected.id, { color: v ?? undefined })} />
                  </Field>
                  <Field label="背景色">
                    <ColorInput
                      value={selected.props.backgroundColor ?? null}
                      onChange={(v) => updateProps(selected.id, { backgroundColor: v ?? undefined })}
                    />
                  </Field>
                  <div className="flex items-center gap-4">
                    <label className="flex items-center gap-1">
                      <input type="checkbox" checked={!!selected.props.bold} onChange={(e) => updateProps(selected.id, { bold: e.target.checked })} />
                      太字
                    </label>
                    <select
                      value={selected.props.align ?? "center"}
                      onChange={(e) => updateProps(selected.id, { align: e.target.value as ElementProps["align"] })}
                      className="rounded border border-black/20 bg-transparent px-2 py-1 dark:border-white/20"
                    >
                      <option value="left">左寄せ</option>
                      <option value="center">中央</option>
                      <option value="right">右寄せ</option>
                    </select>
                  </div>
                </>
              )}

              {selected.type === "button" && (
                <Field label="押したときの動作">
                  <select
                    value={selected.props.action?.type === "navigate" ? selected.props.action.to : ""}
                    onChange={(e) =>
                      updateProps(selected.id, {
                        action: e.target.value ? { type: "navigate", to: e.target.value } : { type: "none" },
                      })
                    }
                    className="w-full rounded border border-black/20 bg-transparent px-2 py-1 dark:border-white/20"
                  >
                    <option value="">何もしない</option>
                    {NAVIGATION_TARGETS.map((t) => (
                      <option key={t.to} value={t.to}>
                        「{t.label}」へ移動
                      </option>
                    ))}
                  </select>
                </Field>
              )}

              {selected.type === "image" && (
                <>
                  <Field label="画像">
                    <ImageInput
                      path={selected.props.imagePath ?? null}
                      onUpload={(f) => onUpload(f, (path) => updateProps(selected.id, { imagePath: path }))}
                      onClear={() => updateProps(selected.id, { imagePath: undefined })}
                    />
                  </Field>
                  <Field label="収め方">
                    <select
                      value={selected.props.fit ?? "contain"}
                      onChange={(e) => updateProps(selected.id, { fit: e.target.value as ElementProps["fit"] })}
                      className="w-full rounded border border-black/20 bg-transparent px-2 py-1 dark:border-white/20"
                    >
                      <option value="contain">全体を収める</option>
                      <option value="cover">枠を埋める（はみ出しは切り取り）</option>
                      <option value="fill">枠に合わせて伸ばす</option>
                    </select>
                  </Field>
                </>
              )}

              {selected.type === "widget" && (
                <p className="text-xs opacity-70">
                  この領域には、ゲームの画面の中身（一覧やボタンなど）が表示されます。位置と大きさを調整できます。中身が収まらないときはスクロールします。
                </p>
              )}
            </section>
          )}
        </aside>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block space-y-1">
      <span className="block text-xs opacity-70">{label}</span>
      {children}
    </label>
  );
}

function NumberInput({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <input
      type="number"
      value={Math.round(value)}
      onChange={(e) => onChange(Number(e.target.value) || 0)}
      className="w-full rounded border border-black/20 bg-transparent px-2 py-1 dark:border-white/20"
    />
  );
}

function ColorInput({ value, onChange }: { value: string | null; onChange: (v: string | null) => void }) {
  return (
    <div className="flex items-center gap-2">
      <input type="color" value={value ?? "#ffffff"} onChange={(e) => onChange(e.target.value)} className="h-8 w-12" />
      <input
        type="text"
        value={value ?? ""}
        placeholder="なし"
        onChange={(e) => onChange(e.target.value || null)}
        className="w-full rounded border border-black/20 bg-transparent px-2 py-1 dark:border-white/20"
      />
      {value && (
        <button type="button" onClick={() => onChange(null)} className="shrink-0 text-xs underline">
          なし
        </button>
      )}
    </div>
  );
}

function ImageInput({
  path,
  onUpload,
  onClear,
}: {
  path: string | null;
  onUpload: (file: File | undefined) => void;
  onClear: () => void;
}) {
  const url = publicImageUrl(path);
  return (
    <div className="space-y-2">
      {url && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={url} alt="" className="max-h-32 rounded border border-black/10 object-contain dark:border-white/15" />
      )}
      <input type="file" accept="image/*" onChange={(e) => onUpload(e.target.files?.[0])} className="block w-full text-xs" />
      {path && (
        <div className="flex items-center justify-between gap-2 text-xs opacity-70">
          <span className="truncate">{path}</span>
          <button type="button" onClick={onClear} className="shrink-0 underline">
            外す
          </button>
        </div>
      )}
    </div>
  );
}
