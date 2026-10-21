// Sân tự vẽ của chương 5: Hang ổ Hỏa Tiễn, Đường Xe Đạp, Khu Safari, Hội quán Fuchsia.
// Mọi vật cản trong layout được vẽ đúng vị trí, đúng kích thước với hình (trừ tường tàng hình của Kyo).
// Người chơi xuất phát quanh f.startL – khu này luôn để trống; địch xuất hiện ở nửa phải.
// Sân dựng theo khung (ArenaFrame): toạ độ thiết kế 640×360 được đổi qua f.obj / f.area / f.x / f.y.
import type { ArenaDef, ArenaFrame, ArenaPainter, RGB } from './types';
import type { HazardDef, Rect, Solid } from '../../data/hazards';

const WALL = 22;

// ====================================================================== bút vẽ dùng chung

const clamp = (v: number) => Math.max(0, Math.min(255, Math.round(v)));
const mul = (c: RGB, k: number): RGB => [clamp(c[0] * k), clamp(c[1] * k), clamp(c[2] * k)];
const mix = (a: RGB, b: RGB, t: number): RGB => [clamp(a[0] + (b[0] - a[0]) * t), clamp(a[1] + (b[1] - a[1]) * t), clamp(a[2] + (b[2] - a[2]) * t)];
const edgeDist = (x: number, y: number, W: number, H: number) => Math.min(x, y, W - 1 - x, H - 1 - y);
/** hệ số diện tích so với bản 640×360 (giữ mật độ chi tiết rải ngẫu nhiên) */
const areaK = (f: ArenaFrame) => (f.W * f.H) / (640 * 360);
const BLACK: RGB = [0, 0, 0];

function shadow(p: ArenaPainter, r: Rect, dx = 3, dy = 4, a = 0.32) {
  p.rect(r.x + dx, r.y + dy, r.w, r.h, BLACK, a);
}

function outline(p: ArenaPainter, r: Rect, c: RGB) {
  for (let x = r.x; x < r.x + r.w; x++) {
    p.set(x, r.y, c);
    p.set(x, r.y + r.h - 1, c);
  }
  for (let y = r.y; y < r.y + r.h; y++) {
    p.set(r.x, y, c);
    p.set(r.x + r.w - 1, y, c);
  }
}

/** khối có viền tối, cạnh trên/trái sáng, cạnh dưới/phải tối */
function bevel(p: ArenaPainter, r: Rect, fill: RGB, edge: RGB) {
  p.rect(r.x, r.y, r.w, r.h, fill);
  p.rect(r.x + 1, r.y + 1, r.w - 2, 1, mul(fill, 1.25));
  p.rect(r.x + 1, r.y + 1, 1, r.h - 2, mul(fill, 1.12));
  p.rect(r.x + 1, r.y + r.h - 2, r.w - 2, 1, mul(fill, 0.72));
  p.rect(r.x + r.w - 2, r.y + 1, 1, r.h - 2, mul(fill, 0.8));
  outline(p, r, edge);
}

/** đoạn thẳng 1px (Bresenham đơn giản) */
function line(p: ArenaPainter, x0: number, y0: number, x1: number, y1: number, c: RGB, a = 1) {
  const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0), 1);
  for (let i = 0; i <= n; i++) p.set(x0 + ((x1 - x0) * i) / n, y0 + ((y1 - y0) * i) / n, c, a);
}

/** vòng tròn viền (elip theo sy) */
function ring(p: ArenaPainter, cx: number, cy: number, r0: number, r1: number, c: RGB, a = 1, sy = 1) {
  for (let y = Math.floor(cy - r1 / sy) - 1; y <= cy + r1 / sy + 1; y++) {
    for (let x = Math.floor(cx - r1) - 1; x <= cx + r1 + 1; x++) {
      const d = Math.hypot(x - cx, (y - cy) * sy);
      if (d >= r0 && d < r1) p.set(x, y, c, a);
    }
  }
}

/** vòng xuất phát (gym) */
function startRing(p: ArenaPainter, cx: number, cy: number, c: RGB) {
  ring(p, cx, cy, 31, 34, c, 1, 1.6);
  ring(p, cx, cy, 0, 30, c, 0.12, 1.6);
}

/** sọc cảnh báo vàng – đen trong một hình chữ nhật */
function hazardStripes(p: ArenaPainter, r: Rect, period = 8) {
  for (let y = r.y; y < r.y + r.h; y++) for (let x = r.x; x < r.x + r.w; x++) {
    p.set(x, y, Math.floor((x + y) / (period / 2)) % 2 ? [36, 36, 40] : [240, 196, 40]);
  }
}

// ====================================================================== 1. Hang ổ Hỏa Tiễn

/** chữ R 5×7 */
const GLYPH_R = ['11110', '10001', '10001', '11110', '10100', '10010', '10001'];

function crate(p: ArenaPainter, x: number, y: number, w: number, h: number) {
  const r = { x, y, w, h };
  bevel(p, r, [150, 104, 56], [56, 36, 18]);
  for (let yy = y + 5; yy < y + h - 2; yy += 6) p.rect(x + 2, yy, w - 4, 1, [116, 78, 40]);
  // nẹp chéo chữ X
  line(p, x + 2, y + 2, x + w - 3, y + h - 3, [184, 136, 80]);
  line(p, x + w - 3, y + 2, x + 2, y + h - 3, [184, 136, 80]);
  line(p, x + 3, y + 2, x + w - 2, y + h - 3, [96, 64, 32], 0.6);
  // đinh góc
  for (const [cx, cy] of [[x + 2, y + 2], [x + w - 3, y + 2], [x + 2, y + h - 3], [x + w - 3, y + h - 3]]) p.set(cx, cy, [210, 200, 180]);
}

/** cột thép (vật cản 22×22) */
function steelPillar(p: ArenaPainter, r: Rect) {
  shadow(p, r, 4, 5, 0.38);
  for (let y = r.y; y < r.y + r.h; y++) for (let x = r.x; x < r.x + r.w; x++) {
    const t = (x - r.x) / r.w;
    p.set(x, y, mix([150, 156, 172], [64, 68, 80], t));
  }
  p.rect(r.x + 2, r.y + 2, r.w - 4, 3, [180, 186, 200]);
  outline(p, r, [26, 28, 36]);
  for (const [cx, cy] of [[3, 3], [r.w - 4, 3], [3, r.h - 4], [r.w - 4, r.h - 4]]) p.set(r.x + cx, r.y + cy, [220, 224, 236]);
  p.rect(r.x + 1, r.y + r.h - 5, r.w - 2, 3, [176, 30, 40]);
}

