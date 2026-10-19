// Khuôn "telekinesis" (Tâm linh nhấc bổng): vòng ma thuật xoay → hút địch vào giữa, nhấc lên khỏi mặt đất, giữ lơ lửng, rồi quật xuống.
import Phaser from 'phaser';
import type { Fighter } from '../entities/Fighter';
import type { MoveDef } from '../data/moveKit';
import { drawSigil, liftRing } from '../fx/PsyFx';
import { playSfx } from '../systems/sfx';
import { dialectFor } from './dialects';
import type { SkillHost } from './host';
import type { UltimateDef } from '../data/ultimates';
import type { TelekinesisParams, TimeStopParams } from './types';

export function castTelekinesis(h: SkillHost, f: Fighter, m: MoveDef, P: TelekinesisParams) {
  const sc = h.scene;
  const d = dialectFor(P.dialect, h.fx, m, h);
  const r = P.r;
  const mult = h.stackMult(f, m);
  const tele = P.telegraphMs;
  f.anim.playOnce('charge', tele);
  f.sprayUntil = h.clock + tele;
  f.sprayMove = { ...m, moveSlow: 0.3, line: 1 };
  const fallback = { x: f.x + f.facing.x * 100, y: f.y + f.facing.y * 100 };
  const center = () => {
    const t = h.aimTarget;
    const p = t && !t.dead ? { x: t.x, y: t.y } : fallback;
    return { x: Phaser.Math.Clamp(p.x, 16, h.worldW - 16), y: Phaser.Math.Clamp(p.y, 16, h.worldH - 16) };
  };
  let c = center();
  const g = sc.add.graphics().setDepth(-2890);
  const t0 = h.clock;
  h.addFrameTask(tele, (now) => {
    c = center();
    f.faceTo(c.x - f.x, c.y - f.y);
    g.clear();
    drawSigil(g, c.x, c.y, r, now / 700, (now - t0) / tele, P.colors);
    if (Math.random() < 0.3) d.trail(f.x + f.facing.x * 8, f.chestY - 8, 1);
  }, () => g.destroy());

  h.schedule(t0 + tele, () => {
    if (h.over || f.dead || !f.onField) return;
    f.playMove(m);
    playSfx(m.sfx);
    const caught = h.enemies().filter((e) => e.targetable && Math.hypot(e.x - c.x, (e.y - c.y) / 0.8) <= r + e.radius);
    h.fx.ringBurst(c.x, c.y, r, P.colors[1], P.colors[3], 360);
    if (!caught.length) return;
    const base = new Map(caught.map((e) => [e, { x: e.x, y: e.y }]));
    const total = P.pullMs + P.holdMs;
    const start = h.clock;
    const g2 = sc.add.graphics().setDepth(-2890);
    h.addFrameTask(total, (now) => {
      const el = now - start;
      g2.clear();
      drawSigil(g2, c.x, c.y, r, now / 380, 1, P.colors, 0.85);
      for (const e of caught) {
        if (e.dead) continue;
        e.stunnedUntil = Math.max(e.stunnedUntil, now + 160);
        const kp = Math.min(1, el / P.pullMs);
        if (P.pull) {
          const b = base.get(e)!;
          const e1 = 1 - Math.pow(1 - kp, 2);
          e.body.reset(b.x + (c.x - b.x) * 0.75 * e1, b.y + (c.y - b.y) * 0.75 * e1);
        }
        const ku = Math.min(1, el / (P.pullMs + 160));
        e.anim.lift = P.liftH * (1 - Math.pow(1 - ku, 2)) + (ku >= 1 ? Math.sin(el / 140) * 2 : 0);
        liftRing(g2, e.x, e.feetY, 9 + e.radius * 0.6, P.colors[(Math.floor(el / 90)) % P.colors.length], 0.8);
        if (Math.random() < 0.25) d.trail(e.x + (Math.random() - 0.5) * 12, e.feetY - e.anim.lift * 0.5, 1);
      }
    }, () => {
      g2.destroy();
      if (h.over) return;
      // quật xuống
      h.fx.shake(P.shake?.[0] ?? 0.012, P.shake?.[1] ?? 280);
      playSfx('boom');
      let any = false;
      for (const e of caught) {
        e.anim.lift = 0;
        if (e.dead) continue;
        any = true;
        h.fx.ringBurst(e.x, e.feetY, 22, P.colors[2], P.colors[0], 300);
        h.damageEnemy(e, m, m.power * f.power * mult * P.slamMult, 0, 0, true);
      }
      d.explosion(c.x, c.y, r * 0.8);
      if (any && P.hitStopMs) h.hitStop(P.hitStopMs);
    });
  });
}

