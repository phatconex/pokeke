// Nền đấu trường pixel (W×H theo loại trận — xem arenaSize trong config/balance.ts, hiển thị x2) theo từng biome
// của ải, và sàn đấu hội quán. Toạ độ thiết kế cũ (640×360) đi qua ArenaFrame (makeFrame) để giãn theo sân thật.
import type Phaser from 'phaser';
import { ARENA_DEFS, ArenaFrame, ArenaPainter, BaseBiome, makeFrame } from './chapters';
import type { ArenaLayout, Rect } from '../data/hazards';
import type { RGB } from './chapters';

/** biome của ải: 6 nền có sẵn, 3 hội quán chương 1–3, hoặc key sân tự vẽ trong art/chapters (ARENA_DEFS) */
export type ArenaBiome = BaseBiome | 'gym-pewter' | 'gym-cerulean' | 'gym-vermilion' | (string & {});

const hex = (c: number): RGB => [(c >> 16) & 255, (c >> 8) & 255, c & 255];

function rng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

function noise2(seed: number) {
  const r = rng(seed);
  const N = 128;
  const t = new Float32Array(N * N);
  for (let i = 0; i < t.length; i++) t[i] = r();
  const at = (x: number, y: number) => t[(y & (N - 1)) * N + (x & (N - 1))];
  const sm = (v: number) => v * v * (3 - 2 * v);
  return (x: number, y: number) => {
    const x0 = Math.floor(x);
    const y0 = Math.floor(y);
    const fx = sm(x - x0);
    const fy = sm(y - y0);
    const a = at(x0, y0) + (at(x0 + 1, y0) - at(x0, y0)) * fx;
    const b = at(x0, y0 + 1) + (at(x0 + 1, y0 + 1) - at(x0, y0 + 1)) * fx;
    return a + (b - a) * fy;
  };
}

interface Theme {
  floor: number[];
  speck: number[];
  edge: 'trees' | 'rocks' | 'water' | 'lava' | 'snowbank' | 'blossom';
}

const THEMES: Record<BaseBiome, Theme> = {
  forest: { floor: [0x5fae47, 0x56a440, 0x67b84e], speck: [0x7cc45a, 0x3f8f3a, 0xf4e04d, 0xffffff], edge: 'trees' },
  cave: { floor: [0x5a4a40, 0x52443a, 0x625246], speck: [0x3e322a, 0x74624e, 0x8a7a68], edge: 'rocks' },
  beach: { floor: [0xe8d49a, 0xe0ca8c, 0xf0dca8], speck: [0xc8b07a, 0xfff0c8, 0xf08a8a], edge: 'water' },
  volcano: { floor: [0x4a4044, 0x423a3e, 0x52484c], speck: [0x2e282c, 0x6a5c60, 0xff7a30], edge: 'lava' },
  snow: { floor: [0xeef2f8, 0xe4eaf4, 0xf6f8fc], speck: [0xc8d4e8, 0xb0c0dc, 0xffffff], edge: 'snowbank' },
  blossom: { floor: [0x6cb84e, 0x62ae46, 0x78c258], speck: [0xf0a0d0, 0xc890f0, 0xffffff, 0x9ad070], edge: 'blossom' },
};

