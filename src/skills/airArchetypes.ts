// Hệ Bay / gió / âm thanh: Cánh Chém (cánh lông vũ quét), Sóng Siêu Âm (các vệt sóng cong lan ra phía trước).
import Phaser from 'phaser';
import type { SkillHost } from './host';
import type { Fighter } from '../entities/Fighter';
import type { MoveDef } from '../data/moveKit';
import type { LooseParams } from './types';
import { playSfx } from '../systems/sfx';
import { TYPE_COLOR } from '../data/types';

const V = (x: number, y: number) => new Phaser.Math.Vector2(x, y);

function aimOf(h: SkillHost, f: Fighter, dir: Phaser.Math.Vector2) {
  const t = h.aimTarget;
  if (t && !t.dead) {
    const v = new Phaser.Math.Vector2(t.x - f.x, t.centerY - f.chestY);
    if (v.lengthSq() > 4) return v.normalize();
  }
  return dir.clone().normalize();
}

/**
 * Cánh Chém: một bên cánh khổng lồ quét qua phía trước — các sợi lông vũ dài xếp quạt (dài dần ra ngoài),
 * kèm vệt gió cong trắng và lông bay tung. Sát thương theo hình quạt như đòn quét.
 */
export function castWingSlash(h: SkillHost, f: Fighter, m: MoveDef, P: LooseParams, dir: Phaser.Math.Vector2) {
  const sc = h.scene;
  const mult = h.stackMult(f, m);
  f.playMove(m);
  playSfx(m.sfx);
  const a = aimOf(h, f, dir);
  f.faceTo(a.x, a.y);
  const base = Math.atan2(a.y, a.x);
  const reach: number = P.reach ?? 64;
  const span = Phaser.Math.DegToRad(P.spanDeg ?? 170);
  const ms: number = P.ms ?? 260;
  const feathers: number = P.feathers ?? 9;
  const col: number = P.color ?? 0xf4f8ff;
  const edge: number = P.edge ?? 0x6a9ad8;
  const side = Math.random() < 0.5 ? 1 : -1;
  const g = sc.add.graphics().setDepth(99991);
  const t0 = h.clock;
  const amount = m.power * f.power * mult * (P.powerMult ?? 1);
  const hit = new Set<unknown>();
  let shed = 0;
  h.addFrameTask(ms + 160, (now) => {
    const k = Math.min(1, (now - t0) / ms);
    const fade = 1 - Math.max(0, (now - t0 - ms) / 160);
    g.clear();
    const lead = base + side * (-span / 2 + span * k);
    // vệt gió cong trắng phía sau cánh
    for (let w = 0; w < 3; w++) {
      const pts: Phaser.Math.Vector2[] = [];
      const r = reach * (0.55 + w * 0.22);
      for (let i = 0; i <= 14; i++) {
        const aa = lead - side * (span * 0.5 * (i / 14));
        pts.push(V(f.x + Math.cos(aa) * r, f.chestY + Math.sin(aa) * r * 0.8));
      }
      g.lineStyle(2 - w * 0.4, 0xffffff, (0.7 - w * 0.2) * fade).strokePoints(pts, false);
    }
    // các sợi lông: toả ra từ thân, dài dần về phía ngoài của cánh
    for (let i = 0; i < feathers; i++) {
      const u = i / (feathers - 1);
      const aa = lead - side * (span * 0.42 * (1 - u));
      const len = reach * (0.62 + 0.38 * u) * (0.9 + 0.1 * Math.sin(now / 40 + i));
      const w = 6 + 4 * u;
      const cx = f.x + Math.cos(aa) * 8;
      const cy = f.chestY + Math.sin(aa) * 6;
      const tx = f.x + Math.cos(aa) * len;
      const ty = f.chestY + Math.sin(aa) * len * 0.8;
      const nx = -Math.sin(aa);
      const ny = Math.cos(aa) * 0.8;
      const mx = (cx + tx) / 2 + nx * w * 0.5 * side;
      const my = (cy + ty) / 2 + ny * w * 0.5 * side;
      const pts = [V(cx, cy), V(mx + nx * w, my + ny * w), V(tx, ty), V(mx - nx * w, my - ny * w)];
      g.fillStyle(col, 0.92 * fade).fillPoints(pts, true);
      g.lineStyle(1.6, edge, fade).strokePoints(pts, true);
      g.lineStyle(1, edge, 0.6 * fade).lineBetween(cx, cy, tx, ty);
    }
    // lông rụng bay tung
    if (k < 0.95 && shed++ % 2 === 0) {
      const aa = lead;
      h.fx.puff('featherA', f.x + Math.cos(aa) * reach * 0.9, f.chestY + Math.sin(aa) * reach * 0.75, 1);
    }
    if (k > 0.25) {
      for (const e of h.enemies()) {
        if (!e.targetable || hit.has(e)) continue;
        const rx = e.x - f.x;
        const ry = e.centerY - f.chestY;
        if (Math.hypot(rx, ry / 0.8) > reach + e.radius) continue;
        const ang = Math.atan2(ry, rx);
        if (Math.abs(Phaser.Math.Angle.Wrap(ang - base)) > span / 2 + 0.2) continue;
        hit.add(e);
        h.damageEnemy(e, m, amount, Math.cos(ang), Math.sin(ang), true);
        h.fx.puff('featherA', e.x, e.centerY, 4);
      }
    }
  }, () => g.destroy());
}

