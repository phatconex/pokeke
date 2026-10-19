// Khuôn chiêu của 3 chim huyền thoại. Moltres: Lông Lửa (arcshot) · Lướt Phượng Hoàng (phoenixdash) · Cánh Chữ X (xslash) · Tái Sinh Phượng Hoàng (phoenix).
/* eslint-disable @typescript-eslint/no-explicit-any */
import Phaser from 'phaser';
import type { Enemy } from '../entities/Enemy';
import type { Fighter } from '../entities/Fighter';
import type { MoveDef } from '../data/moveKit';
import type { UltimateDef } from '../data/ultimates';
import { groundWarn, radialShards } from '../fx/IceFx';
import { scatter } from '../fx/TypeFx';
import { playSfx } from '../systems/sfx';
import { dialectFor } from './dialects';
import type { SkillHost } from './host';
import type { LooseParams } from './types';

const V = (x: number, y: number) => new Phaser.Math.Vector2(x, y);
const aimOf = (h: SkillHost, f: Fighter, dir: Phaser.Math.Vector2) => {
  const t = h.aimTarget;
  const v = t && !t.dead ? V(t.x - f.x, t.centerY - f.chestY) : dir.clone();
  return v.lengthSq() < 0.0001 ? V(f.facing.x || 1, f.facing.y).normalize() : v.normalize();
};

/** Lông Lửa: 3 lông vũ cháy bay vòng cung (mỗi cái một độ cong) về phía mục tiêu, rải tàn lửa; trúng = Bỏng */
export function castArcShot(h: SkillHost, f: Fighter, m: MoveDef, P: LooseParams, dir: Phaser.Math.Vector2) {
  const sc = h.scene;
  const d = dialectFor(P.dialect ?? 'fire', h.fx, m, h);
  const mult = h.stackMult(f, m);
  f.playMove(m);
  playSfx(m.sfx);
  const a = aimOf(h, f, dir);
  f.faceTo(a.x, a.y);
  const range = P.range ?? 170;
  const flyMs = P.flyMs ?? 520;
  const n = P.n ?? 3;
  const amount = (m.power * f.power * mult * (P.powerMult ?? 1)) / Math.max(1, n * 0.7);
  const sx = f.x + a.x * 8;
  const sy = f.chestY;
  const nx = -a.y;
  const ny = a.x;
  for (let i = 0; i < n; i++) {
    const off = (i - (n - 1) / 2) * (P.curve ?? 46);
    const ex = sx + a.x * range + nx * off * 0.35;
    const ey = sy + a.y * range * 0.8 + ny * off * 0.35;
    const cx = (sx + ex) / 2 + nx * off;
    const cy = (sy + ey) / 2 + ny * off;
    const img = sc.add.image(sx, sy, P.tex ?? 'fireFeather').setDepth(99993).setScale(P.scale ?? 1.3);
    const t0 = h.clock + i * 70;
    const hit = new Set<Enemy>();
    h.addFrameTask(flyMs + i * 70, (now) => {
      const k = Phaser.Math.Clamp((now - t0) / flyMs, 0, 1);
      const x = (1 - k) * (1 - k) * sx + 2 * (1 - k) * k * cx + k * k * ex;
      const y = (1 - k) * (1 - k) * sy + 2 * (1 - k) * k * cy + k * k * ey;
      const k2 = Math.min(1, k + 0.03);
      const x2 = (1 - k2) * (1 - k2) * sx + 2 * (1 - k2) * k2 * cx + k2 * k2 * ex;
      const y2 = (1 - k2) * (1 - k2) * sy + 2 * (1 - k2) * k2 * cy + k2 * k2 * ey;
      img.setPosition(x, y).setRotation(Math.atan2(y2 - y, x2 - x)).setVisible(now >= t0);
      if (now < t0) return;
      if (Math.random() < 0.7) d.trail(x, y, 1);
      for (const e of h.enemies()) {
        if (!e.targetable || hit.has(e) || Math.hypot(e.x - x, (e.centerY - y) / 0.8) > 12 + e.radius) continue;
        hit.add(e);
        h.damageEnemy(e, m, amount, a.x, a.y, false);
        e.applyStatus('burn', 2200, h.clock, amount * 0.12);
        d.hit(e.x, e.centerY, false);
      }
    }, () => {
      img.destroy();
      scatter(sc, 'fireFeather', ex, ey, 3, 16, undefined, 0.8);
    });
  }
}

/** Lướt Phượng Hoàng: hóa bóng lửa hình chim lao thẳng (bất tử), xuyên địch, để lại TƯỜNG LỬA dọc đường đi */
export function castPhoenixDash(h: SkillHost, f: Fighter, m: MoveDef, P: LooseParams, dir: Phaser.Math.Vector2) {
  const sc = h.scene;
  const d = dialectFor(P.dialect ?? 'fire', h.fx, m, h);
  const mult = h.stackMult(f, m);
  playSfx('flame');
  const a = aimOf(h, f, dir);
  f.faceTo(a.x, a.y);
  const len = P.len ?? 170;
  const ms = P.ms ?? 260;
  const spr = f.anim.sprite;
  f.invulnUntil = Math.max(f.invulnUntil, h.clock + ms + 150);
  spr.setAlpha(0.15);
  const g = sc.add.graphics().setDepth(99994);
  const sx = f.x;
  const sy = f.y;
  const t0 = h.clock;
  const hit = new Set<Enemy>();
  const amount = m.power * f.power * mult * (P.powerMult ?? 1);
  const wallAt = [0.2, 0.4, 0.6, 0.8, 1];
  let wallIdx = 0;
  const nx = -a.y;
  const ny = a.x;
  h.addFrameTask(ms, (now) => {
    const k = Math.min(1, (now - t0) / ms);
    const x = sx + a.x * len * k;
    const y = sy + a.y * len * k * 0.85;
    f.body.reset(Phaser.Math.Clamp(x, 16, h.worldW - 16), Phaser.Math.Clamp(y, 16, h.worldH - 16));
    g.clear();
    const flap = Math.sin(now / 35);
    const cy = y - 8;
    const sgn = a.x >= 0 ? 1 : -1;
    // bóng chim lửa: thân thoi + 2 cánh nhọn vỗ + đuôi lông
    g.fillStyle(0xff5a2a, 0.9).fillPoints([V(x + 22 * sgn, cy), V(x, cy - 7), V(x - 26 * sgn, cy), V(x, cy + 7)], true);
    g.fillStyle(0xffd34a, 0.95).fillPoints([V(x + 8 * sgn, cy - 3), V(x - 8 * sgn, cy - 18 - 8 * flap), V(x - 20 * sgn, cy - 2)], true);
    g.fillStyle(0xffd34a, 0.95).fillPoints([V(x + 8 * sgn, cy + 3), V(x - 8 * sgn, cy + 18 + 8 * flap), V(x - 20 * sgn, cy + 2)], true);
    g.lineStyle(2, 0xffffff, 0.9).strokePoints([V(x + 22 * sgn, cy), V(x, cy - 7), V(x - 26 * sgn, cy), V(x, cy + 7)], true);
    for (let i = 0; i < 3; i++) d.trail(x - a.x * (10 + i * 8), y + 4, 1);
    for (const e of h.enemies()) {
      if (!e.targetable || hit.has(e) || Math.hypot(e.x - x, (e.centerY - y) / 0.8) > 26 + e.radius) continue;
      hit.add(e);
      h.damageEnemy(e, m, amount, a.x, a.y, true);
      d.hit(e.x, e.centerY, true);
      e.applyStatus('burn', 2600, h.clock, amount * 0.1);
    }
    while (wallIdx < wallAt.length && k >= wallAt[wallIdx]) {
      const wx = sx + a.x * len * wallAt[wallIdx];
      const wy = sy + a.y * len * wallAt[wallIdx] * 0.85;
      const jitter = (wallIdx % 2 ? 1 : -1) * 5;
      const zmove: MoveDef = { ...m, id: `${m.id}Wall`, knockback: 0, zone: { radius: 16, ms: P.wallMs ?? 3000, tickMs: 450 } };
      h.addZone({ x: wx + nx * jitter, y: wy + ny * jitter, r: 17, ms: P.wallMs ?? 3000, firstTickMs: 350, move: zmove, power: amount * 0.22, color: 0xff6a20 });
      d.pillar(wx, wy, 2);
      wallIdx++;
    }
  }, () => {
    g.destroy();
    spr.setAlpha(1);
    if (h.over) return;
    h.fx.shake(0.008, 140);
    d.explosion(f.x, f.y, 16);
  });
}

