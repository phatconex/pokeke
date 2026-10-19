// Khuôn nội dung của một chương: mỗi chương là một file riêng, được gộp vào dữ liệu chung
// (POKEMON, MOVES, ENEMY_STATS, STAGES, GYMS, BADGES, mẫu đòn boss, bảng màu huấn luyện viên).
import type { EnemyStats } from '../../config/balance';
import type { TrainerPalette } from '../../art/townArt';
import type { BossPattern } from '../../entities/bossTypes';
import type { MoveDef } from '../moveKit';
import type { PokemonSpecies } from '../pokemon';
import type { StageDef } from '../stages';
import type { BadgeDef, GymDef } from '../trainers';

export interface ChapterContent {
  id: string;
  /** tiêu đề trên bản đồ khi người chơi đang ở chương này */
  title: string;
  /** số huy hiệu lúc bắt đầu chương (chọn tiêu đề theo số huy hiệu hiện có) */
  badgesAtStart: number;
  species: Record<string, Omit<PokemonSpecies, 'id'>>;
  moves: Record<string, MoveDef>;
  enemyStats: Record<string, EnemyStats>;
  /** các nút trên bản đồ, theo thứ tự đi */
  stages: StageDef[];
  gyms?: Record<string, GymDef>;
  badges?: Record<string, BadgeDef>;
  bossPatterns?: Record<string, BossPattern>;
  trainerPalettes?: Record<string, TrainerPalette>;
}
