// Hình chiêu theo TÊN / LOẠI của từng chiêu (không theo ô): chiêu tên gì thì ra hiệu ứng đúng thế.
// Dùng cho các loài ở familyKits.ts: ô nào có chiêu được ánh xạ thì dùng khuôn tương ứng, ô nào là chiêu "tự cường"
// (Cứng Hóa, Thu Nhỏ, Cao Tốc...) thì GIỮ cách xử lý gốc của chiêu (legacy) để đúng cơ chế.
import type { MoveDef } from '../data/moveKit';
import { TYPE_COLOR } from '../data/types';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Entry = any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const S = (archetype: string, params: Record<string, unknown> = {}): Entry => ({ archetype, params, tiers: [] });

/** bỏ tiền tố chương: ch5_xxx / evo_xxx / league_xxx */
const baseId = (id: string) => id.replace(/^(ch\d+|evo|league)_/, '');

const BEAM = new Set(['flamethrower', 'hydroPump', 'bubbleBeam', 'auroraBeam', 'iceBeam', 'psybeam', 'signalBeam', 'solarBeam', 'hyperBeam', 'dragonRage', 'psywave', 'zapCannon', 'acidSpray', 'waterPulse', 'psychic']);
const BLAST = new Set(['fireBlast', 'eggBomb', 'spikeCannon', 'thunder', 'nineFlames', 'sludgeBomb']);
const EXPLODE = new Set(['selfDestruct', 'explosion']);
const RING = new Set(['fireSpin', 'thunderWave', 'discharge', 'sing', 'supersonic', 'confuseRay', 'hypnosis', 'yawn', 'confusion', 'dreamEater', 'lovelyKiss', 'roar', 'sludgeWave', 'toxicSpikes', 'surf', 'clamp', 'thunderbolt']);
const ROLL = new Set(['rollout', 'flameWheel', 'rapidSpin']);
const CLOUD = new Set(['poisonPowder', 'stunSpore', 'sleepPowder', 'spore', 'smog', 'smokescreen', 'toxicFog']);
const QUAKE = new Set(['earthquake', 'earthPower', 'stomp', 'heavySlam', 'rockWrecker', 'rockSlide', 'boneRush', 'rockCharge']);
const DIVE = new Set(['aerialDive', 'skyAttack', 'jumpKick', 'hiJumpKick', 'drillPeck', 'waterfall']);
const SLASH = new Set(['slash', 'furyCutter', 'viceGrip', 'hyperFang', 'guillotine', 'crabhammer', 'karateChop', 'wingAttack', 'crossChop']);
const XSLASH = new Set(['xScissor']);
const VINE = new Set(['vineWhip', 'powerWhip', 'bind', 'wrap', 'constrict', 'ingrain']);
const RAPID = new Set(['quickAttack', 'extremeSpeed', 'aquaJet', 'flameCharge', 'flareBlitz', 'machPunch', 'peck', 'doublePeck', 'triPeck', 'furyAttack', 'rollingKick', 'lowKick']);
const BUFF_LEGACY = new Set(['harden', 'withdraw', 'minimize', 'barrier', 'meditate', 'agility', 'doubleTeam', 'softBoiled', 'slackOff', 'transform', 'melt', 'counter', 'splash', 'metronome', 'aquaRing']);

/**
 * Ánh xạ một chiêu → khuôn hiển thị (null = giữ cách xử lý gốc của chiêu).
 * size: 1 = dạng gốc, 2 = giữa, 3 = cuối (to hơn, rộng hơn).
 */
