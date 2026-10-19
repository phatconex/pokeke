// Chỉ số đầy đủ của một loài: Máu / Tấn công / Phòng thủ / Tốc độ / Chí mạng / Hồi chiêu / Hồi máu.
// - hp, atk, speed: lấy từ PokemonSpecies.base (thang của game).
// - def (Phòng thủ): base.def nếu loài tự khai báo, nếu không thì lấy chỉ số Defense gốc của
//   Pokémon chính thức theo số Pokédex (bảng OFFICIAL_DEF) – thang này gần với atk của game.
// - crit / haste / regen: mặc định chung cho mọi loài + một vài loài nổi bật (bảng TRAITS).
// Tiến hóa: chỉ số luôn đọc theo loài HIỆN TẠI của Pokémon → tiến hóa là đổi sang chỉ số gốc của loài mới;
// cấp, EXP, cấp nâng chiêu và cấp Huấn luyện nằm trên PartyMember nên được giữ nguyên.
import { POKEMON, PokemonSpecies } from './pokemon';

/** Defense gốc chính thức (Gen I) theo số Pokédex */
const OFFICIAL_DEF: Record<number, number> = {
  1: 49, 2: 63, 3: 83, 4: 43, 5: 58, 6: 78, 7: 65, 8: 80, 9: 100, 10: 35,
  11: 55, 12: 50, 13: 30, 14: 50, 15: 40, 16: 40, 17: 55, 18: 75, 19: 35, 20: 60,
  21: 30, 22: 65, 23: 44, 24: 69, 25: 40, 26: 55, 27: 85, 28: 110, 29: 52, 30: 67,
  31: 87, 32: 40, 33: 57, 34: 77, 35: 48, 36: 73, 37: 40, 38: 75, 39: 20, 40: 45,
  41: 35, 42: 70, 43: 55, 44: 65, 45: 85, 46: 55, 47: 80, 48: 50, 49: 60, 50: 25,
  51: 50, 52: 35, 53: 60, 54: 48, 55: 78, 56: 35, 57: 60, 58: 45, 59: 80, 60: 40,
  61: 65, 62: 95, 63: 15, 64: 30, 65: 45, 66: 50, 67: 70, 68: 80, 69: 35, 70: 50,
  71: 65, 72: 35, 73: 65, 74: 100, 75: 115, 76: 130, 77: 55, 78: 70, 79: 65, 80: 110,
  81: 70, 82: 95, 83: 55, 84: 45, 85: 70, 86: 55, 87: 80, 88: 50, 89: 75, 90: 100,
  91: 180, 92: 30, 93: 45, 94: 60, 95: 160, 96: 45, 97: 70, 98: 90, 99: 115, 100: 50,
  101: 70, 102: 80, 103: 85, 104: 95, 105: 110, 106: 53, 107: 79, 108: 75, 109: 95, 110: 120,
  111: 95, 112: 120, 113: 5, 114: 115, 115: 80, 116: 70, 117: 95, 118: 60, 119: 65, 120: 55,
  121: 85, 122: 65, 123: 80, 124: 35, 125: 57, 126: 57, 127: 100, 128: 95, 129: 55, 130: 79,
  131: 80, 132: 48, 133: 50, 134: 60, 135: 60, 136: 60, 137: 70, 138: 100, 139: 125, 140: 90,
  141: 105, 142: 65, 143: 65, 144: 100, 145: 85, 146: 90, 147: 45, 148: 65, 149: 95, 150: 90,
  151: 100,
};

/** Chí mạng mặc định (tỉ lệ) và hệ số sát thương khi chí mạng */
export const BASE_CRIT = 0.05;
export const CRIT_MULT = 1.5;

/**
 * Nét riêng của một số loài (thiếu = mặc định):
 * crit: tỉ lệ chí mạng · haste: giảm hồi chiêu (0.08 = −8%) · regen: hồi % máu tối đa mỗi giây
 */
