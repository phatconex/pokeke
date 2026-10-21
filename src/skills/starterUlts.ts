// Tuyệt chiêu riêng cho các dòng khởi đầu + Pikachu (theo storyboard đã duyệt, docs/mockups/ult-*.png):
//  Venusaur Frenzy Plant · Ivysaur Vũ Điệu Cánh Hoa · Charizard Blast Burn · Charmeleon Hỏa Long Thức Tỉnh
//  Blastoise Hydro Cannon · Wartortle Xoáy Nước Thủy Lực · Raichu Thunder · Pikachu Volt Tackle
import Phaser from 'phaser';
import type { Enemy } from '../entities/Enemy';
import type { Fighter } from '../entities/Fighter';
import type { MoveDef } from '../data/moveKit';
import type { UltimateDef } from '../data/ultimates';
import { groundWarn } from '../fx/IceFx';
import { scatter } from '../fx/TypeFx';
import { playSfx } from '../systems/sfx';
import { dialectFor } from './dialects';
import type { SkillHost } from './host';
import type { LooseParams } from './types';

const V = (x: number, y: number) => new Phaser.Math.Vector2(x, y);
type Pt = { x: number; y: number };

function alive(h: SkillHost): Enemy[] {
  return h.enemies().filter((e) => e.targetable);
}
function centroid(h: SkillHost, f: Fighter): Pt {
  const es = alive(h);
  return es.length ? { x: es.reduce((a, e) => a + e.x, 0) / es.length, y: es.reduce((a, e) => a + e.y, 0) / es.length } : { x: f.x + f.facing.x * 110, y: f.y };
}
function dim(h: SkillHost, color: number, alpha: number, holdMs: number) {
  const cam = h.scene.cameras.main;
  const r = h.scene.add.rectangle(0, 0, cam.width, cam.height, color, 0).setOrigin(0).setScrollFactor(0).setDepth(99989);
  h.scene.tweens.add({ targets: r, fillAlpha: alpha, duration: 350 });
  h.scene.time.delayedCall(holdMs, () => h.scene.tweens.add({ targets: r, fillAlpha: 0, duration: 450, onComplete: () => r.destroy() }));
  return r;
}
const zig = (g: Phaser.GameObjects.Graphics, x1: number, y1: number, x2: number, y2: number, col: number, w: number, jit = 10) => {
  const pts = [V(x1, y1)];
  for (let i = 1; i < 8; i++) {
    const t = i / 8;
    pts.push(V(x1 + (x2 - x1) * t + (Math.random() - 0.5) * jit, y1 + (y2 - y1) * t + (Math.random() - 0.5) * jit * 0.4));
  }
  pts.push(V(x2, y2));
  g.lineStyle(w, col, 1).strokePoints(pts, false);
};

