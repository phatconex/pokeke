// Sinh bản đồ rừng (cố định theo seed) và dựng nó trong scene.
import Phaser from 'phaser';
import { GAME } from '../config/balance';
import { TILE_INDEX } from '../art/textures';

export interface ObstacleDef {
  kind: 'tree' | 'pine' | 'rock' | 'rock_big';
  x: number; // tâm đáy (chân) theo px thế giới
  y: number;
}

/** Hình chữ nhật va chạm (dùng cho đạn) */
export interface SolidRect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface ForestMap {
  tiles: number[][];
  obstacles: ObstacleDef[];
  decor: { key: string; x: number; y: number }[];
  spawn: { x: number; y: number };
  widthPx: number;
  heightPx: number;
}

/** Kích thước hitbox theo loại vật cản: chỉ gốc cây/thân đá chặn đường */
export const OBSTACLE_BODY: Record<ObstacleDef['kind'], { w: number; h: number }> = {
  tree: { w: 14, h: 10 },
  pine: { w: 10, h: 8 },
  rock: { w: 16, h: 9 },
  rock_big: { w: 26, h: 13 },
};

function rng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

export interface ArenaOptions {
  seed?: number;
  /** kích thước (ô) */
  w?: number;
  h?: number;
  /** forest: rừng cỏ; gym: sàn đấu hội quán viền đá */
  biome?: 'forest' | 'gym';
  /** số cây / đá rải bên trong */
  trees?: number;
  rocks?: number;
  /** bán kính khoảng trống quanh điểm xuất phát (ô) */
  clearTiles?: number;
}

export function generateForest(opts: ArenaOptions = {}): ForestMap {
  const W = opts.w ?? GAME.worldTilesW;
  const H = opts.h ?? GAME.worldTilesH;
  const T = GAME.tile;
  const rnd = rng(opts.seed ?? 7);
  const gym = opts.biome === 'gym';
  const wantTrees = opts.trees ?? 95;
  const wantRocks = opts.rocks ?? 45;
  const tiles: number[][] = [];
  const isPath: boolean[][] = [];

  for (let y = 0; y < H; y++) {
    tiles.push([]);
    isPath.push([]);
    for (let x = 0; x < W; x++) {
      const r = rnd();
      if (gym) {
        tiles[y].push(TILE_INDEX.arena);
        isPath[y].push(false);
        continue;
      }
      tiles[y].push(r < 0.55 ? TILE_INDEX.grassA : r < 0.8 ? TILE_INDEX.grassB : r < 0.93 ? TILE_INDEX.grassC : r < 0.975 ? TILE_INDEX.grassFlower : TILE_INDEX.grassDark);
      isPath[y].push(false);
    }
  }

  const paint = (cx: number, cy: number, r: number) => {
    for (let y = Math.floor(cy - r); y <= Math.ceil(cy + r); y++) {
      for (let x = Math.floor(cx - r); x <= Math.ceil(cx + r); x++) {
        if (x < 0 || y < 0 || x >= W || y >= H) continue;
        if ((x - cx) ** 2 + (y - cy) ** 2 <= r * r) {
          isPath[y][x] = true;
          const q = rnd();
          tiles[y][x] = q < 0.7 ? TILE_INDEX.dirtA : q < 0.92 ? TILE_INDEX.dirtB : TILE_INDEX.dirtPebble;
        }
      }
    }
  };

  // Đường đất ngang và dọc uốn lượn, giao nhau ở khoảng trống trung tâm
  const cx = Math.floor(W / 2);
  const cy = Math.floor(H / 2);
  if (!gym) {
    const amp = Math.min(1, H / 76);
    for (let x = 0; x < W; x++) paint(x, cy + (Math.sin(x / 9) * 5 + Math.sin(x / 23) * 3) * amp, 1.6);
    for (let y = 0; y < H; y++) paint(cx + (Math.sin(y / 8) * 4 + Math.cos(y / 19) * 4) * amp, y, 1.4);
    // nhánh rẽ chéo
    if (W > 60) for (let t = 0; t < 40; t++) paint(cx + 6 + t * 0.9, cy - 4 - t * 0.6 + Math.sin(t / 4), 1.2);
    paint(cx, cy, Math.min(4.5, H / 8));
  }

  const obstacles: ObstacleDef[] = [];
  const decor: { key: string; x: number; y: number }[] = [];
  const blocked = (tx: number, ty: number, pad: number) => {
    for (let y = ty - pad; y <= ty + pad; y++) {
      for (let x = tx - pad; x <= tx + pad; x++) {
        if (x < 0 || y < 0 || x >= W || y >= H) return true;
        if (isPath[y][x]) return true;
      }
    }
    return false;
  };
  const farFromOthers = (px: number, py: number, d: number) => obstacles.every((o) => (o.x - px) ** 2 + (o.y - py) ** 2 > d * d);

  // Viền cây dày (rừng) hoặc viền đá (hội quán) quanh bản đồ
  const border = (): ObstacleDef['kind'] => (gym ? 'rock_big' : rnd() < 0.5 ? 'pine' : 'tree');
  for (let x = 0; x < W * T; x += gym ? 26 : 22) {
    for (const yy of [6, H * T - 4]) {
      obstacles.push({ kind: border(), x: x + 10 + (rnd() - 0.5) * 6, y: yy + (rnd() - 0.5) * 4 });
    }
  }
  for (let y = 30; y < H * T - 20; y += 26) {
    for (const xx of [8, W * T - 8]) {
      obstacles.push({ kind: border(), x: xx + (rnd() - 0.5) * 4, y: y + (rnd() - 0.5) * 6 });
    }
  }

  // Cụm cây và đá rải rác, tránh đường đất và khu xuất phát
  const clearR = (opts.clearTiles ?? 9) * T;
  let attempts = 0;
  let trees = 0;
  let rocks = 0;
  while ((trees < wantTrees || rocks < wantRocks) && attempts < 6000) {
    attempts++;
    const tx = 3 + Math.floor(rnd() * (W - 6));
    const ty = 3 + Math.floor(rnd() * (H - 6));
    const px = tx * T + 8;
    const py = ty * T + 12;
    if ((px - cx * T) ** 2 + (py - cy * T) ** 2 < clearR * clearR) continue;
    const isTree = trees < wantTrees && (rocks >= wantRocks || rnd() < 0.68);
    if (blocked(tx, ty, isTree ? 1 : 0)) continue;
    if (!farFromOthers(px, py, isTree ? 30 : 24)) continue;
    if (isTree) {
      obstacles.push({ kind: rnd() < 0.35 ? 'pine' : 'tree', x: px, y: py });
      trees++;
    } else {
      obstacles.push({ kind: rnd() < 0.3 ? 'rock_big' : 'rock', x: px, y: py });
      rocks++;
    }
  }

  // Trang trí không va chạm
  const decorCount = gym ? 0 : Math.round((220 * W * H) / (100 * 76));
  for (let i = 0; i < decorCount; i++) {
    const tx = 2 + Math.floor(rnd() * (W - 4));
    const ty = 2 + Math.floor(rnd() * (H - 4));
    if (isPath[ty][tx]) continue;
    decor.push({ key: rnd() < 0.4 ? 'bush' : 'tallgrass', x: tx * T + rnd() * 16, y: ty * T + rnd() * 16 });
  }

  return {
    tiles,
    obstacles,
    decor,
    spawn: { x: cx * T + 8, y: cy * T + 8 },
    widthPx: W * T,
    heightPx: H * T,
  };
}

