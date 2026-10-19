// Sân đấu tự vẽ của Liên đoàn Indigo: Đường Chiến Thắng, Cao nguyên Indigo, 4 sảnh Tứ Thiên Vương,
// phòng Nhà vô địch và Hang Cerulean. Toạ độ hằng số theo bản thiết kế 640×360; mỗi sân dựng hình học
// một lần từ khung (ArenaFrame) rồi dùng chung cho cả hình vẽ lẫn layout, nên va chạm luôn khớp với hình.
// Điểm xuất phát trận huấn luyện viên: f.startL / f.startR.
import type { Rect, Solid } from '../../data/hazards';
import type { ArenaDef, ArenaFrame, ArenaPainter, RGB } from './types';
import { DESIGN_H, DESIGN_W, FRAME_EDGE } from './types';

/** độ dày tường viền */
const WALL = 22;
const INSET = 24;
const BLACK: RGB = [0, 0, 0];
const WHITE: RGB = [255, 255, 255];

// ======================================================================= tiện ích vẽ
const cl = (v: number) => Math.max(0, Math.min(255, Math.round(v)));
const hx = (n: number): RGB => [(n >> 16) & 255, (n >> 8) & 255, n & 255];
const shade = (c: RGB, k: number): RGB => [cl(c[0] * k), cl(c[1] * k), cl(c[2] * k)];
const mix = (a: RGB, b: RGB, t: number): RGB => [cl(a[0] + (b[0] - a[0]) * t), cl(a[1] + (b[1] - a[1]) * t), cl(a[2] + (b[2] - a[2]) * t)];
const edgeDist = (x: number, y: number, W: number, H: number) => Math.min(x, y, W - 1 - x, H - 1 - y);
/** hệ số diện tích so với sân gốc 640×360 (giữ mật độ chi tiết rải ngẫu nhiên) */
const areaK = (p: ArenaPainter) => (p.W * p.H) / (DESIGN_W * DESIGN_H);
/** toạ độ thật → toạ độ thiết kế (nghịch đảo của f.x / f.y) */
const unmap = (v: number, D: number, S: number) => {
  const E = FRAME_EDGE;
  if (S === D || v <= E) return v;
  if (v >= S - E) return D - (S - v);
  return E + ((v - E) * (D - 2 * E)) / (S - 2 * E);
};
/** n vị trí rải đều trên đoạn [a, b] (giữa mỗi ô) */
const slots = (a: number, b: number, spacing: number, min = 1) => {
  const n = Math.max(min, Math.round((b - a) / spacing));
  return Array.from({ length: n }, (_, i) => Math.round(a + ((i + 0.5) * (b - a)) / n));
};
/** bốn góc trong sân (đèn/chậu than góc) */
const corners = (W: number, H: number, d = 34): [number, number][] => [[d, d], [W - d, d], [d, H - d], [W - d, H - d]];
/** băm số nguyên ổn định (chọn màu gạch...) */
const hsh = (a: number, b: number) => {
  let h = (Math.imul(a, 374761393) + Math.imul(b, 668265263)) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return (h ^ (h >>> 16)) >>> 0;
};

/** tô toàn sân theo hàm màu (null = giữ nguyên) */
function fill(p: ArenaPainter, fn: (x: number, y: number) => RGB | null) {
  for (let y = 0; y < p.H; y++) for (let x = 0; x < p.W; x++) {
    const c = fn(x, y);
    if (c) p.set(x, y, c);
  }
}

function ellipse(p: ArenaPainter, cx: number, cy: number, rx: number, ry: number, c: RGB, a = 1) {
  for (let y = Math.floor(cy - ry); y <= cy + ry; y++) for (let x = Math.floor(cx - rx); x <= cx + rx; x++) {
    if (((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 <= 1) p.set(x, y, c, a);
  }
}

/** vành elip dày t px */
function ellipseRing(p: ArenaPainter, cx: number, cy: number, rx: number, ry: number, t: number, c: RGB | ((x: number, y: number) => RGB), a = 1) {
  for (let y = Math.floor(cy - ry - 1); y <= cy + ry + 1; y++) for (let x = Math.floor(cx - rx - 1); x <= cx + rx + 1; x++) {
    const d = Math.hypot((x - cx) / rx, (y - cy) / ry);
    if (d <= 1 && d >= 1 - t / Math.min(rx, ry)) p.set(x, y, typeof c === 'function' ? c(x, y) : c, a);
  }
}

/** điểm (x,y) nằm trong hình chữ nhật bo góc */
function inRound(x: number, y: number, r: Rect, rad: number) {
  if (x < r.x || y < r.y || x >= r.x + r.w || y >= r.y + r.h) return false;
  const cx = Math.max(r.x + rad, Math.min(r.x + r.w - rad, x));
  const cy = Math.max(r.y + rad, Math.min(r.y + r.h - rad, y));
  return (x - cx) ** 2 + (y - cy) ** 2 <= rad * rad;
}

/** đường kẻ 1px */
function line(p: ArenaPainter, x0: number, y0: number, x1: number, y1: number, c: RGB, a = 1, thick = 1) {
  const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0), 1);
  for (let i = 0; i <= n; i++) {
    const x = x0 + ((x1 - x0) * i) / n;
    const y = y0 + ((y1 - y0) * i) / n;
    if (thick <= 1) p.set(x, y, c, a);
    else p.rect(x - thick / 2, y - thick / 2, thick, thick, c, a);
  }
}

/** vết nứt ngẫu nhiên (đường tối + mép sáng) */
function cracks(p: ArenaPainter, n: number, len: number, dark: RGB, light: RGB, avoid?: (x: number, y: number) => boolean) {
  const { W, H } = p;
  n = Math.round(n * areaK(p));
  for (let k = 0; k < n; k++) {
    let x = 50 + p.rng() * (W - 100);
    let y = 50 + p.rng() * (H - 100);
    let a = p.rng() * Math.PI * 2;
    for (let s = 0; s < len; s++) {
      a += (p.rng() - 0.5) * 0.9;
      x += Math.cos(a) * 1.2;
      y += Math.sin(a) * 1.2;
      if (edgeDist(x, y, W, H) < WALL + 2 || avoid?.(x, y)) break;
      p.set(x, y, dark);
      p.set(x, y + 1, light, 0.6);
    }
  }
}

/** tường viền dày WALL px + bóng đổ vào trong sân */
function border(p: ArenaPainter, fn: (x: number, y: number, e: number) => RGB, shadowA = 0.35) {
  const { W, H } = p;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const e = edgeDist(x, y, W, H);
    if (e < WALL) p.set(x, y, fn(x, y, e));
    else if (e < WALL + 6) p.set(x, y, BLACK, ((WALL + 6 - e) / 6) * shadowA);
  }
}

/** gạch xây tường: trả màu viên gạch tại (x,y) */
function brick(x: number, y: number, bw: number, bh: number, light: RGB, dark: RGB, mortar: RGB) {
  const row = Math.floor(y / bh);
  const ox = (row % 2) * (bw / 2);
  const bx = Math.floor((x + ox) / bw);
  const lx = (x + ox) % bw;
  const ly = y % bh;
  if (lx === 0 || ly === 0) return mortar;
  const t = (hsh(bx, row) % 5) / 4;
  let c = mix(dark, light, t * 0.7 + 0.15);
  if (ly === 1) c = shade(c, 1.15);
  if (ly === bh - 1) c = shade(c, 0.82);
  return c;
}

/** bóng đổ của một khối */
function dropShadow(p: ArenaPainter, r: Rect, a = 0.3) {
  p.rect(r.x + 3, r.y + 4, r.w, r.h, BLACK, a);
}

/** vòng xuất phát của hai bên (trận huấn luyện viên) */
function startRings(p: ArenaPainter, f: ArenaFrame, c: RGB) {
  for (const s of [f.startL, f.startR]) {
    ellipseRing(p, s.x, s.y, 34, 21, 3, c, 0.85);
    ellipse(p, s.x, s.y, 30, 18, c, 0.12);
  }
}

/** ngọn đuốc (gắn trên tường) + vầng sáng hắt xuống sàn */
function torch(p: ArenaPainter, x: number, y: number, flame: RGB = [255, 160, 48], glow: RGB = [255, 190, 90]) {
  p.disc(x, y + 14, 18, glow, 0.08);
  p.disc(x, y + 10, 10, glow, 0.1);
  p.rect(x - 1, y + 2, 3, 8, [70, 50, 34]);
  p.rect(x - 3, y + 1, 7, 2, [110, 84, 56]);
  p.disc(x, y - 2, 3.2, flame);
  p.disc(x, y - 3, 1.8, mix(flame, WHITE, 0.6));
  p.set(x, y - 6, flame, 0.8);
}

