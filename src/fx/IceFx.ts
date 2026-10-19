// Hiệu ứng hệ Băng – chỉ dùng hình GÓC CẠNH, CHIỀU THẲNG ĐỨNG, HƯỚNG GIÓ:
// lăng trụ tinh thể, gai/giá băng, mảnh nhọn bắn tỏa, vết nứt phân nhánh, mảng băng rách góc, gió tuyết.
// (Không dùng vòng tròn / elip / sigil xoay – để không giống hệ Siêu linh.)
import Phaser from 'phaser';
import type { Effects } from './Effects';

const ICE = [0xe8fbff, 0xa8e4ff, 0x5ab8f0, 0x2a78c8];
const V = (x: number, y: number) => new Phaser.Math.Vector2(x, y);

/** các mảnh băng nhọn bắn tỏa ra từ một điểm (thay cho vòng nổ tròn) */
export function radialShards(sc: Phaser.Scene, x: number, y: number, n: number, dist: number, tint?: number) {
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2 + Math.random() * 0.5;
    const d = dist * (0.6 + Math.random() * 0.6);
    const img = sc.add.image(x, y, Math.random() < 0.5 ? 'iceShardB' : 'shardbit').setRotation(a).setDepth(y + 3000).setScale(0.8 + Math.random() * 0.5);
    if (tint !== undefined) img.setTint(tint);
    sc.tweens.add({ targets: img, x: x + Math.cos(a) * d, y: y + Math.sin(a) * d * 0.8, alpha: 0, duration: 320 + Math.random() * 220, ease: 'Cubic.out', onComplete: () => img.destroy() });
  }
}

/** chùm mảnh băng vỡ bắn tản */
export function shardBurst(fx: Effects, x: number, y: number, n: number) {
  radialShards(fx.scn, x, y, n, 26);
  fx.puff('flake', x, y, Math.max(1, Math.round(n / 4)));
}

/** nổ băng: mảnh nhọn bắn tỏa xa + hạt tuyết */
export function shardStar(fx: Effects, x: number, y: number, r: number) {
  radialShards(fx.scn, x, y, Math.max(10, Math.round(r / 3)), r * 1.1);
  fx.puff('flake', x, y, Math.max(3, Math.round(r / 10)));
}

/** gai băng nhọn mọc lên từ mặt đất rồi tan */
export function iceSpike(sc: Phaser.Scene, x: number, y: number, h: number, w: number) {
  const g = sc.add.graphics().setPosition(x, y).setDepth(y + 2);
  g.fillStyle(ICE[1], 1).fillTriangle(-w, 0, 0, -h, w, 0);
  g.fillStyle(ICE[2], 1).fillTriangle(0, -h, w, 0, 0, 0);
  g.lineStyle(1.5, ICE[0], 1).strokeTriangle(-w, 0, 0, -h, w, 0);
  g.setScale(1, 0.1);
  sc.tweens.add({ targets: g, scaleY: 1, duration: 140, ease: 'Back.out' });
  sc.tweens.add({ targets: g, alpha: 0, duration: 320, delay: 620, onComplete: () => g.destroy() });
}

/** tinh thể lăng trụ: thân chữ nhật, đỉnh nhọn vát, nửa phải đậm, sống sáng bên trái */
function drawPrism(g: Phaser.GameObjects.Graphics, h: number, w: number) {
  const pts = [V(-w, 0), V(-w, -h * 0.82), V(0, -h), V(w, -h * 0.82), V(w, 0)];
  g.fillStyle(ICE[1], 0.95).fillPoints(pts, true);
  g.fillStyle(ICE[2], 0.95).fillPoints([V(0, -h), V(w, -h * 0.82), V(w, 0), V(0, -h * 0.08)], true);
  g.lineStyle(2, ICE[0], 1).strokePoints(pts, true);
  g.lineStyle(2, 0xffffff, 0.85).lineBetween(-w * 0.5, -h * 0.15, -w * 0.5, -h * 0.7);
}

/** lăng trụ tinh thể mọc từ đất (Back.out), giữ rồi tan */
export function crystalPrism(sc: Phaser.Scene, x: number, y: number, h: number, w: number, holdMs = 700) {
  const g = sc.add.graphics().setPosition(x, y).setDepth(y + 2);
  drawPrism(g, h, w);
  g.setScale(1, 0.1);
  sc.tweens.add({ targets: g, scaleY: 1, duration: 170, ease: 'Back.out' });
  sc.tweens.add({ targets: g, alpha: 0, duration: 360, delay: holdMs, onComplete: () => g.destroy() });
}