// ======================================================================= Venusaur — Frenzy Plant
export function castFrenzyPlant(h: SkillHost, f: Fighter, _P: LooseParams, _u: UltimateDef, mv: MoveDef, amount: number) {
  if (h.over) return;
  const sc = h.scene;
  const cam = sc.cameras.main;
  cam.flash(220, 120, 255, 120, false);
  h.fx.shake(0.01, 2500);
  playSfx('roar');
  dim(h, 0x0a2a08, 0.3, 2800);
  const g = sc.add.graphics().setDepth(99990);
  const t0 = h.clock;
  // 1) gồng: vòng sáng xanh dưới chân
  h.addFrameTask(700, (now) => {
    g.clear();
    const k = (now - t0) / 700;
    for (let i = 0; i < 3; i++) g.lineStyle(3, 0x7aff7a, (1 - k) * (0.9 - i * 0.2)).strokeEllipse(f.x, f.feetY, (28 + i * 22 + k * 50) * 2, (12 + i * 8 + k * 20) * 2);
  }, () => g.destroy());
  const targets = alive(h);
  // 2–3) rễ khổng lồ + siết
  const vines = targets.map((e) => ({ e, gx: sc.add.graphics().setDepth(e.y + 2400) }));
  h.schedule(t0 + 700, () => {
    if (h.over) return;
    playSfx('leaf');
    const v0 = h.clock;
    h.addFrameTask(1300, (now) => {
      const k = Math.min(1, (now - v0) / 350);
      for (const { e, gx } of vines) {
        if (e.dead) {
          gx.clear();
          continue;
        }
        gx.clear();
        const hh = 92 * k;
        for (const off of [-9, 0, 9]) {
          const bx = e.x + off;
          const by = e.y + 14;
          const pts: Phaser.Math.Vector2[] = [];
          for (let i = 0; i <= 10; i++) {
            const t = i / 10;
            pts.push(V(bx + Math.sin(t * 9 + now / 140 + off) * 5, by - hh * t));
          }
          gx.lineStyle(11, 0x2a3a10, 1).strokePoints(pts, false);
          gx.lineStyle(7.5, 0x6a8a30, 1).strokePoints(pts, false);
          for (let i = 1; i < 6; i++) {
            const p = pts[Math.min(10, i * 2)];
            gx.fillStyle(0xcaf070, 1).fillTriangle(p.x, p.y, p.x + 7, p.y - 3, p.x + 1, p.y - 5);
          }
        }
        e.stunnedUntil = Math.max(e.stunnedUntil, now + 300);
        e.anim.lift = Math.min(34, 34 * k);
        if (Math.random() < 0.4) h.fx.puff('leafpuff', e.x + (Math.random() - 0.5) * 30, e.y - Math.random() * 40, 1);
      }
    }, () => {
      for (const { e, gx } of vines) {
        e.anim.lift = 0;
        sc.tweens.add({ targets: gx, alpha: 0, duration: 200, onComplete: () => gx.destroy() });
      }
    });
    for (let tick = 0; tick < 5; tick++) {
      h.schedule(v0 + 300 + tick * 220, () => {
        for (const { e } of vines) if (!e.dead && e.targetable) h.damageEnemy(e, mv, amount * 0.07, 0, 0, true);
      });
    }
  });
  // 4) hoa nở + Solar
  const c = centroid(h, f);
  h.schedule(t0 + 1850, () => {
    if (h.over) return;
    const fg = sc.add.graphics().setDepth(99996);
    const b0 = h.clock;
    h.addFrameTask(650, (now) => {
      const k = Math.min(1, (now - b0) / 450);
      fg.clear();
      const r = 34 * k;
      for (let i = 0; i < 10; i++) {
        const a = (i / 10) * Math.PI * 2 + now / 900;
        fg.fillStyle(0xff8ab8, 0.95).fillEllipse(c.x + Math.cos(a) * r * 0.62, c.y + Math.sin(a) * r * 0.36, r * 1.0, r * 0.45);
        fg.lineStyle(1.4, 0xc03a78, 1).strokeEllipse(c.x + Math.cos(a) * r * 0.62, c.y + Math.sin(a) * r * 0.36, r * 1.0, r * 0.45);
      }
      fg.fillStyle(0xffe070, 1).fillCircle(c.x, c.y, r * 0.32);
      fg.lineStyle(2, 0xc08a10, 1).strokeCircle(c.x, c.y, r * 0.32);
      if (k >= 1) {
        const rk = (now - b0 - 450) / 200;
        for (let i = 0; i < 20; i++) {
          const a = (i / 20) * Math.PI * 2;
          fg.lineStyle(3, 0xfff08a, 1 - rk * 0.5).lineBetween(c.x + Math.cos(a) * 20, c.y + Math.sin(a) * 12, c.x + Math.cos(a) * (60 + rk * 120), c.y + Math.sin(a) * (30 + rk * 60));
        }
      }
    }, () => {
      fg.destroy();
      if (h.over) return;
      cam.flash(260, 255, 255, 180, false);
      h.fx.shake(0.02, 360);
      playSfx('boom');
      h.fx.ringBurst(c.x, c.y, 120, 0xfff08a, 0xffffff, 520);
      for (const e of alive(h)) {
        const dx = e.x - c.x;
        const dy = e.y - c.y;
        const dd = Math.hypot(dx, dy) || 1;
        h.damageEnemy(e, { ...mv, knockback: 300 }, amount * 0.45, dx / dd, dy / dd, true);
      }
      // 5) kết: cánh hoa rơi + hồi máu
      for (let i = 0; i < 4; i++) scatter(sc, 'petalP', c.x + (Math.random() - 0.5) * 120, c.y - 40, 8, 80);
      f.heal(f.maxHp * 0.08);
      h.fx.floatingLabel(f.x, f.chestY - 20, '+HP', '#9aff9a');
    });
  });
}

