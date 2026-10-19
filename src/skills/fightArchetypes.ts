// Khuôn hệ Giác đấu (cận chiến thuần): strike (chặt / loạt đấm), counter (Phản Đòn), slam (quật / đấm khổng lồ), cross (chặt chéo / trăm cú đấm)
// và tuyệt chiêu komode (Đấm Hạ Gục: màn hình thành truyện tranh, lao qua mọi địch, chữ K.O.).
import Phaser from 'phaser';
import type { Enemy } from '../entities/Enemy';
import type { Fighter } from '../entities/Fighter';
import type { MoveDef } from '../data/moveKit';
import type { UltimateDef } from '../data/ultimates';
import { comicOverlay, comicText, crossSlash, fistGfx, impactRays, powBurst, slashBand, speedLines } from '../fx/FightFx';
import { groundCracks } from '../fx/GrassFx';
import { playSfx } from '../systems/sfx';
import type { SkillHost } from './host';
import type { CounterParams, CrossParams, KoModeParams, SlamParams, StrikeParams } from './types';

const aimOf = (h: SkillHost, f: Fighter, dir: Phaser.Math.Vector2) => {
  const t = h.aimTarget;
  const v = t && !t.dead ? new Phaser.Math.Vector2(t.x - f.x, t.centerY - f.chestY) : dir.clone();
  return v.lengthSq() < 0.0001 ? new Phaser.Math.Vector2(f.facing.x || 1, f.facing.y).normalize() : v.normalize();
};
const centerOf = (h: SkillHost, f: Fighter, reach: number) => {
  const t = h.aimTarget;
  const p = t && !t.dead ? { x: t.x, y: t.y } : { x: f.x + f.facing.x * reach, y: f.y + f.facing.y * reach };
  return { x: Phaser.Math.Clamp(p.x, 16, h.worldW - 16), y: Phaser.Math.Clamp(p.y, 16, h.worldH - 16) };
};

/** Chặt: một hoặc nhiều nhát (hoặc nắm đấm bay) trong hình quạt ngắn phía trước, mỗi nhát có tia va chạm */
export function castStrike(h: SkillHost, f: Fighter, m: MoveDef, P: StrikeParams, dir: Phaser.Math.Vector2) {
  const sc = h.scene;
  const mult = h.stackMult(f, m);
  f.playMove(m);
  playSfx(m.sfx);
  for (let i = 0; i < P.hits; i++) {
    h.schedule(h.clock + i * P.gapMs, () => {
      if (h.over || f.dead || !f.onField) return;
      const a = aimOf(h, f, dir);
      f.faceTo(a.x, a.y);
      const nx = -a.y;
      const ny = a.x;
      const off = (P.hits > 1 ? (i % 2 ? 1 : -1) * (P.fists ? 9 + (i % 4) * 2 : 7) : 0) + (P.fists ? (i - 1.5) * 3 : 0);
      const ox = f.x + a.x * 8 + nx * off;
      const oy = f.chestY + a.y * 6 + ny * off;
      const ex = ox + a.x * P.reach;
      const ey = oy + a.y * P.reach * 0.8;
      if (P.fists) {
        const fist = fistGfx(sc, ox, oy, 1.1, Math.atan2(a.y, a.x), i % 2 ? 0xffb02a : 0xffd06a);
        sc.tweens.add({ targets: fist, x: ex, y: ey, duration: 70, onComplete: () => sc.tweens.add({ targets: fist, alpha: 0, duration: 120, onComplete: () => fist.destroy() }) });
      } else slashBand(sc, ox, oy, ex, ey, 5);
      let first: Enemy | null = null;
      for (const e of h.enemies()) {
        if (!e.targetable) continue;
        const rx = e.x - f.x;
        const ry = e.centerY - f.chestY;
        const along = rx * a.x + ry * a.y;
        if (along < -e.radius || along > P.reach + e.radius) continue;
        const ang = Phaser.Math.RadToDeg(Math.abs(Phaser.Math.Angle.Wrap(Math.atan2(ry, rx) - Math.atan2(a.y, a.x))));
        if (ang > P.halfDeg && Math.hypot(rx, ry) > e.radius + 12) continue;
        if (!first) first = e;
        h.damageEnemy(e, m, m.power * f.power * mult * P.powerMult, a.x, a.y, i === P.hits - 1, i < P.hits - 1);
      }
      const px = first ? first.x : ex;
      const py = first ? first.centerY : ey;
      powBurst(sc, px, py, 11 + (P.fists ? 3 : 0), 200);
      impactRays(sc, px, py, 6, 8, 22, 0xfff06a, 180);
      h.fx.shake(0.003, 60);
      playSfx('hit');
    });
  }
}