/** tảng đá tròn: bóng, khối, mảng sáng, vết nứt */
function boulder(p: ArenaPainter, cx: number, cy: number, r: number, c: RGB) {
  ellipse(p, cx + 3, cy + r * 0.6, r * 1.05, r * 0.45, BLACK, 0.35);
  p.disc(cx, cy, r, shade(c, 0.55));
  p.disc(cx - 0.5, cy - 1, r - 1.5, c);
  p.disc(cx + r * 0.25, cy + r * 0.25, r * 0.55, shade(c, 0.85), 0.7);
  p.disc(cx - r * 0.3, cy - r * 0.35, r * 0.48, shade(c, 1.18));
  p.disc(cx - r * 0.42, cy - r * 0.5, r * 0.18, shade(c, 1.4));
  for (let k = 0; k < r * 0.9; k++) p.set(cx + r * 0.15 + Math.sin(k * 0.9) * 1.2, cy - r * 0.35 + k * 0.85, shade(c, 0.45));
}
const boulderSolid = (cx: number, cy: number, r: number): Solid => ({ x: cx - r + 3, y: cy - r + 3, w: 2 * r - 6, h: 2 * r - 5 });

// ======================================================================= Đường Chiến Thắng
const VR_BOULDERS: [number, number, number][] = [[330, 262, 16], [462, 110, 15], [548, 266, 14], [112, 86, 13], [590, 166, 12], [236, 306, 11]];
/** tảng đá thêm khi sân rộng hơn bản gốc (toạ độ thiết kế, nằm ở khoảng trống xa lối mòn) */
const VR_BOULDERS_XL: [number, number, number][] = [[196, 96, 12], [420, 318, 12], [64, 290, 11]];
/** gờ vách đá dính tường trên */
const VR_LEDGE: Rect = { x: 252, y: 24, w: 150, h: 46 };
/** vũng nước ngầm (làm chậm) */
const VR_POOL: Rect = { x: 392, y: 198, w: 100, h: 44 };

const victoryRoad: ArenaDef = (f) => {
  const { W, H } = f;
  const big = W * H > 1.3 * DESIGN_W * DESIGN_H;
  const boulders = [...VR_BOULDERS, ...(big ? VR_BOULDERS_XL : [])].map(([x, y, r]) => [Math.round(f.x(x)), Math.round(f.y(y)), r] as const);
  const ledge = f.obj(VR_LEDGE);
  const pool = f.area(VR_POOL);
  /** tâm lối mòn đất uốn lượn ngang sân (tính theo toạ độ thiết kế rồi đổi ra sân thật) */
  const trailY = (x: number) => f.y(190 + Math.sin(unmap(x, DESIGN_W, W) / 80) * 30) + Math.sin(x / 23) * 3;
  return {
    draw(p) {
      const base = [hx(0x7a6a58), hx(0x6c5d4c), hx(0x877664)];
      fill(p, (x, y) => {
        const v = p.noise(x / 20, y / 20);
        let c = base[v < 0.38 ? 1 : v > 0.62 ? 2 : 0];
        const g = p.noise(x / 3.5 + 40, y / 3.5);
        if (g > 0.78) c = shade(c, 1.1);
        else if (g < 0.2) c = shade(c, 0.9);
        // lối mòn đất uốn lượn ngang sân
        const center = trailY(x);
        const half = 24 + (p.noise(x / 10, y / 10 + 20) - 0.5) * 8;
        const d = Math.abs(y - center);
        if (d < half) c = d > half - 2 ? hx(0x5e4c38) : (x * 7 + y * 3) % 17 === 0 ? hx(0xc4a47a) : mix(hx(0xa88a64), hx(0x96785a), p.noise(x / 6, y / 6));
        return c;
      });
      cracks(p, 16, 40, hx(0x45382c), hx(0x9a8a74));
      // sỏi
      const nPebble = Math.round(220 * areaK(p));
      for (let i = 0; i < nPebble; i++) {
        const x = 30 + p.rng() * (W - 60);
        const y = 30 + p.rng() * (H - 60);
        const c = shade(hx(0x9a8a78), 0.8 + p.rng() * 0.4);
        p.set(x, y, c);
        p.set(x + 1, y, shade(c, 0.8));
        p.set(x, y + 1, hx(0x3e3228), 0.6);
      }
      // vết chân trên lối mòn
      for (let k = 0, x = 60; x < W - 60; k++, x += 38) {
        const y = trailY(x) + (k % 2 ? 5 : -5);
        p.rect(x, y, 3, 2, hx(0x7a6046), 0.7);
      }
      // vũng nước ngầm
      const P = pool;
      for (let y = P.y - 4; y < P.y + P.h + 4; y++) for (let x = P.x - 4; x < P.x + P.w + 4; x++) {
        const outer = inRound(x, y, { x: P.x - 4, y: P.y - 4, w: P.w + 8, h: P.h + 8 }, 14);
        if (!outer) continue;
        if (!inRound(x, y, P, 11)) {
          p.set(x, y, (hsh(x >> 2, y >> 2) % 3 === 0 ? hx(0xa89a88) : hx(0x847462)));
          continue;
        }
        const depth = Math.min(x - P.x, P.x + P.w - x, y - P.y, P.y + P.h - y);
        let c: RGB = depth > 9 ? hx(0x22466e) : hx(0x34628e);
        if ((y * 3 + Math.floor(x / 5)) % 19 === 0) c = hx(0x6a9ac8);
        p.set(x, y, c);
      }
      const nRip = Math.max(5, Math.round((P.w - 28) / 17));
      for (let k = 0; k < nRip; k++) p.rect(P.x + 14 + k * 17, P.y + 10 + (k % 2) * (P.h - 28), 7, 1, hx(0x9ac4ec), 0.8);
      // gờ vách đá phía trên
      const L = ledge;
      dropShadow(p, { x: L.x, y: L.y + L.h - 6, w: L.w, h: 6 }, 0.35);
      for (let y = WALL; y < L.y + L.h; y++) for (let x = L.x; x < L.x + L.w; x++) {
        const face = y > L.y + L.h - 18;
        const v = p.noise(x / 6 + 70, y / 6);
        let c: RGB = face ? mix(hx(0x4e4034), hx(0x66564a), v) : mix(hx(0x8e7e6a), hx(0xa89884), v);
        if (face && (y - (L.y + L.h - 18)) % 6 === 0) c = hx(0x3a2e24);
        if (!face && y === L.y + L.h - 18) c = hx(0xc0b29c);
        if (x === L.x || x === L.x + L.w - 1 || y === L.y + L.h - 1) c = hx(0x2e241c);
        p.set(x, y, c);
      }
      for (let k = 0; k < 9; k++) {
        const gx = L.x + 10 + k * 16;
        const gy = L.y + 6 + (k % 3) * 5;
        p.set(gx, gy, hx(0x6a9a4a));
        p.set(gx + 1, gy - 1, hx(0x8ac05a));
        p.set(gx + 2, gy, hx(0x6a9a4a));
      }
      // tảng đá
      for (const [cx, cy, r] of boulders) boulder(p, cx, cy, r, hx(0x9a8a76));
      // vách hang
      border(p, (x, y, e) => {
        const v = p.noise(x / 7 + 90, y / 7);
        let c = mix(hx(0x3a2e26), hx(0x5e4c3e), v);
        if (v > 0.66) c = hx(0x6e5c4a);
        if (e === WALL - 1) c = hx(0x8a7660);
        if (e === WALL - 2) c = hx(0x2a201a);
        return c;
      });
      // đuốc rải đều trên tường trên (tránh gờ đá) và tường dưới
      for (const tx of slots(40, W - 40, 280, 2)) if (tx < L.x - 24 || tx > L.x + L.w + 24) torch(p, tx, 10);
      for (const tx of slots(40, W - 40, 280, 2)) torch(p, tx, H - 12);
    },
    layout: {
      inset: INSET,
      solids: [ledge, ...boulders.map(([x, y, r]) => boulderSolid(x, y, r))],
      slowZones: [pool],
      hazards: [{ kind: 'rain', count: 2, radius: 22, periodMs: 4200, warnMs: 1000, fx: 'rock', color: 0xc8a060, damagePct: 0.06, type: 'rock' }],
    },
  };
};

