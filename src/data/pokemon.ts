// Dữ liệu loài Pokémon.
// - base: chỉ số khi ở trong đội người chơi (tham chiếu Lv 5)
// - ENEMY_STATS (config/balance.ts): chỉ số khi làm đối thủ / hoang dã
// - skills: các ô chiêu J / K / L / U mở theo cấp
// - evolution: tiến hóa theo cấp hoặc bằng đá (item)
import type { PokemonType } from './types';
import { CHAPTERS } from './chapters';
import { sk } from './kit';

export type SkillSlot = 'J' | 'K' | 'L' | 'U';
export const SKILL_SLOTS: SkillSlot[] = ['J', 'K', 'L', 'U'];

export interface PokemonSpecies {
  id: string;
  dex: number;
  name: string;
  types: PokemonType[];
  body: { w: number; h: number };
  fallbackColor: number;
  scale?: number;
  /** def (Phòng thủ) không bắt buộc: thiếu thì lấy Defense chính thức theo số dex – xem data/stats.ts */
  base: { hp: number; atk: number; speed: number; def?: number };
  skills: { slot: SkillSlot; move: string; level: number }[];
  evolution?: { into: string; level?: number; item?: string };
  /** nhiều nhánh tiến hóa (vd. Eevee: Đá Nước / Đá Sấm / Đá Lửa) – dùng thay cho evolution */
  evolutions?: { into: string; level?: number; item?: string }[];
  /** 0–255, càng cao càng dễ bắt */
  catchRate: number;
  blurb?: string;
}

type Def = Omit<PokemonSpecies, 'id'>;

