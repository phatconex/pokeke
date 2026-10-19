// Chọn nhân vật + đặt tên: sau khi tạo tài khoản, và khi bắt đầu Cuộc phiêu lưu mới.
// Đã đăng nhập thì lưu vào hồ sơ trên mây; luôn dùng cho bản lưu mới (newGame).
import Phaser from 'phaser';
import { AVATARS } from '../data/avatars';
import { getGame, saveGame, setPendingHero, trainerAvatar } from '../game/state';
import { currentUser, updateProfile } from '../systems/cloud';
import { playMusic } from '../systems/music';
import { playSfx } from '../systems/sfx';
import { button, COLORS, outlinedText, pixelFont, pixelPanel, text } from '../ui/style';
import { lang, t } from '../i18n';
import { avatarName } from '../i18n/content';

/** CSS ô nhập tên: font theo ngôn ngữ (Pixelify cho tiếng Anh, Galmuri cho tiếng Việt) */
const inputCss = () => [
  'width:320px', 'height:42px', 'box-sizing:border-box', 'padding:6px 12px',
  lang() === 'en' ? 'font-family:Pixelify, PixelUI, monospace' : 'font-family:PixelUI, monospace', 'font-size:20px',
  'text-align:center', 'color:#ffffff', 'background:#0b0f1e', 'border:3px solid #ffd34a', 'outline:none',
].join(';');

const SUGGEST_VI = ['Satoshi', 'Haruka', 'Kenji', 'Mai', 'Minh', 'Lan', 'Takeru', 'Yuki', 'Hùng', 'Thảo'];
const SUGGEST_EN = ['Satoshi', 'Haruka', 'Kenji', 'Mai', 'Red', 'Leaf', 'Takeru', 'Yuki', 'Ash', 'Dawn'];

export class CharacterScene extends Phaser.Scene {
  private sel = 0;
  private next = 'Menu';
  private cards: { box: Phaser.GameObjects.Rectangle; spr: Phaser.GameObjects.Sprite; name: Phaser.GameObjects.Text }[] = [];
  private nameEl: HTMLInputElement | null = null;
  private dom: Phaser.GameObjects.DOMElement | null = null;
  private msg!: Phaser.GameObjects.Text;
  private busy = false;
  private stepAt = 0;
  private frameIdx = 0;

  constructor() {
    super('Character');
  }

  init(data: { next?: string } | undefined) {
    this.next = data?.next ?? 'Menu';
  }

