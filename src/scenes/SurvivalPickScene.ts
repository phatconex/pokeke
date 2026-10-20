// Chọn Pokémon cho chế độ Sinh tồn: Pokémon khỏe trong Hộp của mình (hoặc Charmander mặc định).
// Sinh tồn không làm Pokémon bị thương và không tốn phí chữa; EXP nhận ít (xem SURVIVAL_REWARD).
import Phaser from 'phaser';
import { POKEMON } from '../data/pokemon';
import { getGame, PartyMember } from '../game/state';
import { t } from '../i18n';
import { playSfx } from '../systems/sfx';
import { pokemonIcon } from '../ui/pokemonIcon';
import { button, COLORS, outlinedText, pixelPanel, text } from '../ui/style';

const COLS = 4;
const CW = 250;
const CH = 118;
const ROWS_VISIBLE = 4;

export class SurvivalPickScene extends Phaser.Scene {
  private list: (PartyMember | null)[] = [];
  private sel = 0;
  private cards: { box: Phaser.GameObjects.Rectangle }[] = [];
  private content!: Phaser.GameObjects.Container;
  private scrollRow = 0;

  constructor() {
    super('SurvivalPick');
  }

  create() {
    const { width, height } = this.scale;
    const g = getGame();
    // null = Charmander mặc định; đội ra trận (theo thứ tự) xếp trước, rồi tới phần còn lại của Hộp
    const box = (g?.box ?? []).filter((m) => !m.injured);
    const teamFirst = [...(g?.team ?? []).map((u) => box.find((m) => m.uid === u)).filter((m): m is PartyMember => !!m), ...box.filter((m) => !g?.team.includes(m.uid))];
    this.list = [...teamFirst, null];
    this.sel = 0;
    this.scrollRow = 0;
    this.cameras.main.setBackgroundColor('#13261a');
    this.add.rectangle(0, 0, width, height, 0x14301c).setOrigin(0);
    outlinedText(this, width / 2, 42, t('surv.title'), 28, COLORS.gold, '#2a1430', 3);
    text(this, width / 2, 82, t('surv.sub'), 11, '#c8d0f0').setOrigin(0.5);
    const gridW = COLS * CW + (COLS - 1) * 12;
    const x0 = (width - gridW) / 2;
    const y0 = 116;
    pixelPanel(this, x0 - 16, y0 - 12, gridW + 32, ROWS_VISIBLE * (CH + 12) + 8);
    const items: Phaser.GameObjects.GameObject[] = [];
    this.cards = [];
    this.list.forEach((m, i) => {
      const col = i % COLS;
      const row = Math.floor(i / COLS);
      const x = x0 + col * (CW + 12);
      const y = y0 + row * (CH + 12);
      const rect = this.add.rectangle(x, y, CW, CH, 0x1f2a5c).setOrigin(0).setStrokeStyle(3, 0x8a9ad8).setInteractive({ useHandCursor: true });
      rect.on('pointerover', () => this.select(i));
      rect.on('pointerdown', () => (this.sel === i ? this.confirm() : this.select(i)));
      this.cards.push({ box: rect });
      const sid = m?.speciesId ?? 'charmander';
      items.push(rect, pokemonIcon(this, sid, x + 52, y + 54, 56));
      items.push(text(this, x + 100, y + 24, POKEMON[sid].name, 14, '#ffffff'));
      items.push(text(this, x + 100, y + 54, m ? `Lv ${m.level}` : t('surv.default'), 12, m ? '#ffd34a' : '#9fe08a'));
      items.push(text(this, x + 100, y + 80, m ? (g?.team.includes(m.uid) ? t('surv.inTeam') : t('surv.inBox')) : t('surv.defaultNote'), 10, '#c8d0f0'));
    });
    this.content = this.add.container(0, 0, items);
    const maskG = this.make.graphics({}, false);
    maskG.fillStyle(0xffffff).fillRect(x0 - 8, y0 - 6, gridW + 16, ROWS_VISIBLE * (CH + 12));
    this.content.setMask(maskG.createGeometryMask());
    const bBack = button(this, width / 2 - 170, height - 52, t('surv.back'), () => this.leave(), 260);
    const bGo = button(this, width / 2 + 170, height - 52, t('surv.go'), () => this.confirm(), 260);
    bBack.t.setFontSize(14);
    bGo.t.setFontSize(14);
    this.select(0);
    const kb = this.input.keyboard!;
    kb.on('keydown-LEFT', () => this.move(-1, 0));
    kb.on('keydown-A', () => this.move(-1, 0));
    kb.on('keydown-RIGHT', () => this.move(1, 0));
    kb.on('keydown-D', () => this.move(1, 0));
    kb.on('keydown-UP', () => this.move(0, -1));
    kb.on('keydown-W', () => this.move(0, -1));
    kb.on('keydown-DOWN', () => this.move(0, 1));
    kb.on('keydown-S', () => this.move(0, 1));
    kb.on('keydown-ENTER', () => this.confirm());
    kb.on('keydown-SPACE', () => this.confirm());
    kb.on('keydown-ESC', () => this.leave());
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => kb.removeAllListeners());
  }

  private move(dx: number, dy: number) {
    const n = Phaser.Math.Clamp(this.sel + dx + dy * COLS, 0, this.list.length - 1);
    if (n !== this.sel) this.select(n);
  }

  private select(i: number) {
    this.sel = i;
    this.cards.forEach((c, k) => c.box.setStrokeStyle(3, k === i ? 0xffd34a : 0x8a9ad8).setFillStyle(k === i ? 0x3a5ab8 : 0x1f2a5c));
    const row = Math.floor(i / COLS);
    if (row < this.scrollRow) this.scrollRow = row;
    else if (row >= this.scrollRow + ROWS_VISIBLE) this.scrollRow = row - ROWS_VISIBLE + 1;
    this.content.y = -this.scrollRow * (CH + 12);
    playSfx('talk');
  }

  private confirm() {
    playSfx('select');
    const m = this.list[this.sel];
    this.scene.start('Battle', m ? { kind: 'survival', uid: m.uid } : { kind: 'survival' });
  }

  private leave() {
    playSfx('select');
    this.scene.start('Menu');
  }
}
