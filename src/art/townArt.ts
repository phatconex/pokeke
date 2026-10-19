// Pixel art cho đạn/hiệu ứng theo hệ, công trình trong thị trấn và nhân vật người (vẽ bằng code).
import Phaser from 'phaser';
import { Ctx, disc, ellipse, makeCanvas, px } from './textures';
import { CHAPTERS } from '../data/chapters';

// ---------------------------------------------------------------- hiệu ứng chiêu theo hệ

export function generateMoveTextures(scene: Phaser.Scene) {
  // Điện Giật: quả cầu điện răng cưa
  makeCanvas(scene, 'zap', 12, 12, (ctx) => {
    disc(ctx, 6, 6, 5, 0xf8d030, 0.45);
    disc(ctx, 6, 6, 3.2, 0xfff07a);
    px(ctx, 5, 5, 2, 2, 0xffffff);
    for (const [x, y] of [[1, 3], [10, 2], [11, 8], [2, 10], [6, 0], [6, 11]]) px(ctx, x, y, 1, 1, 0xfff07a);
  });
  makeCanvas(scene, 'zappuff', 6, 6, (ctx) => {
    px(ctx, 2, 0, 2, 6, 0xfff07a);
    px(ctx, 0, 2, 6, 2, 0xf8d030);
    px(ctx, 2, 2, 2, 2, 0xffffff);
  });
  // Lá Sắc: chiếc lá
  makeCanvas(scene, 'leaf', 10, 6, (ctx) => {
    ellipse(ctx, 5, 3, 4.6, 2.6, 0x3f9a3a);
    ellipse(ctx, 4.5, 2.5, 3, 1.4, 0x7cd060);
    px(ctx, 1, 3, 8, 1, 0x2a6a28);
  });
  makeCanvas(scene, 'leafpuff', 5, 4, (ctx) => {
    ellipse(ctx, 2.5, 2, 2.4, 1.6, 0x5fb24a);
    px(ctx, 1, 2, 3, 1, 0x2f7a30);
  });
  // Súng Nước: bong bóng
  makeCanvas(scene, 'bubble', 10, 10, (ctx) => {
    disc(ctx, 5, 5, 4.6, 0x3a78c8);
    disc(ctx, 5, 5, 3.4, 0x7ab8f8);
    px(ctx, 3, 3, 2, 2, 0xffffff);
  });
  makeCanvas(scene, 'bubblepuff', 7, 7, (ctx) => {
    disc(ctx, 3.5, 3.5, 3.3, 0x9ad0ff, 0.9);
    disc(ctx, 3.5, 3.5, 2, 0x5a98e0, 0.5);
    px(ctx, 2, 2, 1, 1, 0xffffff);
  });
  // Nhả Tơ
  makeCanvas(scene, 'string', 12, 6, (ctx) => {
    px(ctx, 0, 2, 12, 2, 0xf4f4f4);
    px(ctx, 2, 1, 2, 1, 0xd0d0d8);
    px(ctx, 7, 4, 3, 1, 0xd0d0d8);
    px(ctx, 10, 1, 2, 4, 0xffffff);
  });
  // Kim Độc
  makeCanvas(scene, 'needle', 12, 4, (ctx) => {
    px(ctx, 0, 1, 9, 2, 0xa060e0);
    px(ctx, 9, 1, 3, 2, 0xe0c0ff);
    px(ctx, 11, 1, 1, 1, 0xffffff);
  });
  // Gió Xoáy
  makeCanvas(scene, 'wind', 12, 12, (ctx) => {
    for (let a = 0; a < 18; a++) {
      const r = 1 + a * 0.28;
      const t = a * 0.7;
      px(ctx, Math.round(6 + Math.cos(t) * r), Math.round(6 + Math.sin(t) * r), 1, 1, a % 3 === 0 ? 0xffffff : 0xc8e8ff);
    }
  });
  // Hút Năng Lượng
  makeCanvas(scene, 'seed', 10, 10, (ctx) => {
    disc(ctx, 5, 5, 4.4, 0x2f7a30);
    disc(ctx, 5, 5, 3, 0x9ae070);
    px(ctx, 3, 3, 2, 2, 0xe8ffd0);
  });
  makeCanvas(scene, 'poisonpuff', 7, 7, (ctx) => {
    disc(ctx, 3.5, 3.5, 3.3, 0xa060e0, 0.9);
    disc(ctx, 3.5, 3.5, 1.8, 0xe0b0ff);
  });
  makeCanvas(scene, 'windpuff', 7, 5, (ctx) => {
    px(ctx, 0, 2, 7, 1, 0xffffff);
    px(ctx, 1, 1, 4, 1, 0xc8e8ff);
    px(ctx, 3, 3, 4, 1, 0xc8e8ff);
  });
  makeCanvas(scene, 'dustpuff', 6, 6, (ctx) => {
    disc(ctx, 3, 3, 2.8, 0xc8b090, 0.9);
    disc(ctx, 2.5, 2.5, 1.4, 0xe8d8c0);
  });
  // Sao Băng: ngôi sao vàng
  makeCanvas(scene, 'starshot', 11, 11, (ctx) => {
    const rows = ['.....y.....', '....yyy....', '....yyy....', 'yyyyywyyyyy', '.yyyywyyyy.', '..yyyyyyy..', '...yyyyy...', '..yyy.yyy..', '..yy...yy..', '.yy.....yy.', '...........'];
    rows.forEach((r, y) => [...r].forEach((c, x) => c !== '.' && px(ctx, x, y, 1, 1, c === 'w' ? 0xffffff : 0xffd34a)));
  });
  // Bắn Bùn
  makeCanvas(scene, 'mud', 10, 9, (ctx) => {
    ellipse(ctx, 5, 5, 4.5, 3.6, 0x6a4a28);
    ellipse(ctx, 4, 4, 2.6, 1.8, 0x9a7444);
    px(ctx, 3, 3, 1, 1, 0xc8a070);
  });
  makeCanvas(scene, 'psypuff', 7, 7, (ctx) => {
    disc(ctx, 3.5, 3.5, 3.3, 0xf85888, 0.85);
    disc(ctx, 3.5, 3.5, 1.6, 0xffc0d8);
  });
  // giọt nước lớn rơi từ trên xuống (đòn của Starmie)
  makeCanvas(scene, 'splash', 18, 20, (ctx) => {
    for (let y = 0; y < 20; y++) {
      const half = y < 8 ? y * 0.6 : Math.sqrt(Math.max(0, 81 - (y - 11) ** 2));
      px(ctx, Math.round(9 - half), y, Math.round(half * 2), 1, y > 14 ? 0x2a68c0 : 0x4a90e8);
    }
    px(ctx, 6, 10, 2, 4, 0xc8e8ff);
  });

  // vòng khiên khi dùng chiêu tự cường hóa
  makeCanvas(scene, 'shield', 28, 28, (ctx) => {
    for (let y = 0; y < 28; y++) for (let x = 0; x < 28; x++) {
      const d = Math.hypot(x - 13.5, y - 13.5);
      if (d < 13.5 && d > 11.5) px(ctx, x, y, 1, 1, 0x9ad0ff, 0.9);
      else if (d <= 11.5) px(ctx, x, y, 1, 1, 0x9ad0ff, 0.15);
    }
  });
  // sao choáng
  makeCanvas(scene, 'dizzy', 7, 7, (ctx) => {
    px(ctx, 3, 0, 1, 7, 0xffd34a);
    px(ctx, 0, 3, 7, 1, 0xffd34a);
    px(ctx, 2, 2, 3, 3, 0xffe9a0);
  });

  // dấu "!" khi gặp Pokémon hoang dã
  makeCanvas(scene, 'exclaim', 12, 14, (ctx) => {
    px(ctx, 1, 0, 10, 11, 0x1a1410);
    px(ctx, 2, 1, 8, 9, 0xffffff);
    px(ctx, 5, 2, 2, 5, 0xd83020);
    px(ctx, 5, 8, 2, 1, 0xd83020);
    px(ctx, 4, 11, 3, 2, 0x1a1410);
  });
  // Huy hiệu Đá (Boulder Badge)
  makeCanvas(scene, 'badge-boulder', 14, 14, (ctx) => {
    const pts = [[4, 0, 6], [2, 1, 10], [1, 2, 12], [0, 4, 14], [0, 5, 14], [0, 6, 14], [0, 7, 14], [0, 8, 14], [0, 9, 14], [1, 11, 12], [2, 12, 10], [4, 13, 6]];
    px(ctx, 0, 3, 14, 8, 0x5a5a62);
    for (const [x, y, w] of pts) px(ctx, x, y, w, 1, 0x5a5a62);
    px(ctx, 2, 3, 10, 8, 0x9a9aa6);
    px(ctx, 3, 3, 4, 3, 0xd0d0da);
  });
  // Huy hiệu Thác (Cascade Badge): giọt nước xanh
  makeCanvas(scene, 'badge-cascade', 14, 14, (ctx) => {
    for (let y = 0; y < 14; y++) {
      const half = y < 6 ? y * 0.9 : Math.sqrt(Math.max(0, 36 - (y - 8) ** 2));
      px(ctx, Math.round(7 - half), y, Math.max(1, Math.round(half * 2)), 1, y > 10 ? 0x2a68c0 : 0x4a90e8);
    }
    px(ctx, 5, 7, 2, 3, 0xc8e8ff);
  });
  // Huy hiệu Sấm (Thunder Badge): bát giác cam, tâm vàng
  makeCanvas(scene, 'badge-thunder', 14, 14, (ctx) => {
    const rows = [[4, 6], [2, 10], [1, 12], [0, 14], [0, 14], [0, 14], [0, 14], [0, 14], [0, 14], [0, 14], [0, 14], [1, 12], [2, 10], [4, 6]];
    rows.forEach(([x, w], y) => px(ctx, x, y, w, 1, 0xd86020));
    rows.forEach(([x, w], y) => y > 1 && y < 12 && px(ctx, x + 2, y, Math.max(0, w - 4), 1, 0xf09030));
    px(ctx, 5, 5, 4, 4, 0xffe060);
    px(ctx, 6, 6, 2, 2, 0xffffff);
  });
  // Ném Xu (Pay Day): đồng xu vàng
  makeCanvas(scene, 'coinshot', 8, 8, (ctx) => {
    disc(ctx, 4, 4, 3.8, 0xc08a20);
    disc(ctx, 4, 4, 2.9, 0xffd34a);
    px(ctx, 3, 2, 1, 4, 0xfff0a0);
  });
  // Tia Siêu Linh / đạn Drowzee, Abra: cầu hồng tím
  makeCanvas(scene, 'psyball', 10, 10, (ctx) => {
    disc(ctx, 5, 5, 4.8, 0xa040c0, 0.7);
    disc(ctx, 5, 5, 3.4, 0xf85888);
    disc(ctx, 4, 4, 1.6, 0xffd0e8);
  });
  // ---- texture đạn / hạt dùng cho chương 4 trở đi ----
  makeCanvas(scene, 'icepuff', 7, 7, (ctx) => {
    disc(ctx, 3.5, 3.5, 3.2, 0xb8f0ff, 0.9);
    px(ctx, 3, 1, 1, 5, 0xffffff);
    px(ctx, 1, 3, 5, 1, 0xffffff);
  });
  makeCanvas(scene, 'iceshard', 12, 7, (ctx) => {
    for (let x = 0; x < 12; x++) {
      const h = Math.max(1, Math.round(3 - Math.abs(x - 7) * 0.45));
      px(ctx, x, 3 - Math.floor(h / 2), 1, h, x > 8 ? 0xffffff : 0x8ad8f8);
    }
    px(ctx, 4, 3, 5, 1, 0xe0f8ff);
  });
  makeCanvas(scene, 'shadowball', 12, 12, (ctx) => {
    disc(ctx, 6, 6, 5.8, 0x2a1a48, 0.85);
    disc(ctx, 6, 6, 4.2, 0x5a3a90);
    disc(ctx, 5, 5, 2, 0xa080e0);
  });
  makeCanvas(scene, 'shadowpuff', 7, 7, (ctx) => {
    disc(ctx, 3.5, 3.5, 3.3, 0x5a3a90, 0.8);
    disc(ctx, 3.5, 3.5, 1.5, 0xa080e0);
  });
  makeCanvas(scene, 'dragonflame', 14, 9, (ctx) => {
    ellipse(ctx, 8, 4.5, 6, 4, 0x6a38d8);
    ellipse(ctx, 9, 4.5, 4, 2.6, 0x9a70f8);
    ellipse(ctx, 10, 4.5, 2, 1.4, 0xe8d8ff);
  });
  makeCanvas(scene, 'dragonpuff', 7, 7, (ctx) => {
    disc(ctx, 3.5, 3.5, 3.3, 0x7a48e8, 0.85);
    disc(ctx, 3.5, 3.5, 1.6, 0xd8c8ff);
  });
  // Xương (Bonemerang của Cubone/Marowak)
  makeCanvas(scene, 'bone', 14, 6, (ctx) => {
    px(ctx, 2, 2, 10, 2, 0xf0ead8);
    disc(ctx, 2, 1.5, 1.6, 0xf0ead8);
    disc(ctx, 2, 4.5, 1.6, 0xf0ead8);
    disc(ctx, 12, 1.5, 1.6, 0xf0ead8);
    disc(ctx, 12, 4.5, 1.6, 0xf0ead8);
    px(ctx, 3, 3, 8, 1, 0xc8bca0);
  });
  // Cánh hoa (Vũ Điệu Cánh Hoa)
  makeCanvas(scene, 'petal', 7, 6, (ctx) => {
    ellipse(ctx, 3.5, 3, 3.2, 2.2, 0xf890c0);
    px(ctx, 2, 2, 2, 1, 0xffd0e8);
  });
  // Bùn độc (Sludge)
  makeCanvas(scene, 'sludge', 10, 9, (ctx) => {
    ellipse(ctx, 5, 5, 4.6, 3.8, 0x6a2a80);
    ellipse(ctx, 4, 4, 2.6, 2, 0xa050c0);
    px(ctx, 3, 3, 1, 1, 0xe0b0f0);
  });
  // ---- huy hiệu chương 4 → 8 ----
  makeCanvas(scene, 'badge-rainbow', 14, 14, (ctx) => {
    const petals: [number, number, number][] = [[7, 2, 0xe04848], [11, 5, 0xf0a030], [10, 10, 0xf0e040], [4, 10, 0x50c050], [3, 5, 0x4a8ae0]];
    for (const [x, y, c] of petals) disc(ctx, x, y, 2.6, c);
    disc(ctx, 7, 7, 2.2, 0xffffff);
    disc(ctx, 7, 7, 1.2, 0xf0d040);
  });
  makeCanvas(scene, 'badge-soul', 14, 14, (ctx) => {
    disc(ctx, 4.5, 5, 3.6, 0xe0508a);
    disc(ctx, 9.5, 5, 3.6, 0xe0508a);
    for (let y = 6; y < 13; y++) px(ctx, Math.round(1 + (y - 6) * 0.9), y, Math.max(1, Math.round(12 - (y - 6) * 1.8)), 1, 0xe0508a);
    px(ctx, 3, 3, 2, 2, 0xffc0d8);
  });
  makeCanvas(scene, 'badge-marsh', 14, 14, (ctx) => {
    disc(ctx, 7, 7, 6.5, 0xd0a020);
    disc(ctx, 7, 7, 4.8, 0xf0d050);
    disc(ctx, 7, 7, 3, 0xd0a020);
    disc(ctx, 7, 7, 1.4, 0xfff0a0);
  });
  makeCanvas(scene, 'badge-volcano', 14, 14, (ctx) => {
    for (let y = 0; y < 14; y++) {
      const half = y < 7 ? y : 13 - y;
      px(ctx, 7 - half, y, half * 2 + 1, 1, y < 4 ? 0xf8d040 : y < 9 ? 0xf08030 : 0xc83020);
    }
    px(ctx, 6, 3, 2, 2, 0xffffff);
  });
  makeCanvas(scene, 'badge-earth', 14, 14, (ctx) => {
    for (let y = 1; y < 13; y++) {
      const half = Math.round(Math.sin(((y - 1) / 12) * Math.PI) * 5.5);
      px(ctx, 7 - half, y, half * 2, 1, 0x40a050);
    }
    px(ctx, 7, 1, 1, 12, 0x2a7a3a);
    px(ctx, 4, 4, 2, 2, 0x90e080);
  });
  makeCanvas(scene, 'badge-empty', 14, 14, (ctx) => {
    disc(ctx, 7, 7, 6.5, 0x2a3a2a);
    disc(ctx, 7, 7, 5, 0x1a241a);
  });
}

