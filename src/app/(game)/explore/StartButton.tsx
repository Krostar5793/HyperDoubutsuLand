"use client";

import { useState, useTransition } from "react";
import { startExpeditionAction } from "./actions";

export function StartButton({ areaId }: { areaId: number }) {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  return (
    <div className="shrink-0 text-right">
      <button
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            const res = await startExpeditionAction(areaId);
            if (res?.error) setError(res.error);
          })
        }
        className="rounded-md bg-emerald-600 px-4 py-2 font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
      >
        出発
      </button>
      {error && <p className="mt-2 max-w-48 text-xs text-red-600">{error}</p>}
    </div>
  );
}
