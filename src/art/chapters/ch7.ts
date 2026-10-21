// Sân đấu tự vẽ chương 7: Đường biển 19, Hang băng Seafoam, Dinh thự hoang Cinnabar, Hội quán Cinnabar.
// Mọi vật cản được khai báo một lần (danh sách bên dưới) rồi dùng chung cho cả hình vẽ lẫn layout → luôn khớp.
import type { ArenaDef, ArenaFrame, ArenaPainter, RGB } from './types';
import type { Rect, Solid } from '../../data/hazards';

const WALL = 22;
const INSET = 24;

// ======================================================================= tiện ích vẽ

const clamp = (v: number) => Math.max(0, Math.min(255, Math.round(v)));
const shade = (c: RGB, k: number): RGB => [clamp(c[0] * k), clamp(c[1] * k), clamp(c[2] * k)];
const mix = (a: RGB, b: RGB, t: number): RGB => [clamp(a[0] + (b[0] - a[0]) * t), clamp(a[1] + (b[1] - a[1]) * t), clamp(a[2] + (b[2] - a[2]) * t)];

/** khoảng cách tới mép ảnh */
const edgeDist = (p: ArenaPainter, x: number, y: number) => Math.min(x, y, p.W - 1 - x, p.H - 1 - y);

/** tô từng điểm của cả sân */
function fill(p: ArenaPainter, fn: (x: number, y: number) => RGB) {
  for (let y = 0; y < p.H; y++) for (let x = 0; x < p.W; x++) p.set(x, y, fn(x, y));
}

/** tô viền tường dày WALL; fn trả màu theo (x, y, e = khoảng cách tới mép) */
function wall(p: ArenaPainter, fn: (x: number, y: number, e: number) => RGB) {
  for (let y = 0; y < p.H; y++) for (let x = 0; x < p.W; x++) {
    const e = edgeDist(p, x, y);
    if (e < WALL) p.set(x, y, fn(x, y, e));
  }
}

/** hình chữ nhật bo góc */
function inRound(x: number, y: number, r: Rect, rad: number) {
  if (x < r.x || y < r.y || x >= r.x + r.w || y >= r.y + r.h) return false;
  const cx = Math.max(r.x + rad, Math.min(r.x + r.w - rad, x));
  const cy = Math.max(r.y + rad, Math.min(r.y + r.h - rad, y));
  return (x - cx) ** 2 + (y - cy) ** 2 <= rad * rad;
}
/** khoảng cách từ điểm (bên trong) tới mép hình chữ nhật */
const rectDepth = (x: number, y: number, r: Rect) => Math.min(x - r.x, y - r.y, r.x + r.w - 1 - x, r.y + r.h - 1 - y);

/** bóng đổ mềm dưới vật */
function dropShadow(p: ArenaPainter, cx: number, cy: number, rx: number, ry: number, a = 0.28) {
  for (let y = Math.floor(cy - ry); y <= cy + ry; y++) for (let x = Math.floor(cx - rx); x <= cx + rx; x++) {
    const d = ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2;
    if (d <= 1) p.set(x, y, [0, 0, 0], a * (1 - d * 0.5));
  }
}

/** tảng đá elip có khối: sáng góc trên trái, tối dưới phải, viền đậm, đốm rêu/khoáng */
function boulder(p: ArenaPainter, cx: number, cy: number, rx: number, ry: number, base: RGB, speck?: RGB) {
  dropShadow(p, cx + 3, cy + ry * 0.55, rx * 1.05, ry * 0.55, 0.3);
  for (let y = Math.floor(cy - ry); y <= cy + ry; y++) for (let x = Math.floor(cx - rx); x <= cx + rx; x++) {
    const nx = (x - cx) / rx;
    const ny = (y - cy) / ry;
    const d = nx * nx + ny * ny;
    if (d > 1) continue;
    const lit = -nx * 0.55 - ny * 0.8 + 0.25 * (p.noise(x / 4, y / 4) - 0.5);
    let c = shade(base, 0.82 + lit * 0.32);
    if (d > 0.82) c = shade(base, 0.5);
    else if (lit > 0.6 && d < 0.5) c = shade(base, 1.25);
    p.set(x, y, c);
  }
  // vết nứt
  let kx = cx - rx * 0.2;
  for (let k = 0; k < ry * 0.9; k++) {
    kx += (p.rng() - 0.5) * 1.6;
    p.set(kx, cy - ry * 0.4 + k, shade(base, 0.55));
  }
  if (speck) for (let i = 0; i < rx * ry * 0.12; i++) {
    const a = p.rng() * Math.PI * 2;
    const r = Math.sqrt(p.rng()) * 0.8;
    p.set(cx + Math.cos(a) * rx * r, cy + Math.sin(a) * ry * r, speck);
  }
}

/** vật cản hình elip → hình chữ nhật va chạm hơi nhỏ hơn hình vẽ */
interface Oval { cx: number; cy: number; rx: number; ry: number }
/** elip thiết kế → elip thật (tâm dời theo khung, bán kính giữ nguyên) */
const ovalAt = (f: ArenaFrame, o: Oval): Oval => ({ ...o, cx: Math.round(f.x(o.cx)), cy: Math.round(f.y(o.cy)) });
/** số lượng rải ngẫu nhiên giữ mật độ theo diện tích sân */
const density = (p: ArenaPainter, n: number) => Math.round((n * p.W * p.H) / (640 * 360));
const ovalSolid = (o: Oval): Solid => ({ x: Math.round(o.cx - o.rx * 0.85), y: Math.round(o.cy - o.ry * 0.75), w: Math.round(o.rx * 1.7), h: Math.round(o.ry * 1.5) });

/** khung tròn xuất phát (đánh dấu vị trí hai bên) */
function startRing(p: ArenaPainter, sx: number, sy: number, c: RGB) {
  for (let y = sy - 24; y <= sy + 24; y++) for (let x = sx - 40; x <= sx + 40; x++) {
    const d = Math.hypot(x - sx, (y - sy) * 1.6);
    if (d < 34 && d > 31) p.set(x, y, c, 0.8);
  }
}

// ======================================================================= 1. Đường biển 19 – bãi cát giữa khơi