// ---------------------------------------------------------------- công trình

const W = {
  wall: 0xeee0bc, wallShade: 0xc8b890, roofRed: 0xc83c30, roofRedDark: 0x8a2620, roofRedLight: 0xe86050,
  wood: 0x8a5a30, woodDark: 0x5a3a1a, glass: 0x8ac8f0, glassDark: 0x4a88b8, stone: 0x8c8c94, stoneDark: 0x5c5c66, stoneLight: 0xb4b4bc,
};

function roof(ctx: Ctx, w: number, h: number, base: number, dark: number, light: number) {
  for (let y = 0; y < h; y++) {
    const inset = Math.max(0, Math.round((h - y) * 0.25));
    px(ctx, inset, y, w - inset * 2, 1, y % 4 === 3 ? dark : base);
  }
  px(ctx, 0, h - 1, w, 2, dark);
  px(ctx, Math.round(h * 0.25), 0, w - Math.round(h * 0.5), 1, light);
}

function windowAt(ctx: Ctx, x: number, y: number, w = 8, h = 7) {
  px(ctx, x - 1, y - 1, w + 2, h + 2, W.woodDark);
  px(ctx, x, y, w, h, W.glass);
  px(ctx, x, y + h - 2, w, 2, W.glassDark);
  px(ctx, x + Math.floor(w / 2), y, 1, h, W.woodDark);
}