/** loài của chương 1–3; các chương sau ở data/chapters/* */
const CORE_DEFS: Record<string, Def> = {
  pikachu: {
    dex: 25, name: 'Pikachu', types: ['electric'], body: { w: 12, h: 9 }, fallbackColor: 0xf8d030,
    base: { hp: 82, atk: 54, speed: 128 }, skills: sk('thunderShockP', 'quickAttackP', ['thunderboltP', 10], ['thunderP', 18]),
    evolution: { into: 'raichu', item: 'thunderStone' }, catchRate: 45,
    blurb: 'Nhanh, điện giật liên hoàn. Đá Sấm → Raichu. Yếu trước hệ Đá: bắt Oddish trong rừng để đấu Pewter.',
  },
  raichu: {
    dex: 26, name: 'Raichu', types: ['electric'], body: { w: 14, h: 10 }, fallbackColor: 0xf0a030,
    base: { hp: 104, atk: 72, speed: 132 }, skills: sk('thunderShockP', 'quickAttackP', ['thunderboltP', 1], ['thunderP', 1]), catchRate: 75,
  },
  bulbasaur: {
    dex: 1, name: 'Bulbasaur', types: ['grass', 'poison'], body: { w: 13, h: 9 }, fallbackColor: 0x60c090,
    base: { hp: 112, atk: 49, speed: 104 }, skills: sk('razorLeafG1', 'vineWhipG1', ['sleepPowderG1', 10], ['leechSeedG1', 18]),
    evolution: { into: 'ivysaur', level: 16 }, catchRate: 45,
    blurb: 'Bền bỉ, máu trâu. Khắc chế hệ Đá/Đất — rất mạnh trước Hội quán Pewter.',
  },
  ivysaur: {
    dex: 2, name: 'Ivysaur', types: ['grass', 'poison'], body: { w: 15, h: 10 }, fallbackColor: 0x50b080,
    base: { hp: 130, atk: 62, speed: 108 }, skills: sk('razorLeafG2', 'powerWhipG2', ['poisonStunG2', 10], ['solarBeamG2', 16]), evolution: { into: 'venusaur', level: 32 }, catchRate: 45,
  },
  charmander: {
    dex: 4, name: 'Charmander', types: ['fire'], body: { w: 12, h: 9 }, fallbackColor: 0xf08030,
    base: { hp: 96, atk: 54, speed: 116 }, skills: sk('emberF1', 'scratchF1', ['flameletF1', 10], ['fireballF1', 18]),
    evolution: { into: 'charmeleon', level: 16 }, catchRate: 45,
    blurb: 'Sát thương cao, khắc chế Bọ và Cỏ trong rừng. Gặp khó trước hệ Đá.',
  },
  charmeleon: {
    dex: 5, name: 'Charmeleon', types: ['fire'], body: { w: 14, h: 10 }, fallbackColor: 0xe05a30,
    base: { hp: 116, atk: 66, speed: 120 }, skills: sk('emberC', 'fireFangC', ['flamethrowerC', 10], ['fireBlastC', 16]), evolution: { into: 'charizard', level: 36 }, catchRate: 45,
  },
  squirtle: {
    dex: 7, name: 'Squirtle', types: ['water'], body: { w: 12, h: 9 }, fallbackColor: 0x5090f0,
    base: { hp: 104, atk: 50, speed: 110 }, skills: sk('waterGunS', 'rapidSpinS', ['hydroPumpS', 10], ['surfS', 18]),
    evolution: { into: 'wartortle', level: 16 }, catchRate: 45,
    blurb: 'Cân bằng, đẩy lùi tốt. Khắc chế hệ Đá/Đất và Lửa.',
  },
  wartortle: {
    dex: 8, name: 'Wartortle', types: ['water'], body: { w: 14, h: 10 }, fallbackColor: 0x4a78d0,
    base: { hp: 122, atk: 62, speed: 112 }, skills: sk('waterGunS', 'rapidSpinS', ['hydroPumpS', 10], ['surfS', 16]), evolution: { into: 'blastoise', level: 36 }, catchRate: 45,
  },
  caterpie: {
    dex: 10, name: 'Caterpie', types: ['bug'], body: { w: 14, h: 9 }, fallbackColor: 0x80c040,
    base: { hp: 90, atk: 34, speed: 92 }, skills: sk('stringShot', 'bugBite'), evolution: { into: 'metapod', level: 7 }, catchRate: 255,
  },
  metapod: {
    dex: 11, name: 'Metapod', types: ['bug'], body: { w: 14, h: 10 }, fallbackColor: 0x70b040,
    base: { hp: 112, atk: 28, speed: 64 }, skills: sk('stringShot', 'bugBite', ['harden', 7]), evolution: { into: 'butterfree', level: 10 }, catchRate: 120,
  },
  weedle: {
    dex: 13, name: 'Weedle', types: ['bug', 'poison'], body: { w: 14, h: 9 }, fallbackColor: 0xc89040,
    base: { hp: 86, atk: 40, speed: 102 }, skills: sk('poisonSting', 'stringShot'), evolution: { into: 'kakuna', level: 7 }, catchRate: 255,
  },
  kakuna: {
    dex: 14, name: 'Kakuna', types: ['bug', 'poison'], body: { w: 13, h: 10 }, fallbackColor: 0xd0b040,
    base: { hp: 106, atk: 32, speed: 64 }, skills: sk('poisonSting', 'stringShot', ['harden', 7]), evolution: { into: 'beedrill', level: 10 }, catchRate: 120,
  },
  pidgey: {
    dex: 16, name: 'Pidgey', types: ['normal', 'flying'], body: { w: 14, h: 9 }, fallbackColor: 0xb08850,
    base: { hp: 88, atk: 46, speed: 124 }, skills: sk('gust', 'quickAttack', ['wingAttack', 12]), evolution: { into: 'pidgeotto', level: 18 }, catchRate: 255,
  },
  pidgeotto: {
    dex: 17, name: 'Pidgeotto', types: ['normal', 'flying'], body: { w: 16, h: 10 }, fallbackColor: 0xa07840,
    base: { hp: 108, atk: 58, speed: 130 }, skills: sk('gust', 'quickAttack', ['wingAttack', 12]), evolution: { into: 'pidgeot', level: 36 }, catchRate: 120,
  },
  rattata: {
    dex: 19, name: 'Rattata', types: ['normal'], body: { w: 16, h: 9 }, fallbackColor: 0x9a6ab0,
    base: { hp: 80, atk: 56, speed: 130 }, skills: sk('bite', 'quickAttack', ['hyperFang', 12]), evolution: { into: 'raticate', level: 20 }, catchRate: 255,
  },
  raticate: {
    dex: 20, name: 'Raticate', types: ['normal'], body: { w: 18, h: 10 }, fallbackColor: 0xb08a50,
    base: { hp: 100, atk: 70, speed: 134 }, skills: sk('bite', 'quickAttack', ['hyperFang', 12], ['superFang', 20]), catchRate: 127,
  },
  oddish: {
    dex: 43, name: 'Oddish', types: ['grass', 'poison'], body: { w: 13, h: 9 }, fallbackColor: 0x4060a0,
    base: { hp: 98, atk: 48, speed: 96 }, skills: sk('absorb', 'acid', ['poisonPowder', 12]), evolution: { into: 'gloom', level: 21 }, catchRate: 255,
  },
  gloom: {
    dex: 44, name: 'Gloom', types: ['grass', 'poison'], body: { w: 15, h: 10 }, fallbackColor: 0x5a5aa0,
    base: { hp: 116, atk: 58, speed: 98 }, skills: sk('absorb', 'acid', ['poisonPowder', 12], ['stunSpore', 21]), evolution: { into: 'vileplume', item: 'leafStone' }, catchRate: 120,
  },
  zubat: {
    dex: 41, name: 'Zubat', types: ['poison', 'flying'], body: { w: 14, h: 9 }, fallbackColor: 0x5a6ad0,
    base: { hp: 86, atk: 48, speed: 136 }, skills: sk('leechLife', 'supersonic', ['wingAttack', 12]), evolution: { into: 'golbat', level: 22 }, catchRate: 255,
  },
  golbat: {
    dex: 42, name: 'Golbat', types: ['poison', 'flying'], body: { w: 18, h: 10 }, fallbackColor: 0x4a5ac0,
    base: { hp: 112, atk: 64, speed: 140 }, skills: sk('leechLife', 'supersonic', ['wingAttack', 12], ['bite', 22]), catchRate: 90,
  },
  paras: {
    dex: 46, name: 'Paras', types: ['bug', 'grass'], body: { w: 16, h: 10 }, fallbackColor: 0xe07a30,
    base: { hp: 92, atk: 54, speed: 90 }, skills: sk('furyCutter', 'absorb', ['stunSpore', 12]), evolution: { into: 'parasect', level: 24 }, catchRate: 190,
  },
  clefairy: {
    dex: 35, name: 'Clefairy', types: ['normal'], body: { w: 14, h: 10 }, fallbackColor: 0xf0a0c0,
    base: { hp: 120, atk: 46, speed: 100 }, skills: sk('swift', 'doubleSlap', ['minimize', 12], ['metronome', 16]), evolution: { into: 'clefable', item: 'moonStone' }, catchRate: 150,
  },
  clefable: {
    dex: 36, name: 'Clefable', types: ['normal'], body: { w: 16, h: 11 }, fallbackColor: 0xf0a0c0,
    base: { hp: 142, atk: 62, speed: 104 }, skills: sk('swift', 'doubleSlap', ['minimize', 1], ['metronome', 1]), catchRate: 25,
  },
  sandshrew: {
    dex: 27, name: 'Sandshrew', types: ['ground'], body: { w: 15, h: 10 }, fallbackColor: 0xd8b860,
    base: { hp: 108, atk: 58, speed: 98 }, skills: sk('mudShot', 'rollout', ['dig', 14]), evolution: { into: 'sandslash', level: 22 }, catchRate: 255,
  },
  sandslash: {
    dex: 28, name: 'Sandslash', types: ['ground'], body: { w: 17, h: 11 }, fallbackColor: 0xc89a40,
    base: { hp: 126, atk: 72, speed: 104 }, skills: sk('mudShot', 'rollout', ['dig', 14], ['slash', 22]), catchRate: 90,
  },
  psyduck: {
    dex: 54, name: 'Psyduck', types: ['water'], body: { w: 14, h: 10 }, fallbackColor: 0xf0d040,
    base: { hp: 104, atk: 52, speed: 104 }, skills: sk('waterGun', 'scratch', ['confusion', 14]), evolution: { into: 'golduck', level: 33 }, catchRate: 190,
  },
  goldeen: {
    dex: 118, name: 'Goldeen', types: ['water'], body: { w: 16, h: 10 }, fallbackColor: 0xf08060,
    base: { hp: 98, atk: 58, speed: 112 }, skills: sk('waterGun', 'hornAttack', ['hornDrill', 14]), evolution: { into: 'seaking', level: 33 }, catchRate: 225,
  },
  staryu: {
    dex: 120, name: 'Staryu', types: ['water'], body: { w: 15, h: 10 }, fallbackColor: 0xc8a050,
    base: { hp: 96, atk: 56, speed: 124 }, skills: sk('waterGun', 'swift', ['rapidSpin', 14]), evolution: { into: 'starmie', item: 'waterStone' }, catchRate: 225,
  },
  starmie: {
    dex: 121, name: 'Starmie', types: ['water', 'psychic'], body: { w: 22, h: 14 }, fallbackColor: 0x8a6ac0, scale: 1.5,
    base: { hp: 120, atk: 70, speed: 130 }, skills: sk('waterPulse', 'swift', ['confusion', 1], ['rapidSpin', 1]), catchRate: 60,
  },
  // ---------------------------------------------------------------- Chương 3: Cầu Vàng → Vermilion
  spearow: {
    dex: 21, name: 'Spearow', types: ['normal', 'flying'], body: { w: 13, h: 9 }, fallbackColor: 0xa06a40,
    base: { hp: 86, atk: 58, speed: 130 }, skills: sk('peck', 'furyAttack', ['drillPeck', 14]), evolution: { into: 'fearow', level: 20 }, catchRate: 255,
  },
  fearow: {
    dex: 22, name: 'Fearow', types: ['normal', 'flying'], body: { w: 18, h: 12 }, fallbackColor: 0xb07a40,
    base: { hp: 110, atk: 74, speed: 142 }, skills: sk('peck', 'furyAttack', ['drillPeck', 14], ['wingAttack', 20]), catchRate: 90,
  },
  ekans: {
    dex: 23, name: 'Ekans', types: ['poison'], body: { w: 15, h: 9 }, fallbackColor: 0xa060b0,
    base: { hp: 96, atk: 56, speed: 104 }, skills: sk('poisonSting', 'wrap', ['glare', 12]), evolution: { into: 'arbok', level: 22 }, catchRate: 255,
  },
  arbok: {
    dex: 24, name: 'Arbok', types: ['poison'], body: { w: 20, h: 13 }, fallbackColor: 0x8a4aa0,
    base: { hp: 124, atk: 72, speed: 112 }, skills: sk('poisonSting', 'wrap', ['glare', 12], ['poisonFang', 22]), catchRate: 90,
  },
  meowth: {
    dex: 52, name: 'Meowth', types: ['normal'], body: { w: 13, h: 9 }, fallbackColor: 0xf0e0a0,
    base: { hp: 92, atk: 52, speed: 132 }, skills: sk('payDay', 'scratch', ['bite', 12], ['slash', 20]), evolution: { into: 'persian', level: 28 }, catchRate: 255,
    blurb: 'Ném Xu kiếm thêm tiền mỗi trận',
  },
  mankey: {
    dex: 56, name: 'Mankey', types: ['fighting'], body: { w: 13, h: 9 }, fallbackColor: 0xe0c8a0,
    base: { hp: 92, atk: 70, speed: 126 }, skills: sk('karateChop', 'lowKick', ['crossChop', 16]), evolution: { into: 'primeape', level: 28 }, catchRate: 190,
  },
  abra: {
    dex: 63, name: 'Abra', types: ['psychic'], body: { w: 13, h: 9 }, fallbackColor: 0xe0c040,
    base: { hp: 80, atk: 70, speed: 118 }, skills: sk('psybeam', 'teleport', ['confusion', 14]), evolution: { into: 'kadabra', level: 16 }, catchRate: 120,
    blurb: 'Yếu máu nhưng Dịch Chuyển né mọi đòn',
  },
  bellsprout: {
    dex: 69, name: 'Bellsprout', types: ['grass', 'poison'], body: { w: 12, h: 9 }, fallbackColor: 0xa0d060,
    base: { hp: 98, atk: 60, speed: 98 }, skills: sk('acid', 'wrap', ['vineWhip', 12], ['stunSpore', 18]), evolution: { into: 'weepinbell', level: 21 }, catchRate: 255,
  },
  diglett: {
    dex: 50, name: 'Diglett', types: ['ground'], body: { w: 12, h: 8 }, fallbackColor: 0xa06a40,
    base: { hp: 82, atk: 62, speed: 136 }, skills: sk('mudSlap', 'dig', ['magnitude', 14]), evolution: { into: 'dugtrio', level: 26 }, catchRate: 255,
  },
  dugtrio: {
    dex: 51, name: 'Dugtrio', types: ['ground'], body: { w: 17, h: 10 }, fallbackColor: 0x8a5a30,
    base: { hp: 100, atk: 80, speed: 150 }, skills: sk('mudSlap', 'dig', ['magnitude', 14], ['earthquake', 26]), catchRate: 50,
  },
  voltorb: {
    dex: 100, name: 'Voltorb', types: ['electric'], body: { w: 13, h: 10 }, fallbackColor: 0xe04040,
    base: { hp: 96, atk: 52, speed: 134 }, skills: sk('sonicBoom', 'rollout', ['thunderWave', 12], ['selfDestruct', 18]), evolution: { into: 'electrode', level: 30 }, catchRate: 190,
  },
  magnemite: {
    dex: 81, name: 'Magnemite', types: ['electric'], body: { w: 13, h: 10 }, fallbackColor: 0xb0b8c8,
    base: { hp: 86, atk: 66, speed: 104 }, skills: sk('thundershock', 'sonicBoom', ['thunderWave', 12]), evolution: { into: 'magneton', level: 30 }, catchRate: 190,
  },
  drowzee: {
    dex: 96, name: 'Drowzee', types: ['psychic'], body: { w: 15, h: 10 }, fallbackColor: 0xd8b040,
    base: { hp: 116, atk: 56, speed: 96 }, skills: sk('psybeam', 'headbutt', ['hypnosis', 14]), evolution: { into: 'hypno', level: 26 }, catchRate: 190,
  },
  geodude: {
    dex: 74, name: 'Geodude', types: ['rock', 'ground'], body: { w: 20, h: 12 }, fallbackColor: 0x8a8070,
    base: { hp: 120, atk: 62, speed: 84 }, skills: sk('rockThrow', 'rollout', ['harden', 12]), evolution: { into: 'graveler', level: 25 }, catchRate: 255,
  },
  onix: {
    dex: 95, name: 'Onix', types: ['rock', 'ground'], body: { w: 52, h: 28 }, fallbackColor: 0x9a9a9a, scale: 1.5,
    base: { hp: 130, atk: 48, speed: 104 }, skills: sk('rockThrow', 'rollout', ['harden', 1], ['dig', 1]), catchRate: 45,
  },
};

