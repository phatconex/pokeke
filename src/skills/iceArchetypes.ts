// Khuôn hệ Băng (không dùng vòng tròn/sigil): "lance" mũi tinh thể mọc dài, "gale" gió tuyết thổi ngang,
// "blizzard" mưa giá băng + gió, và tuyệt chiêu "absolutezero" (Kỷ Băng Hà: vết nứt lan khắp sân, tinh thể nhốt địch, vỡ tung, mưa giá băng).
import Phaser from 'phaser';
import type { Fighter } from '../entities/Fighter';
import type { MoveDef } from '../data/moveKit';
import type { UltimateDef } from '../data/ultimates';
import { crystalCluster, crystalPrism, frostVignette, groundWarn, iceBlock, icicleDrop, radialShards, windStreaks } from '../fx/IceFx';
import { playSfx } from '../systems/sfx';
import { dialectFor } from './dialects';
import type { SkillHost } from './host';
import type { AbsoluteZeroParams, BlizzardParams, GaleParams, LanceParams } from './types';

const aimOf = (h: SkillHost, f: Fighter, dir: Phaser.Math.Vector2) => {
  const t = h.aimTarget;
  const v = t && !t.dead ? new Phaser.Math.Vector2(t.x - f.x, t.centerY - f.chestY) : dir.clone();
  return v.lengthSq() < 0.0001 ? new Phaser.Math.Vector2(f.facing.x || 1, f.facing.y) .normalize() : v.normalize();
};

/** Mũi Băng: cột tinh thể lăng trụ mọc dài ra phía trước từng đốt (có nhánh con), để lại mảng băng rách góc làm trơn */
export function castLance(h: SkillHost, f: Fighter, m: MoveDef, P: LanceParams, dir: Phaser.Math.Vector2) {
  const sc = h.scene;
  const d = dialectFor(P.dialect, h.fx, m, h);
  const mult = h.stackMult(f, m);
  const tele = P.telegraphMs;
  f.anim.playOnce('shoot', tele + 150);
  f.sprayUntil = h.clock + tele;
  f.sprayMove = { ...m, moveSlow: 0.3, line: 1 };
  const g = sc.add.graphics().setDepth(-2890);
  const t0 = h.clock;
  let a0 = aimOf(h, f, dir);
  h.addFrameTask(tele, (now) => {
    a0 = aimOf(h, f, dir);
    f.faceTo(a0.x, a0.y);
    g.clear();
    const k = (now - t0) / tele;
    g.lineStyle(1.5, 0xe8fbff, 0.4 + 0.5 * k);
    for (let i = 0; i < 10; i++) {
      const s = (i / 10) * P.len;
      g.lineBetween(f.x + a0.x * s, f.chestY + a0.y * s, f.x + a0.x * (s + P.len * 0.05), f.chestY + a0.y * (s + P.len * 0.05));
    }
    d.trail(f.x + a0.x * 8, f.chestY - 4, 1);
  }, () => g.destroy());
  h.schedule(t0 + tele, () => {
    if (h.over || f.dead || !f.onField) return;
    f.playMove(m);
    playSfx(m.sfx);
    const aim = aimOf(h, f, dir);
    const ox = f.x + aim.x * 10;
    const oy = f.feetY - 2 + aim.y * 6;
    const nx = -aim.y;
    const ny = aim.x;
    const hit = new Set<unknown>();
    const amount = m.power * f.power * mult * P.powerMult;
    const stepLen = P.len / P.segs;
    for (let i = 0; i < P.segs; i++) {
      h.schedule(h.clock + (i * P.growMs) / P.segs, () => {
        if (h.over) return;
        const px = ox + aim.x * stepLen * (i + 1);
        const py = oy + aim.y * stepLen * (i + 1) * 0.75;
        const hh = 14 + i * P.growH;
        crystalPrism(sc, px, py, hh, P.w, 900);
        if (P.branch) {
          crystalPrism(sc, px + nx * P.w * 2.4, py + ny * P.w * 1.8, hh * 0.55, P.w * 0.7, 800);
          crystalPrism(sc, px - nx * P.w * 2.4, py - ny * P.w * 1.8, hh * 0.55, P.w * 0.7, 800);
        }
        if (i === P.segs - 1) {
          radialShards(sc, px, py - hh * 0.6, 10, 26);
          h.fx.shake(0.004, 100);
        }
        for (const e of h.enemies()) {
          if (!e.targetable || hit.has(e)) continue;
          const rx = e.x - ox;
          const ry = e.centerY - oy;
          const along = rx * aim.x + ry * aim.y;
          const side = Math.abs(rx * nx + ry * ny);
          if (along < stepLen * i - e.radius || along > stepLen * (i + 1) + e.radius || side > P.w * 3 + e.radius) continue;
          hit.add(e);
          h.damageEnemy(e, m, amount, aim.x, aim.y, true);
        }
      });
    }
    h.schedule(h.clock + P.growMs, () => {
      for (let j = 1; j <= P.frost.n; j++) d.scorch(ox + aim.x * P.len * (j / P.frost.n), oy + aim.y * P.len * (j / P.frost.n) * 0.75, P.frost.r, P.frost.ms);
    });
  });
}