/** Cánh Chữ X: hai nhát cánh lửa dày chém chéo thành chữ X to trước mặt (đỏ → cam → lõi vàng trắng, lưỡi lửa dọc mép), để lại vết cháy chữ X trên nền */
export function castXSlash(h: SkillHost, f: Fighter, m: MoveDef, P: LooseParams, dir: Phaser.Math.Vector2) {
  const sc = h.scene;
  const d = dialectFor(P.dialect ?? 'fire', h.fx, m, h);
  const mult = h.stackMult(f, m);
  f.playMove(m);
  playSfx('flame');
  const a = aimOf(h, f, dir);
  f.faceTo(a.x, a.y);
  const reach = P.reach ?? 62;
  const R = reach * 1.9;
  const cx = f.x + a.x * reach * 0.9;
  const cy = f.chestY + a.y * reach * 0.9 * 0.8;
  const amount = m.power * f.power * mult * (P.powerMult ?? 1);
  const base = Math.atan2(a.y, a.x);
  const strokes = [{ ang: base - 0.8, sgn: 1 }, { ang: base + 0.8, sgn: -1 }];
  const hit = new Set<Enemy>();
  const LIFE = 420;
  strokes.forEach((st, i) => {
    h.schedule(h.clock + i * 150, () => {
      if (h.over) return;
      const g = sc.add.graphics().setDepth(99995);
      const t0 = h.clock;
      const ux = Math.cos(st.ang + Math.PI / 2) * st.sgn;
      const uy = Math.sin(st.ang + Math.PI / 2) * st.sgn;
      const bx = Math.cos(st.ang);
      const by = Math.sin(st.ang);
      h.addFrameTask(LIFE, (now) => {
        const el = now - t0;
        const k = Math.min(1, el / 150);
        const fade = 1 - Math.max(0, (el - 150) / (LIFE - 150));
        g.clear();
        // cung lưỡi liềm: dài từ -R đến -R + 2R*k, bụng cong về phía chém, dày ở giữa
        const N = 18;
        const head = k;
        const tail = Math.max(0, head - 0.75);
        const pts = (wMul: number) => {
          const top: Phaser.Math.Vector2[] = [];
          const bot: Phaser.Math.Vector2[] = [];
          for (let j = 0; j <= N; j++) {
            const tt = tail + ((head - tail) * j) / N;
            const along = (tt - 0.5) * 2 * R;
            const bow = Math.sin(tt * Math.PI) * 26;
            const thick = Math.sin(((tt - tail) / Math.max(0.01, head - tail)) * Math.PI) * 17 * wMul;
            const px = cx + ux * along + bx * bow;
            const py = cy + (uy * along + by * bow) * 0.8;
            top.push(V(px + bx * thick, py + by * thick * 0.8));
            bot.push(V(px - bx * thick, py - by * thick * 0.8));
          }
          return top.concat(bot.reverse());
        };
        g.fillStyle(0xff3a1a, 0.9 * fade).fillPoints(pts(1), true);
        g.fillStyle(0xff8a2a, 0.95 * fade).fillPoints(pts(0.62), true);
        g.fillStyle(0xfff0a0, fade).fillPoints(pts(0.28), true);
        // lưỡi lửa dọc mép ngoài
        for (let j = 1; j < 10; j++) {
          const tt = tail + ((head - tail) * j) / 10;
          const along = (tt - 0.5) * 2 * R;
          const bow = Math.sin(tt * Math.PI) * 26 + 17 * Math.sin(((tt - tail) / Math.max(0.01, head - tail)) * Math.PI);
          const fl = 8 + 8 * Math.abs(Math.sin(now / 50 + j * 1.9));
          const px = cx + ux * along + bx * bow;
          const py = cy + (uy * along + by * bow) * 0.8;
          g.fillStyle(j % 2 ? 0xffb02a : 0xff5a2a, 0.9 * fade).fillTriangle(px - ux * 4, py - uy * 3, px + ux * 4, py + uy * 3, px + bx * fl, py + by * fl * 0.8);
        }
        if (k > 0.25) {
          for (const e of h.enemies()) {
            if (!e.targetable || hit.has(e)) continue;
            const rx = e.x - cx;
            const ry = (e.centerY - cy) / 0.8;
            const along = rx * ux + ry * uy;
            const side = Math.abs(rx * bx + ry * by);
            if (Math.abs(along) > R * 0.95 || side > 30 + e.radius) continue;
            hit.add(e);
            h.damageEnemy(e, m, amount * 0.6, a.x, a.y, true);
            e.applyStatus('burn', 2600, h.clock, amount * 0.1);
            d.hit(e.x, e.centerY, true);
            scatter(sc, 'fireFeather', e.x, e.centerY, 4, 24, undefined, 0.9);
          }
        }
        const t2 = Math.random() * 2 - 1;
        if (Math.random() < 0.9) scatter(sc, 'fireFeather', cx + ux * t2 * R, cy + uy * t2 * R * 0.8, 1, 18, undefined, 0.7);
        if (Math.random() < 0.9) d.trail(cx + ux * t2 * R, cy + uy * t2 * R * 0.8, 1);
      }, () => g.destroy());
      if (i === 1) {
        h.fx.shake(0.012, 200);
        playSfx('hit');
        d.explosion(cx, cy, 26);
        h.hitStop(80);
        // vết cháy chữ X trên nền: hai dải than đen có đường lửa đỏ
        const mark = sc.add.graphics().setDepth(-2790);
        strokes.forEach((s2) => {
          const ex = Math.cos(s2.ang + Math.PI / 2) * s2.sgn;
          const ey = Math.sin(s2.ang + Math.PI / 2) * s2.sgn;
          mark.lineStyle(5, 0x1a0a04, 0.55).lineBetween(cx - ex * R * 0.85, cy - ey * R * 0.85 * 0.8, cx + ex * R * 0.85, cy + ey * R * 0.85 * 0.8);
          mark.lineStyle(1.5, 0xff6a20, 0.8).lineBetween(cx - ex * R * 0.8, cy - ey * R * 0.8 * 0.8, cx + ex * R * 0.8, cy + ey * R * 0.8 * 0.8);
        });
        sc.tweens.add({ targets: mark, alpha: 0, delay: 1500, duration: 900, onComplete: () => mark.destroy() });
      }
    });
  });
}