// ======================================================================= Ivysaur — Vũ Điệu Cánh Hoa
export function castPetalDance(h: SkillHost, f: Fighter, _P: LooseParams, _u: UltimateDef, mv: MoveDef, amount: number) {
  if (h.over) return;
  const sc = h.scene;
  sc.cameras.main.flash(200, 255, 170, 210, false);
  h.fx.shake(0.006, 1800);
  playSfx('leaf');
  dim(h, 0x2a0a1a, 0.18, 1900);
  const g = sc.add.graphics().setDepth(99995);
  const t0 = h.clock;
  const total = 1700;
  const petals = Array.from({ length: 46 }, (_, i) => ({ a: (i / 46) * Math.PI * 2 * 3, s: 0.8 + Math.random() * 0.6, tint: i % 3 === 0 ? 0xffc8dc : 0xff7aa8 }));
  let next = t0 + 150;
  h.addFrameTask(total, (now) => {
    if (f.dead) return;
    const k = (now - t0) / total;
    const R = 24 + 120 * Math.min(1, k * 1.15);
    g.clear();
    for (const p of petals) {
      const ang = p.a + (now - t0) / (200 / p.s);
      const rr = R * (0.35 + 0.65 * ((p.a / 19) % 1));
      const x = f.x + Math.cos(ang) * rr;
      const y = f.chestY + Math.sin(ang) * rr * 0.5;
      g.fillStyle(p.tint, 0.95).fillEllipse(x, y, 7, 3.6);
      g.lineStyle(1, 0xc03a78, 0.9).strokeEllipse(x, y, 7, 3.6);
    }
    if (now >= next) {
      next = now + 200;
      for (const e of alive(h)) {
        const dx = e.x - f.x;
        const dy = (e.y - f.y) / 0.5;
        const dd = Math.hypot(dx, dy);
        if (dd > R + e.radius) continue;
        h.damageEnemy(e, mv, amount * 0.14, dx / (dd || 1), dy / (dd || 1), true);
        h.fx.puff('leafpuff', e.x, e.centerY, 2);
      }
    }
  }, () => {
    g.destroy();
    if (h.over) return;
    for (let i = 0; i < 4; i++) scatter(sc, 'petalP', f.x + (Math.random() - 0.5) * 150, f.y - 30, 8, 70);
  });
}

// ======================================================================= Charizard — Blast Burn
export function castBlastBurn(h: SkillHost, f: Fighter, _P: LooseParams, _u: UltimateDef, mv: MoveDef, amount: number) {
  if (h.over) return;
  const sc = h.scene;
  const cam = sc.cameras.main;
  const d = dialectFor('fire', h.fx, mv, h);
  cam.flash(240, 255, 140, 40, false);
  h.fx.shake(0.012, 2800);
  playSfx('roar');
  dim(h, 0x4a0a00, 0.34, 3000);
  const c = centroid(h, f);
  const t0 = h.clock;
  // 1) bay lên, lửa bao thân
  const g = sc.add.graphics().setDepth(99994);
  h.addFrameTask(2600, (now) => {
    if (f.dead) return;
    const k = (now - t0) / 2600;
    f.anim.lift = k < 0.8 ? Math.min(58, ((now - t0) / 600) * 58) : 58 * Math.max(0, 1 - (k - 0.8) / 0.2);
    g.clear();
    g.fillStyle(0xff6a10, 0.28).fillEllipse(f.x, f.chestY - f.anim.lift * 0.4, 36, 40);
    if (Math.random() < 0.6) h.fx.puff('flamepuff', f.x + (Math.random() - 0.5) * 22, f.chestY - f.anim.lift * 0.4 + (Math.random() - 0.5) * 20, 1);
  }, () => {
    g.destroy();
    f.anim.lift = 0;
  });
  // 2) cột lửa khổng lồ bổ xuống tâm
  h.schedule(t0 + 650, () => {
    if (h.over) return;
    const cg = sc.add.graphics().setDepth(99996);
    const c0 = h.clock;
    playSfx('flame');
    h.addFrameTask(420, (now) => {
      const k = Math.min(1, (now - c0) / 260);
      cg.clear();
      const top = V(f.x + f.facing.x * 14, f.chestY - 40);
      const w = 40 * k;
      for (const [mul, col, al] of [[1.5, 0xff5a10, 0.55], [1, 0xff9a30, 0.8], [0.5, 0xffe070, 0.95]] as [number, number, number][]) {
        cg.fillStyle(col, al).fillPoints([V(top.x - 8, top.y), V(top.x + 8, top.y), V(c.x + w * mul, c.y), V(c.x - w * mul, c.y)], true);
      }
    }, () => cg.destroy());
  });
  // 3) cột lửa lan thành các vòng
  h.schedule(t0 + 1050, () => {
    if (h.over) return;
    d.explosion(c.x, c.y, 40);
    h.fx.shake(0.016, 300);
    const rings = [44, 88, 132, 176];
    rings.forEach((R, i) => {
      h.schedule(h.clock + i * 230, () => {
        if (h.over) return;
        playSfx('flame');
        const n = 8 + i * 5;
        for (let q = 0; q < n; q++) {
          const a = (q / n) * Math.PI * 2 + i;
          d.pillar(Phaser.Math.Clamp(c.x + Math.cos(a) * R, 12, h.worldW - 12), Phaser.Math.Clamp(c.y + Math.sin(a) * R * 0.6, 12, h.worldH - 12), 2.4);
        }
        for (const e of alive(h)) {
          const dd = Math.hypot(e.x - c.x, (e.y - c.y) / 0.6);
          if (Math.abs(dd - R) > 40 + e.radius) continue;
          h.damageEnemy(e, mv, amount * 0.2, (e.x - c.x) / (dd || 1), (e.y - c.y) / (dd || 1), true);
        }
      });
    });
  });
  // 4) nổ khổng lồ hình sao + 5) dư chấn
  h.schedule(t0 + 2050, () => {
    if (h.over) return;
    cam.flash(260, 255, 200, 90, false);
    h.fx.shake(0.03, 520);
    playSfx('boom');
    h.fx.starBurst(c.x, c.y, 140, 5, 0xe8401a, 0xffe070);
    h.fx.ringBurst(c.x, c.y, 180, 0xff9a30, 0xffffff, 560);
    h.fx.debrisBurst(c.x, c.y, 26);
    d.scorch(c.x, c.y, 110, 3600);
    for (const e of alive(h)) {
      const dx = e.x - c.x;
      const dy = e.y - c.y;
      const dd = Math.hypot(dx, dy) || 1;
      h.damageEnemy(e, { ...mv, knockback: 340, status: { kind: 'burn', chance: 1, ms: 4000 } }, amount * 0.5, dx / dd, dy / dd, true);
    }
  });
}

