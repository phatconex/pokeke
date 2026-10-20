// Giới thiệu & Ghi công: thông báo fan-game miễn phí, nguồn sprite / font, những gì tự làm. Cuộn bằng ↑↓ / lăn chuột.
import Phaser from 'phaser';
import { t } from '../i18n';
import { playSfx } from '../systems/sfx';
import { exportSaveText, importSaveText } from '../game/state';
import { button, COLORS, outlinedText, pixelPanel, text } from '../ui/style';

const SECTIONS = ['fan', 'sprites', 'fonts', 'own', 'tech', 'privacy', 'data', 'thanks'] as const;
const ISSUES_URL = 'https://github.com/phatconex/pokeke/issues/new';

export class CreditsScene extends Phaser.Scene {
  private content!: Phaser.GameObjects.Container;
  private msg!: Phaser.GameObjects.Text;
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
      if (k === 'data') {
        // ba nút: xuất / nhập tiến trình, báo lỗi
        const mk = (label: string, x: number, fn: () => void) => {
          const b = button(this, x, y + 22, label, fn, 220);
          b.t.setFontSize(12);
          items.push(b.bg, b.t);
        };
        mk(t('credits.btn.export'), px + 28 + 110, () => this.exportSave());
        mk(t('credits.btn.import'), px + 28 + 110 + 236, () => this.importSave());
        mk(t('credits.btn.report'), px + 28 + 110 + 472, () => this.report());
        y += 58;
        this.msg = text(this, px + 28, y, '', 11, '#9fe08a');
        items.push(this.msg);
        y += 26;
        continue;
      }
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

  private say(key: string, ok = true) {
    this.msg.setText(t(key)).setColor(ok ? '#9fe08a' : '#ff9a9a');
  }

  private exportSave() {
    const txt = exportSaveText();
    if (!txt) return this.say('credits.noSave', false);
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([txt], { type: 'application/json' }));
    a.download = `pokeke-save-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
    this.say('credits.exported');
  }

  private importSave() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'application/json,.json';
    input.onchange = () => {
      const f = input.files?.[0];
      if (!f) return;
      void f.text().then((txt) => {
        const ok = importSaveText(txt);
        this.say(ok ? 'credits.imported' : 'credits.importFail', ok);
      });
    };
    input.click();
  }

  private report() {
    let log = '';
    try {
      log = localStorage.getItem('pokeke.errors') ?? '';
    } catch {
      /* ignore */
    }
    void navigator.clipboard?.writeText(`Pokeke ${navigator.userAgent}\n${log}`).then(() => this.say('credits.reported'), () => undefined);
    window.open(ISSUES_URL, '_blank', 'noopener');
  }

  private leave() {
    playSfx('select');
    this.scene.start('Menu');
  }
}
