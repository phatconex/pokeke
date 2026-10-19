// Sprite Pokémon có animation 8 hướng (sheet PMD). Không có sheet → dùng hình dự phòng tĩnh + nhún.
import Phaser from 'phaser';
import type { AnimName } from '../data/spriteSheets';

export interface SpriteMetrics {
  /** khoảng cách từ tâm khung hình xuống chân (px) */
  footOffset: number;
  /** chiều cao phần có hình (px) */
  height: number;
  animated: boolean;
}

/** Được BootScene điền sau khi tải xong */
export const SPRITE_METRICS: Record<string, SpriteMetrics> = {};

const LOOPING: AnimName[] = ['walk', 'idle', 'charge'];
export function isLooping(name: AnimName) {
  return LOOPING.includes(name);
}

export function animKey(speciesId: string, name: AnimName, dir: number) {
  return `${speciesId}-${name}-${dir}`;
}

/** Hướng 8 phía theo thứ tự hàng của sheet PMD: Xuống, Xuống-phải, Phải, Lên-phải, Lên, Lên-trái, Trái, Xuống-trái */
export function dirIndex(x: number, y: number): number {
  const deg = Phaser.Math.RadToDeg(Math.atan2(y, x));
  return ((Math.round((90 - deg) / 45) % 8) + 8) % 8;
}

export class PokemonSprite {
  readonly sprite: Phaser.GameObjects.Sprite;
  readonly metrics: SpriteMetrics;
  dir = 0;
  private loopName: AnimName | null = null;
  private loopTimeScale = 1;
  private oneShot: AnimName | null = null;
  private bobPhase = 0;
  /** thời gian còn lại của animation lặp đang dùng như hành động một lần */
  private oneShotLeftMs = 0;

  constructor(private scene: Phaser.Scene, readonly speciesId: string, readonly scale = 1) {
    this.metrics = SPRITE_METRICS[speciesId] ?? { footOffset: 16, height: 24, animated: false };
    const tex = this.metrics.animated ? `${speciesId}-walk` : `${speciesId}-fallback`;
    this.sprite = scene.add.sprite(0, 0, tex, 0).setScale(scale);
    this.sprite.on(Phaser.Animations.Events.ANIMATION_COMPLETE, () => {
      if (this.oneShot === 'faint') return; // nằm yên sau khi ngất
      this.oneShot = null;
      if (this.loopName) this.startLoop(this.loopName, true);
    });
  }

  /** chiều cao hiển thị thực tế */
  get height() {
    return this.metrics.height * this.scale;
  }

  get busy() {
    return this.oneShot !== null;
  }

  get action() {
    return this.oneShot;
  }

  setDirFromVector(x: number, y: number) {
    if (x === 0 && y === 0) return;
    const d = dirIndex(x, y);
    if (d === this.dir) return;
    this.dir = d;
    // đổi hướng giữa chừng: giữ nguyên khung hình đang chạy
    if (!this.metrics.animated) return;
    const name = this.oneShot ?? this.loopName;
    if (!name) return;
    const key = animKey(this.speciesId, name, d);
    if (!this.scene.anims.exists(key)) return;
    const idx = this.sprite.anims.currentFrame?.index ?? 1;
    const ts = this.sprite.anims.timeScale;
    this.sprite.play({ key, startFrame: Math.max(0, idx - 1) });
    this.sprite.anims.timeScale = ts;
  }

  /** Animation lặp (đi, đứng, gồng). Không chen ngang animation một lần đang chạy. */
  loop(name: AnimName, timeScale = 1) {
    this.loopTimeScale = timeScale;
    if (this.loopName !== name) {
      this.loopName = name;
      if (!this.oneShot) this.startLoop(name, false);
    }
    if (!this.oneShot) this.sprite.anims.timeScale = timeScale;
  }

  private startLoop(name: AnimName, force: boolean) {
    if (!this.metrics.animated) return;
    const key = animKey(this.speciesId, name, this.dir);
    if (!this.scene.anims.exists(key)) return;
    if (!force && this.sprite.anims.currentAnim?.key === key) return;
    this.sprite.play(key);
    this.sprite.anims.timeScale = this.loopTimeScale;
  }

  /**
   * Chạy animation một lần (tấn công, bị đánh...).
   * durationMs: co giãn tốc độ để animation kéo dài đúng khoảng thời gian này.
   */
  playOnce(name: AnimName, durationMs?: number, force = true): boolean {
    if (!this.metrics.animated) return false;
    if (this.oneShot && !force) return false;
    // thiếu sheet thì thử animation gần giống
    const chain: Record<AnimName, AnimName[]> = {
      charge: ['charge', 'shoot', 'attack'], shoot: ['shoot', 'charge', 'attack'], attack: ['attack', 'shoot'],
      faint: ['faint', 'hurt'], hurt: ['hurt'], walk: ['walk'], idle: ['idle', 'walk'],
    };
    const pick = chain[name].find((n) => this.scene.anims.exists(animKey(this.speciesId, n, this.dir)));
    if (!pick) return false;
    name = pick;
    const key = animKey(this.speciesId, name, this.dir);
    const anim = this.scene.anims.get(key);
    if (!anim) return false;
    this.oneShot = name;
    this.sprite.play(key);
    // anim.duration của Phaser tính theo frameRate, bỏ qua thời lượng riêng từng khung → tự cộng lại
    const realMs = anim.frames.reduce((sum, f) => sum + (f.duration || anim.msPerFrame), 0);
    if (durationMs && durationMs > 0) this.sprite.anims.timeScale = realMs / durationMs;
    else this.sprite.anims.timeScale = 1;
    // animation lặp dùng như hành động: tự kết thúc theo thời gian (đếm bằng delta trong place())
    this.oneShotLeftMs = isLooping(name) ? durationMs ?? realMs : 0;
    return true;
  }

  cancelOneShot() {
    if (!this.oneShot) return;
    this.oneShot = null;
    if (this.loopName) this.startLoop(this.loopName, true);
  }

  /** nhấc sprite lên khỏi mặt đất (px) – tuyệt chiêu bay lên */
  lift = 0;

  /** Đặt vị trí theo điểm chân; hình dự phòng thì tự nhún khi di chuyển */
  place(x: number, feetY: number, moving: boolean, dtMs: number) {
    if (this.oneShotLeftMs > 0) {
      this.oneShotLeftMs -= dtMs;
      if (this.oneShotLeftMs <= 0) this.cancelOneShot();
    }
    let bob = 0;
    if (!this.metrics.animated && moving) {
      this.bobPhase += dtMs / 1000 * 14;
      bob = Math.abs(Math.sin(this.bobPhase)) * 2;
    }
    this.sprite.setPosition(Math.round(x), Math.round(feetY - this.metrics.footOffset * this.scale - bob - this.lift));
    this.sprite.setDepth(feetY);
  }

  destroy() {
    this.sprite.removeAllListeners();
    this.sprite.destroy();
  }
}