// ======================================================================= Cao nguyên Indigo
const IP_FOUNTAIN = { cx: 320, cy: 186, rx: 34, ry: 27 };
const IP_BEDS: Rect[] = [
  { x: 84, y: 58, w: 64, h: 26 }, { x: 492, y: 58, w: 64, h: 26 },
  { x: 84, y: 276, w: 64, h: 26 }, { x: 492, y: 276, w: 64, h: 26 },
];
/** bồn hoa thêm khi sân rộng (toạ độ thiết kế: giữa hai bồn trên / dưới, hai bên lối dọc) */
const IP_BEDS_XL: Rect[] = [
  { x: 180, y: 58, w: 64, h: 26 }, { x: 396, y: 58, w: 64, h: 26 },
  { x: 288, y: 284, w: 64, h: 26 },
];
const IP_LAMPS: [number, number][] = [[232, 118], [408, 118], [232, 262], [408, 262]];
const lampSolid = (x: number, y: number): Solid => ({ x: x - 4, y: y - 3, w: 8, h: 8 });

const indigoPlateau: ArenaDef = (f) => {
  const { W, H } = f;
  const big = W * H > 1.3 * DESIGN_W * DESIGN_H;
  const F = { ...IP_FOUNTAIN, cx: Math.round(f.x(IP_FOUNTAIN.cx)), cy: Math.round(f.y(IP_FOUNTAIN.cy)) };
  const fountainSolid: Solid = { x: F.cx - 28, y: F.cy - 22, w: 56, h: 46 };
  const beds = [...IP_BEDS, ...(big ? IP_BEDS_XL : [])].map((b) => f.obj(b));
  const lamps = IP_LAMPS.map(([x, y]) => [Math.round(f.x(x)), Math.round(f.y(y))] as const);
  // lối đá lớn hình chữ thập: dải ngang 44px qua đài phun, nhánh dọc 44px lên cổng
  const wy0 = Math.round(f.y(188)) - 22;
  const wy1 = wy0 + 44;
  const wx0 = F.cx - 22;
  const wx1 = F.cx + 22;
  return {
    draw(p) {
      // sân lát đá cuội
      fill(p, (x, y) => {
        const bw = 14;
        const bh = 10;
        const row = Math.floor(y / bh);
        const ox = (row % 2) * 7;
        const bx = Math.floor((x + ox) / bw);
        const lx = (x + ox) % bw;
        const ly = y % bh;
        const t = (hsh(bx, row) % 6) / 5;
        let c = mix(hx(0xcab89a), hx(0xe0d2b6), t);
        const corner = (lx < 2 || lx > bw - 3) && (ly < 2 || ly > bh - 3);
        if (lx === 0 || ly === 0 || corner) c = hx(0x9a8a70);
        else if (ly === 1 || lx === 1) c = shade(c, 1.06);
        else if (ly === bh - 1) c = shade(c, 0.9);
        return c;
      });
      // lối đá lớn hình chữ thập dẫn vào cổng Liên đoàn
      const walk = (x: number, y: number) => (y >= wy0 && y < wy1) || (x >= wx0 && x < wx1 && y < F.cy);
      fill(p, (x, y) => {
        if (!walk(x, y)) return null;
        const lx = (x - wx0 + 220) % 22;
        const ly = (y - wy0 + 220) % 22;
        let c: RGB = (Math.floor((x - wx0 + 220) / 22) + Math.floor((y - wy0 + 220) / 22)) % 2 ? hx(0xf0e8d8) : hx(0xe2d8c4);
        if (lx === 0 || ly === 0) c = hx(0xb0a088);
        if (y === wy0 || y === wy1 - 1 || ((x === wx0 || x === wx1 - 1) && y < wy0)) c = hx(0x8a3a2a);
        return c;
      });
      // bồn hoa
      for (const b of beds) {
        dropShadow(p, b, 0.25);
        p.rect(b.x, b.y, b.w, b.h, hx(0x7a6a5a));
        p.rect(b.x + 1, b.y + 1, b.w - 2, 2, hx(0xb0a08a));
        p.rect(b.x + 3, b.y + 3, b.w - 6, b.h - 6, hx(0x4a3424));
        for (let fy = b.y + 5; fy < b.y + b.h - 4; fy += 5) for (let fx = b.x + 5; fx < b.x + b.w - 4; fx += 6) {
          const k = hsh(fx, fy) % 4;
          const col = [hx(0xe84848), hx(0xf8d040), hx(0xffffff), hx(0xf080c0)][k];
          p.set(fx - 1, fy + 1, hx(0x3a8a3a));
          p.set(fx + 1, fy + 1, hx(0x3a8a3a));
          p.set(fx, fy, col);
          p.set(fx + 1, fy, col);
          p.set(fx, fy - 1, col);
          p.set(fx, fy + 1, hx(0x2a6a2a));
        }
      }
      // đài phun nước
      ellipse(p, F.cx + 3, F.cy + 6, F.rx + 1, F.ry, BLACK, 0.3);
      ellipse(p, F.cx, F.cy, F.rx, F.ry, hx(0x8a8a96));
      ellipse(p, F.cx, F.cy - 1, F.rx - 2, F.ry - 2, hx(0xd8d8e0));
      ellipse(p, F.cx, F.cy, F.rx - 6, F.ry - 6, hx(0x3a78c8));
      ellipse(p, F.cx - 2, F.cy - 2, F.rx - 12, F.ry - 11, hx(0x5a98e0));
      for (let k = 0; k < 6; k++) {
        const a = (k / 6) * Math.PI * 2;
        p.rect(F.cx + Math.cos(a) * (F.rx - 12) - 2, F.cy + Math.sin(a) * (F.ry - 10), 4, 1, hx(0xb0d8ff));
      }
      p.rect(F.cx - 4, F.cy - 16, 8, 16, hx(0xa8a8b4));
      p.rect(F.cx - 4, F.cy - 16, 3, 16, hx(0xd8d8e4));
      p.rect(F.cx - 7, F.cy - 18, 14, 3, hx(0xe0e0ea));
      for (const dir of [-1, 1]) for (let k = 0; k < 12; k++) {
        const x = F.cx + dir * k;
        const y = F.cy - 20 - Math.sin((k / 12) * Math.PI) * 6 + k * 1.1;
        p.set(x, y, hx(0xc8e8ff));
      }
      p.disc(F.cx, F.cy - 22, 2, WHITE);
      // cột đèn
      for (const [lx, ly] of lamps) {
        ellipse(p, lx + 2, ly + 3, 6, 2.5, BLACK, 0.3);
        p.rect(lx - 3, ly - 2, 7, 5, hx(0x2a2a34));
        p.rect(lx - 1, ly - 24, 3, 23, hx(0x3a3a48));
        p.rect(lx - 4, ly - 31, 9, 8, hx(0x2a2a34));
        p.rect(lx - 3, ly - 30, 7, 6, hx(0xfff0a8));
        p.disc(lx, ly - 27, 9, hx(0xfff0a8), 0.12);
      }
      // viền: mặt tiền Liên đoàn (trên) + hàng rào cây (ba cạnh còn lại)
      const gx = F.cx;
      border(p, (x, y, e) => {
        if (y < WALL && x >= WALL && x < W - WALL) {
          if (y < 7) return (Math.floor(x / 6) + y) % 2 ? hx(0xb83030) : hx(0x982424);
          if (y === 7) return hx(0x5a1414);
          if (x >= gx - 30 && x < gx + 30) return y < 10 ? hx(0xd8a830) : hx(0x2a2a3a);
          const wx = (x - gx + 4000) % 40;
          const win = wx > 14 && wx < 28 && y > 10 && y < 18;
          if (win) return y < 13 ? hx(0xbfe0ff) : hx(0x8ab8e8);
          return y === WALL - 1 ? hx(0xa89878) : hx(0xf0e6d0);
        }
        const v = p.noise(x / 5, y / 5 + 30);
        let c = mix(hx(0x1e5a2a), hx(0x3a8a3a), v);
        if (v > 0.7) c = hx(0x5aaa48);
        if (e === WALL - 1) c = hx(0x14401c);
        return c;
      }, 0.3);
      // biểu tượng vương miện vàng trên cổng
      for (let k = -8; k <= 8; k++) p.set(gx + k, 4, hx(0xf8d040));
      for (const k of [-8, -4, 0, 4, 8]) p.rect(gx + k - 1, 1, 2, 3, hx(0xf8d040));
    },
    layout: {
      inset: INSET,
      solids: [fountainSolid, ...beds, ...lamps.map(([x, y]) => lampSolid(x, y))],
    },
  };
};

// ======================================================================= Sảnh Pha Lê (Kanna)
const KN_PILLARS: [number, number][] = [[226, 98], [226, 282], [414, 98], [414, 282]];
const crystalSolid = (cx: number, cy: number): Solid => ({ x: cx - 13, y: cy - 10, w: 26, h: 24 });

