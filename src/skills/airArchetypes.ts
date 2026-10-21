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

/**
 * Phân thân (Ảo Ảnh / Double Team): vài bản sao mờ của chính mình toả ra rồi chạy vòng quanh, nhấp nháy; né đòn trong thời gian hiệu lực.
 * Hết hạn các bản sao tan thành khói.
 */
export function castClones(h: SkillHost, f: Fighter, m: MoveDef, P: LooseParams, _dir: Phaser.Math.Vector2) {
  const sc = h.scene;
  f.startGuard(m, h.clock);
  playSfx('swap');
  const spr = f.anim.sprite;
  const n: number = P.n ?? 4;
  const ms = m.buffMs ?? 3000;
  const tint: number = P.tint ?? 0xaad8ff;
  const clones = Array.from({ length: n }, (_, i) => {
    const c = sc.add.sprite(f.x, f.y, spr.texture.key, String(spr.frame.name)).setOrigin(spr.originX, spr.originY).setScale(spr.scaleX, spr.scaleY).setTint(tint).setAlpha(0).setDepth(spr.depth - 1);
    return { c, a: (i / n) * Math.PI * 2, r: 26 + (i % 2) * 14 };
  });
  const t0 = h.clock;
  h.fx.puff('sparkle', f.x, f.chestY, 8);
  h.addFrameTask(ms, (now) => {
    const k = (now - t0) / ms;
    const fadeIn = Math.min(1, (now - t0) / 200);
    const fadeOut = k > 0.85 ? (1 - k) / 0.15 : 1;
    for (const q of clones) {
      const ang = q.a + (now - t0) / 260;
      const x = f.x + Math.cos(ang) * q.r;
      const y = f.y + Math.sin(ang) * q.r * 0.55;
      q.c.setTexture(spr.texture.key, String(spr.frame.name)).setFlipX(Math.cos(ang) < 0 !== spr.flipX ? spr.flipX : spr.flipX).setPosition(x + (spr.x - f.x), y + (spr.y - f.y)).setDepth(y + 1).setAlpha(((Math.floor(now / 70) + q.r) % 3 === 0 ? 0.25 : 0.5) * fadeIn * fadeOut);
    }
  }, () => {
    for (const q of clones) {
      if (!h.over) h.fx.puff('sparkle', q.c.x, q.c.y, 3);
      q.c.destroy();
    }
  });
}

/**
 * Nhảy lên đè (Body Slam / Heavy Slam / Giẫm Đạp): bật cao khỏi mặt đất, bóng thu nhỏ báo chỗ đáp, rồi rơi xuống nghiền mục tiêu —
 * sóng xung kích, bụi, rung mạnh, hất văng và gây choáng ngắn những địch trong vùng đè.
 */
export function castBodySlam(h: SkillHost, f: Fighter, m: MoveDef, P: LooseParams, _dir: Phaser.Math.Vector2) {
  const sc = h.scene;
  const mult = h.stackMult(f, m);
  const air: number = P.airMs ?? 620;
  const R: number = P.r ?? 46;
  const col: number = P.color ?? TYPE_COLOR[m.type];
  const t = h.aimTarget;
  const c = t && !t.dead ? { x: t.x, y: t.y } : { x: f.x + f.facing.x * 70, y: f.y + f.facing.y * 50 };
  const spr = f.anim.sprite;
  f.invulnUntil = Math.max(f.invulnUntil, h.clock + air + 220);
  playSfx('swap');
  const t0 = h.clock;
  const sx = f.x;
  const sy = f.y;
  const warn = sc.add.graphics().setDepth(-2790);
  h.addFrameTask(air, (now) => {
    const k = Math.min(1, (now - t0) / air);
    // vòng cung: lên cao rồi bay tới chỗ đáp
    const arc = Math.sin(k * Math.PI);
    f.anim.lift = (P.height ?? 110) * arc;
    f.body.reset(sx + (c.x - sx) * Math.min(1, k * 1.08), sy + (c.y - sy) * Math.min(1, k * 1.08));
    spr.setScale(spr.scaleX);
    warn.clear();
    // vùng đè hiện dần + bóng người nhảy
    warn.lineStyle(2, col, 0.4 + 0.5 * k).strokeEllipse(c.x, c.y + 2, R * 2, R * 1.4);
    warn.fillStyle(col, 0.08 + 0.2 * k).fillEllipse(c.x, c.y + 2, R * 2 * (0.3 + 0.7 * k), R * 1.4 * (0.3 + 0.7 * k));
    warn.fillStyle(0x000000, 0.3 * (1 - arc * 0.6)).fillEllipse(f.x, f.feetY + 2, 22 * (1 - arc * 0.45), 7);
  }, () => {
    warn.destroy();
    f.anim.lift = 0;
    if (h.over || f.dead) return;
    f.body.reset(c.x, c.y);
    f.playMove(m);
    h.fx.shake(0.016, 280);
    playSfx('boom');
    h.fx.ringBurst(c.x, c.y + 2, R * 1.5, col, 0xffffff, 420);
    h.fx.dustPuff(c.x, c.y, 12);
    h.fx.debrisBurst(c.x, c.y, 10);
    let any = false;
    for (const e of h.enemies()) {
      if (!e.targetable) continue;
      const dx = e.x - c.x;
      const dy = (e.y - c.y) / 0.75;
      const dd = Math.hypot(dx, dy);
      if (dd > R + e.radius) continue;
      any = true;
      h.damageEnemy(e, { ...m, knockback: m.knockback + 120 }, m.power * f.power * mult * (P.powerMult ?? 1.25), dx / (dd || 1), dy / (dd || 1), true);
      e.stunnedUntil = Math.max(e.stunnedUntil, h.clock + 450);
    }
    if (any) h.hitStop(90);
  });
}

