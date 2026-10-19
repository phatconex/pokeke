// Cài đặt các nguyên mẫu chiêu – viết một lần, mọi hệ / loài / bậc dùng chung qua tham số (xem kits.ts).
// Cơ chế số (sát thương, hồi chiêu, trạng thái, tầm, bề rộng, thời gian phun...) lấy từ MoveDef;
// phần trình diễn & cảm giác (màu, kích thước, vệt, vạch ngắm, nhịp, khựng hình, vùng lưu lại...) lấy từ params.
import Phaser from 'phaser';
import type { MoveDef } from '../data/moveKit';
import type { UltimateDef } from '../data/ultimates';
import type { Fighter } from '../entities/Fighter';
import { playSfx } from '../systems/sfx';
import { dialectFor } from './dialects';
import type { SkillHost } from './host';
import type {
  BlastParams, BloomParams, BoltParams, ChainParams, DashStrikeParams, InfernoParams, NovaParams, RainParams, SkillSpec, StreamParams, ThunderstormParams, TsunamiParams, UltSpec,
} from './types';
import type { Enemy } from '../entities/Enemy';
import { bulbCharge, crackBetween, flattenedGrass, groundCracks, leafBurst, windStreak } from '../fx/GrassFx';
import { castCloud, castTether, castWhip } from './grassArchetypes';
import { castTelekinesis, castTimeStop } from './psyArchetypes';
import { castBarrier, castBoomerang, castMindBreak, castSingularity } from './legendArchetypes';
import { castCounter, castCross, castKoMode, castSlam, castStrike } from './fightArchetypes';
import * as TA from './typeArchetypes';
import { castAbsoluteZero, castBlizzard, castGale, castLance } from './iceArchetypes';

/** Ra chiêu theo nguyên mẫu đã phân giải (spec.archetype khác null) */
export function castArchetype(h: SkillHost, f: Fighter, m: MoveDef, spec: SkillSpec, dir: Phaser.Math.Vector2) {
  switch (spec.archetype) {
    case 'bolt': return castBolt(h, f, m, spec.params, dir);
    case 'dashStrike': return castDashStrike(h, f, m, spec.params, dir);
    case 'stream': return castStream(h, f, m, spec.params, dir);
    case 'blast': return castBlast(h, f, m, spec.params);
    case 'nova': return castNova(h, f, m, spec.params);
    case 'chain': return castChain(h, f, m, spec.params, dir);
    case 'rain': return castRain(h, f, m, spec.params);
    case 'whip': return castWhip(h, f, m, spec.params, dir);
    case 'cloud': return castCloud(h, f, m, spec.params, dir);
    case 'tether': return castTether(h, f, m, spec.params, dir);
    case 'telekinesis': return castTelekinesis(h, f, m, spec.params);
    case 'blizzard': return castBlizzard(h, f, m, spec.params);
    case 'lance': return castLance(h, f, m, spec.params, dir);
    case 'gale': return castGale(h, f, m, spec.params, dir);
    case 'strike': return castStrike(h, f, m, spec.params, dir);
    case 'counter': return castCounter(h, f, m, spec.params);
    case 'slam': return castSlam(h, f, m, spec.params, dir);
    case 'cross': return castCross(h, f, m, spec.params);
    case 'boomerang': return castBoomerang(h, f, m, spec.params, dir);
    case 'barrier': return castBarrier(h, f, m, spec.params);
    case 'singularity': return castSingularity(h, f, m, spec.params);
    case 'fan': return TA.castFan(h, f, m, spec.params, dir);
    case 'sweep': return TA.castSweep(h, f, m, spec.params, dir);
    case 'serpent': return TA.castSerpent(h, f, m, spec.params, dir);
    case 'dive': return TA.castDive(h, f, m, spec.params);
    case 'lob': return TA.castLob(h, f, m, spec.params);
    case 'roll': return TA.castRoll(h, f, m, spec.params, dir);
    case 'fallers': return TA.castFallers(h, f, m, spec.params);
    case 'ridge': return TA.castRidge(h, f, m, spec.params, dir);
    case 'quicksand': return TA.castQuicksand(h, f, m, spec.params);
    case 'ambush': return TA.castAmbush(h, f, m, spec.params);
    case 'twister': return TA.castTwister(h, f, m, spec.params, dir);
    case 'web': return TA.castWeb(h, f, m, spec.params);
    case 'swarm': return TA.castSwarm(h, f, m, spec.params, dir);
    case 'triattack': return TA.castTriAttack(h, f, m, spec.params);
    case 'beam': return TA.castBeam(h, f, m, spec.params, dir);
    default: return undefined;
  }
}

/** Tuyệt chiêu theo nguyên mẫu (gọi sau thời gian gồng params.windupMs) */
export function castUltArchetype(h: SkillHost, f: Fighter, spec: UltSpec, u: UltimateDef, mv: MoveDef, amount: number) {
  if (spec.archetype === 'inferno') castInferno(h, f, spec.params, u, mv, amount);
  else if (spec.archetype === 'tsunami') castTsunami(h, f, spec.params, u, mv, amount);
  else if (spec.archetype === 'thunderstorm') castThunderstorm(h, f, spec.params, u, mv, amount);
  else if (spec.archetype === 'bloom') castBloom(h, f, spec.params, u, mv, amount);
  else if (spec.archetype === 'timestop') castTimeStop(h, f, spec.params, u, mv, amount);
  else if (spec.archetype === 'absolutezero') castAbsoluteZero(h, f, spec.params, u, mv, amount);
  else if (spec.archetype === 'komode') castKoMode(h, f, spec.params, u, mv, amount);
  else if (spec.archetype === 'mindbreak') castMindBreak(h, f, spec.params, u, mv, amount);
  else if (spec.archetype === 'draco') TA.castDraco(h, f, spec.params, u, mv, amount);
  else if (spec.archetype === 'flock') TA.castFlock(h, f, spec.params, u, mv, amount);
  else if (spec.archetype === 'wavefront') TA.castWavefront(h, f, spec.params, u, mv, amount);
  else if (spec.archetype === 'chasm') TA.castChasm(h, f, spec.params, u, mv, amount);
  else if (spec.archetype === 'hyperbeam') TA.castHyperBeamUlt(h, f, spec.params, u, mv, amount);
}

/** Vạch chấm từ (x1, y1) tới (x2, y2) – vạch ngắm */
export function dottedLine(g: Phaser.GameObjects.Graphics, x1: number, y1: number, x2: number, y2: number, color: number, alpha: number, phase = 0) {
  const len = Math.hypot(x2 - x1, y2 - y1);
  if (len < 1) return;
  const ux = (x2 - x1) / len;
  const uy = (y2 - y1) / len;
  g.fillStyle(color, alpha);
  for (let d = (phase % 7); d < len; d += 7) g.fillRect(x1 + ux * d - 1, y1 + uy * d - 1, 2.5, 2.5);
}

/** đa giác sao nhiều cánh (đỉnh ngoài R, đỉnh trong 0,42R), dẹt theo phối cảnh */
function starPoints(cx: number, cy: number, R: number, points: number, rot = 0) {
  const pts: Phaser.Math.Vector2[] = [];
  for (let i = 0; i < points * 2; i++) {
    const a = -Math.PI / 2 + rot + (i / (points * 2)) * Math.PI * 2;
    const rr = i % 2 === 0 ? R : R * 0.42;
    pts.push(new Phaser.Math.Vector2(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr * 0.8));
  }
  return pts;
}

// ====================================================================== bolt: đạn có vệt + nổ nhỏ, bậc: to / tách