function iceCrystal(p: ArenaPainter, cx: number, cy: number) {
  ellipse(p, cx + 4, cy + 14, 17, 6, BLACK, 0.3);
  const top = cy - 32;
  const shoulder = cy - 14;
  for (let y = top; y <= cy + 14; y++) {
    const half = y < shoulder ? ((y - top) / (shoulder - top)) * 13 : 13;
    for (let x = Math.floor(cx - half); x <= cx + half; x++) {
      let c: RGB = x < cx - 4 ? hx(0xe4f6ff) : x < cx + 4 ? hx(0xa8d8f4) : hx(0x6aa8d8);
      if (Math.abs(x - (cx - half)) < 1 || Math.abs(x - (cx + half)) < 1 || y === cy + 14) c = hx(0x3a6a9a);
      p.set(x, y, c);
    }
  }
  line(p, cx - 7, cy - 18, cx - 7, cy + 8, WHITE, 0.8);
  line(p, cx - 4, shoulder, cx - 4, cy + 13, hx(0x5a90c0), 0.6);
  line(p, cx + 4, shoulder, cx + 4, cy + 13, hx(0x3a6a9a), 0.6);
  p.set(cx, top + 2, WHITE);
  // tuyết đọng quanh chân
  ellipse(p, cx, cy + 14, 15, 3.5, hx(0xf4faff));
  p.disc(cx, cy - 4, 22, hx(0xbfe8ff), 0.08);
}

const kannaHall: ArenaDef = (f) => {
  const { W, H } = f;
  const pillars = KN_PILLARS.map(([x, y]) => [Math.round(f.x(x)), Math.round(f.y(y))] as const);
  return {
    draw(p) {
      // sàn băng ô 32px, vệt bóng chéo
      fill(p, (x, y) => {
        const tx = Math.floor(x / 32);
        const ty = Math.floor(y / 32);
        const lx = x % 32;
        const ly = y % 32;
        const t = (hsh(tx, ty) % 4) / 6 + p.noise(x / 30, y / 30) * 0.35;
        let c = mix(hx(0xd4ecf8), hx(0xa2cce8), t);
        if ((lx - ly + 64) % 32 < 3 && lx + ly > 10 && lx + ly < 44) c = mix(c, WHITE, 0.5);
        if (lx === 31 || ly === 31) c = hx(0x86b2d6);
        else if (lx === 0 || ly === 0) c = hx(0xeef8ff);
        return c;
      });
      cracks(p, 12, 34, hx(0x7aa8d0), WHITE);
      // biểu tượng bông tuyết giữa sân
      const cx = Math.round(f.x(320));
      const cy = Math.round(f.y(182));
      ellipseRing(p, cx, cy, 64, 52, 2, hx(0x7aaad8), 0.8);
      ellipseRing(p, cx, cy, 58, 47, 1, WHITE, 0.7);
      for (let k = 0; k < 6; k++) {
        const a = (k / 6) * Math.PI * 2 + Math.PI / 2;
        const ex = cx + Math.cos(a) * 44;
        const ey = cy + Math.sin(a) * 36;
        line(p, cx, cy, ex, ey, hx(0x6a9ad0), 0.9, 3);
        line(p, cx, cy, ex, ey, WHITE, 0.6);
        for (const t of [0.5, 0.75]) {
          const bx = cx + Math.cos(a) * 44 * t;
          const by = cy + Math.sin(a) * 36 * t;
          for (const s of [-1, 1]) {
            const b = a + s * 0.7;
            line(p, bx, by, bx + Math.cos(b) * 10, by + Math.sin(b) * 8, hx(0x6a9ad0), 0.9, 2);
          }
        }
      }
      p.disc(cx, cy, 6, hx(0x6a9ad0));
      p.disc(cx, cy, 3, WHITE);
      // tinh thể lấp lánh
      const nSpark = Math.round(160 * areaK(p));
      for (let i = 0; i < nSpark; i++) {
        const x = 30 + p.rng() * (W - 60);
        const y = 30 + p.rng() * (H - 60);
        p.set(x, y, WHITE);
        if (i % 4 === 0) {
          p.set(x - 1, y, WHITE, 0.5);
          p.set(x + 1, y, WHITE, 0.5);
          p.set(x, y - 1, WHITE, 0.5);
          p.set(x, y + 1, WHITE, 0.5);
        }
      }
      startRings(p, f, hx(0x5a8ac8));
      for (const [px, py] of pillars) iceCrystal(p, px, py);
      // tường khối pha lê
      border(p, (x, y, e) => {
        if (e === WALL - 1) return hx(0xe6f6ff);
        if (e === WALL - 2) return hx(0x3a5a8a);
        return brick(x, y, 24, 11, hx(0x8ab8e4), hx(0x5a86c0), hx(0x34507e));
      }, 0.25);
      // tuyết đọng sát chân tường
      const nSnow = Math.round((70 * (W + H)) / (DESIGN_W + DESIGN_H));
      for (let i = 0; i < nSnow; i++) {
        const side = i % 4;
        const t = p.rng();
        const x = side < 2 ? 30 + t * (W - 60) : side === 2 ? WALL + 2 : W - WALL - 3;
        const y = side === 0 ? WALL + 2 : side === 1 ? H - WALL - 3 : 30 + t * (H - 60);
        const r = 3 + p.rng() * 5;
        p.disc(x, y, r, hx(0xf6fbff), 0.9);
        p.disc(x - 1, y - 1, r * 0.5, WHITE);
      }
      // đèn băng bốn góc
      for (const [px, py] of corners(W, H)) {
        p.disc(px + 2, py + 3, 12, BLACK, 0.3);
        p.disc(px, py, 12, hx(0x5a86c0));
        p.disc(px, py, 8, hx(0xbfe8ff));
        p.disc(px - 2, py - 2, 3, WHITE);
      }
    },
    layout: {
      inset: INSET,
      solids: pillars.map(([x, y]) => crystalSolid(x, y)),
      hazards: [
        { kind: 'ice', areas: [{ x: INSET, y: INSET, w: W - INSET * 2, h: H - INSET * 2 }] },
        { kind: 'rain', count: 3, radius: 26, periodMs: 3200, warnMs: 900, fx: 'ice', color: 0x9ae8ff, damagePct: 0.07, type: 'ice', slowMs: 900 },
      ],
    },
  };
};

// ======================================================================= Sảnh Đá (Shiba)
const SB_COLUMNS: [number, number][] = [[206, 88], [434, 88], [206, 292], [434, 292]];
const columnSolid = (cx: number, cy: number): Solid => ({ x: cx - 14, y: cy - 10, w: 28, h: 24 });
const SB_POSTS: [number, number][] = [[320, 62], [320, 312]];
const postSolid = (cx: number, cy: number): Solid => ({ x: cx - 8, y: cy - 6, w: 16, h: 14 });

function stoneColumn(p: ArenaPainter, cx: number, cy: number) {
  ellipse(p, cx + 4, cy + 13, 19, 6, BLACK, 0.35);
  // chân cột
  p.rect(cx - 16, cy + 4, 32, 10, hx(0x5a5046));
  p.rect(cx - 16, cy + 4, 32, 2, hx(0x9a8e7e));
  // thân cột ghép từ các khối đá
  for (let y = cy - 34; y < cy + 4; y++) for (let x = cx - 12; x < cx + 12; x++) {
    const blk = Math.floor((y - (cy - 34)) / 9);
    const ly = (y - (cy - 34)) % 9;
    const t = (hsh(blk, 7) % 4) / 4;
    let c = mix(hx(0x7a6e60), hx(0x988a78), t);
    if (x < cx - 6) c = shade(c, 1.15);
    else if (x > cx + 6) c = shade(c, 0.78);
    if (ly === 0) c = hx(0x4a4038);
    if (x === cx - 12 || x === cx + 11) c = hx(0x3a322a);
    p.set(x, y, c);
  }
  // mũ cột
  p.rect(cx - 15, cy - 40, 30, 7, hx(0x6a5e50));
  p.rect(cx - 15, cy - 40, 30, 2, hx(0xb0a490));
  p.rect(cx - 15, cy - 34, 30, 1, hx(0x3a322a));
  // vết nứt
  line(p, cx + 3, cy - 30, cx + 6, cy - 18, hx(0x3a322a));
  line(p, cx + 6, cy - 18, cx + 2, cy - 8, hx(0x3a322a));
}

function trainingPost(p: ArenaPainter, cx: number, cy: number) {
  ellipse(p, cx + 3, cy + 8, 11, 4, BLACK, 0.35);
  for (let y = cy - 22; y < cy + 8; y++) for (let x = cx - 8; x < cx + 8; x++) {
    let c: RGB = x < cx - 3 ? hx(0xb88a5a) : x < cx + 4 ? hx(0x9a7046) : hx(0x7a5432);
    if ((y + Math.floor(x / 3)) % 7 === 0) c = shade(c, 0.85);
    p.set(x, y, c);
  }
  // dây quấn
  for (const ry of [cy - 14, cy - 4]) {
    p.rect(cx - 8, ry, 16, 3, hx(0xe8d8a8));
    for (let x = cx - 8; x < cx + 8; x += 3) p.set(x, ry + 1, hx(0xa89868));
  }
  ellipse(p, cx, cy - 22, 8, 3, hx(0xd0a470));
  ellipseRing(p, cx, cy - 22, 5, 2, 1, hx(0x8a6a44));
}