/** Vẽ sân vào bộ đệm RGBA W×H (không cần Phaser — dùng được cả ngoài trình duyệt) */
export function paintArena(biome: ArenaBiome, W: number, H: number, seed = 3): Uint8ClampedArray {
  const buf = new Uint8ClampedArray(W * H * 4);
  const f = makeFrame(W, H);
  const r = rng(seed);
  const n = noise2(seed + 9);
  const set = (x: number, y: number, c: RGB, a = 1) => {
    x = Math.round(x);
    y = Math.round(y);
    if (x < 0 || y < 0 || x >= W || y >= H) return;
    const i = (y * W + x) * 4;
    buf[i] = a >= 1 ? c[0] : buf[i] * (1 - a) + c[0] * a;
    buf[i + 1] = a >= 1 ? c[1] : buf[i + 1] * (1 - a) + c[1] * a;
    buf[i + 2] = a >= 1 ? c[2] : buf[i + 2] * (1 - a) + c[2] * a;
    buf[i + 3] = 255;
  };
  const disc = (cx: number, cy: number, rad: number, c: RGB, a = 1) => {
    for (let y = Math.floor(cy - rad); y <= cy + rad; y++) for (let x = Math.floor(cx - rad); x <= cx + rad; x++) if ((x - cx) ** 2 + (y - cy) ** 2 <= rad * rad) set(x, y, c, a);
  };
  const rect = (x: number, y: number, w: number, h: number, c: RGB, a = 1) => {
    for (let yy = Math.floor(y); yy < y + h; yy++) for (let xx = Math.floor(x); xx < x + w; xx++) set(xx, yy, c, a);
  };
  const painter: ArenaPainter = { W, H, set, disc, rect, hex, rng: r, noise: n, paintBase: (b, props = true) => paintBase(b, props) };

  // sân tự vẽ của các chương sau
  const def = ARENA_DEFS[biome];
  if (def) {
    def(f).draw(painter);
    return buf;
  }
  if (biome === 'gym-pewter') drawPewterGym(f, set, disc, r);
  else if (biome === 'gym-cerulean') drawCeruleanGym(f, set, disc);
  else if (biome === 'gym-vermilion') drawVermilionGym(f, set, disc);
  else paintBase((biome in THEMES ? biome : 'forest') as BaseBiome, true);
  return buf;

  /** nền biome có sẵn: sàn, chi tiết riêng, viền, (tùy chọn) vật cản nhỏ */
  function paintBase(biome: BaseBiome, withProps: boolean) {
  const th = THEMES[biome];
  /** mật độ rải ngẫu nhiên giữ nguyên khi sân to ra */
  const dens = (W * H) / (640 * 360);
  // ---- nền ----
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const v = n(x / 18, y / 18);
      const c = hex(th.floor[v < 0.38 ? 1 : v > 0.62 ? 2 : 0]);
      set(x, y, c);
    }
  }
  for (let i = 0; i < Math.round(1400 * dens); i++) {
    const x = r() * W;
    const y = r() * H;
    const c = hex(th.speck[Math.floor(r() * th.speck.length)]);
    if (biome === 'forest' || biome === 'blossom') {
      if (r() < 0.8) {
        set(x, y, hex(th.speck[0]));
        set(x + 1, y - 1, hex(th.speck[1]));
      } else set(x, y, c);
    } else set(x, y, c, biome === 'volcano' && c[0] === 0xff ? 0.6 : 1);
  }

  // ---- chi tiết sàn riêng từng biome ----
  if (biome === 'forest') {
    // lối mòn đất uốn lượn ngang sân, mép có cỏ lấn
    const cy0 = f.y(186);
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const center = cy0 + Math.sin(x / 70) * 34 + Math.sin(x / 23) * 4;
      const half = 15 + (n(x / 12, y / 12) - 0.5) * 8;
      const d = Math.abs(y - center);
      if (d < half) set(x, y, d > half - 2 ? hex(0x7a5a34) : (x * 7 + y * 3) % 13 === 0 ? hex(0xb08a58) : hex(0x9a7448));
    }
  } else if (biome === 'cave') {
    // vũng sáng từ trần + tinh thể
    const rx = W * (260 / 640);
    const ry = H * (150 / 360);
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const d = Math.hypot((x - W / 2) / rx, (y - H / 2) / ry);
      if (d > 0.75) set(x, y, hex(0x1e1814), Math.min(0.75, (d - 0.75) * 2));
    }
    const spots = [[180, 120], [470, 250], [300, 290], [520, 110]];
    if (W > 640) spots.push([90, 270], [590, 300]);
    for (const [dx, dy] of spots) {
      const cx = f.x(dx);
      const cy = f.y(dy);
      for (let k = 0; k < 4; k++) {
        const x0 = cx + k * 5 - 8;
        const h = 6 + ((k * 7) % 9);
        for (let yy = 0; yy < h; yy++) for (let xx = -1; xx <= 1; xx++) set(x0 + xx, cy - yy, xx < 0 ? hex(0xc8a0ff) : hex(0x8a5ad8));
        set(x0, cy - h, hex(0xffffff));
      }
      disc(cx, cy, 18, hex(0xb080ff), 0.12);
    }
  } else if (biome === 'beach') {
    // vệt cát ướt gần mép nước (mép nước bám tường trên)
    for (let x = 0; x < W; x++) for (let y = 70; y < 110; y++) {
      const edge = 92 + Math.sin(x / 24) * 6;
      if (y < edge + 14 && y > edge) set(x, y, hex(0xd0b880), 0.6);
    }
    for (let i = 0; i < Math.round(14 * dens); i++) {
      const sx = 40 + r() * (W - 80);
      const sy = 140 + r() * (H - 170);
      set(sx, sy, hex(0xf8a0a0));
      set(sx + 1, sy, hex(0xffd0c8));
    }
  } else if (biome === 'volcano') {
    // vết nứt dung nham
    for (let k = 0; k < Math.round(9 * dens); k++) {
      let x = 60 + r() * (W - 120);
      let y = 60 + r() * (H - 120);
      let a = r() * Math.PI * 2;
      for (let s = 0; s < 40; s++) {
        a += (r() - 0.5) * 0.8;
        x += Math.cos(a) * 1.5;
        y += Math.sin(a) * 1.5;
        set(x, y, hex(0xff8a20));
        set(x, y + 1, hex(0xa83a10));
        disc(x, y, 3, hex(0xff6a20), 0.06);
      }
    }
  } else if (biome === 'snow') {
    // mặt băng xanh nhạt
    const ice = [[220, 200, 60, 26], [430, 140, 46, 20]];
    if (W > 640) ice.push([140, 300, 40, 16], [540, 290, 52, 20]);
    for (const [dx, dy, rx, ry] of ice) {
      const cx = Math.round(f.x(dx));
      const cy = Math.round(f.y(dy));
      for (let y = cy - ry; y <= cy + ry; y++) for (let x = cx - rx; x <= cx + rx; x++) {
        if (((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 <= 1) set(x, y, (x + y) % 9 === 0 ? hex(0xffffff) : hex(0xb8d8f0));
      }
    }
    // dấu chân
    const fy = f.y(270);
    for (let k = 0; 120 + k * 22 < W - 120; k++) set(120 + k * 22, fy + (k % 2) * 6, hex(0xc0cce0)), set(121 + k * 22, fy + (k % 2) * 6, hex(0xc0cce0));
  } else if (biome === 'blossom') {
    for (let i = 0; i < Math.round(300 * dens); i++) set(r() * W, r() * H, hex(r() < 0.5 ? 0xf0a0d0 : 0xd8b0f8));
  }

  // ---- viền sân ----
  const edgeBand = (x: number, y: number) => Math.min(x, y, W - 1 - x, H - 1 - y);
  if (th.edge === 'water') {
    for (let y = 0; y < 100; y++) for (let x = 0; x < W; x++) {
      const edge = 92 + Math.sin(x / 24) * 6 + Math.sin(x / 7) * 1.5;
      const ripple = (y % 9 === 0 && (x + y * 3) % 23 < 7);
      if (y < edge) set(x, y, y > edge - 4 ? hex(0xffffff) : ripple ? hex(0x7ab8f8) : hex(y < 40 ? 0x2a68c0 : 0x3a80d8));
    }
    // cầu tàu
    const px = Math.round(f.x(534)) - 14;
    for (let y = 20; y < 100; y++) for (let x = px; x < px + 28; x++) set(x, y, (y % 6 === 0) ? hex(0x5a3a1a) : hex(0x9a6a3a));
  }
  const canopy = (cx: number, cy: number, rad: number, colors: number[]) => {
    disc(cx + 2, cy + 4, rad, hex(0x0a1a0a), 0.35);
    disc(cx, cy, rad, hex(colors[0]));
    disc(cx - rad * 0.25, cy - rad * 0.25, rad * 0.7, hex(colors[1]));
    disc(cx - rad * 0.4, cy - rad * 0.45, rad * 0.35, hex(colors[2]));
  };
  if (th.edge === 'trees' || th.edge === 'blossom' || th.edge === 'snowbank' || th.edge === 'rocks' || th.edge === 'lava') {
    const ring: [number, number][] = [];
    for (let x = -10; x < W + 20; x += 26) ring.push([x + r() * 8, -4 + r() * 10], [x + r() * 8, H + 2 - r() * 10]);
    for (let y = 20; y < H - 10; y += 26) ring.push([-4 + r() * 10, y + r() * 8], [W + 2 - r() * 10, y + r() * 8]);
    for (const [cx, cy] of ring) {
      const rad = 20 + r() * 8;
      if (th.edge === 'trees') canopy(cx, cy, rad, [0x1f5a2a, 0x2f7d34, 0x56a845]);
      else if (th.edge === 'blossom') canopy(cx, cy, rad, r() < 0.5 ? [0x6a3a9a, 0x9a5ad0, 0xc890f0] : [0x1f5a2a, 0x2f7d34, 0x56a845]);
      else if (th.edge === 'snowbank') canopy(cx, cy, rad, [0xa8b8d0, 0xdce4f0, 0xffffff]);
      else if (th.edge === 'rocks') canopy(cx, cy, rad, [0x2e241e, 0x4a3c32, 0x6a5848]);
      else canopy(cx, cy, rad, [0x22181a, 0x3a2e30, 0x5a4a4c]);
    }
    if (th.edge === 'lava') {
      // dòng dung nham chảy dọc hai bên
      for (let y = 0; y < H; y++) for (const side of [0, 1]) {
        const cx = side ? W - 40 + Math.sin(y / 20) * 8 : 40 + Math.sin(y / 17) * 8;
        for (let x = cx - 7; x <= cx + 7; x++) set(x, y, Math.abs(x - cx) < 3 ? hex(0xffd040) : hex(0xf05a10));
      }
    }
  }
  // tối viền nhẹ để nhân vật nổi bật
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const e = edgeBand(x, y);
    if (e < 24 && th.edge !== 'water') set(x, y, hex(0x000000), (24 - e) / 24 * 0.25);
  }

  // ---- vật cản trong sân ----
  if (!withProps) return;
  const props = biome === 'forest' ? 'stump' : biome === 'cave' ? 'stalagmite' : biome === 'beach' ? 'rock' : biome === 'volcano' ? 'basalt' : biome === 'snow' ? 'ice' : 'bush';
  for (const [px, py] of basePropPoints(f)) {
    if (props === 'stump') {
      disc(px + 2, py + 3, 10, hex(0x000000), 0.25);
      disc(px, py, 10, hex(0x6a4424));
      disc(px, py, 7, hex(0xc89a60));
      disc(px, py, 4, hex(0xa87a48));
    } else if (props === 'stalagmite' || props === 'basalt') {
      for (let k = 0; k < 22; k++) for (let dx = -Math.floor((22 - k) / 3); dx <= Math.floor((22 - k) / 3); dx++) {
        set(px + dx, py - k, props === 'basalt' ? (dx < 0 ? hex(0x5a4e52) : hex(0x2e2629)) : (dx < 0 ? hex(0x8a7460) : hex(0x5a4838)));
      }
      disc(px, py + 2, 8, hex(0x000000), 0.25);
    } else if (props === 'ice') {
      for (let y = py - 16; y < py; y++) for (let x = px - 9; x < px + 9; x++) set(x, y, x < px - 3 ? hex(0xe8f6ff) : hex(0x9ad0f0));
      disc(px, py + 2, 9, hex(0x6080a0), 0.3);
    } else {
      disc(px + 2, py + 3, 11, hex(0x000000), 0.25);
      disc(px, py, 11, props === 'rock' ? hex(0x7a7a84) : hex(0x2f7d34));
      disc(px - 3, py - 3, 6, props === 'rock' ? hex(0xb4b4bc) : hex(0x56a845));
    }
  }

  }
}

