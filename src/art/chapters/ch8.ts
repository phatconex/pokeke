// Sân tự vẽ chương 8: Nhà máy điện bỏ hoang (sàn điện phóng theo nhóm) và Hội quán Viridian (mưa đá + cát lún).
import type { Rect, Solid } from '../../data/hazards';
import type { ArenaDef, ArenaFrame, ArenaPainter, RGB } from './types';

const WALL = 22;

// ======================================================================= tiện ích vẽ

const clamp = (v: number) => Math.max(0, Math.min(255, Math.round(v)));
const shade = (c: RGB, k: number): RGB => [clamp(c[0] * k), clamp(c[1] * k), clamp(c[2] * k)];
const mix = (a: RGB, b: RGB, t: number): RGB => [clamp(a[0] + (b[0] - a[0]) * t), clamp(a[1] + (b[1] - a[1]) * t), clamp(a[2] + (b[2] - a[2]) * t)];
const edgeDist = (x: number, y: number, W: number, H: number) => Math.min(x, y, W - 1 - x, H - 1 - y);

/** bóng đổ mềm lệch xuống phải */
function dropShadow(p: ArenaPainter, r: Rect, dx = 3, dy = 4, a = 0.3) {
  p.rect(r.x + dx, r.y + dy, r.w, r.h, [0, 0, 0], a);
}

/** khung chữ nhật có viền */
function frame(p: ArenaPainter, r: Rect, fill: RGB, edge: RGB) {
  for (let y = r.y; y < r.y + r.h; y++) for (let x = r.x; x < r.x + r.w; x++) {
    const e = x === r.x || y === r.y || x === r.x + r.w - 1 || y === r.y + r.h - 1;
    p.set(x, y, e ? edge : fill);
  }
}

/** đoạn cáp nằm ngang / dọc (dày 3px: viền tối, lõi, ánh sáng) */
function cableH(p: ArenaPainter, x0: number, x1: number, y: number) {
  for (let x = Math.min(x0, x1); x <= Math.max(x0, x1); x++) {
    p.set(x, y - 1, [20, 20, 24]);
    p.set(x, y, x % 9 === 0 ? [90, 60, 30] : [44, 44, 52]);
    p.set(x, y + 1, [20, 20, 24]);
    p.set(x, y + 2, [0, 0, 0], 0.25);
  }
}
function cableV(p: ArenaPainter, x: number, y0: number, y1: number) {
  for (let y = Math.min(y0, y1); y <= Math.max(y0, y1); y++) {
    p.set(x - 1, y, [20, 20, 24]);
    p.set(x, y, y % 9 === 0 ? [90, 60, 30] : [44, 44, 52]);
    p.set(x + 1, y, [20, 20, 24]);
    p.set(x + 2, y, [0, 0, 0], 0.25);
  }
}

/** tia sét nhỏ trang trí (zigzag) */
function sparkBolt(p: ArenaPainter, x: number, y: number, len: number, c: RGB) {
  let cx = x;
  for (let k = 0; k < len; k++) {
    cx += k % 4 < 2 ? 1 : -1;
    p.set(cx, y + k, c);
    p.set(cx + 1, y + k, [255, 255, 255], 0.5);
  }
}

// ======================================================================= Nhà máy điện

/** tua-bin, máy biến áp, tủ điều khiển, cuộn Tesla — đúng khung vật cản */
const PP = {
  turbineL: { x: 84, y: 58, w: 72, h: 40 },
  turbineR: { x: 484, y: 58, w: 72, h: 40 },
  transformer: { x: 296, y: 268, w: 56, h: 42 },
  cabinet: { x: 520, y: 276, w: 48, h: 34 },
  coil: { x: 404, y: 150, w: 22, h: 22 },
};

/** sàn lưới thép nhiễm điện: 3 nhóm luân phiên phóng điện */
const PP_GRATES: (Rect & { group: number })[] = [
  { x: 240, y: 112, w: 80, h: 48, group: 0 },
  { x: 440, y: 212, w: 80, h: 48, group: 0 },
  { x: 330, y: 52, w: 80, h: 44, group: 1 },
  { x: 80, y: 252, w: 80, h: 48, group: 1 },
  { x: 540, y: 128, w: 56, h: 56, group: 2 },
  { x: 250, y: 200, w: 72, h: 48, group: 2 },
];