const shibaHall: ArenaDef = (f) => {
  const { W, H } = f;
  const columns = SB_COLUMNS.map(([x, y]) => [Math.round(f.x(x)), Math.round(f.y(y))] as const);
  const posts = SB_POSTS.map(([x, y]) => [Math.round(f.x(x)), Math.round(f.y(y))] as const);
  return {
    draw(p) {
      // sàn đá phiến lớn
      fill(p, (x, y) => {
        const bw = 40;
        const bh = 28;
        const row = Math.floor(y / bh);
        const ox = (row % 2) * 20;
        const bx = Math.floor((x + ox) / bw);
        const lx = (x + ox) % bw;
        const ly = y % bh;
        const t = (hsh(bx, row) % 5) / 4;
        let c = mix(hx(0x86786a), hx(0xa69886), t);
        c = shade(c, 0.92 + p.noise(x / 9, y / 9) * 0.16);
        if (lx === 0 || ly === 0) c = hx(0x4e443a);
        else if (lx === 1 || ly === 1) c = shade(c, 1.12);
        else if (lx === bw - 1 || ly === bh - 1) c = shade(c, 0.82);
        return c;
      });
      cracks(p, 18, 30, hx(0x4a4036), hx(0xb8aa96));
      // võ đài giữa sân: nền cát nén + vòng dây thừng
      const cx = Math.round(f.x(320));
      const cy = Math.round(f.y(186));
      fill(p, (x, y) => {
        const d = Math.hypot((x - cx) / 100, (y - cy) / 72);
        if (d > 1) return null;
        return mix(hx(0xcab48a), hx(0xd8c49c), p.noise(x / 7, y / 7));
      });
      ellipseRing(p, cx, cy, 104, 76, 5, (x, y) => ((x + y) % 6 < 3 ? hx(0xd8b878) : hx(0xa8884c)));
      ellipseRing(p, cx, cy, 98, 70, 1, hx(0x8a6a3a), 0.8);
      // vạch xuất phát trong võ đài
      for (const sx of [cx - 44, cx + 44]) p.rect(sx - 1, cy - 14, 3, 28, hx(0x8a3a2a), 0.8);
      ellipseRing(p, cx, cy, 20, 14, 2, hx(0x8a3a2a), 0.7);
      // đá vụn rải rác
      const nRub = Math.round(120 * areaK(p));
      for (let i = 0; i < nRub; i++) {
        const x = 30 + p.rng() * (W - 60);
        const y = 30 + p.rng() * (H - 60);
        p.rect(x, y, 2, 2, hx(0x6a5e52));
        p.set(x, y, hx(0xb0a490));
      }
      startRings(p, f, hx(0x8a3a2a));
      for (const [px, py] of posts) trainingPost(p, px, py);
      for (const [px, py] of columns) stoneColumn(p, px, py);
      // tường đá tảng lớn
      border(p, (x, y, e) => {
        if (e === WALL - 1) return hx(0xb0a28c);
        if (e === WALL - 2) return hx(0x2e261e);
        return brick(x, y, 30, 15, hx(0x8a7a66), hx(0x5a4c3e), hx(0x30281e));
      });
      for (const tx of slots(0, W, 320, 2)) {
        torch(p, tx, 10);
        torch(p, tx, H - 12);
      }
      // chậu than bốn góc
      for (const [px, py] of corners(W, H)) {
        p.disc(px + 2, py + 3, 12, BLACK, 0.3);
        p.disc(px, py, 12, hx(0x3a3430));
        p.disc(px, py, 9, hx(0x5a2a14));
        p.disc(px, py - 1, 6, hx(0xf07a28));
        p.disc(px, py - 2, 3, hx(0xffd060));
      }
    },
    layout: {
      inset: INSET,
      solids: [...columns.map(([x, y]) => columnSolid(x, y)), ...posts.map(([x, y]) => postSolid(x, y))],
      hazards: [{ kind: 'rain', count: 4, radius: 24, periodMs: 2800, warnMs: 900, fx: 'rock', color: 0xc8a060, damagePct: 0.08, type: 'rock' }],
    },
  };
};

// ======================================================================= Sảnh U Linh (Kikuko)
const KK_GRAVES: [number, number][] = [[226, 88], [320, 66], [414, 88], [226, 292], [320, 312], [414, 292]];
const graveSolid = (cx: number, cy: number): Solid => ({ x: cx - 9, y: cy - 8, w: 18, h: 20 });

function gravestone(p: ArenaPainter, cx: number, cy: number, variant: number) {
  ellipse(p, cx + 3, cy + 12, 13, 4, BLACK, 0.4);
  // đất mộ
  ellipse(p, cx, cy + 11, 12, 4, hx(0x2e2434));
  const body = (x: number, y: number) => (y >= cy - 14 && Math.abs(x - cx) <= 9) || (x - cx) ** 2 + (y - (cy - 14)) ** 2 <= 81;
  for (let y = cy - 24; y <= cy + 11; y++) for (let x = cx - 10; x <= cx + 10; x++) {
    if (!body(x, y)) continue;
    const edge = !body(x - 1, y) || !body(x + 1, y) || !body(x, y - 1) || y === cy + 11;
    let c: RGB = x < cx - 3 ? hx(0x9a90aa) : x < cx + 4 ? hx(0x7e748e) : hx(0x625a72);
    if (edge) c = hx(0x2a2434);
    p.set(x, y, c);
  }
  // khắc chữ / biểu tượng
  if (variant % 2 === 0) {
    p.rect(cx - 1, cy - 18, 2, 12, hx(0x3e3650));
    p.rect(cx - 5, cy - 14, 10, 2, hx(0x3e3650));
  } else {
    for (const ry of [cy - 16, cy - 11, cy - 6]) p.rect(cx - 5, ry, 10, 1, hx(0x3e3650));
  }
  // rêu
  for (let k = 0; k < 5; k++) p.set(cx - 8 + ((k * 5 + variant * 3) % 16), cy + 8 - (k % 2), hx(0x4a6a3a));
  // ngọn nến nhỏ trước mộ (ánh tím)
  const fx = cx + (variant % 2 ? -12 : 12);
  p.disc(fx, cy + 4, 9, hx(0xb080ff), 0.1);
  p.rect(fx - 1, cy + 2, 3, 6, hx(0xe8e0d0));
  p.disc(fx, cy, 1.8, hx(0xc890ff));
  p.set(fx, cy - 2, hx(0xf0e0ff));
}

