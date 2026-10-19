// "Bộ từ vựng" hiệu ứng của nguyên mẫu chiêu: cùng một nguyên mẫu (đạn, dòng phun, cầu nổ...) nói bằng
// hạt lửa, tia điện, bong bóng... tùy hệ. Thêm hệ mới = thêm một mục trong DIALECTS (hoặc dùng 'generic').
import type { Effects } from '../fx/Effects';
import type { MoveDef } from '../data/moveKit';
import type { SkillHost } from './host';
import type { FxDialectId } from './types';
import { impactRays, powBurst, speedLines } from '../fx/FightFx';
import { groundCracks } from '../fx/GrassFx';
import { bubbles, patch, scatter, vShock } from '../fx/TypeFx';
import { frostSheet, iceSpike, radialShards, shardStar } from '../fx/IceFx';

export interface FxDialect {
  /** hạt vệt sau đạn / khi lao / khi ngắm */
  trail(x: number, y: number, count: number): void;
  /** nổ nhỏ khi đạn trúng */
  hit(x: number, y: number, big: boolean): void;
  /** hạt của dòng phun theo hướng angleDeg */
  spray(x: number, y: number, angleDeg: number, count: number): void;
  smoke(x: number, y: number, count: number): void;
  /** hạt phụ (puff) dọc vệt / trên vùng lưu lại */
  puff(x: number, y: number, count: number): void;
  explosion(x: number, y: number, r: number): void;
  scorch(x: number, y: number, r: number, ms: number): void;
  pillar(x: number, y: number, h: number): void;
  streaks(x1: number, y1: number, x2: number, y2: number): void;
}

const fire = (fx: Effects): FxDialect => ({
  trail: (x, y, n) => fx.emberTrail(x, y, n),
  hit: (x, y, big) => fx.fireHit(x, y, big),
  spray: (x, y, a, n) => fx.streamPuff(x, y, a, n),
  smoke: (x, y, n) => fx.smokeAt(x, y, n),
  puff: (x, y, n) => fx.puff('flamepuff', x, y, n),
  explosion: (x, y, r) => fx.fireExplosion(x, y, r),
  scorch: (x, y, r, ms) => fx.scorch(x, y, r, ms),
  pillar: (x, y, h) => fx.firePillar(x, y, h),
  streaks: (x1, y1, x2, y2) => fx.clawStreaks(x1, y1, x2, y2),
});

/** vùng làm chậm địch đứng trong (vũng nước, tĩnh điện) – cần host */
const slowZone = (h: SkillHost | undefined, x: number, y: number, r: number, ms: number, mult: number) => {
  if (!h) return;
  let next = 0;
  h.addFrameTask(ms, (now) => {
    if (now < next) return;
    next = now + 150;
    for (const e of h.enemies()) {
      if (!e.targetable) continue;
      const dx = e.x - x;
      const dy = (e.y - y) / 0.6;
      if (dx * dx + dy * dy < (r + e.radius * 0.5) ** 2) e.applySlow(mult, 320, now);
    }
  });
};

/** Nước: giọt / tóe / bọt / vũng nước làm chậm */
const water = (fx: Effects, h?: SkillHost): FxDialect => ({
  trail: (x, y, n) => fx.waterTrail(x, y, n),
  hit: (x, y, big) => fx.waterHit(x, y, big),
  spray: (x, y, a, n) => fx.waterSpray(x, y, a, n),
  smoke: (x, y, n) => fx.foam(x, y, n),
  puff: (x, y, n) => fx.puff('bubblepuff', x, y, n),
  explosion: (x, y, r) => fx.splashExplosion(x, y, r),
  scorch: (x, y, r, ms) => {
    fx.puddle(x, y, r, ms);
    slowZone(h, x, y, r, ms, 0.55);
  },
  pillar: (x, y, hgt) => fx.waterSpout(x, y, hgt),
  streaks: (x1, y1, x2, y2) => fx.waterStreaks(x1, y1, x2, y2),
});