function castBolt(h: SkillHost, f: Fighter, m: MoveDef, P: BoltParams, dir: Phaser.Math.Vector2) {
  f.playMove(m);
  const d = dialectFor(P.dialect, h.fx, m, h);
  if (P.split > 1) m = { ...m, count: Math.max(P.split, m.count ?? 1), spreadDeg: P.splitSpreadDeg, power: m.power * P.splitPowerMult };
  if (P.chain !== undefined) m = { ...m, chain: P.chain };
  if (P.powerMult) m = { ...m, power: m.power * P.powerMult };
  const n = m.count ?? 1;
  const base = Math.atan2(dir.y, dir.x);
  const spread = Phaser.Math.DegToRad(m.spreadDeg ?? 0);
  const speed = (m.speed ?? 340) * (P.speedMult ?? 1);
  const trailN = P.trail === 'thick' ? 2 : P.trail === 'thin' ? 1 : 0;
  const B = P.burst;
  const volley = (k: number) => {
    // viên thứ k của loạt: lệch ngang xen kẽ, sát thương riêng
    const side = B && B.n > 1 ? (k % 2 ? 1 : -1) * B.side : 0;
    const mk = B && B.n > 1 ? { ...m, power: m.power * B.powerMult } : m;
    for (let i = 0; i < n; i++) {
      const a = base + (i - (n - 1) / 2) * spread;
      const vx = Math.cos(a);
      const vy = Math.sin(a);
      const ox = f.x + vx * 9 - vy * side;
      const oy = f.chestY + vy * 5 + vx * side;
      const shot = h.spawnShot(m.texture ?? 'fireball', ox, oy, vx * speed, vy * speed, m.radius ?? 4, mk.power * f.power, (m.lifeMs ?? 700) * (P.lifeMult ?? 1), m.spin ?? 0);
      shot.type = m.type;
      shot.knockback = m.knockback;
      shot.puff = m.particle ?? 'flamepuff';
      shot.move = mk;
      shot.sprite.setScale(P.scale !== 1 ? P.scale : (m.radius ?? 4) >= 7 ? 1.5 : 1);
      if (P.texPick) shot.sprite.setTexture(P.texPick[(i + k) % P.texPick.length]);
      let wf = 0;
      if (P.hitRadius) shot.radius = P.hitRadius;
      let last = { x: shot.x, y: shot.y };
      let zz = 0;
      let lastAge = 0;
      const curveSign = (i + k) % 2 ? -1 : 1;
      const onFly = (s: typeof shot) => {
        if (P.curve) {
          // lượn sóng: xoay hướng bay theo đạo hàm của amp·sin(freq·t), xen kẽ ngược pha giữa các viên
          const tt = s.age / 1000;
          const dth = P.curve.amp * P.curve.freq * Math.cos(P.curve.freq * tt) * ((s.age - lastAge) / 1000) * curveSign;
          lastAge = s.age;
          const c = Math.cos(dth);
          const sn = Math.sin(dth);
          const nvx = s.vx * c - s.vy * sn;
          s.vy = s.vx * sn + s.vy * c;
          s.vx = nvx;
        }
        if (P.windTrail && wf++ % 2 === 0) windStreak(h.scene, s.x, s.y, s.vx, s.vy, i % 2 ? 0xc8f890 : 0x8ad860, 10 + 6 * (P.scale || 1));
        if (trailN) d.trail(s.x - s.vx * 0.012, s.y - s.vy * 0.012, trailN);
        if (Math.random() < P.trailPuffChance) d.puff(s.x, s.y, 1);
        if (P.foamChance && Math.random() < P.foamChance) d.smoke(s.x, s.y, 1);
        // vệt gấp khúc: nối các đoạn ngắn (mỗi ~3 khung) bằng tia điện mờ nhanh
        if (P.zigzag != null && zz++ % 3 === 0) {
          const zw = P.zigWidth ?? 1.6;
          h.fx.jagged(last.x, last.y, s.x, s.y, P.zigzag, 0xffffff, zw, 4, 160);
          if (P.zigDouble) h.fx.jagged(last.x - s.vy * 0.01, last.y + s.vx * 0.01, s.x + s.vy * 0.01, s.y - s.vx * 0.01, P.zigzag, 0xfff6b0, zw * 0.7, 6, 200);
          last = { x: s.x, y: s.y };
        }
      };
      shot.onFly = onFly;
      shot.onHitFx = (s) => {
        d.hit(s.x, s.y, s.sprite.scale > 1.2);
        if (P.lingerOnHit) d.scorch(s.x, s.y, P.lingerOnHit.r, P.lingerOnHit.ms);
        const S = P.splash;
        if (!S) return;
        d.explosion(s.x, s.y, S.r);
        h.fx.shake(S.shake[0], S.shake[1]);
        let any = false;
        for (const e of h.enemies()) {
          if (!e.targetable) continue;
          const dx = e.x - s.x;
          const dy = e.centerY - s.y;
          const dd = Math.hypot(dx, dy);
          // địch đang bị đạn trúng trực tiếp đã nhận sát thương chính
          if (dd > S.r + e.radius || dd < e.radius + s.radius + 3) continue;
          any = true;
          h.damageEnemy(e, mk, mk.power * f.power * S.power, dx / (dd || 1), dy / (dd || 1), true);
        }
        if (S.stopMs && any) h.hitStop(S.stopMs);
      };
    }
    const mx = f.x + Math.cos(base) * 9 - Math.sin(base) * side;
    const my = f.chestY + Math.sin(base) * 5 + Math.cos(base) * side;
    if (P.muzzle) {
      h.fx.muzzleFlash(mx + Math.cos(base) * 4, my + Math.sin(base) * 3, base, P.muzzle.color, P.muzzle.size);
      if (P.muzzle.shake) h.fx.shake(P.muzzle.shake[0], P.muzzle.shake[1]);
    }
    if (P.fireSfx) playSfx(P.fireSfx);
    h.fx.puff(m.particle ?? 'flamepuff', mx, my, 2);
  };
  if (P.cyclone) {
    // lốc lá: lá xoay quanh người rồi bay ra theo hướng ngắm
    const C = P.cyclone;
    const imgs = Array.from({ length: 9 }, (_, q) => h.scene.add.image(f.x, f.chestY, q % 2 ? 'leafB' : 'leafA').setScale(0.9));
    const t0 = h.clock;
    h.addFrameTask(C.ms, (now) => {
      const p = Math.min(1, (now - t0) / C.ms);
      imgs.forEach((im, q) => {
        const a = (now - t0) / 70 + (q / imgs.length) * Math.PI * 2;
        const rr = C.r * (0.5 + 0.5 * Math.sin(p * Math.PI * 0.5 + 0.2));
        im.setPosition(f.x + Math.cos(a) * rr, f.chestY - 4 + Math.sin(a) * rr * 0.55 - q * 0.8).setRotation(a + Math.PI / 2).setDepth(f.y + 2100 + Math.sin(a) * 4);
      });
    }, () => imgs.forEach((im) => im.destroy()));
    playSfx('leafHi');
    h.schedule(h.clock + C.ms, () => {
      if (h.over || f.dead || !f.onField) return;
      volley(0);
    });
    return;
  }
  volley(0);
  for (let k = 1; B && k < B.n; k++) {
    h.schedule(h.clock + k * B.gapMs, () => {
      if (h.over || f.dead || !f.onField) return;
      volley(k);
    });
  }
}

// ====================================================================== dashStrike: lao vút + vệt vuốt

function castDashStrike(h: SkillHost, f: Fighter, m: MoveDef, P: DashStrikeParams, dir: Phaser.Math.Vector2) {
  const d = dialectFor(P.dialect, h.fx, m, h);
  const mult = h.stackMult(f, m);
  const aim = dir.clone();
  const lunge = (m.lunge ?? 60) * (P.lungeMult ?? 1);
  const t = h.aimTarget;
  const dist = t ? Phaser.Math.Clamp(Math.hypot(t.x - f.x, t.y - f.y) - t.radius - 8, 0, lunge) : lunge;
  const ms = P.dashMs;
  f.startLunge(dir, Math.max(8, dist), ms, h.clock);
  f.playMove(m);
  h.fx.dustPuff(f.x, f.feetY, 5);
  if (P.startSfx) playSfx(P.startSfx);
  const from = { x: f.x, y: f.chestY };
  f.invulnUntil = Math.max(f.invulnUntil, h.clock + ms + P.iframeExtraMs);
  if (P.trailCount) h.addFrameTask(ms, () => d.trail(f.x - aim.x * 6, f.chestY - aim.y * 4, P.trailCount));
  if (P.afterimages) {
    // bóng mờ dọc đường lao (Tấn Công Nhanh): bản sao khung hình hiện tại, tô màu, mờ dần
    const spr = f.anim.sprite;
    for (let i = 0; i < P.afterimages; i++) {
      h.schedule(h.clock + (ms * i) / P.afterimages, () => {
        if (f.dead || !f.onField) return;
        const ghost = h.scene.add.image(spr.x, spr.y, spr.texture.key, spr.frame.name)
          .setOrigin(spr.originX, spr.originY).setScale(spr.scaleX, spr.scaleY).setFlipX(spr.flipX)
          .setTint(P.afterimageTint ?? 0xffffff).setAlpha(0.65).setDepth(spr.depth - 1).setBlendMode(Phaser.BlendModes.ADD);
        h.scene.tweens.add({ targets: ghost, alpha: 0, duration: P.afterimageMs ?? 260, onComplete: () => ghost.destroy() });
        d.trail(f.x, f.chestY, 2);
      });
    }
  }
  h.schedule(h.clock + ms, () => {
    if (h.over || f.dead || !f.onField || f.isBurrowed(h.clock)) return;
    f.faceTo(aim.x, aim.y);
    if (P.streaks) d.streaks(from.x, from.y, f.x, f.chestY);
    h.fx.shake(P.impactShake[0], P.impactShake[1]);
    if (P.impactSfx) playSfx(P.impactSfx);
    const ex = f.x;
    const ey = f.chestY;
    if (P.arc) {
      const a = Math.atan2(aim.y, aim.x);
      h.fx.foamArc(ex, ey, P.arc.r, a - Math.PI * 0.95, a + Math.PI * 0.55, P.arc.color, P.arc.core);
      d.streaks(from.x, from.y, ex, ey);
    }
    if (P.bubbleRing) {
      for (let i = 0; i < P.bubbleRing.n; i++) {
        const a = (i / P.bubbleRing.n) * Math.PI * 2;
        d.puff(ex + Math.cos(a) * P.bubbleRing.r, ey + Math.sin(a) * P.bubbleRing.r * 0.8, 1);
      }
    }
    const W = P.shockwave;
    if (W) {
      h.fx.ringBurst(f.x, f.feetY, W.r, W.color, W.color2);
      d.explosion(f.x, f.feetY, W.r * 0.7);
      d.pillar(f.x + aim.x * 14, f.feetY + aim.y * 8, 3.5);
      let any = false;
      for (const e of h.enemies()) {
        if (!e.targetable) continue;
        const dx = e.x - f.x;
        const dy = (e.y - f.y) / 0.75;
        const dd = Math.hypot(dx, dy);
        if (dd > W.r + e.radius) continue;
        any = true;
        h.damageEnemy(e, { ...m, knockback: W.push }, m.power * f.power * mult * W.power, dx / (dd || 1), dy / (dd || 1), true);
      }
      if (any && W.stopMs) h.hitStop(W.stopMs);
    }
    if (P.arc2) {
      const a = Math.atan2(aim.y, aim.x);
      h.fx.foamArc(ex, ey, P.arc2.r, a - Math.PI * 0.55, a + Math.PI * 0.95, P.arc2.color, P.arc2.core);
    }
    if (P.scratch) {
      const S = P.scratch;
      h.fx.scratchMarks(ex + aim.x * 14, ey + aim.y * 10, Math.atan2(aim.y, aim.x), S.n, S.len, S.color, S.core);
    }
    if (P.vine) h.fx.vineArc(from.x, from.y, ex, ey, P.vine.h, P.vine.color, P.vine.core);
    if (P.roots) {
      // rễ gai trồi thành hàng dọc hướng đánh, rễ nào chạm địch thì gây thêm sát thương một lần
      const R = P.roots;
      const done = new Set<Enemy>();
      for (let i = 0; i < R.n; i++) {
        const rx = ex + aim.x * R.step * (i + 1);
        const ry = f.feetY + aim.y * R.step * (i + 1) * 0.7;
        h.schedule(h.clock + i * R.delayMs, () => {
          if (h.over) return;
          d.pillar(Phaser.Math.Clamp(rx, 10, h.worldW - 10), Phaser.Math.Clamp(ry, 10, h.worldH - 10), R.h + i * 0.3);
          h.fx.shake(0.006, 90);
          for (const e of h.enemies()) {
            if (!e.targetable || done.has(e)) continue;
            if (Math.hypot(e.x - rx, (e.y - ry) / 0.75) > 22 + e.radius) continue;
            done.add(e);
            d.hit(e.x, e.centerY, true);
            h.damageEnemy(e, { ...m, knockback: 220 }, m.power * f.power * mult * 0.55, aim.x, aim.y, true);
          }
        });
      }
    }
    h.meleeSequence(f, m, aim, mult);
  });
}

// ====================================================================== stream: vạch ngắm → dòng phun dày xuyên thẳng

