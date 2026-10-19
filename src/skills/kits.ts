// Bộ chiêu theo HỆ (mặc định) + ghi đè theo LOÀI + BẬC theo cấp – toàn bộ là cấu hình.
// resolveSkill(loài, cấp, ô, chiêu) → SkillSpec (nguyên mẫu + tham số cuối cùng + năng lượng), hoặc archetype null = đường cast cũ.
//
// Thêm nhanh:
//  • Loài mới dùng nguyên mẫu có sẵn: cho loài dùng chiêu có `archetype` (vd. 'emberC') trong pokemon.ts, HOẶC
//      SPECIES_KITS.vulpix = { slots: { J: { archetype: 'bolt' } } }   // Đốm Lửa thường của Vulpix → đạn lửa có bậc
//  • Hệ mới: TYPE_KITS.electric = { bolt: { params: { dialect: 'generic', trail: 'thick' }, tiers: [{ minLevel: 20, split: 3 }] } }
//  • Bậc mới: thêm { minLevel: 40, scale: 1.6, cost: 7 } vào tiers của mục tương ứng.
import { combatProfile } from '../config/balance';
import type { MoveDef } from '../data/moveKit';
import type { SkillSlot } from '../data/pokemon';
import { TYPE_COLOR, type PokemonType } from '../data/types';
import {
  AbsoluteZeroParams, ArchetypeId, ArchetypeParamMap, BloomParams, IMPLEMENTED_ARCHETYPES, InfernoParams, KitEntry, SkillSpec, SpeciesKit, ThunderstormParams, TierDef, TimeStopParams, TsunamiParams, TypeKit,
  UltArchetypeId, UltParamMap, UltSpec,
} from './types';

// ---------------------------------------------------------------------------------- mặc định chung (mọi hệ)

const shade = (c: number, k: number) => {
  const f = (v: number) => Math.max(0, Math.min(255, Math.round(k >= 0 ? v + (255 - v) * k : v * (1 + k))));
  return (f((c >> 16) & 255) << 16) | (f((c >> 8) & 255) << 8) | f(c & 255);
};

/** Tham số gốc của từng nguyên mẫu – suy ra màu từ hệ của chiêu, hiệu ứng 'generic' */
export const ARCHETYPE_DEFAULTS: { [A in ArchetypeId]: (m: MoveDef) => ArchetypeParamMap[A] } = {
  bolt: () => ({ dialect: 'generic', scale: 1, trail: 'thin', trailPuffChance: 0.15, split: 1, splitSpreadDeg: 9, splitPowerMult: 0.62 }),
  dashStrike: () => ({ dialect: 'generic', dashMs: 150, iframeExtraMs: 160, trailCount: 1, streaks: true, impactShake: [0.004, 110], impactSfx: null }),
  stream: (m) => {
    const c = TYPE_COLOR[m.type];
    return {
      dialect: 'generic', telegraphMs: 300, tickMs: 150, turnRate: 1.4, telegraphTurn: 20, totalPowerMult: 1.1, tickKnockback: 12,
      telegraphColor: shade(c, 0.3), telegraphRing: c,
      layers: [
        { len: 0.92, w0: 3, w1: 1, color: shade(c, -0.35), alpha: 0.45 },
        { len: 0.8, w0: 2.5, w1: 0.66, color: c, alpha: 0.6 },
        { len: 0.6, w0: 1.5, w1: 0.3, color: shade(c, 0.6), alpha: 0.75 },
      ],
    };
  },
  blast: (m) => {
    const c = TYPE_COLOR[m.type];
    return {
      dialect: 'generic', telegraphMs: 400, speed: 420, hitStopMs: 60, arcHeight: 28, ballTexture: m.texture ?? 'softglow', ballScale: 2.2, haloScale: 2.6,
      haloTint: c, telegraphLine: shade(c, 0.35), telegraphFill: c, telegraphFill2: shade(c, 0.2), telegraphStroke: shade(c, 0.45),
      linger: null,
    };
  },
  nova: (m) => {
    const c = TYPE_COLOR[m.type];
    return {
      dialect: 'generic', pulses: 1, pulseGapMs: 280, pulseGrowth: 1.15, delayMs: 120, expandMs: 320, push: Math.round(m.knockback * 1.5), pulsePower: [1, 0.5],
      atTarget: false, squash: 0.75, fill: c, fillAlpha: 0.18,
      rings: [{ color: shade(c, -0.3), width: 6, alpha: 0.7, r: 1 }, { color: shade(c, 0.5), width: 3, alpha: 0.9, r: 0.92 }, { color: 0xffffff, width: 1.5, alpha: 0.8, r: 0.8 }],
      sprayCount: 14, crests: 0, shake: [0.01, 260], residue: null, hitStopMs: 50,
    };
  },
  chain: (m) => {
    const c = TYPE_COLOR[m.type];
    return {
      dialect: 'generic', range: 190, jumps: m.chain ?? 3, jumpRange: 130, falloff: 0.8, jumpDelayMs: 70, paralyzeChance: m.status?.chance ?? 0.2, hitStopMs: 45,
      color: c, core: 0xffffff, width: 3, jitter: 9, flash: true, residue: null,
    };
  },
  rain: (m) => {
    const c = TYPE_COLOR[m.type];
    return {
      dialect: 'generic', count: m.strikes ?? 3, spread: 46, seekEnemies: true, telegraphMs: 520, staggerMs: 140, kind: 'bolt', powerMult: 0.7,
      color: c, core: shade(c, 0.7), telegraphColor: c, hitStopMs: 40, shake: [0.008, 140], residue: null,
    };
  },
  whip: () => ({
    dialect: 'grass', style: 'lash', thick: 4, reach: 60, halfAngleDeg: 60, extendMs: 120, holdMs: 60, retractMs: 140, lungeMult: 0, shake: [0.004, 100], stopMs: 40,
  }),
  cloud: () => ({
    dialect: 'grass', colors: [[0xd8f060, 0xb8e050, 0xeaff8a]], halfDeg: 38, range: 70, puffN: 34, lingerMs: 2000, tickMs: 400, totalPowerMult: 1,
    statuses: [{ kind: 'sleep', chance: 0.6, ms: 1800 }], shake: [0.002, 80],
  }),
  blizzard: () => ({
    dialect: 'ice', windupMs: 520, reach: 90, r: 84, ms: 2400, tickMs: 400, count: 8, fallGapMs: 90, fallMs: 190, icicleH: 70, powerMult: 0.9, shake: [0.004, 100],
  }),
  lance: () => ({
    dialect: 'ice', telegraphMs: 320, len: 150, segs: 6, growMs: 480, w: 6, growH: 4, branch: false, powerMult: 1,
    frost: { n: 4, r: 14, ms: 2600 },
  }),
  gale: () => ({ dialect: 'ice', windupMs: 260, len: 110, wid: 36, ms: 1000, tickMs: 260, streaks: 3, powerMult: 0.45 }),
  telekinesis: () => ({
    dialect: 'psychic', r: 60, telegraphMs: 420, pullMs: 320, holdMs: 600, liftH: 18, pull: true, slamMult: 1,
    colors: [0x3a5aff, 0x7a2aff, 0xc030ff, 0xff40c8], hitStopMs: 60,
  }),
  tether: () => ({
    dialect: 'grass', flyMs: 360, arcH: 26, range: 240, drainMs: 3000, pulseMs: 500, spread: 1, spreadRange: 90, spreadDelayMs: 900,
  }),
};

const INFERNO_DEFAULTS: InfernoParams = {
  dialect: 'fire', windupMs: 800, flash: [255, 140, 40], shockFill: 0xe8401a, shockStroke: 0xff7a20,
  rings: [{ r: 52, n: 9 }, { r: 104, n: 14 }, { r: 156, n: 20 }], ringStaggerMs: 200, ringPower: 0.35,
  meteor: { flyMs: 260, fromDx: 70, fromDy: -150, scale: 2.4, haloScale: 3, haloTint: 0xe8501a, scorchR: 22, scorchMs: 3000, firstMs: 520, perTargetMs: 90, perHitMs: 300 },
  extraMeteors: 7,
};