// ======================================================================= Charmeleon — Hỏa Long Thức Tỉnh
export function castFireDragon(h: SkillHost, f: Fighter, _P: LooseParams, _u: UltimateDef, mv: MoveDef, amount: number) {
  if (h.over) return;
  const sc = h.scene;
  const cam = sc.cameras.main;
  const d = dialectFor('fire', h.fx, mv, h);
  cam.flash(220, 255, 150, 50, false);
  h.fx.shake(0.01, 2300);
  playSfx('roar');
  dim(h, 0x3a0a00, 0.26, 2400);
  const c = centroid(h, f);
  const ang = Math.atan2(c.y - f.y, c.x - f.x);
  const ax = Math.cos(ang);
  const ay = Math.sin(ang);
  const nx = -ay;
  const ny = ax;
  const len = Math.max(260, Math.hypot(c.x - f.x, c.y - f.y) + 140);
  const g = sc.add.graphics().setDepth(99996);
  const t0 = h.clock;
  const total = 1900;
  const hit = new Set<Enemy>();
  const pos = (t: number): Pt => ({ x: f.x + ax * len * t + nx * Math.sin(t * 9) * 30 * Math.min(1, t * 3), y: f.chestY + ay * len * t * 0.8 + ny * Math.sin(t * 9) * 30 * Math.min(1, t * 3) * 0.8 });
  h.addFrameTask(total, (now) => {
    const k = (now - t0) / total;
    const head = Math.min(1, k * 1.25);
    g.clear();
    const N = 22;
    for (let i = N; i >= 0; i--) {
      const t = Math.max(0, head - (i / N) * 0.36);
      const p = pos(t);
      const r = 5 + (1 - i / N) * 9;
      const fade = i / N;
      g.fillStyle(0xff4a10, 0.55 * (1 - fade * 0.4)).fillCircle(p.x, p.y, r * 1.5);
      g.fillStyle(0xff9a30, 0.9 * (1 - fade * 0.5)).fillCircle(p.x, p.y, r);
      g.fillStyle(0xffe070, 0.95 * (1 - fade * 0.6)).fillCircle(p.x, p.y, r * 0.5);
    }
    const hp = pos(head);
    const hx = ax;
    const hy = ay;
    // đầu rồng: hộp thuôn + sừng + mắt
    g.fillStyle(0xff7a20, 1).fillPoints([V(hp.x + hx * 18, hp.y + hy * 14), V(hp.x - hy * 11, hp.y + hx * 9), V(hp.x - hx * 12, hp.y - hy * 6), V(hp.x + hy * 11, hp.y - hx * 9)], true);
    g.lineStyle(2, 0xb02a08, 1).strokePoints([V(hp.x + hx * 18, hp.y + hy * 14), V(hp.x - hy * 11, hp.y + hx * 9), V(hp.x - hx * 12, hp.y - hy * 6), V(hp.x + hy * 11, hp.y - hx * 9)], true);
    g.fillStyle(0xffffff, 1).fillCircle(hp.x + hx * 4 - hy * 5, hp.y + hy * 3 + hx * 4, 2.4);
    g.fillStyle(0x300000, 1).fillCircle(hp.x + hx * 5 - hy * 5, hp.y + hy * 3 + hx * 4, 1.2);
    g.fillStyle(0xffe070, 1).fillTriangle(hp.x - hx * 6 - hy * 8, hp.y - hy * 6 + hx * 6, hp.x - hx * 16 - hy * 14, hp.y - hy * 10 + hx * 12, hp.x - hx * 9 - hy * 4, hp.y - hy * 6 + hx * 2);
    if (Math.random() < 0.7) h.fx.puff('flamepuff', hp.x, hp.y, 2);
    for (const e of alive(h)) {
      if (hit.has(e)) continue;
      if (Math.hypot(e.x - hp.x, (e.y - hp.y) / 0.8) > 36 + e.radius) continue;
      hit.add(e);
      d.hit(e.x, e.centerY, true);
      h.damageEnemy(e, mv, amount * 0.55, hx, hy, true);
    }
  }, () => {
    g.destroy();
    if (h.over) return;
    const end = pos(1);
    d.explosion(end.x, end.y, 60);
    h.fx.starBurst(end.x, end.y, 70, 5, 0xe8401a, 0xffe070);
    h.fx.shake(0.02, 300);
    playSfx('boom');
    for (const e of alive(h)) {
      if (Math.hypot(e.x - end.x, (e.y - end.y) / 0.8) > 70 + e.radius) continue;
      h.damageEnemy(e, { ...mv, knockback: 280, status: { kind: 'burn', chance: 1, ms: 3000 } }, amount * 0.3, e.x - end.x, e.y - end.y, true);
    }
  });
}