function drawTurbine(p: ArenaPainter, r: Rect) {
  dropShadow(p, r, 4, 5, 0.35);
  const lo: RGB = [62, 70, 84];
  const hi: RGB = [182, 192, 208];
  for (let y = r.y; y < r.y + r.h; y++) {
    const t = (y - r.y) / (r.h - 1);
    const light = Math.max(0, 1 - Math.abs(t - 0.32) * 1.7);
    for (let x = r.x; x < r.x + r.w; x++) {
      const lx = x - r.x;
      let c = mix(lo, hi, light);
      // nắp hai đầu
      if (lx < 5 || lx >= r.w - 5) c = shade(c, 0.7);
      // gân tản nhiệt
      else if ((lx - 5) % 10 === 0) c = shade(c, 0.78);
      else if ((lx - 5) % 10 === 1) c = shade(c, 1.12);
      if (y === r.y || y === r.y + r.h - 1 || x === r.x || x === r.x + r.w - 1) c = [28, 30, 36];
      p.set(x, y, c);
    }
  }
  // dải cảnh báo + đèn báo
  const cx = r.x + r.w / 2;
  p.rect(cx - 12, r.y + r.h - 12, 24, 6, [240, 196, 40]);
  for (let x = cx - 12; x < cx + 12; x++) if (Math.floor(x / 3) % 2) p.rect(x, r.y + r.h - 12, 1, 6, [36, 36, 40]);
  p.disc(r.x + 10, r.y + 10, 2.5, [80, 220, 120]);
  p.disc(r.x + 10, r.y + 10, 1, [220, 255, 220]);
  p.disc(r.x + r.w - 11, r.y + 10, 2.5, [230, 70, 60]);
  // ống xả trên nắp
  p.rect(cx - 4, r.y + 2, 8, 6, [46, 50, 58]);
  p.rect(cx - 3, r.y + 3, 6, 2, [120, 126, 138]);
  // tia lửa điện rò rỉ
  sparkBolt(p, r.x + r.w - 18, r.y + 4, 8, [255, 236, 120]);
}

function drawTransformer(p: ArenaPainter, r: Rect) {
  dropShadow(p, r, 4, 5, 0.35);
  for (let y = r.y; y < r.y + r.h; y++) for (let x = r.x; x < r.x + r.w; x++) {
    const lx = x - r.x;
    let c: RGB = y < r.y + 8 ? [132, 146, 122] : [94, 108, 86];
    if (y >= r.y + 8 && lx % 6 === 0) c = [64, 76, 58];
    if (y >= r.y + 8 && lx % 6 === 1) c = [118, 132, 108];
    if (y === r.y || y === r.y + r.h - 1 || x === r.x || x === r.x + r.w - 1) c = [32, 38, 30];
    p.set(x, y, c);
  }
  // 3 sứ cách điện trên nắp
  for (let k = 0; k < 3; k++) {
    const ix = r.x + 12 + k * 16;
    for (let j = 0; j < 3; j++) p.disc(ix, r.y + 5 - j * 2, 3 - j * 0.5, j % 2 ? [150, 90, 50] : [236, 236, 240]);
    p.set(ix - 1, r.y - 1, [255, 255, 255]);
  }
  // biển báo điện cao thế (tam giác vàng)
  const sx = r.x + r.w / 2;
  const sy = r.y + 18;
  for (let j = 0; j < 14; j++) for (let i = -j / 2; i <= j / 2; i++) p.set(sx + i, sy + j, j === 13 || Math.abs(i) > j / 2 - 1 ? [30, 30, 30] : [250, 210, 50]);
  sparkBolt(p, sx - 1, sy + 4, 7, [30, 30, 30]);
}

