// Tuyệt chiêu theo tên chiêu: Mưa Thiên Thạch (hệ Đá: đá tảng thật sự rơi từ trời) và Bóng Đêm Vĩnh Cửu (hệ Ma: màn đêm, mắt ma, vuốt bóng tối chụp lấy).
import Phaser from 'phaser';
import type { Fighter } from '../entities/Fighter';
import type { MoveDef } from '../data/moveKit';
import type { UltimateDef } from '../data/ultimates';
import { groundCracks } from '../fx/GrassFx';
import { groundWarn } from '../fx/IceFx';
import { scatter } from '../fx/TypeFx';
import { playSfx } from '../systems/sfx';
import type { SkillHost } from './host';
import type { LooseParams } from './types';

const V = (x: number, y: number) => new Phaser.Math.Vector2(x, y);

/** Mưa Thiên Thạch: bóng đá tảng lớn dần trên mặt đất (báo trước) → đá tảng từ trời đập xuống: bụi, vết nứt, mảnh vỡ, rung mạnh, choáng */
export function castRockfall(h: SkillHost, _f: Fighter, P: LooseParams, u: UltimateDef, mv: MoveDef, amount: number) {
  if (h.over) return;
  const sc = h.scene;
  const cam = sc.cameras.main;
  const wv = cam.worldView;
  cam.flash(220, 210, 180, 120, false);
  h.fx.shake(0.01, 1900);
  playSfx('roar');
  const dim = sc.add.rectangle(0, 0, cam.width, cam.height, 0x2a1c0c, 0).setOrigin(0).setScrollFactor(0).setDepth(99989);
  sc.tweens.add({ targets: dim, fillAlpha: 0.32, duration: 300 });
  const totalMs = 2000;
  sc.time.delayedCall(totalMs, () => sc.tweens.add({ targets: dim, fillAlpha: 0, duration: 450, onComplete: () => dim.destroy() }));
  const targets = h.enemies().filter((e) => e.targetable);
  const hitsEach: number = u.hits ?? 2;
  type Rock = { x: number; y: number; at: number; target?: (typeof targets)[number] };
  const rocks: Rock[] = [];
  let order = 0;
  for (const e of targets) for (let k = 0; k < hitsEach; k++) rocks.push({ x: e.x + (k ? (Math.random() - 0.5) * 30 : 0), y: e.y + (k ? (Math.random() - 0.5) * 18 : 0), at: 520 + order++ * 90, target: e });
  const extra: number = P.extra ?? 16;
  for (let i = 0; i < extra; i++) {
    rocks.push({ x: Phaser.Math.Clamp(wv.x + 40 + Math.random() * (wv.width - 80), 24, h.worldW - 24), y: Phaser.Math.Clamp(wv.y + 40 + Math.random() * (wv.height - 80), 24, h.worldH - 24), at: 420 + Math.random() * 1200 });
  }
  for (const r of rocks) {
    const warnMs = 560;
    h.schedule(h.clock + Math.max(0, r.at - warnMs), () => {
      if (h.over) return;
      groundWarn(sc, r.x, r.y, warnMs, 0xe8c060, 0x3a2a10);
    });
    h.schedule(h.clock + r.at, () => {
      if (h.over) return;
      const tex = Math.random() < 0.5 ? 'boulderA' : 'boulderB';
      const big = r.target ? 3 : 2.2;
      const img = sc.add.image(r.x - 70, r.y - 260, sc.textures.exists(tex) ? tex : 'boulderA').setScale(big).setDepth(99992);
      const streak = sc.add.graphics().setDepth(99991);
      const tw = { k: 0 };
      sc.tweens.add({
        targets: tw, k: 1, duration: 240, ease: 'Quad.in',
        onUpdate: () => {
          const x = r.x - 70 + 70 * tw.k;
          const y = r.y - 260 + 260 * tw.k;
          img.setPosition(x, y).setRotation(tw.k * 5);
          streak.clear();
          streak.lineStyle(3, 0xd8c8a0, 0.55 * (1 - tw.k)).lineBetween(x - 28, y - 80, x, y);
        },
        onComplete: () => {
          img.destroy();
          streak.destroy();
          if (h.over) return;
          h.fx.dustPuff(r.x, r.y, 9);
          h.fx.debrisBurst(r.x, r.y, 12);
          scatter(sc, 'boulderB', r.x, r.y, 4, 26);
          groundCracks(sc, r.x, r.y + 2, 46, 5, 1800, 0);
          h.fx.shake(0.008, 140);
          playSfx('boom');
          for (const e of h.enemies()) {
            if (!e.targetable) continue;
            if (Math.hypot(e.x - r.x, (e.y - r.y) / 0.8) > 38 + e.radius) continue;
            h.damageEnemy(e, mv, amount * (r.target ? 0.55 : 0.2), 0, 0, true);
          }
        },
      });
    });
  }
}