export function moveVisual(m: MoveDef, size: number): Entry | null {
  const id = baseId(m.id);
  const d = m.type as string;
  const col = TYPE_COLOR[m.type];
  const sz = Math.max(1, Math.min(3, size));
  if (BUFF_LEGACY.has(id) || m.kind === 'buff') return null;

  if (BEAM.has(id)) return S('stream', { dialect: d });
  if (BLAST.has(id)) return S('blast', { dialect: d });
  if (EXPLODE.has(id)) return S('nova', { dialect: d, pulses: 2, pulseGapMs: 200, pulseGrowth: 1.25 });
  if (RING.has(id)) return S('nova', { dialect: d, pulses: sz >= 2 ? 2 : 1, pulseGapMs: 260, pulseGrowth: 1.15 });
  if (id === 'twister') return S('twister', { dialect: d, tex: 'scaleD', colors: [col, 0xffffff], r: 26 + sz * 6, height: 60 + sz * 14, ms: 1500 });
  if (id === 'petalDance') return S('twister', { dialect: 'grass', tex: 'petalP', colors: [0xff7aa8, 0xffc8dc], r: 28 + sz * 6, height: 80 + sz * 12, ms: 1800 });
  if (id === 'leafStorm') return S('twister', { dialect: 'grass', tex: 'leafA', colors: [0x5ad060, 0xb8f090], r: 30 + sz * 6, height: 85 + sz * 12, ms: 1800 });
  if (id === 'blizzard' || id === 'icicleBurst') return S('blizzard', { dialect: 'ice' });
  if (ROLL.has(id)) return S('roll', { dialect: d, size: 1.4 + sz * 0.5, ms: 440 + sz * 60, speed: 220 + sz * 15, hitR: 16 + sz * 4 });
  if (CLOUD.has(id)) return S('cloud', { dialect: d });
  if (id === 'dig') return S('ambush', { dialect: d, undergroundMs: 420 + sz * 80, hitR: 30 + sz * 6 });
  if (QUAKE.has(id)) return S('fallers', { dialect: d, tex: d === 'rock' ? 'slabR' : 'boulderA', count: 4 + sz * 2, spread: 60 + sz * 15, offset: { x: 0, y: -140 }, rotate: true, r: 20 + sz * 3, scorch: true });
  if (id === 'rockThrow') return S('lob', { dialect: 'rock', tex: 'boulderA', scale: 0.7 + sz * 0.25, r: 20 + sz * 4 });
  if (id === 'boneClub') return S('lob', { dialect: 'ground', tex: 'mudball', scale: 0.7 + sz * 0.2, r: 20 + sz * 3 });
  if (id === 'bonemerang') return S('boomerang', { dialect: 'ground' });
  if (DIVE.has(id)) return S('dive', { dialect: d, airMs: 520 + sz * 60, hitR: 34 + sz * 6, trailColor: col });
  if (XSLASH.has(id)) return S('xslash', { dialect: d });
  if (SLASH.has(id)) return S('sweep', { dialect: d, reach: 34 + sz * 9, spanDeg: 110 + sz * 18, thick: 8 + sz * 3, spikes: sz });
  if (VINE.has(id)) return S('whip', { dialect: d });
  if (RAPID.has(id)) return S('dashStrike', { dialect: d, dashMs: 100, trailCount: 2, streaks: true, afterimages: 3, afterimageTint: col, lungeMult: 1.5 });
  if (id === 'swift' || id === 'barrage') return S('bolt', { dialect: d, texPick: ['star5'], scale: 0.8, split: 3 + sz, splitSpreadDeg: 16 + sz * 6, splitPowerMult: 0.5 });
  if (id === 'pinMissile' || id === 'poisonSting') return S('bolt', { dialect: d, texPick: ['needle'], scale: 0.85 + sz * 0.1, split: 1 + sz, splitSpreadDeg: 10, splitPowerMult: 0.65 });
  if (id === 'sonicBoom') return S('bolt', { dialect: d, scale: 1 + sz * 0.1, trail: 'thick', speedMult: 1.3 });

  // phần còn lại theo loại chiêu
  if (m.kind === 'projectile') return S('bolt', { dialect: d, scale: 0.8 + sz * 0.2, split: sz >= 3 ? 2 : 1, splitSpreadDeg: 10, splitPowerMult: 0.6 });
  if (m.kind === 'burst') return S('nova', { dialect: d, pulses: sz >= 2 ? 2 : 1, pulseGapMs: 260 });
  // cone = cận chiến phía trước: lao + chém/cắn/đấm
  return S('dashStrike', { dialect: d, dashMs: 130 - sz * 8, trailCount: 1 + (sz >= 2 ? 1 : 0), streaks: true, lungeMult: 1 + sz * 0.15 });
}
