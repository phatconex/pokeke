import type Phaser from 'phaser';
import type { Effects } from '../fx/Effects';
import type { PokemonType } from '../data/types';
import type { Fighter } from './Fighter';
import type { ProjectilePool } from './Projectiles';

/** Những gì địch cần biết về trận đấu (tránh phụ thuộc vòng vào BattleScene) */
export interface BattleCtx {
  host: Phaser.Scene;
  clock: number;
  fx: Effects;
  enemyShots: ProjectilePool;
  /** Pokémon phe ta gần nhất còn đứng được (địch nhắm vào đó) */
  targetFor(x: number, y: number): Fighter | null;
  /** Gây sát thương cho một Pokémon phe ta (đã nhân cấp độ, chưa tính khắc hệ) */
  damageFighter(f: Fighter, amount: number, fromX: number, fromY: number, type: PokemonType): void;
  /** Mọi Pokémon phe ta còn đứng được */
  aliveFighters(): Fighter[];
}
