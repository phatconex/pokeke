// Khuôn sân đấu tự vẽ của từng chương (gym, Tứ Thiên Vương, ải đặc biệt).
import type { ArenaLayout, Rect } from '../../data/hazards';

export type RGB = [number, number, number];
export type BaseBiome = 'forest' | 'cave' | 'beach' | 'volcano' | 'snow' | 'blossom';

/** kích thước bản thiết kế gốc của mọi sân (toạ độ cũ trong art/chapters đều theo khung này) */
export const DESIGN_W = 640;
export const DESIGN_H = 360;

/** Bút vẽ sân W×H px (hiển thị ×2). Màu dạng RGB [r,g,b]; hex(0xrrggbb) đổi số sang RGB. */
export interface ArenaPainter {
  /** kích thước thật của sân (vd 960×540 ải thường, 800×450 trận huấn luyện viên) */
  W: number;
  H: number;
  set(x: number, y: number, c: RGB, alpha?: number): void;
  disc(cx: number, cy: number, r: number, c: RGB, alpha?: number): void;
  rect(x: number, y: number, w: number, h: number, c: RGB, alpha?: number): void;
  hex(c: number): RGB;
  /** số ngẫu nhiên 0..1 cố định theo seed (hình giống nhau mỗi lần) */
  rng(): number;
  /** nhiễu mượt 0..1, gọi với toạ độ đã chia tỉ lệ (vd x/18) */
  noise(x: number, y: number): number;
  /**
   * Vẽ nền một biome có sẵn (sàn, chi tiết, viền). props = true thì vẽ cả 3 vật cản nhỏ
   * (khi đó layout phải có basePropSolids(f)).
   */
  paintBase(biome: BaseBiome, props?: boolean): void;
}

/**
 * Khung sân: đổi toạ độ thiết kế 640×360 sang sân thật W×H.
 * Dải mép (≤ EDGE px tính từ tường) giữ nguyên khoảng cách tới tường; phần giữa giãn đều.
 */
export interface ArenaFrame {
  W: number;
  H: number;
  /** toạ độ x / y thiết kế → thật */
  x(dx: number): number;
  y(dy: number): number;
  /** vật thể (thùng, cột, cây...): tâm dời theo khung, kích thước giữ nguyên */
  obj<T extends Rect>(r: T): T;
  /** vùng (hồ, thảm, sàn bẫy...): hai góc dời theo khung → giãn theo sân */
  area<T extends Rect>(r: T): T;
  /** điểm xuất phát trận huấn luyện viên: người chơi (trái) / Pokémon đối thủ (phải) */
  startL: { x: number; y: number };
  startR: { x: number; y: number };
}

export const FRAME_EDGE = 48;

export function makeFrame(W: number, H: number): ArenaFrame {
  const E = FRAME_EDGE;
  const map = (d: number, D: number, S: number) => {
    if (S === D) return d;
    if (d <= E) return d;
    if (d >= D - E) return S - (D - d);
    return E + ((d - E) * (S - 2 * E)) / (D - 2 * E);
  };
  const x = (dx: number) => map(dx, DESIGN_W, W);
  const y = (dy: number) => map(dy, DESIGN_H, H);
  return {
    W,
    H,
    x,
    y,
    obj: <T extends Rect>(r: T): T => ({ ...r, x: Math.round(x(r.x + r.w / 2) - r.w / 2), y: Math.round(y(r.y + r.h / 2) - r.h / 2) }),
    area: <T extends Rect>(r: T): T => {
      const x0 = Math.round(x(r.x));
      const y0 = Math.round(y(r.y));
      return { ...r, x: x0, y: y0, w: Math.round(x(r.x + r.w)) - x0, h: Math.round(y(r.y + r.h)) - y0 };
    },
    startL: { x: Math.round(W / 2 - 200), y: Math.round(H / 2 + 10) },
    startR: { x: Math.round(W / 2 + 200), y: Math.round(H / 2 + 10) },
  };
}

/** Sân tự vẽ: dựng theo khung (kích thước thật) → hàm vẽ + layout (vật cản, bẫy) khớp hình vẽ */
export type ArenaDef = (f: ArenaFrame) => { draw(p: ArenaPainter): void; layout: ArenaLayout };
