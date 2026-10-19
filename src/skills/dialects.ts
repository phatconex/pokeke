// "Bộ từ vựng" hiệu ứng của nguyên mẫu chiêu: cùng một nguyên mẫu (đạn, dòng phun, cầu nổ...) nói bằng
// hạt lửa, tia điện, bong bóng... tùy hệ. Thêm hệ mới = thêm một mục trong DIALECTS (hoặc dùng 'generic').
import type { Effects } from '../fx/Effects';
import type { MoveDef } from '../data/moveKit';
import type { SkillHost } from './host';
import type { FxDialectId } from './types';

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
    default: return generic(fx, m);
  }
}