/** Tái Sinh Phượng Hoàng (tuyệt chiêu): phượng hoàng khổng lồ (pixel art, vỗ cánh) bay vòng qua cả màn hình kéo đuôi sao chổi lửa, thiêu mọi địch rồi nổ mưa lông; HỒI 30% máu */
export function castPhoenix(h: SkillHost, f: Fighter, P: LooseParams, _u: UltimateDef, mv: MoveDef, amount: number) {
  if (h.over) return;
  const sc = h.scene;
  const cam = sc.cameras.main;
  const d = dialectFor('fire', h.fx, mv, h);
  cam.flash(260, 255, 150, 40, false);
  h.fx.shake(0.012, 600);
  playSfx('roar');
  const tint = sc.add.rectangle(0, 0, cam.width, cam.height, 0x5a1a08, 0).setOrigin(0).setScrollFactor(0).setDepth(99987);
  sc.tweens.add({ targets: tint, fillAlpha: 0.4, duration: 300 });
  const total = P.ms ?? 2000;
  sc.time.delayedCall(total + 500, () => sc.tweens.add({ targets: tint, fillAlpha: 0, duration: 500, onComplete: () => tint.destroy() }));
  const wv = cam.worldView;
  const dirX = f.facing.x >= 0 ? 1 : -1;
  const x0 = dirX > 0 ? wv.x - 150 : wv.right + 150;
  const x1 = dirX > 0 ? wv.right + 150 : wv.x - 150;
  const yMid = Phaser.Math.Clamp(f.y - 10, wv.y + 90, wv.bottom - 70);
  const S = P.size ?? 1.7;
  const bird = sc.add.image(x0, yMid, 'phoenix1').setScale(S).setDepth(99997).setFlipX(dirX < 0);
  const glow = sc.add.image(x0, yMid, 'glowBig').setScale(3.4).setTint(0xff6a20).setAlpha(0.45).setBlendMode(Phaser.BlendModes.ADD).setDepth(99996);
  const shadow = sc.add.ellipse(x0, yMid, 150, 26, 0x000000, 0.28).setDepth(-2700);
  const ribbon = sc.add.graphics().setDepth(99995);
  const pts: { x: number; y: number }[] = [];
  const hit = new Set<Enemy>();
  const t0 = h.clock;
  h.addFrameTask(total, (now) => {
    const k = Math.min(1, (now - t0) / total);
    const ease = k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;
    const x = x0 + (x1 - x0) * (0.15 * k + 0.85 * ease);
    const y = yMid - Math.sin(k * Math.PI) * 30 + Math.sin(k * 11) * 6;
    const fr = [0, 1, 2, 1][Math.floor(now / 85) % 4];
    bird.setTexture(`phoenix${fr}`).setPosition(x, y);
    glow.setPosition(x - dirX * 20, y).setAlpha(0.4 + 0.1 * Math.sin(now / 60));
    shadow.setPosition(x, Math.min(wv.bottom - 10, y + 70));
    pts.push({ x: x - dirX * 30 * S, y: y + 6 });
    if (pts.length > 22) pts.shift();
    ribbon.clear();
    for (let i = 1; i < pts.length; i++) {
      const w = (i / pts.length) * 30 * S;
      ribbon.lineStyle(w, 0xff3a1a, 0.55 * (i / pts.length)).lineBetween(pts[i - 1].x, pts[i - 1].y, pts[i].x, pts[i].y);
      ribbon.lineStyle(w * 0.55, 0xff9a2a, 0.7 * (i / pts.length)).lineBetween(pts[i - 1].x, pts[i - 1].y, pts[i].x, pts[i].y);
      ribbon.lineStyle(w * 0.2, 0xfff0a0, 0.9 * (i / pts.length)).lineBetween(pts[i - 1].x, pts[i - 1].y, pts[i].x, pts[i].y);
    }
    for (let i = 0; i < 3; i++) d.trail(x - dirX * (30 + i * 24) * S * 0.6, y + (Math.random() - 0.5) * 50, 1);
    if (Math.random() < 0.7) scatter(sc, 'fireFeather', x - dirX * 40 * S * 0.6, y + (Math.random() - 0.5) * 60, 1, 34, undefined, 1.3);
    // thiêu mặt đất bên dưới: cột lửa nhỏ nổi lên dọc đường bay
    if (Math.random() < 0.35) {
      const gy = Math.min(wv.bottom - 14, y + 66 + Math.random() * 10);
      d.pillar(x - dirX * Math.random() * 60, gy, 2);
    }
    for (const e of h.enemies()) {
      if (!e.targetable || hit.has(e)) continue;
      if (Math.hypot(e.x - x, (e.centerY - y) / 0.9) > 70 * S * 0.7 + e.radius + 20) continue;
      hit.add(e);
      scatter(sc, 'fireFeather', e.x, e.centerY, 10, 46, undefined, 1.3);
      d.pillar(e.x, e.y + 4, 4);
      h.damageEnemy(e, mv, amount * (P.hitPower ?? 1), dirX, 0, true);
      e.applyStatus('burn', 3500, h.clock, amount * 0.06);
      d.hit(e.x, e.centerY, true);
      h.fx.shake(0.01, 120);
    }
  }, () => {
    bird.destroy();
    glow.destroy();
    shadow.destroy();
    ribbon.destroy();
    if (h.over) return;
    cam.flash(300, 255, 200, 90, false);
    h.fx.shake(0.02, 400);
    playSfx('boom');
    for (let i = 0; i < 26; i++) {
      h.schedule(h.clock + i * 28, () => {
        const fx = wv.x + 30 + Math.random() * (wv.width - 60);
        const fy = wv.y + 30 + Math.random() * (wv.height - 60);
        scatter(sc, 'fireFeather', fx, fy, 3, 34, undefined, 1.3);
        d.explosion(fx, fy, 12);
      });
    }
    const heal = Math.round(f.maxHp * (P.healPct ?? 0.3));
    f.heal(heal);
    h.fx.floatingLabel(f.x, f.chestY - 30, `+${heal}`, '#ffb02a');
    scatter(sc, 'fireFeather', f.x, f.chestY, 16, 56, undefined, 1.5);
  });
}

// ============================================================================================ ZAPDOS
const jag = (x1: number, y1: number, x2: number, y2: number, n = 7, j = 9) => {
  const pts = [V(x1, y1)];
  for (let i = 1; i < n; i++) {
    const t = i / n;
    pts.push(V(x1 + (x2 - x1) * t + (Math.random() - 0.5) * j * 2, y1 + (y2 - y1) * t + (Math.random() - 0.5) * j * 2));
  }
  pts.push(V(x2, y2));
  return pts;
};
const strokeJag = (g: Phaser.GameObjects.Graphics, pts: Phaser.Math.Vector2[], col: number, w: number, a = 1) => {
  g.lineStyle(w, col, a);
  g.beginPath();
  pts.forEach((p, i) => (i ? g.lineTo(p.x, p.y) : g.moveTo(p.x, p.y)));
  g.strokePath();
};
const YEL = 0xffe04a;
const distSeg = (px: number, py: number, x1: number, y1: number, x2: number, y2: number) => {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const l2 = dx * dx + dy * dy || 1;
  const t = Phaser.Math.Clamp(((px - x1) * dx + (py - y1) * dy) / l2, 0, 1);
  return Math.hypot(px - (x1 + dx * t), py - (y1 + dy * t));
};

