// Pool đạn đơn giản, va chạm kiểm tra thủ công bằng hình tròn (rẻ hơn physics body).
import Phaser from 'phaser';
import type { PokemonType } from '../data/types';
import type { MoveDef } from '../data/moves';

export interface Projectile {
  sprite: Phaser.GameObjects.Image;
  active: boolean;
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  damage: number;
  lifeMs: number;
  spin: number;
  /** hệ của đòn (tính khắc hệ) */
  type: PokemonType;
  knockback: number;
  /** texture hạt bung ra khi trúng */
  puff: string;
  /** chiêu gốc (để áp hiệu ứng làm chậm / hút máu) */
  move?: MoveDef;
  /** thời gian đã bay (ms) */
  age: number;
  /** địch đã trúng (đạn xuyên không trúng lại một con) */
  hit: Set<unknown>;
  /** boomerang đang quay về */
  returning: boolean;
  /** hiệu ứng mỗi khung khi bay (vệt – nguyên mẫu bolt) */
  onFly?: (p: Projectile) => void;
  /** hiệu ứng khi trúng (trước khi tính sát thương) */
  onHitFx?: (p: Projectile) => void;
}

export class ProjectilePool {
  readonly items: Projectile[] = [];

  constructor(private scene: Phaser.Scene, private cap: number) {}

  spawn(texture: string, x: number, y: number, vx: number, vy: number, radius: number, damage: number, lifeMs: number, spin = 0): Projectile {
    let p = this.items.find((i) => !i.active);
    if (!p) {
      if (this.items.length >= this.cap) {
        // tái sử dụng viên cũ nhất khi chạm giới hạn
        p = this.items.reduce((a, b) => (a.lifeMs < b.lifeMs ? a : b));
      } else {
        p = {
          sprite: this.scene.add.image(x, y, texture),
          active: false, x, y, vx, vy, radius, damage, lifeMs, spin, type: 'normal', knockback: 70, puff: 'flamepuff', age: 0, hit: new Set(), returning: false,
        };
        this.items.push(p);
      }
    }
    p.active = true;
    p.x = x;
    p.y = y;
    p.vx = vx;
    p.vy = vy;
    p.radius = radius;
    p.damage = damage;
    p.lifeMs = lifeMs;
    p.spin = spin;
    p.type = 'normal';
    p.knockback = 70;
    p.puff = 'flamepuff';
    p.move = undefined;
    p.age = 0;
    p.hit.clear();
    p.returning = false;
    p.onFly = undefined;
    p.onHitFx = undefined;
    p.sprite.setTexture(texture).setPosition(x, y).setVisible(true).setActive(true).setAlpha(1).setDepth(y + 2000);
    p.sprite.setRotation(Math.atan2(vy, vx));
    return p;
  }

  kill(p: Projectile) {
    p.active = false;
    p.sprite.setVisible(false).setActive(false);
  }

  /** Di chuyển tất cả đạn; trả về callback cho từng viên còn sống */
  update(dtMs: number, each: (p: Projectile) => void) {
    const dt = dtMs / 1000;
    for (const p of this.items) {
      if (!p.active) continue;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.lifeMs -= dtMs;
      p.age += dtMs;
      p.sprite.setPosition(p.x, p.y).setDepth(p.y + 2000);
      if (p.spin) p.sprite.rotation += p.spin * dt;
      if (p.lifeMs <= 0) {
        this.kill(p);
        continue;
      }
      if (p.lifeMs < 120) p.sprite.setAlpha(p.lifeMs / 120);
      each(p);
    }
  }

  clear() {
    for (const p of this.items) this.kill(p);
  }

  activeCount() {
    return this.items.reduce((n, p) => n + (p.active ? 1 : 0), 0);
  }
}
