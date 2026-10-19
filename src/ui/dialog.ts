// Hộp thoại kiểu RPG: hiệu ứng gõ chữ, tách "Tên: lời thoại", Enter/Space/click để tiếp.
import Phaser from 'phaser';
import { playSfx } from '../systems/sfx';
import { COLORS, pixelPanel, text } from './style';

const CHARS_PER_SEC = 70;

export class DialogBox {
  private layer: Phaser.GameObjects.Container;
  private nameText: Phaser.GameObjects.Text;
  private body: Phaser.GameObjects.Text;
  private more: Phaser.GameObjects.Text;
  private lines: string[] = [];
  private idx = 0;
  private full = '';
  private typed = 0;
  private openedAt = 0;
  private onDone?: () => void;
  busy = false;

  constructor(scene: Phaser.Scene, depth = 2000) {
    const { width, height } = scene.scale;
    const x = 110;
    const y = height - 186;
    const w = width - 220;
    const panel = pixelPanel(scene, x, y, w, 150);
    this.nameText = text(scene, x + 28, y + 18, '', 12, COLORS.gold);
    this.body = text(scene, x + 28, y + 44, '', 24, '#ffffff', { wordWrap: { width: w - 70 }, lineSpacing: 6 });
    this.more = text(scene, x + w - 40, y + 116, '▼', 12, COLORS.gold);
    scene.tweens.add({ targets: this.more, alpha: 0.2, duration: 400, yoyo: true, repeat: -1 });
    this.layer = scene.add.container(0, 0, [panel, this.nameText, this.body, this.more]).setDepth(depth).setVisible(false);
    scene.events.on(Phaser.Scenes.Events.UPDATE, this.tick, this);
    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => scene.events.off(Phaser.Scenes.Events.UPDATE, this.tick, this));
  }

  say(lines: string[], onDone?: () => void) {
    if (!lines.length) {
      onDone?.();
      return;
    }
    this.lines = lines;
    this.idx = 0;
    this.onDone = onDone;
    this.busy = true;
    this.openedAt = performance.now();
    this.layer.setVisible(true);
    this.show();
  }

  private show() {
    const m = /^([^:]{1,24}):\s(.+)$/.exec(this.lines[this.idx]);
    this.nameText.setText(m ? m[1] : '');
    this.full = m ? m[2] : this.lines[this.idx];
    this.typed = 0;
    this.body.setText('');
    this.more.setVisible(false);
  }

  private tick(_t: number, delta: number) {
    if (!this.busy || this.typed >= this.full.length) return;
    const before = Math.floor(this.typed);
    this.typed = Math.min(this.full.length, this.typed + (CHARS_PER_SEC * delta) / 1000);
    if (Math.floor(this.typed) !== before) {
      this.body.setText(this.full.slice(0, Math.floor(this.typed)));
      if (Math.floor(this.typed) % 4 === 0) playSfx('talk');
    }
    this.more.setVisible(this.typed >= this.full.length);
  }

  /** Enter/Space/click: hiện hết dòng, hoặc sang dòng kế; trả về true nếu hộp thoại đã xử lý phím */
  advance(): boolean {
    if (!this.busy) return false;
    if (performance.now() - this.openedAt < 150) return true;
    if (this.typed < this.full.length) {
      this.typed = this.full.length;
      this.body.setText(this.full);
      this.more.setVisible(true);
      return true;
    }
    this.idx++;
    if (this.idx < this.lines.length) {
      this.show();
      return true;
    }
    this.layer.setVisible(false);
    this.busy = false;
    const cb = this.onDone;
    this.onDone = undefined;
    cb?.();
    return true;
  }
}
