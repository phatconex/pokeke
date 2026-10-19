import Phaser from 'phaser';
import { REGIONS } from '../data/regions';
import { playSfx } from '../systems/sfx';
import { COLORS, outlinedText, pixelPanel, text } from '../ui/style';
import { playMusic } from '../systems/music';
import { trainerAvatar, trainerName } from '../game/state';
import { t } from '../i18n';
import { regionText } from '../i18n/content';

/** Satoshi chọn vùng đất để bắt đầu (mốc 1 chỉ mở Kanto) */
export class RegionSelectScene extends Phaser.Scene {
  private selected = 0;
  private cards: { bg: Phaser.GameObjects.Rectangle; open: boolean }[] = [];

  constructor() {
    super('RegionSelect');
  }

  create() {
    playMusic('title');
    const { width, height } = this.scale;
    this.cards = [];
    this.selected = 0;
    this.cameras.main.setBackgroundColor('#10241a');
    this.cameras.main.fadeIn(250, 0, 0, 0);
    this.add.tileSprite(0, 0, width / 2, height / 2, 'tiles', 0).setOrigin(0).setScale(2).setAlpha(0.3);

    outlinedText(this, width / 2, 66, t('region.title'), 36, COLORS.gold, '#2a1430', 3);
    text(this, width / 2, 120, t('region.prompt', { name: trainerName() }), 20, COLORS.text).setOrigin(0.5);
    this.add.sprite(width / 2 - 470, 120, `trainer-${trainerAvatar()}`, 0).setScale(4);

    const cw = 250;
    const gap = 26;
    const x0 = width / 2 - (REGIONS.length * cw + (REGIONS.length - 1) * gap) / 2 + cw / 2;
    REGIONS.forEach((r, i) => {
      const x = x0 + i * (cw + gap);
      const y = height / 2 + 30;
      const bg = this.add.rectangle(x, y, cw, 300, r.open ? 0x1f4a26 : 0x2a2a2a, 0.95).setStrokeStyle(3, r.open ? 0x6aa84f : 0x555555);
      bg.setInteractive({ useHandCursor: r.open });
      // biểu tượng vùng: một ô bản đồ thu nhỏ
      const g = this.add.graphics();
      g.fillStyle(r.open ? 0x3f8f3a : 0x444444, 1).fillRect(x - 80, y - 120, 160, 100);
      g.fillStyle(r.open ? 0x9a6b3e : 0x555555, 1).fillRect(x - 6, y - 120, 12, 100);
      g.fillStyle(r.open ? 0x3a78c8 : 0x3a3a3a, 1).fillRect(x - 80, y - 32, 160, 12);
      if (r.open) for (const [tx, ty] of [[-60, -100], [40, -90], [-40, -60], [55, -55]]) this.add.image(x + tx, y + ty, 'pine').setScale(1.2);
      const rt = regionText(r.id, r);
      text(this, x, y + 10, rt.name, 30, r.open ? COLORS.gold : '#8a8a8a').setOrigin(0.5);
      text(this, x, y + 50, rt.desc, 15, r.open ? COLORS.text : '#8a8a8a', { align: 'center', lineSpacing: 4, wordWrap: { width: cw - 30 } }).setOrigin(0.5, 0);
      if (!r.open) text(this, x, y - 70, t('region.locked'), 26, '#c0c0c0').setOrigin(0.5);
      bg.on('pointerover', () => this.select(i));
      bg.on('pointerdown', () => {
        this.select(i);
        this.confirm();
      });
      this.cards.push({ bg, open: r.open });
    });
    pixelPanel(this, width / 2 - 300, height - 96, 600, 60);
    text(this, width / 2, height - 65, t('common.hint.lrConfirmBack'), 17, COLORS.dim).setOrigin(0.5);
    this.select(0);

    const kb = this.input.keyboard!;
    kb.on('keydown-LEFT', () => this.move(-1));
    kb.on('keydown-A', () => this.move(-1));
    kb.on('keydown-RIGHT', () => this.move(1));
    kb.on('keydown-D', () => this.move(1));
    kb.on('keydown-ENTER', () => this.confirm());
    kb.on('keydown-SPACE', () => this.confirm());
    kb.on('keydown-ESC', () => this.scene.start('Menu'));
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => kb.removeAllListeners());
  }

  private move(step: number) {
    this.select((this.selected + step + this.cards.length) % this.cards.length);
    playSfx('talk');
  }

  private select(i: number) {
    this.selected = i;
    this.cards.forEach((c, j) => c.bg.setStrokeStyle(j === i ? 6 : 3, j === i ? 0xffd34a : c.open ? 0x6aa84f : 0x555555));
  }

  private confirm() {
    const c = this.cards[this.selected];
    if (!c.open) {
      playSfx('warn');
      this.cameras.main.shake(120, 0.004);
      return;
    }
    playSfx('select');
    this.scene.start('StarterSelect', { region: REGIONS[this.selected].id });
  }
}
