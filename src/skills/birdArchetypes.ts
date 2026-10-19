// Khuôn chiêu của 3 chim huyền thoại. Moltres: Lông Lửa (arcshot) · Lướt Phượng Hoàng (phoenixdash) · Cánh Chữ X (xslash) · Tái Sinh Phượng Hoàng (phoenix).
/* eslint-disable @typescript-eslint/no-explicit-any */
import Phaser from 'phaser';
import type { Enemy } from '../entities/Enemy';
import type { Fighter } from '../entities/Fighter';
import type { MoveDef } from '../data/moveKit';
import type { UltimateDef } from '../data/ultimates';
import { patch, scatter } from '../fx/TypeFx';
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
const FIRE = [0xff3a1a, 0xff7a2a, 0xffb02a, 0xffe070];

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

/** Cánh Chữ X: hai nhát cánh lửa bán nguyệt chém chéo thành chữ X trước mặt, để lại vết cháy chữ X trên nền */
export function castXSlash(h: SkillHost, f: Fighter, m: MoveDef, P: LooseParams, dir: Phaser.Math.Vector2) {
  const sc = h.scene;
  const d = dialectFor(P.dialect ?? 'fire', h.fx, m, h);
  const mult = h.stackMult(f, m);
  f.playMove(m);
  playSfx('flame');
  const a = aimOf(h, f, dir);
  f.faceTo(a.x, a.y);
  const reach = P.reach ?? 58;
  const cx = f.x + a.x * reach * 0.8;
  const cy = f.chestY + a.y * reach * 0.8 * 0.8;
  const amount = m.power * f.power * mult * (P.powerMult ?? 1);
  const base = Math.atan2(a.y, a.x);
  const strokes = [{ ang: base - 0.8, col: 0xff5a2a }, { ang: base + 0.8, col: 0xffd34a }];
  const hit = new Set<Enemy>();
  strokes.forEach((st, i) => {
    h.schedule(h.clock + i * 130, () => {
      if (h.over) return;
      const g = sc.add.graphics().setDepth(99995);
      const t0 = h.clock;
      const ux = Math.cos(st.ang + Math.PI / 2);
      const uy = Math.sin(st.ang + Math.PI / 2);
      h.addFrameTask(260, (now) => {
        const k = Math.min(1, (now - t0) / 160);
        const fade = 1 - Math.max(0, (now - t0 - 160) / 100);
        g.clear();
        const R = reach * 1.25;
        const pts: Phaser.Math.Vector2[] = [];
        const pts2: Phaser.Math.Vector2[] = [];
        for (let j = 0; j <= 10; j++) {
          const tt = (j / 10) * k;
          const along = (tt - 0.5) * 2 * R;
          const bow = Math.sin(tt * Math.PI) * 16;
          pts.push(V(cx + ux * along + Math.cos(st.ang) * bow, cy + uy * along * 0.8 + Math.sin(st.ang) * bow * 0.8));
          pts2.push(V(cx + ux * along + Math.cos(st.ang) * (bow - 9), cy + uy * along * 0.8 + Math.sin(st.ang) * (bow - 9) * 0.8));
        }
        const poly = pts.concat(pts2.reverse());
        g.fillStyle(st.col, 0.95 * fade).fillPoints(poly, true);
        g.lineStyle(2, 0xffffff, fade).strokePoints(poly, true);
        if (k > 0.3) {
          for (const e of h.enemies()) {
            if (!e.targetable || hit.has(e)) continue;
            const rx = e.x - cx;
            const ry = (e.centerY - cy) / 0.8;
            const along = rx * ux + ry * uy;
            const side = Math.abs(rx * Math.cos(st.ang) + ry * Math.sin(st.ang));
            if (Math.abs(along) > R * k + e.radius || side > 22 + e.radius) continue;
            hit.add(e);
            h.damageEnemy(e, m, amount * 0.6, a.x, a.y, true);
            e.applyStatus('burn', 2600, h.clock, amount * 0.1);
            d.hit(e.x, e.centerY, true);
          }
        }
        if (Math.random() < 0.8) d.trail(cx + ux * (Math.random() - 0.5) * R * 2, cy + uy * (Math.random() - 0.5) * R * 1.6, 1);
      }, () => g.destroy());
      // vết cháy chữ X trên nền
      patch(sc, cx, cy, 20, 2200, 0x3a1204, 0xff7a2a, 0.5);
      if (i === 1) {
        h.fx.shake(0.01, 160);
        playSfx('hit');
        d.explosion(cx, cy, 22);
        h.hitStop(70);
      }
    });
  });
}

