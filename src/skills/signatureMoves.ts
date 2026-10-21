// KHO CHIÊU CHỮ KÝ: công thức hiển thị cho từng chiêu theo TÊN (id) — dùng chung cho mọi Pokémon có chiêu đó.
// Ba tầng, từ chung đến riêng:
//   1) Bộ chiêu của HỆ (kits.ts: TYPE_KITS + moveVisuals.ts phần "theo loại chiêu") — mặc định cho chiêu chưa có công thức.
//   2) Công thức chiêu (file này: SIGNATURE) — thêm một dòng là mọi Pokémon dùng chiêu đó đều có hình riêng (vd Seismic Toss, Skull Bash).
//   3) Ghi đè theo loài (SPECIES_SIGNATURE) — chỉ khi một loài cần bản riêng cho chiêu đó (vd Charizard's Flare Blitz khác Rapidash).
// Muốn thêm chiêu mới: thêm công thức ở đây, gán id chiêu cho Pokémon trong data/pokemon.ts; không phải đụng bộ chiêu từng loài.
import type { MoveDef } from '../data/moveKit';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type Entry = any;
export const S = (archetype: string, params: Record<string, unknown> = {}): Entry => ({ archetype, params, tiers: [] });

/** ngữ cảnh khi dựng hình: chiêu, id đã bỏ tiền tố chương, hệ (dialect), màu hệ, cỡ dạng tiến hóa (1 gốc · 2 giữa · 3 cuối) */
export interface MoveCtx {
  m: MoveDef;
  id: string;
  d: string;
  col: number;
  sz: number;
}
export type Recipe = (c: MoveCtx) => Entry | null;

export const SIGNATURE: Record<string, Recipe> = {};
const reg = (ids: string[], r: Recipe) => {
  for (const i of ids) SIGNATURE[i] = r;
};

