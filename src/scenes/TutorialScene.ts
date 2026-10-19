// Bài hướng dẫn cho tài khoản mới: lớp giao diện phủ lên BattleScene (ải 'tutorial', sân tập, địch yếu do cảnh này đẻ ra).
// Mỗi bước chỉ qua khi người chơi LÀM đúng thao tác (bộ đếm BattleScene.tut). Giữ Esc để bỏ qua.
import Phaser from 'phaser';
import { t } from '../i18n';
import { playSfx } from '../systems/sfx';
import { pixelPanel, text } from '../ui/style';
import type { BattleScene } from './BattleScene';

interface Step {
  id: number;
  keys: string[];
  /** bước chỉ đọc: qua bằng Enter */
  info?: boolean;
  start?: (b: BattleScene) => void;
  /** địch cần có sẵn suốt bước (đẻ lại khi hết) */
  keepEnemy?: (b: BattleScene) => void;
  done?: (b: BattleScene, base: BattleScene['tut']) => boolean;
}

const STEPS: Step[] = [
  { id: 1, keys: ['W', 'A', 'S', 'D'], done: (b, base) => b.tut.moved - base.moved >= 140 },
  { id: 2, keys: ['SPACE'], done: (b, base) => b.tut.dashes > base.dashes },
  {
    id: 3, keys: ['J'], start: (b) => { b.tutSpawn('rattata'); b.tutSpawn('rattata'); },
    done: (b, base) => b.tut.kills - base.kills >= 2,
  },
  {
    id: 4, keys: ['K'], start: (b) => b.tutSpawn('rattata'),
    keepEnemy: (b) => b.tutSpawn('rattata'),
    done: (b, base) => (b.tut.casts.K ?? 0) > (base.casts.K ?? 0),
  },
  { id: 5, keys: ['I'], info: true },
  {
    id: 6, keys: ['E'], start: (b) => b.tutSpawn('rattata', { hpRatio: 0.45, catchable: true }),
    keepEnemy: (b) => b.tutSpawn('rattata', { hpRatio: 0.45, catchable: true }),
    done: (b, base) => b.tut.caught > base.caught || b.tut.throws >= base.throws + 3,
  },
  { id: 7, keys: ['F', '1', '2', '3'], start: (b) => { b.player.member.hp = Math.max(1, Math.round(b.player.maxHp * 0.5)); }, done: (b, base) => b.tut.potions > base.potions },
  { id: 8, keys: ['Enter'], info: true },
];

export class TutorialScene extends Phaser.Scene {
  private idx = 0;
  private base!: BattleScene['tut'];
  private stepAt = 0;
  private doneAt = 0;
  private escHeld = 0;
  private objs: Phaser.GameObjects.GameObject[] = [];
  private keyObjs: Phaser.GameObjects.GameObject[] = [];
  private titleT!: Phaser.GameObjects.Text;
  private bodyT!: Phaser.GameObjects.Text;
  private progT!: Phaser.GameObjects.Text;
  private promptT!: Phaser.GameObjects.Text;
  private skipBar!: Phaser.GameObjects.Graphics;
  private enterWait = false;
  private finished = false;

  constructor() {
    super('Tutorial');
  }

  private get battle(): BattleScene {
    return this.scene.get('Battle') as BattleScene;
  }

  create() {
    this.idx = 0;
    this.finished = false;
    this.doneAt = 0;
    const { width } = this.scale;
    const cx = width / 2;
    const W = 600;
    const panel = pixelPanel(this, cx - W / 2, 64, W, 112);
    this.objs.push(...(Array.isArray(panel) ? panel : [panel]).filter(Boolean));
    this.titleT = text(this, cx - W / 2 + 18, 74, '', 16, '#ffd34a').setDepth(5);
    this.bodyT = text(this, cx - W / 2 + 18, 98, '', 11, '#ffffff').setDepth(5).setWordWrapWidth(W - 36).setLineSpacing(3);
    this.progT = text(this, cx + W / 2 - 16, 74, '', 11, '#a8c8e0').setOrigin(1, 0).setDepth(5);
    this.promptT = text(this, cx + W / 2 - 16, 160, '', 11, '#ffd34a').setOrigin(1, 0.5).setDepth(5).setVisible(false);
    this.skipBar = this.add.graphics().setDepth(5);
    const btn = text(this, cx - W / 2 + 18, 160, `${t('tut.skipBtn')} · ${t('tut.skipHold')}`, 9, '#9aa4c8').setOrigin(0, 0.5).setDepth(5).setInteractive({ useHandCursor: true });
    btn.on('pointerdown', () => this.finish(true));
    this.input.keyboard!.on('keydown-ENTER', () => {
      if (this.enterWait) this.complete();
    });
    this.startStep();
  }