const rocketHideout: ArenaDef = (f) => {
  const { W, H } = f;
  const cratesTop: Solid = f.obj({ x: 248, y: 24, w: 46, h: 40 });
  const computers: Solid = f.obj({ x: 506, y: 24, w: 82, h: 28 });
  const pillarA: Solid = f.obj({ x: 296, y: 106, w: 22, h: 22 });
  const pillarB: Solid = f.obj({ x: 338, y: 232, w: 22, h: 22 });
  const cratesBot: Solid = f.obj({ x: 434, y: 296, w: 48, h: 40 });
  const generator: Solid = f.obj({ x: 54, y: 300, w: 66, h: 36 });
  const barrels: Solid = f.obj({ x: 572, y: 212, w: 44, h: 32 });
  /** sàn mũi tên trượt (băng chuyền của Hỏa Tiễn) */
  const spinners: Rect[] = [f.area({ x: 380, y: 80, w: 112, h: 48 }), f.area({ x: 146, y: 252, w: 128, h: 48 })];
  // sân rộng: thêm một chồng thùng (trái trên) và một cột thép (phải dưới) cho bớt trống
  const big = W >= 800;
  const cratesExtra: Solid | null = big ? f.obj({ x: 92, y: 24, w: 46, h: 40 }) : null;
  const pillarC: Solid | null = big ? f.obj({ x: 520, y: 290, w: 22, h: 22 }) : null;
  const barrelsB: Solid | null = big ? f.obj({ x: 24, y: 150, w: 44, h: 32 }) : null;
  const CX = Math.round(f.x(327));
  const CY = Math.round(f.y(180));

  const draw = (p: ArenaPainter) => {
    // ---- sàn thép 20px: đinh tán, vết bẩn, lưới thông gió ----
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const lx = x % 20;
      const ly = y % 20;
      const tx = Math.floor(x / 20);
      const ty = Math.floor(y / 20);
      const v = ((tx * 7 + ty * 11) % 5) * 3;
      const n = p.noise(x / 14, y / 14) * 10;
      let c: RGB = [56 + v + n, 60 + v + n, 72 + v + n * 1.2];
      if ((tx * 3 + ty * 5) % 11 === 0) {
        // tấm lưới thông gió
        c = ly % 4 < 2 && lx > 2 && lx < 17 && ly > 2 && ly < 17 ? [26, 28, 34] : [74, 78, 90];
      }
      if (lx === 19 || ly === 19) c = [32, 34, 42];
      else if (lx === 0 || ly === 0) c = [86, 90, 104];
      if ((lx === 2 || lx === 17) && (ly === 2 || ly === 17)) c = [124, 128, 144];
      p.set(x, y, c);
    }
    // vết dầu loang
    const oil = Math.round(9 * areaK(f));
    for (let i = 0; i < oil; i++) {
      const cx = 60 + p.rng() * (W - 120);
      const cy = 50 + p.rng() * (H - 100);
      p.disc(cx, cy, 6 + p.rng() * 8, [18, 18, 26], 0.35);
      p.disc(cx - 2, cy - 2, 3, [70, 60, 110], 0.25);
    }
    // dây cáp chạy từ dàn máy tính xuống máy phát (đi sát tường, không cản đường)
    const cableX = Math.round(f.x(600));
    const cableY = Math.round(f.y(330));
    for (let y = computers.y + computers.h; y < f.y(300); y++) {
      const x = cableX + Math.round(Math.sin(y / 30) * 2);
      if (y > barrels.y - 2 && y < barrels.y + barrels.h + 2) continue;
      p.set(x, y, [22, 22, 26]);
      p.set(x + 1, y, [60, 60, 70]);
    }
    for (let x = generator.x + generator.w; x < cableX; x++) {
      const y = cableY + Math.round(Math.sin(x / 26) * 1.5);
      if (x > cratesBot.x - 2 && x < cratesBot.x + cratesBot.w + 2) continue;
      if (pillarC && x > pillarC.x - 2 && x < pillarC.x + pillarC.w + 2 && y > pillarC.y - 2 && y < pillarC.y + pillarC.h + 2) continue;
      p.set(x, y, [22, 22, 26]);
      p.set(x, y - 1, [60, 60, 70]);
    }

    // ---- sàn mũi tên trượt ----
    for (const a of spinners) {
      for (let y = a.y; y < a.y + a.h; y++) for (let x = a.x; x < a.x + a.w; x++) {
        const lx = (x - a.x) % 16;
        const ly = (y - a.y) % 16;
        const t = Math.floor((x - a.x) / 16) + Math.floor((y - a.y) / 16);
        let c: RGB = t % 2 ? [40, 92, 108] : [46, 104, 122];
        if (lx === 15 || ly === 15) c = [24, 52, 62];
        // mũi tên ">" (ô chẵn) hoặc "v" (ô lẻ)
        const u = lx - 7.5;
        const v = ly - 7.5;
        const arrow = t % 2 ? Math.abs(Math.abs(u) - (v + 4) * 0.9) < 1.1 && v > -4 && v < 4 : Math.abs(Math.abs(v) - (u + 4) * 0.9) < 1.1 && u > -4 && u < 4;
        if (arrow) c = [130, 230, 238];
        p.set(x, y, c);
      }
      // viền sọc cảnh báo
      hazardStripes(p, { x: a.x - 3, y: a.y - 3, w: a.w + 6, h: 3 });
      hazardStripes(p, { x: a.x - 3, y: a.y + a.h, w: a.w + 6, h: 3 });
      hazardStripes(p, { x: a.x - 3, y: a.y, w: 3, h: a.h });
      hazardStripes(p, { x: a.x + a.w, y: a.y, w: 3, h: a.h });
    }

    // ---- biểu tượng R đỏ giữa sân (sơn đã tróc) ----
    ring(p, CX, CY, 0, 40, BLACK, 0.22, 1.15);
    ring(p, CX, CY, 40, 45, [176, 30, 40], 0.9, 1.15);
    ring(p, CX, CY, 45, 46, [70, 10, 16], 0.9, 1.15);
    const S = 6;
    const gx = CX - (5 * S) / 2;
    const gy = CY - (7 * S) / 2;
    GLYPH_R.forEach((row, ry) => {
      for (let rx = 0; rx < 5; rx++) {
        if (row[rx] !== '1') continue;
        for (let yy = 0; yy < S; yy++) for (let xx = 0; xx < S; xx++) {
          const px = gx + rx * S + xx;
          const py = gy + ry * S + yy;
          if (p.noise(px / 2, py / 2) > 0.9) continue; // sơn tróc
          p.set(px + 2, py + 2, [20, 6, 10], 0.6);
        }
      }
    });
    GLYPH_R.forEach((row, ry) => {
      for (let rx = 0; rx < 5; rx++) {
        if (row[rx] !== '1') continue;
        for (let yy = 0; yy < S; yy++) for (let xx = 0; xx < S; xx++) {
          const px = gx + rx * S + xx;
          const py = gy + ry * S + yy;
          if (p.noise(px / 2, py / 2) > 0.9) continue;
          p.set(px, py, yy === 0 || xx === 0 ? [236, 72, 80] : [204, 38, 50]);
        }
      }
    });

    // ---- tường bê tông, sọc cảnh báo mép trong, đường ống, đèn đỏ ----
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const e = edgeDist(x, y, W, H);
      if (e >= WALL) continue;
      let c: RGB;
      if (e >= 18) c = Math.floor((x + y) / 5) % 2 ? [36, 36, 40] : [232, 188, 40];
      else {
        const off = (Math.floor(y / 9) % 2) * 14;
        const bx = Math.floor((x + off) / 28);
        const by = Math.floor(y / 9);
        const v = ((bx * 31 + by * 17) % 7) * 3;
        c = [64 + v, 66 + v, 76 + v];
        if ((x + off) % 28 === 0 || y % 9 === 0) c = [38, 40, 48];
      }
      if (e === WALL - 1) c = [20, 20, 26];
      p.set(x, y, c);
    }
    // đường ống trên tường trên và dưới
    for (const py of [5, H - 10]) {
      for (let x = 0; x < W; x++) {
        p.set(x, py, [70, 74, 84]);
        p.set(x, py + 1, [150, 156, 170]);
        p.set(x, py + 2, [118, 124, 138]);
        p.set(x, py + 3, [70, 74, 84]);
        p.set(x, py + 4, [40, 42, 50]);
        if (x % 64 === 20) p.rect(x, py - 1, 3, 7, [96, 100, 112]);
      }
    }
    // đèn báo đỏ trên tường trên, hắt sáng xuống sàn (rải đều theo chiều dài tường)
    const nLights = Math.max(2, Math.round((W - 100) / 110) + 1);
    const lStep = (W - 100) / (nLights - 1);
    for (let k = 0; k < nLights; k++) {
      const lx = Math.round(60 + k * lStep);
      p.disc(lx, 14, 14, [255, 60, 60], 0.08);
      p.disc(lx, 34, 22, [255, 60, 60], 0.06);
      p.disc(lx, 14, 3, [255, 80, 80]);
      p.set(lx - 1, 13, [255, 210, 210]);
    }

    // ---- vật cản ----
    // thùng hàng chồng (trên)
    for (const r of cratesExtra ? [cratesTop, cratesExtra] : [cratesTop]) {
      shadow(p, r);
      crate(p, r.x, r.y, 23, 20);
      crate(p, r.x + 23, r.y, 23, 20);
      crate(p, r.x + 6, r.y + 20, 34, 20);
    }
    // thùng hàng (dưới)
    shadow(p, cratesBot);
    crate(p, cratesBot.x, cratesBot.y, 26, 20);
    crate(p, cratesBot.x + 26, cratesBot.y, 22, 20);
    crate(p, cratesBot.x, cratesBot.y + 20, 48, 20);

    // dàn máy tính
    {
      const r = computers;
      shadow(p, r);
      bevel(p, r, [98, 102, 116], [26, 28, 36]);
      for (let k = 0; k < 3; k++) {
        const sx = r.x + 6 + k * 26;
        p.rect(sx, r.y + 4, 20, 12, [18, 26, 30]);
        p.rect(sx + 1, r.y + 5, 18, 10, [24, 64, 58]);
        for (let ly = 0; ly < 4; ly++) {
          const len = 4 + ((k * 5 + ly * 7) % 11);
          p.rect(sx + 3, r.y + 7 + ly * 2, len, 1, [96, 236, 150]);
        }
        p.set(sx + 17, r.y + 6, [200, 255, 220]);
      }
      for (let k = 0; k < 10; k++) p.set(r.x + 6 + k * 7, r.y + 21, [[255, 70, 70], [80, 230, 110], [255, 210, 60]][k % 3] as RGB);
      p.rect(r.x + 4, r.y + 23, r.w - 8, 2, [60, 62, 74]);
    }

    // cột thép
    for (const r of pillarC ? [pillarA, pillarB, pillarC] : [pillarA, pillarB]) steelPillar(p, r);

    // máy phát điện
    {
      const r = generator;
      shadow(p, r);
      bevel(p, r, [86, 90, 100], [24, 26, 32]);
      hazardStripes(p, { x: r.x + 2, y: r.y + r.h - 7, w: r.w - 4, h: 4 }, 8);
      // quạt tản nhiệt
      const fx = r.x + 18;
      const fy = r.y + 14;
      p.disc(fx, fy, 11, [30, 32, 38]);
      ring(p, fx, fy, 10, 11.5, [140, 146, 160]);
      for (let k = 0; k < 4; k++) {
        const a = (k / 4) * Math.PI * 2 + 0.4;
        line(p, fx, fy, fx + Math.cos(a) * 9, fy + Math.sin(a) * 9, [110, 116, 130]);
      }
      p.disc(fx, fy, 2, [200, 204, 214]);
      // bảng đồng hồ và đèn
      p.rect(r.x + 36, r.y + 5, 24, 14, [30, 34, 40]);
      p.disc(r.x + 42, r.y + 12, 4, [230, 230, 220]);
      line(p, r.x + 42, r.y + 12, r.x + 45, r.y + 9, [200, 40, 40]);
      p.disc(r.x + 54, r.y + 12, 3, [80, 230, 110]);
      p.disc(r.x + 54, r.y + 12, 8, [80, 230, 110], 0.12);
    }

    // thùng phuy hóa chất độc (tím)
    for (const r of barrelsB ? [barrels, barrelsB] : [barrels]) {
      shadow(p, r, 3, 3, 0.25);
      for (const [cx, cy] of [[r.x + 11, r.y + 10], [r.x + 33, r.y + 10], [r.x + 22, r.y + 22]]) {
        p.disc(cx + 2, cy + 2, 10, BLACK, 0.3);
        p.disc(cx, cy, 10, [66, 30, 86]);
        p.disc(cx, cy, 8.5, [124, 62, 156]);
        ring(p, cx, cy, 5, 6, [84, 40, 104]);
        p.disc(cx - 3, cy - 3, 2.5, [176, 120, 206]);
        // dấu sọ nhỏ
        p.rect(cx - 1, cy, 3, 2, [236, 230, 240]);
        p.set(cx - 1, cy + 2, [236, 230, 240]);
        p.set(cx + 1, cy + 2, [236, 230, 240]);
      }
      // vũng độc rò rỉ
      p.disc(r.x + 4, r.y + r.h + 4, 7, [150, 70, 180], 0.35);
    }

    // tối dần về góc (hầm ngầm)
    const rx = W / 2 - 20;
    const ry = H / 2 - 10;
    for (let y = WALL; y < H - WALL; y++) for (let x = WALL; x < W - WALL; x++) {
      const d = Math.hypot((x - W / 2) / rx, (y - H / 2) / ry);
      if (d > 0.7) p.set(x, y, [6, 4, 14], Math.min(0.4, (d - 0.7) * 1.1));
    }
  };

  const solids: Solid[] = [cratesTop, computers, pillarA, pillarB, cratesBot, generator, barrels];
  if (cratesExtra) solids.push(cratesExtra);
  if (pillarC) solids.push(pillarC);
  if (barrelsB) solids.push(barrelsB);
  return {
    draw,
    layout: {
      inset: 24,
      solids,
      hazards: [{ kind: 'ice', areas: spinners }] as HazardDef[],
    },
  };
};