function castStream(h: SkillHost, f: Fighter, m: MoveDef, P: StreamParams, dir: Phaser.Math.Vector2) {
  const sc = h.scene;
  const d = dialectFor(P.dialect, h.fx, m, h);
  const tele = P.telegraphMs;
  const dur = (m.sprayMs ?? 600) * (P.durMult ?? 1);
  const len = (m.line ?? 150) * (P.lenMult ?? 1);
  const w = (m.lineWidth ?? 20) * (P.widthMult ?? 1);
  const beams = Math.max(1, P.beams ?? 1);
  /** độ lệch ngang của từng dòng (pháo đôi) */
  const offs = Array.from({ length: beams }, (_, i) => (i - (beams - 1) / 2) * (P.beamGap ?? 0));
  const aim = dir.clone().normalize();
  const mult = h.stackMult(f, m);
  const ticks = Math.max(1, Math.round(dur / P.tickMs));
  // tổng sát thương ≈ power × totalPowerMult chia đều các nhịp; trạng thái chia theo nhịp để tổng tỉ lệ ≈ như cũ
  const tickMove: MoveDef = { ...m, knockback: P.tickKnockback, status: m.status && { ...m.status, chance: 1 - Math.pow(1 - m.status.chance, 1 / ticks) } };
  const tickAmount = (m.power * f.power * mult * P.totalPowerMult) / ticks;
  f.faceTo(aim.x, aim.y);
  f.sprayUntil = h.clock + tele + dur;
  f.sprayMove = m;
  f.anim.playOnce('charge', tele);
  const g = sc.add.graphics().setDepth(99989);
  const core = sc.add.graphics().setDepth(99997);
  const mouth = () => ({ x: f.x + aim.x * 10, y: f.chestY + aim.y * 6 });
  const track = (dtMs: number, maxTurn: number) => {
    const t = h.aimTarget;
    if (!t || t.dead) return;
    const m0 = mouth();
    const want = Math.atan2(t.centerY - m0.y, t.x - m0.x);
    const cur = Math.atan2(aim.y, aim.x);
    const a = cur + Phaser.Math.Clamp(Phaser.Math.Angle.Wrap(want - cur), -maxTurn * dtMs / 1000, maxTurn * dtMs / 1000);
    aim.set(Math.cos(a), Math.sin(a));
    f.faceTo(aim.x, aim.y);
  };
  const t0 = h.clock;
  // 1) vạch ngắm
  const bulbPos = () => ({ x: f.x + (aim.x >= 0 ? -5 : 5), y: f.chestY - 10 });
  const stopBulb = P.bulb ? bulbCharge(sc, bulbPos, tele, P.bulb.r, P.bulb.rate, P.bulb.color, P.bulb.color2) : null;
  const orb = P.gather && !P.bulb ? sc.add.image(0, 0, 'softglow').setTint(P.gather.color).setBlendMode(Phaser.BlendModes.ADD).setDepth(99996).setScale(0.3) : null;
  const orb2 = P.gather && !P.bulb ? sc.add.image(0, 0, 'softglow').setTint(0xffffff).setBlendMode(Phaser.BlendModes.ADD).setDepth(99997).setScale(0.2) : null;
  h.addFrameTask(tele, (now, dt) => {
    if (f.dead || !f.onField) return;
    track(dt, P.telegraphTurn);
    if (P.gather && orb && orb2) {
      const pg = (now - t0) / tele;
      const m1 = mouth();
      for (let i = 0; i < P.gather.n; i++) if (Math.random() < 0.55) h.fx.converge(m1.x, m1.y, P.gather.r * (1.1 - 0.5 * pg), P.gather.color, 300);
      orb.setPosition(m1.x, m1.y).setScale(0.4 + pg * 2.2 + Math.sin(now / 40) * 0.12).setAlpha(0.5 + 0.4 * pg);
      orb2.setPosition(m1.x, m1.y).setScale(0.2 + pg * 1.1);
    }
    const p = (now - t0) / tele;
    const m0 = mouth();
    g.clear();
    for (const off of offs) {
      const o = { x: m0.x - aim.y * off, y: m0.y + aim.x * off };
      dottedLine(g, o.x, o.y, o.x + aim.x * len, o.y + aim.y * len, P.telegraphColor, 0.5 + 0.5 * p, now / 30);
      if (!P.bulb) g.lineStyle(1, P.telegraphRing, 0.25 + 0.3 * p).strokeCircle(o.x + aim.x * len, o.y + aim.y * len, 3 + 3 * p);
      d.trail(o.x, o.y, 1);
    }
  }, () => {
    g.clear();
    orb?.destroy();
    orb2?.destroy();
    stopBulb?.();
  });
  // 2) dòng phun
  let nextTick = t0 + tele;
  let frame = 0;
  h.schedule(t0 + tele, () => {
    if (h.over || f.dead || !f.onField) {
      g.destroy();
      core.destroy();
      return;
    }
    playSfx(m.sfx);
    const shk = P.shake ?? [0.003, dur];
    h.fx.shake(shk[0], shk[1] || dur);
    const ang0 = Math.atan2(aim.y, aim.x);
    const ts = h.clock;
    if (P.scar) flattenedGrass(sc, mouth().x, mouth().y + 4, ang0, len, w * 0.9, P.scar);
    if (P.muzzle) {
      for (const off of offs) {
        const m1 = mouth();
        h.fx.muzzleFlash(m1.x - aim.y * off + aim.x * 4, m1.y + aim.x * off + aim.y * 3, ang0, P.muzzle.color, P.muzzle.size);
      }
    }
    h.addFrameTask(dur, (now, dt) => {
      if (f.dead || !f.onField || f.isBurrowed(now)) return;
      track(dt, P.turnRate);
      if (P.sweep) {
        const a = ang0 + P.sweep.amp * Math.sin((P.sweep.phase ?? 0) + ((now - ts) / dur) * Math.PI * 2 * P.sweep.cycles);
        aim.set(Math.cos(a), Math.sin(a));
        f.faceTo(aim.x, aim.y);
      }
      f.sprayUntil = Math.max(f.sprayUntil, now + 40);
      const m0 = mouth();
      const ang = Math.atan2(aim.y, aim.x);
      const nx = -aim.y;
      const ny = aim.x;
      core.clear();
      for (const off of offs) {
        const o = { x: m0.x + nx * off, y: m0.y + ny * off };
        const flick = 0.85 + Math.random() * 0.3;
        // lõi: các hình nêm thuôn từ miệng ra, nhiều lớp màu (ngoài → trong)
        if (P.ringBeam) {
          // tia vòng: các vòng elip nối đuôi nhau chạy ra xa, to dần, đổi màu
          const RB = P.ringBeam;
          for (let i = 0; i < RB.n; i++) {
            const tt = (i / RB.n + (now * RB.spin) / 1000) % 1;
            const px = o.x + aim.x * len * tt;
            const py = o.y + aim.y * len * tt;
            const rw = (w / 2) * (0.35 + 0.65 * tt) * flick;
            const rh = rw * 0.42;
            const pts: Phaser.Math.Vector2[] = [];
            for (let q = 0; q < 20; q++) {
              const ang = (q / 20) * Math.PI * 2;
              const lx = Math.cos(ang) * rh;
              const ly = Math.sin(ang) * rw;
              pts.push(new Phaser.Math.Vector2(px + aim.x * lx + nx * ly, py + aim.y * lx + ny * ly));
            }
            core.lineStyle(2.5, RB.colors[(i + Math.floor(now / 90)) % RB.colors.length], 0.95 - tt * 0.35).strokePoints(pts, true);
          }
          core.lineStyle(2, 0xffe0f8, 0.7).lineBetween(o.x, o.y, o.x + aim.x * len * 0.95, o.y + aim.y * len * 0.95);
        } else if (P.helix) {
          // tia xoắn gen: hai sợi sin quấn nhau (lệch pha π) + nấc ngang, lõi trắng mờ
          const H = P.helix;
          core.lineStyle(10 * (w / 40 + 0.6), 0xffffff, 0.22).lineBetween(o.x, o.y, o.x + aim.x * len * 0.95, o.y + aim.y * len * 0.95);
          const strands: Phaser.Math.Vector2[][] = [[], []];
          for (let sIdx = 0; sIdx <= 34; sIdx++) {
            const tt = sIdx / 34;
            const amp = H.amp * (0.4 + 0.6 * Math.min(1, tt * 3));
            for (let k = 0; k < 2; k++) {
              const lat = Math.sin(tt * H.wave + k * Math.PI + now / 120) * amp;
              strands[k].push(new Phaser.Math.Vector2(o.x + aim.x * len * tt * 0.95 + nx * lat, o.y + aim.y * len * tt * 0.95 + ny * lat));
            }
          }
          for (let k = 0; k < 2; k++) core.lineStyle(5, H.colors[k], 0.95).strokePoints(strands[k], false);
          core.lineStyle(2, 0xffffff, 0.8);
          for (let sIdx = 1; sIdx < 34; sIdx += 3) core.lineBetween(strands[0][sIdx].x, strands[0][sIdx].y, strands[1][sIdx].x, strands[1][sIdx].y);
        } else
        for (const L of P.layers) {
          const l = len * L.len * flick;
          const w0 = L.w0;
          const w1 = (w / 2) * L.w1 * flick;
          const ex = o.x + aim.x * l;
          const ey = o.y + aim.y * l;
          core.fillStyle(L.color, L.alpha);
          core.fillPoints([
            new Phaser.Math.Vector2(o.x + nx * w0, o.y + ny * w0),
            new Phaser.Math.Vector2(ex + nx * w1, ey + ny * w1),
            new Phaser.Math.Vector2(ex + aim.x * w1 * 0.8, ey + aim.y * w1 * 0.8),
            new Phaser.Math.Vector2(ex - nx * w1, ey - ny * w1),
            new Phaser.Math.Vector2(o.x - nx * w0, o.y - ny * w0),
          ], true);
        }
        // hạt dày đặc dọc dòng + khói ở đuôi
        d.spray(o.x, o.y, Phaser.Math.RadToDeg(ang), Math.max(2, Math.round((dt / 4 / Math.sqrt(beams)) * (P.sprayMult ?? 1))));
        if (frame % 3 === 0) d.smoke(o.x + aim.x * len * (0.85 + Math.random() * 0.2) + nx * (Math.random() - 0.5) * w, o.y + aim.y * len * 0.9 + ny * (Math.random() - 0.5) * w, 1);
        if (frame % 2 === 0) d.puff(o.x + aim.x * len * Math.random(), o.y + aim.y * len * Math.random(), 1);
        if (P.foamAlong && Math.random() < P.foamAlong) d.smoke(o.x + aim.x * len * Math.random() + nx * (Math.random() - 0.5) * w, o.y + aim.y * len * Math.random() + ny * (Math.random() - 0.5) * w, 1);
      }
      frame++;
      if (now < nextTick) return;
      nextTick = now + P.tickMs;
      h.fx.shake(P.shake ? P.shake[0] * 0.8 : 0.0025, 90);
      for (const e of h.enemies()) {
        if (!e.targetable) continue;
        const rx = e.x - m0.x;
        const ry = e.centerY - m0.y;
        const along = rx * aim.x + ry * aim.y;
        const sideC = rx * nx + ry * ny;
        if (along < -e.radius || along > len + e.radius || !offs.some((off) => Math.abs(sideC - off) <= w / 2 + e.radius)) continue;
        d.hit(e.x, e.centerY, false);
        h.damageEnemy(e, tickMove, tickAmount, P.pull ? -aim.x : aim.x, P.pull ? -aim.y : aim.y);
      }
    }, () => {
      g.destroy();
      sc.tweens.add({ targets: core, alpha: 0, duration: 120, onComplete: () => core.destroy() });
    });
  });
}

