"use client";

import { StarterPicker, type StarterOption } from "@/components/StarterPicker";
import { chooseStarterAction } from "../actions";

export function StarterChoice({ options }: { options: StarterOption[] }) {
  return <StarterPicker options={options} onChoose={(id) => chooseStarterAction(id, "/")} />;
}
