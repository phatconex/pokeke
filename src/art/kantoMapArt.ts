// Bản đồ Kanto v2 (pixel, 960x640, hiển thị x2 → thế giới 1920x1200, camera cuộn): bố cục theo địa lý Kanto thật.
// Biển bao phía nam + đông, đảo Cinnabar có núi lửa nhỏ, núi tuyết tây bắc (Đường Chiến Thắng / Indigo), dải đá Núi Moon,
// rừng Viridian, rừng hoa tím Lavender, rừng Safari, vài hồ; "hành lang" cỏ chạy dọc các tuyến đường nối thị trấn.
import Phaser from 'phaser';
import { distToSeg, hexToRgb, makeNoise, PAL, rng, type RGB } from './regionMapArt';

export const KMAP_W = 960;
export const KMAP_H = 640;

export interface KantoMapLayout {
  /** các tuyến đường (mỗi tuyến là một polyline tọa độ bản đồ) */
  roads: { x: number; y: number }[][];
}

const inPoly = (x: number, y: number, pts: number[][]) => {
  let c = false;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    const [xi, yi] = pts[i];
    const [xj, yj] = pts[j];
    if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) c = !c;
  }
  return c;
};

// đất liền (đường bờ có noise), đảo Cinnabar + đảo Seafoam
const LAND = [[0, 0], [960, 0], [960, 470], [900, 560], [820, 548], [720, 540], [640, 552], [560, 556], [420, 560], [300, 566], [200, 600], [130, 640], [0, 640]];
const ISLANDS = [[[714, 566], [840, 560], [846, 632], [710, 636]], [[655, 552], [706, 548], [710, 584], [656, 586]]];
const ELL = (cx: number, cy: number, rx: number, ry: number) => (x: number, y: number) => ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2;
const FOREST_VIRIDIAN = ELL(100, 380, 74, 110);
const FOREST_SAFARI = ELL(330, 425, 64, 40);
const LAVENDER = ELL(700, 360, 72, 46);
const MOON = ELL(285, 175, 110, 26);
const LAKES: [number, number, number, number][] = [[530, 255, 34, 15], [250, 300, 26, 12], [790, 425, 22, 10], [430, 445, 20, 10], [200, 520, 22, 10]];
const VOLCANO = { x: 776, y: 616, rx: 22, ry: 13 };

