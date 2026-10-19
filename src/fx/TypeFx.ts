// Hiệu ứng vẽ chung cho 7 hệ mới (Rồng, Đá, Đất, Bay, Độc, Bọ, Thường): mảnh bắn tỏa, mảng trên nền, mạng nhện, bóng chim/rồng, thiên thạch, sóng chữ V...
import Phaser from 'phaser';

const V = (x: number, y: number) => new Phaser.Math.Vector2(x, y);

/** các mảnh (texture bất kỳ) bắn tỏa từ một điểm rồi mờ dần */
export function scatter(sc: Phaser.Scene, tex: string, x: number, y: number, n: number, dist: number, tint?: number, scale = 1.3) {
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2 + Math.random() * 0.6;
    const d = dist * (0.5 + Math.random() * 0.7);
    const img = sc.add.image(x, y, tex).setRotation(a).setDepth(y + 3000).setScale(scale * (0.8 + Math.random() * 0.5));
    if (tint !== undefined) img.setTint(tint);
    sc.tweens.add({ targets: img, x: x + Math.cos(a) * d, y: y + Math.sin(a) * d * 0.8 - 6, alpha: 0, rotation: a + (Math.random() - 0.5) * 3, duration: 320 + Math.random() * 280, ease: 'Cubic.out', onComplete: () => img.destroy() });
  }
}

/** mảng đa giác không đều trên nền (bùn, cát, tơ…) mờ dần */
export function patch(sc: Phaser.Scene, x: number, y: number, r: number, ms: number, fill: number, edge: number, alpha = 0.55) {
  const g = sc.add.graphics().setDepth(-2800);
  const pts: Phaser.Math.Vector2[] = [];
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2 + Math.random() * 0.4;
    pts.push(V(x + Math.cos(a) * r * (0.6 + Math.random() * 0.6), y + Math.sin(a) * r * (0.6 + Math.random() * 0.6) * 0.6));
  }
  g.fillStyle(fill, alpha).fillPoints(pts, true);
  g.lineStyle(2, edge, 0.85).strokePoints(pts, true);
  sc.tweens.add({ targets: g, alpha: 0, duration: 500, delay: Math.max(300, ms - 500), onComplete: () => g.destroy() });
}

/** bong bóng nổi lên rồi vỡ (vũng độc) */
export function bubbles(sc: Phaser.Scene, x: number, y: number, r: number, n: number) {
  for (let i = 0; i < n; i++) {
    const bx = x + (Math.random() - 0.5) * r * 1.6;
    const by = y + (Math.random() - 0.5) * r * 0.8;
    const g = sc.add.graphics().setPosition(bx, by).setDepth(by + 3000);
    const rad = 2 + Math.random() * 3;
    g.lineStyle(1.5, 0xe8ffb0, 1).strokeCircle(0, 0, rad);
    g.fillStyle(0xc8ff80, 0.3).fillCircle(0, 0, rad);
    sc.tweens.add({ targets: g, y: by - 14 - Math.random() * 10, alpha: 0, duration: 500 + Math.random() * 400, onComplete: () => g.destroy() });
  }
}

/** mạng nhện đa giác (n nan, rings vòng) */
export function drawWeb(g: Phaser.GameObjects.Graphics, cx: number, cy: number, R: number, n: number, rings: number, alpha = 0.9) {
  g.lineStyle(1.3, 0xffffff, alpha);
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    g.lineBetween(cx, cy, cx + Math.cos(a) * R, cy + Math.sin(a) * R * 0.8);
  }
  for (let r = 1; r <= rings; r++) {
    const pts: Phaser.Math.Vector2[] = [];
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2;
      pts.push(V(cx + Math.cos(a) * (R * r) / rings, cy + Math.sin(a) * ((R * r) / rings) * 0.8));
    }
    g.strokePoints(pts, true);
  }
}