/**
 * Quật Ngã Địa Chấn (Seismic Toss): lao tới túm lấy địch, nhấc bổng lên cao xoay tít rồi quật xuống đất — xung kích, bụi, rung mạnh, choáng.
 */
export function castThrow(h: SkillHost, f: Fighter, m: MoveDef, P: LooseParams, dir: Phaser.Math.Vector2) {
  const sc = h.scene;
  const mult = h.stackMult(f, m);
  const aim = aimOf(h, f, dir);
  const reach: number = P.reach ?? 140;
  const col: number = P.color ?? TYPE_COLOR[m.type];
  let target = h.aimTarget && !h.aimTarget.dead ? h.aimTarget : null;
  if (!target || Math.hypot(target.x - f.x, target.y - f.y) > reach + target.radius) {
    target = null;
    for (const e of h.enemies()) if (e.targetable && Math.hypot(e.x - f.x, e.y - f.y) <= reach + e.radius && (!target || Math.hypot(e.x - f.x, e.y - f.y) < Math.hypot(target.x - f.x, target.y - f.y))) target = e;
  }
  const dist = target ? Math.max(8, Math.hypot(target.x - f.x, target.y - f.y) - target.radius - 12) : 70;
  f.startLunge(aim, dist, 150, h.clock);
  f.playMove(m);
  playSfx('dash');
  h.fx.dustPuff(f.x, f.feetY, 5);
  h.schedule(h.clock + 150, () => {
    if (h.over || f.dead || !f.onField) return;
    const e = target;
    if (!e || e.dead || !e.targetable) {
      h.fx.dustPuff(f.x + aim.x * 20, f.feetY, 6);
      return;
    }
    // túm lấy
    playSfx('hit');
    h.fx.ringBurst(e.x, e.centerY, 18, col, 0xffffff, 240);
    e.stunnedUntil = Math.max(e.stunnedUntil, h.clock + 1100);
    const sx = e.x;
    const sy = e.y;
    const up = 520;
    const down = 170;
    const g = sc.add.graphics().setDepth(99994);
    const t1 = h.clock;
    h.addFrameTask(up + down, (now) => {
      if (e.dead) return;
      const k = now - t1;
      const lift = k < up ? 96 * Math.sin((k / up) * (Math.PI / 2)) : 96 * (1 - (k - up) / down);
      e.anim.lift = Math.max(0, lift);
      const px = sx + aim.x * 16 * Math.min(1, k / up);
      const py = sy + aim.y * 10 * Math.min(1, k / up);
      (e.body as unknown as { reset: (x: number, y: number) => void }).reset(px, py);
      g.clear();
      // vòng xoáy quanh địch bị nhấc: các cung trắng quay tít
      for (let i = 0; i < 3; i++) {
        const a0 = now / 60 + i * 2.1;
        const pts: Phaser.Math.Vector2[] = [];
        for (let q = 0; q <= 10; q++) {
          const aa = a0 + (q / 10) * 1.8;
          pts.push(V(px + Math.cos(aa) * (20 + i * 4), py - lift + Math.sin(aa) * 9 - 4));
        }
        g.lineStyle(3 - i * 0.6, i === 0 ? 0xffffff : col, 0.9 - i * 0.2).strokePoints(pts, false);
      }
      g.fillStyle(0x000000, 0.28 * (1 - Math.min(1, lift / 110) * 0.6)).fillEllipse(px, py + 2, 20 * (1 - lift / 220), 7);
    }, () => {
      g.destroy();
      e.anim.lift = 0;
      if (h.over) return;
      h.fx.shake(0.022, 340);
      playSfx('boom');
      h.fx.ringBurst(e.x, e.y + 2, 56, col, 0xffffff, 460);
      h.fx.dustPuff(e.x, e.y, 14);
      h.fx.debrisBurst(e.x, e.y, 14);
      if (e.targetable) h.damageEnemy(e, { ...m, knockback: m.knockback + 80 }, m.power * f.power * mult * (P.powerMult ?? 1.3), aim.x, aim.y, true);
      for (const o of h.enemies()) {
        if (o === e || !o.targetable) continue;
        const dd = Math.hypot(o.x - e.x, (o.y - e.y) / 0.75);
        if (dd > 54 + o.radius) continue;
        h.damageEnemy(o, m, m.power * f.power * mult * 0.35, (o.x - e.x) / (dd || 1), (o.y - e.y) / (dd || 1), true);
      }
      h.hitStop(120);
    });
  });
}
