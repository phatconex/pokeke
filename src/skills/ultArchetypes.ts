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
