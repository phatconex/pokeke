// Nguyên mẫu riêng của dòng Cỏ: whip (dây leo quất / đập), cloud (bột bào tử), tether (hạt hút máu + dây leo).
// Cơ chế số (sát thương, trạng thái) lấy từ MoveDef như các nguyên mẫu khác; hình ảnh dùng GrassFx (dây leo, bột, nứt đất...).
import Phaser from 'phaser';
import type { MoveDef } from '../data/moveKit';
import type { Enemy } from '../entities/Enemy';
import type { Fighter } from '../entities/Fighter';
import { crackBetween, drawTether, groundCracks, leafBurst, powderCloud, vineAnim, windStreak } from '../fx/GrassFx';
import { playSfx } from '../systems/sfx';
import { dialectFor } from './dialects';
import type { SkillHost } from './host';
import type { CloudParams, TetherParams, WhipParams } from './types';

type Pt = { x: number; y: number };
const lerp = (a: number, b: number, k: number) => a + (b - a) * k;
const easeOut = (k: number) => 1 - (1 - k) * (1 - k);
const easeIn = (k: number) => k * k;
/** củ trên lưng: lệch ngược hướng nhìn, hơi cao hơn ngực */
const bulbOf = (f: Fighter, aim: Phaser.Math.Vector2): Pt => ({ x: f.x + (aim.x >= 0 ? -4 : 4), y: f.chestY - 10 });

// ====================================================================== whip

