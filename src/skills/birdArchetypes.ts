// Khuôn chiêu của 3 chim huyền thoại. Moltres: Lông Lửa (arcshot) · Lướt Phượng Hoàng (phoenixdash) · Cánh Chữ X (xslash) · Tái Sinh Phượng Hoàng (phoenix).
/* eslint-disable @typescript-eslint/no-explicit-any */
import Phaser from 'phaser';
import type { Enemy } from '../entities/Enemy';
import type { Fighter } from '../entities/Fighter';
import type { MoveDef } from '../data/moveKit';
import type { UltimateDef } from '../data/ultimates';
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
