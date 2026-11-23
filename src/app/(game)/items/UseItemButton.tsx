"use client";

import { useState, useTransition } from "react";
import { applyFieldItemAction } from "./actions";

export function UseItemButton({ itemId, name }: { itemId: number; name: string }) {
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  return (
    <div className="shrink-0 text-right">
      <button
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            const res = await applyFieldItemAction(itemId);
            setMessage(res.error ?? `${name} を使った`);
          })
        }
        className="rounded-md border border-emerald-600 px-3 py-1.5 text-sm text-emerald-700 disabled:opacity-50 dark:text-emerald-400"
      >
        使う
      </button>
      {message && <p className="mt-1 text-xs opacity-80">{message}</p>}
    </div>
  );
}
