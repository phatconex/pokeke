// Khuôn chiêu của 7 hệ: Rồng (fan, sweep, serpent, dive, draco) · Đá (lob, roll, fallers, wavefront rock) · Đất (ambush, ridge, quicksand, chasm)
// · Bay (twister, dive, flock) · Độc (lob, fallers, wavefront sludge) · Bọ (web, swarm, wavefront swarm) · Thường (triattack, beam, hyperbeam).
/* eslint-disable @typescript-eslint/no-explicit-any */
import Phaser from 'phaser';
import type { Enemy } from '../entities/Enemy';
import type { Fighter } from '../entities/Fighter';
import type { MoveDef } from '../data/moveKit';
import { effectiveness } from '../data/types';
import type { UltimateDef } from '../data/ultimates';
import { groundCracks } from '../fx/GrassFx';
import { groundWarn } from '../fx/IceFx';
import { chasmOpen, drawWeb, meteorFall, scatter, vShock, wingShape } from '../fx/TypeFx';
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
const targetPt = (h: SkillHost, f: Fighter, reach: number) => {
  const t = h.aimTarget;
  const p = t && !t.dead ? { x: t.x, y: t.y } : { x: f.x + f.facing.x * reach, y: f.y + f.facing.y * reach };
  return { x: Phaser.Math.Clamp(p.x, 20, h.worldW - 20), y: Phaser.Math.Clamp(p.y, 20, h.worldH - 20) };
};
const inR = (e: Enemy, x: number, y: number, r: number) => e.targetable && Math.hypot(e.x - x, (e.y - y) / 0.8) <= r + e.radius;

/** Rồng – Hơi Thở: quạt các mảnh vảy thoi bay tỏa ra */
export function castFan(h: SkillHost, f: Fighter, m: MoveDef, P: LooseParams, dir: Phaser.Math.Vector2) {
  const sc = h.scene;
  const d = dialectFor(P.dialect, h.fx, m, h);
  const mult = h.stackMult(f, m);
  f.playMove(m);
  playSfx(m.sfx);
  const a = aimOf(h, f, dir);
  f.faceTo(a.x, a.y);
  const base = Math.atan2(a.y, a.x);
  const n = P.n ?? 22;
  const range = P.range ?? 90;
  const half = Phaser.Math.DegToRad(P.halfDeg ?? 32);
  for (let i = 0; i < n; i++) {
    const ang = base + (Math.random() - 0.5) * 2 * half;
    const dist = range * (0.55 + Math.random() * 0.5);
    const img = sc.add.image(f.x + a.x * 8, f.chestY + a.y * 6, P.tex ?? 'scaleD').setRotation(ang + Math.PI / 2).setDepth(99990).setScale(1.5 + Math.random() * 0.7);
    if (P.tint !== undefined && Math.random() < 0.5) img.setTint(P.tint);
    sc.tweens.add({ targets: img, x: f.x + Math.cos(ang) * dist, y: f.chestY + Math.sin(ang) * dist * 0.8, alpha: 0, duration: 380 + Math.random() * 200, delay: Math.random() * 90, ease: 'Cubic.out', onComplete: () => img.destroy() });
  }
  h.schedule(h.clock + 150, () => {
    if (h.over) return;
    const amount = m.power * f.power * mult * (P.powerMult ?? 1);
    for (const e of h.enemies()) {
      if (!e.targetable) continue;
      const rx = e.x - f.x;
      const ry = e.centerY - f.chestY;
      const along = rx * a.x + ry * a.y;
      if (along < 0 || along > range + e.radius) continue;
      const ang = Math.abs(Phaser.Math.Angle.Wrap(Math.atan2(ry, rx) - base));
      if (ang > half + 0.25) continue;
      h.damageEnemy(e, m, amount, a.x, a.y, false);
      d.hit(e.x, e.centerY, false);
    }
  });
}

/** Rồng/Bay – Quật Đuôi / Cánh Chém: dải cong thon quét một cung rộng, có gai */
export function castSweep(h: SkillHost, f: Fighter, m: MoveDef, P: LooseParams, dir: Phaser.Math.Vector2) {
  const sc = h.scene;
  const mult = h.stackMult(f, m);
  f.playMove(m);
  playSfx(m.sfx);
  const a = aimOf(h, f, dir);
  f.faceTo(a.x, a.y);
  const base = Math.atan2(a.y, a.x);
  const reach = P.reach ?? 56;
  const span = Phaser.Math.DegToRad(P.spanDeg ?? 150);
  const ms = P.ms ?? 220;
  const g = sc.add.graphics().setDepth(99991);
  const t0 = h.clock;
  const amount = m.power * f.power * mult * (P.powerMult ?? 1);
  const hit = new Set<unknown>();
  h.addFrameTask(ms + 120, (now) => {
    const k = Math.min(1, (now - t0) / ms);
    g.clear();
    const a1 = base - span / 2 + span * k;
    const a0 = Math.max(base - span / 2, a1 - span * 0.55);
    const outer: Phaser.Math.Vector2[] = [];
    const inner: Phaser.Math.Vector2[] = [];
    for (let i = 0; i <= 12; i++) {
      const aa = a0 + ((a1 - a0) * i) / 12;
      const w = Math.sin((i / 12) * Math.PI);
      outer.push(V(f.x + Math.cos(aa) * reach, f.chestY + Math.sin(aa) * reach * 0.8));
      inner.push(V(f.x + Math.cos(aa) * (reach - (P.thick ?? 14) * w), f.chestY + Math.sin(aa) * (reach - (P.thick ?? 14) * w) * 0.8));
    }
    const pts = outer.concat(inner.reverse());
    g.fillStyle(P.fill ?? 0x3a4acc, (P.alpha ?? 0.95) * (1 - Math.max(0, (now - t0 - ms) / 120))).fillPoints(pts, true);
    g.lineStyle(2, P.edge ?? 0xffd34a, 1).strokePoints(pts, true);
    if (P.spikes) {
      const aa = a1;
      for (let i = 0; i < P.spikes; i++) {
        const sa = aa - i * 0.12;
        g.fillStyle(P.edge ?? 0xffd34a, 1).fillTriangle(f.x + Math.cos(sa) * reach, f.chestY + Math.sin(sa) * reach * 0.8, f.x + Math.cos(sa + 0.06) * (reach + 12), f.chestY + Math.sin(sa + 0.06) * (reach + 12) * 0.8, f.x + Math.cos(sa - 0.05) * (reach - 2), f.chestY + Math.sin(sa - 0.05) * (reach - 2) * 0.8);
      }
    }
    if (k > 0.3) {
      for (const e of h.enemies()) {
        if (!e.targetable || hit.has(e)) continue;
        const rx = e.x - f.x;
        const ry = e.centerY - f.chestY;
        if (Math.hypot(rx, ry / 0.8) > reach + e.radius) continue;
        const ang = Math.atan2(ry, rx);
        if (Math.abs(Phaser.Math.Angle.Wrap(ang - base)) > span / 2 + 0.2) continue;
        hit.add(e);
        h.damageEnemy(e, m, amount, Math.cos(ang), Math.sin(ang), true);
      }
    }
  }, () => g.destroy());
}