function drawCabinet(p: ArenaPainter, r: Rect) {
  dropShadow(p, r, 3, 4, 0.35);
  frame(p, r, [120, 126, 138], [36, 38, 46]);
  p.rect(r.x + 1, r.y + 1, r.w - 2, 4, [160, 166, 178]);
  // màn hình xanh có vạch đồ thị
  const sc = { x: r.x + 5, y: r.y + 8, w: 20, h: 12 };
  frame(p, sc, [20, 52, 36], [16, 20, 24]);
  for (let x = sc.x + 2; x < sc.x + sc.w - 2; x++) p.set(x, sc.y + 6 + Math.round(Math.sin(x * 0.9) * 3), [110, 250, 150]);
  // đồng hồ đo
  p.disc(r.x + 36, r.y + 14, 6, [30, 32, 38]);
  p.disc(r.x + 36, r.y + 14, 5, [236, 236, 228]);
  for (let k = 0; k < 5; k++) p.set(r.x + 36 + k * 0.6, r.y + 14 - k, [200, 40, 40]);
  // hàng nút bấm
  const btn: RGB[] = [[230, 60, 50], [80, 210, 110], [250, 210, 50], [80, 160, 240]];
  btn.forEach((c, i) => {
    p.rect(r.x + 6 + i * 9, r.y + 25, 5, 4, shade(c, 0.6));
    p.rect(r.x + 6 + i * 9, r.y + 25, 5, 2, c);
  });
}

function drawCoil(p: ArenaPainter, r: Rect) {
  const cx = r.x + r.w / 2;
  const cy = r.y + r.h / 2;
  p.disc(cx + 2, cy + 3, 11, [0, 0, 0], 0.35);
  p.disc(cx, cy, 11, [40, 42, 50]);
  p.disc(cx, cy, 10, [70, 74, 86]);
  // cuộn dây đồng
  for (let k = 8; k >= 3; k--) p.disc(cx, cy - (8 - k) * 0.6, k, k % 2 ? [208, 128, 64] : [150, 82, 40]);
  // quả cầu đỉnh
  p.disc(cx, cy - 4, 3.5, [196, 204, 220]);
  p.disc(cx - 1, cy - 5, 1.5, [255, 255, 255]);
  // hồ quang lóe ra xung quanh
  for (let k = 0; k < 6; k++) {
    const a = (k / 6) * Math.PI * 2 + 0.3;
    for (let d = 5; d < 10; d++) p.set(cx + Math.cos(a) * d + (d % 2), cy - 4 + Math.sin(a) * d, [255, 240, 140], 0.85);
  }
  p.disc(cx, cy - 4, 14, [248, 220, 90], 0.08);
}

function drawGrate(p: ArenaPainter, g: Rect & { group: number }) {
  // viền băng cảnh báo vàng–đen 3px
  for (let y = g.y - 3; y < g.y + g.h + 3; y++) for (let x = g.x - 3; x < g.x + g.w + 3; x++) {
    if (x >= g.x && x < g.x + g.w && y >= g.y && y < g.y + g.h) continue;
    p.set(x, y, Math.floor((x + y) / 5) % 2 ? [30, 30, 34] : [242, 194, 40]);
  }
  // hố tối bên dưới có ánh điện, phủ lưới thép
  const glow: RGB = g.group === 0 ? [250, 214, 70] : g.group === 1 ? [120, 210, 255] : [200, 160, 255];
  for (let y = g.y; y < g.y + g.h; y++) for (let x = g.x; x < g.x + g.w; x++) {
    const lx = x - g.x;
    const ly = y - g.y;
    const bar = lx % 6 < 2;
    const cross = ly % 12 < 2;
    if (bar || cross) {
      const top = lx % 6 === 0 || ly % 12 === 0;
      p.set(x, y, top ? [134, 140, 154] : [92, 98, 110]);
    } else {
      p.set(x, y, [18, 20, 28]);
      const n = p.noise(x / 7, y / 7);
      if (n > 0.55) p.set(x, y, glow, (n - 0.55) * 1.4);
    }
  }
  // biểu tượng tia sét ở giữa (nhóm phóng điện)
  const cx = g.x + g.w / 2;
  const cy = g.y + g.h / 2;
  const bolt = [[2, -9], [1, -6], [0, -3], [-1, 0], [3, 0], [2, 3], [1, 6], [0, 9]];
  for (const [dx, dy] of bolt) for (let k = -1; k <= 1; k++) p.set(cx + dx + k, cy + dy, glow, 0.75);
}

