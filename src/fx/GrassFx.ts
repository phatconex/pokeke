// Hiệu ứng riêng của dòng Cỏ: dây leo (nét dày chia đoạn + mấu lá), bột bào tử, vết nứt đất, chùm cánh hoa, ánh sáng hội tụ vào củ,
// dây hút máu (Leech Seed). Mọi thứ vẽ bằng Graphics / sprite lá – không dùng quả cầu phát sáng cho đạn.
import Phaser from 'phaser';

type Pt = { x: number; y: number };
const V2 = (x: number, y: number) => new Phaser.Math.Vector2(x, y);

export const GRASS = {
  vineDark: 0x1f5a22,
  vineMid: 0x3f9a3a,
  vineLight: 0xb8f080,
  rootDark: 0x2a1a0c,
  sleep: [0xd8f060, 0xb8e050, 0xeaff8a],
  poison: [0xb060e0, 0x8a40c0, 0xd090ff],
  stun: [0xffe84a, 0xf8d030, 0xfff49a],
};

/** đường cong dây leo từ o tới t: vồng bend px, lượn wiggle px, phase dịch pha */
export function vinePoints(o: Pt, t: Pt, bend: number, wiggle: number, phase: number, n = 14): Phaser.Math.Vector2[] {
  const dx = t.x - o.x;
  const dy = t.y - o.y;
  const len = Math.hypot(dx, dy) || 1;
  const nx = -dy / len;
  const ny = dx / len;
  const pts: Phaser.Math.Vector2[] = [];
  for (let i = 0; i <= n; i++) {
    const k = i / n;
    const off = Math.sin(k * Math.PI) * bend + Math.sin(k * Math.PI * 3 + phase) * wiggle * Math.sin(k * Math.PI);
    pts.push(V2(o.x + dx * k + nx * off, o.y + dy * k + ny * off));
  }
  return pts;
}

/** vẽ dây leo: từng đoạn dày giảm dần (xanh đậm) + vệt sáng + mấu lá nhỏ + mũi nhọn */
export function drawVine(g: Phaser.GameObjects.Graphics, pts: Phaser.Math.Vector2[], thick: number, dark = GRASS.vineDark, mid = GRASS.vineMid, light = GRASS.vineLight, nubs = true) {
  const n = pts.length - 1;
  for (let i = 0; i < n; i++) {
    const k = i / n;
    const w = thick * (1 - 0.55 * k);
    g.lineStyle(w + 2, dark, 1).lineBetween(pts[i].x, pts[i].y, pts[i + 1].x, pts[i + 1].y);
  }
  for (let i = 0; i < n; i++) {
    const k = i / n;
    const w = thick * (1 - 0.55 * k);
    g.lineStyle(w, mid, 1).lineBetween(pts[i].x, pts[i].y, pts[i + 1].x, pts[i + 1].y);
    g.lineStyle(Math.max(1, w * 0.35), light, 0.95).lineBetween(pts[i].x - 0.6, pts[i].y - 0.8, pts[i + 1].x - 0.6, pts[i + 1].y - 0.8);
  }
  if (nubs) {
    for (let i = 2; i < n; i += 3) {
      const a = Math.atan2(pts[i + 1].y - pts[i - 1].y, pts[i + 1].x - pts[i - 1].x);
      const side = (i / 3) % 2 === 0 ? 1 : -1;
      const la = a + side * 1.0;
      const L = 4 + thick * 0.8;
      const p = pts[i];
      const tx = p.x + Math.cos(la) * L;
      const ty = p.y + Math.sin(la) * L;
      g.fillStyle(dark, 1).fillTriangle(p.x - Math.sin(la) * 1.8, p.y + Math.cos(la) * 1.8, p.x + Math.sin(la) * 1.8, p.y - Math.cos(la) * 1.8, tx, ty);
      g.fillStyle(light, 1).fillTriangle(p.x - Math.sin(la) * 0.9, p.y + Math.cos(la) * 0.9, p.x + Math.sin(la) * 0.9, p.y - Math.cos(la) * 0.9, p.x + Math.cos(la) * L * 0.85, p.y + Math.sin(la) * L * 0.85);
    }
  }
  const e = pts[n];
  const a = Math.atan2(pts[n].y - pts[n - 1].y, pts[n].x - pts[n - 1].x);
  g.fillStyle(dark, 1).fillTriangle(e.x - Math.sin(a) * 2, e.y + Math.cos(a) * 2, e.x + Math.sin(a) * 2, e.y - Math.cos(a) * 2, e.x + Math.cos(a) * 6, e.y + Math.sin(a) * 6);
  g.fillStyle(light, 1).fillTriangle(e.x - Math.sin(a), e.y + Math.cos(a), e.x + Math.sin(a), e.y - Math.cos(a), e.x + Math.cos(a) * 5, e.y + Math.sin(a) * 5);
}