export function generateTownTextures(scene: Phaser.Scene) {
  // Nhà ở 48x44
  makeCanvas(scene, 'house', 48, 44, (ctx) => {
    ellipse(ctx, 24, 42, 23, 2, 0x000000, 0.25);
    roof(ctx, 48, 18, W.roofRed, W.roofRedDark, W.roofRedLight);
    px(ctx, 3, 18, 42, 24, W.wall);
    px(ctx, 3, 39, 42, 3, W.wallShade);
    windowAt(ctx, 8, 24);
    windowAt(ctx, 32, 24);
    px(ctx, 20, 28, 9, 14, W.wood);
    px(ctx, 20, 28, 9, 1, W.woodDark);
    px(ctx, 26, 35, 1, 1, 0xffd34a);
  });
  // Phòng thí nghiệm 64x48
  makeCanvas(scene, 'lab', 64, 48, (ctx) => {
    ellipse(ctx, 32, 46, 31, 2, 0x000000, 0.25);
    roof(ctx, 64, 16, 0x4a8a9a, 0x2a5a6a, 0x7abaca);
    px(ctx, 3, 16, 58, 30, 0xf4f0e8);
    px(ctx, 3, 43, 58, 3, 0xc8c4bc);
    for (const x of [8, 20, 40, 52]) windowAt(ctx, x, 22, 6, 7);
    px(ctx, 27, 30, 11, 16, W.glassDark);
    px(ctx, 28, 31, 4, 15, W.glass);
    px(ctx, 33, 31, 4, 15, W.glass);
  });
  // Trung tâm Pokémon 64x48
  makeCanvas(scene, 'pokecenter', 64, 48, (ctx) => {
    ellipse(ctx, 32, 46, 31, 2, 0x000000, 0.25);
    roof(ctx, 64, 16, 0xe04848, 0x9a2828, 0xff8080);
    px(ctx, 3, 16, 58, 30, 0xfafafa);
    px(ctx, 3, 16, 58, 3, 0xe04848);
    px(ctx, 3, 43, 58, 3, 0xd0d0d0);
    windowAt(ctx, 8, 24);
    windowAt(ctx, 48, 24);
    // biểu tượng chữ thập y tế
    disc(ctx, 32, 8, 6, 0xffffff);
    px(ctx, 31, 4, 3, 9, 0xe04848);
    px(ctx, 28, 7, 9, 3, 0xe04848);
    // cửa kính đôi
    px(ctx, 25, 29, 15, 17, 0x6a6a72);
    px(ctx, 26, 30, 6, 16, W.glass);
    px(ctx, 33, 30, 6, 16, W.glass);
    px(ctx, 26, 41, 13, 5, W.glassDark);
  });
  // Hội quán 80x60
  makeCanvas(scene, 'gym', 80, 60, (ctx) => {
    ellipse(ctx, 40, 58, 39, 2, 0x000000, 0.25);
    roof(ctx, 80, 18, 0x6a6a72, 0x44444c, 0x9a9aa4);
    px(ctx, 3, 18, 74, 40, 0xa88a68);
    for (let y = 20; y < 56; y += 6) {
      for (let x = 3 + ((y / 6) % 2) * 6; x < 77; x += 12) px(ctx, x, y, 11, 5, 0xb89a78);
    }
    px(ctx, 3, 55, 74, 3, 0x7a6448);
    // biển tên
    px(ctx, 22, 21, 36, 9, 0x3a2a1a);
    px(ctx, 23, 22, 34, 7, 0xf0c848);
    for (let i = 0; i < 6; i++) px(ctx, 26 + i * 5, 24, 3, 3, 0x3a2a1a);
    // cửa lớn
    px(ctx, 31, 36, 18, 22, 0x2a2018);
    px(ctx, 32, 37, 7, 21, 0x4a3828);
    px(ctx, 41, 37, 7, 21, 0x4a3828);
  });
  // Cổng Liên đoàn 64x52
  makeCanvas(scene, 'gate', 64, 52, (ctx) => {
    ellipse(ctx, 32, 50, 31, 2, 0x000000, 0.25);
    roof(ctx, 64, 14, 0x3a5aa8, 0x22386a, 0x6a8ad8);
    px(ctx, 3, 14, 58, 36, W.stone);
    px(ctx, 3, 14, 58, 2, W.stoneLight);
    for (let y = 18; y < 48; y += 5) px(ctx, 3, y, 58, 1, W.stoneDark);
    px(ctx, 20, 24, 24, 26, 0x1a1a22);
    px(ctx, 20, 24, 24, 2, W.stoneDark);
    for (let x = 22; x < 44; x += 4) px(ctx, x, 26, 2, 24, 0x8a6a2a);
    disc(ctx, 32, 7, 4, 0xf0c848);
  });
  // Biển gỗ 14x16
  makeCanvas(scene, 'sign', 14, 16, (ctx) => {
    ellipse(ctx, 7, 15, 5, 1.2, 0x000000, 0.25);
    px(ctx, 6, 8, 2, 8, W.woodDark);
    px(ctx, 0, 1, 14, 8, W.woodDark);
    px(ctx, 1, 2, 12, 6, 0xc89a60);
    px(ctx, 3, 4, 8, 1, W.woodDark);
    px(ctx, 3, 6, 6, 1, W.woodDark);
  });
  // Hàng rào 16x12
  makeCanvas(scene, 'fence', 16, 12, (ctx) => {
    px(ctx, 1, 0, 3, 12, W.wood);
    px(ctx, 12, 0, 3, 12, W.wood);
    px(ctx, 0, 3, 16, 2, 0xa8784a);
    px(ctx, 0, 8, 16, 2, 0xa8784a);
    px(ctx, 1, 0, 3, 1, 0xc89a60);
    px(ctx, 12, 0, 3, 1, 0xc89a60);
  });
  // Lá cỏ che chân khi đứng trong bụi cỏ
  makeCanvas(scene, 'grass-over', 16, 7, (ctx) => {
    for (let i = 0; i < 6; i++) {
      const x = 1 + i * 2.6;
      px(ctx, Math.round(x), 2 + (i % 2), 1, 5, 0x1f5a24);
      px(ctx, Math.round(x) + 1, 1 + (i % 2), 1, 6, 0x5fb24a);
    }
  });
}

