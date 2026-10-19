// Khuôn riêng của huyền thoại Mewtwo: lưỡi liềm quay lại (boomerang), lá chắn lục giác (barrier), giếng trọng lực (singularity),
// và tuyệt chiêu mindbreak (khối tà diện tím vỡ thành trăm mảnh). (Tia xoắn gen là biến thể `helix` của stream.)
import Phaser from 'phaser';
import type { Fighter } from '../entities/Fighter';
import type { MoveDef } from '../data/moveKit';
import type { UltimateDef } from '../data/ultimates';
import { drawHexCluster, hexShatter } from '../fx/PsyFx';
import { radialShards } from '../fx/IceFx';
import { playSfx } from '../systems/sfx';
import { dialectFor } from './dialects';
import type { SkillHost } from './host';
import type { BarrierParams, BoomerangParams, MindBreakParams, SingularityParams } from './types';

const V = (x: number, y: number) => new Phaser.Math.Vector2(x, y);
const aimOf = (h: SkillHost, f: Fighter, dir: Phaser.Math.Vector2) => {
  const t = h.aimTarget;
  const v = t && !t.dead ? V(t.x - f.x, t.centerY - f.chestY) : dir.clone();
  return v.lengthSq() < 0.0001 ? V(f.facing.x || 1, f.facing.y).normalize() : v.normalize();
};

function crescentPts(x: number, y: number, rot: number, R: number) {
  const pts: Phaser.Math.Vector2[] = [];
  for (let i = 0; i <= 8; i++) {
    const a = -1.2 + (i / 8) * 2.4;
    pts.push(V(x + Math.cos(a + rot) * R, y + Math.sin(a + rot) * R * 0.85));
  }
  for (let i = 8; i >= 0; i--) {
    const a = -1.2 + (i / 8) * 2.4;
    pts.push(V(x + Math.cos(a + rot) * R * 0.78 - Math.cos(rot) * R * 0.32, y + Math.sin(a + rot) * R * 0.66 - Math.sin(rot) * R * 0.28));
  }
  return pts;
}

/** Lưỡi Cắt Tâm Linh: nhiều lưỡi liềm bay xoay ra xa xuyên địch rồi QUAY LẠI chém lần hai */
export function castBoomerang(h: SkillHost, f: Fighter, m: MoveDef, P: BoomerangParams, dir: Phaser.Math.Vector2) {
  const sc = h.scene;
  const d = dialectFor(P.dialect, h.fx, m, h);
  const mult = h.stackMult(f, m);
  f.playMove(m);
  playSfx(m.sfx);
  const a0 = aimOf(h, f, dir);
  f.faceTo(a0.x, a0.y);
  const amount = m.power * f.power * mult * P.powerMult;
  const base = Math.atan2(a0.y, a0.x);
  const blades = Array.from({ length: P.blades }, (_, i) => ({ ang: base + (i - (P.blades - 1) / 2) * Phaser.Math.DegToRad(P.spreadDeg), side: i - (P.blades - 1) / 2, out: new Set<unknown>(), back: new Set<unknown>() }));
  const g = sc.add.graphics().setDepth(99997);
  const t0 = h.clock;
  const total = P.flyMs * 2;
  h.addFrameTask(total, (now) => {
    g.clear();
    const k = (now - t0) / total;
    const goingOut = k < 0.5;
    const tt = Math.sin((goingOut ? k / 0.5 : (1 - k) / 0.5) * (Math.PI / 2));
    for (const b of blades) {
      const R = P.range * tt;
      const lat = Math.sin(k * Math.PI) * P.curve * b.side;
      const px = f.x + Math.cos(b.ang) * R - Math.sin(b.ang) * lat;
      const py = f.chestY + (Math.sin(b.ang) * R + Math.cos(b.ang) * lat) * 0.8;
      const pts = crescentPts(px, py, now / 70, P.size);
      g.fillStyle(P.colors[2], 0.95).fillPoints(pts, true);
      g.lineStyle(1.5, 0xffffff, 1).strokePoints(pts, true);
      if (Math.random() < 0.3) d.trail(px, py, 1);
      const set = goingOut ? b.out : b.back;
      for (const e of h.enemies()) {
        if (!e.targetable || set.has(e) || Math.hypot(e.x - px, (e.centerY - py) / 0.8) > P.size + e.radius) continue;
        set.add(e);
        const dx = e.x - px;
        const dy = e.centerY - py;
        const dd = Math.hypot(dx, dy) || 1;
        h.damageEnemy(e, m, goingOut ? amount : amount * 0.8, dx / dd, dy / dd, false, !goingOut);
        d.hit(e.x, e.centerY, false);
      }
    }
  }, () => g.destroy());
}