export interface VineAnimOpts {
  /** gốc dây (củ trên lưng) – gọi mỗi khung để bám theo người */
  origin: () => Pt;
  /** vị trí mũi dây theo tiến độ p ∈ [0,1] (duỗi → vút → thu về) */
  tip: (p: number) => Pt;
  ms: number;
  thick: number;
  /** độ vồng theo p (mặc định 0) */
  bend?: (p: number) => number;
  wiggle?: number;
  depth?: number;
  nubs?: boolean;
  onUpdate?: (p: number, tip: Pt) => void;
  onDone?: () => void;
}

/** dây leo hoạt hình: vẽ lại mỗi khung từ gốc tới mũi */
export function vineAnim(scene: Phaser.Scene, o: VineAnimOpts) {
  const g = scene.add.graphics().setDepth(o.depth ?? 100001);
  const phase = Math.random() * 6;
  const step = (p: number) => {
    const org = o.origin();
    const tip = o.tip(p);
    const len = Math.hypot(tip.x - org.x, tip.y - org.y);
    const pts = vinePoints(org, tip, o.bend ? o.bend(p) : 0, (o.wiggle ?? 3) * Math.min(1, len / 40), phase + p * 9, 14);
    g.clear();
    drawVine(g, pts, o.thick, GRASS.vineDark, GRASS.vineMid, GRASS.vineLight, o.nubs ?? true);
    o.onUpdate?.(p, tip);
  };
  step(0);
  scene.tweens.addCounter({
    from: 0, to: 1, duration: o.ms,
    onUpdate: (tw) => step(tw.getValue() ?? 0),
    onComplete: () => {
      g.destroy();
      o.onDone?.();
    },
  });
  return g;
}

/** vệt gió mảnh sau lá bay */
export function windStreak(scene: Phaser.Scene, x: number, y: number, vx: number, vy: number, color = 0xc8f890, len = 12) {
  const sp = Math.hypot(vx, vy) || 1;
  const l = scene.add.line(0, 0, x, y, x - (vx / sp) * len, y - (vy / sp) * len, color, 0.75).setOrigin(0, 0).setLineWidth(1.1).setDepth(99990);
  scene.tweens.add({ targets: l, alpha: 0, duration: 170, onComplete: () => l.destroy() });
}

/** đường nứt zích zắc trên nền từ (x,y) theo góc a, dài len */
function crackLine(g: Phaser.GameObjects.Graphics, x: number, y: number, a: number, len: number, w: number) {
  const pts: Phaser.Math.Vector2[] = [V2(x, y)];
  let cx = x;
  let cy = y;
  let ca = a;
  const seg = 7;
  for (let d = 0; d < len; d += seg) {
    ca += (Math.random() - 0.5) * 0.9;
    cx += Math.cos(ca) * seg;
    cy += Math.sin(ca) * seg * 0.75;
    pts.push(V2(cx, cy));
    if (Math.random() < 0.18 && d > 10) {
      const ba = ca + (Math.random() < 0.5 ? 0.8 : -0.8);
      g.lineStyle(Math.max(1, w * 0.6), 0x1a1006, 0.85).lineBetween(cx, cy, cx + Math.cos(ba) * seg * 1.5, cy + Math.sin(ba) * seg * 1.1);
    }
  }
  g.lineStyle(w + 1.5, 0x120a04, 0.9).strokePoints(pts, false);
  g.lineStyle(w * 0.5, 0x5a3a1c, 0.9).strokePoints(pts, false);
}

/** vết nứt đất tỏa ra từ tâm (không phải vòng tròn): n tia dài ~len */
export function groundCracks(scene: Phaser.Scene, x: number, y: number, len: number, n: number, ms: number, baseAngle?: number) {
  const g = scene.add.graphics().setDepth(-2950);
  const a0 = baseAngle ?? Math.random() * Math.PI;
  for (let i = 0; i < n; i++) crackLine(g, x, y, a0 + (i / n) * Math.PI * 2 + (Math.random() - 0.5) * 0.4, len * (0.6 + Math.random() * 0.4), 2);
  scene.tweens.add({ targets: g, alpha: 0, delay: ms * 0.6, duration: ms * 0.4, onComplete: () => g.destroy() });
}