export function castWhip(h: SkillHost, f: Fighter, m: MoveDef, P: WhipParams, dir: Phaser.Math.Vector2) {
  const sc = h.scene;
  const d = dialectFor(P.dialect, h.fx, m, h);
  const mult = h.stackMult(f, m);
  const aim = dir.clone().normalize();
  const t = h.aimTarget;
  const ms = P.extendMs + P.holdMs + P.retractMs;
  if (P.lungeMult > 0 && m.lunge) {
    const lunge = m.lunge * P.lungeMult;
    const dist = t ? Phaser.Math.Clamp(Math.hypot(t.x - f.x, t.y - f.y) - t.radius - 8, 0, lunge) : lunge;
    f.startLunge(aim, Math.max(8, dist), P.extendMs, h.clock);
  }
  f.playMove(m);
  f.faceTo(aim.x, aim.y);
  playSfx(P.sfx ?? 'vineSnap');
  const base = Math.atan2(aim.y, aim.x);
  const half = Phaser.Math.DegToRad(P.halfAngleDeg);
  const L = P.reach;
  const originOf = (sgn: number) => () => ({ x: f.x + sgn * 4 + (aim.x >= 0 ? -2 : 2), y: f.chestY - 10 });
  // điểm đập: tại mục tiêu nếu trong tầm, ngược lại phía trước
  const tgtIn = t && !t.dead && Math.hypot(t.x - f.x, t.y - f.y) <= L + 36 ? t : null;
  const center = (): Pt => (tgtIn && !tgtIn.dead ? { x: tgtIn.x, y: tgtIn.y } : { x: f.x + aim.x * L * 0.85, y: f.y + aim.y * L * 0.85 * 0.8 });
  const C = center();
  const knock = P.push ?? m.knockback;

  const strike = () => {
    if (h.over || f.dead || !f.onField) return;
    h.fx.shake(P.shake[0], P.shake[1]);
    let any = false;
    const foes = h.enemies().filter((e) => e.targetable);
    if (P.style === 'lash') {
      for (const e of foes) {
        const dx = e.x - f.x;
        const dy = e.centerY - f.chestY;
        const dd = Math.hypot(dx, dy);
        if (dd > L + e.radius) continue;
        if (dd > e.radius + 6 && Math.abs(Phaser.Math.Angle.Wrap(Math.atan2(dy, dx) - base)) > half) continue;
        any = true;
        d.hit(e.x, e.centerY, true);
        const primary = e === tgtIn;
        const sgn = P.pull ? -1 : 1;
        h.damageEnemy(e, { ...m, knockback: knock * (primary ? 1.5 : 1) }, m.power * f.power * mult * (primary ? 1 : 0.7), (dx / (dd || 1)) * sgn, (dy / (dd || 1)) * sgn, primary);
      }
    } else {
      const c = center();
      const R = P.slamR ?? 40;
      d.explosion(c.x, c.y, R * 0.6);
      if (P.crack) {
        if (P.style === 'xslam') {
          for (const sg of [-1, 1]) {
            const a = base + sg * 0.7;
            crackBetween(sc, c.x - Math.cos(a) * R * 1.3, c.y - Math.sin(a) * R, c.x + Math.cos(a) * R * 1.3, c.y + Math.sin(a) * R, 2200);
          }
        } else groundCracks(sc, c.x, c.y, R * 1.1, 5, 1800, base);
      }
      h.fx.dustPuff(c.x, c.y, 6);
      for (const e of foes) {
        const dx = e.x - c.x;
        const dy = (e.y - c.y) / 0.8;
        const dd = Math.hypot(dx, dy);
        if (dd > R + e.radius) continue;
        any = true;
        d.hit(e.x, e.centerY, true);
        h.damageEnemy(e, { ...m, knockback: knock }, m.power * f.power * mult * (P.powerMult ?? 1), dx / (dd || 1), dy / (dd || 1), true);
        if (P.stunMs && !e.isBoss && !e.dead) e.stunnedUntil = Math.max(e.stunnedUntil, h.clock + P.stunMs);
      }
      playSfx('boom');
    }
    if (any && P.stopMs) h.hitStop(P.stopMs);
  };

  const vines = 2;
  for (let v = 0; v < vines; v++) {
    const sgn = v === 0 ? -1 : 1;
    const origin = originOf(sgn);
    const delay = P.style === 'xslam' ? v * 90 : 0;
    const run = () => {
      if (h.over || f.dead || !f.onField) return;
      if (P.style === 'lash') {
        const env = (p: number) => (p < 0.3 ? easeOut(p / 0.3) : p < 0.62 ? 1 : easeIn(Math.max(0, (1 - p) / 0.38)));
        vineAnim(sc, {
          origin, ms, thick: P.thick, wiggle: 3,
          tip: (p) => {
            const o = origin();
            // quét cung: dây trái quét từ trên xuống, dây phải ngược lại
            const sw = Phaser.Math.Clamp((p - 0.1) / 0.5, 0, 1);
            const a = base + sgn * half * (1 - 2 * easeOut(sw)) * 0.95;
            const r = L * env(p);
            if (r > L * 0.6 && p > 0.3 && p < 0.55 && Math.random() < 0.5) windStreak(sc, o.x + Math.cos(a) * r, o.y + Math.sin(a) * r, Math.cos(a), Math.sin(a), 0xc8f890, 12);
            return { x: o.x + Math.cos(a) * r, y: o.y + Math.sin(a) * r };
          },
          bend: (p) => sgn * 9 * env(p),
        });
      } else {
        const gap = P.style === 'xslam' ? 26 * sgn : 9 * sgn;
        const nx = -aim.y;
        const ny = aim.x;
        const I: Pt = { x: C.x + nx * gap, y: C.y + ny * gap * 0.8 };
        vineAnim(sc, {
          origin, ms: ms + delay * 0, thick: P.thick, wiggle: 4,
          tip: (p) => {
            const o = origin();
            if (p < 0.36) {
              // vút lên cao qua đầu, hơi ngả ra sau
              const k = easeOut(p / 0.36);
              return { x: lerp(o.x, o.x - aim.x * 10 + sgn * 16, k), y: lerp(o.y, o.y - 58, k) };
            }
            if (p < 0.5) {
              const k = easeIn((p - 0.36) / 0.14);
              return { x: lerp(o.x - aim.x * 10 + sgn * 16, I.x, k), y: lerp(o.y - 58, I.y, k) };
            }
            if (p < 0.7) return { x: I.x, y: I.y };
            const k = easeOut((p - 0.7) / 0.3);
            return { x: lerp(I.x, o.x, k), y: lerp(I.y, o.y, k) };
          },
          bend: (p) => (p < 0.36 ? -sgn * 20 : p < 0.5 ? sgn * 8 : sgn * 4),
          depth: 100001,
        });
      }
    };
    if (delay) h.schedule(h.clock + delay, run);
    else run();
  }
  // thời điểm trúng: khi dây duỗi hết (lash) hoặc chạm đất (slam)
  const hitAt = P.style === 'lash' ? P.extendMs * 0.85 : ms * 0.5 + (P.style === 'xslam' ? 90 : 0);
  h.schedule(h.clock + hitAt, strike);
}

