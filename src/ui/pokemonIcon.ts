// Vẽ Pokémon (sprite PMD) làm chân dung / biểu tượng trên giao diện, căn giữa phần thân thật.
import Phaser from 'phaser';
import { animKey, SPRITE_METRICS } from '../entities/PokemonSprite';

/** Sprite Pokémon có thân nằm giữa (cx, cy). size = chiều cao mong muốn của thân (px). */
export function pokemonIcon(scene: Phaser.Scene, id: string, cx: number, cy: number, size = 40, animate = true, dir = 0) {
  const m = SPRITE_METRICS[id];
  const h = m?.height ?? 24;
  // phóng theo bội số nguyên để giữ pixel sắc
  // loài quá to so với ô (Onix, Golbat...) thì thu nhỏ cho vừa, tránh đè lên chữ xung quanh
  const scale = h > size * 1.3 ? size / h : Math.max(1, Math.round(size / h));
  const s = scene.add.sprite(cx, cy, m?.animated ? `${id}-idle` : `${id}-fallback`, 0).setScale(scale);
  if (m?.animated && animate) s.play(animKey(id, 'idle', dir));
  s.y = cy - (m?.footOffset ?? 16) * scale + (h * scale) / 2;
  return s;
}