/**
 * Sóng Siêu Âm: các vệt sóng cong ")))" lan ra từ miệng thành hình quạt, gợn răng cưa nhẹ, nhạt dần khi ra xa.
 * Sát thương (và trạng thái như Rối loạn) theo hình quạt.
 */
export function castSonic(h: SkillHost, f: Fighter, m: MoveDef, P: LooseParams, dir: Phaser.Math.Vector2) {
  const sc = h.scene;
  const mult = h.stackMult(f, m);
  f.playMove(m);
  playSfx(m.sfx);
  const a = aimOf(h, f, dir);
  f.faceTo(a.x, a.y);
  const base = Math.atan2(a.y, a.x);
  const len: number = P.len ?? 120;
  const span = Phaser.Math.DegToRad(P.spanDeg ?? 78);
  const ms: number = P.ms ?? 560;
  const waves: number = P.waves ?? 5;
  const c0: number = P.color ?? TYPE_COLOR[m.type];
  const c1: number = P.color2 ?? 0xffffff;
  const g = sc.add.graphics().setDepth(99991);
  const t0 = h.clock;
  const amount = m.power * f.power * mult * (P.powerMult ?? 1);
  const hit = new Set<unknown>();
  const ox = f.x + Math.cos(base) * 10;
  const oy = f.chestY + Math.sin(base) * 7;
  h.addFrameTask(ms, (now) => {
    const k = Math.min(1, (now - t0) / ms);
    g.clear();
    // nền quạt mờ cho thấy vùng sóng quét
    const wr = len * Math.min(1, k * 1.15);
    g.fillStyle(c0, 0.1 * (1 - k)).slice(ox, oy, wr, base - span / 2, base + span / 2, false).fillPath();
    for (let i = 0; i < waves; i++) {
      // mỗi vệt sóng xuất phát lệch nhau, lan ra tới hết tầm
      const kk = k * (1 + waves * 0.22) - i * 0.22;
      if (kk <= 0 || kk >= 1) continue;
      const r = len * kk;
      const pts: Phaser.Math.Vector2[] = [];
      for (let s = 0; s <= 22; s++) {
        const u = s / 22;
        const aa = base - span / 2 + span * u;
        const rr = r + Math.sin(u * 12 + now / 38 + i) * 4.2;
        pts.push(V(ox + Math.cos(aa) * rr, oy + Math.sin(aa) * rr * 0.8));
      }
      const al = (1 - kk) * 0.95;
      g.lineStyle(13 - kk * 5, c0, al * 0.35).strokePoints(pts, false);
      g.lineStyle(6 - kk * 2.5, c0, al).strokePoints(pts, false);
      g.lineStyle(2.2, c1, al).strokePoints(pts, false);
    }
    if (k > 0.1) {
      for (const e of h.enemies()) {
        if (!e.targetable || hit.has(e)) continue;
        const rx = e.x - ox;
        const ry = e.centerY - oy;
        const dd = Math.hypot(rx, ry / 0.8);
        if (dd > len * k + e.radius || dd > len + e.radius) continue;
        const ang = Math.atan2(ry, rx);
        if (Math.abs(Phaser.Math.Angle.Wrap(ang - base)) > span / 2 + 0.15) continue;
        hit.add(e);
        h.damageEnemy(e, m, amount, Math.cos(ang), Math.sin(ang), true);
        h.fx.ringBurst(e.x, e.centerY, 14, c0, c1, 260);
      }
    }
  }, () => g.destroy());
}
