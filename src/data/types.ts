// Hệ Pokémon và bảng khắc hệ (rút gọn theo các hệ đang dùng).
export type PokemonType =
  | 'normal' | 'fire' | 'water' | 'grass' | 'electric'
  | 'bug' | 'poison' | 'flying' | 'rock' | 'ground' | 'psychic' | 'fighting' | 'ghost' | 'ice' | 'dragon';

export const TYPE_LABEL: Record<PokemonType, string> = {
  normal: 'Thường', fire: 'Lửa', water: 'Nước', grass: 'Cỏ', electric: 'Điện',
  bug: 'Bọ', poison: 'Độc', flying: 'Bay', rock: 'Đá', ground: 'Đất', psychic: 'Siêu Linh', fighting: 'Giác Đấu', ghost: 'Ma', ice: 'Băng', dragon: 'Rồng',
};

export const TYPE_COLOR: Record<PokemonType, number> = {
  normal: 0xc8c0a0, fire: 0xf08030, water: 0x5090f0, grass: 0x60c050, electric: 0xf8d030,
  bug: 0xa8b820, poison: 0xa040a0, flying: 0xa890f0, rock: 0xb8a038, ground: 0xe0c068, psychic: 0xf85888, fighting: 0xc03028, ghost: 0x705898, ice: 0x98d8d8, dragon: 0x7038f8,
};

/** Hệ số "miễn nhiễm" trong game gốc (0) được nới thành 0.25 để không bị kẹt trận */
const IMMUNE = 0.25;

const CHART: Partial<Record<PokemonType, Partial<Record<PokemonType, number>>>> = {
  normal: { rock: 0.5, ghost: IMMUNE },
  fire: { grass: 2, bug: 2, ice: 2, fire: 0.5, water: 0.5, rock: 0.5, dragon: 0.5 },
  water: { fire: 2, rock: 2, ground: 2, water: 0.5, grass: 0.5, dragon: 0.5 },
  grass: { water: 2, rock: 2, ground: 2, fire: 0.5, grass: 0.5, poison: 0.5, flying: 0.5, bug: 0.5, dragon: 0.5 },
  electric: { water: 2, flying: 2, electric: 0.5, grass: 0.5, dragon: 0.5, ground: IMMUNE },
  bug: { grass: 2, psychic: 2, fire: 0.5, flying: 0.5, poison: 0.5, fighting: 0.5, ghost: 0.5 },
  poison: { grass: 2, poison: 0.5, ground: 0.5, rock: 0.5, ghost: 0.5 },
  psychic: { poison: 2, fighting: 2, psychic: 0.5 },
  flying: { grass: 2, bug: 2, fighting: 2, electric: 0.5, rock: 0.5 },
  rock: { fire: 2, flying: 2, bug: 2, ice: 2, ground: 0.5, fighting: 0.5 },
  fighting: { normal: 2, rock: 2, ice: 2, poison: 0.5, flying: 0.5, psychic: 0.5, bug: 0.5, ghost: IMMUNE },
  ghost: { ghost: 2, psychic: 2, normal: IMMUNE },
  ice: { grass: 2, ground: 2, flying: 2, dragon: 2, fire: 0.5, water: 0.5, ice: 0.5 },
  dragon: { dragon: 2 },
  ground: { fire: 2, electric: 2, poison: 2, rock: 2, grass: 0.5, bug: 0.5, flying: IMMUNE },
};

export function effectiveness(attack: PokemonType, defend: PokemonType[]): number {
  let m = 1;
  for (const d of defend) m *= CHART[attack]?.[d] ?? 1;
  return m;
}

export function effectivenessLabel(mult: number): { text: string; color: string } | null {
  if (mult >= 2) return { text: 'Rất hiệu quả!', color: '#ffd34a' };
  if (mult <= 0.3) return { text: 'Gần như vô hiệu...', color: '#9a9a9a' };
  if (mult < 1) return { text: 'Không hiệu quả lắm', color: '#c0c0c0' };
  return null;
}