const TSUNAMI_DEFAULTS: TsunamiParams = {
  dialect: 'water', windupMs: 800, flash: [120, 200, 255], sweepMs: 1100, waveThick: 120, waveColors: [0x123a80, 0x1f5ab8, 0x3a8ae0, 0x8ad8ff, 0xe8fbff],
  wavePower: 0.8, whirlpools: { max: 4, r: 34, ms: 2200, tickMs: 300, power: 0.08, pull: 90, delayMs: 120 },
};

const THUNDERSTORM_DEFAULTS: ThunderstormParams = {
  dialect: 'electric', windupMs: 800, flash: [255, 250, 200], darken: 0.45, darkenMs: 2600, perTargetMs: 110, perHitMs: 360, firstMs: 380,
  extraStrikes: 10, strikeR: 26, finaleChain: 6, finalePower: 0.35, color: 0xf8d030, core: 0xffffff,
};

const BLOOM_DEFAULTS: BloomParams = {
  dialect: 'grass', windupMs: 800, flash: [190, 255, 160], rings: [], ringStaggerMs: 220, ringPower: 0.25, firstMs: 480, perTargetMs: 90, perHitMs: 320,
  rootH: 6, rootSpikes: 4, bloom: null, moss: null, shake: 0.02,
};

const TIMESTOP_DEFAULTS: TimeStopParams = {
  dialect: 'psychic', windupMs: 700, r: 230, darken: 0.5, freezeMs: 2200, liftMs: 500, liftH: 30, blades: 10, orbitFromMs: 300, launchMs: 1300, bladeFlyMs: 260,
  bladePower: 0.45, slamPower: 1.1, colors: [0x3a5aff, 0x7a2aff, 0xc030ff, 0xff40c8],
};

const ABSZERO_DEFAULTS: AbsoluteZeroParams = { dialect: 'ice', windupMs: 700, r: 200, freezeMs: 2000, slamPower: 0.8 };

const ULT_DEFAULTS: { [U in UltArchetypeId]: UltParamMap[U] } = {
  inferno: INFERNO_DEFAULTS, tsunami: TSUNAMI_DEFAULTS, thunderstorm: THUNDERSTORM_DEFAULTS, bloom: BLOOM_DEFAULTS, timestop: TIMESTOP_DEFAULTS, absolutezero: ABSZERO_DEFAULTS,
};

// ---------------------------------------------------------------------------------- bộ chiêu theo hệ