// ====================================================================== blast: khóa mục tiêu → cầu bay → nổ lớn + vùng lưu lại

function castBlast(h: SkillHost, f: Fighter, m: MoveDef, P: BlastParams) {
  const sc = h.scene;
  const d = dialectFor(P.dialect, h.fx, m, h);
  const tele = P.telegraphMs;
  const r = m.burstRadius ?? 48;
  const mult = h.stackMult(f, m);
  f.anim.playOnce('charge', tele);
  f.sprayUntil = h.clock + tele;
  // đứng tấn khi ngắm (line: không phun hạt hình quạt trong updateSpray)
  f.sprayMove = { ...m, moveSlow: 0.3, line: 1 };
  const fallback = { x: f.x + f.facing.x * 120, y: f.y + f.facing.y * 120 };
  const target = () => {
    const t = h.aimTarget;
    const p = t && !t.dead ? { x: t.x, y: t.y } : fallback;
    return { x: Phaser.Math.Clamp(p.x, 16, h.worldW - 16), y: Phaser.Math.Clamp(p.y, 16, h.worldH - 16) };
  };
  const g = sc.add.graphics().setDepth(-2890);
  const t0 = h.clock;
  h.addFrameTask(tele, (now) => {
    const p = (now - t0) / tele;
    const c = target();
    f.faceTo(c.x - f.x, c.y - f.y);
    g.clear();
    dottedLine(g, f.x, f.chestY, c.x, c.y, P.telegraphLine, 0.55 + 0.45 * p, now / 30);
    g.fillStyle(P.telegraphFill, 0.12 + 0.12 * p).fillCircle(c.x, c.y, r);
    g.fillStyle(P.telegraphFill2, 0.3).fillCircle(c.x, c.y, r * p);
    const blink = 0.6 + 0.4 * Math.sin(now / 40);
    if (P.star) {
      const sp = starPoints(c.x, c.y, r * 1.25, P.star.points, now / 600);
      g.fillStyle(P.star.color, 0.1 + 0.16 * p).fillPoints(sp, true);
      g.lineStyle(2, P.telegraphStroke, blink).strokePoints(sp, true);
    } else g.lineStyle(2, P.telegraphStroke, blink).strokeCircle(c.x, c.y, r);
    g.lineStyle(1, 0xffffff, 0.7).lineBetween(c.x - 6, c.y, c.x + 6, c.y).lineBetween(c.x, c.y - 6, c.x, c.y + 6);
    d.trail(f.x + f.facing.x * 8, f.chestY - 6, 1);
  }, () => g.destroy());
  h.schedule(t0 + tele, () => {
    if (h.over || f.dead || !f.onField) return;
    const c = target();
    f.playMove(m);
    playSfx(m.sfx);
    const sx = f.x + f.facing.x * 10;
    const sy = f.chestY + f.facing.y * 6;
    const dist = Math.hypot(c.x - sx, c.y - sy);
    const fly = Math.max(140, (dist / P.speed) * 1000);
    const ball = sc.add.image(sx, sy, P.ballTexture).setScale(P.ballScale).setDepth(99995);
    const halo = sc.add.image(sx, sy, 'softglow').setScale(P.haloScale).setTint(P.haloTint).setDepth(99994);
    const start = h.clock;
    h.addFrameTask(fly, (now) => {
      const k = (now - start) / fly;
      const x = sx + (c.x - sx) * k;
      const y = sy + (c.y - sy) * k - Math.sin(Math.PI * k) * Math.min(P.arcHeight, dist * 0.18);
      ball.setPosition(x, y).setRotation(ball.rotation + (P.spin ?? 0.4));
      halo.setPosition(x, y).setScale(P.haloScale - 0.2 + Math.random() * 0.6);
      d.trail(x, y, 3);
      if (Math.random() < 0.4) d.smoke(x, y, 1);
    }, () => {
      ball.destroy();
      halo.destroy();
      if (h.over) return;
      blastExplode(h, m, P, c.x, c.y, r, m.power * f.power * mult);
    });
  });
}

function blastExplode(h: SkillHost, m: MoveDef, P: BlastParams, x: number, y: number, r: number, amount: number) {
  const d = dialectFor(P.dialect, h.fx, m, h);
  const L = P.linger;
  d.explosion(x, y, r);
  d.scorch(x, y, r * 0.85, (L?.ms ?? 0) + 1200);
  const shk = P.shake ?? [0.012, 320];
  h.fx.shake(shk[0], shk[1]);
  playSfx('boom');
  if (P.star) {
    h.fx.starBurst(x, y, r * 1.3, P.star.points, P.star.color, P.star.core);
    d.explosion(x, y - 4, r * 0.7);
  }
  if (P.shockwave) {
    h.fx.ringBurst(x, y, r * 1.7, P.shockwave.color, P.shockwave.color2, 460);
    h.schedule(h.clock + 120, () => h.fx.ringBurst(x, y, r * 1.2, P.shockwave!.color2, P.shockwave!.color, 380));
  }
  if (P.debris) h.fx.debrisBurst(x, y, P.debris);
  if (P.spikes) {
    for (let i = 0; i < P.spikes.n; i++) {
      const a = (i / P.spikes.n) * Math.PI * 2 + 0.4;
      h.schedule(h.clock + 40 + i * 25, () => d.pillar(Phaser.Math.Clamp(x + Math.cos(a) * r * P.spikes!.r, 10, h.worldW - 10), Phaser.Math.Clamp(y + Math.sin(a) * r * P.spikes!.r * 0.8, 10, h.worldH - 10), P.spikes!.h));
    }
  }
  let hit = false;
  for (const e of h.enemies()) {
    if (!e.targetable) continue;
    const dx = e.x - x;
    const dy = e.y - y;
    const dd = Math.hypot(dx, dy);
    if (dd > r + e.radius) continue;
    hit = true;
    h.damageEnemy(e, m, amount, dx / (dd || 1), dy / (dd || 1), true);
  }
  if (hit && P.hitStopMs) h.hitStop(P.hitStopMs);
  if (!L) return;
  // vùng lưu lại: sát thương nhỏ theo nhịp + hạt liếm trên nền
  const zr = r * L.radiusMult;
  const zmove: MoveDef = {
    ...m, id: `${m.id}Linger`, knockback: 0, status: L.status ? m.status : undefined, slow: L.slow, drain: L.drain, zone: { radius: zr, ms: L.ms, tickMs: L.tickMs },
  };
  h.addFrameTask(L.ms, () => {
    if (Math.random() > 0.35) return;
    const a = Math.random() * Math.PI * 2;
    const dd = Math.random() * r * 0.6;
    d.puff(x + Math.cos(a) * dd, y + Math.sin(a) * dd * 0.7, 1);
    if (Math.random() < 0.3) d.trail(x + Math.cos(a) * dd, y + Math.sin(a) * dd * 0.7 - 4, 1);
  });
  h.addZone({ x, y, r: zr, ms: L.ms, firstTickMs: 250, move: zmove, power: amount * L.powerMult, color: L.color });
}

// ====================================================================== tuyệt chiêu inferno: vòng cột lửa + thiên thạch

