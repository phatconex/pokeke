// Sân tự vẽ của chương 6: văn phòng Công ty Silph, Võ đường Karate, Hội quán Saffron.
// Mọi vật cản trong layout được vẽ đúng vị trí, đúng kích thước với hình.
import type { ArenaDef, ArenaPainter, RGB } from './types';
import type { Rect, Solid } from '../../data/hazards';

const WALL = 22;

// ====================================================================== bút vẽ dùng chung

const clamp = (v: number) => Math.max(0, Math.min(255, Math.round(v)));
const mul = (c: RGB, k: number): RGB => [clamp(c[0] * k), clamp(c[1] * k), clamp(c[2] * k)];
const mix = (a: RGB, b: RGB, t: number): RGB => [clamp(a[0] + (b[0] - a[0]) * t), clamp(a[1] + (b[1] - a[1]) * t), clamp(a[2] + (b[2] - a[2]) * t)];
const edgeDist = (x: number, y: number, W: number, H: number) => Math.min(x, y, W - 1 - x, H - 1 - y);
const solids = (...groups: (Rect | Rect[])[]): Solid[] => groups.flatMap((g) => (Array.isArray(g) ? g : [g])).map((r) => ({ ...r }));

/** bóng đổ mềm lệch xuống phải */
function shadow(p: ArenaPainter, r: Rect, dx = 3, dy = 4, a = 0.3) {
  p.rect(r.x + dx, r.y + dy, r.w, r.h, [0, 0, 0], a);
}

/** khối có viền tối, cạnh trên sáng, cạnh dưới/phải tối */
function bevel(p: ArenaPainter, r: Rect, fill: RGB, outline: RGB) {
  p.rect(r.x, r.y, r.w, r.h, fill);
  p.rect(r.x + 1, r.y + 1, r.w - 2, 1, mul(fill, 1.25));
  p.rect(r.x + 1, r.y + 1, 1, r.h - 2, mul(fill, 1.12));
  p.rect(r.x + 1, r.y + r.h - 2, r.w - 2, 1, mul(fill, 0.72));
  p.rect(r.x + r.w - 2, r.y + 1, 1, r.h - 2, mul(fill, 0.8));
  for (let x = r.x; x < r.x + r.w; x++) {
    p.set(x, r.y, outline);
    p.set(x, r.y + r.h - 1, outline);
  }
  for (let y = r.y; y < r.y + r.h; y++) {
    p.set(r.x, y, outline);
    p.set(r.x + r.w - 1, y, outline);
  }
}

/** vòng tròn (viền) */
function ring(p: ArenaPainter, cx: number, cy: number, r0: number, r1: number, c: RGB, a = 1, sy = 1) {
  for (let y = Math.floor(cy - r1 / sy) - 1; y <= cy + r1 / sy + 1; y++) for (let x = Math.floor(cx - r1) - 1; x <= cx + r1 + 1; x++) {
    const d = Math.hypot(x - cx, (y - cy) * sy);
    if (d >= r0 && d < r1) p.set(x, y, c, a);
  }
}

/** ô dịch chuyển: đế kim loại, vòng phát sáng hồng tím, mũi tên xoáy */
function teleportPad(p: ArenaPainter, cx: number, cy: number, r: number, accent: RGB) {
  p.disc(cx + 2, cy + 3, r + 3, [0, 0, 0], 0.3);
  p.disc(cx, cy, r + 3, [58, 54, 72]);
  ring(p, cx, cy, r + 2, r + 3, [24, 20, 32]);
  p.disc(cx, cy, r + 1, [150, 146, 168]);
  p.disc(cx, cy, r - 1, [96, 70, 120]);
  for (let y = Math.floor(cy - r); y <= cy + r; y++) for (let x = Math.floor(cx - r); x <= cx + r; x++) {
    const d = Math.hypot(x - cx, y - cy);
    if (d < r - 2) p.set(x, y, mix([120, 60, 150], accent, 1 - d / r), 0.9);
  }
  ring(p, cx, cy, r - 6, r - 5, [255, 220, 250], 0.8);
  ring(p, cx, cy, r - 2, r - 1, accent);
  // 4 vạch xoáy
  for (let k = 0; k < 4; k++) {
    const a0 = (k / 4) * Math.PI * 2;
    for (let t = 0; t < 6; t++) {
      const a = a0 + t * 0.18;
      const d = r - 8 + t * 0.6;
      p.set(cx + Math.cos(a) * d, cy + Math.sin(a) * d, [255, 255, 255], 0.85);
    }
  }
  p.disc(cx, cy, 2, [255, 255, 255]);
  // bu lông viền
  for (let k = 0; k < 8; k++) {
    const a = (k / 8) * Math.PI * 2 + 0.2;
    p.set(cx + Math.cos(a) * (r + 2), cy + Math.sin(a) * (r + 2), [210, 206, 224]);
  }
}

