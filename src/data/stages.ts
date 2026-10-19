// Ải trên bản đồ vùng. Mỗi ải: biome, các đợt địch, loài thu phục được, phần thưởng, vị trí nút trên bản đồ.
// Thêm chương mới = thêm ải vào STAGES và đổi `playable` của các nút tương ứng.
import type { ArenaBiome } from '../art/arenaArt';
import { CHAPTERS } from './chapters';
import { EXTRA_SPAWNS } from './chapters/extra';
import type { ItemId } from '../game/items';
import { A, many, s } from './kit';

/** rival: trận gặp Shigeru (đội tự lên cấp theo người chơi) · league: Tứ Thiên Vương · champion: Nhà vô địch */
export type NodeKind = 'start' | 'stage' | 'elite' | 'event' | 'gym' | 'rival' | 'league' | 'champion';

export interface Spawn {
  species: string;
  level: number;
  /** con đầu đàn: to, trâu, khó bắt */
  alpha?: boolean;
}

export interface StageDef {
  id: string;
  kind: NodeKind;
  name: string;
  area: string;
  /** toạ độ trên ảnh bản đồ 640x360 */
  x: number;
  y: number;
  label?: string;
  /** false = hiện trên bản đồ nhưng chưa mở ("Sắp ra mắt") */
  playable: boolean;
  biome?: ArenaBiome;
  /** các đợt địch, đánh lần lượt */
  waves?: Spawn[][];
  gymId?: string;
  /** loài có thể thu phục trong ải */
  catchable?: string[];
  levels?: [number, number];
  money?: number;
  /** thưởng thêm bóng khi thắng lần đầu */
  ballsFirstClear?: number;
  /** thắng trong thời gian này (giây) được sao thứ 3 */
  parTimeS?: number;
  /** vật phẩm thưởng khi thắng lần đầu (vd. Đá Trăng ở Nhà Bill) */
  itemFirstClear?: { item: ItemId; name: string };
  /** trận Shigeru (kind 'rival' / 'champion'): bậc đội hình 1–5 */
  rival?: { tier: number };
}