// ---- chiêu tự cường / trạng thái: null = giữ cách xử lý gốc của chiêu
reg(['harden', 'withdraw', 'minimize', 'barrier', 'meditate', 'agility', 'softBoiled', 'slackOff', 'transform', 'melt', 'counter', 'splash', 'metronome', 'aquaRing'], () => null);
// ---- chữ ký anime
reg(['doubleTeam'], ({ d, sz }) => S('clones', { dialect: d, n: 3 + sz, tint: 0xaad8ff }));
reg(['bodySlam', 'heavySlam', 'stomp', 'stampede', 'gigaImpact'], ({ d, col, sz }) => S('bodyslam', { dialect: d, r: 34 + sz * 10, height: 90 + sz * 15, airMs: 560 + sz * 40, color: col }));
reg(['wingAttack'], ({ sz }) => S('wingslash', { dialect: 'flying', reach: 50 + sz * 11, spanDeg: 150 + sz * 8, feathers: 7 + sz }));
reg(['supersonic', 'sing', 'roar'], ({ id, d, sz }) => S('sonic', { dialect: d, len: 96 + sz * 22, waves: 3 + (sz >= 2 ? 1 : 0), spanDeg: 70 + sz * 6, color: id === 'sing' ? 0xff9ad0 : id === 'roar' ? 0xffa060 : 0xb890f0, color2: 0xffffff }));
reg(['gust', 'silverWind', 'airCutter', 'whirlwind'], ({ d, sz }) => S('bolt', { dialect: d, scale: 1, split: 1, trail: 'none', trailPuffChance: 0, gust: { color: 0xbfe0ff, color2: 0xffffff, r: 13 + sz * 3 } }));
reg(['twister'], ({ d, col, sz }) => S('twister', { dialect: d, tex: 'scaleD', colors: [col, 0xffffff], r: 26 + sz * 6, height: 60 + sz * 14, ms: 1500 }));
reg(['petalDance'], ({ sz }) => S('twister', { dialect: 'grass', tex: 'petalP', colors: [0xff7aa8, 0xffc8dc], r: 28 + sz * 6, height: 80 + sz * 12, ms: 1800 }));
reg(['leafStorm'], ({ sz }) => S('twister', { dialect: 'grass', tex: 'leafA', colors: [0x5ad060, 0xb8f090], r: 30 + sz * 6, height: 85 + sz * 12, ms: 1800 }));
reg(['blizzard', 'icicleBurst'], () => S('blizzard', { dialect: 'ice' }));
reg(['dig'], ({ d, sz }) => S('ambush', { dialect: d, undergroundMs: 420 + sz * 80, hitR: 30 + sz * 6 }));
reg(['rockThrow'], ({ sz }) => S('lob', { dialect: 'rock', tex: 'boulderA', scale: 0.7 + sz * 0.25, r: 20 + sz * 4 }));
reg(['boneClub'], ({ sz }) => S('lob', { dialect: 'ground', tex: 'mudball', scale: 0.7 + sz * 0.2, r: 20 + sz * 3 }));
reg(['bonemerang'], () => S('boomerang', { dialect: 'ground' }));
reg(['swift', 'barrage'], ({ d, sz }) => S('bolt', { dialect: d, texPick: ['star5'], scale: 0.8, split: 3 + sz, splitSpreadDeg: 16 + sz * 6, splitPowerMult: 0.5 }));
reg(['pinMissile', 'poisonSting'], ({ d, sz }) => S('bolt', { dialect: d, texPick: ['needle'], scale: 0.85 + sz * 0.1, split: 1 + sz, splitSpreadDeg: 10, splitPowerMult: 0.65 }));
reg(['sonicBoom'], ({ d, sz }) => S('bolt', { dialect: d, scale: 1 + sz * 0.1, trail: 'thick', speedMult: 1.3 }));
reg(['xScissor'], ({ d }) => S('xslash', { dialect: d }));
// ---- nhóm chiêu cùng kiểu
reg(['flamethrower', 'hydroPump', 'bubbleBeam', 'auroraBeam', 'iceBeam', 'psybeam', 'signalBeam', 'solarBeam', 'hyperBeam', 'dragonRage', 'psywave', 'zapCannon', 'acidSpray', 'waterPulse', 'psychic'], ({ d }) => S('stream', { dialect: d }));
reg(['fireBlast', 'eggBomb', 'spikeCannon', 'thunder', 'nineFlames', 'sludgeBomb'], ({ d }) => S('blast', { dialect: d }));
reg(['selfDestruct', 'explosion'], ({ d }) => S('nova', { dialect: d, pulses: 2, pulseGapMs: 200, pulseGrowth: 1.25 }));
reg(['fireSpin', 'thunderWave', 'discharge', 'confuseRay', 'hypnosis', 'yawn', 'confusion', 'dreamEater', 'lovelyKiss', 'sludgeWave', 'toxicSpikes', 'surf', 'clamp', 'thunderbolt'], ({ d, sz }) => S('nova', { dialect: d, pulses: sz >= 2 ? 2 : 1, pulseGapMs: 260, pulseGrowth: 1.15 }));
reg(['rapidSpin'], ({ d, sz }) => S('shellspin', { dialect: d, r: 26 + sz * 8, ms: 1100 + sz * 250, color: 0x4aa8f0 }));
reg(['rollout', 'flameWheel'], ({ d, sz }) => S('roll', { dialect: d, size: 1.4 + sz * 0.5, ms: 440 + sz * 60, speed: 220 + sz * 15, hitR: 16 + sz * 4 }));
reg(['poisonPowder', 'stunSpore', 'sleepPowder', 'spore', 'smog', 'smokescreen', 'toxicFog'], ({ d }) => S('cloud', { dialect: d }));
reg(['earthquake', 'earthPower', 'rockWrecker', 'rockSlide', 'boneRush', 'rockCharge'], ({ d, sz }) => S('fallers', { dialect: d, tex: d === 'rock' ? 'slabR' : 'boulderA', count: 4 + sz * 2, spread: 60 + sz * 15, offset: { x: 0, y: -140 }, rotate: true, r: 20 + sz * 3, scorch: true }));
reg(['aerialDive', 'skyAttack', 'jumpKick', 'hiJumpKick', 'drillPeck', 'waterfall'], ({ d, col, sz }) => S('dive', { dialect: d, airMs: 520 + sz * 60, hitR: 34 + sz * 6, trailColor: col }));
reg(['slash', 'furyCutter', 'viceGrip', 'hyperFang', 'guillotine', 'crabhammer', 'karateChop', 'crossChop'], ({ d, sz }) => S('sweep', { dialect: d, reach: 34 + sz * 9, spanDeg: 110 + sz * 18, thick: 8 + sz * 3, spikes: sz }));
reg(['vineWhip', 'powerWhip', 'bind', 'wrap', 'constrict', 'ingrain'], ({ d }) => S('whip', { dialect: d }));
reg(['quickAttack', 'extremeSpeed', 'aquaJet', 'flameCharge', 'flareBlitz', 'machPunch', 'peck', 'doublePeck', 'triPeck', 'furyAttack', 'rollingKick', 'lowKick'], ({ d, col }) => S('dashStrike', { dialect: d, dashMs: 100, trailCount: 2, streaks: true, afterimages: 3, afterimageTint: col, lungeMult: 1.5 }));

/**
 * Ghi đè theo loài cho một chiêu cụ thể (khóa: `loài:chiêu`), vd:
 *   'charizard:flareBlitz': ({ d, col }) => S('dashStrike', { dialect: d, ... })
 * Để trống = mọi loài dùng công thức chung ở SIGNATURE.
 */
export const SPECIES_SIGNATURE: Record<string, Recipe> = {};