function castInferno(h: SkillHost, f: Fighter, P: InfernoParams, u: UltimateDef, mv: MoveDef, amount: number) {
  if (h.over) return;
  const t0Lift = h.clock;
  const sc = h.scene;
  const d = dialectFor(P.dialect, h.fx, mv, h);
  sc.cameras.main.flash(320, P.flash[0], P.flash[1], P.flash[2], false);
  h.fx.shake(0.02, 900);
  playSfx('boom');
  if (P.lift) {
    // người dùng cất cánh: sprite nhấc lên, giữ, rồi hạ xuống
    const L = P.lift;
    const up = 320;
    const down = 300;
    h.addFrameTask(L.ms, (now, dt) => {
      const el = now - t0Lift;
      void dt;
      const k = el < up ? el / up : el > L.ms - down ? Math.max(0, (L.ms - el) / down) : 1;
      f.anim.lift = L.h * (1 - Math.pow(1 - k, 2)) + (k >= 1 ? Math.sin(el / 120) * 2 : 0);
      if (Math.random() < 0.5) d.trail(f.x + (Math.random() - 0.5) * 20, f.feetY - 2, 1);
      if (Math.random() < 0.35) h.fx.dustPuff(f.x + (Math.random() - 0.5) * 26, f.feetY, 1);
    }, () => { f.anim.lift = 0; });
  }
  const cx = f.x;
  const cy = f.y;
  const shock = sc.add.circle(cx, cy, 16, P.shockFill, 0.18).setStrokeStyle(6, P.shockStroke, 1).setDepth(-2700);
  sc.tweens.add({ targets: shock, scale: 14, alpha: 0, duration: 800, ease: 'Cubic.out', onComplete: () => shock.destroy() });
  d.explosion(cx, cy, 30);
  // pillarRings: các vòng cột lan ra (mỗi vòng đánh địch trong dải của nó một lần)
  P.rings.forEach((ring, i) => {
    h.schedule(h.clock + i * P.ringStaggerMs, () => {
      if (h.over) return;
      playSfx('flame');
      h.fx.shake(0.008, 160);
      const off = Math.random() * Math.PI;
      for (let k = 0; k < ring.n; k++) {
        const a = off + (k / ring.n) * Math.PI * 2;
        const x = cx + Math.cos(a) * ring.r;
        const y = cy + Math.sin(a) * ring.r * 0.8;
        h.schedule(h.clock + k * 6, () => d.pillar(x, y, (P.pillarH ?? 4) + i));
      }
      for (const e of h.enemies()) {
        if (!e.targetable) continue;
        const dx = e.x - cx;
        const dy = (e.y - cy) / 0.8;
        const dd = Math.hypot(dx, dy);
        if (dd < ring.r - 52 || dd > ring.r + 26) continue;
        h.damageEnemy(e, mv, amount * P.ringPower, dx / (dd || 1), dy / (dd || 1), true);
      }
    });
  });
  // meteors: mỗi địch u.hits lần, xen kẽ; thêm vài quả rơi quanh người cho đẹp
  const M = P.meteor;
  const meteor = (x: number, y: number, delay: number, onHit?: () => void) => {
    h.schedule(h.clock + delay, () => {
      if (h.over) return;
      const sx = x + M.fromDx;
      const sy = y + M.fromDy;
      const ball = sc.add.image(sx, sy, 'fireball').setScale(M.scale).setDepth(100003);
      const halo = sc.add.image(sx, sy, 'softglow').setScale(M.haloScale).setTint(M.haloTint).setDepth(100002);
      const start = h.clock;
      h.addFrameTask(M.flyMs, (now) => {
        const k = Math.min(1, (now - start) / M.flyMs);
        const px = sx + (x - sx) * k;
        const py = sy + (y - sy) * k * k;
        ball.setPosition(px, py);
        halo.setPosition(px, py);
        d.trail(px, py, 3);
      }, () => {
        ball.destroy();
        halo.destroy();
        d.explosion(x, y, 30);
        d.scorch(x, y, M.scorchR, M.scorchMs);
        h.fx.shake(0.009, 160);
        playSfx('boom');
        onHit?.();
      });
    });
  };
  const targets = h.enemies().filter((e) => e.targetable);
  targets.forEach((e, i) => {
    for (let k = 0; k < (u.hits ?? 1); k++) {
      meteor(e.x, e.y, M.firstMs + i * M.perTargetMs + k * M.perHitMs, () => {
        if (e.dead || !e.targetable) return;
        h.damageEnemy(e, mv, amount, 0, 0, true);
      });
    }
  });
  if (P.flare) {
    // đòn kết: bùng sáng hình sao khổng lồ quanh người + vòng cột lửa bắn lên
    const F = P.flare;
    h.schedule(h.clock + M.firstMs + targets.length * M.perTargetMs + (u.hits ?? 1) * M.perHitMs + 120, () => {
      if (h.over) return;
      sc.cameras.main.flash(380, 255, 220, 140, false);
      h.fx.shake(0.03, 700);
      playSfx('boom');
      h.fx.starBurst(cx, cy, F.r, 5, F.color, F.color2);
      h.fx.ringBurst(cx, cy, F.r * 1.5, F.color, F.color2, 560);
      h.fx.debrisBurst(cx, cy, 26);
      d.explosion(cx, cy, F.r * 0.6);
      for (let k = 0; k < F.pillars; k++) {
        const a = (k / F.pillars) * Math.PI * 2;
        h.schedule(h.clock + k * 18, () => d.pillar(cx + Math.cos(a) * F.r * 0.8, cy + Math.sin(a) * F.r * 0.6, 7));
      }
    });
  }
  for (let k = 0; k < P.extraMeteors; k++) {
    const a = Math.random() * Math.PI * 2;
    const dd = 40 + Math.random() * 150;
    meteor(Phaser.Math.Clamp(cx + Math.cos(a) * dd, 20, h.worldW - 20), Phaser.Math.Clamp(cy + Math.sin(a) * dd * 0.7, 20, h.worldH - 20), M.firstMs - 70 + k * 110);
  }
}

// ====================================================================== nova: vòng sóng lan ra, đẩy văng, nhiều nhịp

function castNova(h: SkillHost, f: Fighter, m: MoveDef, P: NovaParams) {
  const sc = h.scene;
  const d = dialectFor(P.dialect, h.fx, m, h);
  const R = P.radius ?? m.burstRadius ?? 80;
  const mult = h.stackMult(f, m);
  const pushMove: MoveDef = { ...m, knockback: P.push };
  f.playMove(m);
  f.anim.playOnce('charge', P.delayMs + (P.pulses - 1) * P.pulseGapMs + 160);
  const t = h.aimTarget;
  const fixed = P.atTarget && t && !t.dead ? { x: t.x, y: t.y } : null;
  for (let i = 0; i < P.pulses; i++) {
    h.schedule(h.clock + P.delayMs + i * P.pulseGapMs, () => {
      if (h.over || f.dead || !f.onField) return;
      const cx = fixed?.x ?? f.x;
      const cy = fixed?.y ?? f.y;
      const r = R * Math.pow(P.pulseGrowth, i);
      const amount = m.power * f.power * mult * (P.pulsePower[i] ?? P.pulsePower[P.pulsePower.length - 1] ?? 1);
      playSfx(m.sfx);
      h.fx.shake(P.shake[0], P.shake[1]);
      if (P.flash && i === 0) sc.cameras.main.flash(180, P.flash[0], P.flash[1], P.flash[2], false);
      // ngọn sóng dọc mép (hạt dọc mép vòng: xem frame task bên dưới)
      const off = Math.random() * Math.PI;
      for (let k = 0; k < P.crests; k++) {
        const a = off + (k / P.crests) * Math.PI * 2;
        h.schedule(h.clock + P.expandMs * 0.55, () => d.pillar(cx + Math.cos(a) * r * 0.85, cy + Math.sin(a) * r * 0.85 * P.squash, (P.crestH ?? 2.5) + i * 0.6));
      }
      const g = sc.add.graphics().setDepth(-2700);
      const hit = new Set<Enemy>();
      const t0 = h.clock;
      let any = false;
      // vòng cánh hoa / lá xoay: mỗi vòng quay ngược chiều vòng kề
      const O = P.orbit;
      const orbitImgs: Phaser.GameObjects.Image[] = [];
      const rings = O ? (O.arms ?? 2) : 0;
      if (O) {
        for (let q = 0; q < rings * O.n; q++) orbitImgs.push(sc.add.image(cx, cy, O.tex).setScale(O.scale).setDepth(99996));
      }
      h.addFrameTask(P.expandMs + 160, (now) => {
        const k = Math.min(1, (now - t0) / P.expandMs);
        const e1 = 1 - Math.pow(1 - k, 3);
        const fade = now - t0 > P.expandMs ? 1 - (now - t0 - P.expandMs) / 160 : 1;
        const cr = r * e1;
        g.clear();
        if (O) {
          orbitImgs.forEach((im, q) => {
            const ri = Math.floor(q / O.n);
            const j = q % O.n;
            const dir = ri % 2 ? -1 : 1;
            const a = dir * ((now - t0) / 1000) * O.spin + (j / O.n) * Math.PI * 2 + ri * 0.5;
            const rr = cr * (0.92 - ri * (0.5 / rings));
            im.setPosition(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr * P.squash).setRotation(a + dir * Math.PI / 2).setAlpha(fade).setDepth(cy + Math.sin(a) * rr * P.squash + 2000);
            if (Math.random() < 0.05) d.trail(im.x, im.y, 1);
          });
        }
        g.fillStyle(P.fill, P.fillAlpha * (1 - k * 0.6) * fade).fillEllipse(cx, cy, cr * 2, cr * 2 * P.squash);
        for (const L of P.rings) {
          const rr = cr * L.r;
          g.lineStyle(L.width * (1 - k * 0.4), L.color, L.alpha * fade).strokeEllipse(cx, cy, rr * 2, rr * 2 * P.squash);
        }
        if (P.swirl && i === P.pulses - 1) {
          // xoáy bong bóng quay quanh tâm
          for (let j = 0; j < P.swirl; j++) {
            const a = (now - t0) / 70 + (j / P.swirl) * Math.PI * 2;
            const sr = cr * (0.35 + 0.5 * ((j % 3) / 3));
            d.puff(cx + Math.cos(a) * sr, cy + Math.sin(a) * sr * P.squash, 1);
          }
        }
        if (k < 1) {
          for (let j = 0; j < P.sprayCount / 6; j++) {
            const a = Math.random() * Math.PI * 2;
            d.trail(cx + Math.cos(a) * cr, cy + Math.sin(a) * cr * P.squash, 1);
          }
          if (Math.random() < 0.5) {
            const a = Math.random() * Math.PI * 2;
            d.smoke(cx + Math.cos(a) * cr, cy + Math.sin(a) * cr * P.squash, 1);
          }
        }
        // sóng chạm tới đâu đánh tới đó
        for (const e of h.enemies()) {
          if (!e.targetable || hit.has(e)) continue;
          const dx = e.x - cx;
          const dy = (e.y - cy) / P.squash;
          const dd = Math.hypot(dx, dy);
          if (dd > cr + e.radius) continue;
          hit.add(e);
          any = true;
          d.hit(e.x, e.centerY, true);
          h.damageEnemy(e, pushMove, amount, dx / (dd || 1), dy / (dd || 1), true);
        }
      }, () => {
        g.destroy();
        orbitImgs.forEach((im) => im.destroy());
        if (any && P.hitStopMs) h.hitStop(P.hitStopMs);
        const res = P.residue;
        if (!res || i !== P.pulses - 1 || h.over) return;
        for (let k = 0; k < res.count; k++) {
          const a = (k / res.count) * Math.PI * 2 + Math.random() * 0.6;
          const dd = r * (0.35 + Math.random() * 0.45);
          d.scorch(Phaser.Math.Clamp(cx + Math.cos(a) * dd, 10, h.worldW - 10), Phaser.Math.Clamp(cy + Math.sin(a) * dd * P.squash, 10, h.worldH - 10), res.r, res.ms);
        }
      });
    });
  }
}

// ====================================================================== chain: sét đánh mục tiêu rồi nảy sang N địch

