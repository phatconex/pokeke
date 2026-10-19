// Pokédex: loài đã gặp / đã bắt, và phần thưởng theo số loài đã bắt.
import { POKEMON } from '../data/pokemon';
import type { GameState } from './state';
import type { ItemId } from './items';
import { t, tr } from '../i18n';

export interface DexReward {
  /** số loài đã bắt cần đạt */
  caught: number;
  label: string;
  /** nhãn tiếng Anh */
  labelEn: string;
  items?: Partial<Record<ItemId, number>>;
  money?: number;
}

export const DEX_REWARDS: DexReward[] = [
  { caught: 10, label: '5 Great Ball', labelEn: '5 Great Balls', items: { greatball: 5 } },
  { caught: 20, label: 'Đá Lửa + Đá Nước', labelEn: 'Fire + Water Stone', items: { fireStone: 1, waterStone: 1 } },
  // (tiền thưởng trước: 3.000 / 15.000 / 20.000₽)
  { caught: 30, label: '2.000₽ + 5 Thuốc', labelEn: '2,000₽ + 5 Potions', money: 2000, items: { potion: 5 } },
  { caught: 45, label: 'Đá Lá + Đá Sấm + Đá Trăng', labelEn: 'Leaf/Thunder/Moon Stone', items: { leafStone: 1, thunderStone: 1, moonStone: 1 } },
  { caught: 60, label: '5 Ultra Ball', labelEn: '5 Ultra Balls', items: { ultraball: 5 } },
  { caught: 80, label: '9.000₽', labelEn: '9,000₽', money: 9000 },
  { caught: 100, label: '10 Ultra Ball + 12.000₽', labelEn: '10 Ultra Balls + 12,000₽', items: { ultraball: 10 }, money: 12000 },
];

/** Nhãn phần thưởng theo ngôn ngữ đang chọn */
export const rewardLabel = (r: DexReward) => tr(r.labelEn, r.label);

export function dexOf(game: GameState) {
  if (!game.dex) game.dex = { seen: [], caught: [], claimed: [] };
  return game.dex;
}

export function markSeen(game: GameState | null, id: string) {
  if (!game || !POKEMON[id]) return;
  const d = dexOf(game);
  if (!d.seen.includes(id)) d.seen.push(id);
}

export function markCaught(game: GameState | null, id: string) {
  if (!game || !POKEMON[id]) return;
  const d = dexOf(game);
  if (!d.seen.includes(id)) d.seen.push(id);
  if (!d.caught.includes(id)) d.caught.push(id);
}

/** tổng số loài trong game (mẫu số của Pokédex) */
export function dexTotal() {
  return Object.keys(POKEMON).length;
}

/** Nhận thưởng mốc i; trả về lý do nếu không nhận được */
export function claimDexReward(game: GameState, i: number): string | null {
  const r = DEX_REWARDS[i];
  const d = dexOf(game);
  if (!r) return t('dex.errNone');
  if (d.claimed.includes(i)) return t('dex.errClaimed');
  if (d.caught.length < r.caught) return t('dex.errNeed', { n: r.caught });
  d.claimed.push(i);
  if (r.money) game.money += r.money;
  for (const [k, v] of Object.entries(r.items ?? {})) game.items[k as ItemId] = (game.items[k as ItemId] ?? 0) + (v ?? 0);
  return null;
}