export const TYPE_KITS: Partial<Record<PokemonType, TypeKit>> = {
  // Lửa: tinh chỉnh từ nguyên mẫu Charmeleon
  fire: {
    bolt: {
      params: { dialect: 'fire', scale: 1, trail: 'thin', trailPuffChance: 0.25, split: 1, splitSpreadDeg: 9, splitPowerMult: 0.62 },
      tiers: [
        { minLevel: 16, scale: 1.35, hitRadius: 5, trail: 'thick' },
        { minLevel: 28, split: 2 },
      ],
    },
    dashStrike: { params: { dialect: 'fire', dashMs: 150, iframeExtraMs: 160, trailCount: 2, streaks: true, impactShake: [0.004, 110], impactSfx: 'flame' } },
    stream: {
      params: {
        dialect: 'fire', telegraphMs: 300, tickMs: 150, turnRate: 1.4, telegraphTurn: 20, totalPowerMult: 1.1, tickKnockback: 12,
        telegraphColor: 0xffa040, telegraphRing: 0xff6a20,
        layers: [
          { len: 0.92, w0: 3, w1: 1, color: 0xc8300c, alpha: 0.45 },
          { len: 0.8, w0: 2.5, w1: 0.66, color: 0xff7a1a, alpha: 0.6 },
          { len: 0.6, w0: 1.5, w1: 0.3, color: 0xffe070, alpha: 0.75 },
        ],
      },
    },
    blast: {
      params: {
        dialect: 'fire', telegraphMs: 400, speed: 420, hitStopMs: 60, arcHeight: 28, ballTexture: 'fireball', ballScale: 2.2, haloScale: 2.6, haloTint: 0xe8501a,
        telegraphLine: 0xffb050, telegraphFill: 0xff5a14, telegraphFill2: 0xff8a24, telegraphStroke: 0xffc050,
        linger: { ms: 2500, tickMs: 400, powerMult: 0.1, radiusMult: 0.7, color: 0xff5a14 },
      },
    },
    inferno: {},
  },
  // Nước (Squirtle → Wartortle → Blastoise): giọt nước, tóe nước, bọt, vũng nước làm chậm
  water: {
    bolt: {
      params: { dialect: 'water', scale: 1, trail: 'thin', trailPuffChance: 0.3 },
      tiers: [{ minLevel: 14, scale: 1.3, hitRadius: 5, trail: 'thick' }, { minLevel: 30, split: 2, splitSpreadDeg: 7, splitPowerMult: 0.66 }],
    },
    dashStrike: { params: { dialect: 'water', dashMs: 170, iframeExtraMs: 180, trailCount: 2, streaks: true, impactShake: [0.005, 120], impactSfx: 'water' } },
    stream: {
      params: {
        dialect: 'water', telegraphMs: 380, tickMs: 140, turnRate: 1.0, telegraphTurn: 14, totalPowerMult: 1.2, tickKnockback: 70,
        telegraphColor: 0x8ad8ff, telegraphRing: 0x3a9ae8,
        layers: [
          { len: 0.98, w0: 4, w1: 1.05, color: 0x1a5ab0, alpha: 0.55 },
          { len: 0.94, w0: 3, w1: 0.8, color: 0x3a9ae8, alpha: 0.7 },
          { len: 0.9, w0: 2, w1: 0.45, color: 0xbfefff, alpha: 0.85 },
          { len: 0.85, w0: 1, w1: 0.18, color: 0xffffff, alpha: 0.9 },
        ],
      },
      tiers: [{ minLevel: 25, lenMult: 1.12 }],
    },
    nova: {
      params: {
        dialect: 'water', pulses: 1, pulseGapMs: 300, pulseGrowth: 1.2, delayMs: 140, expandMs: 380, push: 340, pulsePower: [1, 0.55, 0.45], squash: 0.72,
        fill: 0x3a8ae0, fillAlpha: 0.22,
        rings: [{ color: 0x1a5ab0, width: 8, alpha: 0.75, r: 1 }, { color: 0x6ac0ff, width: 4, alpha: 0.9, r: 0.94 }, { color: 0xffffff, width: 2, alpha: 0.85, r: 0.87 }],
        sprayCount: 18, crests: 10, shake: [0.012, 300], residue: { count: 3, r: 16, ms: 2600 }, hitStopMs: 50,
      },
    },
    tsunami: {},
  },
  // Điện (Pikachu → Raichu): tia lửa điện, tia gấp khúc, chớp sáng, vết tĩnh điện
  electric: {
    bolt: {
      params: { dialect: 'electric', scale: 1, trail: 'thin', trailPuffChance: 0.2, zigzag: 0xf8d030, chain: 0 },
      tiers: [{ minLevel: 18, chain: 1 }, { minLevel: 28, chain: 2, scale: 1.25 }],
    },
    dashStrike: {
      params: { dialect: 'electric', dashMs: 120, iframeExtraMs: 160, trailCount: 2, streaks: true, impactShake: [0.004, 100], impactSfx: 'zap', afterimages: 4, afterimageTint: 0xfff27a },
    },
    chain: {
      params: { dialect: 'electric', range: 200, jumps: 3, jumpRange: 130, falloff: 0.82, jumpDelayMs: 70, paralyzeChance: 0.35, color: 0xf8d030, core: 0xffffff, width: 3, jitter: 10 },
      tiers: [{ minLevel: 24, jumps: 4 }],
    },
    rain: {
      params: {
        dialect: 'electric', count: 3, spread: 46, seekEnemies: true, telegraphMs: 560, staggerMs: 150, kind: 'bolt', powerMult: 0.7,
        color: 0xf8d030, core: 0xffffff, telegraphColor: 0xf8d030, residue: { r: 16, ms: 1600 },
      },
    },
    thunderstorm: {},
  },
  // Cỏ (Bulbasaur → Ivysaur → Venusaur): lá, cánh hoa, bào tử, rễ gai; vệt rêu gai làm chậm
  grass: {
    bolt: { params: { dialect: 'grass', scale: 1, trail: 'thin', trailPuffChance: 0.25 } },
    dashStrike: { params: { dialect: 'grass', dashMs: 150, iframeExtraMs: 160, trailCount: 2, streaks: true, impactShake: [0.004, 110], impactSfx: 'leafHi' } },
    stream: {
      params: {
        dialect: 'grass', telegraphMs: 300, tickMs: 130, turnRate: 1.2, telegraphTurn: 16, totalPowerMult: 1.1, tickKnockback: 40,
        telegraphColor: 0xc8f890, telegraphRing: 0x4cb23c,
        layers: [
          { len: 0.95, w0: 3, w1: 1, color: 0x2f7a2c, alpha: 0.5 },
          { len: 0.85, w0: 2.2, w1: 0.65, color: 0x6ac048, alpha: 0.7 },
          { len: 0.65, w0: 1.4, w1: 0.3, color: 0xe8ffc0, alpha: 0.9 },
        ],
      },
    },
    blast: {
      params: {
        dialect: 'grass', telegraphMs: 400, speed: 400, hitStopMs: 50, arcHeight: 34, ballTexture: 'seed', ballScale: 1.8, haloScale: 2, haloTint: 0x78d060,
        telegraphLine: 0xb8f080, telegraphFill: 0x3f9a3a, telegraphFill2: 0x78d060, telegraphStroke: 0xc8f890, linger: null,
      },
    },
    nova: {
      params: {
        dialect: 'grass', pulses: 1, pulseGapMs: 280, pulseGrowth: 1.2, delayMs: 140, expandMs: 380, push: 260, pulsePower: [1, 0.6], squash: 0.75, fill: 0x4cb23c, fillAlpha: 0.18,
        rings: [{ color: 0x2f7a2c, width: 6, alpha: 0.75, r: 1 }, { color: 0xc8f890, width: 3, alpha: 0.9, r: 0.93 }], sprayCount: 14, crests: 0, shake: [0.008, 220], residue: null, hitStopMs: 40,
      },
    },
    rain: {
      params: {
        dialect: 'grass', count: 4, spread: 60, seekEnemies: true, telegraphMs: 560, staggerMs: 120, kind: 'root', powerMult: 0.7,
        color: 0x4cb23c, core: 0xc8f890, telegraphColor: 0x4cb23c, hitStopMs: 50, shake: [0.01, 180], residue: { r: 24, ms: 2800 },
      },
    },
    bloom: {},
  },
  ghost: {
    bolt: { params: { dialect: 'ghost', scale: 1, trail: 'thin', trailPuffChance: 0.4 } },
    dashStrike: { params: { dialect: 'ghost', dashMs: 140, iframeExtraMs: 160, trailCount: 2, streaks: true, impactShake: [0.003, 100], impactSfx: 'swap' } },
    stream: {
      params: {
        dialect: 'ghost', telegraphMs: 300, tickMs: 140, turnRate: 1.3, telegraphTurn: 16, totalPowerMult: 1.1, tickKnockback: 10,
        telegraphColor: 0xd0b0ff, telegraphRing: 0x7a50c0,
        layers: [
          { len: 0.95, w0: 3, w1: 1, color: 0x2a1448, alpha: 0.55 },
          { len: 0.85, w0: 2.2, w1: 0.65, color: 0x6a40a8, alpha: 0.7 },
          { len: 0.65, w0: 1.4, w1: 0.3, color: 0xe0d0ff, alpha: 0.9 },
        ],
      },
    },
    blast: {
      params: {
        dialect: 'ghost', telegraphMs: 420, speed: 380, hitStopMs: 60, arcHeight: 22, ballTexture: 'shadowball', ballScale: 2, haloScale: 2.4, haloTint: 0x6a40a8,
        telegraphLine: 0xb890ff, telegraphFill: 0x3a2060, telegraphFill2: 0x6a40a8, telegraphStroke: 0xd8c0ff, linger: null,
      },
    },
    nova: {
      params: {
        dialect: 'ghost', pulses: 1, pulseGapMs: 280, pulseGrowth: 1.2, delayMs: 140, expandMs: 380, push: 160, pulsePower: [1, 0.6], squash: 0.75, fill: 0x6a40a8, fillAlpha: 0.2,
        rings: [{ color: 0x3a2060, width: 6, alpha: 0.75, r: 1 }, { color: 0xd8c0ff, width: 3, alpha: 0.9, r: 0.93 }], sprayCount: 10, crests: 0, shake: [0.006, 180], residue: null, hitStopMs: 40,
      },
    },
    cloud: { params: { dialect: 'ghost', colors: [[0x4a2a80, 0x7a50b8, 0xa888e0]] } },
  },
  psychic: {
    bolt: { params: { dialect: 'psychic', scale: 1, trail: 'thin', trailPuffChance: 0.35 } },
    dashStrike: { params: { dialect: 'psychic', dashMs: 130, iframeExtraMs: 160, trailCount: 2, streaks: true, impactShake: [0.003, 100], impactSfx: 'swap' } },
    stream: {
      params: {
        dialect: 'psychic', telegraphMs: 300, tickMs: 130, turnRate: 1.3, telegraphTurn: 16, totalPowerMult: 1.1, tickKnockback: 20,
        telegraphColor: 0xd8c0ff, telegraphRing: 0x7a2aff,
        layers: [
          { len: 0.95, w0: 3, w1: 1, color: 0x3a5aff, alpha: 0.5 },
          { len: 0.85, w0: 2.2, w1: 0.65, color: 0xc030ff, alpha: 0.7 },
          { len: 0.65, w0: 1.4, w1: 0.3, color: 0xffd0f4, alpha: 0.92 },
        ],
      },
    },
    blast: {
      params: {
        dialect: 'psychic', telegraphMs: 440, speed: 360, hitStopMs: 70, arcHeight: 20, ballTexture: 'psyball', ballScale: 2.2, haloScale: 2.6, haloTint: 0xc030ff,
        telegraphLine: 0xd8c0ff, telegraphFill: 0x4a1a90, telegraphFill2: 0xc030ff, telegraphStroke: 0xffd0f4, linger: null,
      },
    },
    nova: {
      params: {
        dialect: 'psychic', pulses: 1, pulseGapMs: 260, pulseGrowth: 1.2, delayMs: 120, expandMs: 360, push: 180, pulsePower: [1, 0.6], squash: 0.75, fill: 0x7a2aff, fillAlpha: 0.14,
        rings: [{ color: 0x3a5aff, width: 4, alpha: 0.8, r: 1 }, { color: 0xc030ff, width: 4, alpha: 0.85, r: 0.86 }, { color: 0xff40c8, width: 3, alpha: 0.9, r: 0.72 }],
        sprayCount: 8, crests: 0, shake: [0.006, 180], residue: null, hitStopMs: 40,
      },
    },
  },
  ice: {
    bolt: { params: { dialect: 'ice', scale: 1, trail: 'thin', trailPuffChance: 0.35, texPick: ['iceShardB', 'iceShardA'] } },
    dashStrike: { params: { dialect: 'ice', dashMs: 130, iframeExtraMs: 140, trailCount: 1, streaks: true, impactShake: [0.003, 100], impactSfx: 'waterHi' } },
    stream: {
      params: {
        dialect: 'ice', telegraphMs: 300, tickMs: 140, turnRate: 1.2, telegraphTurn: 16, totalPowerMult: 1.1, tickKnockback: 8,
        telegraphColor: 0xe8fbff, telegraphRing: 0x5ab8f0,
        layers: [
          { len: 0.95, w0: 3, w1: 1, color: 0x2a78c8, alpha: 0.5 },
          { len: 0.85, w0: 2.2, w1: 0.65, color: 0x7ad0ff, alpha: 0.75 },
          { len: 0.65, w0: 1.4, w1: 0.3, color: 0xffffff, alpha: 0.95 },
        ],
      },
    },
    blizzard: { params: { dialect: 'ice' } },
    lance: { params: { dialect: 'ice' } },
    gale: { params: { dialect: 'ice' } },
    absolutezero: { dialect: 'ice' },
  },
  // các hệ khác: chưa có bộ riêng → chiêu có archetype dùng ARCHETYPE_DEFAULTS (màu theo hệ, hiệu ứng 'generic');
  // chiêu không có archetype giữ nguyên đường cast cũ.
};