// ---------------------------------------------------------------- nhân vật người

export interface TrainerPalette {
  skin: number;
  hair: number;
  /** null = không đội mũ */
  cap: number | null;
  capFront?: number;
  shirt: number;
  shirtTrim: number;
  arms: number;
  pants: number;
  shoes: number;
  bag?: number;
  /** kiểu tóc khi không đội mũ */
  hairStyle?: 'spiky' | 'long' | 'bald';
}

const CORE_PALETTES: Record<string, TrainerPalette> = {
  satoshi: { skin: 0xf0c098, hair: 0x1a1a2a, cap: 0xd83030, capFront: 0xffffff, shirt: 0x2f5fc8, shirtTrim: 0xffffff, arms: 0x2f5fc8, pants: 0x2a3a6a, shoes: 0xd83030, bag: 0x3a9a4a },
  // nhân vật người chơi có thể chọn (data/avatars.ts)
  'hero-blue': { skin: 0xf0c098, hair: 0x4a2a14, cap: 0x2f5fc8, capFront: 0xffffff, shirt: 0xe04848, shirtTrim: 0xffffff, arms: 0xe04848, pants: 0x2a2a3a, shoes: 0x2f5fc8, bag: 0xf0d040 },
  'hero-green': { skin: 0xc88a5a, hair: 0x1a1a2a, cap: 0x3a9a4a, capFront: 0xf0f0f0, shirt: 0xf0f0f0, shirtTrim: 0x3a9a4a, arms: 0xf0f0f0, pants: 0x3a3a5a, shoes: 0x3a9a4a, bag: 0x9a6a3a },
  'girl-pink': { skin: 0xf4cca8, hair: 0x8a4a20, cap: null, shirt: 0xe85a8a, shirtTrim: 0xffffff, arms: 0xf4cca8, pants: 0x2a3a6a, shoes: 0xe85a8a, bag: 0xf0d040, hairStyle: 'long' },
  'girl-blue': { skin: 0xf0c098, hair: 0x2a2a4a, cap: null, shirt: 0x4ab8e0, shirtTrim: 0xffffff, arms: 0xf0c098, pants: 0xf0f0f0, shoes: 0x2a6ab8, bag: 0xe04848, hairStyle: 'long' },
  'girl-gold': { skin: 0xf4cca8, hair: 0xf0d040, cap: null, shirt: 0x7a4ab0, shirtTrim: 0xf0d040, arms: 0xf4cca8, pants: 0x3a3a4a, shoes: 0x7a4ab0, bag: 0x60c050, hairStyle: 'long' },
  takeshi: { skin: 0xc88a5a, hair: 0x4a2a14, cap: null, shirt: 0xe07a28, shirtTrim: 0x4a7a3a, arms: 0xc88a5a, pants: 0x7a6a4a, shoes: 0x3a3a3a, hairStyle: 'spiky' },
  joy: { skin: 0xf4cca8, hair: 0xf080a8, cap: 0xffffff, capFront: 0xe04848, shirt: 0xfafafa, shirtTrim: 0xf080a8, arms: 0xf4cca8, pants: 0xfafafa, shoes: 0xf080a8, hairStyle: 'long' },
  kasumi: { skin: 0xf4cca8, hair: 0xf08030, cap: null, shirt: 0xf0e040, shirtTrim: 0xd83030, arms: 0xf4cca8, pants: 0x3a6ac8, shoes: 0xd83030, hairStyle: 'long' },
  matis: { skin: 0xf0c098, hair: 0xf0e040, cap: null, shirt: 0x5a7a3a, shirtTrim: 0x2a3a1a, arms: 0xf0c098, pants: 0x4a5a3a, shoes: 0x2a2a2a, hairStyle: 'spiky' },
  shigeru: { skin: 0xf0c098, hair: 0x8a5a30, cap: null, shirt: 0x6a4ab0, shirtTrim: 0x2a2a4a, arms: 0x6a4ab0, pants: 0x3a3a4a, shoes: 0x2a2a2a, hairStyle: 'spiky' },
  oak: { skin: 0xf0c098, hair: 0xb0b0b8, cap: null, shirt: 0xf4f4f4, shirtTrim: 0xa86a3a, arms: 0xf4f4f4, pants: 0x8a6a4a, shoes: 0x4a3020, hairStyle: 'spiky' },
};

