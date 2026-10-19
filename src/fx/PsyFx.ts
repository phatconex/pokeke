// Hiệu ứng hệ Siêu linh: vòng ma thuật xoay (sigil), vòng elip dưới chân vật bị nhấc.
import Phaser from 'phaser';

/** vòng ma thuật: 2 elip lồng nhau + 2 tam giác (sao 6 cánh) xoay + chấm ở đỉnh; k = mức hiện (0..1) */
export function drawSigil(g: Phaser.GameObjects.Graphics, x: number, y: number, r: number, rot: number, k: number, colors: number[], alpha = 1) {
  const R = r * (0.45 + 0.55 * Math.min(1, k));
  const sq = 0.8;
  g.fillStyle(colors[1], (0.08 + 0.1 * k) * alpha).fillEllipse(x, y, R * 2, R * 2 * sq);
  g.lineStyle(3, colors[0], 0.9 * alpha).strokeEllipse(x, y, R * 2, R * 2 * sq);
  g.lineStyle(2, colors[2], 0.85 * alpha).strokeEllipse(x, y, R * 1.56, R * 1.56 * sq);
  for (let t = 0; t < 2; t++) {
    const pts: Phaser.Math.Vector2[] = [];
    for (let i = 0; i < 3; i++) {
      const a = rot * (t ? -1 : 1) + t * (Math.PI / 3) + (i / 3) * Math.PI * 2;
      pts.push(new Phaser.Math.Vector2(x + Math.cos(a) * R * 0.74, y + Math.sin(a) * R * 0.74 * sq));
    }
    g.lineStyle(2, colors[3], 0.85 * alpha).strokePoints(pts, true);
    if (t === 0) pts.forEach((p) => g.fillStyle(0xffffff, 0.9 * alpha).fillCircle(p.x, p.y, 1.6));
  }
}

/** vòng elip nhỏ dưới chân vật đang lơ lửng */
export function liftRing(g: Phaser.GameObjects.Graphics, x: number, y: number, rw: number, color: number, alpha: number) {
  g.lineStyle(2, color, alpha).strokeEllipse(x, y, rw * 2, rw * 0.9);
  g.fillStyle(0x000000, alpha * 0.25).fillEllipse(x, y, rw * 1.2, rw * 0.5);
}

/** cụm 7 ô lục giác tổ ong (1 giữa + 6 quanh) – lá chắn */
export function drawHexCluster(g: Phaser.GameObjects.Graphics, cx: number, cy: number, r: number, colors: number[], alpha: number) {
  const cells: [number, number][] = [[0, 0]];
  for (let i = 0; i < 6; i++) {
    const a = Math.PI / 6 + (i / 6) * Math.PI * 2;
    cells.push([Math.cos(a) * r * 1.75, Math.sin(a) * r * 1.75 * 0.85]);
  }
  cells.forEach(([dx, dy], k) => {
    const pts: Phaser.Math.Vector2[] = [];
    for (let i = 0; i < 6; i++) {
      const a = Math.PI / 6 + (i / 6) * Math.PI * 2;
      pts.push(new Phaser.Math.Vector2(cx + dx + Math.cos(a) * r, cy + dy + Math.sin(a) * r * 0.85));
    }
    g.fillStyle(colors[1], alpha * (0.22 + (k % 3) * 0.05)).fillPoints(pts, true);
    g.lineStyle(2, colors[3], alpha * 0.9).strokePoints(pts, true);
  });
}

/** mảnh lục giác vỡ bắn tỏa */
export function hexShatter(sc: Phaser.Scene, x: number, y: number, n: number, colors: number[]) {
  for (let k = 0; k < n; k++) {
    const g = sc.add.graphics().setPosition(x, y).setDepth(y + 4000);
    const pts: Phaser.Math.Vector2[] = [];
    for (let i = 0; i < 6; i++) pts.push(new Phaser.Math.Vector2(Math.cos((i / 6) * Math.PI * 2) * 5, Math.sin((i / 6) * Math.PI * 2) * 4.5));
    g.fillStyle(colors[2], 0.9).fillPoints(pts, true);
    g.lineStyle(1.5, 0xffffff, 1).strokePoints(pts, true);
    const a = (k / n) * Math.PI * 2 + Math.random() * 0.5;
    const d = 30 + Math.random() * 40;
    sc.tweens.add({ targets: g, x: x + Math.cos(a) * d, y: y + Math.sin(a) * d * 0.8, rotation: Math.random() * 6, alpha: 0, duration: 420 + Math.random() * 200, ease: 'Cubic.out', onComplete: () => g.destroy() });
  }
}
