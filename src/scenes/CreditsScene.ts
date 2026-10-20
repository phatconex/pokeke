// Giới thiệu & Ghi công: thông báo fan-game miễn phí, nguồn sprite / font, những gì tự làm. Cuộn bằng ↑↓ / lăn chuột.
import Phaser from 'phaser';
import { t } from '../i18n';
import { playSfx } from '../systems/sfx';
import { button, COLORS, outlinedText, pixelPanel, text } from '../ui/style';

const SECTIONS = ['fan', 'sprites', 'fonts', 'own', 'tech', 'thanks'] as const;

export class CreditsScene extends Phaser.Scene {
  private content!: Phaser.GameObjects.Container;
  private scrollY = 0;
  private maxScroll = 0;

  constructor() {
    super('Credits');
  }

  create() {
    const { width, height } = this.scale;
    this.cameras.main.setBackgroundColor('#0d1a10');
    this.add.rectangle(0, 0, width, height, 0x14301c).setOrigin(0);
    outlinedText(this, width / 2, 36, t('credits.title'), 30, '#ffcc40', '#2a1430', 3).all.forEach((o) => o.setDepth(5));
    const px = 120;
    const pw = width - 240;
    const top = 76;
    const viewH = height - 76 - 84;
    pixelPanel(this, px, top, pw, viewH);
    const items: Phaser.GameObjects.GameObject[] = [];
    let y = 22;
    for (const k of SECTIONS) {
      items.push(text(this, px + 28, y, t(`credits.h.${k}`), 14, COLORS.gold));
      y += 26;
      for (const key of Object.keys(this.keysOf(k))) {
        const body = text(this, px + 28, y, t(key), 11, '#ffffff', { wordWrap: { width: pw - 56 }, lineSpacing: 5 });
        items.push(body);
        y += body.height + 14;
      }
      y += 8;
    }
    this.content = this.add.container(0, top, items);
    const maskG = this.make.graphics({}, false);
    maskG.fillStyle(0xffffff).fillRect(px + 6, top + 6, pw - 12, viewH - 12);
    this.content.setMask(maskG.createGeometryMask());
    this.maxScroll = Math.max(0, y + 20 - (viewH - 12));
    const b = button(this, width / 2, height - 42, t('credits.back'), () => this.leave(), 280);
    b.bg.setDepth(6);
    b.t.setDepth(7);
    const kb = this.input.keyboard!;
    kb.on('keydown-ESC', () => this.leave());
    kb.on('keydown-ENTER', () => this.leave());
    kb.on('keydown-UP', () => this.scroll(-60));
    kb.on('keydown-W', () => this.scroll(-60));
    kb.on('keydown-DOWN', () => this.scroll(60));
    kb.on('keydown-S', () => this.scroll(60));
    this.input.on(Phaser.Input.Events.POINTER_WHEEL, (_p: unknown, _o: unknown, _dx: number, dy: number) => this.scroll(dy));
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      kb.removeAllListeners();
      this.input.removeAllListeners();
    });
  }

  private keysOf(section: string): Record<string, true> {
    const out: Record<string, true> = {};
    for (let i = 1; i <= 3; i++) {
      const k = `credits.${section}${i}`;
      if (t(k) !== k) out[k] = true;
    }
    return out;
  }

  private scroll(dy: number) {
    this.scrollY = Phaser.Math.Clamp(this.scrollY + dy, 0, this.maxScroll);
    this.content.y = 76 - this.scrollY;
  }

  private leave() {
    playSfx('select');
    this.scene.start('Menu');
  }
}