/** Rồng – Long Ba: đầu rồng uốn chữ S nhiều đốt bay xuyên địch */
export function castSerpent(h: SkillHost, f: Fighter, m: MoveDef, P: LooseParams, dir: Phaser.Math.Vector2) {
  const sc = h.scene;
  const d = dialectFor(P.dialect, h.fx, m, h);
  const mult = h.stackMult(f, m);
  f.playMove(m);
  playSfx(m.sfx);
  const a = aimOf(h, f, dir);
  f.faceTo(a.x, a.y);
  const nx = -a.y;
  const ny = a.x;
  const segs = P.segs ?? 7;
  const range = P.range ?? 160;
  const ms = P.flyMs ?? 520;
  const amp = P.amp ?? 14;
  const g = sc.add.graphics().setDepth(99992);
  const t0 = h.clock;
  const amount = m.power * f.power * mult * (P.powerMult ?? 1);
  const hit = new Set<unknown>();
  const colors: number[] = P.colors ?? [0x4a5aff, 0x2a3aaa];
  h.addFrameTask(ms, (now) => {
    const k = (now - t0) / ms;
    g.clear();
    const pos = (kk: number) => {
      const s = Math.max(0, kk) * range;
      const w = Math.sin(s / 14) * amp * Math.min(1, s / 30);
      return V(f.x + a.x * (10 + s) + nx * w, f.chestY + (a.y * (10 + s) + ny * w) * 0.8);
    };
    for (let i = segs - 1; i >= 0; i--) {
      const p = pos(k - i * 0.035);
      const sz = (P.size ?? 10) * (1 - (i / segs) * 0.5);
      const pts = [V(p.x + sz, p.y), V(p.x, p.y - sz * 0.8), V(p.x - sz, p.y), V(p.x, p.y + sz * 0.8)];
      g.fillStyle(i === 0 ? (P.headColor ?? 0xff4a6a) : colors[i % colors.length], 1).fillPoints(pts, true);
      g.lineStyle(1.5, 0x10103a, 1).strokePoints(pts, true);
      if (i === 0) {
        g.fillStyle(0xffd34a, 1).fillTriangle(p.x + sz * 0.8, p.y - sz * 0.3, p.x + sz * 1.8, p.y - sz * 0.9, p.x + sz * 1.1, p.y + sz * 0.2);
        if (Math.random() < 0.5) d.trail(p.x, p.y, 1);
        for (const e of h.enemies()) {
          if (!e.targetable || hit.has(e) || Math.hypot(e.x - p.x, (e.centerY - p.y) / 0.8) > sz + 8 + e.radius) continue;
          hit.add(e);
          h.damageEnemy(e, m, amount, a.x, a.y, true);
          d.hit(e.x, e.centerY, true);
        }
      }
    }
  }, () => g.destroy());
}

/** Bay/Rồng – Bay Vút / Lao: bất tử khi ở trên không (chỉ còn bóng báo trước), rồi lao xuống đáp lên mục tiêu */
export function castDive(h: SkillHost, f: Fighter, m: MoveDef, P: LooseParams) {
  const sc = h.scene;
  const d = dialectFor(P.dialect, h.fx, m, h);
  const mult = h.stackMult(f, m);
  const air = P.airMs ?? 700;
  const c = targetPt(h, f, 80);
  f.invulnUntil = Math.max(f.invulnUntil, h.clock + air + 260);
  playSfx('swap');
  const spr = f.anim.sprite;
  const t0 = h.clock;
  const sh = sc.add.graphics().setDepth(-2790);
  const trail = sc.add.graphics().setDepth(99990);
  h.addFrameTask(air, (now) => {
    const k = Math.min(1, (now - t0) / air);
    const up = Math.min(1, (now - t0) / 260);
    f.anim.lift = 120 * up;
    spr.setAlpha(1 - up);
    sh.clear();
    // bóng của chính mình thu nhỏ + dấu X nơi sắp đáp
    sh.fillStyle(0x000000, 0.25 * (1 - up)).fillEllipse(f.x, f.feetY, 20 * (1 - up) + 4, 6);
    const cc = c;
    sh.lineStyle(2, 0xffffff, 0.5 + 0.4 * k).lineBetween(cc.x - 8, cc.y - 4, cc.x + 8, cc.y + 4).lineBetween(cc.x + 8, cc.y - 4, cc.x - 8, cc.y + 4);
    sh.fillStyle(0x000000, 0.2 + 0.25 * k).fillEllipse(cc.x, cc.y + 2, 26 * (0.4 + 0.6 * k), 8 * (0.4 + 0.6 * k));
  }, () => {
    sh.destroy();
    if (h.over || f.dead) {
      spr.setAlpha(1);
      f.anim.lift = 0;
      trail.destroy();
      return;
    }
    // lao xuống theo đường chéo
    f.body.reset(c.x, c.y);
    f.anim.lift = 120;
    spr.setAlpha(1);
    const t1 = h.clock;
    trail.lineStyle(P.style === 'dragon' ? 10 : 5, P.trailColor ?? 0xffd34a, 0.85).lineBetween(c.x - 90, c.y - 170, c.x, c.y - 4);
    trail.lineStyle(2, 0xffffff, 1).lineBetween(c.x - 90, c.y - 170, c.x, c.y - 4);
    sc.tweens.add({ targets: trail, alpha: 0, duration: 380, onComplete: () => trail.destroy() });
    h.addFrameTask(150, (now) => {
      f.anim.lift = 120 * Math.max(0, 1 - (now - t1) / 140);
    }, () => {
      f.anim.lift = 0;
      if (h.over) return;
      f.playMove(m);
      h.fx.shake(0.012, 220);
      playSfx('boom');
      if (P.shockV !== false) vShock(sc, c.x, c.y + 4, 56, P.trailColor ?? 0xffffff);
      scatter(sc, P.tex ?? 'featherA', c.x, c.y - 6, 12, 50);
      d.explosion(c.x, c.y, (P.hitR ?? 44) * 0.6);
      let any = false;
      for (const e of h.enemies()) {
        if (!inR(e, c.x, c.y, P.hitR ?? 44)) continue;
        any = true;
        const dx = e.x - c.x;
        const dy = e.y - c.y;
        const dd = Math.hypot(dx, dy) || 1;
        h.damageEnemy(e, m, m.power * f.power * mult * (P.powerMult ?? 1.2), dx / dd, dy / dd, true);
      }
      if (any) h.hitStop(80);
    });
  });
}

/** Đá/Đất/Độc – ném vật theo vòng cung (tảng đá, cục bùn, bom độc); đáp xuống có hiệu ứng theo hệ + vũng/vùng lưu lại */
export function castLob(h: SkillHost, f: Fighter, m: MoveDef, P: LooseParams) {
  const sc = h.scene;
  const d = dialectFor(P.dialect, h.fx, m, h);
  const mult = h.stackMult(f, m);
  f.playMove(m);
  playSfx(m.sfx);
  const c = targetPt(h, f, P.reach ?? 100);
  const sx = f.x + f.facing.x * 8;
  const sy = f.chestY;
  const dist = Math.hypot(c.x - sx, c.y - sy);
  const fly = Math.max(180, (dist / (P.speed ?? 260)) * 1000);
  const ball = sc.add.image(sx, sy, P.tex ?? 'boulderA').setScale(P.scale ?? 1).setDepth(99993);
  const t0 = h.clock;
  const arc = P.arcH ?? 40;
  h.addFrameTask(fly, (now) => {
    const k = (now - t0) / fly;
    ball.setPosition(sx + (c.x - sx) * k, sy + (c.y - sy) * k - Math.sin(Math.PI * k) * arc).setRotation(ball.rotation + (P.spin ?? 0.3));
    if (Math.random() < 0.4) d.trail(ball.x, ball.y, 1);
  }, () => {
    ball.destroy();
    if (h.over) return;
    d.explosion(c.x, c.y, (P.r ?? 30) * 0.8);
    d.scorch(c.x, c.y, (P.r ?? 30) * 0.9, 1500);
    h.fx.shake(P.shake ?? 0.006, 140);
    playSfx('boom');
    const amount = m.power * f.power * mult * (P.powerMult ?? 1);
    let any = false;
    for (const e of h.enemies()) {
      if (!inR(e, c.x, c.y, P.r ?? 30)) continue;
      any = true;
      const dx = e.x - c.x;
      const dy = e.y - c.y;
      const dd = Math.hypot(dx, dy) || 1;
      h.damageEnemy(e, m, amount, dx / dd, dy / dd, true);
    }
    if (any && P.hitStop) h.hitStop(P.hitStop);
    if (P.linger) {
      const L = P.linger;
      const zmove: MoveDef = { ...m, id: `${m.id}Zone`, knockback: 0, status: m.status, zone: { radius: P.r ?? 30, ms: L.ms, tickMs: L.tickMs } };
      h.addZone({ x: c.x, y: c.y, r: P.r ?? 30, ms: L.ms, firstTickMs: 300, move: zmove, power: amount * L.powerMult, color: L.color ?? 0x7ad04a });
    }
  });
}

