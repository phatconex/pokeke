import { getGame } from '../game/state';
import Phaser from 'phaser';
import { MOVES } from '../data/moves';
import { POKEMON, STARTER_CHOICES } from '../data/pokemon';
import { PokemonType, TYPE_COLOR } from '../data/types';
import { animKey, SPRITE_METRICS } from '../entities/PokemonSprite';
import { newGame } from '../game/state';
import { playSfx } from '../systems/sfx';
import { COLORS, outlinedText, pixelPanel, text } from '../ui/style';
import { playMusic } from '../systems/music';
import { trainerName } from '../game/state';
import { t } from '../i18n';
import { blurb, moveName, typeLabel } from '../i18n/content';

const CARD_W = 272;
const CARD_H = 438;
const CARD_GAP = 22;
const CARD_TOP = 172;

interface Card {
  x: number;
  frame: Phaser.GameObjects.Graphics;
  sprite: Phaser.GameObjects.Sprite;
  color: number;
}

/** Chọn 1 trong 4 Pokémon khởi đầu (Pikachu, Bulbasaur, Charmander, Squirtle) */
export class StarterSelectScene extends Phaser.Scene {
  private selected = 0;
  private cards: Card[] = [];
  private region = 'kanto';
  private done = false;

  constructor() {
    super('StarterSelect');
  }

  init(data: { region?: string } | undefined) {
    this.region = data?.region ?? 'kanto';
  }

  create() {
    playMusic('title');
    const { width, height } = this.scale;
    this.cards = [];
    this.done = false;
    this.selected = 0;
    this.cameras.main.setBackgroundColor('#13261a');
    this.cameras.main.fadeIn(250, 0, 0, 0);
    this.add.tileSprite(0, 0, width / 2, height / 2, 'tiles', 9).setOrigin(0).setScale(2).setAlpha(0.25);

    outlinedText(this, width / 2, 36, t('starter.title'), 24, COLORS.gold, '#2a1430', 2);
    this.add.sprite(100, 98, 'trainer-oak', 0).setScale(4);
    pixelPanel(this, 150, 66, width - 300, 84);
    text(this, 175, 84, t('starter.intro', { name: trainerName() }), 18, COLORS.text, { lineSpacing: 4 });

    // 4 thẻ bằng nhau, căn giữa
    const total = STARTER_CHOICES.length * CARD_W + (STARTER_CHOICES.length - 1) * CARD_GAP;
    const left = (width - total) / 2;
    STARTER_CHOICES.forEach((id, i) => {
      const sp = POKEMON[id];
      const x = left + CARD_W / 2 + i * (CARD_W + CARD_GAP);
      const top = CARD_TOP;
      const color = TYPE_COLOR[sp.types[0]];
      const frame = this.add.graphics();
      // bệ tròn sau sprite theo màu hệ
      this.add.ellipse(x, top + 150, 150, 38, color, 0.35).setStrokeStyle(2, color, 0.8);
      const sprite = this.pokemonSprite(id, x, top + 104, 4);
      text(this, x, top + 196, sp.name, 28, COLORS.text).setOrigin(0.5);
      this.typeTag(x, top + 234, sp.types);
      text(this, x, top + 256, sp.skills.map((k) => `${k.slot}: ${moveName(MOVES[k.move])}${k.level > 1 ? ` (Lv ${k.level})` : ''}`).join('\n'), 12, COLORS.gold, { align: 'center', lineSpacing: 2 }).setOrigin(0.5, 0);
      text(this, x, top + 384, blurb(sp) ?? '', 12, COLORS.text, { align: 'center', wordWrap: { width: CARD_W - 36 } }).setOrigin(0.5);
      const zone = this.add.zone(x, top + CARD_H / 2, CARD_W, CARD_H).setInteractive({ useHandCursor: true });
      zone.on('pointerover', () => this.select(i));
      zone.on('pointerdown', () => {
        this.select(i);
        this.confirm();
      });
      this.cards.push({ x, frame, sprite, color });
    });
    text(this, width / 2, height - 34, t('common.hint.lrConfirmBack'), 17, COLORS.dim).setOrigin(0.5);
    this.select(0);

    const kb = this.input.keyboard!;
    kb.on('keydown-LEFT', () => this.move(-1));
    kb.on('keydown-A', () => this.move(-1));
    kb.on('keydown-RIGHT', () => this.move(1));
    kb.on('keydown-D', () => this.move(1));
    kb.on('keydown-ENTER', () => this.confirm());
    kb.on('keydown-SPACE', () => this.confirm());
    kb.on('keydown-ESC', () => this.scene.start('RegionSelect'));
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => kb.removeAllListeners());
  }

  /** Thẻ bo tròn kiểu nút pill: viền tối ngoài, viền sáng (vàng khi chọn), nền tối có vệt sáng nửa trên */
  private drawCard(c: Card, on: boolean) {
    const g = c.frame.clear();
    const x = c.x - CARD_W / 2;
    const y = CARD_TOP;
    const r = 18;
    g.fillStyle(0x000000, 0.35).fillRoundedRect(x + 4, y + 6, CARD_W, CARD_H, r); // bóng đổ
    g.fillStyle(0x0b0f1e, 1).fillRoundedRect(x, y, CARD_W, CARD_H, r);
    g.fillStyle(on ? 0x2c3f78 : 0x1f2a50, 1).fillRoundedRect(x + 4, y + 4, CARD_W - 8, CARD_H - 8, r - 3);
    g.fillStyle(c.color, on ? 0.28 : 0.14).fillRoundedRect(x + 8, y + 8, CARD_W - 16, 168, { tl: r - 6, tr: r - 6, bl: 6, br: 6 });
    g.lineStyle(on ? 4 : 2, on ? 0xffd34a : 0x8a98d0, 1).strokeRoundedRect(x + 5, y + 5, CARD_W - 10, CARD_H - 10, r - 4);
  }

  private pokemonSprite(id: string, x: number, y: number, scale: number) {
    const animated = SPRITE_METRICS[id]?.animated;
    const s = this.add.sprite(x, y, animated ? `${id}-idle` : `${id}-fallback`, 0).setScale(scale);
    if (animated) s.play(animKey(id, 'idle', 0));
    return s;
  }

  private typeTag(x: number, y: number, types: PokemonType[]) {
    const w = 90;
    types.forEach((ty, i) => {
      const tx = x + (i - (types.length - 1) / 2) * (w + 8);
      this.add.rectangle(tx, y, w, 26, TYPE_COLOR[ty]).setStrokeStyle(2, 0x0b120d);
      text(this, tx, y, typeLabel(ty), 15, '#ffffff').setOrigin(0.5);
    });
  }

  private move(step: number) {
    this.select((this.selected + step + this.cards.length) % this.cards.length);
    playSfx('talk');
  }

  private select(i: number) {
    this.selected = i;
    this.cards.forEach((c, j) => {
      this.drawCard(c, j === i);
      c.sprite.setScale(j === i ? 4.5 : 4).setAlpha(j === i ? 1 : 0.85);
    });
  }

  private confirm() {
    if (this.done) return;
    this.done = true;
    const starter = STARTER_CHOICES[this.selected];
    newGame(this.region, starter);
    playSfx('badge');
    this.cameras.main.fadeOut(400, 0, 0, 0);
    this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => (getGame()?.flags.tutorialDone ? this.scene.start('StageMap', { intro: true }) : this.scene.start('Battle', { kind: 'stage', stageId: 'tutorial' })));
  }
}