function castChain(h: SkillHost, f: Fighter, m: MoveDef, P: ChainParams, dir: Phaser.Math.Vector2) {
  const d = dialectFor(P.dialect, h.fx, m, h);
  const mult = h.stackMult(f, m);
  f.playMove(m);
  const mv: MoveDef = { ...m, status: { kind: 'paralyze', chance: P.paralyzeChance, ms: m.status?.ms ?? 900 } };
  const ox = f.x + dir.x * 8;
  const oy = f.chestY + dir.y * 5;
  const pool = h.enemies().filter((e) => e.targetable);
  const near = (x: number, y: number, range: number, skip: Set<Enemy>) => {
    let best: Enemy | null = null;
    let bd = range;
    for (const e of pool) {
      if (skip.has(e)) continue;
      const dd = Math.hypot(e.x - x, e.centerY - y);
      if (dd < bd) {
        bd = dd;
        best = e;
      }
    }
    return best;
  };
  const at = h.aimTarget;
  const first = at && at.targetable && Math.hypot(at.x - f.x, at.y - f.y) <= P.range ? at : near(f.x, f.chestY, P.range, new Set());
  if (!first) {
    // không có mục tiêu: tia phóng ra phía trước rồi tắt
    const ex = ox + dir.x * P.range * 0.55;
    const ey = oy + dir.y * P.range * 0.55;
    h.fx.jagged(ox, oy, ex, ey, P.color, P.core, P.width, P.jitter, 200, 2);
    d.hit(ex, ey, false);
    return;
  }
  const seq: Enemy[] = [first];
  const seen = new Set<Enemy>(seq);
  for (let i = 0; i < P.jumps; i++) {
    const last = seq[seq.length - 1];
    const nx = near(last.x, last.centerY, P.jumpRange, seen);
    if (!nx) break;
    seq.push(nx);
    seen.add(nx);
  }
  const base = m.power * f.power * mult;
  let prev = { x: ox, y: oy };
  seq.forEach((e, i) => {
    h.schedule(h.clock + i * P.jumpDelayMs, () => {
      if (h.over) return;
      const from = i === 0 ? { x: f.x + dir.x * 8, y: f.chestY + dir.y * 5 } : prev;
      const to = { x: e.x, y: e.centerY };
      prev = to;
      if (e.dead || !e.targetable) return;
      const w = P.width * (i === 0 ? 1.25 : Math.max(0.6, Math.pow(0.9, i)));
      h.fx.jagged(from.x, from.y, to.x, to.y, P.color, P.core, w, P.jitter, 240, i === 0 ? 3 : 1);
      if (P.double) {
        const ux = to.x - from.x;
        const uy = to.y - from.y;
        const ul = Math.hypot(ux, uy) || 1;
        for (const sg of [-1, 1]) h.fx.jagged(from.x - (uy / ul) * 5 * sg, from.y + (ux / ul) * 5 * sg, to.x, to.y, P.color, P.core, w * 0.55, P.jitter, 300);
      }
      d.hit(to.x, to.y, i === 0);
      if (i === 0) {
        playSfx('thunder');
        h.fx.shake(P.shake ?? 0.006, 140);
        if (P.flash) d.explosion(to.x, to.y, 22);
      } else playSfx('zap');
      const dx = to.x - from.x;
      const dy = to.y - from.y;
      const dd = Math.hypot(dx, dy) || 1;
      h.damageEnemy(e, mv, base * Math.pow(P.falloff, i), dx / dd, dy / dd, i === 0);
      if (i === 0 && P.hitStopMs) h.hitStop(P.hitStopMs);
      if (P.residue) d.scorch(e.x, e.y, P.residue.r, P.residue.ms);
    });
  });
}

// ====================================================================== rain: vòng cảnh báo → đòn rơi từ trời xuống

function castRain(h: SkillHost, f: Fighter, m: MoveDef, P: RainParams) {
  const sc = h.scene;
  const d = dialectFor(P.dialect, h.fx, m, h);
  const R = P.radius ?? m.burstRadius ?? 42;
  const mult = h.stackMult(f, m);
  const amount = m.power * f.power * mult * P.powerMult;
  f.anim.playOnce('charge', P.telegraphMs);
  f.sprayUntil = h.clock + P.telegraphMs;
  f.sprayMove = { ...m, moveSlow: 0.4, line: 1 };
  const t = h.aimTarget;
  const c0 = t && !t.dead ? { x: t.x, y: t.y } : { x: f.x + f.facing.x * 110, y: f.y + f.facing.y * 110 };
  const clampP = (p: { x: number; y: number }) => ({ x: Phaser.Math.Clamp(p.x, 16, h.worldW - 16), y: Phaser.Math.Clamp(p.y, 16, h.worldH - 16) });
  // các điểm rơi: bám theo địch gần mục tiêu (nếu có), còn lại rải ngẫu nhiên quanh
  const foes = P.seekEnemies
    ? h.enemies().filter((e) => e.targetable && Math.hypot(e.x - c0.x, e.y - c0.y) <= P.spread * 2.2).sort((a, b) => Math.hypot(a.x - c0.x, a.y - c0.y) - Math.hypot(b.x - c0.x, b.y - c0.y))
    : [];
  if (t && !t.dead && P.seekEnemies && foes[0] !== t) foes.unshift(t);
  const spots = Array.from({ length: P.count }, (_, i) => {
    const e = foes[i] as Enemy | undefined;
    const a = Math.random() * Math.PI * 2;
    const dd = i === 0 ? 0 : P.spread * (0.4 + Math.random() * 0.6);
    return { e, pos: clampP(e ? { x: e.x, y: e.y } : { x: c0.x + Math.cos(a) * dd, y: c0.y + Math.sin(a) * dd * 0.75 }), lockAt: 0, landAt: 0 };
  });
  const t0 = h.clock;
  spots.forEach((s, i) => {
    s.landAt = t0 + P.telegraphMs + i * P.staggerMs;
    s.lockAt = s.landAt - 140;
  });
  const g = sc.add.graphics().setDepth(-2890);
  const total = P.telegraphMs + (P.count - 1) * P.staggerMs;
  h.addFrameTask(total, (now) => {
    g.clear();
    for (const s of spots) {
      if (now >= s.landAt) continue;
      if (s.e && !s.e.dead && now < s.lockAt) s.pos = clampP({ x: s.e.x, y: s.e.y });
      const p = Phaser.Math.Clamp((now - t0) / (s.landAt - t0), 0, 1);
      const { x, y } = s.pos;
      if (P.crackTelegraph) {
        // vết nứt gai: tia zích zắc dài dần + mũi gai nhọn ở đầu tia (không elip)
        for (let q = 0; q < 7; q++) {
          const a = q * 0.9 + (spots.indexOf(s) * 1.3);
          const L = R * (0.35 + 0.65 * p) * (0.75 + 0.25 * ((q * 7) % 3) / 2);
          const mx = x + Math.cos(a + 0.25) * L * 0.5;
          const my = y + Math.sin(a + 0.25) * L * 0.5 * 0.75;
          const ex = x + Math.cos(a) * L;
          const ey = y + Math.sin(a) * L * 0.75;
          g.lineStyle(2.5, 0x1a1006, 0.8).lineBetween(x, y, mx, my).lineBetween(mx, my, ex, ey);
          g.lineStyle(1, P.core, 0.55 + 0.45 * Math.sin(now / 35)).lineBetween(x, y, mx, my).lineBetween(mx, my, ex, ey);
          g.fillStyle(P.core, 0.8).fillTriangle(ex - Math.sin(a) * 2, ey + Math.cos(a) * 2, ex + Math.sin(a) * 2, ey - Math.cos(a) * 2, ex + Math.cos(a) * 5, ey + Math.sin(a) * 4);
        }
        continue;
      }
      g.fillStyle(P.telegraphColor, 0.12 + 0.14 * p).fillEllipse(x, y, R * 2, R * 1.5);
      g.fillStyle(P.telegraphColor, 0.28).fillEllipse(x, y, R * 2 * p, R * 1.5 * p);
      g.lineStyle(2, P.core, 0.55 + 0.45 * Math.sin(now / 35)).strokeEllipse(x, y, R * 2, R * 1.5);
      g.lineStyle(1, 0xffffff, 0.7).lineBetween(x - 6, y, x + 6, y).lineBetween(x, y - 5, x, y + 5);
    }
    if (Math.random() < 0.3) d.trail(f.x, f.chestY - 10, 1);
  }, () => g.destroy());
  for (const s of spots) {
    const fall = P.kind === 'bolt' || P.kind === 'root' ? 0 : 180;
    h.schedule(s.landAt - fall, () => {
      if (h.over) return;
      const land = (wave = 0) => {
        if (h.over) return;
        const { x, y } = s.pos;
        if (P.kind === 'bolt') h.fx.skyBolt(x, y, P.color, P.core, P.boltWidth ?? 4);
        if (P.kind === 'root' && P.rootLine && wave === 0) {
          // làn rễ chạy dọc từ người tới mục tiêu
          const n = P.rootLine;
          for (let q = 1; q <= n; q++) {
            const k = q / (n + 1);
            const lx = Phaser.Math.Clamp(f.x + (x - f.x) * k, 10, h.worldW - 10);
            const ly = Phaser.Math.Clamp(f.y + (y - f.y) * k, 10, h.worldH - 10);
            h.schedule(h.clock + (q - n - 1) * 0 + q * 22, () => d.pillar(lx, ly, 2.2 + k * 2));
          }
        }
        if (P.kind === 'root') {
          // rễ gai khổng lồ trồi lên đúng chỗ + vòng gai nhỏ bao quanh
          d.pillar(x, y, (P.pillarH ?? 6) + (wave ? 0.5 : 0));
          for (let i = 0; i < (P.spikes ?? 0); i++) {
            const a = (i / (P.spikes ?? 1)) * Math.PI * 2 + wave * 0.7;
            h.schedule(h.clock + 30 + i * 22, () => d.pillar(Phaser.Math.Clamp(x + Math.cos(a) * R * 0.75, 10, h.worldW - 10), Phaser.Math.Clamp(y + Math.sin(a) * R * 0.6, 10, h.worldH - 10), (P.pillarH ?? 6) * 0.55));
          }
          if (wave === 0) {
            d.explosion(x, y, R * 0.7);
            playSfx('leafLo');
          }
          if (P.waves && wave === 0) {
            for (let w = 1; w < P.waves.n; w++) h.schedule(h.clock + w * P.waves.gapMs, () => land(w));
          }
        } else d.explosion(x, y, R * 0.9);
        if (P.residue && wave === 0) d.scorch(x, y, P.residue.r, P.residue.ms);
        h.fx.shake(P.shake[0], P.shake[1]);
        playSfx(P.kind === 'bolt' ? 'thunder' : P.kind === 'root' ? 'boom' : 'boom');
        let any = false;
        for (const e of h.enemies()) {
          if (!e.targetable) continue;
          const dx = e.x - x;
          const dy = (e.y - y) / 0.75;
          const dd = Math.hypot(dx, dy);
          if (dd > R + e.radius) continue;
          any = true;
          h.damageEnemy(e, m, amount * (wave && P.waves ? P.waves.power : 1), dx / (dd || 1), dy / (dd || 1), true);
        }
        if (any && P.hitStopMs) h.hitStop(P.hitStopMs);
      };
      if (!fall) return land();
      // thiên thạch / khối nước rơi chéo xuống
      const { x, y } = s.pos;
      const sx = x + 40;
      const sy = y - 170;
      const ball = sc.add.image(sx, sy, 'softglow').setTint(P.color).setScale(2.6).setDepth(100003);
      const core = sc.add.image(sx, sy, 'softglow').setTint(P.core).setScale(1.3).setDepth(100004);
      const st = h.clock;
      h.addFrameTask(fall, (now) => {
        const k = Math.min(1, (now - st) / fall);
        const px = sx + (s.pos.x - sx) * k;
        const py = sy + (s.pos.y - sy) * k * k;
        ball.setPosition(px, py);
        core.setPosition(px, py);
        d.trail(px, py, 2);
      }, () => {
        ball.destroy();
        core.destroy();
        land();
      });
    });
  }
}