/** Tạo texture sân (canvas) W×H trong Phaser */
export function generateArena(scene: Phaser.Scene, key: string, biome: ArenaBiome, W: number, H: number, seed = 3) {
  if (scene.textures.exists(key)) scene.textures.remove(key);
  const tex = scene.textures.createCanvas(key, W, H);
  if (!tex) return;
  const ctx = tex.getContext();
  const img = ctx.createImageData(W, H);
  img.data.set(paintArena(biome, W, H, seed));
  ctx.putImageData(img, 0, 0);
  tex.refresh();
}

type SetFn = (x: number, y: number, c: RGB, a?: number) => void;
type DiscFn = (cx: number, cy: number, rad: number, c: RGB, a?: number) => void;

/** Sàn đấu Hội quán Pewter: gạch đá, vòng biểu tượng giữa sân, tường đá, 2 cột đá lớn */
function drawPewterGym(f: ArenaFrame, set: SetFn, disc: DiscFn, r: () => number) {
  const { W, H } = f;
  const CX = W / 2;
  const CY = H / 2 + 6;
  // gạch lát 16px
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const tx = Math.floor(x / 16);
      const ty = Math.floor(y / 16);
      const lx = x % 16;
      const ly = y % 16;
      const shade = ((tx * 7 + ty * 13) % 5) / 40;
      let c: RGB = [220 - shade * 200, 208 - shade * 200, 186 - shade * 200];
      if (lx === 15 || ly === 15) c = [168, 154, 130];
      else if (lx === 0 || ly === 0) c = [236, 226, 206];
      set(x, y, c);
    }
  }
  // đường kẻ sân chữ thập + vòng tròn biểu tượng (màu đá nâu)
  const line: RGB = [140, 108, 72];
  for (let x = 24; x < W - 24; x++) for (let k = -2; k <= 2; k++) set(x, CY + k, line, Math.abs(k) === 2 ? 0.5 : 1);
  for (let y = 24; y < H - 24; y++) for (let k = -2; k <= 2; k++) set(CX + k, y, line, Math.abs(k) === 2 ? 0.5 : 1);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const d = Math.hypot(x - CX, (y - CY) * 1.15);
    if (d < 92 && d > 84) set(x, y, line);
    if (d < 80 && d > 77) set(x, y, [176, 140, 98]);
    if (d < 66) set(x, y, d < 62 ? [198, 170, 126] : line);
  }
  // biểu tượng tảng đá ở tâm (Huy hiệu Đá)
  for (let y = -26; y <= 26; y++) for (let x = -30; x <= 30; x++) {
    const inside = Math.abs(x) + Math.abs(y) * 1.2 < 32 && Math.abs(y) < 22;
    if (!inside) continue;
    const c: RGB = x + y < -10 ? [190, 190, 200] : x + y > 12 ? [110, 110, 122] : [150, 150, 162];
    set(CX + x, CY + y, c);
  }
  for (let k = -20; k <= 20; k++) set(CX + k, CY - 6 + Math.round(k * 0.3), [90, 90, 100]);
  // vòng xuất phát hai đội
  for (const sx of [f.startL.x, f.startR.x]) {
    for (let y = 0; y < H; y++) for (let x = sx - 40; x < sx + 40; x++) {
      const d = Math.hypot(x - sx, (y - CY) * 1.6);
      if (d < 34 && d > 31) set(x, y, [150, 120, 84]);
      if (d < 30) set(x, y, [120, 170, 150], 0.25);
    }
  }
  // tường đá viền sân
  const wall = 22;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const e = Math.min(x, y, W - 1 - x, H - 1 - y);
    if (e >= wall) continue;
    const bx = Math.floor((x + (Math.floor(y / 10) % 2) * 12) / 24);
    const by = Math.floor(y / 10);
    const v = ((bx * 31 + by * 17) % 7) / 7;
    let c: RGB = [110 + v * 30, 96 + v * 26, 80 + v * 20];
    if ((x + (Math.floor(y / 10) % 2) * 12) % 24 === 0 || y % 10 === 0) c = [70, 60, 50];
    if (e === wall - 1) c = [200, 180, 140];
    set(x, y, c);
  }
  // cột đá ở bốn góc (+ giữa hai cạnh dài khi sân rộng)
  const cols = [[34, 34], [W - 34, 34], [34, H - 34], [W - 34, H - 34]];
  if (W > 640) cols.push([CX - 150, 34], [CX + 150, 34], [CX - 150, H - 34], [CX + 150, H - 34]);
  for (const [px, py] of cols) {
    disc(px + 2, py + 3, 16, [0, 0, 0], 0.3);
    disc(px, py, 16, [120, 110, 100]);
    disc(px - 4, py - 4, 10, [170, 160, 148]);
  }
  // hai phiến đá lớn giữa sân (che chắn)
  for (const [s, cracked] of pewterSlabs(f).map((s, i) => [s, i === 1] as const)) {
    const px = s.x + 20;
    const top = s.y;
    for (let y = top; y < top + 86; y++) for (let x = px - 20; x < px + 20; x++) set(x + 4, y + 6, [0, 0, 0], 0.25);
    for (let y = top; y < top + 86; y++) for (let x = px - 20; x < px + 20; x++) {
      const edge = x === px - 20 || x === px + 19 || y === top || y === top + 85;
      let c: RGB = x - px + (y - top) * 0.2 < 4 ? [196, 186, 150] : [168, 158, 124];
      if (edge) c = [90, 84, 66];
      set(x, y, c);
    }
    for (let k = 0; k < 70; k += 9) set(px - 12 + (k % 18), top + 8 + k, [232, 226, 200]);
    if (cracked) {
      let cx = px - 8;
      for (let y = top + 10; y < top + 60; y++) {
        cx += (r() - 0.5) * 3;
        set(cx, y, [60, 54, 44]);
      }
    }
  }
}

