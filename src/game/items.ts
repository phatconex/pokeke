// Vật phẩm trong túi: bóng, thuốc, đá tiến hóa.
export type ItemId = 'pokeball' | 'greatball' | 'ultraball' | 'potion' | 'thunderStone' | 'moonStone' | 'fireStone' | 'waterStone' | 'leafStone';

export const ALL_ITEMS: ItemId[] = ['pokeball', 'greatball', 'ultraball', 'potion', 'thunderStone', 'moonStone', 'fireStone', 'waterStone', 'leafStone'];

export const ITEM_NAMES: Record<ItemId, string> = {
  pokeball: 'Poké Ball', greatball: 'Great Ball', ultraball: 'Ultra Ball', potion: 'Thuốc hồi máu',
  thunderStone: 'Đá Sấm', moonStone: 'Đá Trăng', fireStone: 'Đá Lửa', waterStone: 'Đá Nước', leafStone: 'Đá Lá',
};

/** Đá tiến hóa (dùng ở màn Đội hình) */
export const EVOLUTION_ITEMS = {
  thunderStone: 'Đá Sấm', moonStone: 'Đá Trăng', fireStone: 'Đá Lửa', waterStone: 'Đá Nước', leafStone: 'Đá Lá',
} as const;
export type EvolutionItem = keyof typeof EVOLUTION_ITEMS;
