// Vẽ bản đồ vùng kiểu "bản đồ ải" bằng pixel (640x360, hiển thị x2).
// Địa hình sinh bằng noise + bố cục cố định: đồng cỏ phía nam, rừng & vách đá ở giữa,
// núi lửa, rừng hoa tím phía đông, núi tuyết phía bắc. Các "hành lang" cỏ chạy theo đường đi.
import Phaser from 'phaser';

export const MAP_W = 640;
export const MAP_H = 360;

type RGB = [number, number, number];

function hexToRgb(c: number): RGB {
  return [(c >> 16) & 255, (c >> 8) & 255, c & 255];
}

function rng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

/** value noise 2D có nội suy mượt */
function makeNoise(seed: number) {
  const r = rng(seed);
  const size = 256;
  const perm = new Float32Array(size * size);
  for (let i = 0; i < perm.length; i++) perm[i] = r();
  const at = (x: number, y: number) => perm[((y & (size - 1)) * size) + (x & (size - 1))];
  const smooth = (t: number) => t * t * (3 - 2 * t);
  const noise = (x: number, y: number) => {
    const x0 = Math.floor(x);
    const y0 = Math.floor(y);
    const fx = smooth(x - x0);
    const fy = smooth(y - y0);
    const a = at(x0, y0) + (at(x0 + 1, y0) - at(x0, y0)) * fx;
    const b = at(x0, y0 + 1) + (at(x0 + 1, y0 + 1) - at(x0, y0 + 1)) * fx;
    return a + (b - a) * fy;
  };
  return (x: number, y: number, oct = 4) => {
    let v = 0;
    let amp = 1;
    let f = 1;
    let tot = 0;
    for (let i = 0; i < oct; i++) {
      v += noise(x * f, y * f) * amp;
      tot += amp;
      amp *= 0.5;
      f *= 2;
    }
    return v / tot;
  };
}

function distToSeg(px: number, py: number, ax: number, ay: number, bx: number, by: number) {
  const dx = bx - ax;
  const dy = by - ay;
  const t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy || 1)));
  return Math.hypot(px - (ax + dx * t), py - (ay + dy * t));
}

const PAL = {
  meadow: [0x7cc45a, 0x6cb84e, 0x8ad066, 0x5fae47].map(hexToRgb),
  meadowDark: [0x4f9a3e, 0x458c38].map(hexToRgb),
  forestFloor: [0x3f7f34, 0x37752f, 0x467f3a].map(hexToRgb),
  cliffTop: [0x6aa84f, 0x5e9c46].map(hexToRgb),
  cliff: [0x8a6a4a, 0x7a5c3e, 0x9a7a56].map(hexToRgb),
  cliffDark: hexToRgb(0x4e3a28),
  rock: [0x8c8c96, 0x7a7a84, 0x9c9ca6].map(hexToRgb),
  snow: [0xf4f6fa, 0xe4e8f0, 0xd6dce8].map(hexToRgb),
  snowShade: hexToRgb(0xb8c0d0),
  water: [0x3a7ad0, 0x3672c4].map(hexToRgb),
  waterLight: hexToRgb(0x6aa8ec),
  shore: hexToRgb(0xd8d0a0),
  ash: [0x4a4246, 0x3e383c, 0x564c50].map(hexToRgb),
  lava: [0xff8a20, 0xf05a10, 0xffc040].map(hexToRgb),
  lane: [0x9ad470, 0x8cca64, 0xa4dc78].map(hexToRgb),
  stair: hexToRgb(0xb89a6a),
};

export interface MapNodeDef {
  x: number;
  y: number;
}

export interface MapLayout {
  /** đường đi (polyline) để khoét hành lang cỏ */
  path: MapNodeDef[];
}

