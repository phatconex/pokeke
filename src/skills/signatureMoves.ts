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
// ---- chiêu đạn / vật thể theo anime
reg(['bubble'], ({ d, sz }) => S('bolt', { dialect: d, scale: 0.9, texPick: ['bubble'], split: 2 + sz, splitSpreadDeg: 26, splitPowerMult: 0.5, speedMult: 0.8, trail: 'none', trailPuffChance: 0.2 }));
reg(['acid'], ({ d, sz }) => S('lob', { dialect: d, tex: 'goo', scale: 0.7 + sz * 0.15, r: 20 + sz * 3, linger: { ms: 1800, tickMs: 500, powerMult: 0.2, color: 0x7ad04a } }));
reg(['thundershock'], ({ d, sz }) => S('bolt', { dialect: d, scale: 0.9 + sz * 0.1, trail: 'none', trailPuffChance: 0, zigzag: 0xfff6b0, zigWidth: 1.6, zigDouble: true, speedMult: 1.2 }));
reg(['willOWisp'], ({ d, sz }) => S('bolt', { dialect: d, scale: 0.9, split: 2 + sz, splitSpreadDeg: 34, splitPowerMult: 0.5, speedMult: 0.7, curve: { amp: 0.5, freq: 6 }, trail: 'thin', trailPuffChance: 0.3 }));
reg(['stringShot'], ({ d }) => S('web', { dialect: d, r: 34, ms: 1500, bugs: 2, n: 6, rings: 3 }));
reg(['powderSnow'], ({ d, sz }) => S('fan', { dialect: d, n: 8 + sz * 2, halfDeg: 24, range: 80 + sz * 10 }));
reg(['triAttack'], ({ d, sz }) => S('triattack', { dialect: d, r: 24 + sz * 3, flyMs: 420 }));
reg(['seismicToss', 'submission'], ({ sz }) => S('throw', { dialect: 'fighting', reach: 110 + sz * 12, powerMult: 1.2 }));
reg(['leechLife'], ({ d }) => S('dashStrike', { dialect: d, dashMs: 90, trailCount: 1, streaks: false, lungeMult: 0.9, impactSfx: null }));
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

// ---- đợt 2 (Vulpix / Oddish / Mankey...): đúng theo anime
reg(['fireSpin'], ({ sz }) => S('twister', { dialect: 'fire', tex: 'fireFeather', colors: [0xff6a1a, 0xffe070], r: 22 + sz * 7, height: 50 + sz * 14, ms: 1300 + sz * 250 }));
reg(['nineFlames'], () => S('fan', { dialect: 'fire', n: 9, halfDeg: 52, range: 130 }));
reg(['absorb', 'megaDrain', 'gigaDrain'], ({ id, sz }) => S('tether', { dialect: 'grass', flyMs: 340, arcH: 24, range: 200 + sz * 20, drainMs: 1800 + sz * 500, pulseMs: 500, spread: id === 'absorb' ? 0 : 1, spreadRange: 90, spreadDelayMs: 900 }));
reg(['crossChop'], ({ sz }) => S('xslash', { dialect: 'fighting', reach: 40 + sz * 10 }));
const powder = (cols: number[], st: string, ms: number) => ({ sz }: MoveCtx) =>
  S('cloud', { dialect: 'poison', colors: [cols], halfDeg: 34 + sz * 4, range: 66 + sz * 14, puffN: 22 + sz * 8, lingerMs: 2000, tickMs: 400, totalPowerMult: 1, statuses: [{ kind: st, chance: 0.6, ms }] });
reg(['poisonPowder'], powder([0xb070d8, 0x9050c0, 0xd8a0f0], 'poison', 2500));
reg(['stunSpore'], powder([0xf0e060, 0xd8c840, 0xfff8a0], 'paralyze', 1800));
reg(['sleepPowder'], powder([0x80c8f0, 0x60a8e0, 0xc0e8ff], 'sleep', 1800));

/**
 * Ghi đè theo loài cho một chiêu cụ thể (khóa: `loài:chiêu`), vd:
 *   'charizard:flareBlitz': ({ d, col }) => S('dashStrike', { dialect: d, ... })
 * Để trống = mọi loài dùng công thức chung ở SIGNATURE.
 */
export const SPECIES_SIGNATURE: Record<string, Recipe> = {};
