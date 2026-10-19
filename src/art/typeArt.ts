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

export function generateTypeTextures(scene: Phaser.Scene) {
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