export function generateRegionMap(scene: Phaser.Scene, key: string, layout: MapLayout, seed = 7) {
  const W = MAP_W;
  const H = MAP_H;
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

  // ---------------------------------------------------------------- trường dữ liệu
  const lane = new Float32Array(W * H); // khoảng cách tới đường đi
  const level = new Int8Array(W * H); // bậc địa hình
  const kind = new Uint8Array(W * H); // 0 cỏ, 1 rừng, 2 nước, 3 núi lửa, 4 tuyết, 5 hoa tím
  const segs = layout.path;

  const lakes: [number, number, number, number][] = [
    [205, 300, 46, 22], [575, 335, 52, 20], [115, 228, 26, 14], [325, 112, 30, 16], [292, 40, 22, 14], [610, 250, 16, 30],
  ];
  const volcano = { x: 392, y: 168, rx: 78, ry: 60 };

  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const i = y * W + x;
      let d = 1e9;
      for (let s = 0; s < segs.length - 1; s++) d = Math.min(d, distToSeg(x, y, segs[s].x, segs[s].y, segs[s + 1].x, segs[s + 1].y));
      lane[i] = d + (n3(x / 9, y / 9, 2) - 0.5) * 6;

      // độ cao: phía bắc cao, thêm noise → các bậc vách đá
      const e = (1 - y / H) * 0.95 + (n1(x / 70, y / 70) - 0.5) * 0.55;
      level[i] = Math.max(0, Math.min(6, Math.floor(e * 6.2)));

      let k = 0;
      const dens = n2(x / 40, y / 40, 3);
      if (dens > 0.5 || (y > 120 && y < 280 && dens > 0.42)) k = 1;
      if (level[i] >= 5) k = 4;
      if (x > 520 && y > 130 && y < 285 && dens > 0.38) k = 5;
      const vd = ((x - volcano.x) / volcano.rx) ** 2 + ((y - volcano.y) / volcano.ry) ** 2;
      if (vd + (n1(x / 12, y / 12) - 0.5) * 0.35 < 1) k = 3;
      for (const [lx, ly, rx, ry] of lakes) {
        const ld = ((x - lx) / rx) ** 2 + ((y - ly) / ry) ** 2 + (n3(x / 10, y / 10) - 0.5) * 0.5;
        if (ld < 1) k = 2;
      }
      // sông nhỏ từ hồ giữa trái xuống hồ phía nam
      if (Math.abs(x - (150 + Math.sin(y / 14) * 10 + (y - 228) * 0.7)) < 3 && y > 230 && y < 290) k = 2;
      kind[i] = k;
    }
  }

  // ---------------------------------------------------------------- nền
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
        case 4: c = lv >= 6 ? pick(PAL.snow, v) : (v > 0.55 ? pick(PAL.snow, v) : pick(PAL.rock, v)); break;
        case 5: c = pick(PAL.meadowDark, v); break;
        default: c = lv >= 3 ? pick(PAL.cliffTop, v) : pick(PAL.meadow, v);
      }
      set(x, y, c);
    }
  }

  // ---------------------------------------------------------------- vách đá giữa các bậc
  for (let y = 1; y < H - 5; y++) {
    for (let x = 0; x < W; x++) {
      const i = y * W + x;
      const below = (y + 1) * W + x;
      if (level[i] > level[below] && kind[i] !== 2 && kind[below] !== 2 && kind[i] !== 3 && kind[below] !== 3) {
        const isSnow = kind[i] === 4;
        const hgt = 3 + level[i];
        for (let k = 1; k <= hgt && y + k < H; k++) {
          const j = (y + k) * W + x;
          if (level[j] >= level[i]) break;
          const c = isSnow ? (k === hgt ? PAL.snowShade : pick(PAL.rock, n3(x / 2, (y + k) / 2, 1))) : k === hgt ? PAL.cliffDark : pick(PAL.cliff, n3(x / 2, (y + k) / 2, 1));
          set(x, y + k, c);
        }
        set(x, y, isSnow ? PAL.snow[0] : [0xa8, 0xd8, 0x80]);
      }
    }
  }

  // ---------------------------------------------------------------- nước: bờ cát + gợn sóng
  for (let y = 1; y < H - 1; y++) {
    for (let x = 1; x < W - 1; x++) {
      const i = y * W + x;
      if (kind[i] !== 2) {
        if (kind[i - 1] === 2 || kind[i + 1] === 2 || kind[i - W] === 2 || kind[i + W] === 2) set(x, y, PAL.shore, 0.75);
        continue;
      }
      if (n1(x / 4, y / 1.5, 1) > 0.78) set(x, y, PAL.waterLight);
      if (kind[i - W] !== 2) set(x, y, PAL.waterLight, 0.8);
    }
  }
  // thác nước (đổ xuống các hồ dưới vách)
  for (const [wx, wy, len] of [[610, 205, 34], [118, 205, 18], [330, 88, 16]] as const) {
    for (let k = 0; k < len; k++) {
      for (let dx = -2; dx <= 2; dx++) set(wx + dx, wy + k, (k + dx) % 3 === 0 ? [0xff, 0xff, 0xff] : PAL.waterLight);
    }
    for (let dx = -5; dx <= 5; dx++) set(wx + dx, wy + len, [0xff, 0xff, 0xff], 0.7);
  }

  // ---------------------------------------------------------------- núi lửa
  const vx = volcano.x + 8;
  const vy = volcano.y - 22;
  for (let y = vy - 26; y < volcano.y + 46; y++) {
    for (let x = vx - 80; x < vx + 80; x++) {
      const dy = y - (vy - 24);
      const half = 9 + dy * 1.15;
      if (dy < 0 || Math.abs(x - vx) > half) continue;
      const t = (x - vx) / half; // -1 trái .. 1 phải
      const ridge = Math.sin((x - vx) * 0.55 + dy * 0.08);
      let c: RGB = t < -0.35 ? [0x6a, 0x5e, 0x62] : t > 0.3 ? [0x2c, 0x26, 0x2a] : [0x4a, 0x42, 0x46];
      if (ridge > 0.85) c = t < 0 ? [0x7a, 0x6e, 0x72] : [0x3a, 0x34, 0x38];
      if (Math.abs(x - vx) > half - 1.5) c = [0x22, 0x1c, 0x20];
      set(x, y, c);
    }
  }
  // miệng núi và dòng dung nham
  for (let x = -10; x <= 10; x++) for (let y = -3; y <= 3; y++) if (x * x / 100 + y * y / 9 <= 1) set(vx + x, vy - 22 + y, y < -1 ? PAL.lava[2] : pick(PAL.lava, r()));
  for (const [ox, len, dir] of [[-3, 46, -0.35], [4, 58, 0.3], [0, 30, 0.05]] as const) {
    let lx = vx + ox;
    for (let k = 0; k < len; k++) {
      lx += dir + (r() - 0.5) * 0.9;
      set(lx, vy - 20 + k, pick(PAL.lava, r()));
      if (k % 2 === 0) set(lx + 1, vy - 20 + k, PAL.lava[1]);
    }
  }
  // khói
  for (let k = 0; k < 30; k++) set(vx + (r() - 0.5) * 12 + k * 0.15, vy - 28 - k * 0.8, [0x9a, 0x92, 0x96], 0.5);

  // ---------------------------------------------------------------- hành lang cỏ theo đường đi
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const i = y * W + x;
      const d = lane[i];
      if (d < 10) {
        const v = n3(x / 2.5, y / 2.5, 1);
        if (kind[i] === 4 && level[i] >= 5) set(x, y, d < 7 ? pick(PAL.snow, v) : PAL.snowShade);
        else set(x, y, d < 7.5 ? pick(PAL.lane, v) : pick(PAL.meadow, v));
        kind[i] = 9; // không đặt cây
      }
    }
  }

  // ---------------------------------------------------------------- cây cối & trang trí
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
      else if (k === 4 && roll < 0.22 && level[y * W + x] < 6) sprites.push({ x, y, t: 2 });
      else if (k === 0 && roll < 0.05) sprites.push({ x, y, t: r() < 0.5 ? 0 : 1 });
      else if (k === 0 && roll < 0.12) sprites.push({ x, y, t: 4 });
      else if (k === 3 && roll < 0.05) sprites.push({ x, y, t: 5 });
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
      // cây tròn 7x8
      for (let dx = -3; dx <= 3; dx++) set(x + dx, y + 1, shadow, 0.3);
      set(x, y, trunk);
      set(x, y - 1, trunk);
      for (let dy = -6; dy <= -1; dy++) for (let dx = -3; dx <= 3; dx++) {
        const dd = dx * dx + (dy + 3.5) ** 2;
        if (dd <= 10) set(x + dx, y + dy - 1, dd > 6 ? leafD : dx < 0 && dy < -3 ? leafL : leafM);
      }
    } else if (s.t === 1 || s.t === 2) {
      // thông 5x9 (t=2: phủ tuyết)
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
      // cây hoa tím
      const p1 = hexToRgb(0x9a5ad0);
      const p2 = hexToRgb(0xc890f0);
      const p3 = hexToRgb(0x6a3a9a);
      set(x, y, trunk);
      for (let dy = -6; dy <= -1; dy++) for (let dx = -3; dx <= 3; dx++) {
        const dd = dx * dx + (dy + 3.5) ** 2;
        if (dd <= 10) set(x + dx, y + dy - 1, dd > 6 ? p3 : r() < 0.3 ? p2 : p1);
      }
    } else if (s.t === 4) {
      // hoa nhỏ trên đồng cỏ
      const fc = pick([hexToRgb(0xffffff), hexToRgb(0xf4e04d), hexToRgb(0xe86a8a), hexToRgb(0xf0a040)], r());
      set(x, y, fc);
    } else {
      // tảng đá trên tro núi lửa
      set(x, y, [0x2a, 0x24, 0x28]);
      set(x + 1, y, [0x5a, 0x50, 0x54]);
    }
  }

  ctx.putImageData(img, 0, 0);
  tex.refresh();
}
