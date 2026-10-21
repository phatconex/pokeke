// Hình chiêu theo TÊN / LOẠI của từng chiêu (không theo ô): chiêu tên gì thì ra hiệu ứng đúng thế.
// Tầng 1 (mặc định theo loại chiêu) nằm ở đây; tầng 2 (công thức theo tên chiêu) và 3 (ghi đè theo loài) ở signatureMoves.ts.
import type { MoveDef } from '../data/moveKit';
import { TYPE_COLOR } from '../data/types';
import { type Entry, S, SIGNATURE, SPECIES_SIGNATURE } from './signatureMoves';

/** bỏ tiền tố chương: ch5_xxx / evo_xxx / league_xxx */
const baseId = (id: string) => id.replace(/^(ch\d+|evo|league)_/, '');

/**
 * Ánh xạ một chiêu → khuôn hiển thị (null = giữ cách xử lý gốc của chiêu).
 * size: 1 = dạng gốc, 2 = giữa, 3 = cuối (to hơn, rộng hơn). speciesId: để áp ghi đè theo loài (tầng 3).
 */
export function moveVisual(m: MoveDef, size: number, speciesId?: string): Entry | null {
  const id = baseId(m.id);
  const d = m.type as string;
  const col = TYPE_COLOR[m.type];
  const sz = Math.max(1, Math.min(3, size));
  const ctx = { m, id, d, col, sz };
  // tầng 3 → tầng 2
  const own = speciesId ? SPECIES_SIGNATURE[`${speciesId}:${id}`] : undefined;
  if (own) return own(ctx);
  const rec = SIGNATURE[id];
  if (rec) return rec(ctx);
  if (m.kind === 'buff') return null;

  // tầng 1: mặc định theo loại chiêu
  if (m.kind === 'projectile') return S('bolt', { dialect: d, scale: 0.8 + sz * 0.2, split: sz >= 3 ? 2 : 1, splitSpreadDeg: 10, splitPowerMult: 0.6 });
  if (m.kind === 'burst') return S('nova', { dialect: d, pulses: sz >= 2 ? 2 : 1, pulseGapMs: 260 });
  // cone = cận chiến phía trước: lao + chém/cắn/đấm
  return S('dashStrike', { dialect: d, dashMs: 130 - sz * 8, trailCount: 1 + (sz >= 2 ? 1 : 0), streaks: true, lungeMult: 1 + sz * 0.15 });
}
