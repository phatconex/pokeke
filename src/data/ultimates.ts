// Tuyệt chiêu (phím I): mỗi Pokémon tích năng lượng khi đánh trúng / hạ địch / bị đánh.
// Đầy thanh thì tung tuyệt chiêu theo hệ chính của loài, có cảnh cắt (cut-in) và hiệu ứng toàn sân.
import type { HazardFx } from './hazards';
import type { StatusKind } from './moveKit';
import type { PokemonType } from './types';

export interface UltimateDef {
  name: string;
  desc: string;
  /**
   * storm: giáng đòn xuống từng địch trên sân (mỗi con `hits` lần) ·
   * wave: sóng lan từ người dùng ra toàn sân, đẩy văng cực mạnh ·
   * nova: nổ lớn quanh người + hồi máu cho bản thân
   */
  pattern: 'storm' | 'wave' | 'nova';
  /** hệ số sát thương (× sức mạnh người dùng) */
  power: number;
  hits?: number;
  status?: { kind: StatusKind; chance: number; ms: number };
  /** hồi % máu tối đa cho người dùng (nova) */
  heal?: number;
  fx: HazardFx;
}

export const ULTIMATES: Record<PokemonType, UltimateDef> = {
  electric: { name: 'Bão Sét Vạn Vôn', desc: 'Sét giáng 2 lần xuống mọi địch trên sân, gây Tê liệt.', pattern: 'storm', power: 34, hits: 2, status: { kind: 'paralyze', chance: 1, ms: 1600 }, fx: 'lightning' },
  fire: { name: 'Mưa Thiên Thạch Lửa', desc: 'Thiên thạch lửa rơi khắp sân, đốt cháy mọi địch.', pattern: 'storm', power: 38, hits: 2, status: { kind: 'burn', chance: 1, ms: 4000 }, fx: 'flame' },
  water: { name: 'Đại Hồng Thủy', desc: 'Sóng thần quét toàn sân, đẩy văng mọi địch.', pattern: 'wave', power: 60, fx: 'water' },
  grass: { name: 'Rừng Gai Nguyên Sinh', desc: 'Gai rừng trồi lên dưới chân mọi địch, gieo hạt hút máu.', pattern: 'storm', power: 30, hits: 2, status: { kind: 'seed', chance: 1, ms: 5000 }, fx: 'spore' },
  bug: { name: 'Bầy Côn Trùng', desc: 'Bầy côn trùng tràn ra khắp sân, cắn mọi địch.', pattern: 'wave', power: 54, status: { kind: 'poison', chance: 0.6, ms: 3000 }, fx: 'spore' },
  poison: { name: 'Biển Độc', desc: 'Độc dâng ngập sân, mọi địch Nhiễm độc nặng.', pattern: 'storm', power: 26, hits: 2, status: { kind: 'poison', chance: 1, ms: 5000 }, fx: 'poison' },
  flying: { name: 'Cuồng Phong', desc: 'Lốc xoáy cuốn sạch sân đấu, đẩy văng và gây Rối loạn.', pattern: 'wave', power: 56, status: { kind: 'confuse', chance: 1, ms: 2200 }, fx: 'ice' },
  rock: { name: 'Mưa Thiên Thạch', desc: 'Đá tảng rơi xuống mọi địch, gây choáng.', pattern: 'storm', power: 40, hits: 2, status: { kind: 'paralyze', chance: 0.6, ms: 1000 }, fx: 'rock' },
  ground: { name: 'Đại Địa Chấn', desc: 'Động đất xé toạc cả sân đấu.', pattern: 'wave', power: 64, status: { kind: 'paralyze', chance: 0.5, ms: 900 }, fx: 'rock' },
  psychic: { name: 'Ngưng Đọng Thời Gian', desc: 'Siêu năng lực đè ép mọi địch, gây Rối loạn dài.', pattern: 'storm', power: 32, hits: 2, status: { kind: 'confuse', chance: 1, ms: 3000 }, fx: 'psychic' },
  fighting: { name: 'Bách Liệt Quyền', desc: 'Nổ quyền lực quanh người, hồi 25% máu.', pattern: 'nova', power: 70, heal: 0.25, status: { kind: 'paralyze', chance: 0.7, ms: 1000 }, fx: 'rock' },
  ghost: { name: 'Bóng Đêm Vĩnh Cửu', desc: 'Bóng ma vồ lấy mọi địch, gây Rối loạn.', pattern: 'storm', power: 34, hits: 2, status: { kind: 'confuse', chance: 1, ms: 2400 }, fx: 'shadow' },
  ice: { name: 'Kỷ Băng Hà', desc: 'Bão tuyết đóng băng mọi địch trên sân.', pattern: 'storm', power: 30, hits: 2, status: { kind: 'freeze', chance: 1, ms: 2600 }, fx: 'ice' },
  dragon: { name: 'Long Tinh Quần', desc: 'Sao băng rồng rơi khắp sân với sức hủy diệt.', pattern: 'storm', power: 44, hits: 2, fx: 'flame' },
  normal: { name: 'Siêu Phá Hủy', desc: 'Nổ năng lượng thuần cực lớn quanh người, hồi 20% máu.', pattern: 'nova', power: 76, heal: 0.2, fx: 'rock' },
};

/**
 * Năng lượng tuyệt chiêu nhận được (0..1). Mục tiêu ≈ 1 tuyệt chiêu mỗi ải thường, 1–2 mỗi trận hội quán.
 * (trước: mọi đòn trúng 0.018, hạ địch 0.06, bị đánh 0.04, liên hoàn 0.02 mọi ô)
 */
export const ULT_GAIN = {
  /** mỗi đòn K/L/U trúng địch (nhịp nhỏ quiet ×0.3). J trúng KHÔNG tích */
  hit: 0.016,
  /** hạ một địch thường */
  kill: 0.02,
  /** hạ Pokémon của huấn luyện viên (hội quán...) */
  trainerKill: 0.08,
  /** hạ boss (đầu đàn lớn / boss của ải) */
  bossKill: 0.15,
  /** bị trúng đòn */
  hurt: 0.03,
  /** mỗi bậc liên hoàn từ ×3 trở lên – chỉ khi bậc đó do K/L/U */
  combo: 0.02,
} as const;

/** Nhịp tuyệt chiêu */
export const ULT_PACING = {
  /** sau mỗi lần tung: khóa ít nhất ms này (thanh vẫn tích được, ô I hiện đếm ngược). Skill Lab bỏ qua */
  cooldownMs: 40000,
  /** không gây sát thương quá decayAfterMs thì thanh giảm decayPerSec mỗi giây */
  decayAfterMs: 6000,
  decayPerSec: 0.01,
  /** hệ số sát thương tuyệt chiêu (bù cho việc hiếm hơn) */
  powerMult: 1.3,
} as const;

// Tuyệt chiêu riêng theo loài (trình diễn khác, giữ tên/sức mạnh/trạng thái của hệ): skills/kits.ts → SPECIES_KITS[id].ult


export function ultimateFor(types: PokemonType[]): UltimateDef {
  return ULTIMATES[types[0]] ?? ULTIMATES.normal;
}