// ======================================================================= Blastoise — Hydro Cannon
export function castHydroCannon(h: SkillHost, f: Fighter, _P: LooseParams, _u: UltimateDef, mv: MoveDef, amount: number) {
  if (h.over) return;
  const sc = h.scene;
  const cam = sc.cameras.main;
  cam.flash(220, 170, 220, 255, false);
  h.fx.shake(0.012, 2900);
  playSfx('roar');
  dim(h, 0x06203a, 0.26, 3000);
  const aimE = alive(h).sort((a, b) => Math.hypot(a.x - f.x, a.y - f.y) - Math.hypot(b.x - f.x, b.y - f.y))[0];
  const base = aimE ? Math.atan2(aimE.centerY - f.chestY, aimE.x - f.x) : Math.atan2(f.facing.y, f.facing.x || 1);
  f.faceTo(Math.cos(base), Math.sin(base));
  f.anim.playOnce('charge', 700);
  f.sprayUntil = h.clock + 2500;
  const t0 = h.clock;
  const gather = sc.add.graphics().setDepth(99996);
  const cannons = (): Pt[] => [{ x: f.x - 9, y: f.chestY - 10 }, { x: f.x + 9, y: f.chestY - 10 }];
  // 1) dàn pháo gom nước
  h.addFrameTask(700, (now) => {
    gather.clear();
    const k = (now - t0) / 700;
    for (const c of cannons()) {
      gather.fillStyle(0x4aa8f0, 0.5).fillCircle(c.x, c.y, 4 + 8 * k);
      gather.fillStyle(0xe8fbff, 0.95).fillCircle(c.x, c.y, 2 + 4 * k);
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2 + now / 120;
        const rr = (22 - 14 * k) + ((i * 7) % 6);
        gather.fillStyle(0xbfe8ff, 0.9).fillRect(c.x + Math.cos(a) * rr, c.y + Math.sin(a) * rr * 0.7, 2, 2);
      }
    }
    h.fx.shake(0.003 + 0.006 * k, 70);
  }, () => gather.destroy());
  // 2–3) hai tia pháo quét chéo
  const bg = sc.add.graphics().setDepth(99997);
  let nextTick = 0;
  h.schedule(t0 + 700, () => {
    if (h.over || f.dead) return;
    playSfx('boom');
    cam.flash(160, 220, 240, 255, false);
    const b0 = h.clock;
    const ms = 1250;
    const L = 380;
    h.addFrameTask(ms, (now) => {
      const k = (now - b0) / ms;
      const sw = 0.55 * (k * 2 - 1); // -0.55 → +0.55 rad
      bg.clear();
      const cs = cannons();
      const angles = [base - sw, base + sw];
      cs.forEach((c, i) => {
        const a = angles[i];
        const ex = c.x + Math.cos(a) * L;
        const ey = c.y + Math.sin(a) * L * 0.8;
        bg.lineStyle(15, 0x2a6ac8, 0.55).lineBetween(c.x, c.y, ex, ey);
        bg.lineStyle(9, 0x4aa8f0, 0.9).lineBetween(c.x, c.y, ex, ey);
        bg.lineStyle(3.5, 0xe8fbff, 1).lineBetween(c.x, c.y, ex, ey);
        if (Math.random() < 0.8) h.fx.puff('bubblepuff', c.x + (ex - c.x) * Math.random(), c.y + (ey - c.y) * Math.random(), 1);
      });
      if (now >= nextTick) {
        nextTick = now + 110;
        cs.forEach((c, i) => {
          const a = angles[i];
          const ux = Math.cos(a);
          const uy = Math.sin(a) * 0.8;
          for (const e of alive(h)) {
            const rx = e.x - c.x;
            const ry = e.centerY - c.y;
            const along = rx * ux + ry * uy;
            const side = Math.abs(rx * -uy + ry * ux);
            if (along < 0 || along > L + e.radius || side > 20 + e.radius) continue;
            h.damageEnemy(e, mv, amount * 0.07, ux, uy, true, true);
          }
        });
      }
    }, () => bg.destroy());
  });
  // 4) sóng thần cuối
  h.schedule(t0 + 2050, () => {
    if (h.over) return;
    playSfx('waterLo');
    const wv = cam.worldView;
    const dirX = Math.cos(base) >= 0 ? 1 : -1;
    const x0 = dirX > 0 ? wv.x - 70 : wv.right + 70;
    const x1 = dirX > 0 ? wv.right + 70 : wv.x - 70;
    const wg = sc.add.graphics().setDepth(99995);
    const w0 = h.clock;
    const ms = 900;
    const hit = new Set<Enemy>();
    h.addFrameTask(ms, (now) => {
      const k = Math.min(1, (now - w0) / ms);
      const fx = x0 + (x1 - x0) * k;
      wg.clear();
      const cols = [0x0a2a6a, 0x123a80, 0x1f5ab8, 0x3a8ae0, 0x8ad8ff];
      cols.forEach((col, i) => {
        const w = 150 - i * 24;
        const pts: Phaser.Math.Vector2[] = [V(fx - dirX * w, wv.y - 10), V(fx, wv.y - 10)];
        for (let q = 0; q <= 16; q++) pts.push(V(fx + dirX * (Math.sin(q * 1.2 + now / 90 + i) * 12 - i * 5), wv.y + (wv.height * q) / 16));
        pts.push(V(fx - dirX * w, wv.bottom + 10));
        wg.fillStyle(col, 0.88).fillPoints(pts, true);
      });
      for (let q = 0; q < 14; q++) wg.fillStyle(0xffffff, 0.9).fillCircle(fx + dirX * 6, wv.y + (wv.height * (q + 0.5)) / 14, 5 + (q % 3) * 2);
      for (const e of alive(h)) {
        if (hit.has(e)) continue;
        if ((dirX > 0 && e.x > fx) || (dirX < 0 && e.x < fx)) continue;
        hit.add(e);
        h.damageEnemy(e, { ...mv, knockback: 320 }, amount * 0.4, dirX, 0, true);
        scatter(sc, 'bubble', e.x, e.centerY, 6, 40);
      }
    }, () => {
      wg.destroy();
      if (!h.over) h.fx.shake(0.02, 260);
    });
  });
}

