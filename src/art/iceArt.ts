// Texture riêng của hệ Băng: mảnh băng nhọn có mặt cắt, bông tuyết 6 cánh, hạt tuyết, mảnh vụn – góc cạnh, không có quả cầu sáng.
import Phaser from 'phaser';
import { Ctx, makeCanvas, px } from './textures';

/** mảnh băng hình mũi tên lệch (nhọn đầu bên phải), nửa trên sáng / nửa dưới đậm, sống giữa trắng */
function drawShard(ctx: Ctx, W: number, H: number, c: { dark: number; mid: number; light: number; edge: number }) {
  const cy = H / 2;
  for (let x = 0; x < W; x++) {
    const t = (x + 0.5) / W;
    const hw = (H / 2) * (t < 0.62 ? t / 0.62 : (1 - t) / 0.38);
    for (let y = 0; y < H; y++) {
      const d = y + 0.5 - cy;
      if (Math.abs(d) > hw + 0.1) continue;
      let col = d < 0 ? c.light : c.mid;
      if (Math.abs(d) > hw - 0.9 && hw > 1.2) col = c.dark;
      if (Math.abs(d) < 0.55 && t > 0.12 && t < 0.92) col = c.edge;
      px(ctx, x, y, 1, 1, col);
    }
  }
}

export function generateIceTextures(scene: Phaser.Scene) {
  makeCanvas(scene, 'iceShardA', 22, 10, (ctx) => drawShard(ctx, 22, 10, { dark: 0x2a78c8, mid: 0x5ab8f0, light: 0xa8e4ff, edge: 0xffffff }));
  makeCanvas(scene, 'iceShardB', 16, 7, (ctx) => drawShard(ctx, 16, 7, { dark: 0x2a78c8, mid: 0x6ac4f4, light: 0xbfeeff, edge: 0xffffff }));
  makeCanvas(scene, 'shardbit', 6, 3, (ctx) => drawShard(ctx, 6, 3, { dark: 0x5ab8f0, mid: 0x9ad8ff, light: 0xe8fbff, edge: 0xffffff }));
  // bông tuyết 9×9: 4 nan + 4 nan chéo ngắn
  makeCanvas(scene, 'flake', 9, 9, (ctx) => {
    px(ctx, 4, 4, 1, 1, 0xffffff);
    for (let k = -4; k <= 4; k++) {
      px(ctx, 4 + k, 4, 1, 1, Math.abs(k) > 2 ? 0xbfeeff : 0xffffff);
      px(ctx, 4, 4 + k, 1, 1, Math.abs(k) > 2 ? 0xbfeeff : 0xffffff);
    }
    for (let k = -2; k <= 2; k++) {
      px(ctx, 4 + k, 4 + k, 1, 1, 0xdff6ff);
      px(ctx, 4 + k, 4 - k, 1, 1, 0xdff6ff);
    }
  });
  makeCanvas(scene, 'snowdot', 3, 3, (ctx) => {
    px(ctx, 1, 0, 1, 3, 0xffffff);
    px(ctx, 0, 1, 3, 1, 0xe8fbff);
  });
}
