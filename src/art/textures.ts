// Tạo toàn bộ texture môi trường, hiệu ứng và hình dự phòng bằng code (pixel art).
import Phaser from 'phaser';

export const TILE_INDEX = {
  grassA: 0,
  grassB: 1,
  grassC: 2,
  grassFlower: 3,
  dirtA: 4,
  dirtB: 5,
  dirtPebble: 6,
  grassDark: 7,
  /** bụi cỏ cao: đi vào có thể gặp Pokémon hoang dã */
  tallGrass: 8,
  /** đường lát đá trong thị trấn */
  paving: 9,
  water: 10,
  /** sàn đấu hội quán */
  arena: 11,
} as const;
export const TILE_COUNT = 12;

export type Ctx = CanvasRenderingContext2D;

function hex(c: number): string {
  return '#' + c.toString(16).padStart(6, '0');
}

function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function px(ctx: Ctx, x: number, y: number, w: number, h: number, color: number, alpha = 1) {
  ctx.globalAlpha = alpha;
  ctx.fillStyle = hex(color);
  ctx.fillRect(x, y, w, h);
  ctx.globalAlpha = 1;
}

export function disc(ctx: Ctx, cx: number, cy: number, r: number, color: number, alpha = 1) {
  for (let y = Math.floor(cy - r); y <= Math.ceil(cy + r); y++) {
    for (let x = Math.floor(cx - r); x <= Math.ceil(cx + r); x++) {
      const dx = x + 0.5 - cx;
      const dy = y + 0.5 - cy;
      if (dx * dx + dy * dy <= r * r) px(ctx, x, y, 1, 1, color, alpha);
    }
  }
}

export function ellipse(ctx: Ctx, cx: number, cy: number, rx: number, ry: number, color: number, alpha = 1) {
  for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++) {
    for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++) {
      const dx = (x + 0.5 - cx) / rx;
      const dy = (y + 0.5 - cy) / ry;
      if (dx * dx + dy * dy <= 1) px(ctx, x, y, 1, 1, color, alpha);
    }
  }
}

export function makeCanvas(scene: Phaser.Scene, key: string, w: number, h: number, draw: (ctx: Ctx) => void) {
  if (scene.textures.exists(key)) scene.textures.remove(key);
  const tex = scene.textures.createCanvas(key, w, h);
  if (!tex) return null;
  const ctx = tex.getContext();
  ctx.imageSmoothingEnabled = false;
  draw(ctx);
  tex.refresh();
  return tex;
}

const C = {
  grass1: 0x3f8f3a,
  grass2: 0x4fa244,
  grass3: 0x357a33,
  grassDark: 0x3a8636,
  dirt1: 0x9a6b3e,
  dirt2: 0x8a5d34,
  dirt3: 0xab7b4a,
  leafDark: 0x1f5a2a,
  leafMid: 0x2f7d34,
  leafLight: 0x56a845,
  trunk: 0x5a3a20,
  trunkDark: 0x3e2614,
  rock1: 0x8d8f94,
  rock2: 0x6c6e74,
  rock3: 0xb4b6ba,
};

function drawGrass(ctx: Ctx, ox: number, rnd: () => number, base: number, tufts: number) {
  px(ctx, ox, 0, 16, 16, base);
  for (let i = 0; i < 14; i++) {
    const x = Math.floor(rnd() * 16);
    const y = Math.floor(rnd() * 16);
    px(ctx, ox + x, y, 1, 1, rnd() < 0.5 ? C.grass3 : C.grass2);
  }
  for (let i = 0; i < tufts; i++) {
    const x = 1 + Math.floor(rnd() * 13);
    const y = 2 + Math.floor(rnd() * 12);
    px(ctx, ox + x, y, 1, 2, C.grass3);
    px(ctx, ox + x + 1, y - 1, 1, 3, C.grass2);
    px(ctx, ox + x + 2, y, 1, 2, C.grass3);
  }
}

function drawDirt(ctx: Ctx, ox: number, rnd: () => number, pebbles: number) {
  px(ctx, ox, 0, 16, 16, C.dirt1);
  for (let i = 0; i < 18; i++) {
    const x = Math.floor(rnd() * 16);
    const y = Math.floor(rnd() * 16);
    px(ctx, ox + x, y, 1, 1, rnd() < 0.5 ? C.dirt2 : C.dirt3);
  }
  for (let i = 0; i < pebbles; i++) {
    const x = 1 + Math.floor(rnd() * 13);
    const y = 1 + Math.floor(rnd() * 13);
    px(ctx, ox + x, y, 2, 1, 0xc49a6a);
    px(ctx, ox + x, y + 1, 2, 1, C.dirt2);
  }
}