/** chậu cây cảnh: chậu nằm gọn trong rect, tán lá nhô lên phía trên */
function pottedPlant(p: ArenaPainter, r: Rect) {
  const cx = r.x + r.w / 2;
  p.disc(cx + 2, r.y + r.h, r.w / 2 + 1, [0, 0, 0], 0.25);
  // chậu
  for (let y = r.y + r.h / 2; y < r.y + r.h; y++) {
    const inset = Math.floor((y - (r.y + r.h / 2)) / 3);
    for (let x = r.x + 1 + inset; x < r.x + r.w - 1 - inset; x++) p.set(x, y, x < cx ? [196, 118, 72] : [160, 90, 54]);
  }
  p.rect(r.x, r.y + r.h / 2 - 2, r.w, 3, [214, 140, 90]);
  p.rect(r.x, r.y + r.h / 2, r.w, 1, [120, 64, 40]);
  // lá
  const leaf: RGB[] = [[40, 110, 56], [62, 150, 72], [104, 190, 96]];
  p.disc(cx, r.y + 1, 8, leaf[0]);
  p.disc(cx - 4, r.y + 3, 5, leaf[1]);
  p.disc(cx + 4, r.y + 2, 5, leaf[1]);
  p.disc(cx - 1, r.y - 3, 5, leaf[1]);
  p.disc(cx - 3, r.y - 4, 2, leaf[2]);
  p.disc(cx + 3, r.y, 2, leaf[2]);
  p.disc(cx - 6, r.y + 2, 1.5, leaf[2]);
}

/** bóng tường đổ xuống sàn ở mép trên */
function wallShade(p: ArenaPainter) {
  for (let y = WALL; y < WALL + 6; y++) for (let x = WALL; x < p.W - WALL; x++) p.set(x, y, [0, 0, 0], (WALL + 6 - y) * 0.05);
}


// ====================================================================== 1. Văn phòng Công ty Silph