type PPGeo = { [K in keyof typeof PP]: Rect };

function drawPowerPlant(p: ArenaPainter, f: ArenaFrame, M: PPGeo, grates: (Rect & { group: number })[]) {
  const { W, H } = p;
  const areaK = (W * H) / (640 * 360);
  const X = (v: number) => Math.round(f.x(v));
  const Y = (v: number) => Math.round(f.y(v));
  // ---- sàn thép tấm 20px: vân chống trượt, đinh tán, vết dầu ----
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const lx = x % 20;
    const ly = y % 20;
    const tx = Math.floor(x / 20);
    const ty = Math.floor(y / 20);
    const v = ((tx * 7 + ty * 11) % 5) * 3;
    let c: RGB = [58 + v, 62 + v, 72 + v];
    if ((tx + ty) % 3 === 0 && ((lx + ly) % 6 === 0 || (lx - ly + 60) % 6 === 0)) c = [76 + v, 80 + v, 92 + v];
    if (lx === 19 || ly === 19) c = [32, 34, 40];
    else if (lx === 0 || ly === 0) c = [86 + v, 90 + v, 102 + v];
    if ((lx === 2 || lx === 17) && (ly === 2 || ly === 17)) c = [124, 128, 140];
    p.set(x, y, c);
    const grime = p.noise(x / 30, y / 30);
    if (grime > 0.64) p.set(x, y, [16, 14, 12], Math.min(0.35, (grime - 0.64) * 1.6));
  }
  const stains = [[180, 230, 10], [380, 120, 8], [470, 310, 9], [110, 140, 7], [560, 240, 6]];
  if (W > 640) stains.push([300, 330, 8], [600, 330, 7], [60, 330, 6]);
  for (const [ox, oy, rr] of stains.map(([x, y, r]) => [X(x), Y(y), r])) {
    p.disc(ox, oy, rr, [10, 10, 14], 0.35);
    p.disc(ox - 2, oy - 2, rr * 0.4, [90, 70, 120], 0.25);
  }
  // vũng sáng từ đèn trần còn sống
  for (const [lx, ly] of [[200, 190], [470, 180], [330, 230]].map(([x, y]) => [X(x), Y(y)])) for (let k = 4; k >= 1; k--) p.disc(lx, ly, k * 22, [255, 230, 150], 0.03);

  // ---- cáp điện nối tua-bin / máy biến áp với các tấm lưới ----
  // (toạ độ tính từ khung máy / lưới đã dời theo sân → cáp luôn nối đúng hai đầu)
  const [g0, g1, g2, g3, g4, g5] = grates;
  const cx = (r: Rect) => Math.round(r.x + r.w / 2);
  const cy = (r: Rect) => Math.round(r.y + r.h / 2);
  const { turbineL: tL, turbineR: tR, transformer: tf, cabinet: cab, coil } = M;
  cableV(p, cx(tL), tL.y + tL.h, g3.y);
  cableH(p, cx(tL), g0.x, cy(g0));
  cableV(p, cx(tR), tR.y + tR.h, cy(g4));
  cableH(p, cx(tR), g4.x, cy(g4));
  cableV(p, cx(g1), coil.y + coil.h, g1.y);
  cableH(p, coil.x + coil.w, cx(g1), coil.y + coil.h);
  cableV(p, cx(tf), g5.y + g5.h, tf.y);
  cableH(p, tf.x + tf.w, cab.x, cab.y + 16);
  cableH(p, cx(g2), tR.x, cy(g2));
  cableH(p, tL.x + tL.w, g2.x, cy(g2));

  // ---- biểu tượng tia sét mờ trên sàn ----
  const bolt = [[4, -20], [3, -14], [2, -8], [0, -2], [-2, 4], [5, 2], [3, 8], [1, 14], [-1, 20]];
  for (const [dx, dy] of bolt) for (let k = -4; k <= 4; k++) for (let j = 0; j < 6; j++) p.set(X(372) + dx + k, Y(196) + dy + j - 3, [248, 208, 48], 0.12);

  for (const g of grates) drawGrate(p, g);

  // ---- máy móc (vật cản) ----
  drawTurbine(p, M.turbineL);
  drawTurbine(p, M.turbineR);
  drawTransformer(p, M.transformer);
  drawCabinet(p, M.cabinet);
  drawCoil(p, M.coil);

  // mảnh vụn, ốc vít rơi vãi
  for (let i = 0; i < Math.round(70 * areaK); i++) {
    const x = 30 + p.rng() * (W - 60);
    const y = 30 + p.rng() * (H - 60);
    if (Object.values(M).some((r) => x > r.x - 4 && x < r.x + r.w + 4 && y > r.y - 4 && y < r.y + r.h + 4)) continue;
    p.set(x, y, p.rng() < 0.5 ? [150, 156, 168] : [110, 80, 50]);
  }

  // ---- tường bê tông khối, ống dẫn, cửa sổ vỡ ----
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const e = edgeDist(x, y, W, H);
    if (e >= WALL) continue;
    const row = Math.floor(y / 10);
    const bx = x + (row % 2) * 10;
    const v = ((Math.floor(bx / 20) * 13 + row * 7) % 5) * 4;
    let c: RGB = [66 + v, 68 + v, 74 + v];
    if (bx % 20 === 0 || y % 10 === 0) c = [40, 42, 46];
    if (e >= WALL - 4) c = Math.floor((x + y) / 6) % 2 ? [34, 34, 38] : [236, 188, 40];
    if (e === WALL - 1) c = [190, 194, 204];
    p.set(x, y, c);
  }
  // ống dẫn chạy dọc tường trên và dưới
  for (const py of [6, H - 12]) {
    for (let x = 0; x < W; x++) {
      p.set(x, py, [70, 90, 110]);
      p.set(x, py + 1, [130, 160, 190]);
      p.set(x, py + 2, [100, 126, 152]);
      p.set(x, py + 3, [56, 72, 90]);
      if (x % 64 < 4) for (let k = -1; k <= 4; k++) p.set(x, py + k, [150, 154, 164]);
    }
  }
  // cửa sổ vỡ trên tường trên
  const nWin = Math.max(3, Math.round((W - 250) / 130));
  for (let i = 0; i < nWin; i++) {
    const wx = Math.round(W / 2 - 20 + (i - (nWin - 1) / 2) * 130);
    frame(p, { x: wx, y: 2, w: 40, h: 4 }, [20, 30, 50], [140, 146, 158]);
    for (let k = 0; k < 6; k++) p.set(wx + 6 + k * 5, 3 + (k % 2), [150, 200, 255]);
  }
  // đèn khẩn cấp đỏ ở 4 góc
  for (const [px, py] of [[11, 11], [W - 12, 11], [11, H - 12], [W - 12, H - 12]]) {
    p.disc(px, py, 6, [40, 20, 20]);
    p.disc(px, py, 4, [230, 60, 50]);
    p.disc(px - 1, py - 1, 1.5, [255, 200, 190]);
    p.disc(px, py, 14, [255, 60, 40], 0.08);
  }
}