/**
 * Bóng Đêm Vĩnh Cửu: màn hình chìm vào đêm tím sẫm, các làn khói bóng tối cuộn về phía từng địch, đôi mắt đỏ mở ra trên đầu,
 * rồi các vuốt bóng tối trồi lên khỏi mặt đất khép chặt lại (Rối loạn).
 */
export function castNightfall(h: SkillHost, _f: Fighter, _P: LooseParams, u: UltimateDef, mv: MoveDef, amount: number) {
  if (h.over) return;
  const sc = h.scene;
  const cam = sc.cameras.main;
  cam.flash(260, 120, 60, 160, false);
  h.fx.shake(0.008, 1700);
  playSfx('roar');
  const night = sc.add.rectangle(0, 0, cam.width, cam.height, 0x07021a, 0).setOrigin(0).setScrollFactor(0).setDepth(99989);
  sc.tweens.add({ targets: night, fillAlpha: 0.74, duration: 500 });
  const totalMs = 2300;
  sc.time.delayedCall(totalMs, () => sc.tweens.add({ targets: night, fillAlpha: 0, duration: 600, onComplete: () => night.destroy() }));
  const targets = h.enemies().filter((e) => e.targetable);
  const g = sc.add.graphics().setDepth(99995);
  const wv = cam.worldView;
  const t0 = h.clock;
  // làn khói bóng tối bay thành xoáy tới từng địch
  const wisps = Array.from({ length: 36 }, (_, i) => ({ a: Math.random() * Math.PI * 2, r: 140 + Math.random() * 120, s: 0.6 + Math.random() * 0.8, tgt: targets.length ? targets[i % targets.length] : null, ph: Math.random() * 6 }));
  h.addFrameTask(totalMs, (now) => {
    g.clear();
    const k = (now - t0) / totalMs;
    // mắt ma trên đầu từng địch
    for (const e of targets) {
      if (e.dead) continue;
      const open = Phaser.Math.Clamp((now - t0 - 450) / 350, 0, 1);
      if (open > 0) {
        const pulse = 0.7 + 0.3 * Math.sin(now / 90);
        for (const sx of [-9, 9]) {
          g.fillStyle(0xff3050, 0.9 * open * pulse).fillEllipse(e.x + sx, e.topY - 22, 9, 6 * open);
          g.fillStyle(0xffffff, 0.9 * open).fillEllipse(e.x + sx + 1, e.topY - 22, 3, 2.5 * open);
        }
      }
    }
    // khói bóng tối
    for (const w of wisps) {
      const tgt = w.tgt && !w.tgt.dead ? w.tgt : null;
      const cx = tgt ? tgt.x : (wv.x + wv.width / 2);
      const cy = tgt ? tgt.centerY : (wv.y + wv.height / 2);
      const kk = Math.min(1, k * 1.4 * w.s);
      const rr = w.r * (1 - kk * 0.8);
      const aa = w.a + now / (400 / w.s) + w.ph;
      const x = cx + Math.cos(aa) * rr;
      const y = cy + Math.sin(aa) * rr * 0.6;
      g.fillStyle(0x4a1a7a, 0.35).fillCircle(x, y, 9 - kk * 4);
      g.fillStyle(0xa060e8, 0.5).fillCircle(x, y, 4);
    }
  }, () => g.destroy());
  // vuốt bóng tối chụp lấy từng địch
  targets.forEach((e, i) => {
    for (let hitIdx = 0; hitIdx < (u.hits ?? 2); hitIdx++) {
      h.schedule(h.clock + 850 + i * 160 + hitIdx * 520, () => {
        if (h.over || e.dead) return;
        const cg = sc.add.graphics().setDepth(99996);
        const cx = e.x;
        const cy = e.feetY;
        const tw = { k: 0 };
        sc.tweens.add({
          targets: tw, k: 1, duration: 300, ease: 'Cubic.out',
          onUpdate: () => {
            cg.clear();
            const claws = 6;
            for (let c = 0; c < claws; c++) {
              const ang = (c / claws) * Math.PI * 2 + 0.3;
              const bx = cx + Math.cos(ang) * 40;
              const by = cy + Math.sin(ang) * 22;
              const height = 56 * tw.k;
              // vuốt cong vào tâm: gốc rộng, ngọn nhọn
              const tipx = cx + Math.cos(ang) * 8;
              const tipy = cy - height;
              const nx = -Math.sin(ang) * 6;
              const ny = Math.cos(ang) * 3;
              const pts = [V(bx - nx, by - ny), V((bx + tipx) / 2 + Math.cos(ang) * 10 - nx * 0.5, (by + tipy) / 2), V(tipx, tipy), V((bx + tipx) / 2 + Math.cos(ang) * 6 + nx * 0.5, (by + tipy) / 2 + 4), V(bx + nx, by + ny)];
              cg.fillStyle(0x12041f, 0.95).fillPoints(pts, true);
              cg.lineStyle(2, 0xb070ff, 0.95).strokePoints(pts, true);
            }
          },
          onComplete: () => {
            cg.destroy();
            if (h.over) return;
            h.fx.puff('shadowpuff', cx, e.centerY, 8);
            h.fx.shake(0.006, 100);
            playSfx('hit');
            if (!e.targetable) return;
            h.damageEnemy(e, mv, amount * 0.45, 0, 0, true);
          },
        });
      });
    }
  });
}

