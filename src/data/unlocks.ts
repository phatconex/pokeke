// Yêu cầu mở khóa chiêu bằng thành tích (dữ liệu). Logic + tiến độ trên PartyMember ở game/unlocks.ts,
// ngưỡng chung (cấp K/L/U, số lần J trúng, điều kiện Tuyệt chiêu, thông số Thử thách) ở config/balance.ts → SKILL_UNLOCK.
//
// - L: nhiệm vụ huấn luyện theo HỆ (TYPE_QUESTS). Hệ chính không làm được (bộ chiêu J/K không gây được sự kiện đó,
//   vd. Bellsprout không có chiêu hút máu) → thử hệ phụ → FALLBACK_QUEST ("Hạ 25 Pokémon").
// - Đặt riêng cho một loài: SPECIES_UNLOCKS, vd.
//     abra: { L: { event: 'kill', n: 20 } },              // nhiệm vụ L riêng
//     magikarp: { levels: { L: 20 } },                     // cấp yêu cầu riêng (vẫn lấy max với cấp mở của loài)
// - U: Thử thách chiêu theo hệ (TRIAL_THEMES: nền sân + kiểu bẫy); địch chọn tự động theo khắc hệ (game/unlocks.ts).
import type { HazardFx } from './hazards';
import type { PokemonType } from './types';
import type { BaseBiome } from '../art/chapters/types';

/** sự kiện trong trận được đếm cho nhiệm vụ L (chỉ tính khi Pokémon đó đang ra sân) */
export type QuestEvent =
  | 'burn' | 'poison' | 'paralyze' | 'confuse' | 'sleep' | 'freeze'
  /** gieo hạt / hút máu trúng địch */
  | 'drain'
  /** đòn đẩy lùi mạnh (knockback ≥ SKILL_UNLOCK.knockbackMin) trúng địch */
  | 'knockback'
  /** hạ Pokémon */
  | 'kill'
  /** ra chiêu K trúng ≥ 1 địch */
  | 'castK'
  /** đòn "rất hiệu quả" (×2 trở lên) */
  | 'superEff'
  /** đòn chí mạng */
  | 'crit';

export const QUEST_EVENTS: QuestEvent[] = ['burn', 'poison', 'paralyze', 'confuse', 'sleep', 'freeze', 'drain', 'knockback', 'kill', 'castK', 'superEff', 'crit'];

export interface QuestDef {
  event: QuestEvent;
  n: number;
}

/** nhiệm vụ L mặc định theo hệ */
export const TYPE_QUESTS: Record<PokemonType, QuestDef> = {
  normal: { event: 'kill', n: 25 },
  fire: { event: 'burn', n: 25 },
  water: { event: 'knockback', n: 40 },
  grass: { event: 'drain', n: 25 },
  electric: { event: 'paralyze', n: 25 },
  bug: { event: 'castK', n: 40 },
  poison: { event: 'poison', n: 25 },
  flying: { event: 'knockback', n: 40 },
  rock: { event: 'superEff', n: 30 },
  ground: { event: 'superEff', n: 30 },
  psychic: { event: 'confuse', n: 20 },
  fighting: { event: 'crit', n: 25 },
  ghost: { event: 'kill', n: 25 },
  ice: { event: 'freeze', n: 20 },
  dragon: { event: 'castK', n: 40 },
};

/** khi không hệ nào làm được nhiệm vụ của hệ */
export const FALLBACK_QUEST: QuestDef = { event: 'kill', n: 25 };

export interface SpeciesUnlock {
  /** nhiệm vụ L riêng */
  L?: QuestDef;
  /** cấp yêu cầu riêng cho ô (vẫn lấy max với cấp mở của loài trong pokemon.ts) */
  levels?: Partial<Record<'K' | 'L' | 'U', number>>;
}

/** đặt riêng theo loài (để trống = dùng mặc định theo hệ) */
export const SPECIES_UNLOCKS: Record<string, SpeciesUnlock> = {
  // Abra rất yếu máu → nhiệm vụ Rối loạn nhẹ hơn
  abra: { L: { event: 'confuse', n: 15 } },
};

/** Thử thách chiêu theo hệ: nền sân + hiệu ứng bẫy lan dần */
export const TRIAL_THEMES: Record<PokemonType, { biome: BaseBiome; fx: HazardFx }> = {
  normal: { biome: 'forest', fx: 'rock' },
  fire: { biome: 'volcano', fx: 'flame' },
  water: { biome: 'beach', fx: 'water' },
  grass: { biome: 'blossom', fx: 'spore' },
  electric: { biome: 'cave', fx: 'lightning' },
  bug: { biome: 'forest', fx: 'spore' },
  poison: { biome: 'forest', fx: 'poison' },
  flying: { biome: 'blossom', fx: 'lightning' },
  rock: { biome: 'cave', fx: 'rock' },
  ground: { biome: 'cave', fx: 'rock' },
  psychic: { biome: 'blossom', fx: 'psychic' },
  fighting: { biome: 'cave', fx: 'rock' },
  ghost: { biome: 'cave', fx: 'shadow' },
  ice: { biome: 'snow', fx: 'ice' },
  dragon: { biome: 'volcano', fx: 'psychic' },
};