const DEFS: Record<string, Def> = Object.assign({}, CORE_DEFS, ...CHAPTERS.map((c) => c.species));
export const POKEMON: Record<string, PokemonSpecies> = Object.fromEntries(Object.entries(DEFS).map(([id, d]) => [id, { id, ...d }]));

/** 4 Pokémon khởi đầu – người chơi chọn đúng 1 con */
export const STARTER_CHOICES = ['pikachu', 'bulbasaur', 'charmander', 'squirtle'] as const;

/** Mọi nhánh tiến hóa của một loài */
export function evolutionsOf(sp: PokemonSpecies | undefined): { into: string; level?: number; item?: string }[] {
  if (!sp) return [];
  return [...(sp.evolution ? [sp.evolution] : []), ...(sp.evolutions ?? [])].filter((e) => !!POKEMON[e.into]);
}

/** Wild evolved forms cannot be caught below their evolution line's level requirements.
 * Item evolutions add no level requirement, but retain requirements of earlier forms.
 */
export function captureLevel(speciesId: string, encounteredLevel: number): number {
  const minimum = (id: string): number => {
    const paths: number[] = [];
    for (const sp of Object.values(POKEMON)) {
      for (const evo of evolutionsOf(sp)) {
        if (evo.into === id) paths.push(Math.max(evo.level ?? 1, minimum(sp.id)));
      }
    }
    return paths.length ? Math.min(...paths) : 1;
  };
  return Math.max(encounteredLevel, minimum(speciesId));
}

/** Alpha encounters reward catching the stage leader with three extra levels. */
export function wildEncounterLevel(speciesId: string, level: number, alpha = false): number {
  return captureLevel(speciesId, level) + (alpha ? 3 : 0);
}

/** loài có dạng tiền tiến hóa trong game (vd. Charmeleon ← Charmander) */
export function hasPreEvolution(id: string): boolean {
  return Object.values(POKEMON).some((sp) => evolutionsOf(sp).some((e) => e.into === id));
}

/**
 * Tuyệt chiêu (phím I) chỉ mở khi đã tiến hóa: dạng gốc (cấp 1) của một dòng tiến hóa thì chưa có.
 * Loài không tiến hóa (Snorlax, Lapras, huyền thoại...) và dạng giữa / cuối luôn có.
 */
export function hasUltimate(id: string): boolean {
  const sp = POKEMON[id];
  if (!sp) return false;
  if (id === 'pikachu') return true; // đặc cách: Volt Tackle
  return evolutionsOf(sp).length === 0 || hasPreEvolution(id);
}