/** hai phiến đá lớn giữa sân Pewter (vật cản, khớp hình vẽ) */
function pewterSlabs(f: ArenaFrame): Rect[] {
  const CX = f.W / 2;
  const CY = f.H / 2 + 6;
  return [
    { x: CX - 92 - 20, y: CY - 44, w: 40, h: 86 },
    { x: CX + 92 - 20, y: CY - 44, w: 40, h: 86 },
  ];
}

/** Cả sân Cerulean là mặt nước (trừ tường): làm chậm ai không phải hệ Nước */
export function ceruleanPool(W: number, H: number): Rect {
  const wall = 24;
  return { x: wall, y: wall, w: W - wall * 2, h: H - wall * 2 };
}

/** Các đảo gạch khô trong hồ: hai đảo xuất phát, đảo giữa, hai đảo trên/dưới và vài bậc đá nối */
export function ceruleanIslands(f: ArenaFrame): Rect[] {
  const { W, H } = f;
  const isl = (cx: number, cy: number, w: number, h: number): Rect => ({ x: Math.round(cx - w / 2), y: Math.round(cy - h / 2), w, h });
  return [
    isl(f.startL.x, f.startL.y, 104, 84),
    isl(f.startR.x, f.startR.y, 104, 84),
    isl(W * 0.5, H * 0.5, 84, 60),
    isl(W * 0.5, H * 0.17, 64, 44),
    isl(W * 0.5, H * 0.83, 64, 44),
    // bậc đá nối
    isl(W * 0.31, H * 0.5, 28, 24),
    isl(W * 0.69, H * 0.5, 28, 24),
    isl(W * 0.36, H * 0.28, 24, 22),
    isl(W * 0.64, H * 0.72, 24, 22),
  ];
}

