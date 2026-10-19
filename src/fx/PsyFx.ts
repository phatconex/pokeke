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