// ====================================================================== tuyệt chiêu tsunami: sóng thần quét sân + xoáy nước

function castTsunami(h: SkillHost, f: Fighter, P: TsunamiParams, u: UltimateDef, mv: MoveDef, amount: number) {
  if (h.over) return;
  const sc = h.scene;
  const d = dialectFor(P.dialect, h.fx, mv, h);
  sc.cameras.main.flash(P.flashMs ?? 260, P.flash[0], P.flash[1], P.flash[2], false);
  h.fx.shake(P.shake ?? 0.014, P.sweepMs);
  playSfx('water');
  playSfx('boom');
  d.explosion(f.x, f.y, 40);
  const sign = f.facing.x >= 0 ? 1 : -1;
  const W = h.worldW;
  const H = h.worldH;
  const fan = P.fanSlope ?? 0;
  const cyRef = f.y;
  /** mép sóng lùi theo khoảng cách dọc tới người (sóng hình quạt) */
  const bend = (y: number) => fan * Math.abs(y - cyRef);
  const ext = P.waveThick + fan * H;
  const x0 = sign > 0 ? -ext : W + ext;
  const x1 = sign > 0 ? W + ext : -ext;
  const g = sc.add.graphics().setDepth(100001);
  const hit = new Set<Enemy>();
  const t0 = h.clock;
  const view = sc.cameras.main.worldView;
  h.addFrameTask(P.sweepMs, (now) => {
    const k = Math.min(1, (now - t0) / P.sweepMs);
    const ex = x0 + (x1 - x0) * k;
    g.clear();
    // các dải nước phía sau mép sóng (đậm → nhạt về phía mép), mép gợn sóng hình sin
    const n = P.waveColors.length;
    P.waveColors.forEach((c, i) => {
      const back = P.waveThick * (1 - i / n);
      const pts: Phaser.Math.Vector2[] = [];
      const step = 16;
      const top = view.y - 20;
      const bot = view.y + view.height + 20;
      for (let y = top; y <= bot; y += step) {
        const wob = Math.sin(y / 23 + now / 90 + i) * 6 + Math.sin(y / 9 - now / 60) * 2;
        pts.push(new Phaser.Math.Vector2(ex - sign * (i * 5) + sign * wob - sign * bend(y), y));
      }
      pts.push(new Phaser.Math.Vector2(ex - sign * back - sign * bend(bot), bot));
      pts.push(new Phaser.Math.Vector2(ex - sign * back - sign * bend(top), top));
      g.fillStyle(c, i === n - 1 ? 0.95 : 0.55 + 0.1 * i).fillPoints(pts, true);
    });
    // bọt + giọt ở mép (chỉ trong khung nhìn)
    if (ex > view.x - 20 && ex < view.right + 20) {
      for (let j = 0; j < 3; j++) {
        const y = view.y + Math.random() * view.height;
        d.smoke(ex - sign * bend(y), y, 1);
        d.spray(ex - sign * bend(y), y, sign > 0 ? 0 : 180, 1);
      }
      if (Math.random() < 0.35) {
        const y = view.y + Math.random() * view.height;
        d.pillar(ex - sign * bend(y), y, P.waveThick > 140 ? 5 : 3);
      }
    }
    for (const e of h.enemies()) {
      if (!e.targetable || hit.has(e)) continue;
      if ((e.x - (ex - sign * bend(e.y))) * sign > 0) continue;
      hit.add(e);
      d.hit(e.x, e.centerY, true);
      h.damageEnemy(e, mv, amount * P.wavePower, sign, 0, true);
    }
    void H;
  }, () => {
    sc.tweens.add({ targets: g, alpha: 0, duration: 200, onComplete: () => g.destroy() });
    if (h.over) return;
    // xoáy nước tại vị trí các địch còn sống
    const W2 = P.whirlpools;
    const spots = h.enemies().filter((e) => e.targetable).slice(0, W2.max).map((e) => ({ x: e.x, y: e.y }));
    spots.forEach((p, i) => h.schedule(h.clock + W2.delayMs + i * 90, () => whirlpool(h, d, p.x, p.y, P, mv, amount)));
  });
  void u;
}

function whirlpool(h: SkillHost, d: ReturnType<typeof dialectFor>, x: number, y: number, P: TsunamiParams, mv: MoveDef, amount: number) {
  if (h.over) return;
  const W = P.whirlpools;
  const g = h.scene.add.graphics().setDepth(-2700);
  const pull: MoveDef = { ...mv, knockback: W.pull, status: undefined };
  const t0 = h.clock;
  let next = t0 + 120;
  playSfx('water');
  h.addFrameTask(W.ms, (now) => {
    const k = (now - t0) / W.ms;
    const grow = Math.min(1, (now - t0) / 200) * (k > 0.85 ? (1 - k) / 0.15 : 1);
    const rot = (now - t0) / 140;
    g.clear();
    g.fillStyle(0x1a4a90, 0.45 * grow).fillEllipse(x, y, W.r * 2 * grow, W.r * 1.2 * grow);
    for (let i = 0; i < 4; i++) {
      const rr = W.r * grow * (1 - i * 0.22);
      g.lineStyle(3 - i * 0.5, i % 2 ? 0x6ac0ff : 0xe8fbff, 0.85 - i * 0.12);
      g.beginPath();
      // spiral-ish: arc on ellipse approximated by points
      const a0 = rot * (1 + i * 0.3) + i;
      for (let s = 0; s <= 12; s++) {
        const a = a0 + (s / 12) * Math.PI * 1.4;
        const px = x + Math.cos(a) * rr;
        const py = y + Math.sin(a) * rr * 0.6;
        if (s === 0) g.moveTo(px, py);
        else g.lineTo(px, py);
      }
      g.strokePath();
    }
    if (Math.random() < 0.4) d.trail(x + (Math.random() - 0.5) * W.r, y + (Math.random() - 0.5) * W.r * 0.6, 1);
    if (now < next) return;
    next = now + W.tickMs;
    for (const e of h.enemies()) {
      if (!e.targetable) continue;
      const dx = e.x - x;
      const dy = (e.y - y) / 0.6;
      const dd = Math.hypot(dx, dy);
      if (dd > W.r + e.radius) continue;
      // hút về tâm (đẩy lùi ngược chiều)
      h.damageEnemy(e, pull, amount * W.power, -dx / (dd || 1), -dy / (dd || 1), false, true);
    }
  }, () => g.destroy());
}

// ====================================================================== tuyệt chiêu thunderstorm: trời tối, sét dày đặc + sét chuỗi

function castThunderstorm(h: SkillHost, f: Fighter, P: ThunderstormParams, u: UltimateDef, mv: MoveDef, amount: number) {
  if (h.over) return;
  const sc = h.scene;
  const d = dialectFor(P.dialect, h.fx, mv, h);
  const cam = sc.cameras.main;
  cam.flash(220, P.flash[0], P.flash[1], P.flash[2], false);
  const dark = sc.add.rectangle(0, 0, cam.width, cam.height, 0x0a0a20, 0).setOrigin(0).setScrollFactor(0).setDepth(99990);
  sc.tweens.add({ targets: dark, fillAlpha: P.darken, duration: 220 });
  h.schedule(h.clock + P.darkenMs, () => sc.tweens.add({ targets: dark, fillAlpha: 0, duration: 400, onComplete: () => dark.destroy() }));
  playSfx('thunder');
  h.fx.shake(0.012, 600);
  d.explosion(f.x, f.chestY, 30);
  const strike = (x: number, y: number, onHit?: () => void) => {
    if (h.over) return;
    h.fx.skyBolt(x, y, P.color, P.core, 5);
    d.explosion(x, y, P.strikeR);
    h.fx.shake(0.008, 120);
    playSfx('thunder');
    onHit?.();
  };
  const targets = h.enemies().filter((e) => e.targetable);
  let last = P.firstMs;
  targets.forEach((e, i) => {
    for (let k = 0; k < (u.hits ?? 1); k++) {
      const at = P.firstMs + i * P.perTargetMs + k * P.perHitMs;
      last = Math.max(last, at);
      h.schedule(h.clock + at, () => {
        if (e.dead || !e.targetable) return;
        strike(e.x, e.y, () => h.damageEnemy(e, mv, amount, 0, 0, true));
      });
    }
  });
  const view = cam.worldView;
  for (let k = 0; k < P.extraStrikes; k++) {
    h.schedule(h.clock + P.firstMs - 80 + k * 95, () => strike(view.x + 30 + Math.random() * (view.width - 60), view.y + 40 + Math.random() * (view.height - 60)));
  }
  // kết: sét nảy chuỗi qua các địch còn sống
  h.schedule(h.clock + last + 320, () => {
    if (h.over) return;
    const alive = h.enemies().filter((e) => e.targetable);
    if (!alive.length) return;
    let cur = { x: f.x, y: f.chestY - 6 };
    const seen = new Set<Enemy>();
    for (let i = 0; i < P.finaleChain; i++) {
      let best: Enemy | null = null;
      let bd = Infinity;
      for (const e of alive) {
        if (seen.has(e)) continue;
        const dd = Math.hypot(e.x - cur.x, e.centerY - cur.y);
        if (dd < bd) {
          bd = dd;
          best = e;
        }
      }
      if (!best) break;
      seen.add(best);
      const from = cur;
      const e = best;
      cur = { x: e.x, y: e.centerY };
      h.schedule(h.clock + i * 70, () => {
        if (h.over || e.dead || !e.targetable) return;
        h.fx.jagged(from.x, from.y, e.x, e.centerY, P.color, P.core, 3.5, 12, 260, 2);
        d.hit(e.x, e.centerY, true);
        playSfx('zap');
        h.damageEnemy(e, mv, amount * P.finalePower, 0, 0, true);
      });
    }
  });
}

// ====================================================================== tuyệt chiêu bloom: bão cánh hoa / rễ gai khắp sân / đóa hoa khổng lồ

