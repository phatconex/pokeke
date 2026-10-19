// Cảnh nền màn hình chính (640x360, hiển thị x2): hoàng hôn trên vùng Kanto.
// Trời chuyển màu theo dải, mặt trời, mây, núi tuyết & núi lửa xa, đồi rừng, hồ phản chiếu, đồi cỏ phía trước.
import Phaser from 'phaser';

export const TITLE_W = 640;
export const TITLE_H = 360;

type RGB = [number, number, number];
const hex = (c: number): RGB => [(c >> 16) & 255, (c >> 8) & 255, c & 255];

function rng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

/** Ma trận Bayer 4x4 để chuyển màu dạng dither kiểu pixel art */
const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map((v) => (v + 0.5) / 16);

export function generateTitleScene(scene: Phaser.Scene, key: string) {
  const W = TITLE_W;
  const H = TITLE_H;
  if (scene.textures.exists(key)) scene.textures.remove(key);
  const tex = scene.textures.createCanvas(key, W, H);
  if (!tex) return;
  const ctx = tex.getContext();
  const img = ctx.createImageData(W, H);
  const buf = img.data;
  const r = rng(42);

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
  const get = (x: number, y: number): RGB => {
    const i = (Math.max(0, Math.min(H - 1, y)) * W + Math.max(0, Math.min(W - 1, x))) * 4;
    return [buf[i], buf[i + 1], buf[i + 2]];
  };

  // ---------------------------------------------------------------- bầu trời (dải màu + dither)
  const sky = [0x1a1440, 0x2e1f5e, 0x523070, 0x8a3e74, 0xc85a5e, 0xf08a4a, 0xfcb85a, 0xfde08a].map(hex);
  const horizon = 222;
  for (let y = 0; y < horizon; y++) {
    const t = Math.pow(y / horizon, 1.15) * (sky.length - 1);
    const i0 = Math.floor(t);
    const f = t - i0;
    for (let x = 0; x < W; x++) {
      const use = f > BAYER[(y % 4) * 4 + (x % 4)] ? Math.min(sky.length - 1, i0 + 1) : i0;
      set(x, y, sky[use]);
    }
  }
  // sao
  for (let i = 0; i < 70; i++) {
    const y = Math.floor(r() * 70);
    set(Math.floor(r() * W), y, [255, 255, 240], 0.4 + (1 - y / 70) * 0.6);
  }
  // mặt trời có các vạch ngang
  const sun = { x: 420, y: 178, r: 34 };
  for (let y = sun.y - sun.r; y <= sun.y + sun.r; y++) {
    for (let x = sun.x - sun.r; x <= sun.x + sun.r; x++) {
      const d = Math.hypot(x - sun.x, y - sun.y);
      if (d > sun.r) continue;
      const band = y > sun.y + 4 && (y - sun.y) % 7 < Math.min(4, (y - sun.y) / 6);
      if (band) continue;
      set(x, y, d > sun.r - 3 ? hex(0xffd070) : hex(0xfff2b0));
    }
  }
  // quầng sáng
  for (let y = sun.y - 70; y < horizon; y++) {
    for (let x = sun.x - 120; x < sun.x + 120; x++) {
      const d = Math.hypot(x - sun.x, (y - sun.y) * 1.4);
      if (d > sun.r && d < 120) set(x, y, hex(0xffe6a0), 0.18 * (1 - d / 120));
    }
  }

  // ---------------------------------------------------------------- mây
  const cloud = (cx: number, cy: number, w: number) => {
    for (let k = 0; k < w / 6; k++) {
      const bx = cx + (r() - 0.5) * w;
      const by = cy + (r() - 0.5) * 6;
      const br = 5 + r() * 7;
      for (let y = Math.floor(by - br); y <= by + br * 0.6; y++) {
        for (let x = Math.floor(bx - br * 1.6); x <= bx + br * 1.6; x++) {
          if (((x - bx) / 1.6) ** 2 + (y - by) ** 2 > br * br) continue;
          const lit = y > by + br * 0.15;
          set(x, y, lit ? hex(0xf8a070) : hex(0x8a5a8a));
        }
      }
    }
  };
  cloud(110, 58, 120);
  cloud(250, 100, 90);
  cloud(560, 70, 140);
  cloud(500, 140, 70);

  // ---------------------------------------------------------------- dãy núi xa (phủ tuyết)
  const ridge = (base: number, amp: number, freq: number, seedShift: number) => (x: number) =>
    base - Math.abs(Math.sin(x * freq + seedShift)) * amp - Math.sin(x * freq * 2.7 + seedShift * 2) * amp * 0.25;
  const far = ridge(214, 58, 0.021, 1.3);
  for (let x = 0; x < W; x++) {
    const top = Math.floor(far(x));
    for (let y = top; y < horizon + 6; y++) {
      const depth = y - top;
      const lit = Math.cos(x * 0.021 + 1.3) > 0; // sườn hướng mặt trời
      let c = lit ? hex(0x6a4a88) : hex(0x4a3470);
      if (depth < 9 && top < 175) c = lit ? hex(0xf4d0d8) : hex(0xb098c0);
      set(x, y, c);
    }
  }
  // núi lửa xa phía phải + khói, miệng núi đỏ
  const vx = 262;
  const vtop = 158;
  for (let y = vtop; y < horizon + 6; y++) {
    const half = 8 + (y - vtop) * 1.3;
    for (let x = vx - half; x <= vx + half; x++) set(x, y, x < vx ? hex(0x5a3a5a) : hex(0x3e2846));
  }
  for (let x = -8; x <= 8; x++) set(vx + x, vtop, hex(0xff7a30));
  for (let x = -6; x <= 6; x++) set(vx + x, vtop + 1, hex(0xffb050));
  for (let k = 0; k < 40; k++) {
    const sx = vx + Math.sin(k / 5) * 6 + k * 0.6;
    const sy = vtop - 4 - k * 1.6;
    for (let a = 0; a < 3; a++) set(sx + (r() - 0.5) * (4 + k / 6), sy + (r() - 0.5) * 3, hex(0x6a5070), 0.6);
  }

  // ---------------------------------------------------------------- đồi rừng giữa (thông đen)
  const mid = ridge(240, 22, 0.02, 0.4);
  for (let x = 0; x < W; x++) {
    const top = Math.floor(mid(x));
    for (let y = top; y < 262; y++) set(x, y, y - top < 3 ? hex(0x2e4a52) : hex(0x22383e));
  }
  const pine = (x: number, base: number, h: number, c: RGB) => {
    for (let k = 0; k < h; k++) {
      const half = Math.floor((k / h) * (h * 0.32)) + (k % 3 === 2 ? 1 : 0);
      for (let dx = -half; dx <= half; dx++) set(x + dx, base - h + k, c);
    }
  };
  for (let x = 4; x < W; x += 5 + Math.floor(r() * 4)) {
    if (Math.abs(x - 400) < 60 && r() < 0.6) continue;
    pine(x, Math.floor(mid(x)) + 4, 10 + Math.floor(r() * 10), hex(0x1a2c32));
  }

  // ---------------------------------------------------------------- hồ phản chiếu
  for (let y = 258; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const refl = get(x, 2 * 236 - y); // phản chiếu bầu trời phía trên
      const dark: RGB = [refl[0] * 0.55 + 10, refl[1] * 0.55 + 20, refl[2] * 0.6 + 40];
      set(x, y, dark);
      // vệt nắng lấp lánh dưới mặt trời
      if (Math.abs(x - sun.x) < 40 - (y - 258) * 0.4 && (y + Math.floor(x / 7)) % 4 === 0 && r() < 0.7) set(x, y, hex(0xffe0a0));
      else if ((y * 7 + x) % 53 === 0) set(x, y, hex(0x9a7aa0));
    }
  }

  // ---------------------------------------------------------------- đồi cỏ phía trước (trái) + bờ phải
  const hillTop = (x: number) => 262 + Math.pow(Math.max(0, x - 40) / 320, 1.8) * 120 - Math.sin(x / 40) * 4;
  const grass = [0x5fae47, 0x4f9a3e, 0x6cb84e].map(hex);
  for (let x = 0; x < W; x++) {
    const top = Math.floor(hillTop(x));
    for (let y = top; y < H; y++) {
      const depth = y - top;
      let c = grass[(x * 3 + y * 7 + Math.floor(r() * 2)) % 3];
      if (depth < 2) c = hex(0xb8e070); // viền nắng chiếu
      else if (depth < 5) c = hex(0x8ad066);
      const shade = (x / W) * 0.35 + (depth / 160) * 0.3;
      set(x, y, [c[0] * (1 - shade), c[1] * (1 - shade), c[2] * (1 - shade)]);
    }
  }
  // bờ cỏ bên phải phía trước
  for (let x = 470; x < W; x++) {
    const top = Math.floor(318 - (x - 470) * 0.25 + Math.sin(x / 9) * 2);
    for (let y = top; y < H; y++) set(x, y, y - top < 2 ? hex(0x6a9a50) : hex(0x2f5a32));
  }
  // cỏ lá, hoa trên đồi
  for (let i = 0; i < 260; i++) {
    const x = Math.floor(r() * 420);
    const y0 = Math.floor(hillTop(x)) + 2 + Math.floor(r() * (H - hillTop(x)));
    if (y0 >= H) continue;
    if (r() < 0.25) set(x, y0, [hex(0xffffff), hex(0xf4e04d), hex(0xe86a8a), hex(0xf0a040)][Math.floor(r() * 4)]);
    else {
      set(x, y0, hex(0x9ad070));
      set(x, y0 - 1, hex(0x7cc45a));
    }
  }
  // đường đất nhỏ lên đỉnh đồi
  for (let t = 0; t < 1; t += 0.004) {
    const x = 60 + t * 120 + Math.sin(t * 6) * 10;
    const y = H - t * (H - hillTop(60 + t * 120)) + 2;
    for (let w = -3 + Math.floor(t * 2); w <= 3 - Math.floor(t * 2); w++) set(x + w, y, (w + Math.floor(y)) % 3 === 0 ? hex(0x8a6a44) : hex(0xa8845a));
  }
  // chim bay xa (hình chữ V)
  for (const [bx, by, s] of [[230, 70, 3], [246, 78, 2], [262, 66, 2], [470, 110, 2]] as const) {
    for (let k = 0; k <= s; k++) {
      set(bx - k, by - k * 0.7, hex(0x2a1a40));
      set(bx + k, by - k * 0.7, hex(0x2a1a40));
    }
  }

  ctx.putImageData(img, 0, 0);
  tex.refresh();
}