/** Điện: tia lửa / tia gấp khúc / chớp / vết tĩnh điện làm chậm nhẹ */
const electric = (fx: Effects, h?: SkillHost): FxDialect => ({
  trail: (x, y, n) => fx.elecTrail(x, y, n),
  hit: (x, y, big) => fx.zapHit(x, y, big),
  spray: (x, y, a, n) => fx.zapSpray(x, y, a, n),
  smoke: (x, y, n) => fx.sparkBurst(x, y, n * 2),
  puff: (x, y, n) => fx.puff('zappuff', x, y, n),
  explosion: (x, y, r) => fx.zapExplosion(x, y, r),
  scorch: (x, y, r, ms) => {
    fx.staticField(x, y, r, ms);
    slowZone(h, x, y, r, ms, 0.75);
  },
  pillar: (x, y) => fx.skyBolt(x, y),
  streaks: (x1, y1, x2, y2) => fx.elecStreaks(x1, y1, x2, y2),
});

/** Cỏ: lá / cánh hoa / bào tử / rễ gai; vệt rêu gai làm chậm */
const grass = (fx: Effects, h?: SkillHost): FxDialect => ({
  trail: (x, y, n) => fx.leafTrail(x, y, n),
  hit: (x, y, big) => fx.leafHit(x, y, big),
  spray: (x, y, a, n) => fx.leafSpray(x, y, a, n),
  smoke: (x, y, n) => fx.sporePuff(x, y, n),
  puff: (x, y, n) => fx.puff(Math.random() < 0.4 ? 'petal' : 'leafpuff', x, y, n),
  explosion: (x, y, r) => fx.bloomExplosion(x, y, r),
  scorch: (x, y, r, ms) => {
    fx.mossPatch(x, y, r, ms);
    slowZone(h, x, y, r, ms, 0.6);
  },
  pillar: (x, y, hgt) => fx.rootSpike(x, y, hgt),
  streaks: (x1, y1, x2, y2) => fx.vineStreaks(x1, y1, x2, y2),
});

/** Ma: làn khói tím, vòng ma quái, sao 8 cánh, vết tím làm chậm nhẹ */
const ghost = (fx: Effects, h?: SkillHost): FxDialect => ({
  trail: (x, y, n) => fx.puff('shadowpuff', x, y, n),
  hit: (x, y, big) => {
    fx.puff('shadowpuff', x, y, big ? 6 : 3);
    if (big) fx.ringBurst(x, y, 14, 0x6a40a8, 0xd8b8ff, 260);
  },
  spray: (x, y, a, n) => fx.jetOf('shadowpuff', x, y, a, 10, n),
  smoke: (x, y, n) => fx.puff('shadowpuff', x, y, n),
  puff: (x, y, n) => fx.puff(Math.random() < 0.6 ? 'shadowpuff' : 'psypuff', x, y, n),
  explosion: (x, y, r) => {
    fx.ringBurst(x, y, r, 0x4a2a80, 0xb890ff, 420);
    fx.ringBurst(x, y, r * 0.6, 0x6a40a8, 0xe0c8ff, 320);
    fx.starBurst(x, y, r * 0.7, 8, 0x6a40a8, 0xe0c8ff);
    fx.puff('shadowpuff', x, y, Math.max(4, Math.round(r / 4)));
  },
  scorch: (x, y, r, ms) => {
    fx.puff('shadowpuff', x, y, Math.max(3, Math.round(r / 6)));
    slowZone(h, x, y, r, ms, 0.7);
  },
  pillar: (x, y, hgt) => {
    for (let i = 0; i < Math.max(3, hgt); i++) fx.puff('shadowpuff', x, y - i * 6, 2);
  },
  streaks: (x1, y1, x2, y2) => fx.scratchMarks(x2, y2, Math.atan2(y2 - y1, x2 - x1), 3, 12, 0xa080e0, 0xf0e0ff),
});