// ======================================================================= Wartortle — Xoáy Nước Thủy Lực
export function castHydroVortex(h: SkillHost, f: Fighter, _P: LooseParams, _u: UltimateDef, mv: MoveDef, amount: number) {
  if (h.over) return;
  const sc = h.scene;
  const cam = sc.cameras.main;
  cam.flash(200, 170, 220, 255, false);
  h.fx.shake(0.01, 2200);
  playSfx('waterLo');
  dim(h, 0x06203a, 0.22, 2300);
  const c = centroid(h, f);
  const g = sc.add.graphics().setDepth(99994);
  const t0 = h.clock;
  const total = 1900;
  const grabbed = new Set<Enemy>();
  let next = t0 + 250;
  h.addFrameTask(total, (now) => {
    const k = (now - t0) / total;
    const R = 96 * Math.min(1, k * 3);
    g.clear();
    for (let arm = 0; arm < 4; arm++) {
      const pts: Phaser.Math.Vector2[] = [];
      for (let i = 0; i <= 18; i++) {
        const t = i / 18;
        const a = (now - t0) / 140 + arm * 1.57 + t * 5;
        pts.push(V(c.x + Math.cos(a) * R * t, c.y + Math.sin(a) * R * t * 0.5));
      }
      g.lineStyle(6, 0x2a6ac8, 0.45).strokePoints(pts, false);
      g.lineStyle(2.6, 0xe8fbff, 0.95).strokePoints(pts, false);
    }
    g.lineStyle(2, 0x4aa8f0, 0.7).strokeEllipse(c.x, c.y, R * 2, R);
    if (Math.random() < 0.8) h.fx.puff('bubblepuff', c.x + (Math.random() - 0.5) * R * 1.6, c.y + (Math.random() - 0.5) * R * 0.7, 1);
    for (const e of alive(h)) {
      const dx = c.x - e.x;
      const dy = c.y - e.y;
      const dd = Math.hypot(dx, dy / 0.5);
      if (dd > R * 1.4 + e.radius && !grabbed.has(e)) continue;
      grabbed.add(e);
      const a = (now - t0) / 120;
      (e.body as unknown as { reset: (x: number, y: number) => void }).reset(e.x + dx * 0.09 + Math.cos(a) * 1.5, e.y + dy * 0.09 + Math.sin(a));
      e.stunnedUntil = Math.max(e.stunnedUntil, now + 200);
      e.anim.lift = Math.min(26, (e.anim.lift || 0) + 1.5);
    }
    if (now >= next) {
      next = now + 240;
      for (const e of grabbed) if (!e.dead && e.targetable) h.damageEnemy(e, mv, amount * 0.09, 0, 0, true);
    }
  }, () => {
    g.destroy();
    for (const e of grabbed) e.anim.lift = 0;
    if (h.over) return;
    // phun nước hất tung
    cam.flash(200, 200, 230, 255, false);
    h.fx.shake(0.02, 320);
    playSfx('boom');
    h.fx.ringBurst(c.x, c.y, 100, 0x4aa8f0, 0xffffff, 520);
    h.fx.splashExplosion(c.x, c.y, 40);
    for (const e of grabbed) {
      if (e.dead) continue;
      const dx = e.x - c.x;
      const dy = e.y - c.y;
      const dd = Math.hypot(dx, dy) || 1;
      h.damageEnemy(e, { ...mv, knockback: 340 }, amount * 0.35, dx / dd, dy / dd, true);
    }
  });
}