export function generateWorldTextures(scene: Phaser.Scene) {
  const rnd = mulberry32(1337);

  // Tileset: một hàng TILE_COUNT ô 16x16
  const tilesTex = makeCanvas(scene, 'tiles', 16 * TILE_COUNT, 16, (ctx) => {
    drawGrass(ctx, 0, rnd, C.grass1, 1);
    drawGrass(ctx, 16, rnd, C.grass1, 2);
    drawGrass(ctx, 32, rnd, C.grass1, 4);
    drawGrass(ctx, 48, rnd, C.grass1, 1);
    // hoa
    const flowers = [0xf4e04d, 0xffffff, 0xe86a8a];
    for (let i = 0; i < 3; i++) {
      const x = 48 + 2 + Math.floor(rnd() * 11);
      const y = 2 + Math.floor(rnd() * 11);
      const c = flowers[i % flowers.length];
      px(ctx, x, y - 1, 1, 1, c);
      px(ctx, x - 1, y, 3, 1, c);
      px(ctx, x, y + 1, 1, 1, c);
      px(ctx, x, y, 1, 1, 0xf09030);
    }
    drawDirt(ctx, 64, rnd, 0);
    drawDirt(ctx, 80, rnd, 1);
    drawDirt(ctx, 96, rnd, 3);
    drawGrass(ctx, 112, rnd, C.grassDark, 5);
    // bụi cỏ cao: nền đậm + các lá chữ V
    px(ctx, 128, 0, 16, 16, 0x2f7a30);
    for (let r = 0; r < 4; r++) {
      for (let c = 0; c < 4; c++) {
        const x = 128 + c * 4 + (r % 2) * 2;
        const y = r * 4 + 1;
        px(ctx, x, y + 1, 1, 2, 0x1f5a24);
        px(ctx, x + 1, y, 1, 3, 0x5fb24a);
        px(ctx, x + 2, y + 1, 1, 2, 0x3f9a3a);
      }
    }
    // đường lát đá
    px(ctx, 144, 0, 16, 16, 0xd8cdb0);
    for (const [x, y, w, h] of [[0, 0, 7, 7], [8, 0, 8, 7], [0, 8, 4, 8], [5, 8, 11, 8]]) {
      px(ctx, 144 + x, y, w, h, 0xe6dcc2);
      px(ctx, 144 + x, y + h - 1, w, 1, 0xb8ab8c);
      px(ctx, 144 + x + w - 1, y, 1, h, 0xb8ab8c);
    }
    // nước
    px(ctx, 160, 0, 16, 16, 0x3a78c8);
    px(ctx, 162, 3, 5, 1, 0x7ab0f0);
    px(ctx, 169, 9, 5, 1, 0x7ab0f0);
    px(ctx, 163, 13, 3, 1, 0x5a98e0);
    // sàn đấu hội quán: đá nâu nhạt
    px(ctx, 176, 0, 16, 16, 0xb89a72);
    for (let i = 0; i < 10; i++) px(ctx, 176 + Math.floor(rnd() * 16), Math.floor(rnd() * 16), 1, 1, rnd() < 0.5 ? 0x9a7e5a : 0xcab08a);
    px(ctx, 176, 15, 16, 1, 0x9a7e5a);
    px(ctx, 191, 0, 1, 16, 0x9a7e5a);
  });
  // frame theo chỉ số ô để dùng riêng từng ô (vd. nền menu)
  for (let i = 0; i < TILE_COUNT; i++) tilesTex?.add(i, 0, i * 16, 0, 16, 16);

  // Cây tròn 32x44
  makeCanvas(scene, 'tree', 32, 44, (ctx) => {
    ellipse(ctx, 16, 41, 11, 3, 0x000000, 0.25);
    px(ctx, 13, 30, 6, 12, C.trunk);
    px(ctx, 13, 30, 2, 12, C.trunkDark);
    px(ctx, 12, 40, 8, 2, C.trunk);
    disc(ctx, 16, 17, 15, C.leafDark);
    disc(ctx, 15, 15, 13, C.leafMid);
    disc(ctx, 12, 11, 7, C.leafLight);
    disc(ctx, 22, 19, 5, C.leafMid);
    for (let i = 0; i < 26; i++) {
      const a = rnd() * Math.PI * 2;
      const r = rnd() * 12;
      px(ctx, Math.round(15 + Math.cos(a) * r), Math.round(15 + Math.sin(a) * r), 1, 1, rnd() < 0.5 ? C.leafDark : C.leafLight);
    }
    px(ctx, 9, 8, 2, 1, 0x7cc860);
    px(ctx, 8, 9, 1, 2, 0x7cc860);
  });

  // Thông 28x46
  makeCanvas(scene, 'pine', 28, 46, (ctx) => {
    ellipse(ctx, 14, 43, 9, 3, 0x000000, 0.25);
    px(ctx, 12, 34, 4, 10, C.trunk);
    px(ctx, 12, 34, 1, 10, C.trunkDark);
    const layers = [
      { y: 4, w: 6 },
      { y: 11, w: 10 },
      { y: 19, w: 13 },
      { y: 27, w: 14 },
    ];
    for (const l of layers) {
      for (let row = 0; row < 9; row++) {
        const half = Math.round((l.w * (row + 1)) / 9);
        px(ctx, 14 - half, l.y + row, half * 2, 1, row < 2 ? C.leafMid : C.leafDark);
        px(ctx, 14 - half, l.y + row, Math.max(1, Math.floor(half * 0.7)), 1, row % 3 === 0 ? C.leafLight : C.leafMid);
      }
    }
  });

  // Đá nhỏ 18x14 và đá lớn 28x20
  const rock = (key: string, w: number, h: number) =>
    makeCanvas(scene, key, w, h, (ctx) => {
      ellipse(ctx, w / 2, h - 2.5, w / 2 - 1, 2.5, 0x000000, 0.25);
      ellipse(ctx, w / 2, h / 2 + 0.5, w / 2 - 1, h / 2 - 1.5, C.rock2);
      ellipse(ctx, w / 2 - 1, h / 2 - 1, w / 2 - 3, h / 2 - 3, C.rock1);
      ellipse(ctx, w / 2 - 3, h / 2 - 3, w / 5, h / 6, C.rock3);
      px(ctx, Math.floor(w * 0.6), Math.floor(h * 0.45), 2, 1, C.rock2);
      px(ctx, Math.floor(w * 0.62), Math.floor(h * 0.45) + 1, 1, 2, C.rock2);
    });
  rock('rock', 18, 14);
  rock('rock_big', 28, 20);

  // Bụi cây (trang trí, không chặn)
  makeCanvas(scene, 'bush', 16, 11, (ctx) => {
    ellipse(ctx, 8, 9, 7, 2, 0x000000, 0.2);
    disc(ctx, 5, 6, 4, C.leafDark);
    disc(ctx, 11, 6, 4, C.leafDark);
    disc(ctx, 8, 4, 4, C.leafMid);
    px(ctx, 6, 2, 2, 1, C.leafLight);
  });
  // Cỏ cao
  makeCanvas(scene, 'tallgrass', 12, 9, (ctx) => {
    for (let i = 0; i < 5; i++) {
      const x = 1 + i * 2;
      const h = 4 + ((i * 7) % 4);
      px(ctx, x, 9 - h, 1, h, i % 2 ? C.grass2 : C.leafMid);
    }
  });
}

