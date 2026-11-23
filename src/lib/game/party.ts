/**
 * パーティ編成の枠番号の定義。
 * DB の player_monsters.party_slot と対応する（NULL は控え）。
 */
export const BATTLE_SLOTS = [1, 2, 3, 4] as const;
export const STANDBY_SLOTS = [5, 6, 7, 8] as const;

export type PartyRole = "battle" | "standby" | "box";

export function roleOfSlot(slot: number | null): PartyRole {
  if (slot === null) return "box";
  if ((BATTLE_SLOTS as readonly number[]).includes(slot)) return "battle";
  if ((STANDBY_SLOTS as readonly number[]).includes(slot)) return "standby";
  throw new Error(`不正な枠番号: ${slot}`);
}