/** vết nứt thẳng hàng (X / đường) giữa hai điểm */
export function crackBetween(scene: Phaser.Scene, x1: number, y1: number, x2: number, y2: number, ms: number) {
  const g = scene.add.graphics().setDepth(-2950);
  const a = Math.atan2(y2 - y1, x2 - x1);
  crackLine(g, x1, y1, a, Math.hypot(x2 - x1, (y2 - y1) / 0.75), 2.5);
  scene.tweens.add({ targets: g, alpha: 0, delay: ms * 0.6, duration: ms * 0.4, onComplete: () => g.destroy() });
}

/** cánh hoa / lá bắn tỏa ra rồi tan (không phải vòng tròn): n mảnh bay xa r px */
export function leafBurst(scene: Phaser.Scene, x: number, y: number, r: number, n: number, texs: string[], ms = 520, scale = 1) {
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2 + Math.random() * 0.5;
    const d = r * (0.5 + Math.random() * 0.6);
    const im = scene.add.image(x, y - 4, texs[i % texs.length]).setScale(scale * (0.7 + Math.random() * 0.5)).setRotation(a).setDepth(99998);
    scene.tweens.add({
      targets: im, x: x + Math.cos(a) * d, y: y - 4 + Math.sin(a) * d * 0.7 - 6, rotation: a + (Math.random() < 0.5 ? 3 : -3), alpha: 0,
      duration: ms * (0.7 + Math.random() * 0.5), ease: 'Cubic.out', onComplete: () => im.destroy(),
    });
  }
}

/** đám bột bào tử hình quạt từ (x,y) theo góc ang (rad); trả về hàm dọn. Hạt mờ trôi, lấp lánh nhấp nháy. */
export function powderCloud(
  scene: Phaser.Scene, x: number, y: number, ang: number, halfDeg: number, range: number, colors: number[][], lingerMs: number, n = 36,
) {
  const items: Phaser.GameObjects.Image[] = [];
  const half = Phaser.Math.DegToRad(halfDeg);
  for (let i = 0; i < n; i++) {
    const side = (Math.random() * 2 - 1);
    const a = ang + side * half;
    const dist = range * (0.2 + 0.8 * Math.sqrt(Math.random()));
    const pal = colors[colors.length === 1 ? 0 : side < 0 ? 0 : 1];
    const tint = pal[i % pal.length];
    const tx = x + Math.cos(a) * dist;
    const ty = y + Math.sin(a) * dist * 0.8;
    const im = scene.add.image(x, y, 'softglow').setTint(tint).setAlpha(0.0).setScale(0.5).setDepth(ty + 1990);
    const sc = 1.7 + Math.random() * 2;
    scene.tweens.add({
      targets: im, x: tx, y: ty, scale: sc, alpha: 0.26 + Math.random() * 0.08, duration: 260 + dist * 1.6, ease: 'Cubic.out',
      onComplete: () => {
        scene.tweens.add({ targets: im, x: tx + (Math.random() - 0.5) * 14, y: ty - 4 - Math.random() * 6, scale: sc * 1.15, duration: lingerMs, ease: 'Sine.inOut' });
        scene.tweens.add({ targets: im, alpha: 0, delay: Math.max(0, lingerMs - 520), duration: 520, onComplete: () => im.destroy() });
      },
    });
    items.push(im);
  }
  // hạt lấp lánh
  for (let i = 0; i < Math.round(n * 0.7); i++) {
    const a = ang + (Math.random() * 2 - 1) * half;
    const dist = range * (0.15 + 0.85 * Math.random());
    const tx = x + Math.cos(a) * dist;
    const ty = y + Math.sin(a) * dist * 0.8;
    const tint = colors[Math.floor(Math.random() * colors.length)][2 % colors[0].length];
    const m = scene.add.image(x, y, 'mote').setTint(tint).setBlendMode(Phaser.BlendModes.ADD).setAlpha(0).setScale(1 + Math.random()).setDepth(99996);
    scene.tweens.add({
      targets: m, x: tx, y: ty, alpha: 0.95, duration: 300 + dist * 1.4, ease: 'Cubic.out',
      onComplete: () => {
        scene.tweens.add({ targets: m, alpha: 0.1, duration: 160 + Math.random() * 200, yoyo: true, repeat: Math.floor(lingerMs / 360), y: ty - 6 - Math.random() * 6 });
        scene.time.delayedCall(lingerMs, () => m.destroy());
      },
    });
  }
  return items;
}