/** Sàn Hội quán Cerulean: mặt nước phủ kín sân (làm chậm), chỉ có các đảo gạch để đứng vững */
function drawCeruleanGym(f: ArenaFrame, set: SetFn, disc: DiscFn) {
  const { W, H } = f;
  // nước: hai tông xanh, gợn sóng ngang
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const wave = Math.sin(x / 9 + y / 5) + Math.sin(x / 23 - y / 7);
      let c: RGB = wave > 1.1 ? [120, 184, 246] : wave > 0.2 ? [66, 132, 222] : [46, 108, 200];
      if ((y * 3 + Math.floor(x / 7)) % 19 === 0) c = [160, 210, 250];
      set(x, y, c);
    }
  }
  // đảo gạch: viền đá, mặt gạch trắng–xanh, bóng đổ xuống nước
  for (const R of ceruleanIslands(f)) {
    for (let y = R.y + 3; y < R.y + R.h + 6; y++) for (let x = R.x + 3; x < R.x + R.w + 3; x++) if (y >= R.y + R.h) set(x, y, [30, 80, 160], 0.45);
    for (let y = R.y - 3; y < R.y + R.h + 3; y++) for (let x = R.x - 3; x < R.x + R.w + 3; x++) set(x, y, [120, 150, 180]);
    for (let y = R.y - 1; y < R.y + R.h + 1; y++) for (let x = R.x - 1; x < R.x + R.w + 1; x++) set(x, y, [250, 252, 255]);
    for (let y = R.y; y < R.y + R.h; y++) {
      for (let x = R.x; x < R.x + R.w; x++) {
        const tx = Math.floor((x - R.x) / 14);
        const ty = Math.floor((y - R.y) / 14);
        let c: RGB = (tx + ty) % 2 === 0 ? [236, 244, 250] : [208, 226, 242];
        if ((x - R.x) % 14 === 13 || (y - R.y) % 14 === 13) c = [160, 190, 214];
        set(x, y, c);
      }
    }
  }
  // vòng xuất phát hai đội
  for (const s of [f.startL, f.startR]) {
    for (let y = 0; y < H; y++) for (let x = s.x - 40; x < s.x + 40; x++) {
      const d = Math.hypot(x - s.x, (y - s.y) * 1.6);
      if (d < 34 && d > 31) set(x, y, [90, 140, 200]);
    }
  }
  // tường men xanh
  const wall = 22;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const e = Math.min(x, y, W - 1 - x, H - 1 - y);
    if (e >= wall) continue;
    let c: RGB = (Math.floor(x / 12) + Math.floor(y / 12)) % 2 ? [60, 110, 180] : [80, 130, 200];
    if (e === wall - 1) c = [230, 240, 250];
    set(x, y, c);
  }
  for (const [px, py] of [[34, 34], [W - 34, 34], [34, H - 34], [W - 34, H - 34]]) {
    disc(px + 2, py + 3, 14, [0, 0, 0], 0.3);
    disc(px, py, 14, [240, 246, 252]);
    disc(px, py, 8, [74, 144, 232]);
  }
}