// ======================================================================= Raichu — Thunder
export function castThunderfall(h: SkillHost, f: Fighter, _P: LooseParams, _u: UltimateDef, mv: MoveDef, amount: number) {
  if (h.over) return;
  const sc = h.scene;
  const cam = sc.cameras.main;
  const wv = cam.worldView;
  cam.flash(180, 200, 200, 255, false);
  h.fx.shake(0.008, 2500);
  playSfx('thunder');
  dim(h, 0x0a0a1e, 0.5, 2700);
  const targets = alive(h);
  const cg = sc.add.graphics().setDepth(99990);
  const t0 = h.clock;
  const blob = (x: number, y: number, s: number) => {
    for (const [dx, dy, r] of [[-14, 2, 10], [-5, -5, 13], [7, -4, 12], [16, 3, 10], [0, 5, 13]]) cg.fillStyle(0x1c1c2c, 0.95).fillEllipse(x + dx * s, y + dy * s, r * 2 * s, r * 1.4 * s);
  };
  // 1) mây đen kéo tới + tia điện lên trời
  h.addFrameTask(2500, (now) => {
    cg.clear();
    const k = Math.min(1, (now - t0) / 500);
    const a = k * (now - t0 > 2200 ? Math.max(0, (2500 - (now - t0)) / 300) : 1);
    cg.setAlpha(a);
    for (let i = 0; i < 5; i++) blob(wv.x + wv.width * (0.12 + i * 0.19), wv.y + 26 + (i % 2) * 14, 2.2);
    if (Math.random() < 0.3) zig(cg, f.x, f.chestY, wv.x + wv.width * (0.2 + Math.random() * 0.6), wv.y + 30, 0xfff070, 2, 14);
    for (let i = 0; i < 3; i++) zig(cg, f.x - 10 + i * 10, f.chestY - 6, f.x - 14 + Math.random() * 28, f.chestY - 22, 0xffe040, 1.4, 6);
  }, () => cg.destroy());
  // 2) khoá mục tiêu
  h.schedule(t0 + 650, () => {
    if (h.over) return;
    for (const e of targets) groundWarn(sc, e.x, e.y, 650, 0xffe040, 0x3a3008);
    playSfx('warn');
  });
  // 3) sét giáng
  h.schedule(t0 + 1300, () => {
    if (h.over) return;
    cam.flash(180, 255, 255, 220, false);
    h.fx.shake(0.022, 420);
    playSfx('thunder');
    const bg = sc.add.graphics().setDepth(99998);
    for (const e of targets) {
      if (e.dead) continue;
      zig(bg, e.x + (Math.random() - 0.5) * 14, wv.y, e.x, e.y + 8, 0xffe040, 7, 18);
      zig(bg, e.x, wv.y, e.x, e.y + 8, 0xffffff, 3, 10);
      h.fx.lightning(e.x, e.y);
      h.damageEnemy(e, mv, amount * 0.6, 0, 0, true);
    }
    sc.tweens.add({ targets: bg, alpha: 0, duration: 300, delay: 120, onComplete: () => bg.destroy() });
    // 4) điện lan giữa các địch
    h.schedule(h.clock + 280, () => {
      const lg = sc.add.graphics().setDepth(99998);
      const list = alive(h);
      for (let i = 0; i < list.length; i++) {
        const a = list[i];
        const b = list[(i + 1) % list.length];
        if (a === b) continue;
        zig(lg, a.x, a.centerY, b.x, b.centerY, 0xfff070, 3.5, 12);
        h.damageEnemy(b, { ...mv, status: { kind: 'paralyze', chance: 1, ms: 3000 } }, amount * 0.18, 0, 0, true);
        scatter(sc, 'spark', b.x, b.centerY - 14, 5, 30);
      }
      for (const e of list) h.fx.ringBurst(e.x, e.y + 6, 30, 0xffb020, 0xffe040, 380);
      sc.tweens.add({ targets: lg, alpha: 0, duration: 260, onComplete: () => lg.destroy() });
    });
  });
}