/** hai vũng nước triều (làm chậm Pokémon không phải hệ Nước) */
const SEA_POOLS: Rect[] = [
  { x: 244, y: 40, w: 150, h: 72 },
  { x: 396, y: 246, w: 150, h: 68 },
];
const SEA_ROCKS: Oval[] = [
  { cx: 96, cy: 88, rx: 18, ry: 13 },
  { cx: 330, cy: 186, rx: 20, ry: 14 },
  { cx: 478, cy: 118, rx: 15, ry: 11 },
  { cx: 160, cy: 292, rx: 16, ry: 11 },
  { cx: 584, cy: 196, rx: 14, ry: 16 },
];
/** thuyền gỗ mắc cạn */
const SEA_BOAT: Rect = { x: 448, y: 182, w: 48, h: 22 };
/** đá thêm khi sân rộng (≥ 800px) – lấp khoảng trống, tránh giữa sân */
const SEA_ROCKS_EXTRA: Oval[] = [
  { cx: 236, cy: 150, rx: 13, ry: 10 },
  { cx: 580, cy: 64, rx: 12, ry: 9 },
];

interface SeaGeo { pools: Rect[]; rocks: Oval[]; boat: Rect }
function seaGeo(f: ArenaFrame): SeaGeo {
  const rocks = SEA_ROCKS.map((o) => ovalAt(f, o));
  if (f.W >= 800) rocks.push(...SEA_ROCKS_EXTRA.map((o) => ovalAt(f, o)));
  return { pools: SEA_POOLS.map((r) => f.area(r)), rocks, boat: f.obj(SEA_BOAT) };
}

function drawSeaRoute(p: ArenaPainter, f: ArenaFrame, g: SeaGeo) {
  const { W, H } = p;
  const X = f.x;
  const Y = f.y;
  const sand: RGB[] = [[232, 212, 154], [224, 202, 140], [240, 222, 170]];
  fill(p, (x, y) => {
    const v = p.noise(x / 20, y / 20);
    let c = sand[v < 0.38 ? 1 : v > 0.64 ? 2 : 0];
    // gợn cát do gió
    const ripple = Math.sin(x / 9 + Math.sin(y / 23) * 2.4 + y / 31);
    if (ripple > 0.94) c = shade(c, 0.95);
    else if (ripple < -0.97) c = shade(c, 1.03);
    // cát ướt sát mép nước
    const e = edgeDist(p, x, y);
    if (e < WALL + 8) c = mix(c, [176, 156, 112], (WALL + 8 - e) / 10);
    return c;
  });
  // hạt cát, vỏ sò vụn
  for (let i = 0, n = density(p, 1500); i < n; i++) {
    const x = p.rng() * W;
    const y = p.rng() * H;
    p.set(x, y, p.rng() < 0.5 ? [200, 178, 124] : [250, 238, 200]);
  }

  // vũng nước triều: viền cát ướt, nước nông, giữa sâu, gợn sáng
  for (const r of g.pools) {
    const wet = { x: r.x - 5, y: r.y - 5, w: r.w + 10, h: r.h + 10 };
    for (let y = wet.y; y < wet.y + wet.h; y++) for (let x = wet.x; x < wet.x + wet.w; x++) {
      if (!inRound(x, y, wet, 22)) continue;
      if (!inRound(x, y, r, 18)) {
        p.set(x, y, [182, 162, 116]);
        continue;
      }
      const d = rectDepth(x, y, r);
      let c: RGB = d < 3 ? [236, 246, 250] : d < 10 ? [96, 186, 214] : d < 20 ? [66, 156, 204] : [44, 122, 186];
      if (d >= 3 && (y * 5 + Math.floor(x / 7) * 3 + Math.floor(Math.sin(x / 11) * 3)) % 19 === 0) c = [168, 224, 244];
      p.set(x, y, c);
    }
  }
  // rong biển trong vũng và trên cát
  for (const [dx, dy] of [[268, 92], [372, 58], [420, 300], [520, 262], [64, 200], [612, 300]]) {
    const sx = X(dx);
    const sy = Y(dy);
    for (let k = 0; k < 5; k++) {
      const bx = sx + k * 3 - 6;
      for (let t = 0; t < 8 + (k % 3) * 2; t++) p.set(bx + Math.sin(t / 2 + k) * 1.4, sy - t, t % 3 ? [58, 138, 74] : [92, 170, 90]);
    }
  }

  // sao biển và vỏ sò
  const star = (cx: number, cy: number, c: RGB) => {
    for (let a = 0; a < 5; a++) {
      const ang = (a / 5) * Math.PI * 2 - Math.PI / 2;
      for (let t = 0; t <= 5; t++) p.set(cx + Math.cos(ang) * t, cy + Math.sin(ang) * t, t > 3 ? shade(c, 1.15) : c);
    }
    p.disc(cx, cy, 1.6, shade(c, 0.85));
  };
  star(X(120), Y(140), [236, 120, 80]);
  star(X(372), Y(150), [230, 96, 120]);
  star(X(270), Y(300), [240, 150, 70]);
  star(X(560), Y(130), [236, 120, 80]);
  if (W >= 800) {
    star(X(170), Y(250), [230, 96, 120]);
    star(X(470), Y(74), [240, 150, 70]);
  }
  const shell = (cx: number, cy: number) => {
    for (let y = -3; y <= 2; y++) for (let x = -4; x <= 4; x++) if (x * x / 16 + (y + 1) * (y + 1) / 9 <= 1) p.set(cx + x, cy + y, (x + 8) % 2 ? [250, 226, 214] : [232, 190, 176]);
    p.set(cx, cy + 3, [210, 168, 150]);
  };
  for (const [x, y] of [[214, 110], [404, 200], [92, 236], [300, 238], [520, 76], [612, 250], [190, 60]]) shell(X(x), Y(y));
  if (W >= 800) for (const [x, y] of [[356, 280], [140, 176], [540, 160], [60, 120]]) shell(X(x), Y(y));
  // dấu chân chim trên cát
  for (let k = 0; k < 7; k++) {
    const fx = X(120) + k * 14;
    const fy = Y(214) + (k % 2) * 5;
    for (const [dx, dy] of [[0, 0], [-2, -2], [2, -2], [0, -3]]) p.set(fx + dx, fy + dy, [196, 174, 122]);
  }

  // thuyền gỗ mắc cạn (vật cản)
  {
    const b = g.boat;
    dropShadow(p, b.x + b.w / 2 + 3, b.y + b.h - 2, b.w / 2 + 2, 6, 0.3);
    const cx = b.x + b.w / 2;
    const cy = b.y + b.h / 2;
    for (let y = b.y; y < b.y + b.h; y++) for (let x = b.x; x < b.x + b.w; x++) {
      const nx = (x - cx) / (b.w / 2);
      const ny = (y - cy) / (b.h / 2);
      // thân thuyền nhọn hai đầu
      if (ny * ny + Math.pow(Math.abs(nx), 3) > 1) continue;
      const rim = ny * ny + Math.pow(Math.abs(nx), 3) > 0.62;
      let c: RGB = rim ? [118, 72, 40] : (y - b.y) % 5 === 0 ? [138, 92, 54] : [172, 118, 70];
      if (rim && y < cy) c = [150, 98, 56];
      p.set(x, y, c);
    }
    // ghế ngồi + mái chèo
    for (let y = b.y + 4; y < b.y + b.h - 4; y++) for (const xx of [cx - 8, cx + 7]) for (let k = 0; k < 3; k++) p.set(xx + k, y, [98, 60, 32]);
    for (let k = 0; k < 30; k++) p.set(cx - 16 + k, cy + 1 + Math.round(k / 12), [214, 184, 132]);
    p.rect(cx + 13, cy + 2, 5, 3, [214, 184, 132]);
  }

  for (const r of g.rocks) boulder(p, r.cx, r.cy, r.rx, r.ry, [124, 118, 112], [86, 140, 90]);

  // viền: biển sâu với sóng, bọt trắng sát bờ, mỏm đá ở góc
  wall(p, (x, y, e) => {
    let c: RGB = e < 8 ? [30, 84, 160] : e < 15 ? [42, 108, 184] : [64, 140, 212];
    const wave = (x + y + Math.round(Math.sin((x - y) / 9) * 4)) % 16;
    if (wave === 0 || wave === 1) c = shade(c, 1.25);
    if (e >= WALL - 4) {
      const foam = p.noise(x / 5, y / 5);
      c = e >= WALL - 2 || foam > 0.55 ? [240, 248, 252] : [168, 214, 236];
    }
    return c;
  });
  for (const [cx, cy] of [[22, 22], [W - 22, 22], [22, H - 22], [W - 22, H - 22]]) {
    for (let a = 0; a < 18; a++) {
      const ang = (a / 18) * Math.PI * 2;
      p.set(cx + Math.cos(ang) * 17, cy + Math.sin(ang) * 13, [240, 248, 252]);
    }
    boulder(p, cx, cy, 14, 11, [98, 94, 92]);
  }
  // phao đỏ trắng trên biển
  for (const [bx, by] of [[X(320), 10], [W - 30, Y(180)], [10, Y(260)]]) {
    p.disc(bx, by, 5, [240, 240, 240]);
    p.rect(bx - 5, by - 1, 11, 3, [214, 54, 54]);
    p.set(bx - 2, by - 3, [255, 255, 255]);
  }
}

