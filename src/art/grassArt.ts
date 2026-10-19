// Texture riêng của dòng Cỏ: lá nhọn có gân giữa, cánh hoa nhọn, hạt hình bầu dục – KHÔNG có quả cầu phát sáng.
import Phaser from 'phaser';
import { Ctx, makeCanvas, px } from './textures';

/** lá nhọn đầu bên phải, gân giữa sáng, nửa trên sáng / nửa dưới tối, viền tối */
function drawLeaf(ctx: Ctx, W: number, H: number, c: { dark: number; mid: number; light: number; rib: number }) {
  const cy = H / 2;
  for (let x = 0; x < W; x++) {
    const t = (x + 0.5) / W;
    const hw = (H / 2) * Math.pow(Math.sin(Math.PI * Math.min(1, t * 1.02)), 0.75) * (1 - 0.15 * t);
    for (let y = 0; y < H; y++) {
      const d = y + 0.5 - cy;
      if (Math.abs(d) > hw + 0.1) continue;
      let col = d < 0 ? c.light : c.mid;
      if (Math.abs(d) > hw - 0.9 && hw > 1.2) col = c.dark;
      if (Math.abs(d) < 0.6 && t > 0.08 && t < 0.92) col = c.rib;
      px(ctx, x, y, 1, 1, col);
    }
  }
  // cuống lá
  px(ctx, 0, Math.floor(cy), 2, 1, c.dark);
}

function drawPetal(ctx: Ctx, W: number, H: number, c: { edge: number; mid: number; light: number }) {
  const cy = H / 2;
  for (let x = 0; x < W; x++) {
    const t = (x + 0.5) / W;
    const hw = (H / 2) * Math.pow(Math.sin(Math.PI * Math.pow(t, 0.8)), 0.8);
    for (let y = 0; y < H; y++) {
      const d = y + 0.5 - cy;
      if (Math.abs(d) > hw) continue;
      let col = t < 0.4 ? c.light : c.mid;
      if (Math.abs(d) > hw - 0.8 && hw > 1.2) col = c.edge;
      px(ctx, x, y, 1, 1, col);
    }
  }
}

export function generateGrassTextures(scene: Phaser.Scene) {
  // lá chính (đạn Lá Sắc) – 3 sắc xanh
  makeCanvas(scene, 'leafA', 22, 10, (ctx) => drawLeaf(ctx, 22, 10, { dark: 0x1f5a2a, mid: 0x3f9a3a, light: 0x7cd060, rib: 0xe0ffb8 }));
  makeCanvas(scene, 'leafB', 20, 9, (ctx) => drawLeaf(ctx, 20, 9, { dark: 0x2a6a22, mid: 0x5cb23a, light: 0xa8e860, rib: 0xf4ffc8 }));
  // lá nhỏ (hạt bay, mảnh vỡ) thay cho 'leaf' cũ
  makeCanvas(scene, 'leaf', 14, 7, (ctx) => drawLeaf(ctx, 14, 7, { dark: 0x24602a, mid: 0x3f9a3a, light: 0x7cd060, rib: 0xd8ffb0 }));
  makeCanvas(scene, 'leafpuff', 6, 4, (ctx) => drawLeaf(ctx, 6, 4, { dark: 0x2f7a30, mid: 0x5fb24a, light: 0x9ae070, rib: 0xc8f890 }));
  // cánh hoa nhọn hồng
  makeCanvas(scene, 'petalP', 14, 7, (ctx) => drawPetal(ctx, 14, 7, { edge: 0xc8508a, mid: 0xf890c0, light: 0xffd0e8 }));
  makeCanvas(scene, 'petal', 8, 5, (ctx) => drawPetal(ctx, 8, 5, { edge: 0xc8508a, mid: 0xf890c0, light: 0xffd0e8 }));
  // hạt: bầu dục, đầu nhọn, nâu + xanh, có vệt sáng (KHÔNG tròn phát sáng)
  makeCanvas(scene, 'seedO', 10, 6, (ctx) => {
    for (let x = 0; x < 10; x++) {
      const t = (x + 0.5) / 10;
      const hw = 3 * Math.pow(Math.sin(Math.PI * Math.pow(t, 0.75)), 0.7);
      for (let y = 0; y < 6; y++) {
        const d = y + 0.5 - 3;
        if (Math.abs(d) > hw) continue;
        px(ctx, x, y, 1, 1, Math.abs(d) > hw - 0.8 ? 0x3a220e : d < 0 ? 0x9a6a30 : 0x6a4420);
      }
    }
    px(ctx, 2, 1, 3, 1, 0xd8a060);
    px(ctx, 8, 3, 2, 1, 0x7cd060);
  });
  // mầm non (nảy từ hạt)
  makeCanvas(scene, 'sprout', 8, 8, (ctx) => {
    px(ctx, 3, 3, 1, 5, 0x3f9a3a);
    px(ctx, 0, 1, 3, 2, 0x7cd060);
    px(ctx, 4, 0, 4, 2, 0x56b848);
    px(ctx, 1, 2, 2, 1, 0x2a6a22);
  });
  // hạt bụi bào tử (chấm vuông nhỏ lấp lánh)
  makeCanvas(scene, 'mote', 3, 3, (ctx) => {
    px(ctx, 1, 0, 1, 3, 0xffffff);
    px(ctx, 0, 1, 3, 1, 0xffffff);
  });
}