export const TRAINER_PALETTES: Record<string, TrainerPalette> = Object.assign({}, CORE_PALETTES, ...CHAPTERS.map((c) => c.trainerPalettes ?? {}));

/** Thứ tự hàng trong sheet: 0 xuống, 1 trái, 2 phải, 3 lên. Cột: 0 đứng, 1 bước A, 2 bước B. */
export const TRAINER_DIRS = ['down', 'left', 'right', 'up'] as const;
export type TrainerDir = (typeof TRAINER_DIRS)[number];
export const TRAINER_FRAME = { w: 16, h: 24 };

function drawTrainer(ctx: Ctx, dir: 'down' | 'up' | 'left', step: number, p: TrainerPalette) {
  const lift = step === 0 ? 0 : 1; // bước chân: nhún người 1px
  const by = lift ? -1 : 0;
  // bóng
  ellipse(ctx, 8, 22.5, 5.5, 1.5, 0x000000, 0.3);

  // ---- chân ----
  const legL = step === 1 ? 1 : 0;
  const legR = step === 2 ? 1 : 0;
  if (dir === 'left') {
    const fwd = step === 1 ? -2 : step === 2 ? 2 : 0;
    px(ctx, 6 + fwd, 18, 3, 3, p.pants);
    px(ctx, 7 - fwd, 18, 3, 3, p.pants);
    px(ctx, 5 + fwd, 21, 4, 2, p.shoes);
    px(ctx, 6 - fwd, 21, 4, 2, p.shoes);
  } else {
    px(ctx, 5, 18, 3, 3 + legL, p.pants);
    px(ctx, 8, 18, 3, 3 + legR, p.pants);
    px(ctx, 5, 21 + legL, 3, 2 - legL, p.shoes);
    px(ctx, 8, 21 + legR, 3, 2 - legR, p.shoes);
  }

  // ---- thân ----
  const ty = 11 + by;
  if (dir === 'left') {
    px(ctx, 5, ty, 6, 7, p.shirt);
    px(ctx, 5, ty, 6, 1, p.shirtTrim);
    if (p.bag) px(ctx, 10, ty + 1, 2, 5, p.bag);
    const swing = step === 1 ? 1 : step === 2 ? -1 : 0;
    px(ctx, 7 + swing, ty + 2, 2, 5, p.arms);
    px(ctx, 7 + swing, ty + 6, 2, 1, p.skin);
  } else {
    px(ctx, 4, ty, 8, 7, p.shirt);
    px(ctx, 4, ty, 8, 1, p.shirtTrim);
    if (dir === 'down') px(ctx, 7, ty + 1, 2, 5, p.shirtTrim);
    px(ctx, 3, ty + 1, 1, 5 - legR, p.arms);
    px(ctx, 12, ty + 1, 1, 5 - legL, p.arms);
    px(ctx, 3, ty + 6 - legR, 1, 1, p.skin);
    px(ctx, 12, ty + 6 - legL, 1, 1, p.skin);
    if (dir === 'up' && p.bag) {
      px(ctx, 5, ty + 1, 6, 5, p.bag);
      px(ctx, 5, ty + 1, 6, 1, 0x2a6a32);
    }
  }

  // ---- đầu ----
  const hy = 2 + by;
  if (dir === 'down') {
    px(ctx, 4, hy + 3, 8, 6, p.skin);
    px(ctx, 6, hy + 5, 1, 2, 0x1a1410);
    px(ctx, 9, hy + 5, 1, 2, 0x1a1410);
    px(ctx, 3, hy + 3, 1, 4, p.hair);
    px(ctx, 12, hy + 3, 1, 4, p.hair);
  } else if (dir === 'up') {
    px(ctx, 4, hy + 2, 8, 7, p.hair);
  } else {
    px(ctx, 4, hy + 3, 7, 6, p.skin);
    px(ctx, 5, hy + 5, 1, 2, 0x1a1410);
    px(ctx, 8, hy + 3, 4, 5, p.hair);
  }
  if (p.cap !== null) {
    px(ctx, 4, hy, 8, 3, p.cap);
    px(ctx, 3, hy + 1, 10, 2, p.cap);
    if (dir === 'down') {
      px(ctx, 3, hy + 3, 10, 1, p.cap);
      if (p.capFront !== undefined) px(ctx, 6, hy, 4, 2, p.capFront);
    } else if (dir === 'left') {
      px(ctx, 1, hy + 3, 5, 1, p.cap);
      if (p.capFront !== undefined) px(ctx, 4, hy, 3, 2, p.capFront);
    }
    if (p.hairStyle === 'long') {
      px(ctx, 2, hy + 3, 2, 8, p.hair);
      px(ctx, 12, hy + 3, 2, 8, p.hair);
    }
  } else if (p.hairStyle === 'spiky') {
    px(ctx, 3, hy, 10, 3, p.hair);
    for (const x of [3, 6, 9, 12]) px(ctx, x, hy - 1, 1, 1, p.hair);
    if (dir === 'up') px(ctx, 3, hy + 2, 10, 6, p.hair);
  }
}

