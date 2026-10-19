import type { PokemonType } from '../data/types';

/**
 * Bộ đòn theo loài boss (dùng chung 3 kiểu tấn công: mưa đòn rơi, lao tới, vòng đạn).
 * impact: hiệu ứng khi đòn rơi chạm đất – 'bolt' thì dùng tia sét thay cho hình rơi.
 */
export interface BossPattern {
  type: PokemonType;
  /** texture rơi từ trên xuống (bỏ qua nếu impact = 'bolt') */
  dropTexture: string;
  /** texture đạn bắn vòng tròn */
  ringTexture: string;
  ringCount: number;
  ringSpeed: number;
  /** màu vòng sáng báo hiệu */
  glow: number;
  impact: 'dust' | 'bubble' | 'bolt' | 'flame' | 'leaf' | 'psy' | 'poison' | 'ice' | 'shadow';
}
