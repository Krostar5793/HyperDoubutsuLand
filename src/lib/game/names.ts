import type { Stat } from "./growth";

export const STAT_LABELS: Record<Stat, string> = {
  hp: "HP",
  mp: "MP",
  atk: "攻撃",
  def: "防御",
  int: "賢さ",
  spd: "素早さ",
};

export const SLOT_LABEL = (slot: number | null, inStorage = false) => {
  if (inStorage) return "預り所";
  if (slot === null) return "控え";
  return slot <= 4 ? `バトル ${slot}` : `スタンバイ ${slot - 4}`;
};