// ======================================================================= Pikachu — Volt Tackle
export function castVoltTackle(h: SkillHost, f: Fighter, _P: LooseParams, _u: UltimateDef, mv: MoveDef, amount: number) {
  if (h.over) return;
  const sc = h.scene;
  const cam = sc.cameras.main;
  cam.flash(160, 255, 255, 160, false);
  h.fx.shake(0.01, 1800);
  playSfx('thunder');
  dim(h, 0x1a1a04, 0.22, 2000);
  const order = alive(h).sort((a, b) => a.x - b.x);
  if (!order.length) return;
  f.invulnUntil = Math.max(f.invulnUntil, h.clock + 1900);
  const g = sc.add.graphics().setDepth(99996);
  const trail = sc.add.graphics().setDepth(99995);
  const body = f.zone.body as Phaser.Physics.Arcade.Body;
  const start = { x: f.x, y: f.y };
  let i = 0;
  const segMs = 220;
  let from = { ...start };
  let to = { x: order[0].x, y: order[0].y };
  let seg0 = h.clock;
  let hitDone = false;
  const total = order.length * segMs + 400;
  const t0 = h.clock;
  h.addFrameTask(total, (now) => {
    if (f.dead) return;
    g.clear();
    if (i < order.length) {
      const k = Math.min(1, (now - seg0) / segMs);
      body.reset(from.x + (to.x - from.x) * k, from.y + (to.y - from.y) * k);
      if (k >= 1 && !hitDone) {
        hitDone = true;
        const e = order[i];
        if (!e.dead && e.targetable) {
          zig(trail, f.x - 30, f.y, e.x, e.centerY, 0xffe040, 4, 14);
          h.fx.lightning(e.x, e.y);
          h.fx.shake(0.016, 160);
          playSfx('hit');
          h.damageEnemy(e, mv, amount * 0.5, to.x - from.x, to.y - from.y, true);
          e.stunnedUntil = Math.max(e.stunnedUntil, now + 600);
        }
        i++;
        if (i < order.length) {
          from = { x: f.x, y: f.y };
          to = { x: order[i].x - 14, y: order[i].y };
          seg0 = now;
          hitDone = false;
        } else seg0 = now;
      }
    }
    // bọc điện quanh người + vệt
    for (let q = 0; q < 6; q++) zig(g, f.x + (Math.random() - 0.5) * 6, f.chestY, f.x + (Math.random() - 0.5) * 34, f.chestY + (Math.random() - 0.5) * 34, q % 2 ? 0xffe040 : 0xffffff, 1.8, 6);
    g.fillStyle(0xffe040, 0.3).fillEllipse(f.x, f.chestY, 34, 38);
    trail.alpha = Math.max(0, trail.alpha - 0.05);
  }, () => {
    g.destroy();
    trail.destroy();
    if (h.over) return;
    cam.flash(200, 255, 255, 200, false);
    h.fx.shake(0.022, 320);
    playSfx('boom');
    h.fx.ringBurst(f.x, f.y, 90, 0xffe040, 0xffffff, 460);
    for (const e of alive(h)) {
      if (Math.hypot(e.x - f.x, (e.y - f.y) / 0.8) > 90 + e.radius) continue;
      h.damageEnemy(e, { ...mv, knockback: 260 }, amount * 0.3, e.x - f.x, e.y - f.y, true);
    }
    // phản lực: mất một ít máu, không bao giờ gục
    f.member.hp = Math.max(1, f.member.hp - f.maxHp * 0.05);
    h.fx.floatingLabel(f.x, f.chestY - 20, '-5%', '#ff9a8a');
    void t0;
    void start;
  });
}
