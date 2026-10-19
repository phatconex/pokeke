// Ném Poké Ball tung Pokémon ra sân (thủ lĩnh / người chơi): bóng bay vòng cung, nảy, bật mở
// (chớp sáng + vòng sáng + tia lửa), rồi Pokémon hiện ra từ ánh sáng trắng.
import Phaser from 'phaser';
import type { Effects } from './Effects';
import { playSfx } from '../systems/sfx';

export interface Pt {
  x: number;
  y: number;
}

/** Bóng đang bay: hủy được (bỏ qua đoạn mở màn) */
export interface BallThrow {
  cancel(): void;
}

const DEPTH = 100010;

/**
 * Ném bóng từ `from` tới `to` (toạ độ thế giới). `onOpen` gọi đúng lúc bóng bật mở.
 * Trả về đối tượng để hủy (dọn hình, không gọi onOpen).
 */
export function throwPokeball(scene: Phaser.Scene, fx: Effects | null, from: Pt, to: Pt, onOpen: () => void, opts: { height?: number; duration?: number; ball?: string } = {}): BallThrow {
  const height = opts.height ?? 64;
  const duration = opts.duration ?? 620;
  const dir = to.x >= from.x ? 1 : -1;
  const objs: Phaser.GameObjects.GameObject[] = [];
  let done = false;
  const ballShadow = scene.add.ellipse(from.x, to.y + 4, 8, 3, 0x000000, 0.35).setDepth(-3400);
  const ball = scene.add.image(from.x, from.y, 'icons', opts.ball ?? 'pokeball').setScale(0.75).setDepth(DEPTH);
  objs.push(ball, ballShadow);
  playSfx('whip');
  scene.tweens.addCounter({
    from: 0, to: 1, duration, ease: 'Linear',
    onUpdate: (tw) => {
      const p = tw.getValue() ?? 0;
      ball.x = Phaser.Math.Linear(from.x, to.x, p);
      ball.y = Phaser.Math.Linear(from.y, to.y, p) - Math.sin(p * Math.PI) * height;
      ball.angle = p * 720 * dir;
      ballShadow.setPosition(ball.x, Phaser.Math.Linear(from.y + 10, to.y + 4, p)).setScale(0.6 + p * 0.4);
    },
    onComplete: () => {
      if (done) return;
      ball.setAngle(0);
      playSfx('hit');
      fx?.dustPuff(to.x, to.y + 4, 5);
      // nảy nhẹ một lần rồi bật mở
      scene.tweens.add({
        targets: ball, y: to.y - 9, duration: 120, yoyo: true, ease: 'Quad.out',
        onComplete: () => {
          if (done) return;
          scene.tweens.add({
            targets: ball, angle: { from: -18, to: 18 }, duration: 70, yoyo: true, repeat: 1,
            onComplete: () => {
              if (done) return;
              done = true;
              ballShadow.destroy();
              burst(scene, fx, to.x, to.y - 6);
              scene.tweens.add({ targets: ball, scale: 1.4, alpha: 0, y: to.y - 14, duration: 180, onComplete: () => ball.destroy() });
              onOpen();
            },
          });
        },
      });
    },
  });
  return {
    cancel() {
      if (done) return;
      done = true;
      for (const o of objs) {
        scene.tweens.killTweensOf(o);
        o.destroy();
      }
    },
  };
}

/** Chớp sáng khi bóng mở: quầng trắng + vòng sáng lan ra + cột sáng + tia lửa */
export function burst(scene: Phaser.Scene, fx: Effects | null, x: number, y: number) {
  playSfx('super');
  const flash = scene.add.circle(x, y, 6, 0xffffff, 1).setDepth(DEPTH + 1).setBlendMode(Phaser.BlendModes.ADD);
  scene.tweens.add({ targets: flash, scale: 5, alpha: 0, duration: 320, ease: 'Cubic.out', onComplete: () => flash.destroy() });
  const ring = scene.add.circle(x, y, 8).setStrokeStyle(2, 0xfff4c0, 1).setDepth(DEPTH + 1);
  scene.tweens.add({ targets: ring, scale: 4.5, alpha: 0, duration: 420, ease: 'Quad.out', onComplete: () => ring.destroy() });
  const beam = scene.add.rectangle(x, y + 4, 10, 70, 0xffffff, 0.9).setOrigin(0.5, 1).setScale(1, 0.05).setDepth(DEPTH).setBlendMode(Phaser.BlendModes.ADD);
  scene.tweens.add({ targets: beam, scaleY: 1, scaleX: 0.3, alpha: 0, duration: 380, ease: 'Cubic.out', onComplete: () => beam.destroy() });
  fx?.sparkBurst(x, y, 16);
  fx?.puff('zappuff', x, y, 6);
}

/** Pokémon hiện ra: phóng to từ ánh sáng trắng (sprite giữ nguyên tỉ lệ gốc khi xong) */
export function materialize(scene: Phaser.Scene, sprite: Phaser.GameObjects.Sprite, white = true) {
  const sx = sprite.scaleX;
  const sy = sprite.scaleY;
  scene.tweens.killTweensOf(sprite);
  sprite.setAlpha(1).setScale(sx * 0.15, sy * 0.15);
  if (white) sprite.setTintFill(0xffffff);
  scene.tweens.add({ targets: sprite, scaleX: sx, scaleY: sy, duration: 300, ease: 'Back.out' });
  if (white) scene.time.delayedCall(330, () => sprite.active && sprite.clearTint());
}

/** Dáng ném của người (sprite trainer): nhún + nghiêng người về phía ném */
export function trainerThrowPose(scene: Phaser.Scene, s: Phaser.GameObjects.Sprite, dir: 1 | -1) {
  const y = s.y;
  scene.tweens.add({ targets: s, y: y - 3, angle: 10 * dir, duration: 90, yoyo: true, ease: 'Quad.out', onComplete: () => s.setPosition(s.x, y).setAngle(0) });
}