/** Siêu linh: vòng elip đổi màu xanh → tím → hồng, sao 6 cánh, vòng lơ lửng, nền ý nghĩ làm chậm nhẹ */
const PSY = [0x3a5aff, 0x7a2aff, 0xc030ff, 0xff40c8];
const psy = (fx: Effects, h?: SkillHost): FxDialect => ({
  trail: (x, y, n) => {
    fx.puff('psypuff', x, y, n);
    if (Math.random() < 0.18) fx.ringBurst(x, y, 7, PSY[Math.floor(Math.random() * 4)], 0xffffff, 240);
  },
  hit: (x, y, big) => {
    fx.puff('psypuff', x, y, big ? 5 : 3);
    fx.ringBurst(x, y, big ? 18 : 11, PSY[1], PSY[3], 280);
  },
  spray: (x, y, a, n) => fx.jetOf('psypuff', x, y, a, 8, n),
  smoke: (x, y, n) => fx.puff('psypuff', x, y, n),
  puff: (x, y, n) => fx.puff('psypuff', x, y, n),
  explosion: (x, y, r) => {
    PSY.forEach((c, i) => fx.ringBurst(x, y, r * (0.5 + i * 0.28), c, PSY[(i + 1) % 4], 300 + i * 70));
    fx.starBurst(x, y, r * 0.8, 6, 0xc030ff, 0xffe0ff);
    fx.puff('psypuff', x, y, Math.max(4, Math.round(r / 4)));
  },
  scorch: (x, y, r, ms) => {
    fx.ringBurst(x, y, r, PSY[1], PSY[2], 600);
    fx.puff('psypuff', x, y, Math.max(3, Math.round(r / 6)));
    slowZone(h, x, y, r, ms, 0.75);
  },
  pillar: (x, y, hgt) => {
    for (let i = 0; i < Math.max(3, Math.round(hgt)); i++) fx.ringBurst(x, y - i * 7, 10 - i, PSY[i % 4], 0xffffff, 340);
  },
  streaks: (x1, y1, x2, y2) => fx.scratchMarks(x2, y2, Math.atan2(y2 - y1, x2 - x1), 3, 12, 0xc030ff, 0xffe0ff),
});

/** Băng: hạt tuyết, mảnh băng vỡ, sao 6 cánh, gai băng mọc từ đất, vệt băng trơn làm chậm */
const ice = (fx: Effects, h?: SkillHost): FxDialect => ({
  trail: (x, y, n) => {
    fx.puff('snowdot', x, y, n);
    if (Math.random() < 0.2) fx.puff('flake', x, y, 1);
  },
  hit: (x, y, big) => {
    radialShards(fx.scn, x, y, big ? 9 : 6, big ? 24 : 15);
    fx.puff('snowdot', x, y, 2);
  },
  spray: (x, y, a, n) => fx.jetOf('snowdot', x, y, a, 10, n),
  smoke: (x, y, n) => fx.puff('flake', x, y, n),
  puff: (x, y, n) => fx.puff('snowdot', x, y, n),
  explosion: (x, y, r) => shardStar(fx, x, y, r),
  scorch: (x, y, r, ms) => {
    frostSheet(fx.scn, x, y, r, ms);
    slowZone(h, x, y, r, ms, 0.6);
  },
  pillar: (x, y, hgt) => iceSpike(fx.scn, x, y, 10 + hgt * 6, 5 + hgt),
  streaks: (x1, y1, x2, y2) => fx.scratchMarks(x2, y2, Math.atan2(y2 - y1, x2 - x1), 3, 12, 0xa8e4ff, 0xffffff),
});

/** Giác đấu: bụi, vụ nổ truyện tranh răng cưa, tia va chạm thẳng, đường tốc độ, vết nứt thẳng + đá văng */
const fighting = (fx: Effects): FxDialect => ({
  trail: (x, y, n) => fx.dustPuff(x, y, n),
  hit: (x, y, big) => {
    powBurst(fx.scn, x, y, big ? 20 : 12, 220);
    impactRays(fx.scn, x, y, 6, 8, big ? 30 : 20, 0xfff06a, 180);
  },
  spray: (x, y, _a, n) => fx.dustPuff(x, y, n),
  smoke: (x, y, n) => fx.dustPuff(x, y, n),
  puff: (x, y, n) => fx.dustPuff(x, y, n),
  explosion: (x, y, r) => {
    powBurst(fx.scn, x, y, r * 0.8, 300);
    impactRays(fx.scn, x, y, 12, r * 0.8, r * 1.6, 0xffffff, 280);
    fx.debrisBurst(x, y, 10);
  },
  scorch: (x, y, r) => groundCracks(fx.scn, x, y, r * 0.9, 4, 1200, 0),
  pillar: (x, y) => fx.dustPuff(x, y, 4),
  streaks: (x1, y1, x2, y2) => speedLines(fx.scn, x1, y1, x2, y2, 5, 0xffffff),
});