const POWER_PLANT: ArenaDef = (f) => {
  const M: PPGeo = {
    turbineL: f.obj(PP.turbineL), turbineR: f.obj(PP.turbineR), transformer: f.obj(PP.transformer),
    cabinet: f.obj(PP.cabinet), coil: f.obj(PP.coil),
  };
  const grates = PP_GRATES.map((g) => f.area(g));
  return {
    draw: (p) => drawPowerPlant(p, f, M, grates),
    layout: {
      inset: 24,
      solids: [M.turbineL, M.turbineR, M.transformer, M.cabinet, M.coil],
      hazards: [{
        kind: 'pulse', areas: grates, periodMs: 2800, warnMs: 900, fx: 'lightning', color: 0xf8d030,
        damagePct: 0.08, type: 'electric', immuneTypes: ['ground'],
      }],
    },
  };
};

// ======================================================================= Hội quán Viridian

/** đá tảng lớn và 4 cột đá góc sân */
const VR_ROCKS: Solid[] = [
  { x: 200, y: 76, w: 40, h: 34 },
  { x: 404, y: 258, w: 40, h: 34 },
  { x: 470, y: 108, w: 30, h: 26 },
  { x: 132, y: 254, w: 30, h: 26 },
];
const vrPillars = (W: number, H: number): Solid[] => [
  { x: 24, y: 24, w: 24, h: 24 },
  { x: W - 48, y: 24, w: 24, h: 24 },
  { x: 24, y: H - 48, w: 24, h: 24 },
  { x: W - 48, y: H - 48, w: 24, h: 24 },
];
/** hố cát lún (làm chậm) */
const VR_SAND: Rect[] = [
  { x: 290, y: 156, w: 60, h: 60 },
  { x: 196, y: 262, w: 92, h: 48 },
  { x: 352, y: 52, w: 92, h: 48 },
];