const silph: ArenaDef = (f) => {
  const { W, H } = f;
  const desks: Rect[] = [
    { x: 232, y: 58, w: 68, h: 30 },
    { x: 232, y: 272, w: 68, h: 30 },
    { x: 404, y: 58, w: 68, h: 30 },
    { x: 404, y: 272, w: 68, h: 30 },
  ].map(f.obj);
  const plants: Rect[] = [
    { x: 34, y: 36, w: 16, h: 16 },
    { x: 34, y: 308, w: 16, h: 16 },
    { x: 348, y: 36, w: 16, h: 16 },
    { x: 348, y: 308, w: 16, h: 16 },
  ].map(f.obj);
  // sân rộng: thêm chậu cây sát tường trên/dưới ở khoảng trống giữa góc và dãy bàn
  if (W >= 800) {
    const gx = Math.round((f.x(42) + desks[0].x) / 2) - 8;
    plants.push({ x: gx, y: plants[0].y, w: 16, h: 16 }, { x: gx, y: plants[1].y, w: 16, h: 16 });
    const rx = Math.round((desks[2].x + desks[2].w + f.x(548) - 14) / 2) - 8;
    plants.push({ x: rx, y: plants[0].y, w: 16, h: 16 }, { x: rx, y: plants[1].y, w: 16, h: 16 });
  }
  /** máy photocopy sát tường phải */
  const copier: Rect = f.obj({ x: 578, y: 162, w: 30, h: 36 });
  const pads = [
    { x: 92, y: 84, r: 14, to: 1 },
    { x: 548, y: 278, r: 14, to: 0 },
    { x: 92, y: 278, r: 14, to: 3 },
    { x: 548, y: 84, r: 14, to: 2 },
  ].map((pd) => ({ ...pd, x: Math.round(f.x(pd.x)), y: Math.round(f.y(pd.y)) }));
  const walkY0 = Math.round(f.y(150));
  const walkY1 = Math.round(f.y(210));
  const boxes = ([[150, 118], [470, 236], [520, 128]] as const).map(([bx, by]) => [Math.round(f.x(bx + 7) - 7), Math.round(f.y(by + 2) - 2)]);
  const stepX = Math.round(f.x(380));
  const stepY = Math.round(f.y(222));

  const draw = (p: ArenaPainter) => {
    // ---- sàn thảm ô vuông 20px, hai sắc xám xanh, vân dệt
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const tx = Math.floor(x / 20);
      const ty = Math.floor(y / 20);
      const lx = x % 20;
      const ly = y % 20;
      let c: RGB = (tx + ty) % 2 ? [92, 104, 128] : [100, 112, 136];
      if ((lx + ly * 2) % 5 === 0) c = mul(c, 0.93);
      if (lx === 0 || ly === 0) c = [76, 86, 108];
      const nz = p.noise(x / 22, y / 22);
      c = mul(c, 0.94 + nz * 0.1);
      p.set(x, y, c);
    }
    // ---- lối đi chính trải thảm sáng chạy ngang sân
    for (let y = walkY0; y < walkY1; y++) for (let x = 24; x < W - 24; x++) {
      let c: RGB = (Math.floor(x / 6) + y) % 2 ? [168, 172, 184] : [176, 180, 192];
      if (y === walkY0 || y === walkY1 - 1) c = [210, 176, 80];
      else if (y === walkY0 + 1 || y === walkY1 - 2) c = [120, 96, 40];
      p.set(x, y, c);
    }
    // ---- thảm biểu trưng giữa sân: hình thoi lồng vòng tròn (logo công ty hư cấu)
    const CX = Math.round(W / 2);
    const CY = Math.round(H / 2);
    for (let y = CY - 44; y <= CY + 44; y++) for (let x = CX - 96; x <= CX + 96; x++) {
      const dx = Math.abs(x - CX) / 96;
      const dy = Math.abs(y - CY) / 44;
      if (dx ** 4 + dy ** 4 > 1) continue;
      const e = dx ** 4 + dy ** 4;
      p.set(x, y, e > 0.82 ? [210, 176, 80] : e > 0.74 ? [120, 30, 40] : [168, 40, 52]);
    }
    ring(p, CX, CY, 24, 27, [240, 220, 150], 1, 1.1);
    for (let y = -20; y <= 20; y++) for (let x = -20; x <= 20; x++) {
      if (Math.abs(x) * 0.8 + Math.abs(y) <= 16) p.set(CX + x, CY + y, Math.abs(x) * 0.8 + Math.abs(y) > 13 ? [250, 236, 180] : x < 0 ? [236, 224, 210] : [208, 196, 186]);
    }
    p.rect(CX - 1, CY - 10, 3, 20, [168, 40, 52]);
    p.rect(CX - 8, CY - 1, 17, 3, [168, 40, 52]);

    // ---- vạch dẫn đường màu xanh nối các ô dịch chuyển (trang trí sàn)
    for (const [a, b] of [[0, 1], [2, 3]] as const) {
      const pa = pads[a];
      const pb = pads[b];
      const n = Math.round(Math.hypot(pb.x - pa.x, pb.y - pa.y) / 8.2);
      for (let i = 3; i < n - 3; i++) {
        if (i % 4 > 1) continue;
        const x = pa.x + ((pb.x - pa.x) * i) / n;
        const y = pa.y + ((pb.y - pa.y) * i) / n;
        p.disc(x, y, 1.2, [230, 140, 230], 0.35);
      }
    }

    // ---- tường: trên là dãy cửa kính nhìn ra thành phố, ba cạnh còn lại ốp gỗ + chân tường thép
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const e = edgeDist(x, y, W, H);
      if (e >= WALL) continue;
      let c: RGB;
      if (y < WALL && x >= WALL - 4 && x < W - WALL + 4) {
        // cửa kính
        const pane = Math.floor((x - 18) / 40);
        const lx = (x - 18) % 40;
        c = y < 3 || y > WALL - 4 || lx < 2 ? [64, 70, 86] : mix([40, 60, 110], [120, 150, 200], y / WALL);
        // tòa nhà phía xa
        const bh = 6 + ((pane * 7 + Math.floor(lx / 8) * 3) % 9);
        if (lx >= 2 && y >= WALL - 4 - bh && y <= WALL - 4) {
          c = [34, 40, 62];
          if ((x % 4 === 1) && (y % 3 === 0) && ((x + pane) % 3 !== 0)) c = [250, 220, 120];
        }
        // vệt phản chiếu chéo
        if (lx >= 2 && (lx + y) % 26 < 2 && y > 3 && y < WALL - 4) c = mix(c, [255, 255, 255], 0.5);
      } else {
        const panel = Math.floor((x + y) / 32) % 2;
        c = panel ? [104, 78, 58] : [96, 72, 54];
        if ((x + y) % 32 === 0) c = [70, 50, 38];
        if (e < 3) c = [56, 60, 72];
      }
      if (e === WALL - 1) c = [190, 196, 210];
      if (e === WALL - 2) c = [120, 126, 140];
      p.set(x, y, c);
    }
    wallShade(p);
    // đèn tường hai bên, rải đều theo chiều cao thật
    const nl = Math.max(3, Math.round(H / 120));
    for (let i = 1; i <= nl; i++) {
      const y = Math.round((H * i) / (nl + 1));
      for (const x of [10, W - 11]) {
        p.disc(x, y, 5, [60, 54, 50]);
        p.disc(x, y, 3, [255, 236, 170]);
        p.disc(x, y, 9, [255, 236, 170], 0.15);
      }
    }

    // ---- ô dịch chuyển
    for (const pad of pads) teleportPad(p, pad.x, pad.y, pad.r, [240, 120, 230]);

    // ---- bàn làm việc
    desks.forEach((d, i) => silphDesk(p, d, i % 2 === 1));
    // ---- cây cảnh
    for (const pl of plants) pottedPlant(p, pl);
    // ---- máy photocopy
    const cp = copier;
    shadow(p, cp, -3, 4);
    bevel(p, cp, [206, 208, 216], [70, 72, 84]);
    p.rect(cp.x + 3, cp.y + 3, cp.w - 6, 9, [160, 164, 178]);
    p.rect(cp.x + 5, cp.y + 5, cp.w - 10, 5, [96, 200, 230]);
    p.rect(cp.x + 4, cp.y + 16, cp.w - 8, 3, [120, 124, 136]);
    p.rect(cp.x + 4, cp.y + 22, cp.w - 8, 3, [120, 124, 136]);
    p.rect(cp.x + 6, cp.y + 14, 10, 2, [252, 252, 246]);
    p.disc(cp.x + cp.w - 7, cp.y + 30, 1.5, [80, 230, 110]);
    p.disc(cp.x + cp.w - 12, cp.y + 30, 1.5, [240, 80, 80]);

    // ---- thùng carton của lính Hỏa Tiễn bỏ lại (trang trí phẳng trên sàn)
    for (const [bx, by] of boxes) {
      p.rect(bx + 2, by + 3, 14, 4, [0, 0, 0], 0.2);
      p.rect(bx, by, 14, 5, [196, 150, 96]);
      p.rect(bx, by, 14, 1, [222, 180, 120]);
      p.rect(bx + 6, by, 2, 5, [150, 110, 64]);
    }
    // vết giày lấm bùn của lính
    for (let k = 0; k < 9; k++) {
      const x = stepX + k * 18;
      const y = stepY + (k % 2) * 7;
      p.rect(x, y, 3, 2, [60, 66, 80], 0.6);
    }
  };

  return {
    draw,
    layout: {
      inset: 24,
      solids: solids(desks, plants, copier),
      hazards: [{ kind: 'teleport', pads }],
    },
  };
};