/** sóng xung kích hình chữ V (bay lao xuống) */
export function vShock(sc: Phaser.Scene, x: number, y: number, len: number, color = 0xffffff) {
  const g = sc.add.graphics().setDepth(y + 4000);
  g.lineStyle(4, color, 1);
  g.lineBetween(x, y, x - len, y - len * 0.45).lineBetween(x, y, x + len, y - len * 0.45);
  g.lineStyle(2, 0xffffff, 0.7);
  g.lineBetween(x, y + 3, x - len * 1.3, y - len * 0.5).lineBetween(x, y + 3, x + len * 1.3, y - len * 0.5);
  sc.tweens.add({ targets: g, alpha: 0, scaleX: 1.2, duration: 360, onComplete: () => g.destroy() });
}

/** bóng chim / rồng dang cánh (đa giác), vẽ tại (0,0) – cho tween */
export function wingShape(g: Phaser.GameObjects.Graphics, s: number, fill: number, edge: number) {
  const pts = [V(0, s * 0.4), V(-s * 1.6, -s * 0.8), V(-s * 1.1, -s * 0.1), V(-s * 0.5, -s * 0.5), V(-s * 0.3, s * 0.1), V(0, -s * 0.3), V(s * 0.3, s * 0.1), V(s * 0.5, -s * 0.5), V(s * 1.1, -s * 0.1), V(s * 1.6, -s * 0.8)];
  g.fillStyle(fill, 0.85).fillPoints(pts, true);
  g.lineStyle(2, edge, 1).strokePoints(pts, true);
}

/** thiên thạch có đuôi (rơi từ (x0,y0) tới (x1,y1)) */
export function meteorFall(sc: Phaser.Scene, x0: number, y0: number, x1: number, y1: number, ms: number, size: number, onLand: () => void) {
  const g = sc.add.graphics().setDepth(99990);
  const tw = { k: 0 };
  sc.tweens.add({
    targets: tw, k: 1, duration: ms, ease: 'Quad.in',
    onUpdate: () => {
      const x = x0 + (x1 - x0) * tw.k;
      const y = y0 + (y1 - y0) * tw.k;
      g.clear();
      g.fillStyle(0xffd34a, 0.55).fillPoints([V(x - size * 0.6, y - size * 0.4), V(x + size * 0.6, y - size * 0.4), V(x - (x1 - x0) * 0.25, y - (y1 - y0) * 0.25)], true);
      g.fillStyle(0xff8a2a, 1).fillPoints([V(x, y - size), V(x + size, y - size * 0.2), V(x + size * 0.6, y + size), V(x - size * 0.8, y + size * 0.8), V(x - size, y - size * 0.1)], true);
      g.lineStyle(2, 0x5a1a0a, 1).strokePoints([V(x, y - size), V(x + size, y - size * 0.2), V(x + size * 0.6, y + size), V(x - size * 0.8, y + size * 0.8), V(x - size, y - size * 0.1)], true);
    },
    onComplete: () => {
      g.destroy();
      onLand();
    },
  });
}

/** khe nứt đen mép ráp mở ra dưới (x,y), trả về hàm đóng */
export function chasmOpen(sc: Phaser.Scene, x: number, y: number, w: number, ms: number) {
  const g = sc.add.graphics().setDepth(-2780);
  const pts: Phaser.Math.Vector2[] = [];
  const n = 10;
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    const r = w * (0.7 + ((i * 53) % 4) * 0.12);
    pts.push(V(x + Math.cos(a) * r, y + Math.sin(a) * r * 0.5));
  }
  g.fillStyle(0x0a0604, 1).fillPoints(pts, true);
  g.lineStyle(3, 0x7a5a2a, 1).strokePoints(pts, true);
  g.setAlpha(0).setScale(0.3);
  g.x = x - x * 0.3;
  g.y = y - y * 0.3;
  sc.tweens.add({ targets: g, alpha: 1, scale: 1, x: 0, y: 0, duration: 260 });
  return () => sc.tweens.add({ targets: g, alpha: 0, duration: 260, delay: ms, onComplete: () => g.destroy() });
}