  create() {
    playMusic('title');
    this.cards = [];
    this.busy = false;
    const { width, height } = this.scale;
    this.cameras.main.setBackgroundColor('#13261a');
    this.add.tileSprite(0, 0, width / 2, height / 2, 'tiles', 0).setOrigin(0).setScale(2).setAlpha(0.25);
    outlinedText(this, width / 2, 50, t('character.title'), 36, COLORS.gold, '#2a1430', 3);
    text(this, width / 2, 96, t('character.prompt'), 12, '#ffffff').setOrigin(0.5);

    // 6 nhân vật
    const cur = Math.max(0, AVATARS.findIndex((a) => a.id === trainerAvatar()));
    this.sel = cur;
    const step = 176;
    const x0 = width / 2 - (step * (AVATARS.length - 1)) / 2;
    AVATARS.forEach((a, i) => {
      const x = x0 + i * step;
      const box = this.add.rectangle(x, 270, 150, 210, 0x0b0f1e, 0.9).setStrokeStyle(3, 0x3a4468).setInteractive({ useHandCursor: true });
      box.on('pointerdown', () => this.select(i));
      const spr = this.add.sprite(x, 330, `trainer-${a.id}`, 0).setScale(6).setOrigin(0.5, 1);
      const name = text(this, x, 352, avatarName(a.id, a.name), 12, '#c8d0f0').setOrigin(0.5, 0);
      this.cards.push({ box, spr, name });
    });

    // tên
    pixelPanel(this, width / 2 - 260, 420, 520, 170);
    text(this, width / 2, 446, t('character.nameLabel'), 12, '#c8d0f0').setOrigin(0.5);
    const el = document.createElement('input');
    el.type = 'text';
    el.maxLength = 12;
    el.value = currentUser()?.setupDone ? currentUser()!.trainerName : getGame()?.trainer ?? '';
    el.placeholder = t('character.namePh');
    el.setAttribute('style', inputCss());
    el.addEventListener('keydown', (e) => {
      e.stopPropagation();
      if (e.key === 'Enter') void this.confirm();
    });
    this.nameEl = el;
    this.dom = this.add.dom(width / 2, 492, el);
    const rnd = button(this, width / 2 - 120, 552, t('character.random'), () => this.randomName(), 200);
    rnd.t.setFontSize(pixelFont(12).px);
    const ok = button(this, width / 2 + 120, 552, `${t('common.confirm')} ▶`, () => void this.confirm(), 200);
    ok.t.setFontSize(pixelFont(12).px);
    this.msg = text(this, width / 2, 628, '', 12, '#ff9a9a').setOrigin(0.5);
    text(this, width / 2, height - 30, t('character.hint'), 10, '#c8d0f0').setOrigin(0.5);

    const kb = this.input.keyboard!;
    kb.on('keydown-LEFT', () => this.select((this.sel + AVATARS.length - 1) % AVATARS.length));
    kb.on('keydown-RIGHT', () => this.select((this.sel + 1) % AVATARS.length));
    kb.on('keydown-ENTER', () => void this.confirm());
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      kb.removeAllListeners();
      this.dom?.destroy();
      this.dom = null;
    });
    this.select(cur, true);
    if (!el.value) this.randomName();
  }

  update(time: number) {
    // nhân vật đang chọn bước đi tại chỗ
    if (time < this.stepAt) return;
    this.stepAt = time + 180;
    this.frameIdx = (this.frameIdx + 1) % 4;
    const frames = [0, 1, 0, 2];
    this.cards.forEach((c, i) => c.spr.setFrame(i === this.sel ? frames[this.frameIdx] : 0));
  }

  private select(i: number, silent = false) {
    this.sel = i;
    this.cards.forEach((c, j) => {
      const on = j === i;
      c.box.setStrokeStyle(on ? 4 : 3, on ? 0xffd34a : 0x3a4468).setFillStyle(on ? 0x2a3a1e : 0x0b0f1e, 0.9);
      c.name.setColor(on ? COLORS.gold : '#c8d0f0');
      c.spr.setScale(on ? 7 : 6);
    });
    if (!silent) playSfx('talk');
  }

  private randomName() {
    if (!this.nameEl) return;
    const pool = (lang() === 'en' ? SUGGEST_EN : SUGGEST_VI).filter((n) => n !== this.nameEl!.value);
    this.nameEl.value = pool[Math.floor(Math.random() * pool.length)];
    playSfx('select');
  }

  private async confirm() {
    if (this.busy || !this.nameEl) return;
    const name = this.nameEl.value.trim();
    if (!name) {
      playSfx('warn');
      this.msg.setText(t('character.needName')).setColor('#ff9a9a');
      return;
    }
    const avatar = AVATARS[this.sel].id;
    setPendingHero(name, avatar);
    if (currentUser()) {
      this.busy = true;
      this.msg.setText(t('common.saving')).setColor('#c8d0f0');
      const err = await updateProfile(name, avatar);
      this.busy = false;
      if (err) {
        this.msg.setText(err).setColor('#ff9a9a');
        return;
      }
    }
    // đổi nhân vật khi đang có bản lưu (từ màn Tài khoản) thì cập nhật luôn bản lưu
    const g = getGame();
    if (g && this.next !== 'RegionSelect') {
      g.trainer = name;
      g.avatar = avatar;
      saveGame();
    }
    playSfx('badge');
    this.scene.start(this.next);
  }
}