function castBloom(h: SkillHost, f: Fighter, P: BloomParams, u: UltimateDef, mv: MoveDef, amount: number) {
  if (h.over) return;
  const sc = h.scene;
  const d = dialectFor(P.dialect, h.fx, mv, h);
  sc.cameras.main.flash(300, P.flash[0], P.flash[1], P.flash[2], false);
  h.fx.shake(P.shake, 900);
  playSfx('bloom');
  playSfx('boom');
  const cx = f.x;
  const cy = f.y;
  d.explosion(cx, cy, 34);
  leafBurst(sc, cx, cy, P.bloom ? 190 : 130, P.bloom ? 26 : 18, P.storm?.spiral ? ['petalP', 'petalP', 'leafA'] : ['leafA', 'leafB', 'petalP'], 800, 1);
  groundCracks(sc, cx, cy, P.bloom ? 90 : 55, 6, 1800);

  // 1) bão cánh hoa xoay quanh người, nở rộng dần, đánh theo nhịp
  const S = P.storm;
  if (S) {
    const imgs = Array.from({ length: S.n }, () => sc.add.image(cx, cy, S.tex).setScale(S.spiral ? 1.3 : 1.6).setDepth(99996));
    const ground = sc.add.graphics().setDepth(S.spiral ? 99995 : -2700);
    const t0 = h.clock;
    let next = t0 + 140;
    const stormMove: MoveDef = { ...mv, knockback: 50 };
    h.addFrameTask(S.ms, (now) => {
      if (f.dead) return;
      const k = Math.min(1, (now - t0) / S.ms);
      const rt = S.r * (0.25 + 0.75 * (1 - Math.pow(1 - k, 2)));
      const fade = k > 0.85 ? (1 - k) / 0.15 : 1;
      const ox = f.x;
      const oy = f.y;
      ground.clear();
      if (S.spiral) {
        // Vũ Điệu Cánh Hoa: 2 dòng cánh hoa xoắn ốc, quay quanh người và tuôn dần ra ngoài (không vòng tròn)
        const arms = 2;
        const ang0 = (now - t0) / 230;
        for (let a = 0; a < arms; a++) {
          const pts: Phaser.Math.Vector2[] = [];
          for (let q = 0; q <= 24; q++) {
            const sp = q / 24;
            const an = ang0 + a * Math.PI + sp * 3.6;
            pts.push(new Phaser.Math.Vector2(ox + Math.cos(an) * rt * sp, oy - 8 + Math.sin(an) * rt * sp * 0.75));
          }
          ground.lineStyle(3, 0xf890c0, 0.28 * fade).strokePoints(pts, false);
          ground.lineStyle(1, 0xffe0f0, 0.55 * fade).strokePoints(pts, false);
        }
        imgs.forEach((im, j) => {
          const arm = j % arms;
          const flow = (((Math.floor(j / arms) / Math.ceil(S.n / arms)) + (now - t0) / 900) % 1);
          const an = ang0 + arm * Math.PI + flow * 3.6;
          const rr = rt * flow;
          const px = ox + Math.cos(an) * rr;
          const py = oy - 8 + Math.sin(an) * rr * 0.75;
          // cánh hoa chao lật: bề cao co giãn theo pha, xoay theo tiếp tuyến xoắn
          im.setPosition(px, py).setRotation(an + Math.PI / 2 + 0.6).setScale(1.1 + flow * 0.6, 0.35 + 0.65 * Math.abs(Math.sin((now - t0) / 120 + j))).setAlpha(fade * (flow < 0.1 ? flow * 10 : 1)).setDepth(py + 2000);
        });
      }
      if (!S.spiral) imgs.forEach((im, j) => {
        const arm = j % 3;
        const along = Math.floor(j / 3) / Math.ceil(S.n / 3);
        const a = (now - t0) / 260 + arm * ((Math.PI * 2) / 3) + along * 2.4;
        const rr = rt * (0.2 + 0.8 * along);
        const px = ox + Math.cos(a) * rr;
        const py = oy + Math.sin(a) * rr * 0.75;
        im.setPosition(px, py - 8 - along * 6).setRotation(a * 2).setAlpha(fade).setDepth(py + 2000);
        if (Math.random() < 0.08) d.trail(px, py - 8, 1);
      });
      if (now < next) return;
      next = now + S.tickMs;
      playSfx('leafHi');
      for (const e of h.enemies()) {
        if (!e.targetable) continue;
        const dx = e.x - ox;
        const dy = (e.y - oy) / 0.75;
        const dd = Math.hypot(dx, dy);
        if (dd > rt + e.radius) continue;
        d.hit(e.x, e.centerY, false);
        h.damageEnemy(e, stormMove, amount * S.power, dx / (dd || 1), dy / (dd || 1), false, true);
      }
    }, () => {
      ground.destroy();
      imgs.forEach((im) => im.destroy());
    });
  }

  // 2) các vòng rễ gai lan ra
  P.rings.forEach((ring, i) => {
    h.schedule(h.clock + 160 + i * P.ringStaggerMs, () => {
      if (h.over) return;
      playSfx('leafLo');
      h.fx.shake(0.008, 160);
      const off = Math.random() * Math.PI;
      for (let k = 0; k < ring.n; k++) {
        const a = off + (k / ring.n) * Math.PI * 2;
        const x = Phaser.Math.Clamp(cx + Math.cos(a) * ring.r, 12, h.worldW - 12);
        const y = Phaser.Math.Clamp(cy + Math.sin(a) * ring.r * 0.8, 12, h.worldH - 12);
        h.schedule(h.clock + k * 7, () => d.pillar(x, y, P.rootH * 0.7 + i * 0.4));
      }
      for (const e of h.enemies()) {
        if (!e.targetable) continue;
        const dx = e.x - cx;
        const dy = (e.y - cy) / 0.8;
        const dd = Math.hypot(dx, dy);
        if (dd < ring.r - 52 || dd > ring.r + 26) continue;
        h.damageEnemy(e, mv, amount * P.ringPower, dx / (dd || 1), dy / (dd || 1), true);
      }
    });
  });

  // 2b) rễ trồi thành TIA dọc các hướng ra từ người (có vết nứt), mỗi rễ chạm địch thì gây sát thương một lần
  const A = P.arms;
  if (A) {
    const hitRoot = new Set<Enemy>();
    const a0 = Math.random() * Math.PI;
    const tgs = h.enemies().filter((e) => e.targetable).slice(0, A.n);
    for (let k = 0; k < A.n; k++) {
      // một số tia nhắm vào địch, còn lại chia đều
      const tg = tgs[k];
      const a = tg ? Math.atan2((tg.y - cy) / 0.8, tg.x - cx) : a0 + (k / A.n) * Math.PI * 2;
      for (let d0 = A.step, q = 0; d0 <= A.max; d0 += A.step, q++) {
        const x = Phaser.Math.Clamp(cx + Math.cos(a) * d0 + (Math.random() - 0.5) * 10, 12, h.worldW - 12);
        const y = Phaser.Math.Clamp(cy + Math.sin(a) * d0 * 0.8 + (Math.random() - 0.5) * 8, 12, h.worldH - 12);
        h.schedule(h.clock + 200 + q * A.delayMs + k * 18, () => {
          if (h.over) return;
          d.pillar(x, y, P.rootH * (0.55 + 0.35 * Math.sin((q + k) * 1.7) ** 2));
          if (q % 3 === 0) playSfx('leafLo');
          for (const e of h.enemies()) {
            if (!e.targetable || hitRoot.has(e)) continue;
            if (Math.hypot(e.x - x, (e.y - y) / 0.8) > A.step * 0.7 + e.radius) continue;
            hitRoot.add(e);
            d.hit(e.x, e.centerY, true);
            h.damageEnemy(e, mv, amount * P.ringPower * 2, 0, 0, true);
          }
        });
      }
      crackBetween(sc, cx, cy, cx + Math.cos(a) * A.max, cy + Math.sin(a) * A.max * 0.8, 2400);
    }
  }

  // 3) rễ gai trồi ngay dưới chân từng địch (u.hits lần), để lại rêu làm chậm
  const targets = h.enemies().filter((e) => e.targetable);
  let lastAt = P.firstMs;
  targets.forEach((e, i) => {
    for (let k = 0; k < (u.hits ?? 1); k++) {
      const at = P.firstMs + i * P.perTargetMs + k * P.perHitMs;
      lastAt = Math.max(lastAt, at);
      h.schedule(h.clock + at, () => {
        if (h.over || e.dead || !e.targetable) return;
        if (P.rootH > 0) d.pillar(e.x, e.y, P.rootH);
        for (let q = 0; q < P.rootSpikes; q++) {
          const a = (q / P.rootSpikes) * Math.PI * 2 + k;
          d.pillar(Phaser.Math.Clamp(e.x + Math.cos(a) * 22, 10, h.worldW - 10), Phaser.Math.Clamp(e.y + Math.sin(a) * 15, 10, h.worldH - 10), P.rootH * 0.5);
        }
        d.explosion(e.x, e.y, P.rootH > 0 ? 22 : 30);
        if (P.moss && k === 0) d.scorch(e.x, e.y, P.moss.r, P.moss.ms);
        h.fx.shake(0.009, 130);
        playSfx('leafLo');
        h.damageEnemy(e, mv, amount, 0, 0, true);
      });
    }
  });

  // 4) đóa hoa khổng lồ nở giữa sân rồi nổ tung
  const B = P.bloom;
  if (B) {
    h.schedule(h.clock + 220, () => {
      if (h.over) return;
      h.fx.giantBloom(cx, cy, B.r, B.ms, B.color, B.color2);
    });
    h.schedule(h.clock + 220 + B.ms, () => {
      if (h.over) return;
      sc.cameras.main.flash(260, 235, 255, 200, false);
      h.fx.shake(P.shake * 1.6, 520);
      playSfx('boom');
      playSfx('bloom');
      leafBurst(sc, cx, cy, B.r * 2.2, 30, ['petalP', 'petalP', 'leafA', 'leafB'], 800, 1.1);
      d.explosion(cx, cy, B.r * 0.6);
      for (const e of h.enemies()) {
        if (!e.targetable) continue;
        const dx = e.x - cx;
        const dy = (e.y - cy) / 0.8;
        const dd = Math.hypot(dx, dy);
        if (dd > B.r * 1.5 + e.radius) continue;
        d.hit(e.x, e.centerY, true);
        h.damageEnemy(e, { ...mv, knockback: 420 }, amount * B.power, dx / (dd || 1), dy / (dd || 1), true);
      }
      if (P.heal) {
        const hp = Math.round(f.maxHp * P.heal);
        f.heal(hp);
        h.fx.floatingLabel(f.x, f.chestY - 30, `+${hp}`, '#9fe08a');
      }
    });
  }
  void lastAt;
}