/** Đá – Lăn: thành khối tảng đá lăn thẳng, xô văng mọi địch trên đường, để lại vệt bụi */
export function castRoll(h: SkillHost, f: Fighter, m: MoveDef, P: LooseParams, dir: Phaser.Math.Vector2) {
  const sc = h.scene;
  const d = dialectFor(P.dialect, h.fx, m, h);
  const mult = h.stackMult(f, m);
  const a = aimOf(h, f, dir);
  f.faceTo(a.x, a.y);
  playSfx('dash');
  const ms = P.ms ?? 520;
  const speed = P.speed ?? 240;
  const spr = f.anim.sprite;
  const boulder = sc.add.image(f.x, f.chestY, P.tex ?? 'boulderA').setScale(P.size ?? 2.2).setDepth(99992);
  f.invulnUntil = Math.max(f.invulnUntil, h.clock + ms + 100);
  spr.setAlpha(0);
  const hit = new Set<unknown>();
  const amount = m.power * f.power * mult * (P.powerMult ?? 1);
  let px = f.x;
  let py = f.y;
  h.addFrameTask(ms, (_now, dt) => {
    px = Phaser.Math.Clamp(px + (a.x * speed * dt) / 1000, 16, h.worldW - 16);
    py = Phaser.Math.Clamp(py + (a.y * speed * dt) / 1000, 16, h.worldH - 16);
    f.body.reset(px, py);
    boulder.setPosition(px, py - 8).setRotation(boulder.rotation + 0.35);
    if (Math.random() < 0.7) d.trail(px - a.x * 8, py + 2, 1);
    for (const e of h.enemies()) {
      if (!e.targetable || hit.has(e) || Math.hypot(e.x - px, (e.y - py) / 0.8) > (P.hitR ?? 22) + e.radius) continue;
      hit.add(e);
      h.damageEnemy(e, m, amount, a.x, a.y, true);
      d.hit(e.x, e.centerY, true);
      h.fx.shake(0.006, 90);
    }
  }, () => {
    boulder.destroy();
    spr.setAlpha(1);
    if (!h.over) {
      h.fx.shake(0.008, 140);
      d.explosion(px, py, 18);
    }
  });
}

/** Đá/Độc/Bọ/Rồng – vật rơi theo loạt (phiến đá trượt chéo, giọt axit, kim, thiên thạch), có bóng báo trước */
export function castFallers(h: SkillHost, f: Fighter, m: MoveDef, P: LooseParams) {
  const sc = h.scene;
  const d = dialectFor(P.dialect, h.fx, m, h);
  const mult = h.stackMult(f, m);
  const wind = P.windupMs ?? 420;
  f.anim.playOnce('charge', wind);
  f.sprayUntil = h.clock + wind;
  f.sprayMove = { ...m, moveSlow: 0.3, line: 1 };
  const c = targetPt(h, f, 100);
  const n = P.count ?? 8;
  const spots: { x: number; y: number }[] = [];
  const line = P.mode === 'line';
  for (let i = 0; i < n; i++) {
    if (line) {
      const t = (i + 0.5) / n;
      spots.push({ x: Phaser.Math.Clamp(c.x - P.spread + t * P.spread * 2, 16, h.worldW - 16), y: Phaser.Math.Clamp(c.y + (Math.random() - 0.5) * 24, 16, h.worldH - 16) });
    } else {
      const ang = Math.random() * Math.PI * 2;
      const r = (P.spread ?? 70) * Math.sqrt(Math.random());
      spots.push({ x: Phaser.Math.Clamp(c.x + Math.cos(ang) * r, 16, h.worldW - 16), y: Phaser.Math.Clamp(c.y + Math.sin(ang) * r * 0.8, 16, h.worldH - 16) });
    }
  }
  spots.forEach((s) => groundWarn(sc, s.x, s.y, wind, P.warnEdge ?? 0xd8e040, P.warnFill ?? 0x3a2a08));
  h.schedule(h.clock + wind, () => {
    if (h.over || f.dead || !f.onField) return;
    f.playMove(m);
    playSfx(m.sfx);
    const amount = m.power * f.power * mult * (P.powerMult ?? 1);
    const off = P.offset ?? { x: 0, y: -150 };
    spots.forEach((s, i) => {
      h.schedule(h.clock + i * (P.gapMs ?? 80), () => {
        if (h.over) return;
        const img = sc.add.image(s.x + off.x, s.y + off.y, P.tex ?? 'boulderA').setScale(P.scale ?? 1.4).setDepth(99990);
        if (P.rotate) img.setRotation(Math.atan2(-off.y, -off.x));
        sc.tweens.add({
          targets: img, x: s.x, y: s.y, duration: P.fallMs ?? 220, ease: 'Quad.in',
          onComplete: () => {
            img.destroy();
            if (h.over) return;
            d.explosion(s.x, s.y, 12);
            h.fx.shake(0.004, 80);
            playSfx('hit');
            for (const e of h.enemies()) {
              if (!inR(e, s.x, s.y, P.r ?? 24)) continue;
              h.damageEnemy(e, m, amount, 0, 0, true);
            }
            if (P.scorch) d.scorch(s.x, s.y, P.r ?? 24, 1600);
          },
        });
      });
    });
  });
}

/** Đất – Gò Rung: một gờ đất nổi lên chạy thẳng về phía trước, hất tung mọi địch trên đường */
export function castRidge(h: SkillHost, f: Fighter, m: MoveDef, P: LooseParams, dir: Phaser.Math.Vector2) {
  const sc = h.scene;
  const d = dialectFor(P.dialect, h.fx, m, h);
  const mult = h.stackMult(f, m);
  f.playMove(m);
  playSfx('boom');
  const a = aimOf(h, f, dir);
  f.faceTo(a.x, a.y);
  const nx = -a.y;
  const ny = a.x;
  const range = P.range ?? 170;
  const ms = P.ms ?? 560;
  const w = P.width ?? 22;
  const g = sc.add.graphics().setDepth(-2780);
  const t0 = h.clock;
  const ox = f.x + a.x * 10;
  const oy = f.feetY + a.y * 6;
  const hit = new Set<Enemy>();
  const amount = m.power * f.power * mult * (P.powerMult ?? 1);
  h.addFrameTask(ms + 200, (now) => {
    const k = Math.min(1, (now - t0) / ms);
    const fade = Math.max(0, 1 - Math.max(0, (now - t0 - ms) / 200));
    g.clear();
    const head = range * k;
    const tail = Math.max(0, head - range * 0.55);
    const top: Phaser.Math.Vector2[] = [];
    const bot: Phaser.Math.Vector2[] = [];
    for (let i = 0; i <= 10; i++) {
      const s = tail + ((head - tail) * i) / 10;
      const bump = Math.sin((i / 10) * Math.PI) * w * 0.7;
      top.push(V(ox + a.x * s + nx * w * 0.6, (oy + a.y * s * 0.8 + ny * w * 0.4) - bump));
      bot.push(V(ox + a.x * s - nx * w * 0.6, (oy + a.y * s * 0.8 - ny * w * 0.4) - bump * 0.4));
    }
    const pts = top.concat(bot.reverse());
    g.fillStyle(P.fill ?? 0xb08850, 0.95 * fade).fillPoints(pts, true);
    g.lineStyle(3, P.edge ?? 0x4a3010, fade).strokePoints(pts, true);
    if (k < 1 && Math.random() < 0.8) d.trail(ox + a.x * head + (Math.random() - 0.5) * w, oy + a.y * head * 0.8, 1);
    for (const e of h.enemies()) {
      if (!e.targetable || hit.has(e)) continue;
      const rx = e.x - ox;
      const ry = e.y - oy;
      const along = rx * a.x + ry * a.y * 1.25;
      const side = Math.abs(rx * nx + ry * ny * 1.25);
      if (along < tail - e.radius || along > head + e.radius || side > w + e.radius) continue;
      hit.add(e);
      h.damageEnemy(e, m, amount, a.x, a.y, true);
      const t1 = h.clock;
      h.addFrameTask(380, (n2) => {
        e.anim.lift = 26 * Math.sin(Math.PI * Math.min(1, (n2 - t1) / 380));
      }, () => {
        e.anim.lift = 0;
      });
    }
  }, () => g.destroy());
}

