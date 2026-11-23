"use client";

import { useEffect, useState } from "react";
import { STAGE } from "@/lib/ui/types";

/**
 * 1280×720 の画面を、ウィンドウに収まるように拡大・縮小して中央に表示する（余白は黒帯）。
 * スマホを縦向きで持っているときは、横向きにするよう案内する。
 */
export function Stage({ children }: { children: React.ReactNode }) {
  const [scale, setScale] = useState(0);
  const [portraitTouch, setPortraitTouch] = useState(false);

  useEffect(() => {
    const update = () => {
      setScale(Math.min(window.innerWidth / STAGE.width, window.innerHeight / STAGE.height));
      const coarse = window.matchMedia("(pointer: coarse)").matches;
      setPortraitTouch(coarse && window.innerHeight > window.innerWidth);
    };
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  return (
    <div className="fixed inset-0 flex items-center justify-center overflow-hidden bg-black">
      <div style={{ width: STAGE.width * scale, height: STAGE.height * scale, visibility: scale ? "visible" : "hidden" }}>
        <div
          className="relative origin-top-left overflow-hidden bg-[var(--stage-bg)] text-[var(--stage-fg)]"
          style={{ width: STAGE.width, height: STAGE.height, transform: `scale(${scale})` }}
        >
          {children}
        </div>
      </div>
      {portraitTouch && (
        <div className="absolute inset-0 z-50 flex flex-col items-center justify-center gap-3 bg-black/90 p-6 text-center text-white">
          <div className="text-4xl" aria-hidden>
            ⟳
          </div>
          <p className="text-lg font-bold">端末を横向きにしてください</p>
          <p className="text-sm opacity-80">このゲームは横向きで遊ぶように作られています</p>
        </div>
      )}
    </div>
  );
}