function silphDesk(p: ArenaPainter, d: Rect, flip: boolean) {
  shadow(p, d);
  // mặt bàn gỗ sẫm
  bevel(p, d, [138, 96, 62], [52, 34, 22]);
  for (let y = d.y + 3; y < d.y + d.h - 3; y += 4) for (let x = d.x + 3; x < d.x + d.w - 3; x++) if ((x * 3 + y) % 11 === 0) p.set(x, y, [118, 80, 50]);
  // màn hình máy tính
  const mx = d.x + 10;
  const my = flip ? d.y + d.h - 16 : d.y + 3;
  p.rect(mx, my, 20, 13, [34, 36, 46]);
  p.rect(mx + 2, my + 2, 16, 8, [60, 170, 210]);
  p.rect(mx + 3, my + 3, 9, 1, [190, 240, 255]);
  p.rect(mx + 3, my + 5, 12, 1, [150, 220, 240]);
  p.rect(mx + 3, my + 7, 7, 1, [150, 220, 240]);
  p.rect(mx + 8, my + 13 - (flip ? 16 : 0), 4, 2, [70, 72, 84]);
  // bàn phím
  const ky = flip ? d.y + 4 : d.y + d.h - 9;
  p.rect(mx - 1, ky, 22, 5, [210, 212, 220]);
  for (let x = mx; x < mx + 20; x += 2) p.set(x, ky + 2, [140, 142, 156]);
  // chồng giấy + cốc cà phê
  p.rect(d.x + d.w - 26, d.y + 7, 14, 10, [240, 240, 232]);
  p.rect(d.x + d.w - 24, d.y + 5, 14, 10, [252, 252, 246]);
  for (let k = 0; k < 3; k++) p.rect(d.x + d.w - 22, d.y + 8 + k * 2, 9, 1, [170, 170, 190]);
  p.disc(d.x + d.w - 7, d.y + d.h - 9, 3, [236, 236, 240]);
  p.disc(d.x + d.w - 7, d.y + d.h - 9, 2, [96, 56, 30]);
  // ghế xoay (nằm trong rect, phía lối đi)
  const cy = flip ? d.y + 4 : d.y + d.h - 5;
  p.disc(d.x + d.w / 2 + 8, cy, 4, [40, 44, 60]);
  p.disc(d.x + d.w / 2 + 8, cy, 2, [70, 76, 100]);
}

// ====================================================================== 2. Võ đường Karate