/** Đất – Cát Lún: vùng cát chảy vào tâm, địch chìm dần (chậm tăng), đủ lâu thì bị kẹt */
export function castQuicksand(h: SkillHost, f: Fighter, m: MoveDef, P: LooseParams) {
  const sc = h.scene;
  const mult = h.stackMult(f, m);
  const wind = P.windupMs ?? 300;
  f.anim.playOnce('charge', wind);
  f.sprayUntil = h.clock + wind;
  f.sprayMove = { ...m, moveSlow: 0.3, line: 1 };
  const c = targetPt(h, f, 90);
  const R = P.r ?? 64;
  const ms = P.ms ?? 2600;
  h.schedule(h.clock + wind, () => {
    if (h.over || f.dead || !f.onField) return;
    f.playMove(m);
    playSfx('boom');
    h.fx.shake(0.01, 240);
    const g = sc.add.graphics().setDepth(-2790);
    const t0 = h.clock;
    const inside = new Map<Enemy, number>();
    const amount = m.power * f.power * mult * (P.powerMult ?? 1) * 0.25;
    let next = 0;
    h.addFrameTask(ms, (now) => {
      const el = now - t0;
      g.clear();
      const pts: Phaser.Math.Vector2[] = [];
      for (let i = 0; i < 12; i++) {
        const aa = (i / 12) * Math.PI * 2;
        pts.push(V(c.x + Math.cos(aa) * R * (0.9 + 0.1 * Math.sin(i * 3 + now / 300)), c.y + Math.sin(aa) * R * 0.7 * (0.9 + 0.1 * Math.sin(i * 3 + now / 300))));
      }
      g.fillStyle(P.fill ?? 0xc8a060, 0.65).fillPoints(pts, true);
      g.lineStyle(3, P.edge ?? 0x6a4a20, 1).strokePoints(pts, true);
      g.lineStyle(3, 0xe8d090, 0.9);
      for (let i = 0; i < 10; i++) {
        const aa = (i / 10) * Math.PI * 2 + now / 800;
        g.lineBetween(c.x + Math.cos(aa) * R * 0.95, c.y + Math.sin(aa) * R * 0.66, c.x + Math.cos(aa + 0.3) * R * 0.4, c.y + Math.sin(aa + 0.3) * R * 0.28);
      }
      if (Math.random() < 0.5) h.fx.dustPuff(c.x + (Math.random() - 0.5) * R, c.y + (Math.random() - 0.5) * R * 0.5, 1);
      for (const e of h.enemies()) {
        if (!inR(e, c.x, c.y, R * 0.92)) {
          if (inside.has(e)) {
            e.anim.lift = 0;
            inside.delete(e);
          }
          continue;
        }
        const t = inside.get(e) ?? now;
        inside.set(e, t);
        const sink = Math.min(1, (now - t) / 1200);
        e.anim.lift = -9 * sink;
        e.applySlow(1 - 0.75 * sink, 300, now);
        if (sink >= 1 && !e.isBoss) e.stunnedUntil = Math.max(e.stunnedUntil, now + 200);
        e.body.reset(e.x + (c.x - e.x) * 0.012, e.y + (c.y - e.y) * 0.012);
      }
      if (now >= next) {
        next = now + (P.tickMs ?? 500);
        for (const e of inside.keys()) if (!e.dead) h.damageEnemy(e, { ...m, knockback: 0, status: undefined }, amount, 0, 0, false, true);
      }
      void el;
    }, () => {
      g.destroy();
      for (const e of inside.keys()) e.anim.lift = 0;
    });
  });
}

/** Đất – Đào Hố: chui xuống đất (biến mất, bất tử), gò đất chạy ngầm tới mục tiêu rồi trồi lên giữa đám, đất bắn tung */
export function castAmbush(h: SkillHost, f: Fighter, m: MoveDef, P: LooseParams) {
  const sc = h.scene;
  const d = dialectFor(P.dialect, h.fx, m, h);
  const mult = h.stackMult(f, m);
  const c = targetPt(h, f, 90);
  const ms = P.undergroundMs ?? 650;
  const spr = f.anim.sprite;
  playSfx('dash');
  f.invulnUntil = Math.max(f.invulnUntil, h.clock + ms + 250);
  spr.setAlpha(0);
  scatter(sc, 'mudball', f.x, f.feetY, 8, 24);
  const g = sc.add.graphics().setDepth(-2780);
  const sx = f.x;
  const sy = f.y;
  const t0 = h.clock;
  h.addFrameTask(ms, (now) => {
    const k = Math.min(1, (now - t0) / ms);
    const x = sx + (c.x - sx) * k;
    const y = sy + (c.y - sy) * k;
    g.clear();
    for (let i = 0; i < 6; i++) {
      const kk = Math.max(0, k - i * 0.04);
      const px = sx + (c.x - sx) * kk;
      const py = sy + (c.y - sy) * kk;
      g.fillStyle(P.fill ?? 0xa07a40, 0.9).fillTriangle(px - 12, py + 4, px, py - 8 + i, px + 12, py + 4);
      g.lineStyle(1.5, 0x4a3010, 1).strokeTriangle(px - 12, py + 4, px, py - 8 + i, px + 12, py + 4);
    }
    if (Math.random() < 0.6) d.trail(x, y, 1);
    f.body.reset(x, y);
  }, () => {
    g.destroy();
    spr.setAlpha(1);
    if (h.over || f.dead) return;
    f.playMove(m);
    h.fx.shake(0.012, 200);
    playSfx('boom');
    scatter(sc, 'mudball', c.x, c.y - 4, 16, 60);
    d.explosion(c.x, c.y, 24);
    let any = false;
    for (const e of h.enemies()) {
      if (!inR(e, c.x, c.y, P.hitR ?? 44)) continue;
      any = true;
      const dx = e.x - c.x;
      const dy = e.y - c.y;
      const dd = Math.hypot(dx, dy) || 1;
      h.damageEnemy(e, m, m.power * f.power * mult * (P.powerMult ?? 1), dx / dd, dy / dd, true);
      const t1 = h.clock;
      h.addFrameTask(320, (n2) => {
        e.anim.lift = 24 * Math.sin(Math.PI * Math.min(1, (n2 - t1) / 320));
      }, () => {
        e.anim.lift = 0;
      });
    }
    if (any) h.hitStop(80);
  });
}