/** Lá Chắn Lục Giác: tổ ong lục giác trước mặt, hấp thụ đòn đầu tiên; vỡ thì mảnh lục giác đẩy địch văng ra */
export function castBarrier(h: SkillHost, f: Fighter, m: MoveDef, P: BarrierParams) {
  const sc = h.scene;
  f.anim.playOnce('charge', 300);
  playSfx('swap');
  let broke = false;
  const g = sc.add.graphics().setDepth(99996);
  h.armCounter(P.ms, 0.05, () => {
    broke = true;
    hexShatter(sc, f.x, f.chestY, 16, P.colors);
    h.fx.shake(0.01, 180);
    playSfx('boom');
    h.hitStop(60);
    for (const e of h.enemies()) {
      if (!e.targetable) continue;
      const dx = e.x - f.x;
      const dy = e.y - f.y;
      const dd = Math.hypot(dx, dy / 0.8);
      if (dd > P.reach + e.radius) continue;
      h.damageEnemy(e, { ...m, knockback: P.push }, m.power * f.power, dx / (dd || 1), dy / (dd || 1), true);
    }
  });
  h.addFrameTask(P.ms, (now) => {
    g.clear();
    if (broke) return;
    drawHexCluster(g, f.x + f.facing.x * 8, f.chestY - 2, P.cell, P.colors, 0.75 + 0.25 * Math.sin(now / 90));
  }, () => g.destroy());
}

function drawSpiral(g: Phaser.GameObjects.Graphics, cx: number, cy: number, R: number, rot: number, colors: number[]) {
  for (let i = 0; i < 4; i++) {
    g.lineStyle(7 - i, i % 2 ? colors[2] : 0x1a0a30, 0.95);
    g.beginPath();
    for (let t = 0; t < 36; t++) {
      const a = rot + i * 1.571 + t * 0.2;
      const r = 3 + (t / 36) * R;
      const px = cx + Math.cos(a) * r;
      const py = cy + Math.sin(a) * r * 0.7;
      if (t) g.lineTo(px, py);
      else g.moveTo(px, py);
    }
    g.strokePath();
  }
  g.fillStyle(0x0a0418, 1).fillRect(cx - 6, cy - 4, 12, 8);
}