/** Chớp Phân Nhánh: sét zic-zắc tức thời nhảy qua tối đa 3 địch gần nhất, mỗi mắt xích rẽ nhánh nhỏ */
export function castForkBolt(h: SkillHost, f: Fighter, m: MoveDef, P: LooseParams, dir: Phaser.Math.Vector2) {
  const sc = h.scene;
  const d = dialectFor('electric', h.fx, m, h);
  const mult = h.stackMult(f, m);
  f.playMove(m);
  playSfx('zap');
  const a = aimOf(h, f, dir);
  f.faceTo(a.x, a.y);
  const hits: Enemy[] = [];
  let px = f.x + a.x * 8;
  let py = f.chestY;
  const path: { x: number; y: number }[] = [{ x: px, y: py }];
  const first = h.aimTarget && !h.aimTarget.dead ? h.aimTarget : null;
  for (let i = 0; i < (P.jumps ?? 3); i++) {
    let best: Enemy | null = i === 0 ? first : null;
    let bd = i === 0 ? 1e9 : P.jumpRange ?? 130;
    if (!best) {
      for (const e of h.enemies()) {
        if (!e.targetable || hits.includes(e)) continue;
        const dd = Math.hypot(e.x - px, e.centerY - py);
        if (dd < bd && dd < (i === 0 ? P.range ?? 200 : bd)) {
          bd = dd;
          best = e;
        }
      }
    }
    if (!best) break;
    hits.push(best);
    px = best.x;
    py = best.centerY;
    path.push({ x: px, y: py });
  }
  if (!hits.length) path.push({ x: f.x + a.x * (P.range ?? 200) * 0.7, y: f.chestY + a.y * (P.range ?? 200) * 0.56 });
  const g = sc.add.graphics().setDepth(99995);
  const lines: Phaser.Math.Vector2[][] = [];
  const forks: Phaser.Math.Vector2[][] = [];
  for (let i = 1; i < path.length; i++) {
    lines.push(jag(path[i - 1].x, path[i - 1].y, path[i].x, path[i].y, 7, 9));
    for (let k = 0; k < (P.forks ?? 2); k++) {
      const t = 0.25 + Math.random() * 0.5;
      const bx = path[i - 1].x + (path[i].x - path[i - 1].x) * t;
      const by = path[i - 1].y + (path[i].y - path[i - 1].y) * t;
      const ang = Math.atan2(path[i].y - path[i - 1].y, path[i].x - path[i - 1].x) + (Math.random() < 0.5 ? -1 : 1) * (0.6 + Math.random() * 0.5);
      const L = 16 + Math.random() * 14;
      forks.push(jag(bx, by, bx + Math.cos(ang) * L, by + Math.sin(ang) * L * 0.8, 3, 4));
    }
  }
  const amount = (m.power * f.power * mult * (P.powerMult ?? 1)) / Math.max(1, hits.length * 0.55);
  const t0 = h.clock;
  h.addFrameTask(170, (now) => {
    const fade = 1 - (now - t0) / 170;
    g.clear();
    for (const l of lines) {
      strokeJag(g, l, YEL, 5, 0.9 * fade);
      strokeJag(g, l, 0xffffff, 1.8, fade);
    }
    for (const fk of forks) {
      strokeJag(g, fk, YEL, 2.5, 0.9 * fade);
    }
  }, () => g.destroy());
  hits.forEach((e, i) => {
    h.schedule(h.clock + i * 55, () => {
      if (e.dead || h.over) return;
      h.damageEnemy(e, m, amount, a.x, a.y, i === hits.length - 1);
      d.hit(e.x, e.centerY, true);
      scatter(sc, 'spark', e.x, e.centerY, 4, 18, YEL, 1);
    });
  });
}

/** Chớp Dịch Chuyển: dịch chuyển xuyên địch (bất tử, 3 ảo ảnh vàng), vệt sét dọc đường, kết thúc bằng tiếng sấm nổ */
export function castBlink(h: SkillHost, f: Fighter, m: MoveDef, P: LooseParams, dir: Phaser.Math.Vector2) {
  const sc = h.scene;
  const d = dialectFor('electric', h.fx, m, h);
  const mult = h.stackMult(f, m);
  playSfx('zap');
  const a = aimOf(h, f, dir);
  f.faceTo(a.x, a.y);
  const len = P.len ?? 190;
  const sx = f.x;
  const sy = f.y;
  const ex = Phaser.Math.Clamp(sx + a.x * len, 20, h.worldW - 20);
  const ey = Phaser.Math.Clamp(sy + a.y * len * 0.85, 20, h.worldH - 20);
  const spr = f.anim.sprite;
  f.invulnUntil = Math.max(f.invulnUntil, h.clock + 420);
  const key = spr.texture.key;
  const frame = spr.frame.name;
  [0, 0.34, 0.68].forEach((k, i) => {
    const gx = sx + (ex - sx) * k;
    const gy = sy + (ey - sy) * k;
    const ghost = sc.add.image(gx, gy - 6, key, frame).setTint(YEL).setAlpha(0.7 - i * 0.12).setScale(spr.scaleX, spr.scaleY).setFlipX(spr.flipX).setDepth(99990);
    sc.tweens.add({ targets: ghost, alpha: 0, duration: 330 + i * 60, onComplete: () => ghost.destroy() });
  });
  const g = sc.add.graphics().setDepth(99995);
  const trail = jag(sx, sy - 6, ex, ey - 6, 9, 8);
  const trail2 = jag(sx, sy - 6, ex, ey - 6, 9, 8);
  const t0 = h.clock;
  h.addFrameTask(260, (now) => {
    const fade = 1 - (now - t0) / 260;
    g.clear();
    strokeJag(g, trail, YEL, 7, 0.9 * fade);
    strokeJag(g, trail2, 0xffffff, 2, fade);
  }, () => g.destroy());
  spr.setAlpha(0.2);
  const amount = m.power * f.power * mult * (P.powerMult ?? 1);
  const hit = new Set<Enemy>();
  h.schedule(h.clock + (P.ms ?? 150), () => {
    spr.setAlpha(1);
    if (h.over || f.dead) return;
    for (const e of h.enemies()) {
      if (!e.targetable || hit.has(e)) continue;
      if (distSeg(e.x, e.centerY, sx, sy, ex, ey) > 26 + e.radius) continue;
      hit.add(e);
      h.damageEnemy(e, m, amount * 0.7, a.x, a.y, true);
      d.hit(e.x, e.centerY, true);
    }
    f.body.reset(ex, ey);
    f.playMove(m);
    // tiếng sấm: sao trắng + nổ + rung
    h.fx.shake(0.012, 180);
    playSfx('boom');
    scatter(sc, 'star5', ex, ey - 8, 10, 46, YEL, 1.3);
    d.explosion(ex, ey, P.clapR ?? 46);
    h.hitStop(70);
    for (const e of h.enemies()) {
      if (!e.targetable || hit.has(e)) continue;
      if (Math.hypot(e.x - ex, (e.y - ey) / 0.8) > (P.clapR ?? 46) + e.radius) continue;
      hit.add(e);
      h.damageEnemy(e, m, amount * 0.6, e.x - ex, e.y - ey, true);
    }
  });
}