// ======================================================================= 2. Hang băng Seafoam

/** sàn băng trơn */
const SEAFOAM_ICE: Rect[] = [
  { x: 236, y: 52, w: 160, h: 84 },
  { x: 372, y: 206, w: 180, h: 96 },
  { x: 44, y: 250, w: 120, h: 70 },
];
/** hồ nước ngầm lạnh buốt (làm chậm) */
const SEAFOAM_POOL: Rect = { x: 506, y: 40, w: 100, h: 66 };
/** cụm tinh thể băng (vật cản): tâm + kích thước khung */
const SEAFOAM_CRYSTALS: Rect[] = [
  { x: 457, y: 136, w: 26, h: 30 },
  { x: 288, y: 248, w: 24, h: 28 },
  { x: 98, y: 82, w: 24, h: 28 },
  { x: 572, y: 274, w: 24, h: 28 },
];
/** đống tuyết lớn (vật cản) */
const SEAFOAM_DRIFTS: Oval[] = [
  { cx: 330, cy: 184, rx: 18, ry: 12 },
  { cx: 196, cy: 300, rx: 16, ry: 10 },
];

interface SeafoamGeo { ice: Rect[]; pool: Rect; crystals: Rect[]; drifts: Oval[] }
function seafoamGeo(f: ArenaFrame): SeafoamGeo {
  const crystals = SEAFOAM_CRYSTALS.map((r) => f.obj(r));
  const drifts = SEAFOAM_DRIFTS.map((o) => ovalAt(f, o));
  if (f.W >= 800) {
    // sân rộng: thêm một cụm tinh thể + một đống tuyết ở khoảng trống
    crystals.push(f.obj({ x: 169, y: 117, w: 22, h: 26 }));
    drifts.push(ovalAt(f, { cx: 470, cy: 60, rx: 14, ry: 9 }));
  }
  return { ice: SEAFOAM_ICE.map((r) => f.area(r)), pool: f.area(SEAFOAM_POOL), crystals, drifts };
}