// ---------------------------------------------------------------------------------- ghi đè theo loài

export const SPECIES_KITS: Record<string, SpeciesKit> = {
  // ô J/K/L/U của Charmeleon dùng emberC/fireFangC/flamethrowerC/fireBlastC (có archetype trong moves.ts)
  charmeleon: { ult: 'inferno' },
  // ===== Dòng Lửa còn lại: Charmander nhỏ & lanh · Charmeleon (bản duyệt, giữ nguyên ở trên) · Charizard to, có cánh =====
  // Charmander: đốm lửa nhỏ vệt ngắn · lao ngắn + vài nhát cào nhỏ (không lửa) · luồng lửa mảnh ngắn · cầu lửa nhỏ nổ hẹp
  charmander: {
    kitType: 'fire',
    slots: {
      J: { archetype: 'bolt', params: { scale: 0.62, trail: 'thin', trailPuffChance: 0.04, speedMult: 1.05 }, tiers: [] },
      K: {
        archetype: 'dashStrike',
        params: { dashMs: 105, lungeMult: 1, iframeExtraMs: 100, trailCount: 0, streaks: false, impactShake: [0.002, 70], impactSfx: null, startSfx: 'dash', scratch: { n: 3, len: 12, color: 0xdfe4ee, core: 0xffffff } },
        tiers: [],
      },
      L: {
        archetype: 'stream',
        params: {
          telegraphMs: 170, tickMs: 120, turnRate: 1.8, totalPowerMult: 1, tickKnockback: 18, sprayMult: 0.45, shake: [0, 0],
          telegraphColor: 0xffc070, telegraphRing: 0xff8a30,
          layers: [{ len: 0.9, w0: 1.5, w1: 0.8, color: 0xe8501a, alpha: 0.5 }, { len: 0.7, w0: 1, w1: 0.4, color: 0xffd060, alpha: 0.85 }],
        },
        tiers: [],
      },
      U: {
        archetype: 'blast',
        params: { telegraphMs: 230, speed: 580, hitStopMs: 25, arcHeight: 12, ballScale: 1.3, haloScale: 1.5, linger: null, shake: [0.006, 200] },
        tiers: [],
      },
    },
  },
  // Charizard: 3 cầu lửa to vệt dày + chớp nòng · hai nhát chém lưỡi liềm lao qua · cột lửa khổng lồ quét chậm · sao lửa 5 cánh; Inferno khổng lồ, cất cánh
  charizard: {
    kitType: 'fire', ult: 'inferno',
    ultParams: {
      windupMs: 900, flash: [255, 170, 60], rings: [{ r: 64, n: 12 }, { r: 128, n: 18 }, { r: 192, n: 26 }, { r: 256, n: 32 }], ringStaggerMs: 190, ringPower: 0.3, pillarH: 6.5,
      meteor: { flyMs: 300, fromDx: 110, fromDy: -230, scale: 3.6, haloScale: 4.8, haloTint: 0xe8501a, scorchR: 34, scorchMs: 3800, firstMs: 700, perTargetMs: 90, perHitMs: 300 },
      extraMeteors: 12, lift: { h: 46, ms: 2700 }, flare: { r: 150, color: 0xe8401a, color2: 0xffe070, pillars: 16 },
    },
    slots: {
      J: {
        archetype: 'bolt',
        params: {
          scale: 1.45, hitRadius: 6, trail: 'thick', trailPuffChance: 0.55, split: 3, splitSpreadDeg: 16, splitPowerMult: 0.62, speedMult: 1.05,
          muzzle: { color: 0xffc060, size: 15, shake: [0.003, 80] }, fireSfx: 'flame',
        },
        tiers: [],
      },
      K: {
        archetype: 'dashStrike',
        params: {
          dashMs: 170, lungeMult: 1, iframeExtraMs: 240, trailCount: 3, streaks: false, afterimages: 5, afterimageTint: 0xff9a40, afterimageMs: 360,
          arc: { r: 48, color: 0xff7a1a, core: 0xfff0b0 }, arc2: { r: 34, color: 0xe8401a, core: 0xffd070 }, impactShake: [0.012, 200], impactSfx: 'flame', startSfx: 'roar',
        },
        tiers: [],
      },
      L: {
        archetype: 'stream',
        params: {
          widthMult: 1.6, lenMult: 1.35, turnRate: 0.25, telegraphTurn: 8, telegraphMs: 450, tickMs: 130, totalPowerMult: 1.6, tickKnockback: 60, sprayMult: 1.5,
          sweep: { amp: 0.55, cycles: 0.5, phase: -Math.PI / 2 }, shake: [0.008, 0], muzzle: { color: 0xffc060, size: 24 },
          layers: [
            { len: 1, w0: 6, w1: 1.1, color: 0x8a1408, alpha: 0.5 },
            { len: 0.96, w0: 5, w1: 0.92, color: 0xe8401a, alpha: 0.6 },
            { len: 0.9, w0: 3.6, w1: 0.66, color: 0xff9a28, alpha: 0.75 },
            { len: 0.8, w0: 2, w1: 0.38, color: 0xffe070, alpha: 0.9 },
            { len: 0.6, w0: 1, w1: 0.15, color: 0xfffbe0, alpha: 0.95 },
          ],
        },
        tiers: [],
      },
      U: {
        archetype: 'blast',
        params: {
          telegraphMs: 520, speed: 380, hitStopMs: 90, arcHeight: 40, ballScale: 3.2, haloScale: 4.2, star: { points: 5, color: 0xe8401a, core: 0xffe070 },
          shockwave: { color: 0xff7a20, color2: 0xfff0b0 }, debris: 30, shake: [0.026, 520],
          linger: { ms: 3500, tickMs: 400, powerMult: 0.12, radiusMult: 0.85, color: 0xff5a14 },
        },
        tiers: [],
      },
    },
  },
  // ===== Dòng Cỏ: Bulbasaur chắc & hạt giống · Ivysaur hoa duyên dáng · Venusaur khổng lồ cổ thụ =====
  // Bulbasaur (anime): Lá Sắc 3 lá cong xuyên · Roi Dây Leo (2 dây từ củ, lao ngắn) · Bột Ngủ (quạt bột vàng-xanh) · Hạt Hút Máu (dây hút về củ)
  bulbasaur: {
    kitType: 'grass',
    slots: {
      J: {
        archetype: 'bolt',
        params: { scale: 1.25, trail: 'none', trailPuffChance: 0, windTrail: true, texPick: ['leafA', 'leafB', 'leafA'], curve: { amp: 0.3, freq: 6 }, fireSfx: 'leafHi' },
        tiers: [],
      },
      K: {
        archetype: 'whip',
        params: { style: 'lash', thick: 3.4, reach: 58, halfAngleDeg: 58, extendMs: 130, holdMs: 70, retractMs: 150, lungeMult: 1, push: 230, stopMs: 40, shake: [0.004, 100] },
        tiers: [],
      },
      L: {
        archetype: 'cloud',
        params: { colors: [[0xd8f060, 0xb8e050, 0xeaff8a]], halfDeg: 40, range: 80, puffN: 34, lingerMs: 2000, tickMs: 400, totalPowerMult: 1, statuses: [{ kind: 'sleep', chance: 0.6, ms: 1800 }] },
        tiers: [],
      },
      U: {
        archetype: 'tether',
        params: { flyMs: 340, arcH: 24, range: 240, drainMs: 3000, pulseMs: 500, spread: 1, spreadRange: 90, spreadDelayMs: 900 },
        tiers: [{ minLevel: 16, spread: 2, spreadRange: 110 }],
      },
    },
  },
  // Ivysaur (anime): lốc Lá Sắc · Roi Quật Mạnh (đập từ trên cao) · Bột Độc & Tê (2 màu) · Tia Mặt Trời (hội tụ vào búp hoa); Vũ Điệu Cánh Hoa: 2 dòng cánh hoa xoắn
  ivysaur: {
    kitType: 'grass', ult: 'bloom',
    ultParams: {
      windupMs: 800, flash: [255, 200, 230], shake: 0.016, rings: [], rootH: 0, rootSpikes: 0, bloom: null, moss: null,
      storm: { n: 44, ms: 2400, r: 190, power: 0.1, tickMs: 200, tex: 'petalP', spiral: true }, firstMs: 640, perTargetMs: 80, perHitMs: 320,
    },
    slots: {
      J: {
        archetype: 'bolt',
        params: { scale: 1.5, trail: 'none', trailPuffChance: 0, windTrail: true, texPick: ['leafA', 'leafB'], curve: { amp: 0.25, freq: 5 }, cyclone: { ms: 380, r: 26 }, fireSfx: 'leafHi' },
        tiers: [],
      },
      K: {
        archetype: 'whip',
        params: { style: 'slam', thick: 5, reach: 74, halfAngleDeg: 60, extendMs: 190, holdMs: 120, retractMs: 220, lungeMult: 0, slamR: 36, stunMs: 450, push: 280, crack: true, stopMs: 60, shake: [0.008, 160] },
        tiers: [],
      },
      L: {
        archetype: 'cloud',
        params: {
          colors: [[0xb060e0, 0x8a40c0, 0xd090ff], [0xffe84a, 0xf8d030, 0xfff49a]], halfDeg: 46, range: 98, puffN: 46, lingerMs: 2400, tickMs: 400, totalPowerMult: 1.1,
          statuses: [{ kind: 'poison', chance: 0.6, ms: 3000 }, { kind: 'paralyze', chance: 0.35, ms: 900 }],
        },
        tiers: [],
      },
      U: {
        archetype: 'stream',
        params: {
          telegraphMs: 500, tickMs: 110, turnRate: 0.9, telegraphTurn: 12, totalPowerMult: 1.2, tickKnockback: 40, sprayMult: 1.1, shake: [0.003, 0],
          bulb: { color: 0xfff3a0, color2: 0xb8f060, r: 34, rate: 45 }, scar: 1500, telegraphColor: 0xf8f090, telegraphRing: 0xc8d838,
          layers: [
            { len: 1, w0: 3, w1: 1, color: 0x6ac048, alpha: 0.45 },
            { len: 0.94, w0: 2.2, w1: 0.6, color: 0xc8f060, alpha: 0.75 },
            { len: 0.85, w0: 1.2, w1: 0.28, color: 0xfffbc8, alpha: 0.95 },
          ],
        },
        tiers: [],
      },
    },
  },
  // Venusaur (anime): Bom Hạt 5 viên · Đập Dây Leo chữ X · Tia Mặt Trời Lớn (vệt cỏ rạp) · Cây Cuồng Nộ (làn rễ); Overgrowth: tia rễ khắp sân + đóa hoa khổng lồ
  venusaur: {
    kitType: 'grass', ult: 'bloom',
    ultParams: {
      windupMs: 900, flash: [190, 255, 160], shake: 0.03, rings: [], arms: { n: 8, step: 36, max: 252, delayMs: 36 }, ringStaggerMs: 200, ringPower: 0.18,
      firstMs: 760, perTargetMs: 90, perHitMs: 340, rootH: 7, rootSpikes: 5, moss: { r: 34, ms: 4500 },
      bloom: { r: 110, ms: 1100, power: 0.6, color: 0xf890c0, color2: 0xffe0f0 }, heal: 0.15,
    },
    slots: {
      J: {
        archetype: 'bolt',
        params: {
          scale: 1.8, hitRadius: 7, trail: 'none', trailPuffChance: 0, windTrail: true, speedMult: 1, fireSfx: 'leafLo',
          burst: { n: 5, gapMs: 85, side: 5, powerMult: 1 }, splash: { r: 30, power: 0.35, shake: [0.004, 90], stopMs: 0 },
        },
        tiers: [],
      },
      K: {
        archetype: 'whip',
        params: { style: 'xslam', thick: 6.5, reach: 84, halfAngleDeg: 60, extendMs: 210, holdMs: 140, retractMs: 240, lungeMult: 0.5, slamR: 66, push: 360, crack: true, stopMs: 90, shake: [0.016, 260] },
        tiers: [],
      },
      L: {
        archetype: 'stream',
        params: {
          telegraphMs: 700, tickMs: 100, turnRate: 0.6, telegraphTurn: 10, widthMult: 1.35, lenMult: 1.2, totalPowerMult: 1.4, tickKnockback: 120, sprayMult: 1.5,
          shake: [0.01, 0], bulb: { color: 0xfff0a0, color2: 0xc8f060, r: 62, rate: 80 }, scar: 3000, telegraphColor: 0xfff0a0, telegraphRing: 0xe8c830,
          layers: [
            { len: 1, w0: 7, w1: 1.15, color: 0x4cae3c, alpha: 0.5 },
            { len: 0.97, w0: 5, w1: 0.9, color: 0xb8e860, alpha: 0.7 },
            { len: 0.92, w0: 3.4, w1: 0.62, color: 0xffe860, alpha: 0.9 },
            { len: 0.85, w0: 1.8, w1: 0.3, color: 0xffffff, alpha: 0.95 },
          ],
        },
        tiers: [],
      },
      U: {
        archetype: 'rain',
        params: {
          count: 6, spread: 90, seekEnemies: true, radius: 44, telegraphMs: 650, staggerMs: 90, kind: 'root', powerMult: 0.6, waves: { n: 3, gapMs: 420, power: 0.7 }, spikes: 5, pillarH: 6.5,
          shake: [0.012, 220], hitStopMs: 60, residue: { r: 30, ms: 3500 }, crackTelegraph: true, rootLine: 5, telegraphColor: 0x4cb23c, core: 0xc8f890,
        },
        tiers: [],
      },
    },
  },
  // ===== Dòng Nước: mỗi dạng một "tính cách" – Squirtle nhỏ & bọt bóng · Wartortle nhanh & bọt sóng · Blastoise pháo nặng =====
  // Squirtle: giọt đơn nhỏ vệt mảnh · xoay bọt ngắn · tia nước mảnh ngắn nhanh · gợn sóng nhỏ 1 vòng
  // ===== Dòng Ma: Gastly (khí ma, lẩn quẩn) · Haunter (tinh nghịch, 3 đốm ma, vuốt bóng, tia mê hoặc) · Gengar (to, tối, xung bóng + bùng bóng ma) =====
  // Giữ cơ chế chiêu Ma cũ (tự đuổi, sát thương cố định, tàng hình) – chỉ đổi cách thể hiện
  gastly: {
    kitType: 'ghost',
    slots: {
      J: { archetype: 'bolt', params: { scale: 0.8, trail: 'thin', trailPuffChance: 0.45, speedMult: 0.95 }, tiers: [] },
      K: { archetype: 'dashStrike', params: { dashMs: 110, lungeMult: 1, iframeExtraMs: 100, trailCount: 1, streaks: false, impactShake: [0.002, 70], impactSfx: null, startSfx: 'swap' }, tiers: [] },
      L: { archetype: 'bolt', params: { scale: 1.1, trail: 'thin', trailPuffChance: 0.5 }, tiers: [] },
      U: {
        archetype: 'cloud',
        params: { colors: [[0x4a2a80, 0x7a50b8, 0xa888e0]], halfDeg: 46, range: 84, puffN: 36, lingerMs: 2400, tickMs: 400, totalPowerMult: 1, statuses: [{ kind: 'poison', chance: 0.5, ms: 3000 }, { kind: 'confuse', chance: 0.25, ms: 1500 }] },
        tiers: [],
      },
    },
  },
  haunter: {
    kitType: 'ghost',
    slots: {
      J: { archetype: 'bolt', params: { scale: 0.9, trail: 'thin', trailPuffChance: 0.4, split: 3, splitSpreadDeg: 14, splitPowerMult: 0.62 }, tiers: [] },
      K: {
        archetype: 'dashStrike',
        params: { dashMs: 140, lungeMult: 1.2, iframeExtraMs: 180, trailCount: 2, streaks: true, impactShake: [0.004, 100], impactSfx: 'swap', startSfx: 'swap', scratch: { n: 3, len: 14, color: 0xa080e0, core: 0xf0e0ff } },
        tiers: [],
      },
      L: {
        archetype: 'stream',
        params: {
          widthMult: 0.6, telegraphMs: 260, tickMs: 140, turnRate: 1.6, totalPowerMult: 1, tickKnockback: 0, sprayMult: 0.7,
          telegraphColor: 0xd0b0ff, telegraphRing: 0x7a50c0,
          layers: [{ len: 0.95, w0: 2, w1: 1, color: 0x5a3a90, alpha: 0.55 }, { len: 0.85, w0: 1.2, w1: 0.4, color: 0xe8d8ff, alpha: 0.9 }],
        },
        tiers: [],
      },
    },
  },
  gengar: {
    kitType: 'ghost',
    slots: {
      J: { archetype: 'bolt', params: { scale: 1.9, trail: 'thick', trailPuffChance: 0.55, speedMult: 0.85, powerMult: 1.4 }, tiers: [] },
      L: {
        archetype: 'stream',
        params: {
          widthMult: 1.4, lenMult: 1.2, durMult: 1.2, telegraphMs: 400, tickMs: 120, turnRate: 0.9, totalPowerMult: 1.2, shake: [0.006, 200],
          telegraphColor: 0xb890ff, telegraphRing: 0x4a2a80,
          layers: [{ len: 1, w0: 3.4, w1: 1.4, color: 0x1a0c30, alpha: 0.7 }, { len: 0.9, w0: 2.4, w1: 0.9, color: 0x6a40a8, alpha: 0.8 }, { len: 0.7, w0: 1.4, w1: 0.4, color: 0xf0e8ff, alpha: 0.95 }],
        },
        tiers: [],
      },
      U: {
        archetype: 'blast',
        params: { telegraphMs: 460, speed: 360, hitStopMs: 80, arcHeight: 20, ballScale: 2.6, haloScale: 3, shake: [0.012, 300] },
        tiers: [],
      },
    },
  },
  // ===== Dòng Siêu linh: Abra (nhỏ, vòng ý nghĩ) · Kadabra (hai thìa bay, sóng đôi) · Alakazam (tia Psybeam rộng, Psystrike cầu gai nổ) =====
  // Dịch Chuyển (K) giữ cơ chế cũ
  abra: {
    kitType: 'psychic',
    slots: {
      J: { archetype: 'bolt', params: { scale: 0.85, trail: 'thin', trailPuffChance: 0.3, speedMult: 1.05 }, tiers: [] },
      L: { archetype: 'telekinesis', params: { r: 46, telegraphMs: 360, pullMs: 260, holdMs: 450, liftH: 14, pull: false, slamMult: 1, hitStopMs: 40, shake: [0.006, 160] }, tiers: [] },
    },
  },
  kadabra: {
    kitType: 'psychic',
    ult: 'timestop',
    ultParams: { r: 170, blades: 6, freezeMs: 1800, launchMs: 1050, liftH: 22 },
    slots: {
      J: { archetype: 'bolt', params: { scale: 1, trail: 'thin', trailPuffChance: 0.4, split: 2, splitSpreadDeg: 10, splitPowerMult: 0.62 }, tiers: [] },
      L: { archetype: 'telekinesis', params: { r: 62, telegraphMs: 400, pullMs: 300, holdMs: 650, liftH: 20, pull: true, slamMult: 1.1, hitStopMs: 55, shake: [0.009, 220] }, tiers: [] },
      U: { archetype: 'bolt', params: { scale: 1.2, trail: 'thick', trailPuffChance: 0.5, speedMult: 1.1 }, tiers: [] },
    },
  },
  alakazam: {
    kitType: 'psychic',
    ult: 'timestop',
    slots: {
      J: { archetype: 'bolt', params: { scale: 1.4, trail: 'thick', trailPuffChance: 0.5, speedMult: 1.1, powerMult: 1.2 }, tiers: [] },
      L: {
        archetype: 'stream',
        params: { widthMult: 1.5, lenMult: 1.15, durMult: 1.1, telegraphMs: 380, tickMs: 120, turnRate: 1, totalPowerMult: 1.15, shake: [0.005, 160], ringBeam: { n: 9, colors: [0x3a5aff, 0x7a2aff, 0xc030ff, 0xff40c8], spin: 1.5 } },
        tiers: [],
      },
      U: { archetype: 'telekinesis', params: { r: 96, telegraphMs: 520, pullMs: 380, holdMs: 850, liftH: 30, pull: true, slamMult: 1.6, hitStopMs: 90, shake: [0.016, 340] }, tiers: [] },
    },
  },
  // ===== Dòng Băng: Seel (nhỏ, nhẹ: mảnh băng đơn, tia mảnh, gió tuyết) · Dewgong (3 mảnh xòe, hàng gai băng, tia dày hóa băng đường đi, Bão Tuyết; tuyệt chiêu Không Độ Tuyệt Đối) =====
  // Cơ chế chung của hệ Băng nằm ở BattleScene.damageEnemy: Lạnh cộng dồn (3 → Đóng băng), đòn băng kế tiếp làm VỠ NÁT
  seel: {
    kitType: 'ice',
    slots: {
      J: { archetype: 'bolt', params: { scale: 0.95, trail: 'thin', trailPuffChance: 0.3, texPick: ['iceShardB'], speedMult: 1.05 }, tiers: [] },
      K: {
        archetype: 'dashStrike',
        params: { dashMs: 120, lungeMult: 0.8, iframeExtraMs: 100, trailCount: 0, streaks: false, impactShake: [0.002, 80], impactSfx: null, startSfx: 'waterHi', roots: { n: 3, step: 26, delayMs: 70, h: 1.2 } },
        tiers: [],
      },
      L: { archetype: 'lance', params: { telegraphMs: 260, len: 120, segs: 5, growMs: 400, w: 4, growH: 3, branch: false, powerMult: 1, frost: { n: 3, r: 11, ms: 2400 } }, tiers: [] },
      U: { archetype: 'gale', params: { windupMs: 240, len: 100, wid: 30, ms: 900, tickMs: 260, streaks: 3, powerMult: 0.45 }, tiers: [] },
    },
  },
  dewgong: {
    kitType: 'ice',
    ult: 'absolutezero',
    slots: {
      J: { archetype: 'bolt', params: { scale: 1.5, trail: 'thick', trailPuffChance: 0.4, texPick: ['iceShardA'], split: 3, splitSpreadDeg: 16, splitPowerMult: 0.6, speedMult: 1.05 }, tiers: [] },
      K: {
        archetype: 'dashStrike',
        params: {
          dashMs: 90, lungeMult: 0.5, iframeExtraMs: 160, trailCount: 0, streaks: false, impactShake: [0.008, 160], impactSfx: 'waterLo', startSfx: 'waterLo',
          roots: { n: 6, step: 30, delayMs: 60, h: 2.4 },
        },
        tiers: [],
      },
      L: { archetype: 'lance', params: { telegraphMs: 380, len: 230, segs: 8, growMs: 560, w: 8, growH: 5, branch: true, powerMult: 1.15, frost: { n: 7, r: 18, ms: 3200 } }, tiers: [] },
      U: { archetype: 'blizzard', params: { r: 100, count: 10, ms: 2600, windupMs: 560 }, tiers: [] },
    },
  },
  squirtle: {
    kitType: 'water',
    slots: {
      J: { archetype: 'bolt', params: { scale: 0.75, trail: 'thin', trailPuffChance: 0.08, speedMult: 1.1, fireSfx: 'waterHi' }, tiers: [{ minLevel: 12, scale: 0.9 }] },
      K: {
        archetype: 'dashStrike',
        params: { dashMs: 110, lungeMult: 0.7, iframeExtraMs: 120, trailCount: 1, streaks: false, impactShake: [0.003, 90], bubbleRing: { n: 8, r: 16 }, startSfx: 'waterHi' },
        tiers: [],
      },
      L: {
        archetype: 'stream',
        params: {
          widthMult: 0.5, lenMult: 0.8, durMult: 0.55, telegraphMs: 220, tickMs: 110, turnRate: 1.8, totalPowerMult: 1.0, tickKnockback: 28, sprayMult: 0.6,
          telegraphColor: 0xbfefff, telegraphRing: 0x6ac0ff,
          layers: [{ len: 0.95, w0: 1.5, w1: 0.9, color: 0x5ab0f0, alpha: 0.6 }, { len: 0.9, w0: 1, w1: 0.35, color: 0xe8fbff, alpha: 0.95 }],
        },
        tiers: [],
      },
      U: {
        archetype: 'nova',
        params: {
          radius: 60, pulses: 1, delayMs: 100, expandMs: 300, push: 210, pulsePower: [1], squash: 0.72, fillAlpha: 0.14, crests: 0, sprayCount: 8, shake: [0.005, 160],
          rings: [{ color: 0x6ac0ff, width: 3, alpha: 0.9, r: 1 }, { color: 0xffffff, width: 1.5, alpha: 0.8, r: 0.88 }], residue: { count: 1, r: 12, ms: 1800 }, hitStopMs: 30,
        },
        tiers: [],
      },
    },
  },
  // Wartortle: cặp tia nước nhanh có bọt · chém xoay vẽ cung bọt cong · tia rộng quét qua lại · 2 vòng sóng + xoáy bọt + 5 vũng; sóng thần hình quạt nhanh
  wartortle: {
    kitType: 'water', ult: 'tsunami',
    ultParams: {
      sweepMs: 800, waveThick: 100, fanSlope: 0.85, flashMs: 200, shake: 0.012, waveColors: [0x1a5a98, 0x2f8ad0, 0x5ac0f0, 0xb8f0ff, 0xffffff],
      whirlpools: { max: 3, r: 30, ms: 1800, tickMs: 300, power: 0.08, pull: 90, delayMs: 80 },
    },
    slots: {
      J: {
        archetype: 'bolt',
        params: {
          scale: 1, trail: 'thick', trailPuffChance: 0.5, foamChance: 0.5, speedMult: 1.45, burst: { n: 3, gapMs: 80, side: 7, powerMult: 0.42 }, fireSfx: 'water',
          muzzle: { color: 0xbfefff, size: 8 },
        },
        tiers: [{ minLevel: 25, burst: { n: 4, gapMs: 70, side: 8, powerMult: 0.34 } }],
      },
      K: {
        archetype: 'dashStrike',
        params: {
          dashMs: 160, lungeMult: 1.3, iframeExtraMs: 200, trailCount: 3, streaks: true, impactShake: [0.005, 120], afterimages: 5, afterimageTint: 0x9ad8ff, afterimageMs: 380,
          arc: { r: 40, color: 0x5ab0f0, core: 0xffffff }, startSfx: 'dash',
        },
        tiers: [],
      },
      L: {
        archetype: 'stream',
        params: {
          widthMult: 1.35, lenMult: 1.12, turnRate: 0.25, telegraphTurn: 8, sweep: { amp: 0.62, cycles: 0.75 }, sprayMult: 1.4, foamAlong: 0.6, tickKnockback: 55,
          totalPowerMult: 1.25, tickMs: 120, shake: [0.004, 0],
          layers: [
            { len: 0.98, w0: 4, w1: 1.1, color: 0x2f8ad0, alpha: 0.5 },
            { len: 0.94, w0: 3, w1: 0.85, color: 0x7ad0ff, alpha: 0.7 },
            { len: 0.88, w0: 2, w1: 0.5, color: 0xffffff, alpha: 0.9 },
          ],
        },
        tiers: [],
      },
      U: {
        archetype: 'nova',
        params: {
          radius: 78, pulses: 2, pulseGapMs: 240, pulseGrowth: 1.45, delayMs: 120, expandMs: 340, push: 330, pulsePower: [1, 0.8], crests: 8, crestH: 3, swirl: 6, sprayCount: 22,
          residue: { count: 5, r: 15, ms: 2800 }, shake: [0.01, 240], hitStopMs: 50,
          rings: [{ color: 0x5ab0f0, width: 5, alpha: 0.85, r: 1 }, { color: 0xffffff, width: 2.5, alpha: 0.95, r: 0.93 }],
        },
        tiers: [],
      },
    },
  },
  // Blastoise: đại bác vỏ (đạn to chậm nổ lan) · đập mai (rung nền, vòng xung kích) · pháo đôi dài dày · sóng lớn 3 vòng ngọn cao; sóng thần khổng lồ + 6 xoáy
  blastoise: {
    kitType: 'water', ult: 'tsunami',
    ultParams: {
      sweepMs: 1500, waveThick: 230, flash: [255, 255, 255], flashMs: 520, shake: 0.03, waveColors: [0x0a2a6a, 0x123a80, 0x1f5ab8, 0x3a8ae0, 0x8ad8ff, 0xe8fbff],
      wavePower: 1, whirlpools: { max: 6, r: 42, ms: 2800, tickMs: 280, power: 0.09, pull: 120, delayMs: 100 },
    },
    slots: {
      J: {
        archetype: 'bolt',
        params: {
          scale: 2.3, hitRadius: 9, trail: 'thick', trailPuffChance: 0.55, speedMult: 0.62, lifeMult: 1.3, powerMult: 1.55, fireSfx: 'waterLo',
          muzzle: { color: 0xd8f4ff, size: 20, shake: [0.006, 140] }, splash: { r: 46, power: 0.5, shake: [0.008, 200], stopMs: 70 },
        },
        tiers: [],
      },
      K: {
        archetype: 'dashStrike',
        params: {
          dashMs: 190, lungeMult: 0.32, iframeExtraMs: 260, trailCount: 1, streaks: false, impactShake: [0.016, 260], impactSfx: 'boom', startSfx: 'waterLo',
          shockwave: { r: 74, power: 0.9, push: 420, color: 0x2a6ac8, color2: 0xe8fbff, stopMs: 90 },
        },
        tiers: [],
      },
      L: {
        archetype: 'stream',
        params: {
          beams: 2, beamGap: 26, widthMult: 1.5, lenMult: 1.5, durMult: 1.25, telegraphMs: 420, turnRate: 0.7, totalPowerMult: 1.8, tickKnockback: 120, tickMs: 140, sprayMult: 1.2,
          shake: [0.009, 0], muzzle: { color: 0xd8f4ff, size: 22 },
          layers: [
            { len: 1, w0: 6, w1: 1.15, color: 0x0f3a80, alpha: 0.6 },
            { len: 0.96, w0: 4.5, w1: 0.92, color: 0x2a6ac8, alpha: 0.75 },
            { len: 0.9, w0: 3, w1: 0.58, color: 0x9adcff, alpha: 0.9 },
            { len: 0.82, w0: 1.5, w1: 0.22, color: 0xffffff, alpha: 0.95 },
          ],
        },
        tiers: [],
      },
      U: {
        archetype: 'nova',
        params: {
          radius: 98, pulses: 3, pulseGapMs: 230, pulseGrowth: 1.32, delayMs: 170, expandMs: 420, push: 520, pulsePower: [1, 0.8, 0.7], crests: 16, crestH: 6.5, sprayCount: 30,
          fillAlpha: 0.3, residue: { count: 8, r: 24, ms: 3200 }, shake: [0.022, 460], hitStopMs: 90, flash: [200, 230, 255],
          rings: [{ color: 0x0f3a80, width: 13, alpha: 0.85, r: 1 }, { color: 0x3a8ae0, width: 8, alpha: 0.9, r: 0.95 }, { color: 0xffffff, width: 3, alpha: 0.9, r: 0.88 }],
        },
        tiers: [],
      },
    },
  },
  // ===== Dòng Điện: Pikachu nhanh nhẹn tia nhỏ · Raichu dày, mạnh =====
  // Pikachu: tia gấp khúc mảnh nhanh · lao ngắn bóng mờ mỏng · sét nảy mảnh, nhiều zích zắc · 3 tia sét mảnh, vòng nhỏ
  pikachu: {
    kitType: 'electric',
    slots: {
      J: {
        archetype: 'bolt',
        params: { scale: 0.8, trail: 'thin', trailPuffChance: 0.1, zigzag: 0xf8d030, zigWidth: 1.2, speedMult: 1.2, chain: 0, fireSfx: 'zapHi' },
        tiers: [{ minLevel: 18, chain: 1 }],
      },
      K: {
        archetype: 'dashStrike',
        params: { dashMs: 95, lungeMult: 1, trailCount: 1, afterimages: 3, afterimageTint: 0xfff27a, afterimageMs: 200, impactShake: [0.003, 80], startSfx: 'zapHi' },
        tiers: [],
      },
      L: {
        archetype: 'chain',
        params: { range: 185, jumps: 3, jumpRange: 120, width: 2, jitter: 15, jumpDelayMs: 55, hitStopMs: 30, flash: false, shake: 0.003, residue: null },
        tiers: [{ minLevel: 24, jumps: 4 }],
      },
      U: {
        archetype: 'rain',
        params: { count: 3, spread: 42, radius: 28, telegraphMs: 470, staggerMs: 120, boltWidth: 2.2, shake: [0.005, 100], hitStopMs: 25, residue: null },
        tiers: [],
      },
    },
  },
  // Raichu: tia đôi dày chớp lớn + nổ lan · lao với bóng mờ đậm + xung kích nhỏ · sét 5 lần nảy, tia rất dày · 5 tia lớn, vòng cảnh báo to, tĩnh điện lâu
  raichu: {
    kitType: 'electric', ult: 'thunderstorm',
    slots: {
      J: {
        archetype: 'bolt',
        params: {
          scale: 1.7, hitRadius: 8, trail: 'thick', trailPuffChance: 0.4, zigzag: 0xffd020, zigWidth: 3.2, zigDouble: true, speedMult: 0.9, powerMult: 1.35, chain: 2, fireSfx: 'zapLo',
          muzzle: { color: 0xfff27a, size: 14, shake: [0.004, 90] }, splash: { r: 34, power: 0.4, shake: [0.005, 120], stopMs: 40 },
        },
        tiers: [],
      },
      K: {
        archetype: 'dashStrike',
        params: {
          dashMs: 105, lungeMult: 1.15, trailCount: 4, afterimages: 8, afterimageTint: 0xffa820, afterimageMs: 460, impactShake: [0.01, 170], startSfx: 'zapLo',
          shockwave: { r: 44, power: 0.5, push: 260, color: 0xf8c020, color2: 0xffffff, stopMs: 50 },
        },
        tiers: [],
      },
      L: {
        archetype: 'chain',
        params: {
          range: 215, jumps: 5, jumpRange: 155, width: 5.5, jitter: 7, double: true, jumpDelayMs: 80, hitStopMs: 75, shake: 0.011, color: 0xffd020,
          residue: { r: 16, ms: 1800 },
        },
        tiers: [],
      },
      U: {
        archetype: 'rain',
        params: {
          count: 5, spread: 64, radius: 54, telegraphMs: 640, staggerMs: 100, boltWidth: 8, shake: [0.014, 260], hitStopMs: 70, color: 0xffd020,
          residue: { r: 26, ms: 2800 },
        },
        tiers: [],
      },
    },
  },
};