export function generateFxTextures(scene: Phaser.Scene) {
  makeCanvas(scene, 'pixel', 2, 2, (ctx) => px(ctx, 0, 0, 2, 2, 0xffffff));

  makeCanvas(scene, 'shadow', 20, 7, (ctx) => ellipse(ctx, 10, 3.5, 9.5, 3, 0x000000, 0.35));

  makeCanvas(scene, 'fireball', 12, 12, (ctx) => {
    disc(ctx, 6, 6, 5.5, 0xd8401c);
    disc(ctx, 6, 6, 4, 0xf08030);
    disc(ctx, 6.5, 5.5, 2.5, 0xffd34a);
    px(ctx, 6, 4, 1, 1, 0xfff7c0);
  });

  // vầng sáng mềm (hạt lửa cộng sáng, cột lửa, cầu nổ) – màu trắng để tô màu bằng tint
  makeCanvas(scene, 'softglow', 12, 12, (ctx) => {
    disc(ctx, 6, 6, 6, 0xffffff, 0.22);
    disc(ctx, 6, 6, 4.6, 0xffffff, 0.45);
    disc(ctx, 6, 6, 3.2, 0xffffff, 0.8);
    disc(ctx, 6, 6, 1.8, 0xffffff, 1);
  });
  makeCanvas(scene, 'smokepuff', 8, 8, (ctx) => {
    disc(ctx, 4, 4, 3.8, 0x3a3230, 0.55);
    disc(ctx, 3.6, 3.6, 2.6, 0x5a504a, 0.7);
  });
  makeCanvas(scene, 'debris', 3, 3, (ctx) => {
    px(ctx, 0, 0, 3, 3, 0x5a4030);
    px(ctx, 0, 0, 2, 2, 0x8a6a4a);
  });

  makeCanvas(scene, 'spark', 4, 4, (ctx) => {
    px(ctx, 1, 0, 2, 4, 0xffe27a);
    px(ctx, 0, 1, 4, 2, 0xffe27a);
    px(ctx, 1, 1, 2, 2, 0xffffff);
  });

  makeCanvas(scene, 'flamepuff', 8, 8, (ctx) => {
    disc(ctx, 4, 4, 3.8, 0xe8501c);
    disc(ctx, 4, 4, 2.6, 0xf59a2a);
    disc(ctx, 4, 3.6, 1.4, 0xffe27a);
  });

  makeCanvas(scene, 'xp', 7, 9, (ctx) => {
    const rows = [1, 3, 5, 7, 7, 5, 3, 1];
    rows.forEach((w, i) => px(ctx, 3 - (w - 1) / 2, i, w, 1, 0x3ec8f0));
    px(ctx, 2, 2, 1, 2, 0xc8f4ff);
    px(ctx, 3, 1, 1, 1, 0xffffff);
    rows.forEach((w, i) => {
      if (i > 3) px(ctx, 3 - (w - 1) / 2 + w - 1, i, 1, 1, 0x1f7fb0);
    });
  });

  makeCanvas(scene, 'poison', 10, 10, (ctx) => {
    disc(ctx, 5, 5, 4.6, 0x5a2a80);
    disc(ctx, 5, 5, 3.4, 0xa050d8);
    px(ctx, 3, 3, 2, 2, 0xe0b0ff);
  });

  makeCanvas(scene, 'rockball', 12, 12, (ctx) => {
    disc(ctx, 6, 6, 5.5, 0x5c5048);
    disc(ctx, 5.5, 5.5, 4.2, 0x8c7c6c);
    px(ctx, 4, 3, 2, 2, 0xb8a894);
  });

  makeCanvas(scene, 'boulder', 20, 18, (ctx) => {
    ellipse(ctx, 10, 9, 9.5, 8.5, 0x5c5048);
    ellipse(ctx, 9, 8, 7.5, 6.5, 0x8c7c6c);
    ellipse(ctx, 7, 6, 3, 2, 0xb8a894);
  });

  // Vòng ngắm mục tiêu: 4 góc vuông màu cam, viền tối để nổi trên nền cỏ
  makeCanvas(scene, 'reticle', 20, 20, (ctx) => {
    const corners: [number, number][] = [[0, 0], [14, 0], [0, 14], [14, 14]];
    for (const [cx, cy] of corners) {
      const hx = cx === 0 ? 0 : 0; // cạnh ngang luôn bắt đầu từ góc trong khối 6x6
      const vx = cx === 0 ? 0 : 4;
      const hy = cy === 0 ? 0 : 4;
      px(ctx, cx + hx, cy + hy, 6, 2, 0x3a1a00);
      px(ctx, cx + vx, cy, 2, 6, 0x3a1a00);
      px(ctx, cx + hx + (cx === 0 ? 0 : 1), cy + hy + (cy === 0 ? 0 : 1), 5, 1, 0xffa030);
      px(ctx, cx + vx + (cx === 0 ? 0 : 1), cy + (cy === 0 ? 0 : 1), 1, 5, 0xffa030);
    }
  });

  // Mũi tên chỉ hướng quay (hướng sang phải)
  makeCanvas(scene, 'arrow', 8, 9, (ctx) => {
    for (let i = 0; i < 5; i++) px(ctx, i, i, 1, 9 - i * 2, 0xffa030);
    px(ctx, 0, 1, 1, 7, 0xffd060);
  });
}