function drawSeafoam(p: ArenaPainter, g: SeafoamGeo) {
  const { W, H } = p;
  const rock: RGB[] = [[92, 112, 138], [84, 104, 130], [102, 124, 150]];
  fill(p, (x, y) => {
    const v = p.noise(x / 16, y / 16);
    let c = rock[v < 0.38 ? 1 : v > 0.62 ? 2 : 0];
    // lớp sương giá phủ loang lổ
    const frost = p.noise(x / 40 + 7, y / 40 + 3);
    if (frost > 0.6) c = mix(c, [196, 214, 232], Math.min(0.7, (frost - 0.6) * 3));
    return c;
  });
  // đốm tuyết, đá khoáng
  for (let i = 0, n = density(p, 1600); i < n; i++) {
    const x = p.rng() * W;
    const y = p.rng() * H;
    const r = p.rng();
    p.set(x, y, r < 0.5 ? [232, 242, 252] : r < 0.8 ? [70, 88, 112] : [150, 214, 240]);
  }

  // hồ nước ngầm: viền tuyết, nước xanh thẫm, mảng băng trôi
  {
    const r = g.pool;
    for (let y = r.y - 4; y < r.y + r.h + 4; y++) for (let x = r.x - 4; x < r.x + r.w + 4; x++) {
      const outer = { x: r.x - 4, y: r.y - 4, w: r.w + 8, h: r.h + 8 };
      if (!inRound(x, y, outer, 16)) continue;
      if (!inRound(x, y, r, 13)) {
        p.set(x, y, [226, 236, 248]);
        continue;
      }
      const d = rectDepth(x, y, r);
      let c: RGB = d < 6 ? [44, 104, 150] : [24, 66, 112];
      if ((x * 2 + y * 7) % 23 === 0) c = [96, 160, 206];
      p.set(x, y, c);
    }
    // mảng băng trôi: vị trí theo tỉ lệ trong hồ (hồ giãn theo sân)
    for (const [tx, ty, fw] of [[0.22, 0.27, 14], [0.6, 0.6, 18], [0.78, 0.18, 10]]) {
      const fx = Math.round(r.x + r.w * tx);
      const fy = Math.round(r.y + r.h * ty);
      p.rect(fx, fy, fw, 6, [214, 236, 250]);
      p.rect(fx, fy + 6, fw, 2, [140, 186, 214]);
      p.rect(fx + 1, fy + 1, fw - 4, 1, [255, 255, 255]);
    }
  }

  // sàn băng: mặt kính bóng, vệt phản chiếu chéo, vết nứt
  for (const r of g.ice) {
    for (let y = r.y; y < r.y + r.h; y++) for (let x = r.x; x < r.x + r.w; x++) {
      if (!inRound(x, y, r, 10)) continue;
      const d = rectDepth(x, y, r);
      const n = p.noise(x / 14, y / 14);
      let c: RGB = n > 0.55 ? [196, 236, 250] : [176, 222, 244];
      if (d < 2) c = [120, 172, 206];
      else if (d < 4) c = [230, 246, 255];
      const streak = (x - y * 1.4 + 1000) % 46;
      if (d >= 4 && (streak < 2 || (streak > 8 && streak < 10))) c = [244, 252, 255];
      p.set(x, y, c);
    }
    // vết nứt dăm
    for (let k = 0; k < 3; k++) {
      let cx = r.x + 16 + p.rng() * (r.w - 32);
      let cy = r.y + 12 + p.rng() * (r.h - 24);
      const dir = p.rng() * Math.PI * 2;
      for (let t = 0; t < 22; t++) {
        cx += Math.cos(dir + (p.rng() - 0.5) * 1.2);
        cy += Math.sin(dir + (p.rng() - 0.5) * 1.2);
        if (inRound(cx, cy, r, 10) && rectDepth(cx, cy, r) > 4) p.set(cx, cy, [128, 180, 214]);
      }
    }
  }

  // tảng đá phủ tuyết: đá xám xanh, mũ tuyết dày trên đỉnh, băng đọng chân
  for (const o of g.drifts) {
    boulder(p, o.cx, o.cy, o.rx, o.ry, [96, 112, 134], [150, 206, 236]);
    for (let y = Math.floor(o.cy - o.ry); y <= o.cy + o.ry; y++) for (let x = Math.floor(o.cx - o.rx); x <= o.cx + o.rx; x++) {
      const nx = (x - o.cx) / o.rx;
      const ny = (y - o.cy) / o.ry;
      const d = nx * nx + ny * ny;
      const capEdge = -0.1 + Math.sin(nx * 5 + 1) * 0.12;
      if (d > 0.97 || ny > capEdge) continue;
      const lit = -nx * 0.5 - ny * 0.85;
      p.set(x, y, ny > capEdge - 0.12 ? [196, 214, 236] : lit > 0.45 ? [255, 255, 255] : [232, 242, 252]);
    }
    p.set(o.cx - o.rx * 0.4, o.cy - o.ry * 0.6, [255, 255, 255]);
    p.set(o.cx - o.rx * 0.4 + 1, o.cy - o.ry * 0.6, [200, 240, 255]);
  }

  // tinh thể băng: các lăng trụ nhọn, mặt sáng/tối, lõi xanh, đế tuyết
  for (const c of g.crystals) {
    const cx = c.x + c.w / 2;
    const base = c.y + c.h - 2;
    dropShadow(p, cx + 3, base, c.w / 2 + 3, 6, 0.32);
    const spikes = [[-8, 0.58, 5], [8, 0.7, 5], [0, 1, 6], [-4, 0.4, 4], [5, 0.45, 4]];
    for (const [dx, hk, hw] of spikes) {
      const top = base - c.h * hk;
      for (let y = Math.floor(top); y < base; y++) {
        const t = (y - top) / (base - top);
        const half = Math.max(1, Math.round(hw * Math.min(1, t * 2.2)));
        for (let x = -half; x <= half; x++) {
          let col: RGB = x < 0 ? [170, 226, 250] : [96, 170, 222];
          if (x === -half || x === half) col = [56, 112, 170];
          if (x === 0) col = [236, 252, 255];
          p.set(cx + dx + x, y, col);
        }
      }
    }
    for (let x = c.x; x < c.x + c.w; x++) {
      const t = (x - c.x) / (c.w - 1);
      const hgt = Math.round(3 + Math.sin(t * Math.PI) * 2);
      for (let k = 0; k < hgt; k++) p.set(x, base + 2 - k, k === hgt - 1 ? [255, 255, 255] : [214, 228, 244]);
    }
  }

  // viền: vách đá băng phân tầng, mạch băng xanh, tuyết đọng sát chân tường
  wall(p, (x, y, e) => {
    const n = p.noise(x / 9, y / 5);
    let c: RGB = n > 0.62 ? [84, 106, 138] : n < 0.36 ? [50, 66, 94] : [66, 86, 116];
    const vein = p.noise(x / 22 + 40, y / 22 + 40);
    if (vein > 0.48 && vein < 0.52) c = [140, 196, 232];
    if (e < 3) c = shade(c, 0.75);
    if (e >= WALL - 3) c = e === WALL - 1 ? [244, 250, 255] : [214, 230, 246];
    return c;
  });
  // nhũ băng dọc mép trên
  for (let x = WALL + 4; x < W - WALL - 4; x += 9 + Math.floor(p.rng() * 8)) {
    const len = 5 + Math.floor(p.rng() * 9);
    for (let t = 0; t < len; t++) {
      const half = Math.max(0, Math.round((1 - t / len) * 2));
      for (let k = -half; k <= half; k++) p.set(x + k, WALL + t, k < 0 ? [236, 250, 255] : [150, 206, 236]);
    }
  }
  // thạch băng ở 4 góc
  for (const [cx, cy] of [[24, 24], [W - 24, 24], [24, H - 24], [W - 24, H - 24]]) {
    dropShadow(p, cx + 2, cy + 6, 13, 6, 0.3);
    for (let y = -14; y <= 10; y++) for (let x = -10; x <= 10; x++) {
      if (Math.abs(x) > 10 - Math.max(0, -y) * 0.7) continue;
      p.set(cx + x, cy + y, x < -3 ? [200, 238, 252] : x > 3 ? [92, 160, 214] : [150, 210, 244]);
    }
  }
}

// ======================================================================= 3. Dinh thự hoang Cinnabar