// ====================================================================== cloud

export function castCloud(h: SkillHost, f: Fighter, m: MoveDef, P: CloudParams, dir: Phaser.Math.Vector2) {
  const sc = h.scene;
  const d = dialectFor(P.dialect, h.fx, m, h);
  const mult = h.stackMult(f, m);
  const aim = dir.clone().normalize();
  f.playMove(m);
  f.faceTo(aim.x, aim.y);
  playSfx('powder');
  const b = bulbOf(f, aim);
  const ang = Math.atan2(aim.y, aim.x);
  const half = Phaser.Math.DegToRad(P.halfDeg);
  // củ rung nhẹ + hạt bay ra
  d.smoke(b.x, b.y, 3);
  powderCloud(sc, b.x, b.y, ang, P.halfDeg, P.range, P.colors, P.lingerMs, P.puffN);
  h.fx.shake(P.shake[0], P.shake[1]);
  const ticks = Math.max(1, Math.round(P.lingerMs / P.tickMs));
  const amount = (m.power * f.power * mult * P.totalPowerMult) / ticks;
  let next = h.clock + 220;
  let idx = 0;
  h.addFrameTask(P.lingerMs + 220, (now) => {
    if (now < next) return;
    next = now + P.tickMs;
    const st = P.statuses[idx % P.statuses.length];
    idx++;
    const mv: MoveDef = { ...m, knockback: 0, status: { kind: st.kind, chance: st.chance, ms: st.ms } };
    for (const e of h.enemies()) {
      if (!e.targetable) continue;
      const dx = e.x - b.x;
      const dy = (e.centerY - b.y) / 0.8;
      const dd = Math.hypot(dx, dy);
      if (dd > P.range + e.radius * 0.6) continue;
      if (dd > e.radius + 10 && Math.abs(Phaser.Math.Angle.Wrap(Math.atan2(dy, dx) - ang)) > half + 0.25) continue;
      d.smoke(e.x, e.centerY, 1);
      h.damageEnemy(e, mv, amount, 0, 0, false, idx > 1);
    }
  });
}

// ====================================================================== tether (Leech Seed)