/** Bay – Lốc Xoáy: cột lốc (đường zigzag + lông/mảnh vụn bay) di chuyển về phía trước, hút rồi quăng địch */
export function castTwister(h: SkillHost, f: Fighter, m: MoveDef, P: LooseParams, dir: Phaser.Math.Vector2) {
  const sc = h.scene;
  const d = dialectFor(P.dialect, h.fx, m, h);
  const mult = h.stackMult(f, m);
  f.playMove(m);
  playSfx('whip');
  const a = aimOf(h, f, dir);
  f.faceTo(a.x, a.y);
  const ms = P.ms ?? 1500;
  const speed = P.speed ?? 80;
  const R = P.r ?? 36;
  const H = P.height ?? 90;
  const g = sc.add.graphics().setDepth(99990);
  let cx = f.x + a.x * 24;
  let cy = f.y + a.y * 24;
  const amount = m.power * f.power * mult * (P.powerMult ?? 1) * 0.3;
  let next = 0;
  const col: number[] = P.colors ?? [0xffffff, 0xcfe6ff];
  h.addFrameTask(ms, (now, dt) => {
    cx = Phaser.Math.Clamp(cx + (a.x * speed * dt) / 1000, 16, h.worldW - 16);
    cy = Phaser.Math.Clamp(cy + (a.y * speed * dt) / 1000, 16, h.worldH - 16);
    g.clear();
    for (let i = 0; i < 14; i++) {
      const t = i / 13;
      const w = 6 + t * R;
      const y = cy - t * H;
      const off = Math.sin(now / 90 + i) * 4;
      g.lineStyle(3, col[i % col.length], 0.9).lineBetween(cx - w + off, y, cx + w + off, y + 6);
      g.lineStyle(2, col[(i + 1) % col.length], 0.6).lineBetween(cx + w + off, y + 6, cx - w + off + 6, y + 12);
    }
    if (Math.random() < 0.6) scatter(sc, P.tex ?? 'featherA', cx + (Math.random() - 0.5) * R * 2, cy - Math.random() * H, 1, 24);
    for (const e of h.enemies()) {
      if (!inR(e, cx, cy, R)) continue;
      e.stunnedUntil = Math.max(e.stunnedUntil, now + 160);
      e.body.reset(e.x + (cx - e.x) * 0.1, e.y + (cy - e.y) * 0.1);
      e.anim.lift = Math.min(28, e.anim.lift + dt * 0.08);
    }
    if (now >= next) {
      next = now + 280;
      for (const e of h.enemies()) if (inR(e, cx, cy, R)) h.damageEnemy(e, { ...m, knockback: 0 }, amount, 0, 0, false, true);
    }
    void d;
  }, () => {
    g.destroy();
    if (h.over) return;
    for (const e of h.enemies()) {
      if (!inR(e, cx, cy, R * 1.2)) continue;
      e.anim.lift = 0;
      h.damageEnemy(e, { ...m, knockback: 320 }, amount * 1.5, a.x, a.y, true);
    }
    h.fx.shake(0.008, 160);
  });
}

/** Bọ – Mạng Tơ: mạng nhện đa giác phủ vùng, địch bị trói tại chỗ, bọ chạy trên tơ cắn; có thể kéo mục tiêu về trước */
export function castWeb(h: SkillHost, f: Fighter, m: MoveDef, P: LooseParams) {
  const sc = h.scene;
  const mult = h.stackMult(f, m);
  f.playMove(m);
  playSfx(m.sfx);
  const c = targetPt(h, f, 90);
  const R = P.r ?? 50;
  const ms = P.ms ?? 2200;
  const g = sc.add.graphics().setDepth(-2780);
  const line = sc.add.graphics().setDepth(99990);
  const t0 = h.clock;
  const target = h.aimTarget;
  if (P.pull && target && !target.dead) {
    const sx = target.x;
    const sy = target.y;
    h.addFrameTask(300, (now) => {
      const k = Math.min(1, (now - t0) / 300);
      line.clear();
      line.lineStyle(1.5, 0xffffff, 0.9).lineBetween(f.x, f.chestY, target.x, target.centerY);
      if (!target.dead) {
        target.stunnedUntil = Math.max(target.stunnedUntil, now + 160);
        target.body.reset(sx + (f.x + f.facing.x * 26 - sx) * k, sy + (f.y + f.facing.y * 12 - sy) * k);
      }
    }, () => line.destroy());
  } else line.destroy();
  const amount = m.power * f.power * mult * (P.powerMult ?? 1) * 0.3;
  let next = 0;
  const bugs = Array.from({ length: P.bugs ?? 4 }, () => sc.add.image(c.x, c.y, 'bugdot').setDepth(c.y + 3000));
  h.schedule(h.clock + (P.pull ? 300 : 0), () => {
    const s0 = h.clock;
    const wc = P.pull && target && !target.dead ? { x: target.x, y: target.y } : c;
    h.addFrameTask(ms, (now) => {
      const k = Math.min(1, (now - s0) / 250);
      g.clear();
      drawWeb(g, wc.x, wc.y, R * (0.4 + 0.6 * k), P.n ?? 8, P.rings ?? 4, 0.9);
      bugs.forEach((b, i) => {
        const a = (i / bugs.length) * Math.PI * 2 + now / 500;
        const rr = R * (0.3 + 0.6 * ((i * 0.37 + now / 1500) % 1));
        b.setPosition(wc.x + Math.cos(a) * rr, wc.y + Math.sin(a) * rr * 0.8);
      });
      for (const e of h.enemies()) {
        if (!inR(e, wc.x, wc.y, R * 0.9)) continue;
        if (!e.isBoss) e.stunnedUntil = Math.max(e.stunnedUntil, now + 200);
        else e.applySlow(0.5, 300, now);
      }
      if (now >= next) {
        next = now + (P.tickMs ?? 420);
        for (const e of h.enemies()) if (inR(e, wc.x, wc.y, R * 0.9)) h.damageEnemy(e, { ...m, knockback: 0 }, amount, 0, 0, false, true);
      }
    }, () => {
      g.destroy();
      bugs.forEach((b) => b.destroy());
    });
  });
}

/** Bọ – Bầy Cắn: đàn côn trùng li ti tự bay tới cắn địch gần nhất, rồi quay về quanh bạn (đồng minh tự hành động) */
export function castSwarm(h: SkillHost, f: Fighter, m: MoveDef, P: LooseParams, dir: Phaser.Math.Vector2) {
  const sc = h.scene;
  const mult = h.stackMult(f, m);
  f.playMove(m);
  playSfx(m.sfx);
  const a = aimOf(h, f, dir);
  const n = P.n ?? 18;
  const ms = P.ms ?? 4000;
  const amount = (m.power * f.power * mult * (P.powerMult ?? 1)) / 5;
  const bugs = Array.from({ length: n }, (_, i) => ({ img: sc.add.image(f.x, f.chestY, 'bugdot').setDepth(99990), x: f.x, y: f.chestY, bite: 0, ph: i * 0.9 }));
  h.addFrameTask(ms, (now, dt) => {
    for (const b of bugs) {
      let tx: number;
      let ty: number;
      let tgt: Enemy | null = null;
      let best = 170;
      for (const e of h.enemies()) {
        if (!e.targetable) continue;
        const dd = Math.hypot(e.x - b.x, e.centerY - b.y);
        if (dd < best) {
          best = dd;
          tgt = e;
        }
      }
      if (tgt) {
        tx = tgt.x + Math.cos(now / 120 + b.ph) * 6;
        ty = tgt.centerY + Math.sin(now / 110 + b.ph) * 5;
      } else {
        tx = f.x + Math.cos(now / 400 + b.ph) * 26 + a.x * 8;
        ty = f.chestY + Math.sin(now / 400 + b.ph) * 18;
      }
      const sp = (tgt ? 170 : 120) * dt / 1000;
      const dx = tx - b.x;
      const dy = ty - b.y;
      const dd = Math.hypot(dx, dy) || 1;
      b.x += (dx / dd) * Math.min(sp, dd);
      b.y += (dy / dd) * Math.min(sp, dd);
      b.img.setPosition(b.x + Math.sin(now / 40 + b.ph) * 1.5, b.y).setDepth(b.y + 3000);
      if (tgt && dd < 9 && now >= b.bite) {
        b.bite = now + 520;
        h.damageEnemy(tgt, { ...m, knockback: 0 }, amount, 0, 0, false, true);
      }
    }
  }, () => bugs.forEach((b) => b.img.destroy()));
}