// ====================================================================== 2. Đường Xe Đạp

function jersey(p: ArenaPainter, r: Rect) {
  shadow(p, r, 3, 5, 0.38);
  bevel(p, r, [196, 192, 180], [96, 92, 82]);
  p.rect(r.x + 2, r.y + 2, r.w - 4, 3, [228, 224, 212]);
  // sọc phản quang đỏ – trắng
  for (let x = r.x + 2; x < r.x + r.w - 2; x++) for (let y = r.y + r.h - 6; y < r.y + r.h - 2; y++) {
    p.set(x, y, Math.floor((x - r.x) / 6) % 2 ? [240, 240, 236] : [214, 48, 48]);
  }
  // vết nứt nhỏ
  line(p, r.x + 9, r.y + 3, r.x + 13, r.y + 8, [130, 126, 116]);
}

function bike(p: ArenaPainter, x: number, y: number, frame: RGB) {
  for (const wx of [x, x + 16]) {
    ring(p, wx, y, 5, 7, [34, 34, 38]);
    for (let k = 0; k < 4; k++) {
      const a = (k / 4) * Math.PI;
      line(p, wx - Math.cos(a) * 5, y - Math.sin(a) * 5, wx + Math.cos(a) * 5, y + Math.sin(a) * 5, [170, 170, 180]);
    }
  }
  line(p, x, y, x + 7, y - 6, frame);
  line(p, x + 7, y - 6, x + 16, y, frame);
  line(p, x + 7, y - 6, x + 13, y - 6, frame);
  line(p, x, y + 1, x + 8, y - 5, frame);
  p.rect(x + 5, y - 9, 4, 2, [30, 30, 30]); // yên
  line(p, x + 14, y - 9, x + 17, y - 8, [60, 60, 66]); // ghi đông
}