const MANSION_PILLARS: Rect[] = [
  { x: 245, y: 76, w: 22, h: 22 },
  { x: 389, y: 76, w: 22, h: 22 },
  { x: 245, y: 270, w: 22, h: 22 },
  { x: 389, y: 270, w: 22, h: 22 },
];
const MANSION_SHELVES: Rect[] = [
  { x: 60, y: 24, w: 80, h: 22 },
  { x: 500, y: 24, w: 80, h: 22 },
];
const MANSION_STATUE: Rect = { x: 308, y: 110, w: 24, h: 28 };
const MANSION_TABLE: Rect = { x: 500, y: 128, w: 46, h: 26 };
const MANSION_RUBBLE: Oval[] = [
  { cx: 126, cy: 290, rx: 18, ry: 10 },
  { cx: 560, cy: 300, rx: 16, ry: 9 },
];
/** thảm đỏ chạy ngang sân */
const MANSION_CARPET = { y: 166, h: 46 };

interface MansionGeo { pillars: Rect[]; shelves: Rect[]; statue: Rect; table: Rect; rubble: Oval[]; carpet: { y: number; h: number } }
function mansionGeo(f: ArenaFrame): MansionGeo {
  // kệ sách rải đều dọc tường trên (2 kệ ở 640, thêm kệ khi tường dài hơn)
  const n = Math.max(2, Math.round((f.W - 120) / 260));
  const sw = MANSION_SHELVES[0].w;
  const x0 = MANSION_SHELVES[0].x;
  const x1 = f.W - (640 - MANSION_SHELVES[1].x);
  const shelves = Array.from({ length: n }, (_, i) => ({ x: Math.round(x0 + ((x1 - x0) * i) / (n - 1)), y: MANSION_SHELVES[0].y, w: sw, h: MANSION_SHELVES[0].h }));
  const cy0 = Math.round(f.y(MANSION_CARPET.y));
  return {
    pillars: MANSION_PILLARS.map((r) => f.obj(r)),
    shelves,
    statue: f.obj(MANSION_STATUE),
    table: f.obj(MANSION_TABLE),
    rubble: MANSION_RUBBLE.map((o) => ovalAt(f, o)),
    carpet: { y: cy0, h: Math.round(f.y(MANSION_CARPET.y + MANSION_CARPET.h)) - cy0 },
  };
}