/** Mây Bão: mây đen hình thành trên khu vực địch, giáng sét liên tục ~3s xuống các điểm có vạch báo */
export function castStormCloud(h: SkillHost, f: Fighter, m: MoveDef, P: LooseParams) {
  const sc = h.scene;
  const d = dialectFor('electric', h.fx, m, h);
  const mult = h.stackMult(f, m);
  f.anim.playOnce('charge', 380);
  f.sprayUntil = h.clock + 380;
  f.sprayMove = { ...m, moveSlow: 0.4, line: 1 };
  const t = h.aimTarget && !h.aimTarget.dead ? h.aimTarget : null;
  const c = { x: Phaser.Math.Clamp(t ? t.x : f.x + f.facing.x * 90, 40, h.worldW - 40), y: Phaser.Math.Clamp(t ? t.y : f.y + f.facing.y * 60, 40, h.worldH - 40) };
  playSfx('thunder');
  const R = P.r ?? 74;
  const ms = P.ms ?? 3000;
  const cloud = sc.add.graphics().setDepth(99989);
  const cloudY = c.y - 96;
  const t0 = h.clock + 380;
  const amount = (m.power * f.power * mult * (P.powerMult ?? 1)) / 5;
  let next = t0 + 300;
  h.addFrameTask(380 + ms, (now) => {
    const k = Phaser.Math.Clamp((now - (t0 - 380)) / 400, 0, 1);
    const fadeOut = Math.min(1, (t0 + ms - now) / 400);
    cloud.clear();
    const al = Math.max(0, Math.min(k, fadeOut));
    for (let i = 0; i < 9; i++) {
      const ox = (i - 4) * 18 + Math.sin(now / 500 + i) * 4;
      const oy = Math.sin(i * 1.7) * 6 + Math.cos(now / 600 + i) * 2;
      cloud.fillStyle(i % 2 ? 0x2a2f3a : 0x3a404c, 0.95 * al).fillCircle(c.x + ox, cloudY + oy, 15 + (i % 3) * 3);
    }
    if (now >= next && now < t0 + ms - 200) {
      next = now + (P.gapMs ?? 250);
      const en = h.enemies().filter((e) => e.targetable && Math.hypot(e.x - c.x, e.y - c.y) < R + 40);
      const pick = en.length && Math.random() < 0.65 ? en[Math.floor(Math.random() * en.length)] : null;
      const sx = pick ? pick.x : c.x + (Math.random() - 0.5) * R * 2;
      const sy = pick ? pick.y : c.y + (Math.random() - 0.5) * R * 1.4;
      groundWarn(sc, sx, sy, 380, YEL, 0x3a3004);
      h.schedule(h.clock + 380, () => {
        if (h.over) return;
        const bg = sc.add.graphics().setDepth(99995);
        const pts = jag(sx + (Math.random() - 0.5) * 8, cloudY + 8, sx, sy, 8, 9);
        strokeJag(bg, pts, YEL, 6, 0.95);
        strokeJag(bg, pts, 0xffffff, 2, 1);
        sc.tweens.add({ targets: bg, alpha: 0, duration: 160, onComplete: () => bg.destroy() });
        playSfx('zap');
        h.fx.shake(0.004, 80);
        d.explosion(sx, sy, 16);
        for (const e of h.enemies()) {
          if (!e.targetable || Math.hypot(e.x - sx, (e.y - sy) / 0.8) > 24 + e.radius) continue;
          h.damageEnemy(e, m, amount, 0, 0, true);
        }
      });
    }
  }, () => cloud.destroy());
}

/** Lưới Điện: 4 cọc sét cắm quanh vùng, nối nhau bằng dây điện thành lưới đa giác; địch trong lưới Tê liệt + bị giật */
export function castPowerGrid(h: SkillHost, f: Fighter, m: MoveDef, P: LooseParams) {
  const sc = h.scene;
  const d = dialectFor('electric', h.fx, m, h);
  const mult = h.stackMult(f, m);
  f.anim.playOnce('charge', 380);
  f.sprayUntil = h.clock + 380;
  f.sprayMove = { ...m, moveSlow: 0.4, line: 1 };
  const t = h.aimTarget && !h.aimTarget.dead ? h.aimTarget : null;
  const c = { x: Phaser.Math.Clamp(t ? t.x : f.x + f.facing.x * 100, 90, h.worldW - 90), y: Phaser.Math.Clamp(t ? t.y : f.y + f.facing.y * 60, 70, h.worldH - 70) };
  const W = P.w ?? 160;
  const H = P.hgt ?? 116;
  const poles = [{ x: c.x - W / 2, y: c.y - H * 0.4 }, { x: c.x + W / 2, y: c.y - H * 0.4 }, { x: c.x + W / 2, y: c.y + H * 0.4 }, { x: c.x - W / 2, y: c.y + H * 0.4 }];
  const ms = P.ms ?? 2800;
  const g = sc.add.graphics().setDepth(99991);
  const t0 = h.clock + 380;
  const amount = (m.power * f.power * mult * (P.powerMult ?? 1)) / 6;
  let next = t0;
  poles.forEach((p, i) => groundWarn(sc, p.x, p.y, 380 + i * 40, YEL, 0x3a3004));
  playSfx('thunder');
  h.addFrameTask(380 + ms, (now) => {
    g.clear();
    if (now < t0) return;
    const grow = Math.min(1, (now - t0) / 220);
    const fade = Math.min(1, (t0 + ms - now) / 350);
    poles.forEach((p) => {
      g.fillStyle(0x9a9faa, fade).fillRect(p.x - 3, p.y - 22 * grow, 6, 22 * grow);
      g.fillStyle(YEL, fade).fillRect(p.x - 5, p.y - 24 * grow, 10, 4);
      g.fillStyle(0xffffff, 0.5 * fade * (0.5 + 0.5 * Math.sin(now / 60))).fillRect(p.x - 7, p.y - 26 * grow, 14, 7);
    });
    if (grow >= 1) {
      for (let i = 0; i < 4; i++) {
        const a = poles[i];
        const b = poles[(i + 1) % 4];
        strokeJag(g, jag(a.x, a.y - 22, b.x, b.y - 22, 6, 4), YEL, 3, 0.9 * fade);
      }
      strokeJag(g, jag(poles[0].x, poles[0].y - 22, poles[2].x, poles[2].y - 22, 8, 5), YEL, 1.8, 0.55 * fade);
      strokeJag(g, jag(poles[1].x, poles[1].y - 22, poles[3].x, poles[3].y - 22, 8, 5), YEL, 1.8, 0.55 * fade);
      g.fillStyle(YEL, 0.1 * fade).fillRect(c.x - W / 2, c.y - H * 0.4 - 8, W, H * 0.8 + 8);
      for (const e of h.enemies()) {
        if (!e.targetable) continue;
        if (Math.abs(e.x - c.x) > W / 2 || Math.abs(e.y - c.y) > H * 0.4) continue;
        if (!e.isBoss) e.stunnedUntil = Math.max(e.stunnedUntil, now + 180);
        else e.applySlow(0.5, 300, now);
      }
      if (now >= next) {
        next = now + 380;
        for (const e of h.enemies()) {
          if (!e.targetable || Math.abs(e.x - c.x) > W / 2 || Math.abs(e.y - c.y) > H * 0.4) continue;
          h.damageEnemy(e, { ...m, knockback: 0 }, amount, 0, 0, false, true);
          d.hit(e.x, e.centerY, false);
        }
      }
    }
  }, () => g.destroy());
}