/** Phản Đòn: giữ thế đỡ; bị đánh trúng trong lúc đỡ → giảm sát thương + phản lại mọi địch gần, và L/U kế tiếp mạnh hơn */
export function castCounter(h: SkillHost, f: Fighter, m: MoveDef, P: CounterParams) {
  const sc = h.scene;
  const mult = h.stackMult(f, m);
  f.anim.playOnce('charge', P.stanceMs);
  f.sprayUntil = h.clock + P.stanceMs;
  f.sprayMove = { ...m, moveSlow: 0.25, line: 1 };
  playSfx('swap');
  let triggered = false;
  h.armCounter(P.stanceMs, P.reduce, () => {
    triggered = true;
    h.fx.shake(0.012, 200);
    playSfx('boom');
    h.hitStop(70);
    powBurst(sc, f.x, f.chestY, 26, 300);
    impactRays(sc, f.x, f.chestY, 14, 20, 50, 0xffffff, 280);
    const near = h.enemies().filter((e) => e.targetable && Math.hypot(e.x - f.x, (e.y - f.y) / 0.8) <= P.reach + e.radius);
    near.forEach((e, i) => {
      const dx = e.x - f.x;
      const dy = e.y - f.y;
      const d = Math.hypot(dx, dy) || 1;
      if (P.fists > 0) {
        for (let k = 0; k < P.fists; k++) {
          const fist = fistGfx(sc, f.x, f.chestY - 8 + k * 6, 1.3, Math.atan2(dy, dx), k % 2 ? 0xffb02a : 0xffd06a);
          sc.tweens.add({ targets: fist, x: e.x, y: e.centerY, duration: 90 + k * 25, onComplete: () => sc.tweens.add({ targets: fist, alpha: 0, duration: 150, onComplete: () => fist.destroy() }) });
        }
      }
      h.schedule(h.clock + 60 + i * 30, () => {
        powBurst(sc, e.x, e.centerY, 14, 220);
        h.damageEnemy(e, m, m.power * f.power * mult * P.counterMult, dx / d, dy / d, true);
      });
    });
    h.setCounterBuff(P.buffMs, P.buffMult);
  });
  const g = sc.add.graphics().setDepth(99996);
  h.addFrameTask(P.stanceMs, (now) => {
    g.clear();
    if (triggered) return;
    const pulse = 0.6 + 0.4 * Math.sin(now / 60);
    // thế đỡ: hai tay khoanh chéo (chữ X) + tia sáng vàng nhấp nháy
    g.lineStyle(4, 0xffffff, 0.95);
    g.lineBetween(f.x - 9, f.chestY - 9, f.x + 9, f.chestY + 9).lineBetween(f.x + 9, f.chestY - 9, f.x - 9, f.chestY + 9);
    g.lineStyle(2.5, 0xffb02a, pulse);
    for (let i = 0; i < 10; i++) {
      const a = (i / 10) * Math.PI * 2 + now / 400;
      g.lineBetween(f.x + Math.cos(a) * 16, f.chestY + Math.sin(a) * 14, f.x + Math.cos(a) * 28, f.chestY + Math.sin(a) * 24);
    }
  }, () => g.destroy());
}