/** Hội quán Vermilion: 6 tấm sàn điện, chia 2 nhóm phóng điện luân phiên (nhóm theo ô bàn cờ) */
export function vermilionPanels(W: number, H: number) {
  const CX = W / 2;
  const CY = H / 2;
  const sx = Math.round((100 * W) / 640);
  const sy = Math.round((76 * H) / 360);
  const out: { x: number; y: number; w: number; h: number; group: number }[] = [];
  for (let c = 0; c < 3; c++) for (let r = 0; r < 2; r++) out.push({ x: Math.round(CX - sx - 44 + c * sx), y: Math.round(CY - sy / 2 - 32 + r * sy), w: 88, h: 64, group: (c + r) % 2 });
  return out;
}
/** hai máy phát điện (vật cản) trên và dưới dãy sàn điện */
function vermilionGenerators(W: number, H: number): Rect[] {
  const k = H / 360;
  return [
    { x: W / 2 - 18, y: Math.round(H / 2 - 112 * k), w: 36, h: 24 },
    { x: W / 2 - 18, y: Math.round(H / 2 + 92 * k), w: 36, h: 24 },
  ];
}

/** Sàn Hội quán Vermilion: sàn kim loại tán đinh, viền sọc vàng–đen, tấm đồng dẫn điện, máy phát */
function drawVermilionGym(f: ArenaFrame, set: SetFn, disc: DiscFn) {
  const { W, H } = f;
  const panels = vermilionPanels(W, H);
  // sàn thép 24px, đinh tán ở góc mỗi tấm
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const lx = x % 24;
      const ly = y % 24;
      const shade = ((Math.floor(x / 24) * 5 + Math.floor(y / 24) * 3) % 4) * 4;
      let c: RGB = [92 + shade, 98 + shade, 108 + shade];
      if (lx === 23 || ly === 23) c = [60, 64, 72];
      else if (lx === 0 || ly === 0) c = [128, 134, 146];
      if ((lx === 3 || lx === 20) && (ly === 3 || ly === 20)) c = [170, 176, 188];
      set(x, y, c);
    }
  }
  // dây cáp nối các tấm (vẽ trước, nằm dưới tấm)
  for (let x = panels[0].x; x < panels[panels.length - 1].x + 88; x++) for (const yy of [H / 2 - 2, H / 2 - 1]) set(x, yy, [40, 40, 44]);
  // tấm đồng dẫn điện (nhóm 0 / 1 khác sắc độ để dễ nhận ra)
  for (const p of panels) {
    for (let y = p.y; y < p.y + p.h; y++) for (let x = p.x; x < p.x + p.w; x++) {
      const edge = x === p.x || y === p.y || x === p.x + p.w - 1 || y === p.y + p.h - 1;
      const stripe = (x + y) % 12 < 2;
      let c: RGB = p.group ? [176, 112, 52] : [156, 96, 44];
      if (stripe) c = p.group ? [200, 138, 70] : [180, 120, 60];
      if (edge) c = [248, 208, 48];
      set(x, y, c);
    }
    // biểu tượng tia sét giữa tấm
    const cx = p.x + p.w / 2;
    const cy = p.y + p.h / 2;
    const bolt = [[2, -12], [1, -8], [0, -4], [-1, 0], [3, 0], [2, 4], [1, 8], [0, 12]];
    for (const [dx, dy] of bolt) for (let k = -2; k <= 2; k++) set(cx + dx + k, cy + dy, [255, 236, 120], 0.8);
  }
  // máy phát điện
  for (const g of vermilionGenerators(W, H)) {
    for (let y = g.y; y < g.y + g.h; y++) for (let x = g.x; x < g.x + g.w; x++) set(x + 3, y + 4, [0, 0, 0], 0.3);
    for (let y = g.y; y < g.y + g.h; y++) for (let x = g.x; x < g.x + g.w; x++) {
      const edge = x === g.x || y === g.y || x === g.x + g.w - 1 || y === g.y + g.h - 1;
      set(x, y, edge ? [40, 44, 52] : y < g.y + 6 ? [190, 196, 206] : [150, 156, 168]);
    }
    disc(g.x + g.w / 2, g.y + g.h / 2 + 2, 5, [248, 208, 48]);
    disc(g.x + g.w / 2, g.y + g.h / 2 + 2, 2, [255, 255, 255]);
  }
  // vòng xuất phát hai đội
  for (const s of [f.startL, f.startR]) {
    for (let y = 0; y < H; y++) for (let x = s.x - 40; x < s.x + 40; x++) {
      const d = Math.hypot(x - s.x, (y - s.y) * 1.6);
      if (d < 34 && d > 31) set(x, y, [248, 208, 48]);
    }
  }
  // tường sọc cảnh báo vàng – đen
  const wall = 22;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const e = Math.min(x, y, W - 1 - x, H - 1 - y);
    if (e >= wall) continue;
    let c: RGB = Math.floor((x + y) / 10) % 2 ? [40, 40, 44] : [240, 196, 40];
    if (e === wall - 1) c = [210, 214, 222];
    set(x, y, c);
  }
  for (const [px, py] of [[34, 34], [W - 34, 34], [34, H - 34], [W - 34, H - 34]]) {
    disc(px + 2, py + 3, 13, [0, 0, 0], 0.3);
    disc(px, py, 13, [70, 74, 84]);
    disc(px, py, 7, [248, 208, 48]);
  }
}