// ---------------------------------------------------------------------------------- phân giải

export function slotCost(slot: SkillSlot): number {
  return combatProfile().slotCost[slot];
}

/** (loài, cấp, ô, chiêu) → chiêu đã phân giải */
export function resolveSkill(speciesId: string, level: number, slot: SkillSlot, move: MoveDef): SkillSpec {
  const sk = kitFor(speciesId);
  const ov = sk?.slots?.[slot];
  const arch = ov?.archetype ?? move.archetype;
  const legacyCost = ov?.cost ?? slotCost(slot);
  if (!arch || !IMPLEMENTED_ARCHETYPES.includes(arch)) {
    return { archetype: null, cost: legacyCost, tier: 0, tierCount: 0, nextTierAt: null, source: 'legacy' };
  }
  const kitType = (sk?.kitType ?? move.type) as PokemonType;
  const typeEntry = TYPE_KITS[kitType]?.[arch] as KitEntry<object> | undefined;
  const own = ov?.archetype === arch ? (ov as KitEntry<object>) : undefined;
  const params: Record<string, unknown> = { ...ARCHETYPE_DEFAULTS[arch](move), ...typeEntry?.params, ...own?.params };
  const tiers = [...((own?.tiers ?? typeEntry?.tiers ?? []) as TierDef<object>[])].sort((a, b) => a.minLevel - b.minLevel);
  let cost = own?.cost ?? ov?.cost ?? typeEntry?.cost ?? slotCost(slot);
  let tier = 0;
  for (const t of tiers) {
    if (t.minLevel > level) break;
    const { minLevel: _m, cost: c, ...rest } = t as TierDef<object> & Record<string, unknown>;
    Object.assign(params, rest);
    if (c !== undefined) cost = c;
    tier++;
  }
  return {
    archetype: arch, params, cost, tier, tierCount: tiers.length, nextTierAt: tiers[tier]?.minLevel ?? null, source: own ? 'species' : 'move',
  } as unknown as SkillSpec;
}