/** Quật / Đấm khổng lồ */
export function castSlam(h: SkillHost, f: Fighter, m: MoveDef, P: SlamParams, dir: Phaser.Math.Vector2) {
  const sc = h.scene;
  const mult = h.stackMult(f, m);
  const amount = m.power * f.power * mult * P.powerMult;
  const land = (x: number, y: number, e: Enemy | null, big: boolean) => {
    powBurst(sc, x, y, big ? 44 : 22, 320);
    impactRays(sc, x, y, big ? 16 : 10, big ? 46 : 24, big ? 84 : 46, 0xffffff, 300);
    groundCracks(sc, x, y + 6, big ? 90 : 56, big ? 6 : 4, 1400, 0);
    h.fx.debrisBurst(x, y, big ? 16 : 9);
    h.fx.dustPuff(x, y + 6, big ? 12 : 7);
    h.fx.shake(big ? 0.02 : 0.01, big ? 320 : 200);
    playSfx('boom');
    if (e) h.hitStop(big ? 100 : 70);
  };
  if (P.mode === 'mega') {
    const wind = P.windupMs ?? 500;
    f.anim.playOnce('charge', wind);
    f.sprayUntil = h.clock + wind;
    f.sprayMove = { ...m, moveSlow: 0.2, line: 1 };
    let c = centerOf(h, f, P.reach);
    const g = sc.add.graphics().setDepth(99996);
    const t0 = h.clock;
    h.addFrameTask(wind, (now) => {
      c = centerOf(h, f, P.reach);
      f.faceTo(c.x - f.x, c.y - f.y);
      const k = (now - t0) / wind;
      g.clear();
      g.lineStyle(2.5, 0xfff06a, 0.4 + 0.5 * k);
      for (let i = 0; i < 14; i++) {
        const a = (i / 14) * Math.PI * 2 + now / 300;
        const r1 = 50 * (1 - k) + 12;
        g.lineBetween(f.x + Math.cos(a) * (r1 + 18), f.chestY + Math.sin(a) * (r1 + 18) * 0.85, f.x + Math.cos(a) * r1, f.chestY + Math.sin(a) * r1 * 0.85);
      }
    }, () => g.destroy());
    h.schedule(t0 + wind, () => {
      if (h.over || f.dead || !f.onField) return;
      f.playMove(m);
      const fist = fistGfx(sc, c.x - 40, c.y - 120, P.size ?? 5, Math.PI / 3, 0xffb02a);
      sc.tweens.add({
        targets: fist, x: c.x, y: c.y - 6, duration: 110, ease: 'Quad.in',
        onComplete: () => {
          sc.tweens.add({ targets: fist, alpha: 0, duration: 260, onComplete: () => fist.destroy() });
          land(c.x, c.y, null, true);
          let any = false;
          for (const e of h.enemies()) {
            if (!e.targetable || Math.hypot(e.x - c.x, (e.y - c.y) / 0.8) > (P.hitR ?? 40) + e.radius) continue;
            any = true;
            h.damageEnemy(e, m, amount, 0, 0, true);
            e.stunnedUntil = Math.max(e.stunnedUntil, h.clock + P.stunMs);
          }
          if (any) h.hitStop(100);
        },
      });
    });
    return;
  }
  // toss / spin: tóm địch gần nhất rồi ném
  const a = aimOf(h, f, dir);
  const cand = h.enemies().filter((e) => e.targetable && !e.isBoss && Math.hypot(e.x - f.x, (e.y - f.y) / 0.8) <= P.reach + e.radius + 24);
  cand.sort((p, q) => Math.hypot(p.x - f.x, p.y - f.y) - Math.hypot(q.x - f.x, q.y - f.y));
  const target = h.aimTarget && cand.includes(h.aimTarget) ? h.aimTarget : cand[0];
  f.playMove(m);
  playSfx('whip');
  if (!target) {
    const px = f.x + a.x * P.reach;
    const py = f.chestY + a.y * P.reach * 0.8;
    powBurst(sc, px, py, 12, 200);
    return;
  }
  const spin = P.mode === 'spin';
  const spinMs = spin ? P.spinMs ?? 400 : 0;
  const total = spinMs + P.flyMs;
  const sx = target.x;
  const sy = target.y;
  const lx = Phaser.Math.Clamp(f.x + a.x * P.tossDist, 16, h.worldW - 16);
  const ly = Phaser.Math.Clamp(f.y + a.y * P.tossDist, 16, h.worldH - 16);
  const t0 = h.clock;
  const trail = sc.add.graphics().setDepth(99003);
  let px = sx;
  let py = sy;
  h.addFrameTask(total, (now) => {
    const el = now - t0;
    if (target.dead) return;
    target.stunnedUntil = Math.max(target.stunnedUntil, now + 160);
    let x: number;
    let y: number;
    if (el < spinMs) {
      const ang = (el / spinMs) * Math.PI * 2 + Math.atan2(sy - f.y, sx - f.x);
      x = f.x + Math.cos(ang) * 22;
      y = f.y + Math.sin(ang) * 18;
      target.anim.lift = 14;
    } else {
      const k = Math.min(1, (el - spinMs) / P.flyMs);
      const bx = spin ? f.x + Math.cos(Math.atan2(sy - f.y, sx - f.x)) * 22 : sx;
      const by = spin ? f.y + Math.sin(Math.atan2(sy - f.y, sx - f.x)) * 18 : sy;
      x = bx + (lx - bx) * k;
      y = by + (ly - by) * k;
      target.anim.lift = 14 + 38 * Math.sin(Math.PI * k);
    }
    target.body.reset(x, y);
    trail.lineStyle(2, 0xffffff, 0.7).lineBetween(px, py - target.anim.lift, x, y - target.anim.lift);
    px = x;
    py = y;
  }, () => {
    trail.destroy();
    target.anim.lift = 0;
    if (h.over || target.dead) return;
    land(target.x, target.y, target, false);
    h.damageEnemy(target, m, amount, a.x, a.y, true);
    target.stunnedUntil = Math.max(target.stunnedUntil, h.clock + P.stunMs);
    // đòn quật làm địch bên cạnh văng ra (có thể gây Va chạm)
    for (const o of h.enemies()) {
      if (o === target || !o.targetable) continue;
      const dx = o.x - target.x;
      const dy = o.y - target.y;
      const d = Math.hypot(dx, dy);
      if (d > 48) continue;
      h.damageEnemy(o, { ...m, knockback: 200 }, amount * 0.35, dx / (d || 1), dy / (d || 1), false, true);
    }
  });
}