/** Dựng bản đồ: tilemap nền, vật cản (static bodies) và trang trí. */
export function buildForest(scene: Phaser.Scene, map: ForestMap) {
  const tilemap = scene.make.tilemap({ data: map.tiles, tileWidth: GAME.tile, tileHeight: GAME.tile });
  const tileset = tilemap.addTilesetImage('tiles', 'tiles', GAME.tile, GAME.tile, 0, 0);
  if (tileset) {
    tilemap.createLayer(0, tileset, 0, 0)?.setDepth(-10000);
  }

  const solids = scene.physics.add.staticGroup();
  const rects: SolidRect[] = [];
  for (const o of map.obstacles) {
    const img = scene.add.image(o.x, o.y, o.kind).setOrigin(0.5, 1);
    // chân cây/đá nằm sát đáy ảnh (trừ bóng)
    img.y += o.kind === 'tree' || o.kind === 'pine' ? 3 : 2;
    img.setDepth(o.y);
    const b = OBSTACLE_BODY[o.kind];
    const zone = scene.add.zone(o.x, o.y - b.h / 2, b.w, b.h);
    solids.add(zone);
    rects.push({ x: o.x - b.w / 2, y: o.y - b.h, w: b.w, h: b.h });
  }
  for (const d of map.decor) {
    scene.add.image(d.x, d.y, d.key).setOrigin(0.5, 1).setDepth(d.key === 'bush' ? d.y : -5000);
  }
  return { solids, rects, tilemap };
}

export function pointInRects(rects: SolidRect[], x: number, y: number): boolean {
  for (const r of rects) {
    if (x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h) return true;
  }
  return false;
}

export function circleHitsRects(rects: SolidRect[], x: number, y: number, radius: number): boolean {
  for (const r of rects) {
    const nx = Math.max(r.x, Math.min(x, r.x + r.w));
    const ny = Math.max(r.y, Math.min(y, r.y + r.h));
    if ((nx - x) ** 2 + (ny - y) ** 2 <= radius * radius) return true;
  }
  return false;
}