  private startStep() {
    const s = STEPS[this.idx];
    const b = this.battle;
    this.base = { ...b.tut, casts: { ...b.tut.casts } };
    this.stepAt = this.time.now;
    this.doneAt = 0;
    this.enterWait = !!s.info;
    this.titleT.setText(t(`tut.s${s.id}.title`));
    this.bodyT.setText(t(`tut.s${s.id}.body`));
    this.progT.setText(t('tut.progress', { n: this.idx + 1, total: STEPS.length }));
    this.promptT.setVisible(!!s.info).setText(t('tut.enter'));
    this.drawKeys(s.keys);
    s.start?.(b);
    playSfx('select');
  }

  private drawKeys(keys: string[]) {
    for (const o of this.keyObjs) o.destroy();
    this.keyObjs = [];
    const { width } = this.scale;
    const x0 = width / 2 + 300 - 16 - keys.length * 36;
    keys.forEach((k, i) => {
      const w = k.length > 2 ? 62 : 28;
      const x = x0 + i * 36 + (k.length > 2 ? 0 : 0);
      const r = this.add.rectangle(x, 134, w, 28, 0xffd34a).setStrokeStyle(2, 0xffffff).setDepth(5).setOrigin(0, 0.5);
      const tx = text(this, x + w / 2, 134, k, 12, '#1a1a2a').setOrigin(0.5).setDepth(6);
      this.keyObjs.push(r, tx);
    });
  }

  private complete() {
    if (this.doneAt && !this.enterWait) return;
    const s = STEPS[this.idx];
    playSfx('pickup');
    this.enterWait = false;
    this.titleT.setText(`✓ ${t('tut.done')}`).setColor('#9fe08a');
    this.doneAt = this.time.now;
    void s;
  }

  private finish(skipped: boolean) {
    if (this.finished) return;
    this.finished = true;
    this.battle.finishTutorial(skipped);
  }

  update(time: number, delta: number) {
    if (this.finished) return;
    const b = this.battle;
    if (!b || b.over) return;
    // giữ Esc để bỏ qua
    const esc = this.input.keyboard!.addKey('ESC', false);
    this.escHeld = esc.isDown ? this.escHeld + delta : 0;
    this.skipBar.clear();
    if (this.escHeld > 0) {
      const { width } = this.scale;
      this.skipBar.fillStyle(0x0b0f1e, 1).fillRect(width / 2 - 100, 176, 200, 6);
      this.skipBar.fillStyle(0xffd34a, 1).fillRect(width / 2 - 100, 176, 200 * Math.min(1, this.escHeld / 1500), 6);
      if (this.escHeld >= 1500) return this.finish(true);
    }
    // phím gợi ý nhấp nháy nếu chờ lâu
    const wait = time - this.stepAt;
    for (const o of this.keyObjs) (o as Phaser.GameObjects.Rectangle).setAlpha(wait > 8000 ? 0.5 + 0.5 * Math.sin(time / 150) : 1);
    if (this.doneAt) {
      if (time - this.doneAt > 900) {
        this.titleT.setColor('#ffd34a');
        if (this.idx >= STEPS.length - 1) return this.finish(false);
        this.idx++;
        this.startStep();
      }
      return;
    }
    const s = STEPS[this.idx];
    if (s.keepEnemy && !b.enemiesAlive()) s.keepEnemy(b);
    if (s.done?.(b, this.base)) this.complete();
  }
}