/** Chặt chéo (chữ X) hoặc Trăm cú đấm (loạt đấm cực nhanh + cú hất tung) */
export function castCross(h: SkillHost, f: Fighter, m: MoveDef, P: CrossParams) {
  const sc = h.scene;
  const mult = h.stackMult(f, m);
  const amount = m.power * f.power * mult * P.powerMult;
  f.anim.playOnce('attack', P.windupMs + 300);
  f.sprayUntil = h.clock + P.windupMs;
  f.sprayMove = { ...m, moveSlow: 0.3, line: 1 };
  let c = centerOf(h, f, 50);
  const g = sc.add.graphics().setDepth(-2890);
  const t0 = h.clock;
  h.addFrameTask(P.windupMs, () => {
    c = centerOf(h, f, 50);
    f.faceTo(c.x - f.x, c.y - f.y);
    g.clear();
    g.lineStyle(1.5, 0xffd06a, 0.6).lineBetween(f.x, f.chestY, c.x, c.y);
  }, () => g.destroy());
  h.schedule(t0 + P.windupMs, () => {
    if (h.over || f.dead || !f.onField) return;
    f.playMove(m);
    const x = c.x;
    const y = c.y;
    const inR = (e: Enemy, r: number) => e.targetable && Math.hypot(e.x - x, (e.y - y) / 0.8) <= r + e.radius;
    if (!P.barrage) {
      crossSlash(sc, x, y, P.size);
      powBurst(sc, x, y - 6, 22 * P.size, 280);
      impactRays(sc, x, y, 12, 26 * P.size, 52 * P.size, 0xffffff, 260);
      speedLines(sc, f.x, f.chestY, x, y, 5, 0xfff06a);
      h.fx.shake(0.008 * P.size, 160);
      playSfx('boom');
      let any = false;
      for (const e of h.enemies()) {
        if (!inR(e, P.r)) continue;
        any = true;
        const dx = e.x - f.x;
        const dy = e.y - f.y;
        const d = Math.hypot(dx, dy) || 1;
        h.damageEnemy(e, m, amount, dx / d, dy / d, true);
      }
      if (any) h.hitStop(70);
      return;
    }
    const B = P.barrage;
    for (let i = 0; i < B.n; i++) {
      h.schedule(h.clock + i * B.gapMs, () => {
        if (h.over) return;
        const ox = x + (Math.random() - 0.5) * P.r * 1.6;
        const oy = y + (Math.random() - 0.5) * P.r * 1.2;
        const ang = Math.atan2(oy - f.chestY, ox - f.x);
        const fist = fistGfx(sc, f.x + Math.cos(ang) * 10, f.chestY + (Math.random() - 0.5) * 14, 1 + Math.random() * 0.4, ang, i % 2 ? 0xffb02a : 0xffd06a);
        sc.tweens.add({ targets: fist, x: ox, y: oy, duration: 55, onComplete: () => sc.tweens.add({ targets: fist, alpha: 0, duration: 100, onComplete: () => fist.destroy() }) });
        powBurst(sc, ox, oy, 9 + Math.random() * 7, 160);
        if (i % 3 === 0) impactRays(sc, ox, oy, 6, 8, 20, 0xfff06a, 150);
        h.fx.shake(0.004, 50);
        playSfx('hit');
        for (const e of h.enemies()) {
          if (!inR(e, P.r)) continue;
          h.damageEnemy(e, { ...m, knockback: 30 }, (amount / B.n) * 1.2, 0, 0, false, true);
        }
      });
    }
    h.schedule(h.clock + B.n * B.gapMs + 40, () => {
      if (h.over) return;
      powBurst(sc, x, y, 40, 320);
      impactRays(sc, x, y, 16, 44, 86, 0xffffff, 300);
      h.fx.shake(0.018, 300);
      playSfx('boom');
      let any = false;
      for (const e of h.enemies()) {
        if (!inR(e, P.r)) continue;
        any = true;
        const dx = e.x - x;
        const dy = e.y - y;
        const d = Math.hypot(dx, dy) || 1;
        h.damageEnemy(e, { ...m, knockback: (m.knockback || 200) * 2 }, amount * 0.6, dx / d, dy / d, true);
      }
      if (any) h.hitStop(100);
    });
  });
}