function drawMansion(p: ArenaPainter, f: ArenaFrame, g: MansionGeo) {
  const { W, H } = p;
  const X = f.x;
  const Y = f.y;
  // sàn gỗ ghép so le, có mảng cháy sém
  fill(p, (x, y) => {
    const row = Math.floor(y / 8);
    const off = (row % 2) * 16;
    const plank = Math.floor((x + off) / 32);
    const lx = (x + off) % 32;
    const ly = y % 8;
    const tone = ((plank * 7 + row * 3) % 5) * 5;
    let c: RGB = [128 + tone, 86 + tone * 0.7, 56 + tone * 0.4];
    if (ly === 7) c = [74, 48, 32];
    else if (lx === 0) c = [92, 60, 38];
    else if (ly === 0) c = shade(c, 1.1);
    if ((x * 13 + y * 7) % 41 === 0) c = shade(c, 0.8); // vân gỗ
    const burnt = p.noise(x / 26 + 11, y / 26 + 5);
    if (burnt > 0.72) c = mix(c, [40, 28, 24], Math.min(0.6, (burnt - 0.72) * 3.5));
    return c;
  });

  // thảm đỏ viền vàng, hoa văn hình thoi, đầu thảm cháy rách
  {
    const t = g.carpet;
    for (let y = t.y; y < t.y + t.h; y++) for (let x = 40; x < W - 40; x++) {
      const ragged = x < 70 ? (x - 40) * 1.6 + p.noise(x / 3, y / 3) * 10 : x > W - 70 ? (W - 40 - x) * 1.6 + p.noise(x / 3, y / 3) * 10 : 99;
      if (ragged < 20) {
        if (ragged > 15) p.set(x, y, [40, 24, 20]);
        continue;
      }
      const dy = Math.min(y - t.y, t.y + t.h - 1 - y);
      let c: RGB = [140, 34, 40];
      if (dy < 2) c = [92, 22, 26];
      else if (dy < 5) c = [214, 172, 76];
      else {
        const mx = (x % 24) - 12;
        const my = y - (t.y + t.h / 2);
        if (Math.abs(mx) + Math.abs(my) === 9) c = [196, 150, 64];
        else if (Math.abs(mx) + Math.abs(my) < 3) c = [176, 56, 56];
      }
      const burnt = p.noise(x / 18 + 3, y / 18 + 9);
      if (burnt > 0.74) c = mix(c, [44, 20, 20], Math.min(0.6, (burnt - 0.74) * 3.5));
      p.set(x, y, c);
    }
  }

  // vệt cháy, tro, than hồng, giấy nhật ký rơi vãi
  const burns = [[180, 110, 20], [452, 230, 24], [330, 300, 18], [560, 210, 14], [96, 168, 14]];
  if (W >= 800) burns.push([250, 200, 16], [520, 80, 16]);
  for (const [dx, dy, r] of burns) {
    const cx = Math.round(X(dx));
    const cy = Math.round(Y(dy));
    for (let y = cy - r; y <= cy + r; y++) for (let x = cx - r; x <= cx + r; x++) {
      const d = Math.hypot(x - cx, (y - cy) * 1.3) / r + (p.noise(x / 5, y / 5) - 0.5) * 0.5;
      if (d < 1) p.set(x, y, [24, 18, 18], 0.65 * (1 - d * 0.6));
    }
    for (let k = 0; k < 5; k++) p.set(cx + (p.rng() - 0.5) * r, cy + (p.rng() - 0.5) * r, p.rng() < 0.5 ? [255, 140, 50] : [255, 210, 90]);
  }
  const papers = [[210, 240, 0], [430, 120, 1], [150, 70, 1], [600, 250, 0], [360, 228, 0]];
  if (W >= 800) papers.push([290, 60, 0], [480, 290, 1], [70, 230, 1]);
  for (const [dx, dy, rot] of papers) {
    const x = Math.round(X(dx));
    const y = Math.round(Y(dy));
    const w = rot ? 6 : 8;
    const h = rot ? 8 : 6;
    p.rect(x, y, w, h, [236, 228, 204]);
    p.rect(x, y + h, w, 1, [150, 140, 120]);
    for (let k = 1; k < h - 1; k += 2) p.rect(x + 1, y + k, w - 2, 1, [150, 150, 170]);
  }

  // kệ sách sát tường trên
  for (const s of g.shelves) {
    p.rect(s.x + 3, s.y + s.h, s.w, 4, [0, 0, 0], 0.3);
    p.rect(s.x, s.y, s.w, s.h, [86, 52, 30]);
    p.rect(s.x, s.y, s.w, 2, [124, 80, 48]);
    for (const sy of [s.y + 3, s.y + 12]) {
      p.rect(s.x + 2, sy, s.w - 4, 8, [44, 28, 18]);
      let bx = s.x + 3;
      while (bx < s.x + s.w - 4) {
        const bw = 2 + Math.floor(p.rng() * 3);
        const bh = 5 + Math.floor(p.rng() * 3);
        const col: RGB = [[150, 40, 40], [50, 90, 140], [60, 110, 60], [190, 160, 80], [110, 60, 120]][Math.floor(p.rng() * 5)] as RGB;
        if (p.rng() > 0.15) p.rect(bx, sy + 8 - bh, bw, bh, p.rng() > 0.8 ? shade(col, 0.4) : col);
        bx += bw + 1;
      }
    }
  }

  // cột đá cẩm thạch nhìn từ trên: đế vuông vát cạnh, thân tròn có rãnh, vài cột gãy lộ lõi
  g.pillars.forEach((c, i) => {
    p.rect(c.x + 3, c.y + 4, c.w, c.h, [0, 0, 0], 0.3);
    p.rect(c.x, c.y, c.w, c.h, [112, 106, 104]);
    p.rect(c.x + 1, c.y + 1, c.w - 2, c.h - 2, [168, 162, 158]);
    p.rect(c.x + 1, c.y + 1, c.w - 2, 2, [200, 194, 190]);
    p.rect(c.x + 1, c.y + c.h - 3, c.w - 2, 2, [132, 126, 122]);
    const cx = c.x + c.w / 2 - 0.5;
    const cy = c.y + c.h / 2 - 0.5;
    p.disc(cx, cy, 8.5, [130, 124, 120]);
    p.disc(cx, cy, 7.5, [214, 208, 202]);
    for (let a = 0; a < 12; a++) {
      const ang = (a / 12) * Math.PI * 2;
      p.set(cx + Math.cos(ang) * 6, cy + Math.sin(ang) * 6, [178, 172, 168]);
    }
    p.disc(cx - 2, cy - 2, 3, [240, 236, 232]);
    if (i === 1 || i === 2) {
      // cột gãy: mặt cắt lởm chởm, lõi tối, mảnh vụn rơi cạnh chân
      p.disc(cx + 1, cy + 1, 4, [92, 86, 84]);
      for (let k = -5; k <= 5; k++) p.set(cx + k, cy + 1 + Math.round(Math.sin(k * 1.9) * 1.5), [120, 114, 110]);
      p.rect(c.x + c.w + 1, c.y + c.h - 5, 4, 3, [190, 184, 178]);
      p.rect(c.x - 4, c.y + 3, 3, 2, [170, 164, 160]);
    }
  });

  // tượng đá Pokémon trên bệ (vật cản giữa sân trên)
  {
    const s = g.statue;
    const cx = s.x + s.w / 2;
    p.rect(s.x + 3, s.y + 5, s.w, s.h, [0, 0, 0], 0.3);
    p.rect(s.x, s.y + 14, s.w, s.h - 14, [110, 104, 108]);
    p.rect(s.x + 1, s.y + 15, s.w - 2, 2, [150, 144, 148]);
    p.rect(s.x + 3, s.y + 20, s.w - 6, 4, [86, 80, 84]);
    // thân tượng: đầu tròn, tai, đuôi xoắn
    p.disc(cx, s.y + 8, 7, [176, 172, 180]);
    p.disc(cx - 2, s.y + 6, 3, [208, 204, 212]);
    p.rect(cx - 6, s.y, 3, 4, [160, 156, 164]);
    p.rect(cx + 3, s.y, 3, 4, [160, 156, 164]);
    for (let t = 0; t < 10; t++) p.set(cx + 7 + Math.sin(t / 2) * 2, s.y + 12 - t, [150, 146, 154]);
    p.set(cx - 2, s.y + 8, [60, 56, 64]);
    p.set(cx + 2, s.y + 8, [60, 56, 64]);
  }

  // bàn lật nghiêng, chân bàn chổng lên
  {
    const t = g.table;
    p.rect(t.x + 3, t.y + 4, t.w, t.h, [0, 0, 0], 0.3);
    p.rect(t.x, t.y, t.w, t.h, [104, 66, 38]);
    p.rect(t.x + 2, t.y + 2, t.w - 4, t.h - 4, [138, 90, 54]);
    for (let k = 0; k < t.w - 6; k += 7) p.rect(t.x + 3 + k, t.y + 3, 1, t.h - 6, [118, 76, 44]);
    for (const [lx, ly] of [[t.x + 4, t.y + 4], [t.x + t.w - 8, t.y + 4], [t.x + 4, t.y + t.h - 8], [t.x + t.w - 8, t.y + t.h - 8]]) {
      p.rect(lx, ly, 4, 4, [70, 44, 26]);
      p.rect(lx + 1, ly + 1, 2, 2, [160, 110, 66]);
    }
  }

  for (const r of g.rubble) {
    dropShadow(p, r.cx + 2, r.cy + 4, r.rx + 2, r.ry * 0.7, 0.3);
    for (let k = 0; k < 8; k++) {
      const a = (k / 8) * Math.PI * 2 + p.rng();
      const d = 0.25 + p.rng() * 0.45;
      boulder(p, r.cx + Math.cos(a) * r.rx * d, r.cy + Math.sin(a) * r.ry * d, 6 + p.rng() * 3, 4 + p.rng() * 2, k % 3 ? [140, 130, 126] : [104, 70, 46]);
    }
    boulder(p, r.cx, r.cy - 1, 8, 5, [150, 140, 134]);
    // thanh gỗ cháy gác ngang đống đổ nát
    for (let k = -r.rx; k < r.rx; k++) p.set(r.cx + k, r.cy - 2 + Math.round(k * 0.25), k % 4 ? [70, 44, 28] : [255, 120, 40]);
  }

  // tường gạch xám, giấy dán tường sẫm, nẹp gỗ sát sàn, vệt khói cháy
  wall(p, (x, y, e) => {
    const brickRow = Math.floor(y / 6);
    const lx = (x + (brickRow % 2) * 6) % 12;
    let c: RGB = (x * 3 + brickRow * 5) % 7 === 0 ? [88, 72, 78] : [104, 86, 92];
    if (y % 6 === 5 || lx === 0) c = [58, 46, 52];
    if (e >= WALL - 5) c = e >= WALL - 2 ? [176, 132, 70] : [116, 76, 44];
    const soot = p.noise(x / 12 + 21, y / 12);
    if (soot > 0.62) c = mix(c, [20, 16, 16], Math.min(0.75, (soot - 0.62) * 3));
    return c;
  });
  // chân nến đổ ở 4 góc
  for (const [cx, cy] of [[34, 34], [W - 34, 34], [34, H - 34], [W - 34, H - 34]]) {
    dropShadow(p, cx + 2, cy + 4, 9, 5, 0.3);
    p.disc(cx, cy, 7, [150, 116, 50]);
    p.disc(cx, cy, 4, [214, 176, 84]);
    p.disc(cx, cy - 1, 2, [255, 160, 60]);
    p.set(cx, cy - 3, [255, 236, 140]);
  }
}