const dojo: ArenaDef = (f) => {
  const { W, H } = f;
  const CX = Math.round(W / 2);
  const CY = Math.round(H / 2);
  const pillars: Rect[] = [
    { x: 84, y: 52, w: 18, h: 24 },
    { x: 538, y: 52, w: 18, h: 24 },
    { x: 84, y: 284, w: 18, h: 24 },
    { x: 538, y: 284, w: 18, h: 24 },
  ].map(f.obj);
  /** cọc gỗ tập đấm (makiwara) */
  const posts: Rect[] = [
    { x: 312, y: 70, w: 16, h: 18 },
    { x: 312, y: 272, w: 16, h: 18 },
  ].map(f.obj);
  /** giá binh khí gỗ sát tường trái/phải */
  const racks: Rect[] = [
    { x: 24, y: 150, w: 12, h: 60 },
    { x: 604, y: 150, w: 12, h: 60 },
  ].map(f.obj);
  // sân cao: thêm 2 giá binh khí mỗi bên tường (trên/dưới giá giữa)
  if (H >= 450) {
    const base = [...racks];
    for (const rk of base) {
      const dy = Math.round((H - 2 * WALL) / 4);
      racks.push({ ...rk, y: rk.y - dy }, { ...rk, y: rk.y + dy });
    }
  }
  // chiếu tatami: giữ ô chiếu 85×84, số ô theo kích thước sân, căn giữa
  const ta = f.area({ x: 150, y: 96, w: 340, h: 168 });
  const cols = Math.max(4, Math.floor(ta.w / 85));
  const rows = Math.max(2, Math.floor(ta.h / 84));
  const T = { x: CX - Math.round((cols * 85) / 2), y: CY - rows * 42, w: cols * 85, h: rows * 84 };
  // tranh cuộn trên vách: khoảng cách 110px, căn giữa
  const nScroll = Math.max(3, 1 + 2 * Math.floor((W - 2 * WALL - 260) / 220));
  const scrolls = Array.from({ length: nScroll }, (_, i) => CX - 10 + (i - (nScroll - 1) / 2) * 110);
  const towel = { x: Math.round(f.x(461) - 9), y: Math.round(f.y(305) - 3) };

  const draw = (p: ArenaPainter) => {
    // ---- sàn gỗ ván ngang 10px, mỗi hàng lệch mối nối
    for (let y = 0; y < H; y++) {
      const row = Math.floor(y / 10);
      const ly = y % 10;
      const off = (row * 37) % 60;
      for (let x = 0; x < W; x++) {
        const plank = Math.floor((x + off) / 60);
        const v = ((plank * 13 + row * 7) % 5) / 5;
        let c: RGB = [170 + v * 22, 120 + v * 16, 74 + v * 10];
        const grain = p.noise(x / 9, y / 2.5 + plank * 3);
        c = mul(c, 0.9 + grain * 0.16);
        if (ly === 9) c = [104, 68, 40];
        else if (ly === 0) c = mul(c, 1.1);
        if ((x + off) % 60 === 0) c = [110, 72, 42];
        p.set(x, y, c);
      }
    }
    // ---- chiếu tatami giữa sân: dọc + ngang xen kẽ, viền vải xanh rêu
    const mats: Rect[] = [];
    for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
      const x = T.x + c * 85;
      const y = T.y + r * 84;
      if ((r + c) % 2 === 0) mats.push({ x, y, w: 85, h: 42 }, { x, y: y + 42, w: 85, h: 42 });
      else mats.push({ x, y, w: 42, h: 84 }, { x: x + 42, y, w: 43, h: 84 });
    }
    for (const m of mats) {
      for (let y = m.y; y < m.y + m.h; y++) for (let x = m.x; x < m.x + m.w; x++) {
        const horiz = m.w > m.h;
        const weave = horiz ? (x % 3 === 0) : (y % 3 === 0);
        let c: RGB = weave ? [190, 186, 116] : [206, 200, 132];
        c = mul(c, 0.95 + p.noise(x / 14, y / 14) * 0.1);
        const e = Math.min(x - m.x, y - m.y, m.x + m.w - 1 - x, m.y + m.h - 1 - y);
        // viền vải (chỉ ở hai cạnh dài)
        const longEdge = horiz ? Math.min(y - m.y, m.y + m.h - 1 - y) : Math.min(x - m.x, m.x + m.w - 1 - x);
        if (longEdge < 3) c = longEdge === 0 ? [30, 52, 34] : [52, 84, 56];
        else if (e === 0) c = [150, 140, 86];
        p.set(x, y, c);
      }
    }
    // viền gỗ quanh khu tatami
    for (let x = T.x - 3; x < T.x + T.w + 3; x++) for (const y of [T.y - 3, T.y - 2, T.y - 1, T.y + T.h, T.y + T.h + 1, T.y + T.h + 2]) p.set(x, y, y === T.y - 3 || y === T.y + T.h + 2 ? [70, 44, 24] : [126, 84, 46]);
    for (let y = T.y - 3; y < T.y + T.h + 3; y++) for (const x of [T.x - 3, T.x - 2, T.x - 1, T.x + T.w, T.x + T.w + 1, T.x + T.w + 2]) p.set(x, y, x === T.x - 3 || x === T.x + T.w + 2 ? [70, 44, 24] : [126, 84, 46]);
    // vòng đấu đỏ giữa sân
    ring(p, CX, CY, 40, 43, [176, 40, 36], 0.85, 1.15);
    ring(p, CX, CY, 4, 7, [176, 40, 36], 0.85, 1.15);
    // hai vạch xuất phát
    for (const x of [CX - 58, CX + 58]) p.rect(x - 1, CY - 12, 3, 24, [240, 236, 220], 0.85);

    // ---- tường: trên là vách giấy shoji có khung gỗ, hai bên + dưới là gỗ sẫm có nẹp
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const e = edgeDist(x, y, W, H);
      if (e >= WALL) continue;
      let c: RGB;
      if (y < WALL && x >= WALL - 2 && x < W - WALL + 2) {
        const lx = (x - 20) % 30;
        const ly = y % 7;
        c = [244, 238, 220];
        if (lx === 0 || lx === 1 || ly === 0 || y < 2 || y > WALL - 3) c = [90, 58, 34];
        else if (lx === 15) c = [150, 108, 66];
        else c = mix(c, [255, 220, 160], 0.15 + 0.1 * Math.sin(x / 40));
      } else {
        const lx = x % 14;
        c = [84, 54, 32];
        if (lx === 0) c = [56, 34, 20];
        if (lx === 7) c = [100, 66, 40];
        if ((y % 40) < 2) c = [120, 82, 50];
      }
      if (e === WALL - 1) c = [200, 160, 100];
      if (e === WALL - 2) c = [60, 38, 22];
      p.set(x, y, c);
    }
    wallShade(p);
    // tranh cuộn treo trên vách (chỉ là nét vẽ trừu tượng)
    for (const sx0 of scrolls) {
      const sx = Math.round(sx0);
      p.rect(sx - 1, 1, 22, 2, [70, 44, 24]);
      p.rect(sx, 3, 20, 16, [246, 240, 226]);
      p.rect(sx, 3, 1, 16, [200, 180, 140]);
      p.rect(sx + 19, 3, 1, 16, [200, 180, 140]);
      for (let k = 0; k < 9; k++) p.rect(sx + 9 + Math.round(Math.sin(k + sx) * 3), 5 + k, 2, 1, [30, 26, 30]);
      p.disc(sx + 15, 16, 1.5, [200, 40, 40]);
      p.rect(sx - 1, 19, 22, 2, [70, 44, 24]);
    }
    // đèn lồng giấy ở bốn góc tường
    for (const [lx, ly] of [[40, 11], [W - 41, 11], [11, H - 40], [W - 12, H - 40]] as const) {
      p.disc(lx, ly, 7, [200, 60, 40]);
      p.disc(lx - 2, ly - 2, 3, [250, 140, 90]);
      p.rect(lx - 5, ly - 1, 11, 1, [130, 30, 20]);
      p.rect(lx - 5, ly + 3, 11, 1, [130, 30, 20]);
      p.disc(lx, ly, 14, [255, 200, 120], 0.12);
    }

    // ---- giá binh khí (gậy gỗ dựng đứng)
    for (const rk of racks) {
      shadow(p, rk, rk.x < W / 2 ? 2 : -2, 3, 0.3);
      bevel(p, rk, [116, 76, 44], [50, 30, 16]);
      for (let k = 0; k < 4; k++) {
        const sy = rk.y + 6 + k * 13;
        p.rect(rk.x + 2, sy, rk.w - 4, 2, [196, 160, 110]);
        p.rect(rk.x + 3, sy + 2, rk.w - 6, 8, [150, 104, 60]);
        p.rect(rk.x + 3, sy + 2, 2, 8, [176, 128, 80]);
      }
    }
    // ---- cột gỗ lớn
    for (const pl of pillars) {
      p.disc(pl.x + pl.w / 2 + 3, pl.y + pl.h + 1, pl.w / 2 + 2, [0, 0, 0], 0.3);
      bevel(p, pl, [128, 82, 46], [48, 28, 14]);
      for (let y = pl.y + 2; y < pl.y + pl.h - 2; y++) {
        p.set(pl.x + 4, y, [160, 108, 64]);
        p.set(pl.x + 9 + ((y >> 2) % 2), y, [104, 66, 36]);
      }
      // đai sắt + bệ đá
      p.rect(pl.x, pl.y + 5, pl.w, 2, [60, 60, 66]);
      p.rect(pl.x - 1, pl.y + pl.h - 5, pl.w + 2, 5, [150, 146, 136]);
      p.rect(pl.x - 1, pl.y + pl.h - 5, pl.w + 2, 1, [196, 192, 182]);
      p.rect(pl.x - 1, pl.y + pl.h - 1, pl.w + 2, 1, [80, 76, 70]);
    }
    // ---- cọc tập đấm quấn rơm
    for (const po of posts) {
      p.disc(po.x + po.w / 2 + 2, po.y + po.h, 8, [0, 0, 0], 0.3);
      // đế gỗ
      p.rect(po.x, po.y + po.h - 5, po.w, 5, [90, 58, 30]);
      p.rect(po.x, po.y + po.h - 5, po.w, 1, [140, 96, 56]);
      // cọc
      p.rect(po.x + 4, po.y, po.w - 8, po.h - 5, [150, 104, 60]);
      p.rect(po.x + 4, po.y, 2, po.h - 5, [180, 132, 84]);
      // đệm rơm buộc dây
      p.rect(po.x + 2, po.y + 2, po.w - 4, 7, [214, 190, 110]);
      for (let x = po.x + 2; x < po.x + po.w - 2; x += 2) p.set(x, po.y + 3 + (x % 3), [176, 150, 80]);
      p.rect(po.x + 2, po.y + 4, po.w - 4, 1, [120, 40, 30]);
      p.rect(po.x + 2, po.y + 7, po.w - 4, 1, [120, 40, 30]);
    }
    // ---- đồ trang trí trên sàn: khăn và bình nước
    const { x: tx, y: ty } = towel;
    p.rect(tx, ty, 18, 6, [236, 236, 230]);
    p.rect(tx, ty, 18, 1, [255, 255, 255]);
    p.rect(tx, ty + 4, 18, 2, [200, 60, 50]);
    p.disc(tx + 28, ty + 3, 4, [80, 120, 170]);
    p.disc(tx + 27, ty + 1, 1.5, [190, 220, 250]);
  };

  return {
    draw,
    layout: {
      inset: 24,
      solids: solids(pillars, posts, racks),
    },
  };
};