/** tâm các vật cản nhỏ của nền biome có sẵn (3 cái; sân rộng thêm 2) */
function basePropPoints(f: ArenaFrame): [number, number][] {
  const pts: [number, number][] = [[150, 250], [490, 210], [330, 120]];
  if (f.W > 640) pts.push([560, 96], [96, 300]);
  return pts.map(([x, y]) => [Math.round(f.x(x)), Math.round(f.y(y))]);
}

/** vật cản nhỏ của nền biome có sẵn (paintBase(..., true)) */
export function basePropSolids(f: ArenaFrame): Rect[] {
  return basePropPoints(f).map(([x, y]) => ({ x: x - 9, y: y - 7, w: 18, h: 12 }));
}

/** Vật cản, vùng làm chậm và bẫy của từng sân W×H (khớp với hình vẽ ở trên) */
export function arenaLayout(biome: ArenaBiome, W: number, H: number): ArenaLayout {
  const f = makeFrame(W, H);
  const def = ARENA_DEFS[biome];
  if (def) return def(f).layout;
  if (biome === 'gym-cerulean') {
    return {
      inset: 24,
      solids: [],
      slowZones: [ceruleanPool(W, H)],
      safeRects: ceruleanIslands(f),
      // cột nước phun từ đáy hồ: báo trước rồi bắn lên; Pokémon hệ Nước cuồng nộ thì phun dày hơn
      hazards: [{ kind: 'rain', count: 2, radius: 28, periodMs: 4600, warnMs: 800, fx: 'water', color: 0x4a90e8, damagePct: 0.05, type: 'water', immuneTypes: ['water'] }],
    };
  }
  if (biome === 'gym-vermilion') {
    return {
      inset: 24,
      solids: vermilionGenerators(W, H),
      hazards: [{
        kind: 'pulse', areas: vermilionPanels(W, H), periodMs: 2600, warnMs: 900, fx: 'lightning', color: 0xf8d030,
        damagePct: 0.1, type: 'electric', immuneTypes: ['ground'],
      }],
    };
  }
  if (biome === 'gym-pewter') {
    return {
      inset: 24,
      solids: pewterSlabs(f),
      // đá rơi từ trần hang: báo trước rồi đập xuống; thủ lĩnh nổi cuồng nộ thì dày hơn
      hazards: [{ kind: 'rain', count: 1, radius: 30, periodMs: 5200, warnMs: 800, fx: 'rock', color: 0xb8a038, damagePct: 0.05, type: 'rock', immuneTypes: ['flying'] }],
    };
  }
  // vật cản nhỏ (gốc cây / thạch nhũ / đá / băng...) ở cùng vị trí với hình vẽ
  return { inset: 26, solids: basePropSolids(f) };
}