// ===== Mẫu bộ chiêu có tên: gọi lại bằng 1 dòng cho loài mới =====
//   SPECIES_KITS.vulpix  = { template: 'fire.small' };                       // dùng nguyên mẫu
//   SPECIES_KITS.arcanine = { template: 'fire.big', slots: { J: { params: { scale: 1.1 } } } };  // ghi đè một ô
// Mẫu = các bộ đã duyệt ở trên (Charmander/Charmeleon/Charizard, Squirtle/Wartortle/Blastoise, Bulbasaur/Ivysaur/Venusaur, Pikachu/Raichu).
// Lưu ý: khuôn lấy số (tầm, bề rộng tia, bán kính...) từ chính move → move của loài mới nên dựng giống move mẫu (xem docs/SKILLS_GUIDE.md).
const FIRE_MID_SLOTS: SpeciesKit['slots'] = { J: { archetype: 'bolt' }, K: { archetype: 'dashStrike' }, L: { archetype: 'stream' }, U: { archetype: 'blast' } };
export const KIT_TEMPLATES: Record<string, SpeciesKit> = {
  'fire.small': SPECIES_KITS.charmander,
  'fire.mid': { kitType: 'fire', slots: FIRE_MID_SLOTS, ult: 'inferno' },
  'fire.big': SPECIES_KITS.charizard,
  'water.small': SPECIES_KITS.squirtle,
  'water.swift': SPECIES_KITS.wartortle,
  'water.heavy': SPECIES_KITS.blastoise,
  'grass.small': SPECIES_KITS.bulbasaur,
  'grass.mid': SPECIES_KITS.ivysaur,
  'grass.big': SPECIES_KITS.venusaur,
  'ghost.small': SPECIES_KITS.gastly,
  'ghost.mid': SPECIES_KITS.haunter,
  'ghost.big': SPECIES_KITS.gengar,
  'psychic.small': SPECIES_KITS.abra,
  'psychic.mid': SPECIES_KITS.kadabra,
  'psychic.big': SPECIES_KITS.alakazam,
  'ice.small': SPECIES_KITS.seel,
  'ice.big': SPECIES_KITS.dewgong,
  'electric.small': SPECIES_KITS.pikachu,
  'electric.big': SPECIES_KITS.raichu,
};

