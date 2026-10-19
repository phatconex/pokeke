// Texture nhỏ cho 7 hệ: Rồng (vảy), Đá (tảng, phiến), Đất (cục bùn), Bay (lông vũ, cung gió), Độc (cục bùn độc, kim), Bọ (con bọ), Thường (sao 5 cánh).
import Phaser from 'phaser';
import { Ctx, makeCanvas, px } from './textures';

const hexs = (c: number) => `#${c.toString(16).padStart(6, '0')}`;
function poly(ctx: Ctx, pts: [number, number][], fill: number, stroke?: number) {
  ctx.beginPath();
  pts.forEach((p, i) => (i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])));
  ctx.closePath();
  ctx.fillStyle = hexs(fill);
  ctx.fill();
  if (stroke !== undefined) {
    ctx.strokeStyle = hexs(stroke);
    ctx.lineWidth = 1;
    ctx.stroke();
  }
}

function drawBoulder(ctx: Ctx, W: number, H: number, c: { dark: number; mid: number; light: number; vein: number }) {
  const pts: [number, number][] = [];
  const n = 8;
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2 + 0.3;
    const r = (0.78 + ((i * 37) % 5) * 0.06) * 0.5;
    pts.push([W / 2 + Math.cos(a) * W * r, H / 2 + Math.sin(a) * H * r]);
  }
  poly(ctx, pts, c.mid, c.dark);
  poly(ctx, [pts[0], pts[1], pts[2], pts[3], [W / 2, H / 2]], c.light);
  poly(ctx, [pts[4], pts[5], pts[6], pts[7], [W / 2, H / 2]], c.dark);
  ctx.strokeStyle = hexs(c.vein);
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(W * 0.3, H * 0.3);
  ctx.lineTo(W * 0.55, H * 0.55);
  ctx.lineTo(W * 0.5, H * 0.8);
  ctx.stroke();
}

/** Phượng hoàng khổng lồ (ult Moltres), 3 khung vỗ cánh: wing −1 = cánh giơ lên, 0 = ngang, 1 = hạ xuống. Hướng sang phải. */
function drawPhoenix(ctx: Ctx, wing: -1 | 0 | 1) {
  const O = 0x7a1204;
  const R = 0xff3a1a;
  const OR = 0xff7a2a;
  const Y = 0xffd34a;
  const W = 0xfff4c0;
  // đuôi: 6 lông dài rủ về sau, đỏ-cam-vàng xen kẽ, đuôi lông vàng
  const tails: [number, number][] = [[2, 24], [0, 36], [4, 48], [0, 58], [8, 68], [16, 74]];
  tails.forEach(([x, y], i) => {
    poly(ctx, [[44, 40], [x, y], [46, 46]], i % 2 ? OR : R, O);
    poly(ctx, [[40, 42], [x + 4, y + (i % 2 ? 1 : -1)], [43, 44]], Y);
  });
  // cánh xa (phía sau thân, tối hơn)
  const tipsFar: Record<number, [number, number][]> = {
    [-1]: [[28, 4], [42, 0], [56, 2], [68, 8], [76, 16]],
    0: [[8, 28], [18, 18], [32, 12], [48, 10], [64, 14]],
    1: [[14, 70], [30, 78], [46, 78], [62, 72], [72, 62]],
  };
  const tipsNear: Record<number, [number, number][]> = {
    [-1]: [[22, 10], [36, 4], [52, 4], [64, 10], [74, 20]],
    0: [[4, 34], [14, 24], [28, 18], [44, 16], [60, 20]],
    1: [[8, 62], [24, 72], [42, 74], [58, 68], [70, 58]],
  };
  const wingDraw = (tips: [number, number][], cols: number[], rootY: number) => {
    tips.forEach(([x, y], i) => {
      poly(ctx, [[54, rootY - 4], [x, y], [64 + i * 2, rootY + 4]], cols[i % cols.length], O);
      poly(ctx, [[56, rootY - 2], [x + (54 - x) * 0.18, y + (rootY - y) * 0.18], [62 + i * 2, rootY + 2]], i % 2 ? Y : OR);
    });
  };
  wingDraw(tipsFar[wing], [0xc82a10, 0xe85a20], 36);
  // thân + bụng vàng
  poly(ctx, [[40, 38], [56, 30], [78, 32], [90, 38], [82, 49], [58, 54], [42, 47]], OR, O);
  poly(ctx, [[48, 44], [66, 40], [84, 42], [78, 49], [58, 52]], Y);
  poly(ctx, [[58, 36], [74, 34], [82, 38], [66, 41]], R);
  // cổ + đầu + mào + mỏ + mắt
  poly(ctx, [[78, 32], [86, 22], [96, 20], [102, 27], [94, 35], [88, 39]], R, O);
  poly(ctx, [[88, 21], [84, 9], [94, 18]], Y, O);
  poly(ctx, [[93, 19], [94, 6], [100, 19]], OR, O);
  poly(ctx, [[98, 17], [104, 8], [104, 21]], Y, O);
  poly(ctx, [[100, 25], [111, 29], [100, 31]], Y, O);
  px(ctx, 94, 24, 3, 3, 0xffffff);
  px(ctx, 96, 25, 1, 2, 0x000000);
  // chân
  ctx.strokeStyle = hexs(Y);
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(62, 54);
  ctx.lineTo(60, 62);
  ctx.moveTo(70, 53);
  ctx.lineTo(70, 61);
  ctx.stroke();
  // cánh gần (sáng hơn, phía trước thân)
  wingDraw(tipsNear[wing], [R, OR, 0xffa030], 38);
  void W;
}