export function generateTrainerTextures(scene: Phaser.Scene) {
  const { w, h } = TRAINER_FRAME;
  for (const [id, pal] of Object.entries(TRAINER_PALETTES)) {
    const key = `trainer-${id}`;
    const tex = makeCanvas(scene, key, w * 3, h * 4, (ctx) => {
      TRAINER_DIRS.forEach((dir, row) => {
        for (let col = 0; col < 3; col++) {
          ctx.save();
          if (dir === 'right') {
            ctx.translate(col * w + w, row * h);
            ctx.scale(-1, 1);
          } else {
            ctx.translate(col * w, row * h);
          }
          drawTrainer(ctx, dir === 'right' ? 'left' : dir, col, pal);
          ctx.restore();
        }
      });
    });
    if (!tex) continue;
    for (let i = 0; i < 12; i++) tex.add(i, 0, (i % 3) * w, Math.floor(i / 3) * h, w, h);
    TRAINER_DIRS.forEach((dir, row) => {
      const animKey = `${key}-walk-${dir}`;
      if (scene.anims.exists(animKey)) scene.anims.remove(animKey);
      scene.anims.create({
        key: animKey,
        frames: [1, 0, 2, 0].map((c) => ({ key, frame: row * 3 + c })),
        frameRate: 8,
        repeat: -1,
      });
    });
  }
}
