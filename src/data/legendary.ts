// Đặc quyền HUYỀN THOẠI (dữ liệu, dùng lại cho mọi huyền thoại sau này – chỉ thêm một mục):
// thanh năng lượng lớn + hồi nhanh, tuyệt chiêu luôn mở + nạp nhanh + hồi ngắn, hào quang lơ lửng, lá chắn lục giác tự động.
// (HP / Tấn công / giảm hồi chiêu nằm ở base của loài và bảng TRAITS trong data/stats.ts.)
export interface LegendDef {
  energyMax: number;
  /** năng lượng hồi mỗi giây (thường 8) */
  regenPerSec: number;
  /** hồi tuyệt chiêu (ms, thường 40000) và hệ số nạp tuyệt chiêu */
  ultCooldownMs: number;
  ultChargeMult: number;
  /** lá chắn tự động hấp thụ 1 đòn mỗi shieldEveryMs (0 = không có) */
  shieldEveryMs: number;
  /** độ lơ lửng cách đất (px) */
  levitate: number;
  /** màu hào quang / lá chắn */
  colors: number[];
  /** hạt hào quang (texture puff) */
  puff?: string;
  /** kiểu chắn tự động: 'hex' (lục giác, đẩy lùi) · 'flame' (áo lửa: đốt kẻ ở gần) */
  shield?: 'hex' | 'flame' | 'thunder' | 'frost';
  /** Tái sinh: 1 lần mỗi trận, khi bị hạ → hồi tỉ lệ máu này + đốt địch quanh */
  rebirth?: number;
  /** càng ít máu đòn càng mạnh: + tối đa tỉ lệ này khi máu sắp hết */
  lowHpBonus?: number;
  /** Tích điện (Zapdos): đi/lướt đầy thanh → chiêu K/L/U kế tiếp miễn phí + hồi chiêu giảm nửa */
  staticCharge?: boolean;
  /** Sương giá (Articuno): đòn Băng có tỉ lệ này làm địch kế bên cũng Lạnh +1 */
  frostSpread?: number;
}

export const LEGENDARY: Record<string, LegendDef> = {
  mewtwo: { energyMax: 150, regenPerSec: 12, ultCooldownMs: 22000, ultChargeMult: 1.6, shieldEveryMs: 12000, levitate: 10, colors: [0x3a5aff, 0x7a2aff, 0xc030ff, 0xff40c8] },
  moltres: { energyMax: 140, regenPerSec: 11, ultCooldownMs: 24000, ultChargeMult: 1.5, shieldEveryMs: 13000, levitate: 12, colors: [0xff3a1a, 0xff7a2a, 0xffb02a, 0xffe070], puff: 'flamepuff', shield: 'flame', rebirth: 0.4, lowHpBonus: 0.3 },
  zapdos: { energyMax: 150, regenPerSec: 14, ultCooldownMs: 22000, ultChargeMult: 1.6, shieldEveryMs: 12000, levitate: 12, colors: [0xffe04a, 0xffffff, 0xfff08a], puff: 'spark', shield: 'thunder', staticCharge: true },
  articuno: { energyMax: 140, regenPerSec: 10, ultCooldownMs: 26000, ultChargeMult: 1.4, shieldEveryMs: 14000, levitate: 12, colors: [0x7af0ff, 0xd49aff, 0xffffff], puff: 'snowdot', shield: 'frost', frostSpread: 0.2 },
};

export const legendOf = (speciesId: string | undefined): LegendDef | undefined => (speciesId ? LEGENDARY[speciesId] : undefined);