/** Giếng Trọng Lực (Psystrike): xoáy đen nhánh cong hút địch về tâm, nén lại rồi nổ */
export function castSingularity(h: SkillHost, f: Fighter, m: MoveDef, P: SingularityParams) {
  const sc = h.scene;
  const mult = h.stackMult(f, m);
  const amount = m.power * f.power * mult * P.powerMult;
  f.anim.playOnce('charge', P.windupMs);
  f.sprayUntil = h.clock + P.windupMs;
  f.sprayMove = { ...m, moveSlow: 0.3, line: 1 };
  const t = h.aimTarget;
  const c = {
    x: Phaser.Math.Clamp(t && !t.dead ? t.x : f.x + f.facing.x * 110, 20, h.worldW - 20),
    y: Phaser.Math.Clamp(t && !t.dead ? t.y : f.y + f.facing.y * 110, 20, h.worldH - 20),
  };
  const g = sc.add.graphics().setDepth(-2890);
  const t0 = h.clock;
  h.addFrameTask(P.windupMs, (now) => {
    g.clear();
    f.faceTo(c.x - f.x, c.y - f.y);
    drawSpiral(g, c.x, c.y, P.r * 0.4 * ((now - t0) / P.windupMs), now / 160, P.colors);
  }, () => g.destroy());
  h.schedule(t0 + P.windupMs, () => {
    if (h.over || f.dead || !f.onField) return;
    f.playMove(m);
    playSfx(m.sfx);
    const caught = h.enemies().filter((e) => e.targetable && Math.hypot(e.x - c.x, (e.y - c.y) / 0.8) <= P.r * 1.35);
    const g2 = sc.add.graphics().setDepth(-2890);
    const s0 = h.clock;
    h.addFrameTask(P.pullMs, (now) => {
      const k = (now - s0) / P.pullMs;
      g2.clear();
      drawSpiral(g2, c.x, c.y, P.r * (0.4 + 0.6 * Math.min(1, k * 2)), now / 120, P.colors);
      g2.lineStyle(1.5, 0xffffff, 0.6);
      for (let i = 0; i < 8; i++) {
        const a = i * 0.785 + now / 500;
        g2.lineBetween(c.x + Math.cos(a) * P.r * 1.3, c.y + Math.sin(a) * P.r * 1.3 * 0.7, c.x + Math.cos(a) * P.r * (0.8 - k * 0.3), c.y + Math.sin(a) * P.r * (0.8 - k * 0.3) * 0.7);
      }
      for (const e of caught) {
        if (e.dead) continue;
        e.stunnedUntil = Math.max(e.stunnedUntil, now + 160);
        const kk = 0.07 + k * 0.05;
        e.body.reset(e.x + (c.x - e.x) * kk, e.y + (c.y - e.y) * kk);
      }
    }, () => {
      g2.destroy();
      if (h.over) return;
      h.fx.shake(P.shake[0], P.shake[1]);
      playSfx('boom');
      const burst = sc.add.graphics().setPosition(c.x, c.y).setDepth(c.y + 4000);
      const pts: Phaser.Math.Vector2[] = [];
      for (let i = 0; i < 22; i++) {
        const a = (i / 22) * Math.PI * 2 + Math.random() * 0.3;
        const r = i % 2 ? P.r * 0.5 : P.r * (1 + Math.random() * 0.35);
        pts.push(V(Math.cos(a) * r, Math.sin(a) * r * 0.8));
      }
      burst.fillStyle(0x1a0a30, 0.9).fillPoints(pts, true);
      burst.lineStyle(3, P.colors[3], 1).strokePoints(pts, true);
      burst.setScale(0.3);
      sc.tweens.add({ targets: burst, scale: 1, duration: 120, ease: 'Back.out' });
      sc.tweens.add({ targets: burst, alpha: 0, duration: 300, delay: 160, onComplete: () => burst.destroy() });
      radialShards(sc, c.x, c.y, 18, P.r * 1.6, P.colors[2]);
      let any = false;
      for (const e of h.enemies()) {
        if (!e.targetable || Math.hypot(e.x - c.x, (e.y - c.y) / 0.8) > P.r * 1.15 + e.radius) continue;
        any = true;
        const dx = e.x - c.x;
        const dy = e.y - c.y;
        const dd = Math.hypot(dx, dy) || 1;
        h.damageEnemy(e, m, amount, dx / dd, dy / dd, true);
        e.stunnedUntil = Math.max(e.stunnedUntil, h.clock + P.stunMs);
      }
      if (any) h.hitStop(110);
    });
  });
}