/** Phán Quyết Sấm Sét (tuyệt chiêu): trời trắng lóa nhấp nháy, sét khổng lồ đánh từng địch nối tiếp, rồi một TRỤ SÉT to giữa sân */
export function castJudgement(h: SkillHost, f: Fighter, P: LooseParams, _u: UltimateDef, mv: MoveDef, amount: number) {
  if (h.over) return;
  const sc = h.scene;
  const cam = sc.cameras.main;
  const d = dialectFor('electric', h.fx, mv, h);
  const wv = cam.worldView;
  playSfx('roar');
  cam.flash(200, 255, 255, 220, false);
  const dark = sc.add.rectangle(0, 0, cam.width, cam.height, 0x10142a, 0).setOrigin(0).setScrollFactor(0).setDepth(99987);
  sc.tweens.add({ targets: dark, fillAlpha: 0.5, duration: 250 });
  sc.time.delayedCall(2600, () => sc.tweens.add({ targets: dark, fillAlpha: 0, duration: 400, onComplete: () => dark.destroy() }));
  const targets = h.enemies().filter((e) => e.targetable).slice(0, P.maxBolts ?? 10);
  targets.forEach((e, i) => {
    h.schedule(h.clock + 350 + i * 150, () => {
      if (h.over || e.dead) return;
      cam.flash(90, 255, 255, 200, false);
      h.fx.shake(0.01, 110);
      playSfx('thunder');
      const g = sc.add.graphics().setDepth(99996);
      const pts = jag(e.x + (Math.random() - 0.5) * 20, wv.y - 10, e.x, e.y, 10, 12);
      strokeJag(g, pts, YEL, 13, 0.9);
      strokeJag(g, pts, 0xffffff, 4, 1);
      for (let k = 0; k < 4; k++) strokeJag(g, jag(pts[2 + k].x, pts[2 + k].y, pts[2 + k].x + (Math.random() - 0.5) * 50, pts[2 + k].y + 20 + Math.random() * 20, 3, 5), YEL, 3, 0.9);
      sc.tweens.add({ targets: g, alpha: 0, duration: 260, onComplete: () => g.destroy() });
      scatter(sc, 'spark', e.x, e.centerY, 10, 40, YEL, 1.3);
      d.explosion(e.x, e.y, 24);
      h.damageEnemy(e, mv, amount * (P.hitPower ?? 0.6), 0, 0, true);
    });
  });
  const tFinal = 350 + targets.length * 150 + 500;
  h.schedule(h.clock + tFinal, () => {
    if (h.over) return;
    const cx = targets.length ? targets.reduce((s, e) => s + e.x, 0) / targets.length : f.x + f.facing.x * 80;
    const cy = targets.length ? targets.reduce((s, e) => s + e.y, 0) / targets.length : f.y;
    cam.flash(320, 255, 255, 255, false);
    h.fx.shake(0.03, 520);
    playSfx('boom');
    const g = sc.add.graphics().setDepth(99996);
    g.fillStyle(0xffffff, 0.85).fillPoints([V(cx - 16, wv.y - 10), V(cx + 16, wv.y - 10), V(cx + 46, cy), V(cx - 46, cy)], true);
    g.fillStyle(YEL, 0.6).fillPoints([V(cx - 30, wv.y - 10), V(cx + 30, wv.y - 10), V(cx + 74, cy), V(cx - 74, cy)], true);
    strokeJag(g, jag(cx, wv.y - 10, cx, cy, 12, 14), 0xffffff, 6, 1);
    sc.tweens.add({ targets: g, alpha: 0, duration: 520, onComplete: () => g.destroy() });
    for (let i = 0; i < 18; i++) scatter(sc, 'spark', cx, cy, 1, 30 + i * 6, YEL, 1.4);
    scatter(sc, 'star5', cx, cy, 14, 90, 0xffffff, 1.6);
    for (const e of h.enemies()) {
      if (!e.targetable || Math.hypot(e.x - cx, (e.y - cy) / 0.8) > 110 + e.radius) continue;
      h.damageEnemy(e, { ...mv, knockback: 300 }, amount * (P.slamPower ?? 1.2), e.x - cx, e.y - cy, true);
    }
    h.hitStop(120);
  });
}

// ============================================================================================ ARTICUNO
const AUR = [0x7af0ff, 0x9aa8ff, 0xd49aff];

/** Dải Cực Quang: 3 dải sóng (xanh ngọc → tím) lượn đường sin về phía mục tiêu, vệt sương giá; trúng = Lạnh (chiêu hệ Băng) */
export function castAurora(h: SkillHost, f: Fighter, m: MoveDef, P: LooseParams, dir: Phaser.Math.Vector2) {
  const sc = h.scene;
  const d = dialectFor('ice', h.fx, m, h);
  const mult = h.stackMult(f, m);
  f.playMove(m);
  playSfx(m.sfx);
  const a = aimOf(h, f, dir);
  f.faceTo(a.x, a.y);
  const range = P.range ?? 175;
  const flyMs = P.flyMs ?? 600;
  const n = P.n ?? 3;
  const sx = f.x + a.x * 8;
  const sy = f.chestY;
  const nx = -a.y;
  const ny = a.x;
  const amount = (m.power * f.power * mult * (P.powerMult ?? 1)) / Math.max(1, n * 0.7);
  const g = sc.add.graphics().setDepth(99993);
  const trails: { x: number; y: number }[][] = Array.from({ length: n }, () => []);
  const hit = Array.from({ length: n }, () => new Set<Enemy>());
  const t0 = h.clock;
  h.addFrameTask(flyMs + 220, (now) => {
    const k = Math.min(1, (now - t0) / flyMs);
    const fade = now - t0 > flyMs ? 1 - (now - t0 - flyMs) / 220 : 1;
    g.clear();
    for (let i = 0; i < n; i++) {
      const ph = (i / n) * Math.PI * 2;
      const off = (i - (n - 1) / 2) * 16;
      if (k < 1 || trails[i].length) {
        const kk = Math.min(1, k);
        const wob = Math.sin(kk * Math.PI * 2 * (P.waves ?? 1.5) + ph) * (P.amp ?? 15) * Math.min(1, kk * 3);
        const x = sx + a.x * range * kk + nx * (wob + off * kk);
        const y = sy + a.y * range * 0.8 * kk + ny * (wob + off * kk) * 0.8;
        if (k < 1) trails[i].push({ x, y });
        if (trails[i].length > 16) trails[i].shift();
        const tr = trails[i];
        for (let j = 1; j < tr.length; j++) {
          const w = (j / tr.length) * 8;
          g.lineStyle(w, AUR[(i + Math.floor(j / 5)) % AUR.length], 0.85 * fade * (j / tr.length)).lineBetween(tr[j - 1].x, tr[j - 1].y, tr[j].x, tr[j].y);
          g.lineStyle(w * 0.35, 0xffffff, 0.8 * fade * (j / tr.length)).lineBetween(tr[j - 1].x, tr[j - 1].y, tr[j].x, tr[j].y);
        }
        if (k < 1) {
          if (Math.random() < 0.5) d.trail(x, y, 1);
          for (const e of h.enemies()) {
            if (!e.targetable || hit[i].has(e) || Math.hypot(e.x - x, (e.centerY - y) / 0.8) > 12 + e.radius) continue;
            hit[i].add(e);
            h.damageEnemy(e, m, amount, a.x, a.y, false);
            d.hit(e.x, e.centerY, false);
          }
        }
      }
    }
  }, () => g.destroy());
}