const TRAITS: Record<string, { crit?: number; haste?: number; regen?: number }> = {
  // móng vuốt / lưỡi hái / càng: hay chí mạng (như Slash, Karate Chop, Crabhammer)
  scyther: { crit: 0.15 }, persian: { crit: 0.12 }, meowth: { crit: 0.08 },
  sandshrew: { crit: 0.08 }, sandslash: { crit: 0.1 }, krabby: { crit: 0.08 }, kingler: { crit: 0.12 },
  mankey: { crit: 0.08 }, primeape: { crit: 0.1 }, hitmonlee: { crit: 0.1 }, pinsir: { crit: 0.1 },
  beedrill: { crit: 0.1 }, spearow: { crit: 0.08 }, fearow: { crit: 0.1 }, dugtrio: { crit: 0.1 },
  raticate: { crit: 0.08 }, aerodactyl: { crit: 0.08 },
  // nhanh trí / nhanh nhẹn: hồi chiêu nhanh hơn
  // huyền thoại: giảm hồi chiêu 20% + chí mạng cao
  mewtwo: { crit: 0.1, haste: 0.2 },
  moltres: { crit: 0.1, haste: 0.12 },
  zapdos: { crit: 0.12, haste: 0.2 },
  articuno: { crit: 0.06, haste: 0.1 },
  mew: { crit: 0.1, haste: 0.2 },
  abra: { haste: 0.08 }, kadabra: { haste: 0.08 }, alakazam: { haste: 0.1 },
  jolteon: { haste: 0.08 }, electrode: { haste: 0.06 }, gengar: { haste: 0.06 }, starmie: { haste: 0.06 },
  pikachu: { haste: 0.04 }, raichu: { haste: 0.05 },
  // tự hồi máu (Quang Hợp, Ngủ, Tái Sinh...)
  chansey: { regen: 0.006 }, snorlax: { regen: 0.005 }, slowpoke: { regen: 0.002 }, slowbro: { regen: 0.003 },
  venusaur: { regen: 0.002 }, vileplume: { regen: 0.002 }, tangela: { regen: 0.003 }, exeggutor: { regen: 0.002 },
  lapras: { regen: 0.002 }, dragonite: { regen: 0.002 },
};

export interface SpeciesStats {
  hp: number;
  atk: number;
  def: number;
  speed: number;
  /** tỉ lệ chí mạng 0..1 */
  crit: number;
  /** giảm hồi chiêu 0..1 */
  haste: number;
  /** hồi % máu tối đa mỗi giây (0.002 = 0,2%/s) */
  regen: number;
}

const DEFAULT_DEF = 65;

export function speciesStats(sp: PokemonSpecies | undefined): SpeciesStats {
  const b = sp?.base ?? { hp: 90, atk: 50, speed: 110 };
  const tr = (sp && TRAITS[sp.id]) || {};
  return {
    hp: b.hp,
    atk: b.atk,
    def: b.def ?? (sp ? OFFICIAL_DEF[sp.dex] : undefined) ?? DEFAULT_DEF,
    speed: b.speed,
    crit: tr.crit ?? BASE_CRIT,
    haste: tr.haste ?? 0,
    regen: tr.regen ?? 0,
  };
}

export const statsOf = (id: string) => speciesStats(POKEMON[id]);

/**
 * Phòng thủ → hệ số sát thương nhận vào.
 * hệ số = (defRef(Lv) / def) ^ 0.4, kẹp trong [0.6, 1.5].
 * defRef tăng theo cấp (Lv 5 = 48 → Lv 50 = 78) vì loài người chơi dùng ở cấp cao thường là dạng đã tiến hóa
 * (Defense cao hơn): nhờ vậy một loài có Defense trung bình ở mỗi giai đoạn nhận sát thương gần như cũ,
 * loài cứng (Onix, Geodude...) nhận ít hơn, loài mỏng (Abra, Pikachu...) nhận nhiều hơn.
 */
export const DEFENSE = {
  exponent: 0.4,
  min: 0.6,
  max: 1.5,
  refAt: (level: number) => 48 + 30 * Math.min(1, Math.max(0, (level - 5) / 45)),
  takenMult(def: number, level: number) {
    const r = Math.pow(this.refAt(level) / Math.max(1, def), this.exponent);
    return Math.min(this.max, Math.max(this.min, r));
  },
};

/** giá trị lớn nhất của từng chỉ số gốc trong mọi loài (để vẽ thanh) */
let maxCache: SpeciesStats | null = null;
export function statMax(): SpeciesStats {
  if (maxCache) return maxCache;
  const m: SpeciesStats = { hp: 1, atk: 1, def: 1, speed: 1, crit: 0.01, haste: 0.01, regen: 0.001 };
  for (const sp of Object.values(POKEMON)) {
    const s = speciesStats(sp);
    for (const k of Object.keys(m) as (keyof SpeciesStats)[]) m[k] = Math.max(m[k], s[k]);
  }
  maxCache = m;
  return m;
}
