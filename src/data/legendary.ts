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
}

export const LEGENDARY: Record<string, LegendDef> = {
  mewtwo: { energyMax: 150, regenPerSec: 12, ultCooldownMs: 22000, ultChargeMult: 1.6, shieldEveryMs: 12000, levitate: 10, colors: [0x3a5aff, 0x7a2aff, 0xc030ff, 0xff40c8] },
};

export const legendOf = (speciesId: string | undefined): LegendDef | undefined => (speciesId ? LEGENDARY[speciesId] : undefined);