/** Gió Tuyết: những đường gió dài thổi ngang qua một dải phía trước, bông tuyết bay theo hướng gió */
export function castGale(h: SkillHost, f: Fighter, m: MoveDef, P: GaleParams, dir: Phaser.Math.Vector2) {
  const sc = h.scene;
  const mult = h.stackMult(f, m);
  f.anim.playOnce('attack', P.windupMs + 200);
  f.sprayUntil = h.clock + P.windupMs;
  f.sprayMove = { ...m, moveSlow: 0.4, line: 1 };
  h.schedule(h.clock + P.windupMs, () => {
    if (h.over || f.dead || !f.onField) return;
    f.playMove(m);
    playSfx(m.sfx);
    const aim = aimOf(h, f, dir);
    const nx = -aim.y;
    const ny = aim.x;
    const ox = f.x + aim.x * 8;
    const oy = f.chestY + aim.y * 6;
    const amount = m.power * f.power * mult * P.powerMult;
    let next = 0;
    h.addFrameTask(P.ms, (now) => {
      f.sprayUntil = Math.max(f.sprayUntil, now + 40);
      windStreaks(sc, ox + aim.x * P.len * 0.5, oy + aim.y * P.len * 0.5, Math.abs(aim.x) * P.len + Math.abs(ny) * P.wid * 2, Math.abs(aim.y) * P.len + Math.abs(nx) * P.wid * 2, aim.x, aim.y, P.streaks);
      if (now < next) return;
      next = now + P.tickMs;
      for (const e of h.enemies()) {
        if (!e.targetable) continue;
        const rx = e.x - ox;
        const ry = e.centerY - oy;
        const along = rx * aim.x + ry * aim.y;
        const side = Math.abs(rx * nx + ry * ny);
        if (along < -e.radius || along > P.len + e.radius || side > P.wid + e.radius) continue;
        h.damageEnemy(e, m, amount, aim.x, aim.y, false, true);
      }
    });
  });
}

