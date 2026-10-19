// Hiệu ứng hệ Giác đấu: nắm đấm góc cạnh, vụ nổ truyện tranh răng cưa (KHÔNG phải sao đều), tia va chạm thẳng,
// đường tốc độ, nhát chặt thẳng, chữ X, đá văng. Không có vòng tròn / tia / vùng.
import Phaser from 'phaser';

const RED = 0xe8452a;
const ORG = 0xffb02a;
const YEL = 0xfff06a;
const DK = 0x2a1410;
const V = (x: number, y: number) => new Phaser.Math.Vector2(x, y);

/** vụ nổ truyện tranh: đa giác răng cưa không đều, lõi trắng */
export function powBurst(sc: Phaser.Scene, x: number, y: number, R: number, ms = 260) {
  const g = sc.add.graphics().setPosition(x, y).setDepth(y + 4000);
  const n = 11;
  const pts: Phaser.Math.Vector2[] = [];
  for (let i = 0; i < n * 2; i++) {
    const a = (i / (n * 2)) * Math.PI * 2 + Math.random() * 0.4;
    const r = i % 2 ? R * (0.42 + Math.random() * 0.18) : R * (0.85 + Math.random() * 0.3);
    pts.push(V(Math.cos(a) * r, Math.sin(a) * r * 0.85));
  }
  g.fillStyle(YEL, 1).fillPoints(pts, true);
  g.lineStyle(3, RED, 1).strokePoints(pts, true);
  g.fillStyle(0xffffff, 1).fillPoints(pts.map((p) => V(p.x * 0.55, p.y * 0.55)), true);
  g.setScale(0.3);
  sc.tweens.add({ targets: g, scale: 1, duration: ms * 0.35, ease: 'Back.out' });
  sc.tweens.add({ targets: g, alpha: 0, duration: ms * 0.5, delay: ms * 0.5, onComplete: () => g.destroy() });
}

/** các tia va chạm thẳng tỏa ra từ điểm trúng */
export function impactRays(sc: Phaser.Scene, x: number, y: number, n: number, r1: number, r2: number, color = 0xffffff, ms = 240) {
  const g = sc.add.graphics().setDepth(y + 4001);
  g.lineStyle(2.5, color, 1);
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2 + Math.random() * 0.25;
    g.lineBetween(x + Math.cos(a) * r1, y + Math.sin(a) * r1 * 0.85, x + Math.cos(a) * r2, y + Math.sin(a) * r2 * 0.85);
  }
  sc.tweens.add({ targets: g, alpha: 0, duration: ms, onComplete: () => g.destroy() });
}

/** đường tốc độ song song từ (x1,y1) tới (x2,y2) */
export function speedLines(sc: Phaser.Scene, x1: number, y1: number, x2: number, y2: number, n: number, color = 0xffffff) {
  const g = sc.add.graphics().setDepth(99000);
  const a = Math.atan2(y2 - y1, x2 - x1);
  const nx = -Math.sin(a);
  const ny = Math.cos(a);
  g.lineStyle(2, color, 0.9);
  for (let i = 0; i < n; i++) {
    const off = (i - (n - 1) / 2) * 6 + (Math.random() - 0.5) * 3;
    const t0 = Math.random() * 0.25;
    g.lineBetween(x1 + (x2 - x1) * t0 + nx * off, y1 + (y2 - y1) * t0 + ny * off, x2 + nx * off, y2 + ny * off);
  }
  sc.tweens.add({ targets: g, alpha: 0, duration: 260, onComplete: () => g.destroy() });
}

/** nhát chặt thẳng: dải trắng sáng, thon hai đầu */
export function slashBand(sc: Phaser.Scene, x1: number, y1: number, x2: number, y2: number, w: number, color = 0xffffff) {
  const g = sc.add.graphics().setDepth(99001);
  const a = Math.atan2(y2 - y1, x2 - x1);
  const nx = -Math.sin(a);
  const ny = Math.cos(a);
  const mx = (x1 + x2) / 2;
  const my = (y1 + y2) / 2;
  g.fillStyle(color, 0.95).fillPoints([V(x1, y1), V(mx + nx * w, my + ny * w), V(x2, y2), V(mx - nx * w, my - ny * w)], true);
  sc.tweens.add({ targets: g, alpha: 0, duration: 170, onComplete: () => g.destroy() });
}