// ======================================================================= 4. Hội quán Cinnabar

/** miệng núi lửa phun lửa: 3 nhóm theo cột, phun lần lượt trái → phải */
const CINNABAR_VENTS = (() => {
  const out: (Rect & { group: number })[] = [];
  [220, 320, 420].forEach((cx, col) => {
    for (const cy of [104, 256]) out.push({ x: cx - 28, y: cy - 28, w: 56, h: 56, group: col });
  });
  out.push({ x: 320 - 28, y: 180 - 28, w: 56, h: 56, group: 1 });
  return out;
})();
/** chậu than đá lửa (trên, dưới) */
const CINNABAR_BRAZIERS: Rect[] = [
  { x: 302, y: 30, w: 36, h: 24 },
  { x: 302, y: 306, w: 36, h: 24 },
];
/** hố dung nham 4 góc */
const CINNABAR_LAVA: Rect[] = [
  { x: 126, y: 54, w: 48, h: 28 },
  { x: 466, y: 54, w: 48, h: 28 },
  { x: 126, y: 278, w: 48, h: 28 },
  { x: 466, y: 278, w: 48, h: 28 },
];

function lavaPixel(p: ArenaPainter, x: number, y: number): RGB {
  const n = p.noise(x / 7, y / 7);
  return n > 0.62 ? [255, 214, 96] : n > 0.45 ? [255, 140, 40] : [214, 70, 24];
}

interface CinnabarGeo { vents: (Rect & { group: number })[]; braziers: Rect[]; lava: Rect[]; path: Rect }
function cinnabarGeo(f: ArenaFrame): CinnabarGeo {
  return {
    vents: CINNABAR_VENTS.map((v) => f.obj(v)),
    braziers: CINNABAR_BRAZIERS.map((r) => f.obj(r)),
    lava: CINNABAR_LAVA.map((r) => f.obj(r)),
    // lối đá lát nối hai vòng xuất phát (canh theo startL/startR)
    path: { x: 60, y: f.startL.y - 18, w: f.W - 120, h: 36 },
  };
}