/** Mưa Băng: bóng góc cạnh báo trước → nhiều giá băng dài rơi từ trên xuống đâm xuống đất, để lại cụm tinh thể; gió tuyết thổi ngang quét qua */
export function castBlizzard(h: SkillHost, f: Fighter, m: MoveDef, P: BlizzardParams) {
  const sc = h.scene;
  const d = dialectFor(P.dialect, h.fx, m, h);
  const mult = h.stackMult(f, m);
  const wind = P.windupMs;
  f.anim.playOnce('charge', wind);
  f.sprayUntil = h.clock + wind;
  f.sprayMove = { ...m, moveSlow: 0.3, line: 1 };
  const t = h.aimTarget;
  const c = {
    x: Phaser.Math.Clamp(t && !t.dead ? t.x : f.x + f.facing.x * P.reach, 24, h.worldW - 24),
    y: Phaser.Math.Clamp(t && !t.dead ? t.y : f.y + f.facing.y * P.reach, 24, h.worldH - 24),
  };
  const spots: { x: number; y: number }[] = [];
  for (let i = 0; i < P.count; i++) {
    const a = Math.random() * Math.PI * 2;
    const r = P.r * Math.sqrt(Math.random());
    spots.push({ x: Phaser.Math.Clamp(c.x + Math.cos(a) * r, 16, h.worldW - 16), y: Phaser.Math.Clamp(c.y + Math.sin(a) * r * 0.8, 16, h.worldH - 16) });
  }
  spots.forEach((s) => groundWarn(sc, s.x, s.y, wind));
  const g = sc.add.graphics().setDepth(-2890);
  const t0 = h.clock;
  h.addFrameTask(wind, (now) => {
    f.faceTo(c.x - f.x, c.y - f.y);
    g.clear();
    g.lineStyle(1.5, 0xe8fbff, 0.4 + 0.5 * ((now - t0) / wind));
    for (let i = 0; i < 10; i++) {
      const s0 = i / 10;
      g.lineBetween(f.x + (c.x - f.x) * s0, f.chestY + (c.y - f.chestY) * s0, f.x + (c.x - f.x) * (s0 + 0.05), f.chestY + (c.y - f.chestY) * (s0 + 0.05));
    }
    d.trail(f.x + f.facing.x * 8, f.chestY - 6, 1);
  }, () => g.destroy());
  h.schedule(t0 + wind, () => {
    if (h.over || f.dead || !f.onField) return;
    f.playMove(m);
    playSfx(m.sfx);
    const amount = m.power * f.power * mult * P.powerMult;
    spots.forEach((s, i) => {
      h.schedule(h.clock + i * P.fallGapMs, () => {
        if (h.over) return;
        icicleDrop(sc, s.x, s.y, P.icicleH, 6, P.fallMs, () => {
          if (h.over) return;
          crystalCluster(sc, s.x, s.y + 4, 0.8, 1100);
          radialShards(sc, s.x, s.y - 6, 7, 20);
          h.fx.shake(P.shake[0], P.shake[1]);
          playSfx('hit');
          for (const e of h.enemies()) {
            if (!e.targetable) continue;
            if (Math.hypot(e.x - s.x, (e.y - s.y) / 0.8) > 26 + e.radius) continue;
            h.damageEnemy(e, m, amount, 0, 0, true);
          }
        });
      });
    });
    // gió tuyết thổi ngang quét qua vùng, đẩy lạnh dần lên địch
    const wmove: MoveDef = { ...m, id: `${m.id}Wind`, knockback: 0, status: undefined, chill: 0.4 };
    const wdir = new Phaser.Math.Vector2(c.x - f.x, c.y - f.y).normalize();
    const wx = Math.abs(wdir.x) < 0.3 ? Math.sign(wdir.x || 1) : wdir.x;
    h.schedule(h.clock + P.fallMs, () => {
      let next = 0;
      h.addFrameTask(P.ms, (now) => {
        windStreaks(sc, c.x, c.y, P.r * 2.2, P.r * 1.5, wx, 0, 2);
        if (now < next) return;
        next = now + P.tickMs;
        for (const e of h.enemies()) {
          if (!e.targetable) continue;
          if (Math.abs(e.x - c.x) > P.r + e.radius || Math.abs(e.y - c.y) > P.r * 0.8 + e.radius) continue;
          h.damageEnemy(e, wmove, amount * 0.25, wx, 0, false, true);
        }
      });
    });
  });
}