const kikukoHall: ArenaDef = (f) => {
  const { W, H } = f;
  const graves = KK_GRAVES.map(([x, y]) => [Math.round(f.x(x)), Math.round(f.y(y))] as const);
  return {
    draw(p) {
      // sàn đá phiến tím sẫm, rêu, sương
      fill(p, (x, y) => {
        const s = 20;
        const tx = Math.floor(x / s);
        const ty = Math.floor(y / s);
        const lx = x % s;
        const ly = y % s;
        const t = (hsh(tx, ty) % 5) / 4;
        let c = mix(hx(0x3a3048), hx(0x4a3e5c), t);
        const m = p.noise(x / 26 + 11, y / 26);
        if (m > 0.68) c = mix(c, hx(0x34483a), (m - 0.68) * 2.4);
        if (lx === 0 || ly === 0) c = hx(0x221a2c);
        else if (lx === 1 || ly === 1) c = shade(c, 1.12);
        return c;
      });
      cracks(p, 14, 32, hx(0x1a1422), hx(0x5a4e6e));
      // vòng phù văn giữa sân
      const cx = Math.round(f.x(320));
      const cy = Math.round(f.y(186));
      p.disc(cx, cy, 70, hx(0x8a5ad0), 0.06);
      ellipseRing(p, cx, cy, 74, 58, 2, hx(0x7a4ab8), 0.8);
      ellipseRing(p, cx, cy, 62, 48, 1, hx(0xa070e0), 0.6);
      for (let k = 0; k < 16; k++) {
        const a = (k / 16) * Math.PI * 2;
        const x = cx + Math.cos(a) * 68;
        const y = cy + Math.sin(a) * 53;
        p.rect(x - 1, y - 1, 3, 3, hx(0xc8a0ff), 0.85);
      }
      for (let k = 0; k < 3; k++) {
        const a = (k / 3) * Math.PI * 2 - Math.PI / 2;
        const b = a + (Math.PI * 2) / 3;
        line(p, cx + Math.cos(a) * 44, cy + Math.sin(a) * 34, cx + Math.cos(b) * 44, cy + Math.sin(b) * 34, hx(0x9a6ae0), 0.6);
      }
      p.disc(cx, cy, 5, hx(0xc8a0ff), 0.7);
      // sương mù trôi
      const nFog = Math.round(26 * areaK(p));
      for (let i = 0; i < nFog; i++) {
        const x = 40 + p.rng() * (W - 80);
        const y = 40 + p.rng() * (H - 80);
        ellipse(p, x, y, 22 + p.rng() * 18, 5 + p.rng() * 4, hx(0xb8a8d8), 0.07);
      }
      startRings(p, f, hx(0x7a4ab8));
      graves.forEach(([gx, gy], i) => gravestone(p, gx, gy, i));
      // tường đá sẫm
      border(p, (x, y, e) => {
        if (e === WALL - 1) return hx(0x6a5a84);
        if (e === WALL - 2) return hx(0x120e18);
        return brick(x, y, 20, 10, hx(0x4a3e5a), hx(0x2a2236), hx(0x16121e));
      }, 0.45);
      // nến tím trên tường (rải đều, tường trên chừa khoảng giữa)
      const purple = hx(0xb070ff);
      const purpleGlow = hx(0x9a60e0);
      for (const tx of slots(40, W - 40, 120, 4)) if (Math.abs(tx - W / 2) > 50) torch(p, tx, 10, purple, purpleGlow);
      for (const tx of slots(40, W - 40, 200, 3)) torch(p, tx, H - 12, purple, purpleGlow);
      // đèn lồng ma bốn góc
      for (const [px, py] of corners(W, H)) {
        p.disc(px + 2, py + 3, 12, BLACK, 0.35);
        p.disc(px, py, 12, hx(0x2a2236));
        p.disc(px, py, 8, hx(0x6a3aa8));
        p.disc(px, py - 1, 4, hx(0xd0a8ff));
      }
    },
    layout: {
      inset: INSET,
      solids: graves.map(([x, y]) => graveSolid(x, y)),
      hazards: [
        { kind: 'darkness', radius: 130 },
        { kind: 'rain', count: 3, radius: 26, periodMs: 3000, warnMs: 1000, fx: 'shadow', color: 0x8a5ad0, damagePct: 0.07, type: 'ghost' },
      ],
    },
  };
};

// ======================================================================= Sảnh Rồng (Wataru)
const WT_STATUES: [number, number][] = [[320, 60], [320, 300]];
const statueSolid = (cx: number, cy: number): Solid => ({ x: cx - 27, y: cy - 16, w: 54, h: 36 });
const WT_BRAZIERS: [number, number][] = [[184, 84], [456, 84], [184, 296], [456, 296]];
const brazierSolid = (cx: number, cy: number): Solid => ({ x: cx - 9, y: cy - 6, w: 18, h: 14 });

function dragonStatue(p: ArenaPainter, cx: number, cy: number) {
  dropShadow(p, { x: cx - 28, y: cy + 4, w: 56, h: 16 }, 0.35);
  // bệ đá
  p.rect(cx - 28, cy + 4, 56, 16, hx(0x4a3a3e));
  p.rect(cx - 28, cy + 4, 56, 3, hx(0x8a7478));
  p.rect(cx - 28, cy + 19, 56, 1, hx(0x221a1c));
  for (let x = cx - 24; x < cx + 24; x += 8) p.rect(x, cy + 10, 4, 4, hx(0xc8a040));
  // thân rồng ngọc bích cuộn tròn
  const jade = hx(0x3a9a84);
  const jadeL = hx(0x6ac8a8);
  const jadeD = hx(0x1e5a4c);
  for (let k = 0; k < 30; k++) {
    const t = k / 29;
    const x = cx - 18 + t * 30 + Math.sin(t * Math.PI * 2) * 6;
    const y = cy + 2 - t * 30 + Math.cos(t * Math.PI * 2) * 4;
    const r = 7 - t * 2.5;
    p.disc(x, y, r, jadeD);
    p.disc(x - 1, y - 1, r - 1.2, jade);
    p.set(x - r * 0.5, y - r * 0.5, jadeL);
  }
  // cánh
  for (const s of [-1, 1]) for (let k = 0; k < 14; k++) line(p, cx + s * 4, cy - 16, cx + s * (10 + k), cy - 30 + k * 1.2, k % 4 === 0 ? jadeD : jadeL, 0.9);
  // đầu rồng
  const hxp = cx + 13;
  const hyp = cy - 30;
  p.disc(hxp, hyp, 7, jadeD);
  p.disc(hxp - 1, hyp - 1, 5.8, jade);
  p.rect(hxp + 4, hyp + 1, 7, 4, jade);
  p.rect(hxp + 4, hyp + 4, 7, 1, jadeD);
  line(p, hxp - 3, hyp - 5, hxp - 8, hyp - 12, hx(0xe8d070), 1, 2);
  line(p, hxp + 1, hyp - 6, hxp - 1, hyp - 13, hx(0xe8d070), 1, 2);
  p.set(hxp + 2, hyp - 2, hx(0xff3a30));
  p.set(hxp + 3, hyp - 2, hx(0xff3a30));
}

function brazier(p: ArenaPainter, cx: number, cy: number) {
  p.disc(cx, cy, 22, hx(0xff8a30), 0.07);
  ellipse(p, cx + 2, cy + 8, 11, 3, BLACK, 0.35);
  for (const s of [-1, 0, 1]) line(p, cx + s * 2, cy - 2, cx + s * 7, cy + 7, hx(0x2a2226), 1, 2);
  ellipse(p, cx, cy - 3, 9, 4, hx(0x3a3034));
  ellipse(p, cx, cy - 4, 7, 2.5, hx(0x6a1a10));
  p.rect(cx - 9, cy - 3, 18, 1, hx(0xc8a040));
  p.disc(cx, cy - 8, 5, hx(0xf05a18));
  p.disc(cx - 1, cy - 10, 3.5, hx(0xff9a30));
  p.disc(cx, cy - 12, 2, hx(0xffe070));
  p.set(cx + 2, cy - 16, hx(0xffb040));
}

const wataruHall: ArenaDef = (f) => {
  const { W, H } = f;
  const statues = WT_STATUES.map(([x, y]) => [Math.round(f.x(x)), Math.round(f.y(y))] as const);
  const braziers = WT_BRAZIERS.map(([x, y]) => [Math.round(f.x(x)), Math.round(f.y(y))] as const);
  const cx = Math.round(f.x(320));
  const cy = Math.round(f.y(182));
  return {
    draw(p) {
      // sàn đá đỏ sẫm, nẹp vàng lớn mỗi 96px (canh theo tâm huy hiệu)
      const gx0 = (((cx - 288) % 96) + 96) % 96;
      const gy0 = (((cy - 140) % 96) + 96) % 96;
      fill(p, (x, y) => {
        const s = 24;
        const tx = Math.floor(x / s);
        const ty = Math.floor(y / s);
        const lx = x % s;
        const ly = y % s;
        const t = (hsh(tx, ty) % 5) / 4;
        let c = mix(hx(0x4a2a30), hx(0x5e3840), t);
        c = shade(c, 0.94 + p.noise(x / 12, y / 12) * 0.12);
        if (lx === 0 || ly === 0) c = hx(0x28161a);
        else if (lx === 1 || ly === 1) c = shade(c, 1.15);
        if ((x - gx0 + 96) % 96 === 0 || (y - gy0 + 96) % 96 === 0) c = hx(0x9a7428);
        return c;
      });
      // vệt gió nhạt trên sàn
      const nWind = Math.round(30 * areaK(p));
      for (let i = 0; i < nWind; i++) {
        const x = 40 + p.rng() * (W - 120);
        const y = 40 + p.rng() * (H - 80);
        const len = 20 + p.rng() * 40;
        line(p, x, y, x + len, y - len * 0.06, hx(0xe8d8e0), 0.12);
      }
      // huy hiệu rồng giữa sân
      p.disc(cx, cy, 64, hx(0x2a1418));
      ellipseRing(p, cx, cy, 64, 64, 4, hx(0xd8a838));
      ellipseRing(p, cx, cy, 56, 56, 1, hx(0x8a6420));
      for (let k = 0; k < 12; k++) {
        const a = (k / 12) * Math.PI * 2;
        p.rect(cx + Math.cos(a) * 60 - 1, cy + Math.sin(a) * 60 - 1, 3, 3, hx(0xffe080));
      }
      // rồng uốn chữ S
      for (let k = 0; k < 60; k++) {
        const t = k / 59;
        const x = cx - 34 + t * 68;
        const y = cy + Math.sin(t * Math.PI * 2) * 18;
        const r = 4.5 - t * 2.5;
        p.disc(x, y, r + 1, hx(0x14302a));
        p.disc(x, y, r, hx(0x3a9a84));
      }
      for (let k = 0; k < 10; k++) p.set(cx - 30 + k * 6, cy + Math.sin(((k * 6 + 4) / 68) * Math.PI * 2) * 18 - 4, hx(0xe8d070));
      p.disc(cx - 36, cy, 6, hx(0x3a9a84));
      p.set(cx - 38, cy - 2, hx(0xff3a30));
      line(p, cx - 40, cy - 4, cx - 46, cy - 12, hx(0xe8d070), 1, 2);
      startRings(p, f, hx(0xd8a838));
      for (const [bx, by] of braziers) brazier(p, bx, by);
      for (const [sx, sy] of statues) dragonStatue(p, sx, sy);
      // tường đá đen viền vàng, cờ đỏ
      border(p, (x, y, e) => {
        if (e === WALL - 1) return hx(0xd8a838);
        if (e === WALL - 2) return hx(0x5a4018);
        if (e === WALL - 3) return hx(0x120c0e);
        return brick(x, y, 26, 13, hx(0x3e3236), hx(0x241c20), hx(0x100a0c));
      }, 0.4);
      // cờ đỏ rải đều trên tường trên, chừa chỗ tượng rồng ở giữa
      for (const bx of slots(40, W - 40, 120, 4)) {
        if (Math.abs(bx - cx) < 60) continue;
        for (let y = 0; y < WALL - 2; y++) for (let x = bx - 7; x < bx + 7; x++) {
          let c: RGB = x < bx - 4 ? hx(0xc02a2a) : hx(0xa01e22);
          if (x === bx - 7 || x === bx + 6) c = hx(0xd8a838);
          p.set(x, y, c);
        }
        p.disc(bx, 10, 3, hx(0xf0c040));
      }
    },
    layout: {
      inset: INSET,
      solids: [...statues.map(([x, y]) => statueSolid(x, y)), ...braziers.map(([x, y]) => brazierSolid(x, y))],
      hazards: [{ kind: 'wind', periodMs: 4200, warnMs: 1200, force: 260 }],
    },
  };
};

