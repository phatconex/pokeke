// Nội thất Trung tâm Pokémon (640×360, hiển thị ×2): sàn gạch hồng, quầy Joy, máy hồi phục,
// 6 giường bệnh bên trái, quầy Poké Mart bên phải. Vẽ bằng code, không dùng ảnh ngoài.
import Phaser from 'phaser';

export const CENTER_W = 640;
export const CENTER_H = 360;

/** vị trí 6 giường (góc trên trái, đơn vị px của ảnh 640×360) */
export const CENTER_BEDS = [0, 1, 2].flatMap((row) => [0, 1].map((col) => ({ x: 26 + col * 104, y: 134 + row * 72, w: 88, h: 48 })));
/** quầy Joy (Joy đứng sau quầy) */
export const CENTER_COUNTER = { x: 248, y: 104, w: 144, h: 40 };
/** máy hồi phục */
export const CENTER_MACHINE = { x: 404, y: 84, w: 52, h: 54 };

type RGB = [number, number, number];
const hex = (c: number): RGB => [(c >> 16) & 255, (c >> 8) & 255, c & 255];

export function generateCenterInterior(scene: Phaser.Scene, key = 'center-interior') {
  if (scene.textures.exists(key)) return;
  const W = CENTER_W;
  const H = CENTER_H;
  const tex = scene.textures.createCanvas(key, W, H);
  if (!tex) return;
  const ctx = tex.getContext();
  const img = ctx.createImageData(W, H);
  const buf = img.data;
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
  const rect = (x: number, y: number, w: number, h: number, c: number, a = 1) => {
    for (let yy = y; yy < y + h; yy++) for (let xx = x; xx < x + w; xx++) set(xx, yy, hex(c), a);
  };
  const disc = (cx: number, cy: number, r: number, c: number) => {
    for (let y = Math.floor(cy - r); y <= cy + r; y++) for (let x = Math.floor(cx - r); x <= cx + r; x++) if ((x - cx) ** 2 + (y - cy) ** 2 <= r * r) set(x, y, hex(c));
  };

  // ---- sàn gạch hồng–trắng
  for (let y = 100; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const tx = Math.floor(x / 16);
      const ty = Math.floor(y / 16);
      let c = (tx + ty) % 2 === 0 ? 0xfbeff0 : 0xf4d8de;
      if (x % 16 === 15 || y % 16 === 15) c = 0xe2bcc6;
      set(x, y, hex(c));
    }
  }
  // ---- tường kem, vạch hồng, chân tường
  rect(0, 0, W, 100, 0xf6ead8);
  for (let x = 0; x < W; x += 24) rect(x, 0, 2, 100, 0xeadcc6);
  rect(0, 84, W, 10, 0xe86a88);
  rect(0, 94, W, 6, 0xb8485e);
  // cửa sổ
  for (const wx of [36, 548]) {
    rect(wx - 3, 14, 62, 50, 0xb8485e);
    rect(wx, 17, 56, 44, 0x9ad4f4);
    rect(wx + 27, 17, 2, 44, 0xf6ead8);
    rect(wx, 38, 56, 2, 0xf6ead8);
    rect(wx + 4, 20, 10, 4, 0xe0f4ff);
  }
  // biểu tượng Poké Ball lớn trên tường phía sau quầy
  disc(320, 38, 22, 0x2a2030);
  disc(320, 38, 20, 0xf6f6f6);
  for (let y = 18; y < 38; y++) for (let x = 300; x < 341; x++) if ((x - 320) ** 2 + (y - 38) ** 2 <= 400) set(x, y, hex(0xe04848));
  rect(300, 37, 41, 3, 0x2a2030);
  disc(320, 38, 6, 0x2a2030);
  disc(320, 38, 4, 0xffffff);

  // ---- máy hồi phục: khung xám + 6 ổ bóng
  const M = CENTER_MACHINE;
  rect(M.x + 3, M.y + 4, M.w, M.h, 0x000000, 0.25);
  rect(M.x, M.y, M.w, M.h, 0x8a92a8);
  rect(M.x + 2, M.y + 2, M.w - 4, 10, 0xb8c0d4);
  rect(M.x + 4, M.y + 4, M.w - 8, 6, 0x6ad8a0);
  for (let i = 0; i < 6; i++) {
    const cx = M.x + 10 + (i % 3) * 16;
    const cy = M.y + 24 + Math.floor(i / 3) * 16;
    disc(cx, cy, 6, 0x4a5068);
    disc(cx, cy, 4, i < 4 ? 0xe04848 : 0x6a7088);
  }

  // ---- quầy Joy: mặt trên đỏ, thân trắng, viền hồng
  const C = CENTER_COUNTER;
  rect(C.x + 4, C.y + 6, C.w, C.h, 0x000000, 0.22);
  rect(C.x, C.y, C.w, C.h, 0xfafafa);
  rect(C.x, C.y, C.w, 10, 0xe04848);
  rect(C.x, C.y + 10, C.w, 2, 0xa82a3a);
  rect(C.x, C.y + C.h - 4, C.w, 4, 0xe86a88);
  for (let x = C.x + 12; x < C.x + C.w - 8; x += 24) rect(x, C.y + 18, 12, 12, 0xf4d8de);

  // ---- quầy Poké Mart bên phải: kệ hàng + quầy xanh
  rect(470, 20, 152, 70, 0x9a6a3a);
  for (let row = 0; row < 3; row++) {
    rect(474, 26 + row * 22, 144, 3, 0x6a4422);
    for (let k = 0; k < 9; k++) {
      const colors = [0xe04848, 0x4a8ae0, 0xf0d040, 0x60c050, 0xf0a0c0];
      rect(478 + k * 16, 30 + row * 22, 10, 12, colors[(k + row * 2) % colors.length]);
      rect(478 + k * 16, 30 + row * 22, 10, 3, 0xffffff, 0.5);
    }
  }
  rect(476, 168, 148, 34, 0x000000, 0.22);
  rect(472, 162, 148, 34, 0x3a6ab8);
  rect(472, 162, 148, 8, 0x5a8ae0);
  rect(472, 192, 148, 4, 0x2a4a8a);

  // ---- 6 giường bệnh
  for (const b of CENTER_BEDS) {
    rect(b.x + 3, b.y + 4, b.w, b.h, 0x000000, 0.2);
    rect(b.x, b.y, b.w, b.h, 0x9a6a3a);
    rect(b.x + 2, b.y + 2, b.w - 4, b.h - 4, 0xffffff);
    rect(b.x + 4, b.y + 6, 18, b.h - 12, 0xf0f4fa);
    rect(b.x + 24, b.y + 4, b.w - 28, b.h - 8, 0xf4a0b8);
    for (let x = b.x + 24; x < b.x + b.w - 4; x += 8) rect(x, b.y + 4, 2, b.h - 8, 0xe888a4);
    rect(b.x + 24, b.y + 4, b.w - 28, 3, 0xffd0e0);
  }
  // rèm ngăn khu giường
  rect(220, 108, 4, 236, 0xc8d8ec);
  for (let y = 112; y < 344; y += 10) rect(216, y, 12, 2, 0xa8bcd8);

  // ---- thảm cửa ra vào
  rect(284, 334, 72, 26, 0xc84858);
  rect(288, 338, 64, 18, 0xe86a7a);
  // chậu cây hai bên cửa
  for (const px of [262, 370]) {
    rect(px - 6, 330, 12, 12, 0x9a6a3a);
    disc(px, 322, 10, 0x3a9a4a);
    disc(px - 3, 318, 5, 0x6ac85a);
  }

  ctx.putImageData(img, 0, 0);
  tex.refresh();
}

/** Mặt trước quầy Joy (vẽ đè lên Joy để cô đứng sau quầy) – 144×40 px, hiển thị ×2 */
export function generateCounterFront(scene: Phaser.Scene, key = 'center-counter') {
  if (scene.textures.exists(key)) return;
  const C = CENTER_COUNTER;
  const tex = scene.textures.createCanvas(key, C.w, C.h);
  if (!tex) return;
  const ctx = tex.getContext();
  const fill = (x: number, y: number, w: number, h: number, c: string) => {
    ctx.fillStyle = c;
    ctx.fillRect(x, y, w, h);
  };
  fill(0, 0, C.w, C.h, '#fafafa');
  fill(0, 0, C.w, 10, '#e04848');
  fill(0, 10, C.w, 2, '#a82a3a');
  fill(0, C.h - 4, C.w, 4, '#e86a88');
  for (let x = 12; x < C.w - 8; x += 24) fill(x, 18, 12, 12, '#f4d8de');
  tex.refresh();
}