/**
 * Siêu Phá Hủy (Hyper Beam): gom năng lượng thành quả cầu cam trước miệng (tia năng lượng hút về, màn hình tối đỏ, đất rung),
 * rồi phóng một chùm tia khổng lồ vàng cam lõi trắng có vòng xoắn chạy dọc, xuyên toàn sân; điểm cuối nổ lớn. Người dùng kiệt sức một lúc.
 */
export function castHyperBeam(h: SkillHost, f: Fighter, P: LooseParams, _u: UltimateDef, mv: MoveDef, amount: number) {
  if (h.over) return;
  const sc = h.scene;
  const cam = sc.cameras.main;
  const wind: number = P.windupMs ?? 1000;
  const aimT = h.aimTarget && !h.aimTarget.dead ? h.aimTarget : null;
  const base = aimT ? Math.atan2(aimT.centerY - f.chestY, aimT.x - f.x) : Math.atan2(f.facing.y, f.facing.x || 1);
  const ax = Math.cos(base);
  const ay = Math.sin(base);
  f.faceTo(ax, ay);
  f.anim.playOnce('charge', wind);
  f.sprayUntil = h.clock + wind + 900;
  playSfx('roar');
  const tint = sc.add.rectangle(0, 0, cam.width, cam.height, 0x2a0a00, 0).setOrigin(0).setScrollFactor(0).setDepth(99989);
  sc.tweens.add({ targets: tint, fillAlpha: 0.38, duration: wind * 0.8 });
  const g = sc.add.graphics().setDepth(99996);
  const t0 = h.clock;
  const mouth = () => ({ x: f.x + ax * 12, y: f.chestY + ay * 8 });
  h.addFrameTask(wind, (now) => {
    if (f.dead || !f.onField) return;
    const k = (now - t0) / wind;
    const m = mouth();
    g.clear();
    // quả cầu năng lượng lớn dần + vầng sáng
    const r = 5 + 22 * k + Math.sin(now / 50) * 1.5;
    g.fillStyle(0xff6a10, 0.25 + 0.2 * k).fillCircle(m.x, m.y, r * 2.2);
    g.fillStyle(0xffa030, 0.6).fillCircle(m.x, m.y, r * 1.4);
    g.fillStyle(0xffe070, 0.95).fillCircle(m.x, m.y, r);
    g.fillStyle(0xffffff, 1).fillCircle(m.x, m.y, r * 0.5);
    // tia năng lượng hút về quả cầu
    for (let i = 0; i < 14; i++) {
      const a = (i / 14) * Math.PI * 2 + now / 260;
      const rr = (70 - 50 * k) + ((i * 13 + now / 9) % 40);
      g.lineStyle(2, i % 2 ? 0xffd060 : 0xff8a30, 0.8).lineBetween(m.x + Math.cos(a) * rr, m.y + Math.sin(a) * rr * 0.7, m.x + Math.cos(a) * (rr - 14), m.y + Math.sin(a) * (rr - 14) * 0.7);
    }
    h.fx.shake(0.003 + 0.007 * k, 70);
  }, () => {
    g.destroy();
    sc.tweens.add({ targets: tint, fillAlpha: 0, duration: 700, delay: 1100, onComplete: () => tint.destroy() });
  });
  h.schedule(t0 + wind, () => {
    if (h.over || f.dead || !f.onField) return;
    f.playMove(mv);
    playSfx('boom');
    cam.flash(180, 255, 220, 140, false);
    h.fx.shake(0.03, 1000);
    const len: number = P.len ?? 640;
    const W: number = P.width ?? 38;
    const m = mouth();
    const nx = -ay;
    const ny = ax;
    const bm = sc.add.graphics().setDepth(99997);
    const ms = 1000;
    const b0 = h.clock;
    let next = 0;
    f.sprayUntil = h.clock + ms + 900;
    const tipX = () => Phaser.Math.Clamp(m.x + ax * len, 10, h.worldW - 10);
    const tipY = () => Phaser.Math.Clamp(m.y + ay * len, 10, h.worldH - 10);
    h.addFrameTask(ms, (now) => {
      if (f.dead) return;
      const k = Math.min(1, (now - b0) / 140);
      const fade = now - b0 > ms - 220 ? (ms - (now - b0)) / 220 : 1;
      bm.clear();
      const ww = W * (0.85 + 0.15 * Math.sin(now / 35)) * k * fade;
      const ex = tipX();
      const ey = tipY();
      for (const [mul, col, al] of [[1.5, 0xff6a10, 0.45], [1, 0xffa830, 0.75], [0.62, 0xffe070, 0.95], [0.28, 0xffffff, 1]] as [number, number, number][]) {
        const w2 = ww * mul;
        bm.fillStyle(col, al).fillPoints([V(m.x + nx * w2 * 0.5, m.y + ny * w2 * 0.5), V(ex + nx * w2, ey + ny * w2), V(ex - nx * w2, ey - ny * w2), V(m.x - nx * w2 * 0.5, m.y - ny * w2 * 0.5)], true);
      }
      // vòng xoắn năng lượng chạy dọc chùm tia
      const blen = Math.hypot(ex - m.x, ey - m.y);
      for (let i = 0; i < 12; i++) {
        const tt = (((i / 12) + now / 380) % 1);
        const px = m.x + (ex - m.x) * tt;
        const py = m.y + (ey - m.y) * tt;
        const rw = ww * (0.9 + 0.5 * tt);
        bm.lineStyle(3, 0xfff0b0, 0.85 * fade).strokeEllipse(px, py, rw * 0.55, rw * 2.0);
      }
      if (Math.random() < 0.7) h.fx.puff('flamepuff', m.x + (ex - m.x) * Math.random(), m.y + (ey - m.y) * Math.random(), 1);
      // điểm cuối: nổ liên tục
      if (Math.random() < 0.35) h.fx.dustPuff(ex, ey, 4);
      if (now >= next) {
        next = now + 100;
        for (const e of h.enemies()) {
          if (!e.targetable) continue;
          const rx = e.x - m.x;
          const ry = e.centerY - m.y;
          const along = rx * ax + ry * ay;
          const side = Math.abs(rx * nx + ry * ny);
          if (along < 0 || along > blen + e.radius || side > W * 1.3 + e.radius) continue;
          h.damageEnemy(e, mv, amount * 0.16, ax, ay, true, true);
        }
      }
      void blen;
    }, () => {
      bm.destroy();
      if (h.over) return;
      // nổ lớn ở cuối chùm tia + người dùng kiệt sức
      const ex = tipX();
      const ey = tipY();
      h.fx.ringBurst(ex, ey, 70, 0xffa030, 0xffffff, 520);
      h.fx.dustPuff(ex, ey, 16);
      h.fx.debrisBurst(ex, ey, 20);
      h.fx.shake(0.03, 420);
      playSfx('boom');
      for (const e of h.enemies()) {
        if (!e.targetable) continue;
        if (Math.hypot(e.x - ex, (e.y - ey) / 0.8) > 60 + e.radius) continue;
        h.damageEnemy(e, mv, amount * 0.5, e.x - ex, e.y - ey, true);
      }
    });
  });
}