export function castTether(h: SkillHost, f: Fighter, m: MoveDef, P: TetherParams, dir: Phaser.Math.Vector2) {
  const sc = h.scene;
  const d = dialectFor(P.dialect, h.fx, m, h);
  const mult = h.stackMult(f, m);
  const aim = dir.clone().normalize();
  f.playMove(m);
  f.faceTo(aim.x, aim.y);
  playSfx('seedPop');
  const bulb = () => bulbOf(f, aim);
  const seedMove: MoveDef = { ...m, status: { kind: 'seed', chance: 1, ms: P.drainMs } };
  const amount = m.power * f.power * mult;
  const foes = () => h.enemies().filter((e) => e.targetable);
  let t: Enemy | null = h.aimTarget && !h.aimTarget.dead && Math.hypot(h.aimTarget.x - f.x, h.aimTarget.y - f.y) <= P.range ? h.aimTarget : null;
  if (!t) {
    let best = -1;
    for (const e of foes()) {
      const dx = e.x - f.x;
      const dy = e.y - f.y;
      const dd = Math.hypot(dx, dy);
      if (dd > P.range) continue;
      const sc2 = (dx * aim.x + dy * aim.y) / (dd || 1);
      if (sc2 > best) { best = sc2; t = e; }
    }
  }

  /** hạt bay từ from → vị trí (động) của địch, rồi cắm xuống */
  const fly = (from: Pt, to: () => Pt, ms: number, arrive: () => void) => {
    const im = sc.add.image(from.x, from.y, 'seedO').setScale(1.3).setDepth(99998);
    const a0 = from;
    sc.tweens.addCounter({
      from: 0, to: 1, duration: ms,
      onUpdate: (tw) => {
        const k = tw.getValue() ?? 0;
        const p = to();
        const x = lerp(a0.x, p.x, k);
        const y = lerp(a0.y, p.y, k) - Math.sin(k * Math.PI) * P.arcH;
        im.setPosition(x, y).setRotation(k * 14);
        if (Math.random() < 0.5) windStreak(sc, x, y, p.x - a0.x, p.y - a0.y, 0xb8e870, 7);
      },
      onComplete: () => im.destroy(),
    });
    h.schedule(h.clock + ms, arrive);
  };

  const embed = (e: Enemy, depth: number) => {
    if (h.over || e.dead || !e.targetable) return;
    playSfx('seedPop');
    d.hit(e.x, e.centerY, false);
    h.damageEnemy(e, seedMove, depth ? amount * 0.4 : amount, aim.x * 0.3, aim.y * 0.3, false, depth > 0);
    // mầm nảy lên đầu địch + dây hút máu nối về củ của người dùng
    const spr = sc.add.image(e.x, e.topY + 2, 'sprout').setOrigin(0.5, 1).setScale(0.2).setDepth(99997);
    sc.tweens.add({ targets: spr, scale: 1.5, duration: 260, ease: 'Back.out' });
    const g = sc.add.graphics().setDepth(99996);
    const t0 = h.clock;
    h.addFrameTask(P.drainMs + 200, (now) => {
      g.clear();
      if (e.dead || f.dead || !e.hasStatus('seed', now)) return;
      const a = { x: e.x, y: e.topY + 4 };
      spr.setPosition(e.x, e.topY + 2);
      const pulse = ((now - t0) % P.pulseMs) / P.pulseMs;
      drawTether(g, a, bulb(), now, pulse, 2.4);
      if (Math.floor((now - t0) / P.pulseMs) !== Math.floor((now - t0 - 16) / P.pulseMs)) h.fx.puff('leafpuff', f.x, f.chestY - 6, 2);
    }, () => {
      g.destroy();
      sc.tweens.add({ targets: spr, alpha: 0, scale: 0.3, duration: 200, onComplete: () => spr.destroy() });
    });
    if (depth === 0 && P.spread > 0) {
      h.schedule(h.clock + P.spreadDelayMs, () => {
        if (h.over || e.dead) return;
        const near = foes()
          .filter((o) => o !== e && !o.hasStatus('seed', h.clock) && Math.hypot(o.x - e.x, o.y - e.y) <= P.spreadRange)
          .sort((a, b) => Math.hypot(a.x - e.x, a.y - e.y) - Math.hypot(b.x - e.x, b.y - e.y))
          .slice(0, P.spread);
        for (const o of near) {
          const from = { x: e.x, y: e.topY };
          fly(from, () => ({ x: o.x, y: o.centerY }), Math.round(P.flyMs * 0.7), () => embed(o, 1));
        }
      });
    }
  };

  const b0 = bulb();
  if (t) {
    const tt = t;
    fly(b0, () => ({ x: tt.x, y: tt.centerY }), P.flyMs, () => embed(tt, 0));
  } else {
    const to = { x: f.x + aim.x * 110, y: f.y + aim.y * 90 };
    fly(b0, () => to, P.flyMs, () => {
      const spr = sc.add.image(to.x, to.y, 'sprout').setOrigin(0.5, 1).setScale(0.2).setDepth(to.y + 2000);
      sc.tweens.add({ targets: spr, scale: 1.4, duration: 240, ease: 'Back.out' });
      sc.tweens.add({ targets: spr, alpha: 0, delay: 700, duration: 300, onComplete: () => spr.destroy() });
      leafBurst(sc, to.x, to.y, 16, 4, ['leaf'], 400, 0.8);
    });
  }
}