function cone(p: ArenaPainter, cx: number, cy: number) {
  p.rect(cx - 6, cy - 6, 12, 12, [40, 40, 44]);
  p.disc(cx, cy, 5.5, [240, 116, 36]);
  ring(p, cx, cy, 2.5, 4, [250, 250, 246]);
  p.disc(cx, cy, 1.5, [255, 170, 80]);
  p.set(cx - 2, cy - 3, [255, 200, 140]);
}

const cyclingRoad: ArenaDef = (f) => {
  const { W, H } = f;
  const barriers: Solid[] = [
    f.obj({ x: 280, y: 78, w: 64, h: 16 }),
    f.obj({ x: 430, y: 264, w: 64, h: 16 }),
    f.obj({ x: 92, y: 258, w: 52, h: 16 }),
  ];
  const bikes: Solid = f.obj({ x: 150, y: 58, w: 42, h: 22 });
  const cones: Solid = f.obj({ x: 540, y: 150, w: 28, h: 26 });
  // sân rộng: thêm một rào chắn ở làn trên phía phải
  if (W >= 800) barriers.push(f.obj({ x: 470, y: 64, w: 52, h: 16 }));
  const roadTop = Math.round(f.y(44));
  const roadBot = Math.round(f.y(316));
  const midY = Math.round(f.y(178));
  const laneA = Math.round(f.y(110));
  const laneB = Math.round(f.y(250));

  const draw = (p: ArenaPainter) => {
    // ---- mặt đường nhựa ----
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const n = p.noise(x / 10, y / 10);
      let c: RGB = [62 + n * 12, 64 + n * 12, 70 + n * 12];
      const h = (x * 73856093) ^ (y * 19349663);
      if ((h & 31) === 0) c = [92, 94, 100];
      else if ((h & 63) === 1) c = [44, 46, 52];
      // lề đá dăm hai bên
      if (y < roadTop || y >= roadBot) {
        const g = p.noise(x / 4, y / 4);
        c = [140 + g * 30, 128 + g * 26, 104 + g * 20];
        if ((h & 15) === 3) c = [96, 150, 70];
      }
      p.set(x, y, c);
    }
    // vạch trắng mép đường
    p.rect(0, roadTop, W, 3, [236, 236, 230]);
    p.rect(0, roadBot - 3, W, 3, [236, 236, 230]);
    // vạch vàng đứt giữa đường
    for (let x = 0; x < W; x += 40) p.rect(x + 4, midY, 24, 4, [244, 200, 56]);
    // mũi tên xuống dốc » sơn trắng trên hai làn (rải đều theo chiều dài đường)
    const arrows: [number, number][] = [];
    for (let ax = Math.round(f.x(110)); ax < W - 60; ax += 270) arrows.push([ax, laneA]);
    for (let ax = Math.round(f.x(300)); ax < W - 60; ax += 260) arrows.push([ax, laneB]);
    for (const [ax, ay] of arrows) {
      for (let k = 0; k < 2; k++) {
        for (let i = 0; i < 8; i++) {
          p.rect(ax + k * 10 + i, ay - 8 + i, 3, 1, [226, 226, 220]);
          p.rect(ax + k * 10 + i, ay + 8 - i, 3, 1, [226, 226, 220]);
        }
      }
    }
    // biểu tượng làn xe đạp
    for (const [bx, by] of [[f.x(470), f.y(112)], [f.x(52), f.y(246)]]) {
      bike(p, Math.round(bx), Math.round(by), [226, 226, 220]);
    }
    // vết nứt và vệt bánh xe
    const cracks = Math.round(6 * areaK(f));
    for (let k = 0; k < cracks; k++) {
      let x = 60 + p.rng() * (W - 120);
      let y = 60 + p.rng() * (H - 120);
      let a = p.rng() * Math.PI * 2;
      for (let s = 0; s < 26; s++) {
        a += (p.rng() - 0.5) * 0.9;
        x += Math.cos(a) * 1.4;
        y += Math.sin(a) * 1.4;
        p.set(x, y, [34, 36, 40]);
      }
    }
    for (const dy of [132, 228]) {
      const ty = Math.round(f.y(dy));
      for (let x = 30; x < W - 30; x++) {
        const y = ty + Math.sin(x / 50 + dy) * 10;
        if (p.noise(x / 20, dy) > 0.45) p.set(x, y, [40, 40, 44], 0.5);
      }
    }

    // ---- tường: biển phía trên + lan can, cỏ dốc phía dưới, rào chắn hai đầu đường ----
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const e = edgeDist(x, y, W, H);
      if (e >= WALL) continue;
      let c: RGB;
      if (y < WALL && x >= WALL - 4 && x < W - WALL + 4) {
        // biển
        const wave = (y + Math.floor(Math.sin(x / 9) * 2)) % 5 === 0 && (x * 3 + y) % 17 < 8;
        c = wave ? [140, 200, 248] : y < 6 ? [30, 92, 170] : [44, 116, 196];
      } else if (y >= H - WALL && x >= WALL - 4 && x < W - WALL + 4) {
        // dốc cỏ
        const g = p.noise(x / 6, y / 6);
        c = [70 + g * 30, 128 + g * 30, 62 + g * 20];
        if ((x * 7 + y * 3) % 23 === 0) c = [150, 196, 96];
      } else {
        // rào chắn sọc đỏ – trắng
        const stripe = Math.floor((x + y) / 6) % 2;
        c = stripe ? [236, 236, 232] : [206, 44, 44];
        if (e < 4) c = [70, 70, 76];
      }
      p.set(x, y, c);
    }
    // lan can thép trên/dưới
    for (const ry of [13, H - WALL]) {
      for (let x = WALL - 4; x < W - WALL + 4; x++) {
        p.set(x, ry + 2, [210, 216, 226]);
        p.set(x, ry + 3, [150, 156, 168]);
        p.set(x, ry + 6, [210, 216, 226]);
        p.set(x, ry + 7, [120, 126, 138]);
        if ((x - WALL) % 24 === 0) p.rect(x, ry, 3, 9, [96, 100, 112]);
      }
    }
    // cột ống gió (biết gió sắp thổi), rải theo chiều dài tường trên
    for (let wx = Math.round(f.x(200)); wx < W - 60; wx += 256) {
      p.rect(wx, 2, 2, 12, [90, 90, 96]);
      for (let k = 0; k < 14; k++) p.rect(wx + 2 + k, 3 + Math.round(Math.sin(k / 3) * 1), 1, 4 - Math.floor(k / 6), Math.floor(k / 4) % 2 ? [250, 250, 246] : [240, 110, 40]);
    }
    // biển báo hai đầu đường
    const signY = Math.round(f.y(162)) - 12;
    for (const sx of [4, W - 18]) {
      p.rect(sx, signY, 14, 24, [40, 40, 44]);
      p.rect(sx + 1, signY + 1, 12, 22, [244, 200, 56]);
      for (let i = 0; i < 5; i++) p.rect(sx + 4 + (i % 2), signY + 5 + i * 3, 5, 2, [30, 30, 30]);
    }

    // ---- vật cản ----
    for (const r of barriers) jersey(p, r);
    // đống xe đạp hỏng
    shadow(p, bikes, 2, 3, 0.25);
    p.rect(bikes.x, bikes.y + bikes.h - 4, bikes.w, 4, [50, 50, 54], 0.5);
    bike(p, bikes.x + 4, bikes.y + 14, [210, 52, 52]);
    bike(p, bikes.x + 18, bikes.y + 10, [52, 120, 210]);
    // cụm nón giao thông
    shadow(p, cones, 2, 3, 0.2);
    cone(p, cones.x + 7, cones.y + 7);
    cone(p, cones.x + 21, cones.y + 8);
    cone(p, cones.x + 14, cones.y + 19);
  };

  return {
    draw,
    layout: {
      inset: 24,
      solids: [...barriers, bikes, cones],
      hazards: [{ kind: 'wind', periodMs: 3200, warnMs: 900, force: 200 }] as HazardDef[],
    },
  };
};