/**
 * Cuồng Phong (Hurricane): một cơn lốc xoáy khổng lồ càn qua sân, hút mọi địch vào tâm, nhấc bổng quay tít (gây Rối loạn),
 * rồi hất tung ra ngoài khi tan. Lá và lông vũ bay mù mịt.
 */
export function castHurricane(h: SkillHost, f: Fighter, P: LooseParams, _u: UltimateDef, mv: MoveDef, amount: number) {
  if (h.over) return;
  const sc = h.scene;
  const cam = sc.cameras.main;
  cam.flash(240, 170, 220, 255, false);
  h.fx.shake(0.01, 2300);
  playSfx('roar');
  const sky = sc.add.rectangle(0, 0, cam.width, cam.height, 0x1a4a6a, 0).setOrigin(0).setScrollFactor(0).setDepth(99989);
  sc.tweens.add({ targets: sky, fillAlpha: 0.3, duration: 400 });
  const totalMs = 2400;
  sc.time.delayedCall(totalMs + 200, () => sc.tweens.add({ targets: sky, fillAlpha: 0, duration: 450, onComplete: () => sky.destroy() }));
  const enemies = h.enemies().filter((e) => e.targetable);
  const cx0 = enemies.length ? enemies.reduce((a, e) => a + e.x, 0) / enemies.length : f.x + f.facing.x * 120;
  const cy0 = enemies.length ? enemies.reduce((a, e) => a + e.y, 0) / enemies.length : f.y;
  const R: number = P.r ?? 78;
  const g = sc.add.graphics().setDepth(99995);
  const t0 = h.clock;
  let nextTick = t0 + 260;
  let cx = f.x;
  let cy = f.y;
  const grabbed = new Set<(typeof enemies)[number]>();
  h.addFrameTask(totalMs, (now) => {
    const k = (now - t0) / totalMs;
    // lốc di chuyển từ người dùng tới tâm đám địch rồi lượn nhẹ quanh đó
    const mv1 = Math.min(1, k * 2.2);
    cx = f.x + (cx0 - f.x) * mv1 + Math.cos(now / 300) * 14 * k;
    cy = f.y + (cy0 - f.y) * mv1 + Math.sin(now / 260) * 8 * k;
    g.clear();
    const appear = Math.min(1, k * 4);
    const fade = k > 0.88 ? (1 - k) / 0.12 : 1;
    // phễu lốc: nhiều tầng elip xoáy, rộng dần lên cao
    const H = 120 * appear;
    for (let i = 0; i < 22; i++) {
      const u = i / 21;
      const y = cy - u * H;
      const rr = (6 + u * R) * appear;
      const a0 = now / 90 + u * 7;
      g.lineStyle(3.2 - u * 1.4, i % 2 ? 0xffffff : 0xbfe6ff, (0.85 - u * 0.35) * fade).strokeEllipse(cx + Math.sin(a0) * 4, y, rr * 2, rr * 0.7);
      // mảnh gió cong chạy quanh thân lốc
      const ang = a0 * 1.3;
      g.fillStyle(0xffffff, 0.8 * fade).fillCircle(cx + Math.cos(ang) * rr, y + Math.sin(ang) * rr * 0.35, 2);
    }
    g.fillStyle(0x6a8aa8, 0.25 * fade).fillEllipse(cx, cy + 2, R * 1.6 * appear, R * 0.5 * appear);
    if (Math.random() < 0.8) h.fx.puff(Math.random() < 0.5 ? 'leafpuff' : 'windpuff', cx + (Math.random() - 0.5) * R * 1.6, cy - Math.random() * H, 1);
    // hút + nhấc + quay các địch trong tầm
    for (const e of enemies) {
      if (e.dead || !e.targetable) continue;
      const dx = cx - e.x;
      const dy = cy - e.y;
      const dd = Math.hypot(dx, dy / 0.7);
      if (dd > R * 1.5 + e.radius && !grabbed.has(e)) continue;
      grabbed.add(e);
      const ang = now / 140 + (e.x % 7);
      (e.body as unknown as { reset: (x: number, y: number) => void }).reset(e.x + dx * 0.08 + Math.cos(ang) * 1.8, e.y + dy * 0.08 + Math.sin(ang) * 1.2);
      e.anim.lift = Math.min(70, (e.anim.lift || 0) + 3) * (k > 0.88 ? (1 - k) / 0.12 : 1);
      e.stunnedUntil = Math.max(e.stunnedUntil, now + 200);
    }
    if (now >= nextTick) {
      nextTick = now + 260;
      for (const e of grabbed) if (!e.dead && e.targetable) h.damageEnemy(e, mv, amount * 0.09, 0, 0, true);
    }
  }, () => {
    g.destroy();
    for (const e of grabbed) {
      e.anim.lift = 0;
      if (e.dead) continue;
      const dx = e.x - cx;
      const dy = e.y - cy;
      const dd = Math.hypot(dx, dy) || 1;
      h.damageEnemy(e, { ...mv, knockback: 320 }, amount * 0.35, dx / dd, dy / dd, true);
    }
    if (h.over) return;
    h.fx.ringBurst(cx, cy, 90, 0xbfe6ff, 0xffffff, 460);
    h.fx.shake(0.018, 300);
    playSfx('boom');
  });
}