/** cụm 3 tinh thể */
export function crystalCluster(sc: Phaser.Scene, x: number, y: number, s: number, holdMs = 900) {
  crystalPrism(sc, x - 13 * s, y, 30 * s, 6 * s, holdMs);
  crystalPrism(sc, x + 11 * s, y + 2, 25 * s, 5 * s, holdMs);
  crystalPrism(sc, x, y + 4, 46 * s, 9 * s, holdMs);
}

/** mảng băng rách góc (đa giác không đều) trên nền, mờ dần */
export function frostSheet(sc: Phaser.Scene, x: number, y: number, r: number, ms: number) {
  const g = sc.add.graphics().setDepth(-2800);
  const n = 7;
  const pts: Phaser.Math.Vector2[] = [];
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2 + Math.random() * 0.4;
    const rr = r * (0.55 + Math.random() * 0.65);
    pts.push(V(x + Math.cos(a) * rr, y + Math.sin(a) * rr * 0.6));
  }
  g.fillStyle(0xbfefff, 0.34).fillPoints(pts, true);
  g.lineStyle(1.5, ICE[0], 0.85).strokePoints(pts, true);
  g.lineStyle(1, 0xffffff, 0.7);
  for (let i = 0; i < 3; i++) {
    const p = pts[Math.floor(Math.random() * n)];
    g.lineBetween(x, y, p.x, p.y);
  }
  sc.tweens.add({ targets: g, alpha: 0, duration: 500, delay: Math.max(300, ms - 500), onComplete: () => g.destroy() });
}

/** vết nứt băng phân nhánh (vẽ một lần, mờ dần) */
export function frostCrack(sc: Phaser.Scene, x: number, y: number, len: number, ang: number, depth: number, ms = 1200) {
  const g = sc.add.graphics().setDepth(-2790);
  const rec = (px: number, py: number, l: number, a: number, d: number) => {
    if (d < 0 || l < 6) return;
    const ex = px + Math.cos(a) * l;
    const ey = py + Math.sin(a) * l * 0.85;
    g.lineStyle(1 + d * 0.6, 0xe6faff, 0.95).lineBetween(px, py, ex, ey);
    rec(ex, ey, l * 0.62, a + 0.55 + Math.random() * 0.3, d - 1);
    rec(ex, ey, l * 0.62, a - 0.55 - Math.random() * 0.3, d - 1);
  };
  rec(x, y, len, ang, depth);
  sc.tweens.add({ targets: g, alpha: 0, duration: 500, delay: ms, onComplete: () => g.destroy() });
}

/** bóng cảnh báo hình thoi góc cạnh trên nền (chỗ sắp có giá băng rơi) */
export function groundWarn(sc: Phaser.Scene, x: number, y: number, ms: number, edge: number = ICE[1], fill = 0x1a3a5a) {
  const g = sc.add.graphics().setDepth(-2780).setAlpha(0);
  g.fillStyle(fill, 0.4).fillPoints([V(x - 16, y + 2), V(x, y - 6), V(x + 16, y + 2), V(x, y + 10)], true);
  g.lineStyle(1.5, edge, 0.9).strokePoints([V(x - 16, y + 2), V(x, y - 6), V(x + 16, y + 2), V(x, y + 10)], true);
  sc.tweens.add({ targets: g, alpha: 1, duration: ms * 0.6 });
  sc.tweens.add({ targets: g, alpha: 0, duration: 200, delay: ms, onComplete: () => g.destroy() });
}

/** giá băng dài rơi thẳng từ trên xuống, đâm xuống đất tại (x,y) */
export function icicleDrop(sc: Phaser.Scene, x: number, y: number, h: number, w: number, fallMs: number, onLand: () => void) {
  const g = sc.add.graphics().setPosition(x, y - 170).setDepth(y + 5);
  g.fillStyle(0xbfeeff, 1).fillTriangle(-w, -h, w, -h, 0, 0);
  g.fillStyle(ICE[2], 1).fillTriangle(0, -h, w, -h, 0, 0);
  g.lineStyle(1.5, 0xffffff, 1).strokeTriangle(-w, -h, w, -h, 0, 0);
  sc.tweens.add({
    targets: g, y, duration: fallMs, ease: 'Quad.in',
    onComplete: () => {
      onLand();
      sc.tweens.add({ targets: g, alpha: 0, duration: 300, delay: 420, onComplete: () => g.destroy() });
    },
  });
}