// ====================================================================== 3. Khu Safari

function acacia(p: ArenaPainter, r: Rect) {
  const cx = r.x + r.w / 2;
  const cy = r.y + r.h / 2;
  // bóng tán cây
  for (let y = -16; y <= 16; y++) for (let x = -24; x <= 24; x++) if ((x / 24) ** 2 + (y / 16) ** 2 <= 1) p.set(cx + x + 4, cy + y + 6, BLACK, 0.28);
  // tán dẹt nhiều lớp
  for (const [dx, dy, rad, c] of [
    [0, 0, 18, [40, 100, 46]], [-9, -2, 12, [40, 100, 46]], [9, 1, 12, [40, 100, 46]],
    [-3, -4, 13, [64, 132, 58]], [7, -3, 9, [64, 132, 58]], [-8, -6, 7, [104, 166, 78]], [3, -8, 6, [104, 166, 78]],
  ] as [number, number, number, RGB][]) p.disc(cx + dx, cy + dy, rad, c);
  for (let k = 0; k < 18; k++) {
    const a = p.rng() * Math.PI * 2;
    const d = p.rng() * 14;
    p.set(cx + Math.cos(a) * d, cy - 4 + Math.sin(a) * d * 0.7, [150, 200, 100]);
  }
}

function boulders(p: ArenaPainter, r: Rect) {
  p.rect(r.x + 2, r.y + r.h - 4, r.w, 6, BLACK, 0.2);
  const big = Math.min(r.w, r.h * 1.3) * 0.38;
  const parts: [number, number, number][] = [[r.x + big + 1, r.y + r.h - big - 1, big], [r.x + r.w - big * 0.75 - 1, r.y + r.h - big * 0.75 - 1, big * 0.75], [r.x + r.w * 0.55, r.y + big * 0.7, big * 0.7]];
  for (const [cx, cy, rad] of parts) {
    p.disc(cx + 1, cy + 2, rad, BLACK, 0.25);
    p.disc(cx, cy, rad, [104, 100, 92]);
    p.disc(cx - rad * 0.2, cy - rad * 0.25, rad * 0.75, [138, 132, 120]);
    p.disc(cx - rad * 0.35, cy - rad * 0.45, rad * 0.3, [184, 178, 164]);
  }
}