/** Hình dự phòng 40x40 cho Pokémon khi asset tải lỗi */
export function generateFallbackPokemon(scene: Phaser.Scene, key: string, color: number) {
  makeCanvas(scene, key, 40, 40, (ctx) => {
    const r = (color >> 16) & 0xff;
    const g = (color >> 8) & 0xff;
    const b = color & 0xff;
    const dark = ((r * 0.6) << 16) | ((g * 0.6) << 8) | (b * 0.6);
    ellipse(ctx, 20, 24, 13, 12, dark);
    ellipse(ctx, 19.5, 23, 11.5, 10.5, color);
    ellipse(ctx, 16, 19, 4, 3, 0xffffff, 0.35);
    px(ctx, 14, 21, 3, 4, 0x101010);
    px(ctx, 23, 21, 3, 4, 0x101010);
    px(ctx, 14, 21, 1, 1, 0xffffff);
    px(ctx, 23, 21, 1, 1, 0xffffff);
    px(ctx, 18, 28, 4, 1, 0x101010);
    // dấu "?" nhỏ cho biết đây là placeholder
    px(ctx, 30, 6, 4, 1, 0xffffff);
    px(ctx, 33, 7, 1, 2, 0xffffff);
    px(ctx, 31, 9, 2, 1, 0xffffff);
    px(ctx, 31, 12, 1, 1, 0xffffff);
  });
}