/** chữ X: hai nhát chặt chéo, viền cam */
export function crossSlash(sc: Phaser.Scene, x: number, y: number, size: number) {
  const s = 40 * size;
  for (const sgn of [1, -1]) {
    const g = sc.add.graphics().setDepth(y + 4002);
    const p = [V(x - s * sgn, y - s * 0.8), V(x + s * sgn, y + s * 0.8)];
    const a = Math.atan2(p[1].y - p[0].y, p[1].x - p[0].x);
    const nx = -Math.sin(a) * 6 * size;
    const ny = Math.cos(a) * 6 * size;
    const pts = [p[0], V(x + nx, y + ny), p[1], V(x - nx, y - ny)];
    g.fillStyle(0xffffff, 0.95).fillPoints(pts, true);
    g.lineStyle(2, ORG, 1).strokePoints(pts, true);
    g.setAlpha(0);
    sc.tweens.add({ targets: g, alpha: 1, duration: 50, delay: sgn > 0 ? 0 : 70 });
    sc.tweens.add({ targets: g, alpha: 0, duration: 200, delay: 200, onComplete: () => g.destroy() });
  }
}

/** nắm đấm góc cạnh (silhouette) – trả về đối tượng vẽ để tự tween */
export function fistGfx(sc: Phaser.Scene, x: number, y: number, s: number, ang: number, color = ORG) {
  const g = sc.add.graphics().setPosition(x, y).setRotation(ang).setDepth(99002);
  const pts = [V(-10 * s, -8 * s), V(6 * s, -10 * s), V(12 * s, -4 * s), V(12 * s, 6 * s), V(4 * s, 10 * s), V(-10 * s, 8 * s)];
  g.fillStyle(color, 1).fillPoints(pts, true);
  g.lineStyle(2, DK, 1).strokePoints(pts, true);
  g.lineStyle(1.5, DK, 1);
  for (let i = 0; i < 3; i++) g.lineBetween(2 * s, (-6 + i * 5) * s, 11 * s, (-6 + i * 5) * s);
  return g;
}

/** chữ truyện tranh viền dày (vd. "K.O.!") */
export function comicText(sc: Phaser.Scene, text: string, x: number, y: number, size: number) {
  const t = sc.add.text(x, y, text, { fontFamily: 'Pixelify, PixelUI, sans-serif', fontSize: `${size}px`, color: '#e8452a', stroke: '#2a1410', strokeThickness: Math.round(size / 6) })
    .setOrigin(0.5).setScrollFactor(0).setDepth(99996).setScale(0.3).setAlpha(0);
  sc.tweens.add({ targets: t, scale: 1, alpha: 1, duration: 180, ease: 'Back.out' });
  sc.tweens.add({ targets: t, alpha: 0, duration: 300, delay: 1100, onComplete: () => t.destroy() });
}

/** nền truyện tranh toàn màn hình: trắng mờ + tia tốc độ đen phóng ra từ giữa */
export function comicOverlay(sc: Phaser.Scene) {
  const cam = sc.cameras.main;
  const W = cam.width;
  const H = cam.height;
  const g = sc.add.graphics().setScrollFactor(0).setDepth(99989).setAlpha(0);
  g.fillStyle(0xffffff, 0.55).fillRect(0, 0, W, H);
  for (let i = 0; i < 52; i++) {
    const a = (i / 52) * Math.PI * 2 + Math.random() * 0.05;
    g.lineStyle(2 + (i % 3) * 1.5, 0x1a0a08, i % 2 ? 0.85 : 0.45);
    g.lineBetween(W / 2 + Math.cos(a) * 90, H / 2 + Math.sin(a) * 70, W / 2 + Math.cos(a) * W, H / 2 + Math.sin(a) * W);
  }
  sc.tweens.add({ targets: g, alpha: 1, duration: 220 });
  return { destroy: () => sc.tweens.add({ targets: g, alpha: 0, duration: 400, onComplete: () => g.destroy() }) };
}