const safari: ArenaDef = (f) => {
  const { W, H } = f;
  const trees: Solid[] = [f.obj({ x: 452, y: 80, w: 36, h: 32 }), f.obj({ x: 102, y: 280, w: 36, h: 30 })];
  const rocks: Solid[] = [f.obj({ x: 290, y: 90, w: 34, h: 24 }), f.obj({ x: 556, y: 290, w: 30, h: 22 })];
  const fence: Solid = f.obj({ x: 54, y: 86, w: 92, h: 10 });
  const hut: Solid = f.obj({ x: 546, y: 26, w: 62, h: 48 });
  /** ao nước (làm chậm Pokémon không phải hệ Nước) */
  const pond: Rect = f.area({ x: 352, y: 226, w: 142, h: 80 });
  // bụi cỏ cao (chỉ trang trí): [x, y, bán trục ngang, bán trục dọc]
  const tall: [number, number, number, number][] = (
    [[110, 130, 44, 18], [250, 300, 52, 18], [420, 150, 40, 16], [380, 50, 40, 14], [580, 200, 26, 30], [200, 250, 30, 12]] as [number, number, number, number][]
  ).map(([x, y, rw, rh]) => [Math.round(f.x(x)), Math.round(f.y(y)), rw, rh]);
  if (W >= 800) {
    // sân rộng: thêm cây keo, tảng đá và vài bụi cỏ cho bớt trống
    trees.push(f.obj({ x: 196, y: 120, w: 36, h: 32 }));
    rocks.push(f.obj({ x: 236, y: 268, w: 30, h: 22 }));
    for (const [x, y, rw, rh] of [[536, 120, 34, 14], [70, 200, 28, 12], [470, 318, 38, 12]]) tall.push([Math.round(f.x(x)), Math.round(f.y(y)), rw, rh]);
  }
  const pathY = f.y(190);
  const pathAt = (x: number) => pathY + Math.sin(x / 80) * 26 + Math.sin(x / 23) * 3;
  const branchX = f.x(300);

  const draw = (p: ArenaPainter) => {
    // ---- cỏ thảo nguyên ----
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const v = p.noise(x / 22, y / 22);
      let c: RGB = v < 0.38 ? [136, 166, 72] : v > 0.62 ? [166, 188, 96] : [150, 178, 84];
      const h = (x * 73856093) ^ (y * 19349663);
      if ((h & 63) === 0) c = [188, 200, 120];
      else if ((h & 63) === 1) c = [110, 140, 60];
      p.set(x, y, c);
    }
    // ---- lối mòn đất: một lối ngang uốn lượn, một nhánh từ trên xuống ----
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const n = (p.noise(x / 10, y / 10) - 0.5) * 6;
      const d1 = Math.abs(y - pathAt(x));
      const bx = branchX + Math.sin(y / 40) * 14;
      const d2 = y < pathAt(x) ? Math.abs(x - bx) : 99;
      const d = Math.min(d1, d2);
      const half = 13 + n;
      if (d < half) p.set(x, y, d > half - 2 ? [164, 132, 84] : (x * 7 + y * 3) % 17 === 0 ? [214, 186, 132] : [196, 164, 110]);
    }
    // dấu chân thú trên lối mòn
    for (let k = 0; 40 + k * 40 < W - 40; k++) {
      const x = 40 + k * 40;
      const y = pathAt(x) + (k % 2 ? 4 : -4);
      p.disc(x, y, 1.6, [150, 118, 74]);
      p.set(x - 2, y - 2, [150, 118, 74]);
      p.set(x + 2, y - 2, [150, 118, 74]);
    }
    // ---- bụi cỏ cao (chỉ trang trí) ----
    for (const [gx, gy, rw, rh] of tall) {
      for (let y = gy - rh; y <= gy + rh; y++) for (let x = gx - rw; x <= gx + rw; x++) {
        if (((x - gx) / rw) ** 2 + ((y - gy) / rh) ** 2 > 1) continue;
        p.set(x, y, [92, 140, 60]);
        if ((x * 5 + y * 3) % 4 === 0) p.set(x, y, [74, 120, 50]);
      }
      for (let k = 0; k < rw * 1.4; k++) {
        const x = gx - rw + p.rng() * rw * 2;
        const y = gy - rh + p.rng() * rh * 2;
        if (((x - gx) / rw) ** 2 + ((y - gy) / rh) ** 2 > 0.9) continue;
        p.set(x, y, [130, 186, 84]);
        p.set(x, y - 1, [130, 186, 84]);
        p.set(x + 1, y - 2, [178, 216, 116]);
      }
    }
    // hoa dại
    const flowers = Math.round(70 * areaK(f));
    for (let i = 0; i < flowers; i++) {
      const x = 30 + p.rng() * (W - 60);
      const y = 30 + p.rng() * (H - 60);
      const c: RGB = p.rng() < 0.5 ? [250, 236, 120] : [240, 240, 250];
      p.set(x, y, c);
      p.set(x + 1, y, mul(c, 0.8));
    }

    // ---- ao nước ----
    {
      const r = pond;
      const rad = 20;
      const inside = (x: number, y: number, grow: number) => {
        const cx = Math.max(r.x + rad, Math.min(r.x + r.w - rad, x));
        const cy = Math.max(r.y + rad, Math.min(r.y + r.h - rad, y));
        return Math.hypot(x - cx, y - cy) <= rad + grow;
      };
      for (let y = r.y - 6; y < r.y + r.h + 6; y++) for (let x = r.x - 6; x < r.x + r.w + 6; x++) {
        if (inside(x, y, 0)) {
          const deep = inside(x, y, -12);
          let c: RGB = deep ? [44, 108, 168] : [86, 158, 204];
          if ((y * 3 + Math.floor(x / 7)) % 19 === 0) c = [170, 220, 248];
          p.set(x, y, c);
        } else if (inside(x, y, 3)) p.set(x, y, [214, 196, 146]);
        else if (inside(x, y, 5)) p.set(x, y, [150, 128, 88], 0.6);
      }
      // lá súng (vị trí theo tỉ lệ ao)
      const kx = r.w / 142;
      const ky = r.h / 80;
      const pads: [number, number][] = [[34, 26], [98, 52], [112, 22], [56, 60]].map(([dx, dy]) => [Math.round(r.x + dx * kx), Math.round(r.y + dy * ky)]);
      for (const [lx, ly] of pads) {
        p.disc(lx, ly, 5, [70, 150, 70]);
        p.disc(lx - 1, ly - 1, 3, [104, 184, 90]);
        p.rect(lx, ly - 5, 2, 5, [44, 108, 168]);
      }
      p.disc(pads[2][0], pads[2][1] - 1, 1.6, [250, 170, 210]);
      // lau sậy ở mép ao
      for (const [sx, sy] of [[r.x + 6, r.y + 10], [r.x + r.w - 8, r.y + r.h - 14], [r.x + 4, r.y + r.h - 22]]) {
        for (let k = 0; k < 5; k++) {
          p.rect(sx + k * 2, sy - 6 - (k % 3) * 2, 1, 8 + (k % 3) * 2, [70, 120, 50]);
          p.rect(sx + k * 2, sy - 8 - (k % 3) * 2, 1, 2, [130, 90, 50]);
        }
      }
    }

    // ---- tường: rào gỗ trong cùng, bụi cây rậm bên ngoài ----
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const e = edgeDist(x, y, W, H);
      if (e >= WALL) continue;
      const g = p.noise(x / 5, y / 5);
      p.set(x, y, [28 + g * 20, 74 + g * 26, 36 + g * 14]);
    }
    const shrubs = Math.round((90 * (W + H)) / (640 + 360));
    for (let i = 0; i < shrubs; i++) {
      const side = i % 4;
      const t = p.rng();
      const cx = side < 2 ? t * W : side === 2 ? 4 + p.rng() * 6 : W - 4 - p.rng() * 6;
      const cy = side === 0 ? 4 + p.rng() * 6 : side === 1 ? H - 4 - p.rng() * 6 : t * H;
      const rad = 10 + p.rng() * 6;
      p.disc(cx, cy, rad, [26, 76, 34]);
      p.disc(cx - rad * 0.25, cy - rad * 0.3, rad * 0.65, [46, 108, 46]);
      p.disc(cx - rad * 0.4, cy - rad * 0.45, rad * 0.3, [84, 146, 64]);
    }
    // hàng rào cọc gỗ ở mép trong
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const e = edgeDist(x, y, W, H);
      if (e < 17 || e >= WALL) continue;
      const along = x > WALL && x < W - WALL ? x : y;
      let c: RGB = along % 8 < 5 ? [150, 104, 60] : [108, 72, 40];
      if (e === 17 || e === WALL - 1) c = [70, 46, 24];
      p.set(x, y, c);
    }

    // ---- vật cản ----
    for (const r of trees) acacia(p, r);
    for (const r of rocks) boulders(p, r);
    // hàng rào gỗ ngắn
    {
      const r = fence;
      shadow(p, r, 2, 3, 0.25);
      p.rect(r.x, r.y + 2, r.w, 2, [170, 120, 70]);
      p.rect(r.x, r.y + 6, r.w, 2, [150, 104, 60]);
      for (let x = r.x; x < r.x + r.w; x += 15) {
        p.rect(x, r.y, 4, r.h, [120, 80, 44]);
        p.rect(x, r.y, 4, 1, [196, 150, 96]);
      }
      p.rect(r.x + r.w - 4, r.y, 4, r.h, [120, 80, 44]);
    }
    // nhà nghỉ Safari (mái tranh nhìn từ trên xuống)
    {
      const r = hut;
      shadow(p, r, 4, 5, 0.35);
      for (let y = r.y; y < r.y + r.h; y++) for (let x = r.x; x < r.x + r.w; x++) {
        const top = y < r.y + r.h / 2;
        const strawLine = (top ? y - r.y : r.y + r.h - y) % 4 === 0;
        let c: RGB = top ? [206, 166, 86] : [176, 136, 66];
        if (strawLine) c = mul(c, 0.82);
        if ((x * 13 + y * 7) % 29 === 0) c = [230, 196, 120];
        p.set(x, y, c);
      }
      p.rect(r.x, r.y + r.h / 2 - 1, r.w, 2, [120, 84, 36]);
      outline(p, r, [92, 60, 26]);
      // cửa + bảng gỗ
      p.rect(r.x + r.w / 2 - 6, r.y + r.h - 6, 12, 6, [80, 50, 26]);
      p.rect(r.x + 6, r.y + r.h - 8, 14, 6, [150, 104, 60]);
      p.rect(r.x + 8, r.y + r.h - 6, 10, 1, [70, 46, 24]);
      p.rect(r.x + 8, r.y + r.h - 4, 7, 1, [70, 46, 24]);
    }
  };

  return {
    draw,
    layout: {
      inset: 24,
      solids: [...trees, ...rocks, fence, hut],
      slowZones: [pond],
    },
  };
};