/** Đấm Hạ Gục: màn hình thành truyện tranh, người dùng lao qua từng địch tung loạt đấm, cuối cùng nổ toàn màn (chữ K.O.!) */
export function castKoMode(h: SkillHost, f: Fighter, P: KoModeParams, _u: UltimateDef, mv: MoveDef, amount: number) {
  if (h.over) return;
  const sc = h.scene;
  const cam = sc.cameras.main;
  const targets = h.enemies().filter((e) => e.targetable).sort((a, b) => Math.hypot(a.x - f.x, a.y - f.y) - Math.hypot(b.x - f.x, b.y - f.y)).slice(0, P.maxTargets);
  cam.flash(220, 255, 240, 200, false);
  h.fx.shake(0.01, 300);
  playSfx('roar');
  if (!targets.length) return;
  const start = { x: f.x, y: f.y };
  const total = 300 + targets.length * P.perTargetMs + 600;
  f.invulnUntil = Math.max(f.invulnUntil, h.clock + total + 200);
  const comic = comicOverlay(sc);
  let px = f.x;
  let py = f.y;
  const fm: MoveDef = { ...mv, type: 'fighting' };
  targets.forEach((e, i) => {
    h.schedule(h.clock + 350 + i * P.perTargetMs, () => {
      if (h.over || e.dead) return;
      const dx = e.x - px;
      const dy = e.y - py;
      const d = Math.hypot(dx, dy) || 1;
      const nx = dx / d;
      const ny = dy / d;
      speedLines(sc, px, py - 8, e.x - nx * 22, e.y - ny * 22 - 8, 7, 0xffffff);
      f.body.reset(e.x - nx * 24, e.y - ny * 14);
      f.faceTo(nx, ny);
      px = f.x;
      py = f.y;
      for (let j = 0; j < P.hitsPer; j++) {
        h.schedule(h.clock + j * Math.floor(P.perTargetMs / (P.hitsPer + 1)), () => {
          if (h.over || e.dead) return;
          const ox = e.x + (Math.random() - 0.5) * 22;
          const oy = e.centerY + (Math.random() - 0.5) * 18;
          powBurst(sc, ox, oy, 13 + Math.random() * 7, 180);
          impactRays(sc, ox, oy, 7, 9, 24, 0xfff06a, 160);
          h.fx.shake(0.005, 60);
          playSfx('hit');
          h.damageEnemy(e, fm, amount * P.hitPower, nx, ny, false, true);
        });
      }
    });
  });
  h.schedule(h.clock + 350 + targets.length * P.perTargetMs + 120, () => {
    f.body.reset(start.x, start.y);
    if (h.over) return;
    cam.flash(320, 255, 255, 255, false);
    h.fx.shake(0.03, 520);
    playSfx('boom');
    powBurst(sc, f.x, f.chestY, 70, 420);
    impactRays(sc, f.x, f.chestY, 22, 60, 130, 0xffffff, 380);
    if (P.ko) comicText(sc, 'K.O.!', cam.width / 2, cam.height / 2, 96);
    let any = false;
    for (const e of targets) {
      if (e.dead) continue;
      any = true;
      const dx = e.x - f.x;
      const dy = e.y - f.y;
      const d = Math.hypot(dx, dy) || 1;
      powBurst(sc, e.x, e.centerY, 22, 260);
      h.damageEnemy(e, { ...fm, knockback: 520 }, amount * P.slamPower, dx / d, dy / d, true);
    }
    if (any) h.hitStop(140);
    h.schedule(h.clock + 500, () => comic.destroy());
  });
}