export const STAGES: StageDef[] = [
  // ---------------------------------------------------------------- Chương 1: Pallet → Pewter
  { id: 'pallet', kind: 'start', name: 'Thị trấn Pallet', area: 'Pallet', x: 32, y: 330, label: 'Pallet', playable: true },
  {
    id: 'route1-a', kind: 'stage', name: 'Đường 1 – Bãi cỏ', area: 'Đường 1', x: 68, y: 332, playable: true, biome: 'forest',
    waves: [
      [...many('rattata', 3, 5), ...many('pidgey', 3, 3)],
      [...many('rattata', 4, 6), ...many('pidgey', 4, 3)],
      [...many('pidgey', 4, 6), ...many('rattata', 4, 4)],
      [...many('rattata', 5, 5), ...many('pidgey', 5, 2), A('rattata', 6)],
    ],
    catchable: ['rattata', 'pidgey'], levels: [3, 6], money: 140, ballsFirstClear: 3, parTimeS: 90,
  },
  {
    id: 'route1-b', kind: 'stage', name: 'Đường 1 – Lối vào Viridian', area: 'Đường 1', x: 102, y: 330, playable: true, biome: 'forest',
    waves: [
      [...many('rattata', 5, 5), ...many('pidgey', 5, 3)],
      [...many('pidgey', 5, 5), ...many('rattata', 5, 4)],
      [...many('rattata', 6, 6), ...many('pidgey', 6, 3)],
      [...many('pidgey', 6, 5), ...many('rattata', 6, 4), s('raticate', 7)],
      [...many('rattata', 7, 4), s('raticate', 7), A('pidgeotto', 8)],
    ],
    catchable: ['rattata', 'pidgey', 'raticate', 'pidgeotto'], levels: [5, 8], money: 190, parTimeS: 110,
  },
  {
    id: 'forest-a', kind: 'stage', name: 'Rừng Viridian – Bìa rừng', area: 'Rừng Viridian', x: 140, y: 326, playable: true, biome: 'forest',
    waves: [
      [...many('caterpie', 6, 4), ...many('weedle', 6, 4)],
      [...many('weedle', 7, 5), ...many('caterpie', 7, 3), s('pidgey', 7)],
      [...many('metapod', 7, 3), ...many('kakuna', 7, 3), ...many('weedle', 7, 3)],
      [...many('weedle', 8, 4), ...many('kakuna', 8, 2), A('kakuna', 9)],
    ],
    catchable: ['caterpie', 'weedle', 'metapod', 'kakuna', 'pidgey'], levels: [6, 9], money: 240, ballsFirstClear: 2, parTimeS: 130,
  },
  {
    id: 'forest-event', kind: 'event', name: 'Tiếng sấm trong rừng', area: 'Rừng Viridian', x: 178, y: 330, playable: true, biome: 'blossom',
    waves: [
      [...many('caterpie', 7, 4), ...many('weedle', 7, 4)],
      [...many('oddish', 8, 4), ...many('weedle', 8, 3)],
      [s('pikachu', 9), s('pikachu', 9), A('pikachu', 10)],
    ],
    catchable: ['pikachu', 'caterpie', 'weedle', 'oddish'], levels: [7, 10], money: 200, parTimeS: 100,
  },
  {
    id: 'forest-b', kind: 'stage', name: 'Rừng Viridian – Lõi rừng', area: 'Rừng Viridian', x: 212, y: 334, playable: true, biome: 'forest',
    waves: [
      [...many('weedle', 8, 4), ...many('caterpie', 8, 2), ...many('oddish', 8, 3)],
      [...many('kakuna', 9, 3), ...many('metapod', 9, 3), ...many('pidgey', 9, 3)],
      [...many('oddish', 9, 4), ...many('weedle', 9, 4), s('pidgeotto', 10)],
      [...many('pidgey', 10, 4), s('pidgeotto', 10), A('gloom', 11)],
    ],
    catchable: ['weedle', 'caterpie', 'oddish', 'kakuna', 'metapod', 'pidgey', 'pidgeotto', 'gloom'], levels: [8, 11], money: 280, parTimeS: 135,
  },
  {
    id: 'forest-elite', kind: 'elite', name: 'Chúa rừng Viridian', area: 'Rừng Viridian', x: 250, y: 332, playable: true, biome: 'blossom',
    waves: [
      [...many('oddish', 10, 4), s('gloom', 10), ...many('pidgey', 10, 2)],
      [...many('pidgeotto', 10, 3), ...many('raticate', 10, 3)],
      [...many('kakuna', 11, 4), ...many('gloom', 11, 2), A('pidgeotto', 12)],
      [A('gloom', 13), A('raticate', 12)],
    ],
    catchable: ['gloom', 'oddish', 'pidgeotto', 'raticate', 'kakuna'], levels: [10, 13], money: 420, ballsFirstClear: 3, parTimeS: 160,
  },
  { id: 'gym-pewter', kind: 'gym', name: 'Hội quán Pewter', area: 'Pewter', x: 290, y: 330, label: 'Pewter', playable: true, biome: 'gym-pewter', gymId: 'pewter', levels: [14, 18], money: 900, parTimeS: 150 },

  // ---------------------------------------------------------------- Chương 2: Núi Moon → Cerulean
  {
    id: 'moon-a', kind: 'stage', name: 'Núi Moon – Cửa hang', area: 'Núi Moon', x: 330, y: 333, label: 'Núi Moon', playable: true, biome: 'cave',
    waves: [
      [...many('zubat', 14, 6), ...many('geodude', 14, 2)],
      [...many('zubat', 14, 4), ...many('paras', 14, 4)],
      [...many('geodude', 15, 4), ...many('sandshrew', 14, 4)],
      [...many('paras', 15, 4), ...many('zubat', 15, 4)],
      [...many('zubat', 15, 4), A('sandshrew', 16)],
    ],
    catchable: ['zubat', 'geodude', 'paras', 'sandshrew'], levels: [14, 16], money: 360, ballsFirstClear: 3, parTimeS: 120,
  },
  {
    id: 'moon-b', kind: 'stage', name: 'Núi Moon – Hang sâu', area: 'Núi Moon', x: 366, y: 330, playable: true, biome: 'cave',
    waves: [
      [...many('paras', 14, 4), ...many('zubat', 14, 4)],
      [...many('clefairy', 14, 3), ...many('zubat', 15, 4)],
      [...many('geodude', 15, 4), ...many('sandshrew', 15, 3), s('clefairy', 15)],
      [...many('zubat', 15, 5), A('clefairy', 17)],
    ],
    catchable: ['paras', 'zubat', 'clefairy', 'geodude', 'sandshrew'], levels: [14, 17], money: 400, parTimeS: 130,
  },
  {
    id: 'moon-elite', kind: 'elite', name: 'Vua hang Núi Moon', area: 'Núi Moon', x: 405, y: 328, playable: true, biome: 'cave',
    waves: [
      [...many('zubat', 16, 4), ...many('paras', 16, 2)],
      [s('golbat', 16), ...many('sandshrew', 16, 3), ...many('zubat', 16, 2)],
      [...many('clefairy', 17, 3), ...many('geodude', 17, 4)],
      [A('golbat', 18), A('sandslash', 18)],
    ],
    catchable: ['zubat', 'golbat', 'paras', 'sandshrew', 'sandslash', 'clefairy', 'geodude'], levels: [16, 18], money: 520, ballsFirstClear: 3, parTimeS: 160,
  },
  {
    id: 'route4-a', kind: 'stage', name: 'Đường 4 – Bờ biển', area: 'Đường 4', x: 445, y: 331, playable: true, biome: 'beach',
    waves: [
      [...many('psyduck', 17, 4), ...many('goldeen', 17, 3)],
      [...many('goldeen', 17, 4), ...many('rattata', 18, 4)],
      [...many('psyduck', 18, 4), ...many('raticate', 18, 2), s('staryu', 18)],
      [...many('goldeen', 18, 4), A('psyduck', 20)],
    ],
    catchable: ['psyduck', 'goldeen', 'staryu', 'raticate'], levels: [17, 20], money: 460, parTimeS: 125,
  },
  {
    id: 'route4-event', kind: 'event', name: 'Ngôi sao trên bãi biển', area: 'Đường 4', x: 482, y: 330, playable: true, biome: 'beach',
    waves: [
      [...many('staryu', 18, 3), ...many('goldeen', 18, 3)],
      [...many('psyduck', 19, 4), ...many('staryu', 19, 2)],
      [A('staryu', 21), s('clefairy', 20), s('clefairy', 20)],
    ],
    catchable: ['staryu', 'clefairy', 'psyduck', 'goldeen'], levels: [18, 21], money: 420, ballsFirstClear: 2, parTimeS: 120,
  },
  { id: 'gym-cerulean', kind: 'gym', name: 'Hội quán Cerulean', area: 'Cerulean', x: 522, y: 326, label: 'Cerulean', playable: true, biome: 'gym-cerulean', gymId: 'cerulean', levels: [19, 23], money: 1400, parTimeS: 170 },

  // ---------------------------------------------------------------- Chương 3: Cầu Vàng → Vermilion
  {
    id: 'nugget-bridge', kind: 'stage', name: 'Cầu Vàng – Thử thách 5 người', area: 'Đường 24', x: 556, y: 320, label: 'Cầu Vàng', playable: true, biome: 'forest',
    waves: [
      [...many('spearow', 22, 5), ...many('ekans', 22, 3)],
      [...many('meowth', 22, 4), ...many('bellsprout', 22, 3)],
      [...many('mankey', 23, 4), ...many('spearow', 23, 3)],
      [...many('ekans', 23, 3), ...many('meowth', 23, 3), ...many('mankey', 23, 2)],
      [...many('spearow', 24, 4), A('mankey', 25)],
    ],
    catchable: ['spearow', 'ekans', 'meowth', 'mankey', 'bellsprout'], levels: [22, 25], money: 520, ballsFirstClear: 3, parTimeS: 130,
  },
  {
    id: 'bill-house', kind: 'event', name: 'Nhà Bill bên bờ biển', area: 'Đường 25', x: 592, y: 306, playable: true, biome: 'beach',
    waves: [
      [...many('abra', 23, 3), ...many('bellsprout', 23, 4)],
      [...many('clefairy', 24, 3), ...many('abra', 24, 3), s('drowzee', 24)],
      [...many('drowzee', 24, 3), ...many('bellsprout', 24, 3)],
      [A('abra', 26), ...many('meowth', 24, 3)],
    ],
    catchable: ['abra', 'bellsprout', 'clefairy', 'drowzee', 'meowth'], levels: [23, 26], money: 460, parTimeS: 110,
    itemFirstClear: { item: 'moonStone', name: 'Đá Trăng' },
  },
  {
    id: 'diglett-cave', kind: 'elite', name: 'Hang Diglett', area: 'Hang Diglett', x: 576, y: 286, playable: true, biome: 'cave',
    waves: [
      [...many('diglett', 24, 5), ...many('zubat', 24, 3)],
      [...many('diglett', 25, 4), ...many('geodude', 25, 3)],
      [...many('diglett', 25, 4), s('dugtrio', 26), ...many('golbat', 25, 2)],
      [A('dugtrio', 28), ...many('diglett', 26, 3)],
    ],
    catchable: ['diglett', 'dugtrio', 'geodude', 'zubat', 'golbat'], levels: [24, 28], money: 640, ballsFirstClear: 3, parTimeS: 160,
  },
  {
    id: 'route6', kind: 'stage', name: 'Đường 6 – Cổng Vermilion', area: 'Đường 6', x: 565, y: 268, playable: true, biome: 'forest',
    waves: [
      [...many('meowth', 25, 4), ...many('drowzee', 25, 3)],
      [...many('voltorb', 25, 4), ...many('magnemite', 25, 3)],
      [...many('drowzee', 26, 3), ...many('bellsprout', 26, 3), ...many('spearow', 26, 3)],
      [...many('magnemite', 26, 3), ...many('voltorb', 26, 3), A('drowzee', 28)],
    ],
    catchable: ['meowth', 'drowzee', 'voltorb', 'magnemite', 'bellsprout', 'spearow'], levels: [25, 28], money: 560, parTimeS: 130,
  },
  { id: 'gym-vermilion', kind: 'gym', name: 'Hội quán Vermilion', area: 'Vermilion', x: 558, y: 234, label: 'Vermilion', playable: true, biome: 'gym-vermilion', gymId: 'vermilion', levels: [25, 28], money: 1900, parTimeS: 170 },

  // ---------------------------------------------------------------- chương 4 → Liên đoàn: data/chapters/*
  ...CHAPTERS.flatMap((c) => c.stages),
];