function drawCinnabarGym(p: ArenaPainter, f: ArenaFrame, g: CinnabarGeo) {
  const { W, H } = p;
  // sàn đá bazan 20px, mạch vữa tối, vết nứt dung nham phát sáng
  fill(p, (x, y) => {
    const tx = Math.floor(x / 20);
    const ty = Math.floor(y / 20);
    const lx = x % 20;
    const ly = y % 20;
    const tone = ((tx * 5 + ty * 3) % 4) * 4;
    let c: RGB = [62 + tone, 50 + tone, 54 + tone];
    if (lx === 19 || ly === 19) c = [32, 26, 30];
    else if (lx === 0 || ly === 0) c = [84 + tone, 70 + tone, 72 + tone];
    else if (p.noise(x / 3, y / 3) > 0.78) c = shade(c, 0.85);
    return c;
  });
  for (let k = 0, n = density(p, 26); k < n; k++) {
    let cx = 40 + p.rng() * (W - 80);
    let cy = 40 + p.rng() * (H - 80);
    const dir = p.rng() * Math.PI * 2;
    for (let t = 0; t < 26; t++) {
      cx += Math.cos(dir + (p.rng() - 0.5) * 1.4);
      cy += Math.sin(dir + (p.rng() - 0.5) * 1.4);
      p.set(cx, cy, t % 4 === 0 ? [255, 200, 90] : [230, 96, 30]);
      p.set(cx + 1, cy, [120, 40, 20], 0.5);
    }
  }

  // lối đi chính giữa hai vòng xuất phát: đá lát sáng màu
  const pa = g.path;
  for (let y = pa.y; y < pa.y + pa.h; y++) for (let x = pa.x; x < pa.x + pa.w; x++) {
    const lx = x % 18;
    let c: RGB = (Math.floor(x / 18) % 2) ? [112, 96, 92] : [124, 108, 102];
    if (lx === 0 || y === pa.y || y === pa.y + pa.h - 1) c = [70, 58, 58];
    p.set(x, y, c, 0.9);
  }

  // hố dung nham (vật cản): viền đá, dung nham sủi bọt
  for (const r of g.lava) {
    const outer = { x: r.x - 4, y: r.y - 4, w: r.w + 8, h: r.h + 8 };
    for (let y = outer.y; y < outer.y + outer.h; y++) for (let x = outer.x; x < outer.x + outer.w; x++) {
      if (!inRound(x, y, outer, 10)) continue;
      if (!inRound(x, y, r, 8)) {
        p.set(x, y, (x + y) % 3 ? [52, 40, 40] : [84, 66, 62]);
        continue;
      }
      p.set(x, y, rectDepth(x, y, r) < 2 ? [150, 40, 20] : lavaPixel(p, x, y));
    }
    for (let k = 0; k < 4; k++) {
      const bx = r.x + 8 + p.rng() * (r.w - 16);
      const by = r.y + 6 + p.rng() * (r.h - 12);
      p.disc(bx, by, 2, [255, 236, 150]);
      p.set(bx - 1, by - 1, [255, 255, 220]);
    }
  }

  // miệng núi lửa: gò đá, lòng tối, tâm magma; số chấm trên vành = nhóm phun
  for (const v of g.vents) {
    const cx = v.x + v.w / 2;
    const cy = v.y + v.h / 2;
    // ô bẫy: nền ám nhiệt đỏ sẫm, khung sắt tán đinh đúng mép vùng phun
    for (let y = v.y; y < v.y + v.h; y++) for (let x = v.x; x < v.x + v.w; x++) {
      const d = Math.hypot(x - cx, y - cy);
      p.set(x, y, [120, 40, 24], 0.18 + 0.22 * Math.max(0, 1 - d / 34));
      const e = rectDepth(x, y, v);
      if (e < 3) p.set(x, y, e === 1 ? [150, 92, 64] : [44, 34, 34]);
    }
    for (const [rx, ry] of [[v.x + 1, v.y + 1], [v.x + v.w - 2, v.y + 1], [v.x + 1, v.y + v.h - 2], [v.x + v.w - 2, v.y + v.h - 2]]) {
      p.disc(rx, ry, 2, [70, 60, 60]);
      p.set(rx - 1, ry - 1, [200, 180, 170]);
    }
    for (let y = v.y; y < v.y + v.h; y++) for (let x = v.x; x < v.x + v.w; x++) {
      const d = Math.hypot(x - cx, (y - cy) * 1.15);
      if (d > 22) continue;
      let c: RGB;
      if (d > 17) c = (x - cx) + (y - cy) < 0 ? [118, 94, 86] : [70, 54, 52];
      else if (d > 13) c = [40, 28, 28];
      else if (d > 8) c = [120, 34, 20];
      else c = lavaPixel(p, x, y);
      p.set(x, y, c);
    }
    p.disc(cx - 2, cy - 2, 2, [255, 244, 180]);
    for (let k = 0; k <= v.group; k++) p.disc(cx - v.group * 4 + k * 8, cy - 19, 1.5, [255, 210, 90]);
  }

  // chậu than: bệ đá, lửa ba tầng
  for (const b of g.braziers) {
    p.rect(b.x + 3, b.y + 4, b.w, b.h, [0, 0, 0], 0.3);
    p.rect(b.x, b.y + 6, b.w, b.h - 6, [92, 76, 72]);
    p.rect(b.x, b.y + 6, b.w, 2, [140, 120, 112]);
    p.rect(b.x + 2, b.y + b.h - 3, b.w - 4, 3, [58, 46, 44]);
    p.rect(b.x + 3, b.y + 2, b.w - 6, 6, [50, 36, 34]);
    const cx = b.x + b.w / 2;
    for (const [dx, h, c] of [[-8, 9, [214, 70, 24]], [8, 9, [214, 70, 24]], [-3, 14, [255, 140, 40]], [3, 12, [255, 140, 40]], [0, 9, [255, 220, 110]]] as [number, number, RGB][]) {
      for (let t = 0; t < h; t++) {
        const half = Math.max(0, Math.round((1 - t / h) * 3));
        for (let k = -half; k <= half; k++) p.set(cx + dx + k, b.y + 4 - t, c);
      }
    }
  }

  startRing(p, f.startL.x, f.startL.y, [255, 140, 40]);
  startRing(p, f.startR.x, f.startR.y, [255, 140, 40]);

  // tường đá núi lửa, dung nham nhỏ giọt, nẹp phát sáng
  wall(p, (x, y, e) => {
    const n = p.noise(x / 7, y / 7);
    let c: RGB = n > 0.6 ? [70, 56, 58] : n < 0.35 ? [36, 28, 32] : [52, 42, 46];
    const vein = p.noise(x / 16 + 20, y / 16 + 20);
    if (vein > 0.49 && vein < 0.515) c = [230, 96, 30];
    if (e < 3) c = shade(c, 0.7);
    if (e >= WALL - 3) c = e === WALL - 1 ? [255, 168, 70] : [170, 60, 24];
    return c;
  });
  for (const [cx, cy] of [[34, 34], [W - 34, 34], [34, H - 34], [W - 34, H - 34]]) {
    p.disc(cx + 2, cy + 3, 13, [0, 0, 0], 0.3);
    p.disc(cx, cy, 13, [76, 62, 62]);
    p.disc(cx, cy, 9, [40, 28, 28]);
    p.disc(cx, cy, 6, [255, 140, 40]);
    p.disc(cx - 1, cy - 1, 3, [255, 220, 110]);
  }
}

// ======================================================================= xuất sân

export const ARENAS: Record<string, ArenaDef> = {
  'sea-route': (f) => {
    const g = seaGeo(f);
    return {
      draw: (p) => drawSeaRoute(p, f, g),
      layout: {
        inset: INSET,
        solids: [...g.rocks.map(ovalSolid), { x: g.boat.x + 4, y: g.boat.y + 3, w: g.boat.w - 8, h: g.boat.h - 6 }],
        slowZones: g.pools.map((r) => ({ x: r.x + 4, y: r.y + 4, w: r.w - 8, h: r.h - 8 })),
        // gió biển giật ngang
        hazards: [{ kind: 'wind', periodMs: 5600, warnMs: 1100, force: 150 }],
      },
    };
  },
  seafoam: (f) => {
    const g = seafoamGeo(f);
    return {
      draw: (p) => drawSeafoam(p, g),
      layout: {
        inset: INSET,
        solids: [...g.crystals.map((c) => ({ x: c.x + 2, y: c.y + 4, w: c.w - 4, h: c.h - 4 })), ...g.drifts.map(ovalSolid)],
        slowZones: [{ x: g.pool.x + 3, y: g.pool.y + 3, w: g.pool.w - 6, h: g.pool.h - 6 }],
        hazards: [{ kind: 'ice', areas: g.ice }],
      },
    };
  },
  mansion: (f) => {
    const g = mansionGeo(f);
    return {
      draw: (p) => drawMansion(p, f, g),
      layout: {
        inset: INSET,
        solids: [...g.pillars, ...g.shelves, g.statue, g.table, ...g.rubble.map(ovalSolid)],
        // trần cháy sập: mảnh vỡ bốc lửa rơi xuống
        hazards: [{ kind: 'rain', count: 3, radius: 22, periodMs: 3200, warnMs: 900, fx: 'flame', color: 0xff7a30, damagePct: 0.1, type: 'fire', immuneTypes: ['fire'] }],
      },
    };
  },
  'gym-cinnabar': (f) => {
    const g = cinnabarGeo(f);
    return {
      draw: (p) => drawCinnabarGym(p, f, g),
      layout: {
        inset: INSET,
        solids: [...g.braziers, ...g.lava],
        hazards: [{
          kind: 'pulse', areas: g.vents, periodMs: 2800, warnMs: 1000, fx: 'flame', color: 0xff7a30,
          damagePct: 0.06, type: 'fire', immuneTypes: ['fire'],
        }],
      },
    };
  },
};