export function generateTypeTextures(scene: Phaser.Scene) {
  makeCanvas(scene, 'glowBig', 128, 128, (ctx) => {
    const gr = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
    gr.addColorStop(0, 'rgba(255,255,255,0.9)');
    gr.addColorStop(0.35, 'rgba(255,255,255,0.35)');
    gr.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = gr;
    ctx.fillRect(0, 0, 128, 128);
  });
  ([-1, 0, 1] as const).forEach((w, i) => makeCanvas(scene, `phoenix${i}`, 112, 84, (ctx) => drawPhoenix(ctx, w)));
  // Đá: tảng sẫm có mặt cắt và vân quặng vàng (khác Băng: đục, xám nâu)
  makeCanvas(scene, 'boulderA', 20, 18, (ctx) => drawBoulder(ctx, 20, 18, { dark: 0x3a3028, mid: 0x6a5a4a, light: 0x8e7c68, vein: 0xe0b840 }));
  makeCanvas(scene, 'boulderB', 12, 11, (ctx) => drawBoulder(ctx, 12, 11, { dark: 0x3a3028, mid: 0x645444, light: 0x887562, vein: 0xe0b840 }));
  makeCanvas(scene, 'slabR', 24, 9, (ctx) => {
    px(ctx, 0, 0, 24, 9, 0x5a4c3e);
    px(ctx, 0, 0, 24, 3, 0x86745e);
    px(ctx, 0, 8, 24, 1, 0x2a2018);
    px(ctx, 3, 4, 8, 1, 0xe0b840);
  });
  // Đất: cục bùn nâu vàng (cát)
  makeCanvas(scene, 'mudball', 10, 9, (ctx) => {
    poly(ctx, [[1, 5], [3, 1], [7, 1], [9, 4], [8, 8], [3, 8]], 0xa88048, 0x5a3c18);
    poly(ctx, [[2, 4], [3, 2], [6, 2], [5, 5]], 0xd4b078);
  });
  // Độc: cục bùn độc xanh lục-vàng, kim độc
  makeCanvas(scene, 'goo', 12, 11, (ctx) => {
    poly(ctx, [[1, 6], [2, 2], [6, 1], [10, 3], [11, 7], [7, 10], [3, 10]], 0x7ad04a, 0x2a5a1a);
    poly(ctx, [[3, 4], [4, 3], [7, 3], [6, 5]], 0xd8f88a);
    px(ctx, 8, 6, 2, 2, 0xe8e040);
  });
  makeCanvas(scene, 'needle', 14, 3, (ctx) => {
    poly(ctx, [[0, 1], [3, 0], [14, 1.5], [3, 3]], 0x90d850, 0x2a5a1a);
    px(ctx, 4, 1, 8, 1, 0xf0f060);
  });
  // Bay: lông vũ trắng-xanh có sống và tua, cung gió mảnh
  makeCanvas(scene, 'featherA', 18, 7, (ctx) => {
    poly(ctx, [[0, 3.5], [5, 0.5], [17, 2], [16, 5], [5, 6.5]], 0xeaf4ff, 0x6a8ab0);
    px(ctx, 1, 3, 16, 1, 0x6a8ab0);
    for (let i = 3; i < 15; i += 3) px(ctx, i, 1, 1, 2, 0xa8c4e8);
  });
  // Lửa (Moltres): lông vũ cháy đỏ-cam-vàng
  makeCanvas(scene, 'fireFeather', 18, 7, (ctx) => {
    poly(ctx, [[0, 3.5], [5, 0.5], [17, 2], [16, 5], [5, 6.5]], 0xff5a2a, 0x8a1a08);
    px(ctx, 1, 3, 16, 1, 0xffd34a);
    for (let i = 4; i < 15; i += 3) px(ctx, i, 1, 1, 2, 0xff9a3a);
  });
  makeCanvas(scene, 'airarc', 22, 8, (ctx) => {
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(1, 7);
    ctx.quadraticCurveTo(11, -3, 21, 5);
    ctx.stroke();
  });
  // Bọ: con bọ li ti có cánh
  makeCanvas(scene, 'bugdot', 6, 5, (ctx) => {
    px(ctx, 2, 2, 3, 2, 0x2a2018);
    px(ctx, 1, 0, 2, 2, 0xd8f0ff, 0.9);
    px(ctx, 4, 0, 2, 2, 0xd8f0ff, 0.9);
  });
  // Thường: ngôi sao 5 cánh cổ điển
  makeCanvas(scene, 'star5', 11, 11, (ctx) => {
    const pts: [number, number][] = [];
    for (let i = 0; i < 10; i++) {
      const a = -Math.PI / 2 + (i / 10) * Math.PI * 2;
      const r = i % 2 ? 2.4 : 5.2;
      pts.push([5.5 + Math.cos(a) * r, 5.7 + Math.sin(a) * r]);
    }
    poly(ctx, pts, 0xffe14a, 0x9a6a10);
  });
  // Rồng: vảy thoi
  makeCanvas(scene, 'scaleD', 7, 9, (ctx) => {
    poly(ctx, [[3.5, 0], [7, 4.5], [3.5, 9], [0, 4.5]], 0x4a5aff, 0x10103a);
    poly(ctx, [[3.5, 1.5], [5.5, 4.5], [3.5, 5]], 0xffd34a);
  });
}
