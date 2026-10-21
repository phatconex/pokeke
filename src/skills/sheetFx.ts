// Hiệu ứng chiêu dạng ảnh (sprite sheet nền trong suốt, 8 khung ngang): phát một lần theo thời gian, hoặc chọn khung theo thời gian cho vật thể đang bay.
// Ảnh nạp ở BootScene (khóa `fx-<tên>`); thiếu ảnh thì các khuôn tự quay về cách vẽ bằng code.
import Phaser from 'phaser';

/** Một hiệu ứng ảnh dùng trong tham số khuôn chiêu */
export interface SheetRef {
  /** khóa texture, vd 'fx-fire_claw' */
  key: string;
  /** tỉ lệ vẽ (khung gốc 256px, hình thực chiếm ~100–150px) */
  scale: number;
  /** thời gian phát trọn các khung (ms) */
  ms?: number;
  /** góc xoay thêm (độ) */
  rot?: number;
}

export const sheetReady = (scene: Phaser.Scene, key: string) => scene.textures.exists(key);

/** Phát các khung ảnh một lần tại (x, y), rồi tự hủy. Trả về sprite (hủy được). */
export function sheetOnce(
  scene: Phaser.Scene, key: string, x: number, y: number,
  o: { frames?: number[]; ms: number; scale: number; rotation?: number; originX?: number; originY?: number; depth?: number; alpha?: number },
): Phaser.GameObjects.Sprite | null {
  if (!sheetReady(scene, key)) return null;
  const n = scene.textures.get(key).frameTotal - 1;
  const frames = o.frames ?? Array.from({ length: n }, (_, i) => i);
  const spr = scene.add.sprite(x, y, key, frames[0]).setScale(o.scale).setOrigin(o.originX ?? 0.5, o.originY ?? 0.5).setDepth(o.depth ?? 100005).setAlpha(o.alpha ?? 1);
  if (o.rotation) spr.setRotation(o.rotation);
  scene.tweens.addCounter({
    from: 0, to: 1, duration: o.ms, ease: 'Linear',
    onUpdate: (tw) => {
      if (!spr.active) return;
      spr.setFrame(frames[Math.min(frames.length - 1, Math.floor((tw.getValue() ?? 0) * frames.length))]);
    },
    onComplete: () => spr.destroy(),
  });
  return spr;
}