function drawBoulder(p: ArenaPainter, r: Rect) {
  const cx = r.x + r.w / 2;
  const cy = r.y + r.h / 2;
  const rx = r.w / 2;
  const ry = r.h / 2;
  const inside = (x: number, y: number) => {
    const nx = (x + 0.5 - cx) / rx;
    const ny = (y + 0.5 - cy) / ry;
    const wob = 1 + (p.noise(x / 5, y / 5) - 0.5) * 0.22;
    return { d: nx * nx + ny * ny, wob, nx, ny };
  };
  for (let y = r.y; y < r.y + r.h; y++) for (let x = r.x; x < r.x + r.w; x++) {
    const s = inside(x, y);
    if (s.d <= s.wob * 0.95) p.set(x + 3, y + 4, [0, 0, 0], 0.32);
  }
  for (let y = r.y; y < r.y + r.h; y++) for (let x = r.x; x < r.x + r.w; x++) {
    const s = inside(x, y);
    if (s.d > s.wob * 0.95) continue;
    const light = -(s.nx * 0.6 + s.ny * 0.8);
    let c: RGB = light > 0.35 ? [176, 164, 146] : light > -0.2 ? [138, 126, 110] : [98, 88, 76];
    if ((x * 5 + y * 3) % 17 === 0) c = shade(c, 1.15);
    if (s.d > s.wob * 0.78) c = [62, 54, 46];
    p.set(x, y, c);
  }
  // vết nứt + rêu xanh
  let kx = cx - rx * 0.3;
  for (let y = Math.round(cy - ry * 0.5); y < cy + ry * 0.4; y++) {
    kx += (p.rng() - 0.5) * 2;
    p.set(kx, y, [58, 50, 42]);
  }
  for (let i = 0; i < 6; i++) {
    const mx = cx - rx * 0.5 + p.rng() * rx;
    const my = cy - ry * 0.7 + p.rng() * ry * 0.4;
    p.set(mx, my, [92, 150, 70]);
    p.set(mx + 1, my, [120, 180, 90]);
  }
}

function drawSandPit(p: ArenaPainter, r: Rect) {
  const rad = 10;
  const cx = r.x + r.w / 2;
  const cy = r.y + r.h / 2;
  for (let y = r.y - 2; y < r.y + r.h + 2; y++) for (let x = r.x - 2; x < r.x + r.w + 2; x++) {
    // hình chữ nhật bo góc
    const qx = Math.max(r.x + rad - x, 0, x - (r.x + r.w - 1 - rad));
    const qy = Math.max(r.y + rad - y, 0, y - (r.y + r.h - 1 - rad));
    const d = Math.hypot(qx, qy);
    if (d > rad + 2) continue;
    if (d > rad) {
      p.set(x, y, [112, 84, 52]);
      continue;
    }
    // vân cát xoáy vào tâm
    const a = Math.atan2(y - cy, x - cx);
    const dist = Math.hypot((x - cx) / (r.w / 2), (y - cy) / (r.h / 2));
    const swirl = Math.sin(a * 3 + dist * 9);
    let c: RGB = swirl > 0.4 ? [236, 206, 140] : swirl < -0.5 ? [196, 160, 100] : [220, 188, 124];
    c = shade(c, 1 - Math.min(0.35, (1 - dist) * 0.35));
    if ((x * 7 + y * 13) % 29 === 0) c = [250, 236, 190];
    p.set(x, y, c);
  }
  p.disc(cx, cy, 3, [150, 116, 70], 0.6);
}