/** Lướt Băng: bay vút một đường (bất tử, ảo ảnh băng), để lại ĐƯỜNG BĂNG TRƠN làm chậm địch 3s */
export function castIceGlide(h: SkillHost, f: Fighter, m: MoveDef, P: LooseParams, dir: Phaser.Math.Vector2) {
  const sc = h.scene;
  const d = dialectFor('ice', h.fx, m, h);
  const mult = h.stackMult(f, m);
  playSfx('waterHi');
  const a = aimOf(h, f, dir);
  f.faceTo(a.x, a.y);
  const len = P.len ?? 190;
  const ms = P.ms ?? 280;
  const spr = f.anim.sprite;
  f.invulnUntil = Math.max(f.invulnUntil, h.clock + ms + 150);
  const sx = f.x;
  const sy = f.y;
  const g = sc.add.graphics().setDepth(99993);
  const key = spr.texture.key;
  const frame = spr.frame.name;
  const t0 = h.clock;
  const amount = m.power * f.power * mult * (P.powerMult ?? 1);
  const hit = new Set<Enemy>();
  let lastRoad = -40;
  let ghostAt = 0;
  h.addFrameTask(ms, (now) => {
    const k = Math.min(1, (now - t0) / ms);
    const x = sx + a.x * len * k;
    const y = sy + a.y * len * 0.85 * k;
    f.body.reset(Phaser.Math.Clamp(x, 16, h.worldW - 16), Phaser.Math.Clamp(y, 16, h.worldH - 16));
    g.clear();
    g.lineStyle(10, 0xbff4ff, 0.5).lineBetween(sx, sy - 8, x, y - 8);
    g.lineStyle(4, 0xffffff, 0.9).lineBetween(sx, sy - 8, x, y - 8);
    for (let i = 0; i < 5; i++) d.trail(x - a.x * i * 7, y + 2, 1);
    if (now >= ghostAt) {
      ghostAt = now + 60;
      const ghost = sc.add.image(x, y - 6, key, frame).setTint(0xbff4ff).setAlpha(0.55).setScale(spr.scaleX, spr.scaleY).setFlipX(spr.flipX).setDepth(99990);
      sc.tweens.add({ targets: ghost, alpha: 0, duration: 300, onComplete: () => ghost.destroy() });
    }
    if (len * k - lastRoad >= 38) {
      lastRoad = len * k;
      d.scorch(x, y + 6, 20, P.roadMs ?? 3000);
    }
    for (const e of h.enemies()) {
      if (!e.targetable || hit.has(e) || Math.hypot(e.x - x, (e.centerY - y) / 0.8) > 26 + e.radius) continue;
      hit.add(e);
      h.damageEnemy(e, m, amount, a.x, a.y, true);
      d.hit(e.x, e.centerY, true);
    }
  }, () => {
    g.destroy();
    if (h.over) return;
    h.fx.shake(0.006, 100);
    d.explosion(f.x, f.y, 14);
  });
}

/** Tinh Thể Lăng Kính: tinh thể băng mọc dưới địch rồi khúc xạ thành 8 tia sáng thẳng hình sao (xanh ngọc xen tím) */
export function castPrism(h: SkillHost, f: Fighter, m: MoveDef, P: LooseParams) {
  const sc = h.scene;
  const d = dialectFor('ice', h.fx, m, h);
  const mult = h.stackMult(f, m);
  f.anim.playOnce('charge', P.windupMs ?? 420);
  f.sprayUntil = h.clock + (P.windupMs ?? 420);
  f.sprayMove = { ...m, moveSlow: 0.4, line: 1 };
  const t = h.aimTarget && !h.aimTarget.dead ? h.aimTarget : null;
  const c = { x: Phaser.Math.Clamp(t ? t.x : f.x + f.facing.x * 100, 40, h.worldW - 40), y: Phaser.Math.Clamp(t ? t.y : f.y + f.facing.y * 60, 40, h.worldH - 40) };
  const wind = P.windupMs ?? 420;
  const L = P.len ?? 105;
  const rot = Math.random() * 0.4;
  const amount = m.power * f.power * mult * (P.powerMult ?? 1) * 0.5;
  playSfx('waterLo');
  groundWarn(sc, c.x, c.y, wind, 0x7af0ff, 0x0a2a4a);
  const cg = sc.add.graphics().setDepth(c.y + 5);
  const t0 = h.clock;
  h.addFrameTask(wind + 480, (now) => {
    const k = Math.min(1, (now - t0) / wind);
    cg.clear();
    const hgt = 38 * k;
    cg.fillStyle(0xdff8ff, 0.95).fillPoints([V(c.x, c.y - hgt), V(c.x + 11, c.y - hgt * 0.35), V(c.x, c.y + 6), V(c.x - 11, c.y - hgt * 0.35)], true);
    cg.fillStyle(0x7af0ff, 0.8).fillPoints([V(c.x, c.y - hgt), V(c.x + 11, c.y - hgt * 0.35), V(c.x, c.y - hgt * 0.35)], true);
    cg.lineStyle(2, 0xffffff, 1).strokePoints([V(c.x, c.y - hgt), V(c.x + 11, c.y - hgt * 0.35), V(c.x, c.y + 6), V(c.x - 11, c.y - hgt * 0.35)], true);
    if (now - t0 > wind - 220 && now - t0 < wind) {
      for (let i = 0; i < 8; i++) {
        const ang = rot + (i / 8) * Math.PI * 2;
        cg.lineStyle(1, AUR[i % 2 ? 2 : 0], 0.5).lineBetween(c.x, c.y - 16, c.x + Math.cos(ang) * L, c.y - 16 + Math.sin(ang) * L * 0.75);
      }
    }
  }, () => cg.destroy());
  h.schedule(h.clock + wind, () => {
    if (h.over) return;
    h.fx.shake(0.01, 160);
    playSfx('hit');
    const bg = sc.add.graphics().setDepth(99994);
    const segs = Array.from({ length: 8 }, (_, i) => {
      const ang = rot + (i / 8) * Math.PI * 2;
      return { x1: c.x, y1: c.y - 16, x2: c.x + Math.cos(ang) * L, y2: c.y - 16 + Math.sin(ang) * L * 0.75, col: AUR[i % 2 ? 2 : 0] };
    });
    const tb = h.clock;
    h.addFrameTask(300, (now) => {
      const fade = 1 - (now - tb) / 300;
      bg.clear();
      for (const sg of segs) {
        bg.lineStyle(9 * fade + 2, sg.col, 0.9 * fade).lineBetween(sg.x1, sg.y1, sg.x2, sg.y2);
        bg.lineStyle(3 * fade + 1, 0xffffff, fade).lineBetween(sg.x1, sg.y1, sg.x2, sg.y2);
      }
    }, () => bg.destroy());
    radialShards(sc, c.x, c.y - 16, 12, 40);
    d.explosion(c.x, c.y, 18);
    const hit = new Set<Enemy>();
    for (const e of h.enemies()) {
      if (!e.targetable || hit.has(e)) continue;
      for (const sg of segs) {
        if (distSeg(e.x, e.centerY, sg.x1, sg.y1, sg.x2, sg.y2) <= 13 + e.radius) {
          hit.add(e);
          h.damageEnemy(e, m, amount * 1.6, e.x - c.x, e.y - c.y, true);
          d.hit(e.x, e.centerY, true);
          break;
        }
      }
    }
  });
}