/** vệt gió tuyết dài thổi theo hướng (dx,dy) qua một vùng */
export function windStreaks(sc: Phaser.Scene, x: number, y: number, spreadX: number, spreadY: number, dx: number, dy: number, n: number) {
  for (let i = 0; i < n; i++) {
    const sx = x + (Math.random() - 0.5) * spreadX;
    const sy = y + (Math.random() - 0.5) * spreadY;
    const len = 26 + Math.random() * 40;
    const g = sc.add.graphics().setDepth(sy + 3000);
    g.lineStyle(1.6, 0xffffff, 0.85).lineBetween(0, 0, dx * len, dy * len);
    g.setPosition(sx, sy).setAlpha(0.9);
    sc.tweens.add({ targets: g, x: sx + dx * 90, y: sy + dy * 90, alpha: 0, duration: 420 + Math.random() * 200, onComplete: () => g.destroy() });
    if (Math.random() < 0.5) {
      const f = sc.add.image(sx, sy, 'flake').setDepth(sy + 3000);
      sc.tweens.add({ targets: f, x: sx + dx * 110, y: sy + dy * 110 + 6, alpha: 0, duration: 600 + Math.random() * 300, onComplete: () => f.destroy() });
    }
  }
}

/** khối tinh thể lăng trụ cao nhốt địch trong khi còn trạng thái đóng băng */
export function iceBlock(sc: Phaser.Scene, e: { x: number; feetY: number; topY: number; radius: number; dead: boolean }, alive: () => boolean) {
  const g = sc.add.graphics().setDepth(100003);
  const fn = () => {
    if (e.dead || !alive()) {
      sc.events.off('update', fn);
      g.destroy();
      return;
    }
    const w = e.radius + 4;
    const top = e.topY - 6;
    const bot = e.feetY + 3;
    const hh = bot - top;
    g.clear();
    g.setPosition(e.x, bot);
    const pts = [V(-w, 0), V(-w, -hh * 0.86), V(0, -hh - 4), V(w, -hh * 0.86), V(w, 0)];
    g.fillStyle(0x9ae8ff, 0.42).fillPoints(pts, true);
    g.fillStyle(0x5ab8f0, 0.3).fillPoints([V(0, -hh - 4), V(w, -hh * 0.86), V(w, 0), V(0, -hh * 0.05)], true);
    g.lineStyle(2, ICE[0], 0.95).strokePoints(pts, true);
    g.lineStyle(2, 0xffffff, 0.85).lineBetween(-w + 4, -hh * 0.2, -w + 4, -hh * 0.7);
  };
  sc.events.on('update', fn);
  fn();
}

/** viền màn hình đóng băng: dải trắng-xanh mờ dần vào trong + vết nứt */
export function frostVignette(sc: Phaser.Scene) {
  const cam = sc.cameras.main;
  const W = cam.width;
  const H = cam.height;
  const g = sc.add.graphics().setScrollFactor(0).setDepth(99990).setAlpha(0);
  for (let i = 0; i < 9; i++) {
    g.fillStyle(0xc8f0ff, 0.1);
    const bx = 14 * (i + 1);
    const by = 9 * (i + 1);
    g.fillRect(0, 0, W, by).fillRect(0, H - by, W, by).fillRect(0, 0, bx, H).fillRect(W - bx, 0, bx, H);
  }
  g.lineStyle(1.5, 0xffffff, 0.85);
  for (let i = 0; i < 22; i++) {
    const side = Math.floor(Math.random() * 4);
    let px = side === 0 ? 0 : side === 1 ? W : Math.random() * W;
    let py = side === 2 ? 0 : side === 3 ? H : Math.random() * H;
    g.beginPath().moveTo(px, py);
    for (let k = 0; k < 5; k++) {
      px += (W / 2 - px) * 0.1 + (Math.random() - 0.5) * 22;
      py += (H / 2 - py) * 0.1 + (Math.random() - 0.5) * 22;
      g.lineTo(px, py);
    }
    g.strokePath();
  }
  sc.tweens.add({ targets: g, alpha: 1, duration: 420 });
  return {
    destroy: () => sc.tweens.add({ targets: g, alpha: 0, duration: 500, onComplete: () => g.destroy() }),
  };
}