const mk = (fx: Effects, tex: string, tint: number | undefined, fill: number, edge: number, h?: SkillHost, slow = 0, extra?: (x: number, y: number, r: number) => void): FxDialect => ({
  trail: (x, y, n) => scatter(fx.scn, tex, x, y, n, 10, tint, 0.7),
  hit: (x, y, big) => scatter(fx.scn, tex, x, y, big ? 9 : 5, big ? 34 : 22, tint),
  spray: (x, y, a, n) => fx.jetOf(tex, x, y, a, 8, n),
  smoke: (x, y, n) => fx.dustPuff(x, y, n),
  puff: (x, y, n) => scatter(fx.scn, tex, x, y, n, 12, tint, 0.8),
  explosion: (x, y, r) => {
    scatter(fx.scn, tex, x, y, Math.max(6, Math.round(r / 2)), r * 1.8, tint);
    fx.dustPuff(x, y, 3);
    extra?.(x, y, r);
  },
  scorch: (x, y, r, ms) => {
    patch(fx.scn, x, y, r, ms, fill, edge, 0.7);
    if (slow) slowZone(h, x, y, r, ms, slow);
  },
  pillar: (x, y) => scatter(fx.scn, tex, x, y, 4, 14, tint),
  streaks: (x1, y1, x2, y2) => fx.scratchMarks(x2, y2, Math.atan2(y2 - y1, x2 - x1), 3, 12, edge, fill),
});
const dragon = (fx: Effects): FxDialect => mk(fx, 'scaleD', undefined, 0x2a3aaa, 0xffd34a);
const rock = (fx: Effects): FxDialect => mk(fx, 'boulderB', undefined, 0x6a5a48, 0x2a2018, undefined, 0, (x, y, r) => groundCracks(fx.scn, x, y, r, 4, 900, 0));
const ground = (fx: Effects, h?: SkillHost): FxDialect => mk(fx, 'mudball', undefined, 0xb08850, 0x4a3010, h, 0.6);
const flying = (fx: Effects): FxDialect => mk(fx, 'featherA', undefined, 0xffffff, 0x9ac0e8, undefined, 0, (x, y, r) => vShock(fx.scn, x, y + 4, r * 1.4, 0xffffff));
const poison = (fx: Effects, h?: SkillHost): FxDialect => mk(fx, 'goo', undefined, 0x5aa02a, 0xd8e040, h, 0.75, (x, y, r) => bubbles(fx.scn, x, y, r, 6));
const bug = (fx: Effects): FxDialect => mk(fx, 'bugdot', undefined, 0xe8e8d8, 0x7a8a3a);
const normal = (fx: Effects): FxDialect => mk(fx, 'star5', undefined, 0xffffff, 0xc8c8c8);

/** Hệ chưa có bộ hiệu ứng riêng: dùng hạt của chiêu (move.particle) + tia sáng chung */
const generic = (fx: Effects, m: MoveDef): FxDialect => {
  const tex = m.particle ?? 'spark';
  return {
    trail: (x, y, n) => fx.puff(tex, x, y, n),
    hit: (x, y, big) => {
      fx.sparkBurst(x, y, big ? 8 : 5);
      fx.puff(tex, x, y, big ? 4 : 2);
    },
    spray: (x, y, a, n) => fx.jetOf(tex, x, y, a, 5, n),
    smoke: (x, y, n) => fx.dustPuff(x, y, n),
    puff: (x, y, n) => fx.puff(tex, x, y, n),
    explosion: (x, y, r) => {
      fx.sparkBurst(x, y, 14);
      fx.puff(tex, x, y, Math.round(r / 4));
    },
    scorch: () => {},
    pillar: (x, y) => fx.puff(tex, x, y - 6, 3),
    streaks: (_x1, _y1, x2, y2) => fx.sparkBurst(x2, y2, 8),
  };
};

/** h (tuỳ chọn): cho phép vết lưu lại (vũng nước, tĩnh điện) tác động lên địch */
export function dialectFor(id: FxDialectId, fx: Effects, m: MoveDef, h?: SkillHost): FxDialect {
  switch (id) {
    case 'fire': return fire(fx);
    case 'water': return water(fx, h);
    case 'electric': return electric(fx, h);
    case 'grass': return grass(fx, h);
    case 'ghost': return ghost(fx, h);
    case 'psychic': return psy(fx, h);
    case 'ice': return ice(fx, h);
    case 'fighting': return fighting(fx);
    case 'dragon': return dragon(fx);
    case 'rock': return rock(fx);
    case 'ground': return ground(fx, h);
    case 'flying': return flying(fx);
    case 'poison': return poison(fx, h);
    case 'bug': return bug(fx);
    case 'normal': return normal(fx);
    default: return generic(fx, m);
  }
}