/** Tái Sinh Phượng Hoàng (tuyệt chiêu): phượng hoàng khổng lồ bay vòng qua cả màn hình thiêu mọi địch, nổ mưa lông, HỒI 30% máu */
export function castPhoenix(h: SkillHost, f: Fighter, P: LooseParams, _u: UltimateDef, mv: MoveDef, amount: number) {
  if (h.over) return;
  const sc = h.scene;
  const cam = sc.cameras.main;
  const d = dialectFor('fire', h.fx, mv, h);
  cam.flash(260, 255, 150, 40, false);
  h.fx.shake(0.012, 600);
  playSfx('roar');
  const tint = sc.add.rectangle(0, 0, cam.width, cam.height, 0x5a1a08, 0).setOrigin(0).setScrollFactor(0).setDepth(99987);
  sc.tweens.add({ targets: tint, fillAlpha: 0.38, duration: 300 });
  const total = P.ms ?? 1900;
  sc.time.delayedCall(total + 500, () => sc.tweens.add({ targets: tint, fillAlpha: 0, duration: 500, onComplete: () => tint.destroy() }));
  const wv = cam.worldView;
  const dirX = f.facing.x >= 0 ? 1 : -1;
  const x0 = dirX > 0 ? wv.x - 80 : wv.right + 80;
  const x1 = dirX > 0 ? wv.right + 80 : wv.x - 80;
  const yMid = Phaser.Math.Clamp(f.y, wv.y + 60, wv.bottom - 60);
  const g = sc.add.graphics().setDepth(99996);
  const hit = new Set<Enemy>();
  const t0 = h.clock;
  const S = P.size ?? 2.2;
  h.addFrameTask(total, (now) => {
    const k = Math.min(1, (now - t0) / total);
    const x = x0 + (x1 - x0) * k;
    const y = yMid - 10 - Math.sin(k * Math.PI) * (wv.height * 0.09) + Math.sin(k * 9) * 5;
    const flap = Math.sin(now / 70);
    const sg = dirX;
    g.clear();
    const body = [V(x + 40 * S * sg, y), V(x, y - 12 * S), V(x - 46 * S * sg, y + 2 * S), V(x, y + 12 * S)];
    g.fillStyle(0xff5a2a, 0.95).fillPoints(body, true);
    g.fillStyle(0xffd34a, 0.95).fillPoints([V(x + 14 * S * sg, y - 4 * S), V(x - 14 * S * sg, y - (34 + 12 * flap) * S), V(x - 38 * S * sg, y - 2 * S)], true);
    g.fillStyle(0xffd34a, 0.95).fillPoints([V(x + 14 * S * sg, y + 4 * S), V(x - 14 * S * sg, y + (34 + 12 * flap) * S), V(x - 38 * S * sg, y + 2 * S)], true);
    g.fillStyle(0xff3a1a, 0.9).fillPoints([V(x - 40 * S * sg, y), V(x - 80 * S * sg, y - 10 * S), V(x - 72 * S * sg, y + 2 * S), V(x - 86 * S * sg, y + 12 * S)], true);
    g.fillStyle(0xffffff, 0.95).fillPoints([V(x + 40 * S * sg, y), V(x + 54 * S * sg, y - 4 * S), V(x + 44 * S * sg, y + 3 * S)], true);
    g.lineStyle(2, 0xffffff, 0.9).strokePoints(body, true);
    for (let i = 0; i < 5; i++) d.trail(x - dirX * (30 + i * 14) * S * 0.5, y + (Math.random() - 0.5) * 24 * S, 1);
    if (Math.random() < 0.6) scatter(sc, 'fireFeather', x - dirX * 50 * S * 0.5, y + (Math.random() - 0.5) * 30, 1, 30);
    for (const e of h.enemies()) {
      if (!e.targetable || hit.has(e)) continue;
      if (Math.hypot(e.x - x, (e.centerY - y) / 0.8) > 60 * S * 0.6 + e.radius) continue;
      hit.add(e);
      scatter(sc, 'fireFeather', e.x, e.centerY, 8, 40, undefined, 1.2);
      h.damageEnemy(e, mv, amount * (P.hitPower ?? 1), dirX, 0, true);
      e.applyStatus('burn', 3500, h.clock, amount * 0.06);
      d.hit(e.x, e.centerY, true);
    }
  }, () => {
    g.destroy();
    if (h.over) return;
    cam.flash(300, 255, 200, 90, false);
    h.fx.shake(0.02, 400);
    playSfx('boom');
    const ex = Phaser.Math.Clamp(f.x + dirX * 20, wv.x + 40, wv.right - 40);
    for (let i = 0; i < 22; i++) {
      h.schedule(h.clock + i * 30, () => {
        const fx = wv.x + 40 + Math.random() * (wv.width - 80);
        const fy = wv.y + 40 + Math.random() * (wv.height - 80);
        scatter(sc, 'fireFeather', fx, fy, 3, 30, undefined, 1.2);
        d.explosion(fx, fy, 10);
      });
    }
    // hồi 30% máu
    const heal = Math.round(f.maxHp * (P.healPct ?? 0.3));
    f.heal(heal);
    h.fx.floatingLabel(f.x, f.chestY - 30, `+${heal}`, '#ffb02a');
    scatter(sc, 'fireFeather', ex, f.chestY, 14, 50, undefined, 1.4);
    void FIRE;
  });
}