/** Thường – Tri-Attack: 3 chấm sáng (đỏ/xanh/vàng) lao thành tam giác; đòn chọn HỆ KHẮC địch mục tiêu */
export function castTriAttack(h: SkillHost, f: Fighter, m: MoveDef, P: LooseParams) {
  const sc = h.scene;
  const mult = h.stackMult(f, m);
  f.playMove(m);
  playSfx(m.sfx);
  const t = h.aimTarget && !h.aimTarget.dead ? h.aimTarget : h.enemies().filter((e) => e.targetable).sort((p, q) => Math.hypot(p.x - f.x, p.y - f.y) - Math.hypot(q.x - f.x, q.y - f.y))[0];
  const c = t ? { x: t.x, y: t.centerY } : { x: f.x + f.facing.x * 120, y: f.chestY };
  const els: { type: any; color: number; name: string }[] = [
    { type: 'fire', color: 0xff5a3a, name: 'Lửa' },
    { type: 'ice', color: 0x4ab0ff, name: 'Băng' },
    { type: 'electric', color: 0xffd34a, name: 'Điện' },
  ];
  let pick = els[0];
  let bestM = -1;
  if (t) for (const e of els) {
    const em = effectiveness(e.type, t.species.types);
    if (em > bestM) {
      bestM = em;
      pick = e;
    }
  }
  h.fx.floatingLabel(f.x, f.chestY - 22, pick.type.toUpperCase(), '#' + pick.color.toString(16).padStart(6, '0'));
  const g = sc.add.graphics().setDepth(99994);
  const t0 = h.clock;
  const ms = P.flyMs ?? 420;
  const sx = f.x + f.facing.x * 10;
  const sy = f.chestY;
  const dots = els.map((e, i) => ({ c: e.color, ox: Math.cos((i / 3) * Math.PI * 2) * 12, oy: Math.sin((i / 3) * Math.PI * 2) * 12 }));
  h.addFrameTask(ms, (now) => {
    const k = (now - t0) / ms;
    g.clear();
    const x = sx + (c.x - sx) * k;
    const y = sy + (c.y - sy) * k;
    const spread = 1 - k * 0.7;
    const pts = dots.map((d) => ({ x: x + d.ox * spread, y: y + d.oy * spread }));
    g.lineStyle(1.5, 0xffffff, 0.6).strokePoints(pts.map((p) => V(p.x, p.y)), true);
    dots.forEach((d, i) => {
      g.fillStyle(d.c, 1).fillRect(pts[i].x - 4, pts[i].y - 4, 8, 8);
      g.lineStyle(2, 0xffffff, 1).strokeRect(pts[i].x - 4, pts[i].y - 4, 8, 8);
    });
  }, () => {
    g.destroy();
    if (h.over) return;
    h.fx.shake(0.008, 140);
    playSfx('boom');
    scatter(sc, 'star5', c.x, c.y, 10, 44, pick.color);
    const dd = dialectFor(pick.type, h.fx, m, h);
    dd.explosion(c.x, c.y, P.r ?? 26);
    for (const e of h.enemies()) {
      if (!inR(e, c.x, c.y, P.r ?? 26)) continue;
      h.damageEnemy(e, { ...m, type: pick.type }, m.power * f.power * mult * (P.powerMult ?? 1), 0, 0, true);
    }
  });
}

/** Thường – Phá Hủy / Tia Hủy Diệt: gồng (rung, tia hội tụ) rồi tia trắng-vàng khổng lồ thẳng xuyên sân; sau đó đứng thở */
export function castBeam(h: SkillHost, f: Fighter, m: MoveDef, P: LooseParams, dir: Phaser.Math.Vector2) {
  const sc = h.scene;
  const mult = h.stackMult(f, m);
  const wind = P.windupMs ?? 700;
  f.anim.playOnce('charge', wind);
  f.sprayUntil = h.clock + wind;
  f.sprayMove = { ...m, moveSlow: 0.1, line: 1 };
  playSfx('roar');
  const g = sc.add.graphics().setDepth(99991);
  const t0 = h.clock;
  let a = aimOf(h, f, dir);
  h.addFrameTask(wind, (now) => {
    a = aimOf(h, f, dir);
    f.faceTo(a.x, a.y);
    const k = (now - t0) / wind;
    g.clear();
    g.lineStyle(2, 0xffffff, 0.3 + 0.6 * k);
    for (let i = 0; i < 12; i++) {
      const ang = (i / 12) * Math.PI * 2 + now / 300;
      const r1 = 60 * (1 - k) + 8;
      g.lineBetween(f.x + a.x * 10 + Math.cos(ang) * (r1 + 16), f.chestY + Math.sin(ang) * (r1 + 16) * 0.8, f.x + a.x * 10 + Math.cos(ang) * r1, f.chestY + Math.sin(ang) * r1 * 0.8);
    }
    h.fx.shake(0.002 + 0.004 * k, 60);
  }, () => g.destroy());
  h.schedule(t0 + wind, () => {
    if (h.over || f.dead || !f.onField) return;
    f.playMove(m);
    playSfx('boom');
    h.fx.shake(P.shake ?? 0.02, 500);
    const len = P.len ?? 280;
    const w = P.width ?? 30;
    const ox = f.x + a.x * 10;
    const oy = f.chestY + a.y * 6;
    const nx = -a.y;
    const ny = a.x;
    const bm = sc.add.graphics().setDepth(99992);
    const ms = P.beamMs ?? 700;
    const b0 = h.clock;
    const amount = m.power * f.power * mult * (P.powerMult ?? 1) * 0.25;
    let next = 0;
    f.sprayUntil = h.clock + ms + (P.recoilMs ?? 900);
    f.sprayMove = { ...m, moveSlow: 0.05, line: 1 };
    h.addFrameTask(ms, (now) => {
      const k = Math.min(1, (now - b0) / 120);
      bm.clear();
      const ww = w * (0.6 + 0.4 * Math.sin(now / 40)) * k;
      for (const [ww2, col, al] of [[ww, 0xfff0a0, 0.7], [ww * 0.6, 0xffffff, 0.95], [ww * 0.25, 0xffffff, 1]] as [number, number, number][]) {
        bm.fillStyle(col, al).fillPoints([V(ox + nx * ww2 * 0.5, oy + ny * ww2 * 0.5), V(ox + a.x * len + nx * ww2, oy + a.y * len + ny * ww2), V(ox + a.x * len - nx * ww2, oy + a.y * len - ny * ww2), V(ox - nx * ww2 * 0.5, oy - ny * ww2 * 0.5)], true);
      }
      if (now >= next) {
        next = now + 110;
        for (const e of h.enemies()) {
          if (!e.targetable) continue;
          const rx = e.x - ox;
          const ry = e.centerY - oy;
          const along = rx * a.x + ry * a.y;
          const side = Math.abs(rx * nx + ry * ny);
          if (along < 0 || along > len + e.radius || side > w + e.radius) continue;
          h.damageEnemy(e, { ...m, knockback: 160 }, amount, a.x, a.y, true, true);
        }
      }
    }, () => bm.destroy());
  });
}

// ===================================================================== tuyệt chiêu

