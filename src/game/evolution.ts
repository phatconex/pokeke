// Tiến độ tiến hóa của một Pokémon trong đội: dùng chung cho HUD trận, màn kết quả, Đội hình, Pokédex.
// - 'ready'        : đã đủ cấp → tiến hóa sau trận
// - 'soon'         : còn ≤ 2 cấp
// - 'far'          : còn > 2 cấp
// - 'capped'       : cấp tiến hóa cao hơn giới hạn cấp chung
// - 'item-ready'   : tiến hóa bằng đá và đang có đá
// - 'item-missing' : tiến hóa bằng đá nhưng chưa có
// - 'final'        : không tiến hóa nữa
import { levelCapFor } from '../config/balance';
import { evolutionsOf, POKEMON } from '../data/pokemon';
import type { GameState, PartyMember } from './state';
import { xpToNext } from './state';

export type EvoState = 'ready' | 'soon' | 'far' | 'capped' | 'item-ready' | 'item-missing' | 'final';

export interface EvoStatus {
  state: EvoState;
  /** loài sẽ tiến hóa thành (nhánh được chọn để hiển thị) */
  into?: string;
  /** cấp tiến hóa (tiến hóa theo cấp) */
  level?: number;
  /** đá tiến hóa (tiến hóa bằng vật phẩm) */
  item?: string;
  /** số cấp còn thiếu (0 nếu đã đủ / không theo cấp) */
  levelsLeft: number;
  cap: number;
  /** 0..1: tiến độ từ cấp đầu của dạng này tới cấp tiến hóa (đá: 1 nếu có đá, 0 nếu không) */
  progress: number;
}

/** số cấp còn thiếu để tiến hóa theo cấp (null = không tiến hóa theo cấp) */
export function levelsToEvolve(m: PartyMember): number | null {
  const lv = evolutionsOf(POKEMON[m.speciesId]).filter((e) => e.level).map((e) => e.level!);
  if (!lv.length) return null;
  return Math.max(0, Math.min(...lv) - m.level);
}

/** cấp mà loài này bắt đầu (cấp tiến hóa từ dạng trước; không có thì 1) */
function startLevel(speciesId: string): number {
  for (const sp of Object.values(POKEMON)) {
    const e = evolutionsOf(sp).find((x) => x.into === speciesId && x.level);
    if (e?.level) return e.level;
  }
  return 1;
}

const RANK: Record<EvoState, number> = { ready: 0, 'item-ready': 1, soon: 2, capped: 3, far: 4, 'item-missing': 5, final: 6 };

export function evoStatus(m: PartyMember, game: GameState | null, cap = levelCapFor(game?.badges.length ?? 0)): EvoStatus {
  const evos = evolutionsOf(POKEMON[m.speciesId]);
  if (!evos.length) return { state: 'final', levelsLeft: 0, cap, progress: 1 };
  const opts: EvoStatus[] = evos.map((e) => {
    if (e.level) {
      const left = Math.max(0, e.level - m.level);
      const base = Math.min(startLevel(m.speciesId), e.level - 1);
      const frac = m.level >= e.level ? 1 : (m.level - base + Math.min(1, m.xp / xpToNext(m.level))) / (e.level - base);
      const state: EvoState = left === 0 ? 'ready' : e.level > cap ? 'capped' : left <= 2 ? 'soon' : 'far';
      return { state, into: e.into, level: e.level, levelsLeft: left, cap, progress: Math.max(0, Math.min(1, frac)) };
    }
    const have = !!e.item && (game?.items[e.item as keyof GameState['items']] ?? 0) > 0;
    return { state: have ? 'item-ready' : 'item-missing', into: e.into, item: e.item, levelsLeft: 0, cap, progress: have ? 1 : 0 };
  });
  return opts.sort((a, b) => RANK[a.state] - RANK[b.state])[0];
}

/** đáng gắn huy hiệu ✨ (sắp / sẵn sàng tiến hóa) */
export function evoHighlight(s: EvoStatus): boolean {
  return s.state === 'ready' || s.state === 'soon' || s.state === 'item-ready';
}