/** Kỷ Băng Hà: sương trắng + vết nứt băng phân nhánh lan khắp sân → cụm tinh thể cao trồi lên nhốt địch → vỡ tung, mưa giá băng khắp màn hình */
export function castAbsoluteZero(h: SkillHost, f: Fighter, P: AbsoluteZeroParams, _u: UltimateDef, mv: MoveDef, amount: number) {
  if (h.over) return;
  const sc = h.scene;
  const d = dialectFor(P.dialect, h.fx, mv, h);
  const cam = sc.cameras.main;
  const cx = f.x;
  const cy = f.feetY - 2;
  const total = P.freezeMs;
  cam.flash(260, 220, 245, 255, false);
  const vig = frostVignette(sc);
  const mist = sc.add.rectangle(0, 0, cam.width, cam.height, 0xd8f4ff, 0).setOrigin(0).setScrollFactor(0).setDepth(99989);
  sc.tweens.add({ targets: mist, fillAlpha: 0.22, duration: 500 });
  playSfx('waterLo');
  h.fx.shake(0.01, 500);
  const targets = h.enemies().filter((e) => e.targetable);
  // mạng vết nứt: từ chân người dùng lan ra, từng đoạn một
  type Seg = { x1: number; y1: number; x2: number; y2: number; t0: number; w: number };
  const segs: Seg[] = [];
  const gen = (x: number, y: number, len: number, ang: number, depth: number, t0: number) => {
    if (depth < 0 || len < 8) return;
    const x2 = x + Math.cos(ang) * len;
    const y2 = y + Math.sin(ang) * len * 0.85;
    segs.push({ x1: x, y1: y, x2, y2, t0, w: 1 + depth * 0.7 });
    gen(x2, y2, len * 0.66, ang + 0.55 + Math.random() * 0.3, depth - 1, t0 + 0.14);
    gen(x2, y2, len * 0.66, ang - 0.55 - Math.random() * 0.3, depth - 1, t0 + 0.14);
    gen(x2, y2, len * 0.8, ang + (Math.random() - 0.5) * 0.25, depth - 1, t0 + 0.14);
  };
  for (let k = 0; k < 10; k++) gen(cx, cy, P.r * 0.34, (k / 10) * Math.PI * 2 + Math.random() * 0.3, 3, 0);
  const g = sc.add.graphics().setDepth(-2890);
  const t0 = h.clock;
  const crackMs = 700;
  // tinh thể cao trồi lên nhốt từng địch (sau khi nứt lan tới)
  h.schedule(t0 + 450, () => {
    for (const e of targets) {
      if (e.dead) continue;
      e.applyStatus('freeze', total, h.clock);
      if (e.hasStatus('freeze', h.clock)) iceBlock(sc, e, () => e.hasStatus('freeze', h.clock));
      crystalCluster(sc, e.x, e.feetY + 6, 1.2, total - 450);
    }
  });
  h.addFrameTask(total, (now) => {
    const p = Math.min(1, (now - t0) / crackMs);
    g.clear();
    for (const s of segs) {
      if (p <= s.t0) continue;
      const kk = Math.min(1, (p - s.t0) / 0.2);
      g.lineStyle(s.w, 0xe6faff, 0.95).lineBetween(s.x1, s.y1, s.x1 + (s.x2 - s.x1) * kk, s.y1 + (s.y2 - s.y1) * kk);
    }
    if (Math.random() < 0.5) windStreaks(sc, cx, cy, P.r * 2.4, P.r * 1.4, 1, 0.05, 1);
    for (const e of targets) if (!e.dead) e.stunnedUntil = Math.max(e.stunnedUntil, now + 160);
  }, () => {
    g.destroy();
    vig.destroy();
    sc.tweens.add({ targets: mist, fillAlpha: 0, duration: 600, onComplete: () => mist.destroy() });
    if (h.over) return;
    // vỡ tung
    cam.flash(320, 255, 255, 255, false);
    h.fx.shake(0.03, 520);
    playSfx('boom');
    const shatter: MoveDef = { ...mv, type: 'ice', chill: 0 };
    let any = false;
    for (const e of targets) {
      if (e.dead) continue;
      any = true;
      radialShards(sc, e.x, e.centerY, 14, 40);
      h.damageEnemy(e, shatter, amount * P.slamPower, 0, 0, true);
    }
    d.explosion(cx, cy, P.r * 0.5);
    // mưa giá băng rơi khắp màn hình
    const wv = cam.worldView;
    for (let i = 0; i < 26; i++) {
      h.schedule(h.clock + i * 26, () => {
        const x = wv.x + 20 + Math.random() * (wv.width - 40);
        const y = wv.y + 40 + Math.random() * (wv.height - 60);
        icicleDrop(sc, x, y, 34 + Math.random() * 24, 5, 260, () => radialShards(sc, x, y - 4, 5, 16));
      });
    }
    if (any) h.hitStop(120);
  });
}