/** Draco Meteor: bầu trời hiện bóng rồng dang cánh, thiên thạch đuôi lửa lao xuống từng địch, vỡ vảy văng tỏa */
export function castDraco(h: SkillHost, f: Fighter, P: LooseParams, _u: UltimateDef, mv: MoveDef, amount: number) {
  if (h.over) return;
  const sc = h.scene;
  const cam = sc.cameras.main;
  const d = dialectFor(P.dialect ?? 'dragon', h.fx, mv, h);
  cam.flash(260, 120, 80, 255, false);
  const dark = sc.add.rectangle(0, 0, cam.width, cam.height, 0x180a3a, 0).setOrigin(0).setScrollFactor(0).setDepth(99989);
  sc.tweens.add({ targets: dark, fillAlpha: 0.5, duration: 400 });
  sc.time.delayedCall(P.totalMs ?? 2600, () => sc.tweens.add({ targets: dark, fillAlpha: 0, duration: 500, onComplete: () => dark.destroy() }));
  playSfx('roar');
  h.fx.shake(0.012, 500);
  const sil = sc.add.graphics().setScrollFactor(0).setDepth(99990).setAlpha(0);
  sil.setPosition(cam.width / 2, 90);
  wingShape(sil, 70, 0x281460, 0xffd34a);
  sc.tweens.add({ targets: sil, alpha: 1, duration: 500 });
  sc.tweens.add({ targets: sil, alpha: 0, duration: 500, delay: (P.totalMs ?? 2600) - 300, onComplete: () => sil.destroy() });
  const targets = h.enemies().filter((e) => e.targetable);
  const n = Math.max(P.meteors ?? 8, targets.length);
  for (let i = 0; i < n; i++) {
    h.schedule(h.clock + 500 + i * 170, () => {
      if (h.over) return;
      const e = targets[i % Math.max(1, targets.length)];
      const tx = e && !e.dead ? e.x : f.x + (Math.random() - 0.5) * 220;
      const ty = e && !e.dead ? e.y : f.y + (Math.random() - 0.5) * 120;
      meteorFall(sc, tx - 70, ty - 240, tx, ty, 320, 10, () => {
        h.fx.shake(0.012, 140);
        playSfx('boom');
        scatter(sc, 'scaleD', tx, ty - 4, 14, 70);
        d.explosion(tx, ty, 26);
        for (const en of h.enemies()) {
          if (!inR(en, tx, ty, 34)) continue;
          h.damageEnemy(en, mv, amount * (P.hitPower ?? 0.5), 0, 0, true);
        }
      });
    });
  }
}

/** Đàn Chim Giáng Trời: trời tối, đàn chim (bóng V) ào qua khắp màn hình đâm từng địch, rồi một cú lao tối thượng kèm sóng V lớn */
export function castFlock(h: SkillHost, f: Fighter, P: LooseParams, _u: UltimateDef, mv: MoveDef, amount: number) {
  if (h.over) return;
  const sc = h.scene;
  const cam = sc.cameras.main;
  cam.flash(240, 200, 230, 255, false);
  const dark = sc.add.rectangle(0, 0, cam.width, cam.height, 0x10204a, 0).setOrigin(0).setScrollFactor(0).setDepth(99989);
  sc.tweens.add({ targets: dark, fillAlpha: 0.45, duration: 400 });
  sc.time.delayedCall(P.totalMs ?? 2800, () => sc.tweens.add({ targets: dark, fillAlpha: 0, duration: 500, onComplete: () => dark.destroy() }));
  playSfx('roar');
  const wv = cam.worldView;
  const targets = h.enemies().filter((e) => e.targetable);
  const n = P.birds ?? 22;
  for (let i = 0; i < n; i++) {
    const y = wv.y + 20 + Math.random() * (wv.height - 40);
    const g = sc.add.graphics().setPosition(wv.x - 30, y).setDepth(99991);
    g.lineStyle(3, 0x101a30, 1).lineBetween(-8, 4, 0, 0).lineBetween(0, 0, 8, 4);
    const delay = 300 + Math.random() * 1200;
    sc.tweens.add({ targets: g, x: wv.right + 30, y: y + (Math.random() - 0.5) * 60, duration: 900 + Math.random() * 400, delay, onComplete: () => g.destroy() });
  }
  targets.forEach((e, i) => {
    h.schedule(h.clock + 600 + i * 150, () => {
      if (h.over || e.dead) return;
      h.fx.shake(0.006, 100);
      scatter(sc, 'featherA', e.x, e.centerY, 8, 36);
      h.damageEnemy(e, mv, amount * (P.hitPower ?? 0.4), 0, 0, true, true);
    });
  });
  h.schedule(h.clock + 600 + targets.length * 150 + 600, () => {
    if (h.over) return;
    const cx = targets.length ? targets.reduce((s, e) => s + e.x, 0) / targets.length : f.x + f.facing.x * 80;
    const cy = targets.length ? targets.reduce((s, e) => s + e.y, 0) / targets.length : f.y;
    cam.flash(300, 255, 255, 255, false);
    h.fx.shake(0.03, 520);
    playSfx('boom');
    vShock(sc, cx, cy + 6, 120, 0xffd34a);
    scatter(sc, 'featherA', cx, cy, 24, 110);
    for (const e of targets) {
      if (e.dead) continue;
      const dx = e.x - cx;
      const dy = e.y - cy;
      const dd = Math.hypot(dx, dy) || 1;
      h.damageEnemy(e, { ...mv, knockback: 420 }, amount * (P.slamPower ?? 0.9), dx / dd, dy / dd, true);
    }
    h.hitStop(120);
  });
}