export function generateKantoMap(scene: Phaser.Scene, key: string, layout: KantoMapLayout, seed = 11) {
  const W = KMAP_W;
  const H = KMAP_H;
  if (scene.textures.exists(key)) scene.textures.remove(key);
  const tex = scene.textures.createCanvas(key, W, H);
  if (!tex) return;
  const ctx = tex.getContext();
  const img = ctx.createImageData(W, H);
  const buf = img.data;
  const r = rng(seed);
  const n1 = makeNoise(seed);
  const n2 = makeNoise(seed + 101);
  const n3 = makeNoise(seed + 202);
  const set = (x: number, y: number, c: RGB, a = 1) => {
    x = Math.round(x);
    y = Math.round(y);
    if (x < 0 || y < 0 || x >= W || y >= H) return;
    const i = (y * W + x) * 4;
    if (a >= 1) {
      buf[i] = c[0];
      buf[i + 1] = c[1];
      buf[i + 2] = c[2];
    } else {
      buf[i] = buf[i] * (1 - a) + c[0] * a;
      buf[i + 1] = buf[i + 1] * (1 - a) + c[1] * a;
      buf[i + 2] = buf[i + 2] * (1 - a) + c[2] * a;
    }
    buf[i + 3] = 255;
  };
  const pick = <T,>(arr: T[], v: number) => arr[Math.min(arr.length - 1, Math.floor(v * arr.length))];
  const segs: [number, number, number, number][] = [];
  for (const road of layout.roads) for (let i = 0; i < road.length - 1; i++) segs.push([road[i].x, road[i].y, road[i + 1].x, road[i + 1].y]);

  const lane = new Float32Array(W * H);
  const level = new Int8Array(W * H);
  // 0 cỏ, 1 rừng, 2 nước (hồ), 3 núi lửa, 4 núi/đá, 5 hoa tím, 6 biển, 7 cát
  const kind = new Uint8Array(W * H);
  const sea = new Float32Array(W * H);
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const i = y * W + x;
      let d = 1e9;
      for (const s of segs) d = Math.min(d, distToSeg(x, y, s[0], s[1], s[2], s[3]));
      lane[i] = d + (n3(x / 9, y / 9, 2) - 0.5) * 6;
      const jx = x + (n1(x / 30, y / 30) - 0.5) * 40;
      const jy = y + (n1(x / 30 + 9, y / 30) - 0.5) * 40;
      const land = inPoly(jx, jy, LAND) || ISLANDS.some((p) => inPoly(jx, jy, p));
      // độ cao: đông bắc cao nhất (núi tuyết Đường Chiến Thắng / Indigo), giảm dần về tây nam
      const e = (x / W) * 0.6 + (1 - y / H) * 0.8 - 0.4 + (n1(x / 60, y / 60) - 0.5) * 0.5;
      level[i] = Math.max(0, Math.min(6, Math.floor(e * 6.4)));
      let k = 0;
      const dens = n2(x / 40, y / 40, 3);
      if (dens > 0.56) k = 1;
      if (FOREST_VIRIDIAN(x, y) + (dens - 0.5) * 0.6 < 1) k = 1;
      if (FOREST_SAFARI(x, y) + (dens - 0.5) * 0.6 < 1) k = 1;
      if (level[i] >= 5) k = 4;
      if (MOON(x, y) + (n1(x / 10, y / 10) - 0.5) * 0.5 < 1) {
        k = 4;
        level[i] = Math.max(level[i], 4);
      }
      if (LAVENDER(x, y) + (dens - 0.5) * 0.5 < 1) k = 5;
      const vd = ((x - VOLCANO.x) / VOLCANO.rx) ** 2 + ((y - VOLCANO.y) / VOLCANO.ry) ** 2;
      if (vd + (n1(x / 8, y / 8) - 0.5) * 0.35 < 1) k = 3;
      for (const [lx, ly, rx, ry] of LAKES) if (((x - lx) / rx) ** 2 + ((y - ly) / ry) ** 2 + (n3(x / 10, y / 10) - 0.5) * 0.5 < 1) k = 2;
      if (!land) {
        k = 6;
        level[i] = 0;
      }
      kind[i] = k;
    }
  }
  // khoảng cách tới bờ (cho bãi cát + nước nông)
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) sea[y * W + x] = kind[y * W + x] === 6 ? 0 : 99;
  for (let pass = 0; pass < 6; pass++) {
    for (let y = 1; y < H - 1; y++) {
      for (let x = 1; x < W - 1; x++) {
        const i = y * W + x;
        sea[i] = Math.min(sea[i], sea[i - 1] + 1, sea[i + 1] + 1, sea[i - W] + 1, sea[i + W] + 1);
      }
    }
  }

  const deep = [0x2a62b8, 0x2c66bc].map(hexToRgb);
  const sand = [0xe8d8a0, 0xdccc90, 0xf0e0b0].map(hexToRgb);
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const i = y * W + x;
      const v = n3(x / 3, y / 3, 1);
      const lv = level[i];
      let c: RGB;
      switch (kind[i]) {
        case 1: c = pick(PAL.forestFloor, v); break;
        case 2: c = pick(PAL.water, v); break;
        case 3: c = pick(PAL.ash, v); break;
        case 4: c = lv >= 6 ? pick(PAL.snow, v) : lv >= 5 ? (v > 0.5 ? pick(PAL.snow, v) : pick(PAL.rock, v)) : pick(PAL.rock, v); break;
        case 5: c = pick(PAL.meadowDark, v); break;
        case 6: {
          // biển: gần bờ sáng hơn
          let near = 99;
          for (let dy = -4; dy <= 4 && near > 0; dy += 2) for (let dx = -4; dx <= 4; dx += 2) {
            const xx = x + dx;
            const yy = y + dy;
            if (xx >= 0 && yy >= 0 && xx < W && yy < H && kind[yy * W + xx] !== 6) near = Math.min(near, Math.hypot(dx, dy));
          }
          c = near < 5 ? pick(PAL.water, v) : pick(deep, v);
          break;
        }
        default: c = sea[i] <= 2 ? pick(sand, v) : lv >= 3 ? pick(PAL.cliffTop, v) : pick(PAL.meadow, v);
      }
      set(x, y, c);
    }
  }
  // vách đá giữa các bậc (trên đất liền)
  for (let y = 1; y < H - 7; y++) {
    for (let x = 0; x < W; x++) {
      const i = y * W + x;
      const below = (y + 1) * W + x;
      const bad = (k: number) => k === 2 || k === 3 || k === 6;
      if (level[i] > level[below] && !bad(kind[i]) && !bad(kind[below])) {
        const isSnow = kind[i] === 4 && level[i] >= 5;
        const hgt = 3 + level[i];
        for (let k = 1; k <= hgt && y + k < H; k++) {
          const j = (y + k) * W + x;
          if (level[j] >= level[i] || kind[j] === 6) break;
          const c = isSnow ? (k === hgt ? PAL.snowShade : pick(PAL.rock, n3(x / 2, (y + k) / 2, 1))) : k === hgt ? PAL.cliffDark : pick(PAL.cliff, n3(x / 2, (y + k) / 2, 1));
          set(x, y + k, c);
        }
        set(x, y, isSnow ? PAL.snow[0] : [0xa8, 0xd8, 0x80]);
      }
    }
  }
  // nước: bờ + gợn sóng (hồ và biển)
  for (let y = 1; y < H - 1; y++) {
    for (let x = 1; x < W - 1; x++) {
      const i = y * W + x;
      const wet = (k: number) => k === 2 || k === 6;
      if (!wet(kind[i])) {
        if (wet(kind[i - 1]) || wet(kind[i + 1]) || wet(kind[i - W]) || wet(kind[i + W])) set(x, y, PAL.shore, 0.8);
        continue;
      }
      if (n1(x / 4, y / 1.5, 1) > 0.8) set(x, y, PAL.waterLight);
      if (!wet(kind[i - W])) set(x, y, [0xff, 0xff, 0xff], 0.6);
    }
  }
  // thác nước đổ từ núi tuyết xuống
  for (const [wx, wy, len] of [[650, 90, 20], [820, 200, 22], [380, 120, 16]] as const) {
    for (let k = 0; k < len; k++) for (let dx = -2; dx <= 2; dx++) set(wx + dx, wy + k, (k + dx) % 3 === 0 ? [0xff, 0xff, 0xff] : PAL.waterLight);
    for (let dx = -5; dx <= 5; dx++) set(wx + dx, wy + len, [0xff, 0xff, 0xff], 0.7);
  }
  // núi lửa Cinnabar
  const vx = VOLCANO.x + 4;
  const vy = VOLCANO.y - 10;
  for (let y = vy - 16; y < VOLCANO.y + 22; y++) {
    for (let x = vx - 40; x < vx + 40; x++) {
      const dy = y - (vy - 14);
      const half = 6 + dy * 1.1;
      if (dy < 0 || Math.abs(x - vx) > half) continue;
      const t = (x - vx) / half;
      let c: RGB = t < -0.35 ? [0x6a, 0x5e, 0x62] : t > 0.3 ? [0x2c, 0x26, 0x2a] : [0x4a, 0x42, 0x46];
      if (Math.abs(x - vx) > half - 1.5) c = [0x22, 0x1c, 0x20];
      set(x, y, c);
    }
  }
  for (let x = -6; x <= 6; x++) for (let y = -2; y <= 2; y++) if ((x * x) / 36 + (y * y) / 4 <= 1) set(vx + x, vy - 13 + y, pick(PAL.lava, r()));
  for (const [ox, len, dir] of [[-2, 24, -0.35], [3, 28, 0.3]] as const) {
    let lx = vx + ox;
    for (let k = 0; k < len; k++) {
      lx += dir + (r() - 0.5) * 0.9;
      set(lx, vy - 12 + k, pick(PAL.lava, r()));
    }
  }
  // hành lang theo tuyến đường
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const i = y * W + x;
      const d = lane[i];
      if (kind[i] === 6 && d < 6) {
        // tuyến đường biển: gợn trắng chấm
        if ((x + y) % 7 === 0) set(x, y, [0xd8, 0xe8, 0xff], 0.8);
        continue;
      }
      if (kind[i] !== 6 && d < 10) {
        const v = n3(x / 2.5, y / 2.5, 1);
        if (kind[i] === 4 && level[i] >= 5) set(x, y, d < 7 ? pick(PAL.snow, v) : PAL.snowShade);
        else set(x, y, d < 7.5 ? pick(PAL.lane, v) : pick(PAL.meadow, v));
        kind[i] = 9;
      }
    }
  }
  // cây cối & trang trí (giống bản đồ cũ)
  type Spr = { x: number; y: number; t: number };
  const sprites: Spr[] = [];
  for (let gy = 2; gy < H; gy += 4) {
    for (let gx = 1; gx < W; gx += 4) {
      const x = gx + Math.floor(r() * 3);
      const y = gy + Math.floor(r() * 3);
      if (x >= W || y >= H) continue;
      const k = kind[y * W + x];
      const roll = r();
      if (k === 1 && roll < 0.82) sprites.push({ x, y, t: r() < 0.45 ? 1 : 0 });
      else if (k === 5 && roll < 0.75) sprites.push({ x, y, t: 3 });
      else if (k === 4 && roll < 0.2 && level[y * W + x] < 6) sprites.push({ x, y, t: 2 });
      else if (k === 0 && roll < 0.05) sprites.push({ x, y, t: r() < 0.5 ? 0 : 1 });
      else if (k === 0 && roll < 0.12) sprites.push({ x, y, t: 4 });
    }
  }
  sprites.sort((a, b) => a.y - b.y);
  const leafD = hexToRgb(0x1f5a2a);
  const leafM = hexToRgb(0x2f7d34);
  const leafL = hexToRgb(0x56a845);
  const trunk = hexToRgb(0x5a3a20);
  const shadow: RGB = [0x10, 0x30, 0x10];
  for (const s of sprites) {
    const { x, y } = s;
    if (s.t === 0) {
      for (let dx = -3; dx <= 3; dx++) set(x + dx, y + 1, shadow, 0.3);
      set(x, y, trunk);
      set(x, y - 1, trunk);
      for (let dy = -6; dy <= -1; dy++) for (let dx = -3; dx <= 3; dx++) {
        const dd = dx * dx + (dy + 3.5) ** 2;
        if (dd <= 10) set(x + dx, y + dy - 1, dd > 6 ? leafD : dx < 0 && dy < -3 ? leafL : leafM);
      }
    } else if (s.t === 1 || s.t === 2) {
      for (let dx = -2; dx <= 2; dx++) set(x + dx, y + 1, shadow, 0.3);
      set(x, y, trunk);
      for (let row = 0; row < 8; row++) {
        const half = Math.floor(((row % 4) + 1) / 1.6) + (row >= 4 ? 1 : 0);
        for (let dx = -half; dx <= half; dx++) {
          const snow = s.t === 2 && (row % 4 === 0 || dx === -half);
          set(x + dx, y - 8 + row, snow ? PAL.snow[0] : dx < 0 ? leafM : leafD);
        }
      }
    } else if (s.t === 3) {
      const p1 = hexToRgb(0x9a5ad0);
      const p2 = hexToRgb(0xc890f0);
      const p3 = hexToRgb(0x6a3a9a);
      set(x, y, trunk);
      for (let dy = -6; dy <= -1; dy++) for (let dx = -3; dx <= 3; dx++) {
        const dd = dx * dx + (dy + 3.5) ** 2;
        if (dd <= 10) set(x + dx, y + dy - 1, dd > 6 ? p3 : r() < 0.3 ? p2 : p1);
      }
    } else {
      const fc = pick([hexToRgb(0xffffff), hexToRgb(0xf4e04d), hexToRgb(0xe86a8a), hexToRgb(0xf0a040)], r());
      set(x, y, fc);
    }
  }
  ctx.putImageData(img, 0, 0);
  tex.refresh();
}