/** Tường Băng Giá: bức tường pha lê dựng lên rồi TIẾN THẲNG tới, đẩy + làm Lạnh mọi địch; hết đường thì vỡ thành mảnh gây sát thương */
export function castIceWall(h: SkillHost, f: Fighter, m: MoveDef, P: LooseParams, dir: Phaser.Math.Vector2) {
  const sc = h.scene;
  const d = dialectFor('ice', h.fx, m, h);
  const mult = h.stackMult(f, m);
  f.anim.playOnce('charge', 380);
  f.sprayUntil = h.clock + 380;
  f.sprayMove = { ...m, moveSlow: 0.4, line: 1 };
  const a = aimOf(h, f, dir);
  f.faceTo(a.x, a.y);
  const nx = -a.y;
  const ny = a.x;
  const n = P.width ?? 7;
  const gap = P.gap ?? 18;
  const speed = P.speed ?? 90;
  const ms = P.ms ?? 1900;
  const half = ((n - 1) / 2) * gap;
  const amount = m.power * f.power * mult * (P.powerMult ?? 1);
  playSfx('waterLo');
  const g = sc.add.graphics().setDepth(99992);
  let cx = f.x + a.x * 42;
  let cy = f.y + a.y * 42 * 0.85;
  const tick = new Map<Enemy, number>();
  const hts = Array.from({ length: n }, (_, i) => 26 + ((i * 7) % 5) * 5);
  const t0 = h.clock + 380;
  h.schedule(t0, () => {
    if (h.over) return;
    h.addFrameTask(ms, (now, dt) => {
      const k = Math.min(1, (now - t0) / 260);
      cx = Phaser.Math.Clamp(cx + (a.x * speed * dt) / 1000, 30, h.worldW - 30);
      cy = Phaser.Math.Clamp(cy + (a.y * speed * 0.85 * dt) / 1000, 30, h.worldH - 30);
      g.clear();
      for (let i = 0; i < n; i++) {
        const o = i * gap - half;
        const px = cx + nx * o;
        const py = cy + ny * o * 0.85;
        const hh = hts[i] * k;
        const w = 8;
        g.fillStyle(0xcff6ff, 0.92).fillPoints([V(px, py - hh), V(px + w, py - hh * 0.4), V(px + w * 0.7, py + 4), V(px - w * 0.7, py + 4), V(px - w, py - hh * 0.4)], true);
        g.fillStyle(0x7af0ff, 0.8).fillPoints([V(px, py - hh), V(px + w, py - hh * 0.4), V(px, py - hh * 0.4)], true);
        g.lineStyle(1.5, 0xffffff, 1).strokePoints([V(px, py - hh), V(px + w, py - hh * 0.4), V(px + w * 0.7, py + 4), V(px - w * 0.7, py + 4), V(px - w, py - hh * 0.4)], true);
      }
      if (Math.random() < 0.8) d.trail(cx + nx * (Math.random() - 0.5) * half * 2, cy + 6, 1);
      for (const e of h.enemies()) {
        if (!e.targetable) continue;
        const rx = e.x - cx;
        const ry = (e.y - cy) / 0.85;
        const alongN = rx * nx + ry * ny;
        const alongA = rx * a.x + ry * a.y;
        if (Math.abs(alongN) > half + 12 + e.radius || Math.abs(alongA) > 20 + e.radius) continue;
        if (!e.isBoss) {
          e.stunnedUntil = Math.max(e.stunnedUntil, now + 160);
          e.body.reset(e.x + (a.x * speed * 1.15 * dt) / 1000, e.y + (a.y * speed * 1.15 * dt) / 1000);
        } else e.applySlow(0.5, 300, now);
        if ((tick.get(e) ?? 0) <= now) {
          tick.set(e, now + 420);
          h.damageEnemy(e, { ...m, knockback: 0 }, amount * 0.12, 0, 0, false, true);
        }
      }
    }, () => {
      g.destroy();
      if (h.over) return;
      h.fx.shake(0.012, 200);
      playSfx('hit');
      for (let i = 0; i < n; i++) {
        const o = i * gap - half;
        radialShards(sc, cx + nx * o, cy + ny * o * 0.85 - 10, 6, 34);
      }
      for (const e of h.enemies()) {
        if (!e.targetable) continue;
        const rx = e.x - cx;
        const ry = (e.y - cy) / 0.85;
        if (Math.abs(rx * nx + ry * ny) > half + 34 + e.radius || Math.abs(rx * a.x + ry * a.y) > 50 + e.radius) continue;
        h.damageEnemy(e, { ...m, knockback: 220 }, amount * 0.7, a.x, a.y, true);
        d.hit(e.x, e.centerY, true);
      }
    });
  });
}

/** Cực Quang Vĩnh Cửu (tuyệt chiêu): bầu trời rèm cực quang rủ xuống; cột sáng đóng băng từng địch, rồi VỠ TUNG đồng loạt (đòn băng lên địch đóng băng = vỡ nát ×1,6) */
export function castAuroraFall(h: SkillHost, _f: Fighter, P: LooseParams, _u: UltimateDef, mv: MoveDef, amount: number) {
  if (h.over) return;
  const sc = h.scene;
  const cam = sc.cameras.main;
  const d = dialectFor('ice', h.fx, mv, h);
  const wv = cam.worldView;
  const total = P.ms ?? 2400;
  playSfx('roar');
  cam.flash(220, 160, 230, 255, false);
  const dark = sc.add.rectangle(0, 0, cam.width, cam.height, 0x0a1a3a, 0).setOrigin(0).setScrollFactor(0).setDepth(99987);
  sc.tweens.add({ targets: dark, fillAlpha: 0.5, duration: 350 });
  sc.time.delayedCall(total + 600, () => sc.tweens.add({ targets: dark, fillAlpha: 0, duration: 450, onComplete: () => dark.destroy() }));
  const curtains = sc.add.graphics().setDepth(99988);
  const t0 = h.clock;
  h.addFrameTask(total + 200, (now) => {
    const k = Math.min(1, (now - t0) / 700);
    const fade = Phaser.Math.Clamp((t0 + total - now) / 400, 0, 1);
    curtains.clear();
    for (let i = 0; i < 9; i++) {
      const x = wv.x + (i + 0.5) * (wv.width / 9) + Math.sin(now / 600 + i) * 14;
      const w = 26 + (i % 3) * 8;
      const col = AUR[i % 3];
      for (let s = 0; s < 6; s++) {
        const hh = (wv.height * 0.9 * k * (6 - s)) / 6;
        curtains.fillStyle(col, 0.1 * fade).fillPoints([V(x - w, wv.y), V(x + w, wv.y), V(x + w * 0.55 + Math.sin(now / 400 + i + s) * 6, wv.y + hh), V(x - w * 0.55, wv.y + hh)], true);
      }
    }
  }, () => curtains.destroy());
  const targets = h.enemies().filter((e) => e.targetable);
  const blocks = new Map<Enemy, Phaser.GameObjects.Graphics>();
  targets.forEach((e, i) => {
    h.schedule(h.clock + 450 + i * 120, () => {
      if (h.over || e.dead) return;
      playSfx('waterHi');
      const col = sc.add.graphics().setDepth(99989);
      col.fillStyle(0xdff8ff, 0.7).fillPoints([V(e.x - 10, wv.y), V(e.x + 10, wv.y), V(e.x + 22, e.y), V(e.x - 22, e.y)], true);
      sc.tweens.add({ targets: col, alpha: 0, duration: 360, onComplete: () => col.destroy() });
      e.applyStatus('freeze', 2600, h.clock);
      const bl = sc.add.graphics().setDepth(e.y + 6);
      bl.fillStyle(0xcff6ff, 0.75).fillRect(e.x - 14, e.centerY - 20, 28, 34);
      bl.fillStyle(0x7af0ff, 0.6).fillRect(e.x - 14, e.centerY - 20, 10, 34);
      bl.lineStyle(2, 0xffffff, 1).strokeRect(e.x - 14, e.centerY - 20, 28, 34);
      blocks.set(e, bl);
      radialShards(sc, e.x, e.centerY, 6, 22);
    });
  });
  h.schedule(h.clock + 450 + targets.length * 120 + 750, () => {
    if (h.over) return;
    cam.flash(300, 230, 250, 255, false);
    h.fx.shake(0.024, 480);
    playSfx('boom');
    for (const [e, bl] of blocks) {
      bl.destroy();
      if (e.dead) continue;
      radialShards(sc, e.x, e.centerY, 12, 52);
      d.explosion(e.x, e.y, 24);
      h.damageEnemy(e, mv, amount * (P.slamPower ?? 1.3), 0, 0, true);
    }
    h.hitStop(120);
  });
}