/** Sóng quét (Độc: làn sóng bùn · Đá: bức vách đá trượt · Bọ: mưa bọ): mép sóng chạy ngang qua cả màn hình, mỗi địch bị quét qua chịu đòn một lần */
export function castWavefront(h: SkillHost, f: Fighter, P: LooseParams, _u: UltimateDef, mv: MoveDef, amount: number) {
  if (h.over) return;
  const sc = h.scene;
  const cam = sc.cameras.main;
  const wv = cam.worldView;
  const shape: string = P.shape ?? 'sludge';
  const ms = P.ms ?? 1500;
  cam.flash(240, 220, 220, 220, false);
  h.fx.shake(0.012, 600);
  playSfx('roar');
  const tint = shape === 'sludge' ? 0x0a2a08 : shape === 'rock' ? 0x3a2a18 : 0x1a2a0a;
  const dark = sc.add.rectangle(0, 0, cam.width, cam.height, tint, 0).setOrigin(0).setScrollFactor(0).setDepth(99989);
  sc.tweens.add({ targets: dark, fillAlpha: 0.35, duration: 300 });
  sc.time.delayedCall(ms + 600, () => sc.tweens.add({ targets: dark, fillAlpha: 0, duration: 400, onComplete: () => dark.destroy() }));
  const dirX = f.facing.x >= 0 ? 1 : -1;
  const x0 = dirX > 0 ? wv.x - 60 : wv.right + 60;
  const x1 = dirX > 0 ? wv.right + 60 : wv.x - 60;
  const g = sc.add.graphics().setDepth(99988);
  const t0 = h.clock;
  const hit = new Set<Enemy>();
  const mvv: MoveDef = { ...mv };
  const bugs = shape === 'swarm' ? Array.from({ length: 90 }, () => sc.add.image(x0, wv.y + Math.random() * wv.height, 'bugdot').setDepth(99991)) : [];
  h.addFrameTask(ms, (now) => {
    const k = Math.min(1, (now - t0) / ms);
    const fx = x0 + (x1 - x0) * k;
    g.clear();
    const trailLen = 260;
    if (shape === 'sludge') {
      // Biển Độc: con sóng độc cuồn cuộn quét ngang sân — mặt sóng sủi bọt khí, thân sóng tím sẫm ánh xanh, để lại đầm lầy độc bốc khói
      const span = Math.abs(fx - x0);
      const back = dirX > 0 ? x0 : x0; // đầm lầy kéo dài từ điểm xuất phát tới mặt sóng
      const swampPts = [V(back, wv.y - 10), V(fx, wv.y - 10)];
      for (let i = 0; i <= 18; i++) swampPts.push(V(fx - dirX * (6 + Math.abs(Math.sin(i * 0.9 + now / 140)) * 14), wv.y + (wv.height * i) / 18));
      swampPts.push(V(back, wv.bottom + 10));
      g.fillStyle(0x3e7a2a, 0.22).fillPoints(swampPts, true);
      // thân sóng: dải màu chuyển dần từ tím sẫm (sát mặt sóng) sang xanh độc nhạt (đuôi), mặt sóng lượn
      const strips = 22;
      for (let j = 0; j < strips; j++) {
        const u = j / strips;
        const sx = fx - dirX * (u * trailLen);
        const w = trailLen / strips + 1;
        const lerp = (a1: number, b1: number) => Math.round(a1 + (b1 - a1) * u);
        const col = (lerp(0x2a, 0x6a) << 16) | (lerp(0x10, 0xb0) << 8) | lerp(0x50, 0x30);
        g.fillStyle(col, 0.92 * Math.pow(1 - u, 0.8)).fillRect(Math.min(sx, sx - dirX * w), wv.y - 10, w, wv.height + 20);
      }
      for (let i = 0; i < 18; i++) {
        const yy = wv.y + (wv.height * i) / 18;
        g.fillStyle(0x2a1050, 0.9).fillCircle(fx + dirX * (6 + Math.sin(i * 1.1 + now / 110) * 12), yy + wv.height / 36, 12);
      }
      g.fillStyle(0xa0e060, 0.18).fillRect(Math.min(fx, fx - dirX * trailLen), wv.y, trailLen, wv.height);
      // bọt khí trên mặt sóng (sáng, có điểm sáng trắng) và bọt vỡ lác đác phía sau
      for (let i = 0; i < 12; i++) {
        const by = wv.y + (wv.height * (i + 0.5)) / 12;
        const bx = fx + dirX * (14 + Math.sin(i * 1.7 + now / 120) * 10);
        const br = 9 + 5 * Math.abs(Math.sin(now / 160 + i * 1.3));
        g.fillStyle(0x7ae04a, 0.9).fillCircle(bx, by, br);
        g.lineStyle(2, 0x1a4a10, 1).strokeCircle(bx, by, br);
        g.fillStyle(0xe8ffc8, 0.9).fillCircle(bx - br * 0.3, by - br * 0.3, br * 0.28);
      }
      for (let i = 0; i < 10; i++) {
        const bx = fx - dirX * (30 + ((i * 53 + now / 8) % trailLen));
        const by = wv.y + ((i * 71 + now / 12) % wv.height);
        g.lineStyle(1.5, 0xc8ff90, 0.7).strokeCircle(bx, by, 3 + (i % 4) * 2);
      }
      // giọt nhớt chảy dọc theo sau sóng
      for (let i = 0; i < 8; i++) {
        const dx = fx - dirX * (20 + i * 26);
        g.lineStyle(3, 0x1a0a30, 0.7).lineBetween(dx, wv.y + ((i * 83) % wv.height), dx, wv.y + ((i * 83) % wv.height) + 26 + (i % 3) * 8);
      }
      void span;
      if (Math.random() < 0.8) scatter(sc, 'goo', fx - dirX * Math.random() * trailLen, wv.y + Math.random() * wv.height, 1, 14);
      if (Math.random() < 0.5) h.fx.puff('poisonpuff', fx - dirX * Math.random() * trailLen * 0.8, wv.y + Math.random() * wv.height, 1);
    } else if (shape === 'rock') {
      for (let i = 0; i < 8; i++) {
        const y = wv.y + (wv.height * (i + 0.5)) / 8;
        g.fillStyle(0x5a4c3e, 1).fillRect(fx - dirX * 30 - 30, y - wv.height / 16, 60, wv.height / 8 - 3);
        g.lineStyle(2, 0x2a2018, 1).strokeRect(fx - dirX * 30 - 30, y - wv.height / 16, 60, wv.height / 8 - 3);
        g.fillStyle(0x86745e, 0.8).fillRect(fx - dirX * 30 - 30, y - wv.height / 16, 60, 6);
      }
      g.fillStyle(0xc8b890, 0.35).fillRect(Math.min(fx, fx - dirX * trailLen), wv.y, trailLen, wv.height);
      if (Math.random() < 0.8) h.fx.dustPuff(fx - dirX * Math.random() * 120, wv.y + Math.random() * wv.height, 2);
    } else {
      bugs.forEach((b, i) => {
        const lag = (i % 9) * 18;
        b.setPosition(fx - dirX * lag + Math.sin(now / 40 + i) * 4, wv.y + ((i * 37) % 100) * (wv.height / 100));
      });
    }
    for (const e of h.enemies()) {
      if (!e.targetable || hit.has(e)) continue;
      if ((dirX > 0 && e.x < fx) || (dirX < 0 && e.x > fx)) {
        hit.add(e);
        scatter(sc, shape === 'sludge' ? 'goo' : shape === 'rock' ? 'boulderB' : 'bugdot', e.x, e.centerY, 10, 40);
        h.damageEnemy(e, mvv, amount * (P.hitPower ?? 1), dirX, 0, true);
        if (P.status === 'poison') e.applyStatus('poison', 4000, h.clock, amount * 0.03);
      }
    }
  }, () => {
    // Biển Độc: đầm lầy độc còn lại một lúc rồi mờ dần
    if (shape === 'sludge') sc.tweens.add({ targets: g, alpha: 0, duration: 900, delay: 300, onComplete: () => g.destroy() });
    else g.destroy();
    bugs.forEach((b) => b.destroy());
    if (!h.over) h.fx.shake(0.02, 300);
  });
}

/** Vực Đất (Fissure): mặt sân nứt toang thành khe sâu đen dưới từng địch, nuốt rồi khép lại nghiền */
export function castChasm(h: SkillHost, f: Fighter, P: LooseParams, _u: UltimateDef, mv: MoveDef, amount: number) {
  if (h.over) return;
  const sc = h.scene;
  const cam = sc.cameras.main;
  cam.flash(220, 200, 170, 120, false);
  h.fx.shake(0.02, P.holdMs ? P.holdMs + 600 : 1600);
  playSfx('roar');
  const targets = h.enemies().filter((e) => e.targetable);
  const hold = P.holdMs ?? 1000;
  const closers = targets.map((e) => {
    const close = chasmOpen(sc, e.x, e.y + 4, 40, hold);
    groundCracks(sc, e.x, e.y + 4, 70, 5, hold + 800, 0);
    return close;
  });
  const t0 = h.clock;
  h.addFrameTask(hold, (now) => {
    const k = Math.min(1, (now - t0) / hold);
    for (const e of targets) {
      if (e.dead) continue;
      e.stunnedUntil = Math.max(e.stunnedUntil, now + 160);
      e.anim.lift = -10 * Math.min(1, k * 2);
    }
    if (Math.random() < 0.5) h.fx.dustPuff(f.x + (Math.random() - 0.5) * 260, f.y + (Math.random() - 0.5) * 140, 1);
  }, () => {
    closers.forEach((c) => c());
    for (const e of targets) e.anim.lift = 0;
    if (h.over) return;
    cam.flash(260, 255, 230, 190, false);
    h.fx.shake(0.03, 500);
    playSfx('boom');
    let any = false;
    for (const e of targets) {
      if (e.dead) continue;
      any = true;
      scatter(sc, 'boulderB', e.x, e.centerY, 12, 60);
      h.fx.dustPuff(e.x, e.y, 6);
      h.damageEnemy(e, mv, amount * (P.slamPower ?? 1), 0, 0, true);
    }
    if (any) h.hitStop(120);
  });
}

/** Hyper Beam (tuyệt chiêu Thường): gồng lâu hơn, tia lớn hơn */
export function castHyperBeamUlt(h: SkillHost, f: Fighter, P: LooseParams, _u: UltimateDef, mv: MoveDef, amount: number) {
  const dir = V(f.facing.x || 1, f.facing.y);
  const m2: MoveDef = { ...mv, power: Math.max(1, amount / Math.max(0.0001, f.power)) };
  castBeam(h, f, m2, { dialect: 'normal', windupMs: P.windupMs ?? 900, len: P.len ?? 360, width: P.width ?? 44, beamMs: P.beamMs ?? 900, recoilMs: 1000, powerMult: 1, shake: 0.03 }, dir);
}