/** Mind Break: Mewtwo bay lên, địch bị hút nhốt quanh khối tà diện tím xoay; khối vỡ thành trăm mảnh quét khắp màn hình */
export function castMindBreak(h: SkillHost, f: Fighter, P: MindBreakParams, _u: UltimateDef, mv: MoveDef, amount: number) {
  if (h.over) return;
  const sc = h.scene;
  const cam = sc.cameras.main;
  const targets = h.enemies().filter((e) => e.targetable);
  const total = P.gatherMs + P.holdMs;
  cam.flash(260, 200, 120, 255, false);
  h.fx.shake(0.012, 600);
  playSfx('roar');
  const dark = sc.add.rectangle(0, 0, cam.width, cam.height, 0x180838, 0).setOrigin(0).setScrollFactor(0).setDepth(99989);
  sc.tweens.add({ targets: dark, fillAlpha: 0.5, duration: 400 });
  const cx = f.x + f.facing.x * 60;
  const cy = f.feetY - 4;
  const offs = new Map(targets.map((e) => [e, { x: (Math.random() - 0.5) * 70, y: (Math.random() - 0.5) * 40 }]));
  const g = sc.add.graphics().setDepth(99995);
  const t0 = h.clock;
  h.addFrameTask(total, (now) => {
    const el = now - t0;
    g.clear();
    const kg = Math.min(1, el / P.gatherMs);
    f.anim.lift = 40 * (1 - Math.pow(1 - Math.min(1, el / 500), 2)) + Math.sin(el / 160) * 2;
    // khối tà diện xoay (hai nửa tam giác, bề ngang co giãn theo góc xoay tạo cảm giác 3D)
    const S = P.r * 0.22 * (0.3 + 0.7 * kg);
    const sx = Math.abs(Math.cos(now / 260)) * 0.85 + 0.15;
    const top = cy - 60 - 10 * Math.sin(now / 300);
    const A = [V(cx, top - S * 1.3), V(cx + S * sx, top), V(cx, top + S * 1.3), V(cx - S * sx, top)];
    g.fillStyle(P.colors[2], 0.95).fillPoints(A, true);
    g.fillStyle(P.colors[3], 0.9).fillPoints([A[0], A[1], V(cx, top)], true);
    g.fillStyle(P.colors[0], 0.9).fillPoints([A[2], A[3], V(cx, top)], true);
    g.lineStyle(3, 0xffffff, 1).strokePoints(A, true);
    g.lineStyle(1.5, 0xffffff, 0.6);
    for (const e of targets) {
      if (e.dead) continue;
      e.stunnedUntil = Math.max(e.stunnedUntil, now + 160);
      const o = offs.get(e)!;
      const tx = cx + o.x;
      const ty = cy + o.y;
      const ke = 1 - Math.exp(-(el / 260));
      e.body.reset(e.x + (tx - e.x) * 0.1 * ke, e.y + (ty - e.y) * 0.1 * ke);
      e.anim.lift = 20 * kg;
      g.lineBetween(cx, top, e.x, e.centerY - e.anim.lift);
    }
  }, () => {
    g.destroy();
    f.anim.lift = 0;
    sc.tweens.add({ targets: dark, fillAlpha: 0, duration: 500, onComplete: () => dark.destroy() });
    if (h.over) return;
    // vỡ thành trăm mảnh
    cam.flash(340, 255, 255, 255, false);
    h.fx.shake(0.035, 560);
    playSfx('boom');
    const ctop = cy - 60;
    for (let i = 0; i < P.shards; i++) {
      const a = Math.random() * Math.PI * 2;
      const d = 120 + Math.random() * 300;
      const img = sc.add.image(cx, ctop, Math.random() < 0.7 ? 'iceShardA' : 'iceShardB').setTint(Math.random() < 0.5 ? 0xffffff : P.colors[2]).setRotation(a).setScale(1.2 + Math.random()).setDepth(99998);
      sc.tweens.add({ targets: img, x: cx + Math.cos(a) * d, y: ctop + Math.sin(a) * d * 0.8, alpha: 0, duration: 380 + Math.random() * 420, ease: 'Cubic.out', onComplete: () => img.destroy() });
    }
    const rays = sc.add.graphics().setScrollFactor(0).setDepth(99997);
    rays.lineStyle(2.5, 0xffffff, 0.9);
    for (let i = 0; i < 26; i++) {
      const a = (i / 26) * Math.PI * 2;
      rays.lineBetween(cam.width / 2 + Math.cos(a) * 70, cam.height / 2 + Math.sin(a) * 50, cam.width / 2 + Math.cos(a) * cam.width, cam.height / 2 + Math.sin(a) * cam.width);
    }
    sc.tweens.add({ targets: rays, alpha: 0, duration: 450, onComplete: () => rays.destroy() });
    let any = false;
    for (const e of targets) {
      e.anim.lift = 0;
      if (e.dead) continue;
      any = true;
      const dx = e.x - cx;
      const dy = e.y - cy;
      const dd = Math.hypot(dx, dy) || 1;
      radialShards(sc, e.x, e.centerY, 10, 40, P.colors[2]);
      h.damageEnemy(e, { ...mv, knockback: 420 }, amount * P.slamPower, dx / dd, dy / dd, true);
    }
    if (any) h.hitStop(140);
  });
}