// ====================================================================== 4. Hội quán Fuchsia (ninja Kyo)

function lantern(p: ArenaPainter, r: Rect) {
  shadow(p, r, 3, 4, 0.35);
  const cx = r.x + r.w / 2;
  // đế đá
  bevel(p, { x: r.x + 3, y: r.y + r.h - 8, w: r.w - 6, h: 8 }, [128, 128, 122], [52, 52, 50]);
  // thân + ô đèn
  bevel(p, { x: r.x + 5, y: r.y + 8, w: r.w - 10, h: r.h - 15 }, [150, 148, 140], [60, 60, 56]);
  p.rect(cx - 4, r.y + 11, 8, 6, [60, 30, 10]);
  p.rect(cx - 3, r.y + 12, 6, 4, [255, 196, 96]);
  p.set(cx - 1, r.y + 13, [255, 244, 200]);
  // mái
  bevel(p, { x: r.x, y: r.y, w: r.w, h: 9 }, [104, 104, 100], [40, 40, 38]);
  p.rect(cx - 2, r.y - 2, 4, 3, [90, 90, 86]);
  // quầng sáng
  p.disc(cx, r.y + 14, 20, [255, 180, 80], 0.08);
}

/** nội suy tuyến tính từng đoạn qua các mốc [thiết kế, thật] */
function piecewise(anchors: [number, number][]) {
  return (d: number) => {
    for (let i = 1; i < anchors.length; i++) {
      const [a0, b0] = anchors[i - 1];
      const [a1, b1] = anchors[i];
      if (d <= a1 || i === anchors.length - 1) return b0 + ((d - a0) * (b1 - b0)) / (a1 - a0);
    }
    return d;
  };
}