// ======================================================================= Phòng Nhà vô địch
const pillarSolid = (cx: number, cy: number): Solid => ({ x: cx - 13, y: cy - 8, w: 26, h: 20 });

function marblePillar(p: ArenaPainter, cx: number, cy: number) {
  ellipse(p, cx + 4, cy + 12, 18, 5, BLACK, 0.3);
  // bệ
  p.rect(cx - 15, cy + 4, 30, 8, hx(0xc8c4cc));
  p.rect(cx - 15, cy + 4, 30, 2, WHITE);
  p.rect(cx - 15, cy + 11, 30, 1, hx(0x8a8692));
  // thân có rãnh dọc
  for (let y = cy - 36; y < cy + 4; y++) for (let x = cx - 11; x < cx + 11; x++) {
    const lx = x - (cx - 11);
    let c: RGB = lx % 5 === 0 ? hx(0xb4b0bc) : lx < 7 ? hx(0xfaf8fc) : lx < 15 ? hx(0xe4e0ea) : hx(0xc4c0cc);
    if (x === cx - 11 || x === cx + 10) c = hx(0x8a8692);
    p.set(x, y, c);
  }
  // đầu cột dát vàng
  p.rect(cx - 15, cy - 42, 30, 6, hx(0xd8b040));
  p.rect(cx - 15, cy - 42, 30, 2, hx(0xffe080));
  p.rect(cx - 15, cy - 37, 30, 1, hx(0x8a6a20));
  p.rect(cx - 12, cy - 36, 24, 2, hx(0xe8e4ee));
}

const championHall: ArenaDef = (f) => {
  const { W } = f;
  // hai hàng cột cẩm thạch rải đều giữa hai cột ngoài cùng (thêm cột khi sân rộng)
  const px0 = Math.round(f.x(150));
  const px1 = Math.round(f.x(490));
  const nCol = Math.max(3, Math.round((px1 - px0) / 170) + 1);
  const pxs = Array.from({ length: nCol }, (_, i) => Math.round(px0 + ((px1 - px0) * i) / (nCol - 1)));
  const pillars = [72, 304].flatMap((y) => pxs.map((x) => [x, Math.round(f.y(y))] as const));
  // thảm đỏ ngang giữa sân (cao 48px)
  const cy = Math.round(f.y(190));
  const top = cy - 24;
  const bot = cy + 24;
  const cx = Math.round(f.x(320));
  // cửa sổ kính trên tường trên, căn giữa
  const nWin = Math.floor((W - 2 * 43 - 26) / 88) + 1;
  const win0 = Math.round((W - ((nWin - 1) * 88 + 26)) / 2);
  return {
    draw(p) {
      // đá cẩm thạch ô cờ có vân
      fill(p, (x, y) => {
        const tx = Math.floor(x / 32);
        const ty = Math.floor(y / 32);
        const lx = x % 32;
        const ly = y % 32;
        let c: RGB = (tx + ty) % 2 ? hx(0xeeece6) : hx(0xcfcdd8);
        const v = p.noise(x / 9 + tx * 3, y / 9);
        if (Math.abs(v - 0.5) < 0.025) c = shade(c, 0.86);
        if (lx === 31 || ly === 31) c = hx(0xa8a6b4);
        else if (lx === 0 || ly === 0) c = WHITE;
        return c;
      });
      // thảm đỏ giữa sân
      fill(p, (x, y) => {
        if (y < top || y >= bot || x < WALL || x >= W - WALL) return null;
        if (y < top + 3 || y >= bot - 3) return hx(0xd8b040);
        if (y === top + 3 || y === bot - 4) return hx(0x7a1a20);
        let c: RGB = (x + y) % 4 === 0 ? hx(0xb8303a) : hx(0xa82632);
        const lx = (((x - cx) % 32) + 48) % 32;
        const dy = Math.abs(y - (top + bot) / 2);
        if (Math.abs(lx - 16) + dy === 10) c = hx(0xd8b040);
        return c;
      });
      // huy hiệu ngôi sao giữa thảm
      p.disc(cx, cy, 20, hx(0x8a6a20));
      p.disc(cx, cy, 18, hx(0xd8b040));
      p.disc(cx, cy, 14, hx(0xa82632));
      for (let k = 0; k < 5; k++) {
        const a = (k / 5) * Math.PI * 2 - Math.PI / 2;
        line(p, cx, cy, cx + Math.cos(a) * 12, cy + Math.sin(a) * 12, hx(0xffe080), 1, 3);
      }
      p.disc(cx, cy, 4, hx(0xffe080));
      startRings(p, f, hx(0xd8b040));
      for (const [px, py] of pillars) marblePillar(p, px, py);
      // tường xanh thẫm viền vàng, cửa sổ kính phía trên
      border(p, (x, y, e) => {
        if (e === WALL - 1) return hx(0xd8b040);
        if (e === WALL - 2) return hx(0x6a5018);
        if (y < WALL - 2 && x >= WALL && x < W - WALL) {
          const wx = (x - win0) % 88;
          if (x >= win0 && wx < 26 && y > 3) {
            if (wx === 0 || wx === 25 || wx === 13 || y === 4 || y === 11) return hx(0xc8a040);
            return y < 11 ? hx(0xbfe0ff) : hx(0x8ab8f0);
          }
        }
        return brick(x, y, 28, 12, hx(0x343c70), hx(0x1e2448), hx(0x141830));
      }, 0.35);
      // ánh nắng xiên từ cửa sổ
      for (let k = 0; k < nWin; k++) {
        const wx = win0 + k * 88 + 13;
        for (let y = WALL; y < 120; y++) for (let x = wx - 10 + (y - WALL) * 0.3; x < wx + 10 + (y - WALL) * 0.3; x++) p.set(x, y, hx(0xfff4c8), 0.05 * (1 - (y - WALL) / 100));
      }
    },
    layout: {
      inset: INSET,
      solids: pillars.map(([x, y]) => pillarSolid(x, y)),
    },
  };
};

// ======================================================================= Hang Cerulean
const CC_POOLS: Rect[] = [{ x: 258, y: 40, w: 128, h: 44 }, { x: 392, y: 262, w: 150, h: 52 }];
const CC_ROCKS: [number, number][] = [[120, 96], [580, 112], [270, 300], [596, 282]];
const stalagSolid = (cx: number, cy: number): Solid => ({ x: cx - 11, y: cy - 9, w: 22, h: 14 });
const CC_RUNES = [
  { x: 236, y: 118, w: 64, h: 52, group: 0 }, { x: 452, y: 168, w: 64, h: 52, group: 0 },
  { x: 352, y: 104, w: 64, h: 52, group: 1 }, { x: 320, y: 202, w: 64, h: 52, group: 1 },
];

