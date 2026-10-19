// Những gì nguyên mẫu chiêu cần từ trận đấu (BattleScene tạo một đối tượng SkillHost bọc các hàm nội bộ của nó).
import type Phaser from 'phaser';
import type { MoveDef } from '../data/moveKit';
import type { Enemy } from '../entities/Enemy';
import type { Fighter } from '../entities/Fighter';
import type { Projectile } from '../entities/Projectiles';
import type { Effects } from '../fx/Effects';

export interface LingerZone {
  x: number;
  y: number;
  r: number;
  ms: number;
  /** nhịp đầu tiên sau (ms) */
  firstTickMs: number;
  move: MoveDef;
  power: number;
  color: number;
}

export interface SkillHost {
  readonly scene: Phaser.Scene;
  readonly fx: Effects;
  /** đồng hồ trận (ms, dừng khi tạm dừng / khựng hình) */
  readonly clock: number;
  readonly over: boolean;
  readonly worldW: number;
  readonly worldH: number;
  /** mục tiêu đang khóa (có thể null) */
  readonly aimTarget: Enemy | null;
  /** bản sao danh sách địch hiện tại */
  enemies(): Enemy[];
  schedule(at: number, fn: () => void): void;
  /** chạy tick mỗi khung trong ms (theo đồng hồ trận); done() khi hết hạn hoặc trận dọn dẹp */
  addFrameTask(ms: number, tick: (now: number, dt: number) => void, done?: () => void): void;
  damageEnemy(e: Enemy, m: MoveDef, amount: number, dirX: number, dirY: number, big?: boolean, quiet?: boolean): void;
  /** hệ số tích lũy (chiêu có stack) – gọi đúng 1 lần mỗi lần ra chiêu */
  stackMult(f: Fighter, m: MoveDef): number;
  hitStop(ms: number): void;
  addZone(z: LingerZone): void;
  spawnShot(texture: string, x: number, y: number, vx: number, vy: number, radius: number, damage: number, lifeMs: number, spin: number): Projectile;
  /** chuỗi nhát cận chiến chuẩn (hình quạt / đường thẳng, nhiều nhát) theo hướng aim */
  meleeSequence(f: Fighter, m: MoveDef, aim: Phaser.Math.Vector2, mult: number): void;
}