// ====================================================================== 3. Hội quán Saffron

const saffron: ArenaDef = (f) => {
  const { W, H } = f;
  const CX = Math.round(W / 2);
  const CY = Math.round(H / 2);
  /**
   * vách ngăn thấp chia sân thành các "phòng": mọc từ tường trên/dưới, lối đi ngang giữa luôn mở
   * (bề ngang giữ 14px, chiều dài giãn theo sân; đỉnh vách bám tường)
   */
  const vwall = (cx: number, y0: number, y1: number): Rect => {
    const top = Math.round(f.y(y0));
    return { x: Math.round(f.x(cx)) - 7, y: top, w: 14, h: Math.round(f.y(y1)) - top };
  };
  const walls: Rect[] = [vwall(233, 24, 106), vwall(233, 254, 336), vwall(407, 24, 106), vwall(407, 254, 336)];
  /** bệ quả cầu pha lê giữa sân */
  const orb: Rect = f.obj({ x: 310, y: 172, w: 20, h: 16 });
  /** 3 cặp ô dịch chuyển: góc trên trái ↔ góc dưới phải, góc dưới trái ↔ góc trên phải, phòng giữa trên ↔ dưới */
  const pads = [
    { x: 132, y: 64, r: 14, to: 1 },
    { x: 508, y: 296, r: 14, to: 0 },
    { x: 132, y: 296, r: 14, to: 3 },
    { x: 508, y: 64, r: 14, to: 2 },
    { x: 320, y: 62, r: 14, to: 5 },
    { x: 320, y: 298, r: 14, to: 4 },
  ].map((pd) => ({ ...pd, x: Math.round(f.x(pd.x)), y: Math.round(f.y(pd.y)) }));
  /** tấm sàn siêu linh: 3 nhóm luân phiên phóng sóng (4 tấm giữa giữ kích thước, 2 dải sát tường giãn theo sân) */
  const plates: (Rect & { group: number })[] = [
    f.obj({ x: 252, y: 116, w: 56, h: 54, group: 0 }),
    f.obj({ x: 332, y: 190, w: 56, h: 54, group: 0 }),
    f.obj({ x: 332, y: 116, w: 56, h: 54, group: 1 }),
    f.obj({ x: 252, y: 190, w: 56, h: 54, group: 1 }),
    f.area({ x: 32, y: 134, w: 50, h: 92, group: 2 }),
    f.area({ x: 558, y: 134, w: 50, h: 92, group: 2 }),
  ];
  /** pháp trận: bán kính giãn theo chiều ít giãn hơn của sân */
  const k = Math.min((W - 96) / 544, (H - 96) / 264);
  const lamps = [[34, 34], [W - 34, 34], [34, H - 34], [W - 34, H - 34]] as const;

  const draw = (p: ArenaPainter) => {
    // ---- sàn đá tím 24px, đường ron phát sáng mờ
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const tx = Math.floor(x / 24);
      const ty = Math.floor(y / 24);
      const lx = x % 24;
      const ly = y % 24;
      const v = ((tx * 7 + ty * 11) % 5) * 3;
      let c: RGB = [66 + v, 50 + v, 92 + v];
      c = mul(c, 0.94 + p.noise(x / 16, y / 16) * 0.12);
      if (lx === 0 || ly === 0) c = [118, 82, 150];
      else if (lx === 23 || ly === 23) c = [40, 30, 58];
      else if (lx === 1 || ly === 1) c = mix(c, [150, 110, 190], 0.4);
      p.set(x, y, c);
    }
    // ---- vòng pháp trận đồng tâm quanh tâm sân
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const d = Math.hypot(x - CX, (y - CY) * 1.2) / k;
      if (d > 150) continue;
      if ((d > 146 && d < 149) || (d > 104 && d < 106)) p.set(x, y, [230, 120, 200], 0.6);
      else if (d < 146 && d > 106) p.set(x, y, [120, 60, 140], 0.12);
    }
    // các chấm sao quanh vòng ngoài
    const ns = Math.round((24 * k) / 3) * 3;
    for (let i = 0; i < ns; i++) {
      const a = (i / ns) * Math.PI * 2;
      const x = CX + Math.cos(a) * 126 * k;
      const y = CY + (Math.sin(a) * 126 * k) / 1.2;
      p.disc(x, y, i % 3 === 0 ? 2 : 1, [255, 200, 250], 0.8);
    }
    // ---- tấm sàn siêu linh: đá hồng có hoa văn con mắt
    for (const pl of plates) {
      const accent: RGB = pl.group === 0 ? [236, 110, 190] : pl.group === 1 ? [200, 120, 240] : [250, 150, 170];
      for (let y = pl.y; y < pl.y + pl.h; y++) for (let x = pl.x; x < pl.x + pl.w; x++) {
        const e = Math.min(x - pl.x, y - pl.y, pl.x + pl.w - 1 - x, pl.y + pl.h - 1 - y);
        let c: RGB = mix([96, 52, 110], accent, 0.18 + 0.08 * Math.sin((x + y) / 5));
        if (e === 0) c = [40, 20, 50];
        else if (e === 1) c = accent;
        else if (e === 2) c = mul(accent, 0.6);
        p.set(x, y, c);
      }
      // con mắt ở giữa tấm
      const ex = Math.round(pl.x + pl.w / 2);
      const ey = Math.round(pl.y + pl.h / 2);
      for (let y = -6; y <= 6; y++) for (let x = -12; x <= 12; x++) {
        const inEye = (x / 12) ** 2 + (y / 6) ** 2 <= 1;
        if (!inEye) continue;
        const edge = (x / 12) ** 2 + (y / 6) ** 2 > 0.7;
        p.set(ex + x, ey + y, edge ? accent : [250, 236, 250]);
      }
      p.disc(ex, ey, 4, [120, 40, 140]);
      p.disc(ex, ey, 2, [20, 10, 30]);
      p.set(ex - 1, ey - 2, [255, 255, 255]);
    }

    // ---- tường đá tím, rãnh rune hồng
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const e = edgeDist(x, y, W, H);
      if (e >= WALL) continue;
      const bx = Math.floor((x + (Math.floor(y / 11) % 2) * 14) / 28);
      const by = Math.floor(y / 11);
      const v = ((bx * 31 + by * 17) % 6) * 4;
      let c: RGB = [48 + v, 34 + v, 66 + v];
      if ((x + (Math.floor(y / 11) % 2) * 14) % 28 === 0 || y % 11 === 0) c = [26, 18, 38];
      if (e === 10 && (x + y) % 14 < 9) c = [230, 110, 200];
      if (e === WALL - 1) c = [210, 170, 230];
      if (e === WALL - 2) c = [90, 60, 110];
      p.set(x, y, c);
    }
    wallShade(p);
    // cột đèn pha lê bốn góc
    for (const [px, py] of lamps) {
      p.disc(px + 2, py + 3, 11, [0, 0, 0], 0.3);
      p.disc(px, py, 11, [70, 50, 90]);
      p.disc(px, py, 7, [200, 120, 230]);
      p.disc(px - 2, py - 2, 3, [255, 230, 255]);
      p.disc(px, py, 18, [240, 140, 230], 0.12);
    }

    // ---- vách ngăn: tấm kính tím khung kim loại
    for (const w of walls) {
      shadow(p, w, 3, 4, 0.35);
      bevel(p, w, [92, 72, 120], [30, 20, 44]);
      p.rect(w.x + 3, w.y + 3, w.w - 6, w.h - 6, [150, 120, 200]);
      for (let y = w.y + 3; y < w.y + w.h - 3; y++) {
        p.set(w.x + 4, y, [220, 200, 250]);
        if ((y - w.y) % 16 === 0) p.rect(w.x + 3, y, w.w - 6, 1, [92, 72, 120]);
      }
      // vạch phát sáng ở đầu vách (hướng vào lối đi)
      const tipY = w.y < CY ? w.y + w.h - 3 : w.y + 1;
      p.rect(w.x + 1, tipY, w.w - 2, 2, [255, 150, 230]);
      p.disc(w.x + w.w / 2, tipY + 1, 9, [255, 150, 230], 0.12);
    }

    // ---- ô dịch chuyển
    pads.forEach((pad, i) => teleportPad(p, pad.x, pad.y, pad.r, i < 2 ? [250, 120, 220] : i < 4 ? [150, 140, 255] : [255, 180, 120]));

    // ---- bệ quả cầu pha lê
    const o = orb;
    p.disc(o.x + o.w / 2 + 2, o.y + o.h + 1, 11, [0, 0, 0], 0.3);
    bevel(p, { x: o.x, y: o.y + 6, w: o.w, h: o.h - 6 }, [120, 100, 140], [40, 28, 54]);
    p.rect(o.x + 2, o.y + o.h - 3, o.w - 4, 1, [200, 180, 220]);
    p.disc(o.x + o.w / 2, o.y + 3, 8, [80, 40, 120]);
    p.disc(o.x + o.w / 2, o.y + 3, 7, [190, 120, 240]);
    p.disc(o.x + o.w / 2 + 1, o.y + 4, 4, [230, 160, 250]);
    p.disc(o.x + o.w / 2 - 3, o.y, 2, [255, 255, 255]);
    p.disc(o.x + o.w / 2, o.y + 3, 16, [240, 140, 230], 0.12);

    // ---- vòng xuất phát hai bên
    for (const s of [f.startL, f.startR]) ring(p, s.x, s.y, 30, 33, [230, 150, 220], 0.7, 1.6);
  };

  return {
    draw,
    layout: {
      inset: 24,
      solids: solids(walls, orb),
      hazards: [
        { kind: 'teleport', pads },
        {
          kind: 'pulse', areas: plates, periodMs: 3000, warnMs: 1000, fx: 'psychic', color: 0xf85888,
          damagePct: 0.08, type: 'psychic', slowMs: 600,
        },
      ],
    },
  };
};

// ====================================================================== đăng ký sân

export const ARENAS: Record<string, ArenaDef> = {
  'silph-office': silph,
  dojo,
  'gym-saffron': saffron,
};