/** ánh sáng xoắn ốc hội tụ vào củ trên lưng + ánh xanh-vàng ở củ (Solar Beam). Trả về hàm dừng. */
export function bulbCharge(scene: Phaser.Scene, getBulb: () => Pt, ms: number, r: number, rate: number, color: number, color2: number) {
  const glow = scene.add.image(0, 0, 'softglow').setTint(color2).setBlendMode(Phaser.BlendModes.ADD).setDepth(99997).setScale(0.3).setAlpha(0.2);
  const t0 = scene.time.now;
  const upd = () => {
    const p = Math.min(1, (scene.time.now - t0) / ms);
    const b = getBulb();
    glow.setPosition(b.x, b.y).setScale(0.5 + p * 1.5 + Math.sin(scene.time.now / 45) * 0.12).setAlpha(0.35 + p * 0.5);
  };
  scene.events.on('update', upd);
  const spawn = () => {
    const a0 = Math.random() * Math.PI * 2;
    const r0 = r * (0.7 + Math.random() * 0.5);
    const dur = 320 + Math.random() * 120;
    const m = scene.add.image(0, 0, 'mote').setTint(Math.random() < 0.5 ? color : 0xffffff).setBlendMode(Phaser.BlendModes.ADD).setDepth(99998).setScale(1.4);
    scene.tweens.addCounter({
      from: 0, to: 1, duration: dur,
      onUpdate: (tw) => {
        const k = tw.getValue() ?? 0;
        const b = getBulb();
        const rr = r0 * (1 - k);
        const a = a0 + k * 4.2;
        m.setPosition(b.x + Math.cos(a) * rr, b.y + Math.sin(a) * rr * 0.8).setAlpha(0.3 + 0.7 * k);
      },
      onComplete: () => m.destroy(),
    });
  };
  const timer = scene.time.addEvent({ delay: Math.max(16, 1000 / rate), loop: true, callback: spawn });
  return () => {
    timer.remove();
    scene.events.off('update', upd);
    scene.tweens.add({ targets: glow, alpha: 0, scale: glow.scale * 1.6, duration: 160, onComplete: () => glow.destroy() });
  };
}

/** dây hút máu giữa hai điểm (vẽ lại mỗi khung bởi người gọi) + vài xung sáng chạy từ địch về người */
export function drawTether(g: Phaser.GameObjects.Graphics, from: Pt, to: Pt, now: number, pulse: number, thick = 2.5) {
  const len = Math.hypot(to.x - from.x, to.y - from.y);
  const pts = vinePoints(from, to, Math.min(18, len * 0.12) + Math.sin(now / 280) * 2, 3.5, now / 160, 16);
  drawVine(g, pts, thick, GRASS.vineDark, GRASS.vineMid, GRASS.vineLight, true);
  // xung sáng: đoạn ngắn sáng chạy dọc dây (không phải quả cầu)
  const k0 = pulse;
  const i0 = Math.floor(k0 * (pts.length - 2));
  for (let q = 0; q < 2; q++) {
    const i = Math.min(pts.length - 2, Math.max(0, i0 - q));
    g.lineStyle(thick + 1.5 - q, 0xf4ffb0, 0.95 - q * 0.4).lineBetween(pts[i].x, pts[i].y, pts[i + 1].x, pts[i + 1].y);
  }
}

/** vệt cỏ bị rạp / cắt dọc đường tia (Solar Beam Venusaur): dải tối + gạch cỏ ngắn */
export function flattenedGrass(scene: Phaser.Scene, x: number, y: number, ang: number, len: number, w: number, ms: number) {
  const g = scene.add.graphics().setDepth(-2955);
  const ux = Math.cos(ang);
  const uy = Math.sin(ang);
  const nx = -uy;
  const ny = ux;
  g.fillStyle(0x16381a, 0.28).fillPoints([V2(x + nx * w * 0.25, y + ny * w * 0.25), V2(x + ux * len + nx * w * 0.5, y + uy * len + ny * w * 0.5), V2(x + ux * len - nx * w * 0.5, y + uy * len - ny * w * 0.5), V2(x - nx * w * 0.25, y - ny * w * 0.25)], true);
  for (let i = 0; i < len / 4; i++) {
    const d = Math.random() * len;
    const s = (Math.random() - 0.5) * w;
    const px = x + ux * d + nx * s;
    const py = y + uy * d + ny * s;
    const a = ang + (s > 0 ? 1 : -1) * (1.1 + Math.random() * 0.4);
    g.lineStyle(1.4, Math.random() < 0.5 ? 0x9ad060 : 0x2a6a22, 0.8).lineBetween(px, py, px + Math.cos(a) * 5, py + Math.sin(a) * 4);
  }
  scene.tweens.add({ targets: g, alpha: 0, delay: ms * 0.5, duration: ms * 0.5, onComplete: () => g.destroy() });
}