export const STAGE_BY_ID: Record<string, StageDef> = Object.fromEntries(STAGES.map((st) => [st.id, st]));

// loài bổ sung (chapters/extra.ts) thả vào các ải có sẵn
for (const x of EXTRA_SPAWNS) {
  const st = STAGE_BY_ID[x.stage];
  if (!st?.waves?.length) continue;
  const w = x.wave < 0 ? st.waves.length + x.wave : Math.min(x.wave, st.waves.length - 1);
  st.waves[w] = [...st.waves[w], ...x.spawns];
  st.catchable = [...new Set([...(st.catchable ?? []), ...x.catchable])];
}

/** Bài hướng dẫn (không nằm trong STAGES → không hiện trên bản đồ, không tính độ dốc độ khó): sân tập, địch do TutorialScene đẻ ra */
export const TUTORIAL_STAGE_ID = 'tutorial';
STAGE_BY_ID[TUTORIAL_STAGE_ID] = {
  id: TUTORIAL_STAGE_ID, kind: 'stage', name: 'Tutorial', area: 'Pallet', x: 0, y: 0, playable: true, biome: 'forest',
  waves: [[]], catchable: ['rattata'], levels: [3, 5], money: 0, parTimeS: 999,
};

/** Ải được mở khi ải chơi được ngay trước nó đã thắng */
export function isUnlocked(index: number, cleared: (id: string) => boolean): boolean {
  const st = STAGES[index];
  if (!st.playable) return false;
  if (index === 0) return true;
  return cleared(STAGES[index - 1].id);
}
