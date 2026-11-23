"use client";

export type Guide = { key: string; title: string; body: string };

/** ガイドの吹き出し。ステージ全体に重ねて表示する */
export function GuideModal({ guide, onClose, buttonLabel = "次へ" }: { guide: Guide; onClose: () => void; buttonLabel?: string }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-8">
      <div role="dialog" aria-modal="true" aria-labelledby="guide-title" className="w-[640px] max-w-full rounded-2xl bg-white p-6 text-neutral-900 shadow-xl dark:bg-neutral-900 dark:text-neutral-100">
        <div className="text-sm font-semibold text-emerald-700 dark:text-emerald-400">ガイド</div>
        <h2 id="guide-title" className="mt-1 text-2xl font-bold">
          {guide.title}
        </h2>
        <p className="mt-3 whitespace-pre-wrap text-lg leading-relaxed">{guide.body}</p>
        <div className="mt-5 text-right">
          <button autoFocus onClick={onClose} className="rounded-md bg-emerald-600 px-6 py-2 text-lg font-semibold text-white hover:bg-emerald-700">
            {buttonLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