/** Ngưng Đọng Thời Gian: tối màn hình → vòng ma thuật phủ sân → đóng băng + nhấc bổng mọi địch → lưỡi dao tâm linh xoay quanh rồi lao đâm → quật xuống cùng lúc */
export function castTimeStop(h: SkillHost, f: Fighter, P: TimeStopParams, _u: UltimateDef, mv: MoveDef, amount: number) {
  if (h.over) return;
  const sc = h.scene;
  const d = dialectFor(P.dialect, h.fx, mv, h);
  const cam = sc.cameras.main;
  const cx = f.x;
  const cy = f.feetY - 4;
  const total = P.freezeMs;
  cam.flash(260, 190, 120, 255, false);
  const dark = sc.add.rectangle(0, 0, cam.width, cam.height, 0x1a0840, 0).setOrigin(0).setScrollFactor(0).setDepth(99990);
  sc.tweens.add({ targets: dark, fillAlpha: P.darken, duration: 320 });
  h.schedule(h.clock + total + 150, () => sc.tweens.add({ targets: dark, fillAlpha: 0, duration: 500, onComplete: () => dark.destroy() }));
  playSfx('swap');
  h.fx.shake(0.01, 500);
  const targets = h.enemies().filter((e) => e.targetable);
  const g = sc.add.graphics().setDepth(-2890);
  const gb = sc.add.graphics().setDepth(99991);
  const t0 = h.clock;
  const orbit = { x: 0, y: 0 };
  const hitDone = new Set<number>();
  const launched = new Map<number, { sx: number; sy: number; t: number }>();
  h.addFrameTask(total, (now) => {
    const el = now - t0;
    g.clear();
    gb.clear();
    const k = Math.min(1, el / 420);
    drawSigil(g, cx, cy, P.r, now / 520, k, P.colors, 0.95);
    drawSigil(g, cx, cy, P.r * 0.58, -now / 340, k, P.colors, 0.8);
    // vạch chia độ quanh vòng ngoài (cảm giác "đồng hồ thời gian")
    for (let i = 0; i < 24; i++) {
      const a = (i / 24) * Math.PI * 2 - now / 900;
      const R = P.r * (0.45 + 0.55 * k);
      g.lineStyle(1.5, P.colors[(i + Math.floor(now / 120)) % P.colors.length], 0.6)
        .lineBetween(cx + Math.cos(a) * R * 0.94, cy + Math.sin(a) * R * 0.94 * 0.8, cx + Math.cos(a) * R * 1.04, cy + Math.sin(a) * R * 1.04 * 0.8);
    }
    // địch bị đóng băng và nhấc bổng
    const ku = Math.min(1, el / P.liftMs);
    for (const e of targets) {
      if (e.dead) continue;
      e.stunnedUntil = Math.max(e.stunnedUntil, now + 180);
      e.anim.lift = P.liftH * (1 - Math.pow(1 - ku, 2)) + (ku >= 1 ? Math.sin(el / 150 + e.x) * 2 : 0);
      liftRing(g, e.x, e.feetY, 9 + e.radius * 0.6, P.colors[Math.floor(el / 100) % P.colors.length], 0.8);
    }
    // lưỡi dao tâm linh: xoay quanh người rồi lao đâm từng địch
    if (targets.length && el >= P.orbitFromMs) {
      for (let i = 0; i < P.blades; i++) {
        const e = targets[i % targets.length];
        const color = P.colors[i % P.colors.length];
        let bx: number;
        let by: number;
        let ang: number;
        if (el < P.launchMs) {
          const a = (i / P.blades) * Math.PI * 2 + el / 260;
          const rr = 22 + Math.min(1, (el - P.orbitFromMs) / 300) * 14;
          bx = f.x + Math.cos(a) * rr;
          by = f.chestY + Math.sin(a) * rr * 0.7;
          ang = a + Math.PI / 2;
          orbit.x = bx;
          orbit.y = by;
          if (Math.random() < 0.15) d.trail(bx, by, 1);
        } else {
          let L = launched.get(i);
          if (!L) {
            const a = (i / P.blades) * Math.PI * 2 + P.launchMs / 260;
            L = { sx: f.x + Math.cos(a) * 36, sy: f.chestY + Math.sin(a) * 36 * 0.7, t: now + i * 25 };
            launched.set(i, L);
          }
          const kf = Math.min(1, Math.max(0, (now - L.t) / P.bladeFlyMs));
          const ex = e.dead ? L.sx : e.x;
          const ey = e.dead ? L.sy : e.centerY - e.anim.lift;
          bx = L.sx + (ex - L.sx) * kf;
          by = L.sy + (ey - L.sy) * kf;
          ang = Math.atan2(ey - L.sy, ex - L.sx);
          if (kf > 0 && kf < 1) d.trail(bx, by, 1);
          if (kf >= 1 && !hitDone.has(i) && !e.dead) {
            hitDone.add(i);
            h.fx.ringBurst(ex, ey, 16, color, 0xffffff, 260);
            d.hit(ex, ey, true);
            h.damageEnemy(e, mv, amount * P.bladePower, Math.cos(ang), Math.sin(ang), true, true);
            playSfx('hit');
          }
          if (kf >= 1) continue;
        }
        // lưỡi dao: hình thoi dài
        const c = Math.cos(ang);
        const s2 = Math.sin(ang);
        const pts = [
          new Phaser.Math.Vector2(bx + c * 9, by + s2 * 9),
          new Phaser.Math.Vector2(bx - s2 * 2.5, by + c * 2.5),
          new Phaser.Math.Vector2(bx - c * 6, by - s2 * 6),
          new Phaser.Math.Vector2(bx + s2 * 2.5, by - c * 2.5),
        ];
        gb.fillStyle(0xffffff, 0.95).fillPoints(pts, true);
        gb.lineStyle(2, color, 0.95).strokePoints(pts, true);
      }
    }
  }, () => {
    g.destroy();
    gb.destroy();
    if (h.over) return;
    // quật xuống cùng lúc
    cam.flash(320, 255, 240, 255, false);
    h.fx.shake(0.03, 520);
    playSfx('boom');
    let any = false;
    for (const e of targets) {
      e.anim.lift = 0;
      if (e.dead) continue;
      any = true;
      h.fx.ringBurst(e.x, e.feetY, 26, P.colors[2], P.colors[0], 340);
      h.damageEnemy(e, mv, amount * P.slamPower, 0, 0, true);
    }
    d.explosion(cx, cy, P.r * 0.6);
    h.fx.starBurst(cx, cy, P.r * 0.9, 12, P.colors[2], 0xffe8ff);
    h.fx.ringBurst(cx, cy, P.r * 1.2, P.colors[1], P.colors[3], 600);
    if (any) h.hitStop(120);
  });
}