function stalagmite(p: ArenaPainter, cx: number, cy: number) {
  ellipse(p, cx + 3, cy + 3, 13, 4, BLACK, 0.4);
  for (let k = 0; k < 30; k++) {
    const half = Math.floor(((30 - k) / 30) * 12);
    for (let dx = -half; dx <= half; dx++) {
      let c: RGB = dx < -half / 3 ? hx(0x7a7a9a) : dx < half / 3 ? hx(0x5a5a7a) : hx(0x3e3e58);
      if (Math.abs(dx) === half) c = hx(0x24243a);
      if (k % 7 === 3 && Math.abs(dx) < half) c = shade(c, 0.85);
      p.set(cx + dx, cy - k + 4, c);
    }
  }
  p.set(cx - 2, cy - 18, hx(0xa8a8c8));
}

function crystalCluster(p: ArenaPainter, cx: number, cy: number, c: RGB) {
  p.disc(cx, cy - 3, 12, c, 0.12);
  for (let k = 0; k < 3; k++) {
    const x0 = cx - 4 + k * 4;
    const h = 5 + ((k * 5 + cx) % 6);
    for (let yy = 0; yy < h; yy++) for (let xx = -1; xx <= 1; xx++) p.set(x0 + xx, cy - yy, xx < 0 ? mix(c, WHITE, 0.5) : c);
    p.set(x0, cy - h, WHITE);
  }
}

/** cụm pha lê sát vách (toạ độ thiết kế) */
const CC_CRYSTALS: [number, number, number][] = [[60, 60, 0xb080ff], [590, 70, 0x8ae0e8], [70, 300, 0x8ae0e8], [470, 60, 0xf088c8], [150, 320, 0xb080ff], [600, 230, 0xf088c8]];
/** cụm pha lê thêm khi sân rộng */
const CC_CRYSTALS_XL: [number, number, number][] = [[52, 180, 0xf088c8], [300, 330, 0x8ae0e8], [180, 52, 0x8ae0e8], [600, 330, 0xb080ff]];

const ceruleanCave: ArenaDef = (f) => {
  const { W, H } = f;
  const big = W * H > 1.3 * DESIGN_W * DESIGN_H;
  const pools = CC_POOLS.map((r) => f.area(r));
  const rocks = CC_ROCKS.map(([x, y]) => [Math.round(f.x(x)), Math.round(f.y(y))] as const);
  const runes = CC_RUNES.map((r) => f.obj(r));
  const crystals = [...CC_CRYSTALS, ...(big ? CC_CRYSTALS_XL : [])].map(([x, y, c]) => [Math.round(f.x(x)), Math.round(f.y(y)), c] as const);
  return {
    draw(p) {
      const base = [hx(0x343850), hx(0x2c2f46), hx(0x3e425c)];
      const rx = (W * 300) / DESIGN_W;
      const ry = (H * 170) / DESIGN_H;
      fill(p, (x, y) => {
        const v = p.noise(x / 18, y / 18);
        let c = base[v < 0.38 ? 1 : v > 0.62 ? 2 : 0];
        const g = p.noise(x / 4 + 20, y / 4 + 5);
        if (g > 0.8) c = shade(c, 1.15);
        // tối dần ra mép
        const d = Math.hypot((x - W / 2) / rx, (y - H / 2) / ry);
        if (d > 0.7) c = shade(c, 1 - Math.min(0.5, (d - 0.7) * 1.4));
        return c;
      });
      cracks(p, 12, 34, hx(0x1a1c2a), hx(0x5a5e80));
      // mạch khoáng hồng phát sáng (năng lượng siêu linh rỉ ra từ lòng hang)
      const nVein = Math.round(10 * areaK(p));
      for (let k = 0; k < nVein; k++) {
        let x = 40 + p.rng() * (W - 80);
        let y = 40 + p.rng() * (H - 80);
        let a = p.rng() * Math.PI * 2;
        for (let s = 0; s < 70; s++) {
          a += (p.rng() - 0.5) * 0.6;
          x += Math.cos(a) * 1.3;
          y += Math.sin(a) * 1.3;
          if (edgeDist(x, y, W, H) < WALL + 4) break;
          p.disc(x, y, 2.5, hx(0xf088c8), 0.05);
          p.set(x, y, hx(0xf088c8), 0.8);
          if (s % 9 === 0) p.set(x, y, hx(0xffd0f0));
        }
      }
      // hạt khoáng lấp lánh
      const nGlint = Math.round(180 * areaK(p));
      for (let i = 0; i < nGlint; i++) {
        const x = 30 + p.rng() * (W - 60);
        const y = 30 + p.rng() * (H - 60);
        p.set(x, y, p.rng() < 0.5 ? hx(0x8ae0e8) : hx(0xe0a0f0), 0.8);
      }
      // hồ nước ngầm
      for (const P of pools) {
        for (let y = P.y - 4; y < P.y + P.h + 4; y++) for (let x = P.x - 4; x < P.x + P.w + 4; x++) {
          if (!inRound(x, y, { x: P.x - 4, y: P.y - 4, w: P.w + 8, h: P.h + 8 }, 14)) continue;
          if (!inRound(x, y, P, 11)) {
            p.set(x, y, hsh(x >> 2, y >> 2) % 3 === 0 ? hx(0x6a6e8e) : hx(0x4a4e6a));
            continue;
          }
          const depth = Math.min(x - P.x, P.x + P.w - x, y - P.y, P.y + P.h - y);
          let c: RGB = depth > 10 ? hx(0x142a5a) : hx(0x22427a);
          if ((y * 3 + Math.floor(x / 6)) % 23 === 0) c = hx(0x4a7ac0);
          p.set(x, y, c);
        }
        // ánh pha lê phản chiếu
        for (let k = 0; k < 4; k++) p.rect(P.x + 16 + k * (P.w / 4), P.y + 12 + (k % 2) * (P.h - 30), 6, 1, hx(0xe0a0f0), 0.7);
      }
      // ô phù văn siêu linh (bẫy)
      for (const r of runes) {
        for (let y = r.y; y < r.y + r.h; y++) for (let x = r.x; x < r.x + r.w; x++) {
          const edge = x === r.x || y === r.y || x === r.x + r.w - 1 || y === r.y + r.h - 1;
          const inner = x === r.x + 3 || y === r.y + 3 || x === r.x + r.w - 4 || y === r.y + r.h - 4;
          if (edge) p.set(x, y, hx(0xf85888), 0.6);
          else if (inner && (x + y) % 3 === 0) p.set(x, y, hx(0xf85888), 0.4);
          else p.set(x, y, hx(0xf85888), r.group ? 0.06 : 0.1);
        }
        const mx = r.x + r.w / 2;
        const my = r.y + r.h / 2;
        ellipseRing(p, mx, my, 14, 12, 1, hx(0xffa0d0), 0.7);
        p.disc(mx, my, 3, hx(0xffa0d0), 0.7);
        line(p, mx - 9, my, mx + 9, my, hx(0xffa0d0), 0.5);
        line(p, mx, my - 8, mx, my + 8, hx(0xffa0d0), 0.5);
      }
      // cụm pha lê sát vách
      for (const [x, y, c] of crystals) crystalCluster(p, x, y, hx(c));
      for (const [rx2, ry2] of rocks) stalagmite(p, rx2, ry2);
      // vách hang
      border(p, (x, y, e) => {
        const v = p.noise(x / 7 + 50, y / 7 + 20);
        let c = mix(hx(0x14162a), hx(0x2c2e4a), v);
        if (v > 0.68) c = hx(0x3e4262);
        if (e === WALL - 1) c = hx(0x4a4e72);
        return c;
      }, 0.5);
    },
    layout: {
      inset: INSET,
      solids: rocks.map(([x, y]) => stalagSolid(x, y)),
      slowZones: pools,
      hazards: [{
        kind: 'pulse', areas: runes, periodMs: 3200, warnMs: 1000, fx: 'psychic', color: 0xf85888,
        damagePct: 0.07, type: 'psychic',
      }],
    },
  };
};

export const ARENAS: Record<string, ArenaDef> = {
  'victory-road': victoryRoad,
  'indigo-plateau': indigoPlateau,
  'e4-kanna': kannaHall,
  'e4-shiba': shibaHall,
  'e4-kikuko': kikukoHall,
  'e4-wataru': wataruHall,
  'champion-hall': championHall,
  'cerulean-cave': ceruleanCave,
};