const fuchsiaGym: ArenaDef = (f) => {
  const { W, H } = f;
  /** đèn đá ở bốn góc (vật cản thật) */
  const lanterns: Solid[] = [
    f.obj({ x: 40, y: 36, w: 24, h: 26 }),
    f.obj({ x: 576, y: 36, w: 24, h: 26 }),
    f.obj({ x: 40, y: 298, w: 24, h: 26 }),
    f.obj({ x: 576, y: 298, w: 24, h: 26 }),
  ];
  // sân rộng: thêm đèn đá giữa tường trái / phải (xa vòng xuất phát)
  if (W >= 800) lanterns.push(f.obj({ x: 34, y: 154, w: 24, h: 26 }), f.obj({ x: 582, y: 154, w: 24, h: 26 }));
  // Mê cung tường tàng hình bám theo điểm xuất phát: (120,190) → f.startL, (520,190) → f.startR, tâm sân giữ ở giữa.
  const mx = piecewise([[0, 0], [48, 48], [120, f.startL.x], [320, W / 2], [520, f.startR.x], [592, W - 48], [640, W]]);
  const my = piecewise([[0, 0], [48, 48], [190, f.startL.y], [312, H - 48], [360, H]]);
  /** tường mảnh: chiều dài giãn theo mốc, độ dày 10px giữ nguyên */
  const thin = (x: number, y: number, w: number, h: number): Solid => {
    if (w > h) {
      const x0 = Math.round(mx(x));
      return { x: x0, y: Math.round(my(y + h / 2) - h / 2), w: Math.round(mx(x + w)) - x0, h, hidden: true };
    }
    const y0 = Math.round(my(y));
    return { x: Math.round(mx(x + w / 2) - w / 2), y: y0, w, h: Math.round(my(y + h)) - y0, hidden: true };
  };
  /** tường tàng hình: mê cung thưa, mọi khe hở ≥ 70px; khu xuất phát trống */
  const hidden: Solid[] = [
    thin(214, 24, 10, 100),
    thin(214, 252, 10, 84),
    thin(296, 108, 96, 10),
    thin(296, 252, 96, 10),
    thin(462, 24, 10, 88),
    thin(462, 222, 10, 114),
    thin(92, 110, 70, 10),
    thin(92, 268, 70, 10),
    thin(500, 262, 76, 10),
  ];
  const SL = f.startL;
  const SR = f.startR;

  const draw = (p: ArenaPainter) => {
    // ---- chiếu tatami: khối 64px, xen kẽ 2 chiếu ngang / 2 chiếu dọc ----
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const bx = Math.floor(x / 64);
      const by = Math.floor(y / 64);
      const lx = x % 64;
      const ly = y % 64;
      const horiz = (bx + by) % 2 === 0;
      const u = horiz ? lx : ly; // dọc theo chiều dài chiếu
      const v = horiz ? ly % 32 : lx % 32; // ngang chiếu
      const matId = horiz ? by * 100 + bx * 2 + (ly < 32 ? 0 : 1) : by * 100 + bx * 2 + (lx < 32 ? 0 : 1);
      const tone = ((matId * 37) % 5) * 3;
      let c: RGB = [188 - tone, 178 - tone, 114 - tone];
      // sợi cói đan
      if ((horiz ? y : x) % 2 === 0) c = mul(c, 0.94);
      if (u % 9 === 0) c = mul(c, 0.97);
      // viền vải sẫm hai cạnh dài, mép ngắn mảnh
      if (v <= 1 || v >= 30) c = [46, 64, 54];
      else if (u === 0 || u === 63) c = [140, 128, 80];
      p.set(x, y, c);
    }
    // vết độc loang tím lấm tấm
    const stains = Math.round(16 * areaK(f));
    for (let i = 0; i < stains; i++) {
      const cx = 40 + p.rng() * (W - 80);
      const cy = 40 + p.rng() * (H - 80);
      if (Math.abs(cy - SL.y) < 40 && (Math.abs(cx - SL.x) < 50 || Math.abs(cx - SR.x) < 50)) continue;
      p.disc(cx, cy, 3 + p.rng() * 5, [120, 50, 140], 0.28);
      p.disc(cx + 2, cy - 1, 1.5, [190, 120, 210], 0.5);
    }
    // biểu tượng phi tiêu giữa sân
    {
      const CX = Math.round(W / 2);
      const CY = Math.round(f.y(186));
      ring(p, CX, CY, 46, 50, [110, 50, 130], 0.55, 1.1);
      for (let y = -40; y <= 40; y++) for (let x = -40; x <= 40; x++) {
        const d = Math.hypot(x, y);
        if (d > 40) continue;
        const a = Math.atan2(y, x) + Math.PI / 4;
        const lim = 8 + 30 * Math.pow(Math.abs(Math.cos(2 * a)), 8);
        if (d < lim) p.set(CX + x, CY + y, d < 6 ? [60, 30, 70] : x - y < 0 ? [140, 80, 160] : [104, 52, 124], 0.55);
      }
      p.disc(CX, CY, 3, [188, 178, 114]);
    }
    // vòng xuất phát hai bên
    startRing(p, SL.x, SL.y, [150, 60, 170]);
    startRing(p, SR.x, SR.y, [150, 60, 170]);
    // dấu móng nhỏ ở hai đầu tường tàng hình (gợi ý cho ai tinh mắt)
    for (const w of hidden) {
      const pts = w.w > w.h ? [[w.x, w.y + w.h / 2], [w.x + w.w - 1, w.y + w.h / 2]] : [[w.x + w.w / 2, w.y], [w.x + w.w / 2, w.y + w.h - 1]];
      for (const [hx, hy] of pts) {
        if (edgeDist(hx, hy, W, H) < WALL + 2) continue;
        p.set(hx, hy, [70, 60, 40], 0.7);
        p.set(hx + 1, hy, [70, 60, 40], 0.4);
      }
    }

    // ---- tường shoji: khung gỗ sẫm, giấy kem, song mảnh ----
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const e = edgeDist(x, y, W, H);
      if (e >= WALL) continue;
      const along = y < WALL || y >= H - WALL ? x : y;
      let c: RGB = [232, 224, 198];
      if (along % 32 < 3) c = [74, 48, 30];
      else if (along % 8 === 0 || e % 7 === 3) c = [168, 140, 104];
      if (e < 3) c = [56, 36, 22];
      if (e >= WALL - 3) c = e === WALL - 1 ? [34, 22, 14] : [88, 58, 36];
      p.set(x, y, c);
    }
    // rèm tím có biểu tượng phi tiêu trên tường trên (đặt theo tỉ lệ chiều dài tường)
    const banners = W >= 800 ? [0.2, 0.5, 0.8] : [176 / 640, 452 / 640];
    for (const t of banners) {
      const bx = Math.round(t * W) - (W >= 800 ? 12 : 0);
      p.rect(bx, 0, 24, 21, [78, 30, 96]);
      p.rect(bx + 1, 0, 22, 20, [112, 46, 134]);
      for (let k = 0; k < 4; k++) p.rect(bx + 2 + k * 6, 20, 3, 2, [78, 30, 96]);
      const cx = bx + 12;
      const cy = 10;
      for (let k = -4; k <= 4; k++) {
        p.set(cx + k, cy, [236, 220, 240]);
        p.set(cx, cy + k, [236, 220, 240]);
      }
      p.set(cx, cy, [112, 46, 134]);
    }

    // ---- đèn đá bốn góc ----
    for (const r of lanterns) lantern(p, r);
    // mờ tối viền nhẹ (không khí ninja)
    for (let y = WALL; y < H - WALL; y++) for (let x = WALL; x < W - WALL; x++) {
      const e = edgeDist(x, y, W, H) - WALL;
      if (e < 16) p.set(x, y, [20, 10, 30], (16 - e) / 16 * 0.25);
    }
  };

  return {
    draw,
    layout: {
      inset: 24,
      solids: [...lanterns, ...hidden],
      hazards: [{
        kind: 'rain', count: 2, radius: 28, periodMs: 3200, warnMs: 800, fx: 'poison', color: 0xa040a0, puddleMs: 3000,
        damagePct: 0.05, type: 'poison', slowMs: 800,
      }] as HazardDef[],
    },
  };
};

// ====================================================================== xuất

export const ARENAS: Record<string, ArenaDef> = {
  'rocket-hideout': rocketHideout,
  'cycling-road': cyclingRoad,
  safari,
  'gym-fuchsia': fuchsiaGym,
};