/** Bộ chiêu của loài sau khi gộp mẫu (nếu có) với phần ghi đè riêng */
export function kitFor(speciesId: string): SpeciesKit | undefined {
  const own = SPECIES_KITS[speciesId];
  const tpl = own?.template ? KIT_TEMPLATES[own.template] : undefined;
  if (!tpl) return own;
  const slots: NonNullable<SpeciesKit['slots']> = { ...tpl.slots };
  for (const k of Object.keys(own.slots ?? {}) as SkillSlot[]) {
    const o = own.slots![k]!;
    const t = slots[k];
    slots[k] = t && (!o.archetype || o.archetype === t.archetype) ? ({ ...t, ...o, params: { ...(t as { params?: object }).params, ...(o as { params?: object }).params } } as typeof o) : o;
  }
  return { ...tpl, ...own, slots, ultParams: { ...tpl.ultParams, ...own.ultParams } };
}

/** Tuyệt chiêu riêng của loài (null = tuyệt chiêu theo hệ như cũ) */
export function resolveUlt(speciesId: string, types: PokemonType[]): UltSpec | null {
  const sk = kitFor(speciesId);
  if (!sk?.ult) return null;
  const typeUlt = TYPE_KITS[(sk.kitType ?? types[0]) as PokemonType]?.[sk.ult];
  return { archetype: sk.ult, params: { ...ULT_DEFAULTS[sk.ult], ...typeUlt, ...sk.ultParams } } as UltSpec;
}