function drawPillar(p: ArenaPainter, r: Rect) {
  const cx = r.x + r.w / 2;
  const cy = r.y + r.h / 2;
  p.disc(cx + 2, cy + 3, 12, [0, 0, 0], 0.32);
  p.disc(cx, cy, 12, [70, 60, 50]);
  p.disc(cx, cy, 11, [128, 114, 96]);
  p.disc(cx - 3, cy - 3, 6, [170, 156, 134]);
  // ngọc lục bảo khảm đỉnh cột
  p.disc(cx, cy, 4, [30, 110, 70]);
  p.disc(cx, cy, 3, [60, 180, 110]);
  p.set(cx - 1, cy - 1, [200, 255, 220]);
}

function drawViridianGym(p: ArenaPainter, f: ArenaFrame, rocks: Solid[], pillars: Solid[], sand: Rect[]) {
  const { W, H } = p;
  const areaK = (W * H) / (640 * 360);
  const CX = W / 2;
  const CY = Math.round(f.y(186));
  // ---- sàn gạch đất nện 16px, có vết nứt ----
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const lx = x % 16;
    const ly = y % 16;
    const tx = Math.floor(x / 16);
    const ty = Math.floor(y / 16);
    const v = ((tx * 7 + ty * 5) % 4) * 5;
    const n = p.noise(x / 16, y / 16);
    let c: RGB = [168 + v - n * 20, 132 + v - n * 18, 92 + v - n * 14].map(clamp) as RGB;
    if (lx === 15 || ly === 15) c = [120, 90, 60];
    else if (lx === 0 || ly === 0) c = [190, 156, 112];
    p.set(x, y, c);
  }
  for (let k = 0; k < Math.round(16 * areaK); k++) {
    let x = 40 + p.rng() * (W - 80);
    let y = 40 + p.rng() * (H - 80);
    let a = p.rng() * Math.PI * 2;
    for (let s = 0; s < 18; s++) {
      a += (p.rng() - 0.5) * 1.1;
      x += Math.cos(a) * 1.4;
      y += Math.sin(a) * 1.4;
      p.set(x, y, [96, 70, 46]);
    }
  }
  // hố đá rơi đã nguội (dấu vết mưa đá)
  const craters = [[260, 140], [400, 210], [180, 310], [520, 70], [560, 260]];
  if (W > 640) craters.push([90, 90], [300, 300], [440, 140]);
  for (const [hx, hy] of craters.map(([x, y]) => [Math.round(f.x(x)), Math.round(f.y(y))])) {
    p.disc(hx, hy, 7, [176, 146, 104]);
    p.disc(hx, hy + 1, 5, [110, 84, 56]);
    for (let i = 0; i < 5; i++) p.set(hx - 8 + p.rng() * 16, hy - 8 + p.rng() * 16, [140, 130, 120]);
  }
  // ---- vạch sân ----
  const line: RGB = [104, 76, 48];
  for (let x = 40; x < W - 40; x++) for (const yy of [40, H - 41]) p.set(x, yy, line);
  for (let y = 40; y < H - 40; y++) for (const xx of [40, W - 41]) p.set(xx, y, line);
  for (let y = 40; y < H - 40; y++) if (y < CY - 64 || y > CY + 64) for (let k = -1; k <= 0; k++) p.set(CX + k, y, line);
  // vòng đá khảm quanh hố cát trung tâm, ngọc ở 8 hướng
  for (let y = CY - 70; y <= CY + 70; y++) for (let x = CX - 70; x <= CX + 70; x++) {
    const d = Math.hypot(x - CX, y - CY);
    if (d < 62 && d > 52) {
      const seg = Math.floor((Math.atan2(y - CY, x - CX) + Math.PI) / (Math.PI / 10));
      let c: RGB = seg % 2 ? [150, 138, 120] : [128, 116, 100];
      if (d > 61 || d < 53) c = [80, 70, 58];
      p.set(x, y, c);
    }
  }
  for (let k = 0; k < 8; k++) {
    const a = (k / 8) * Math.PI * 2;
    const gx = CX + Math.cos(a) * 57;
    const gy = CY + Math.sin(a) * 57;
    p.disc(gx, gy, 3, [30, 110, 70]);
    p.set(gx - 1, gy - 1, [170, 240, 200]);
  }
  // vòng xuất phát hai bên
  for (const { x: sx, y: sy } of [f.startL, f.startR]) {
    for (let y = sy - 30; y <= sy + 30; y++) for (let x = sx - 40; x <= sx + 40; x++) {
      const d = Math.hypot(x - sx, (y - sy) * 1.6);
      if (d < 34 && d > 30) p.set(x, y, (Math.floor(Math.atan2(y - sy, x - sx) * 6) % 2) ? [96, 70, 44] : [150, 120, 80]);
      if (d <= 30) p.set(x, y, [90, 160, 100], 0.12);
    }
  }

  for (const s of sand) drawSandPit(p, s);

  // cỏ mọc chân tường (Viridian xanh tươi)
  for (let i = 0; i < Math.round((160 * (W + H)) / 1000); i++) {
    const side = Math.floor(p.rng() * 4);
    const t = p.rng();
    const x = side < 2 ? 26 + t * (W - 52) : side === 2 ? 25 + p.rng() * 6 : W - 31 + p.rng() * 6;
    const y = side >= 2 ? 26 + t * (H - 52) : side === 0 ? 25 + p.rng() * 5 : H - 30 + p.rng() * 5;
    p.set(x, y, [70, 140, 60]);
    p.set(x, y - 1, [110, 180, 80]);
  }

  // ---- đá tảng (vật cản) ----
  for (const r of rocks) drawBoulder(p, r);

  // ---- vách đá phân tầng quanh sân ----
  const strata: RGB[] = [[96, 72, 50], [122, 94, 64], [142, 112, 78], [110, 84, 58], [158, 128, 90]];
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const e = edgeDist(x, y, W, H);
    if (e >= WALL) continue;
    const wave = Math.round((p.noise(x / 14, y / 14) - 0.5) * 6);
    let c = strata[Math.max(0, Math.floor((e + wave + 8) / 5)) % strata.length];
    if ((x * 3 + y * 7) % 23 === 0) c = shade(c, 0.8);
    if (e === WALL - 1) c = [70, 52, 36];
    if (e === WALL - 2) c = [196, 166, 120];
    p.set(x, y, c);
  }
  // bảng đá khắc giữa tường trên
  frame(p, { x: CX - 26, y: 3, w: 52, h: 16 }, [92, 86, 80], [40, 36, 32]);
  p.rect(CX - 24, 4, 48, 3, [130, 124, 116]);
  for (let k = -3; k <= 3; k++) p.disc(CX + k * 6, 12, 1.8, k === 0 ? [60, 180, 110] : [70, 62, 54]);

  for (const r of pillars) drawPillar(p, r);
}

const GYM_VIRIDIAN: ArenaDef = (f) => {
  const rocks = VR_ROCKS.map((r) => f.obj(r));
  const pillars = vrPillars(f.W, f.H);
  // hố giữa giữ nguyên cỡ (nằm gọn trong vòng đá khảm r=52), hai hố bên giãn theo sân
  const sand = VR_SAND.map((r, i) => (i === 0 ? f.obj(r) : f.area(r)));
  return {
    draw: (p) => drawViridianGym(p, f, rocks, pillars, sand),
    layout: {
      inset: 24,
      solids: [...rocks, ...pillars],
      slowZones: sand,
      slowImmuneTypes: ['ground'],
      hazards: [{
        kind: 'rain', count: 3, radius: 22, periodMs: 3000, warnMs: 900, fx: 'rock', color: 0xc8a060,
        damagePct: 0.09, type: 'rock',
      }],
    },
  };
};

export const ARENAS: Record<string, ArenaDef> = {
  'power-plant': POWER_PLANT,
  'gym-viridian': GYM_VIRIDIAN,
};
