// Tài khoản: đăng ký / đăng nhập (Supabase), đổi tên huấn luyện viên, đồng bộ save máy ↔ mây.
// Chưa đăng nhập vẫn chơi được (save chỉ nằm trên máy).
import Phaser from 'phaser';
import { formatTime } from '../systems/records';
import {
  CloudSaveInfo, cloudEnabled, currentUser, fetchCloudSave, pushCloudSave, signIn, signOut, signUp, syncStatus,
} from '../systems/cloud';
import { getGame, importSave, peekLocalSave, GameState } from '../game/state';
import { playMusic } from '../systems/music';
import { playSfx } from '../systems/sfx';
import { button, COLORS, icon, outlinedText, pixelFont, pixelPanel, text } from '../ui/style';
import { lang, locale, t } from '../i18n';

type Tab = 'login' | 'register';

/** CSS ô nhập: font theo ngôn ngữ (Pixelify cho tiếng Anh, Galmuri cho tiếng Việt) */
const inputCss = () => [
  'width:340px', 'height:38px', 'box-sizing:border-box', 'padding:6px 12px',
  lang() === 'en' ? 'font-family:Pixelify, PixelUI, monospace' : 'font-family:PixelUI, monospace', 'font-size:16px',
  'color:#ffffff', 'background:#0b0f1e', 'border:3px solid #8a96b8', 'outline:none', 'image-rendering:pixelated',
].join(';');

/** chữ nút cỡ nhỏ (theo lưới font của ngôn ngữ) */
const smallLabel = (b: { t: Phaser.GameObjects.Text }) => b.t.setFontSize(pixelFont(12).px);

export class AccountScene extends Phaser.Scene {
  private tab: Tab = 'login';
  private layer: Phaser.GameObjects.Container | null = null;
  private doms: Phaser.GameObjects.DOMElement[] = [];
  private msg!: Phaser.GameObjects.Text;
  private busy = false;
  private cloud: CloudSaveInfo | null = null;
  private from = 'Menu';

  constructor() {
    super('Account');
  }

  init(data: { from?: string } | undefined) {
    this.from = data?.from ?? 'Menu';
  }

  create() {
    playMusic('title');
    this.layer = null;
    this.doms = [];
    this.busy = false;
    this.cloud = null;
    const { width, height } = this.scale;
    this.cameras.main.setBackgroundColor('#13261a');
    this.add.tileSprite(0, 0, width / 2, height / 2, 'tiles', 0).setOrigin(0).setScale(2).setAlpha(0.25);
    outlinedText(this, width / 2, 46, t('account.title'), 24, COLORS.gold, '#2a1430', 2);
    this.msg = text(this, width / 2, height - 96, '', 12, '#ffd0a0', { align: 'center', wordWrap: { width: 700 } }).setOrigin(0.5).setDepth(10);
    this.input.keyboard?.on('keydown-ESC', () => this.leave());
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.input.keyboard?.removeAllListeners());
    this.render();
    if (currentUser()) void this.refreshCloud();
  }

  private say(msg: string, color = '#ffd0a0') {
    this.msg.setText(msg).setColor(color);
  }

  private clear() {
    this.layer?.destroy(true);
    for (const d of this.doms) d.destroy();
    this.doms = [];
  }

  private input_(x: number, y: number, type: string, placeholder: string, value = '', max = 64): HTMLInputElement {
    const el = document.createElement('input');
    el.type = type;
    el.placeholder = placeholder;
    el.value = value;
    el.maxLength = max;
    el.autocomplete = type === 'password' ? 'current-password' : type === 'email' ? 'email' : 'off';
    el.setAttribute('style', inputCss());
    // gõ phím trong ô nhập không được kích hoạt phím tắt của game
    el.addEventListener('keydown', (e) => {
      e.stopPropagation();
      if (e.key === 'Enter') this.submit();
      if (e.key === 'Escape') this.leave();
    });
    this.doms.push(this.add.dom(x, y, el));
    return el;
  }

  private render() {
    this.clear();
    const { width } = this.scale;
    const items: Phaser.GameObjects.GameObject[] = [];
    const add = <T extends Phaser.GameObjects.GameObject>(o: T) => {
      items.push(o);
      return o;
    };
    const u = currentUser();

    if (!cloudEnabled) {
      add(pixelPanel(this, width / 2 - 320, 140, 640, 200));
      add(text(this, width / 2, 210, t('account.offline1'), 12, '#ffffff').setOrigin(0.5));
      add(text(this, width / 2, 240, t('account.offline2'), 12, '#c8d0f0').setOrigin(0.5));
    } else if (!u) {
      // ---- chưa đăng nhập: tab Đăng nhập / Đăng ký
      add(pixelPanel(this, width / 2 - 260, 110, 520, 360));
      (['login', 'register'] as Tab[]).forEach((tb, i) => {
        const active = this.tab === tb;
        const bx = width / 2 - 120 + i * 240;
        const bg = add(this.add.rectangle(bx, 148, 220, 40, active ? 0x8a3a10 : 0x1a2238).setStrokeStyle(3, active ? 0xffd34a : 0x5a6488));
        bg.setInteractive({ useHandCursor: true }).on('pointerdown', () => {
          if (this.tab === tb) return;
          this.tab = tb;
          this.say('');
          playSfx('talk');
          this.render();
        });
        add(text(this, bx, 148, t(`account.tab.${tb}`), 12, '#ffffff').setOrigin(0.5));
      });
      let y = 214;
      add(text(this, width / 2 - 170, y - 38, t('account.email'), 10, '#c8d0f0'));
      this.input_(width / 2, y, 'email', t('account.emailPh'));
      y += 74;
      add(text(this, width / 2 - 170, y - 38, t('account.password'), 10, '#c8d0f0'));
      this.input_(width / 2, y, 'password', '••••••');
      y += 68;
      const b = button(this, width / 2, y, this.tab === 'login' ? t('account.submitLogin') : t('account.submitRegister'), () => this.submit(), 260);
      add(b.bg);
      add(b.t);
      add(text(this, width / 2, y + 44, this.tab === 'register' ? t('account.noteRegister') : t('account.noteLogin'), 10, '#c8d0f0').setOrigin(0.5));
    } else {
      // ---- đã đăng nhập: hồ sơ + đồng bộ save
      add(pixelPanel(this, 80, 100, 1120, 150));
      add(this.add.sprite(140, 210, `trainer-${u.avatar}`, 0).setScale(4).setOrigin(0.5, 1));
      add(text(this, 190, 124, t('account.trainer'), 10, '#c8d0f0'));
      add(text(this, 190, 146, u.trainerName, 24, COLORS.gold));
      const change = button(this, 520, 162, t('account.changeChar'), () => this.scene.start('Character', { next: 'Account' }), 200);
      smallLabel(change);
      add(change.bg);
      add(change.t);
      add(text(this, 760, 130, t('account.email'), 10, '#c8d0f0'));
      add(text(this, 760, 150, u.email, 12, '#ffffff'));
      const status = syncStatus.lastError
        ? t('account.syncError', { err: syncStatus.lastError })
        : syncStatus.lastOkAt ? t('account.syncedAt', { time: new Date(syncStatus.lastOkAt).toLocaleTimeString(locale()) }) : t('account.autoSync');
      add(text(this, 760, 180, status, 10, syncStatus.lastError ? '#ff9a9a' : '#9fe08a'));
      const out = button(this, 1110, 162, t('account.signOut'), () => void this.logout(), 150);
      smallLabel(out);
      add(out.bg);
      add(out.t);

      // hai thẻ save: trên máy / trên mây
      const local = getGame() ?? peekLocalSave();
      this.saveCard(add, 160, 280, t('account.local'), 'bag', local ? { badges: local.badges.length, caught: local.dex?.caught.length ?? 0, playMs: local.playMs, when: '' } : null);
      const c = this.cloud;
      this.saveCard(add, 660, 280, t('account.cloud'), 'upgrade', c ? { badges: c.badges, caught: c.caught, playMs: c.playMs, when: new Date(c.updatedAt).toLocaleString(locale()) } : null);
      const up = button(this, 400, 560, t('account.upload'), () => void this.upload(), 380);
      smallLabel(up);
      const down = button(this, 900, 560, t('account.download'), () => void this.download(), 380);
      smallLabel(down);
      if (!local) up.bg.setAlpha(0.4);
      if (!c) down.bg.setAlpha(0.4);
      add(up.bg);
      add(up.t);
      add(down.bg);
      add(down.t);
    }
    const back = button(this, width / 2, 676, u || !cloudEnabled ? t('account.back') : t('account.guest'), () => this.leave(), u || !cloudEnabled ? 240 : 380);
    smallLabel(back);
    add(back.bg);
    add(back.t);
    this.layer = this.add.container(0, 0, items);
  }

  private saveCard(
    add: <T extends Phaser.GameObjects.GameObject>(o: T) => T, x: number, y: number, title: string, ic: string,
    s: { badges: number; caught: number; playMs: number; when: string } | null,
  ) {
    add(pixelPanel(this, x, y, 460, 230));
    add(icon(this, x + 36, y + 36, ic, 2));
    add(text(this, x + 60, y + 36, title, 12, COLORS.gold).setOrigin(0, 0.5));
    if (!s) {
      add(text(this, x + 230, y + 130, t('account.noSave'), 12, '#8a94b8').setOrigin(0.5));
      return;
    }
    const rows: [string, string][] = [
      [t('account.badges'), `${s.badges} / 8`],
      [t('account.caught'), t('account.caughtN', { n: s.caught })],
      [t('account.playTime'), formatTime(s.playMs)],
    ];
    if (s.when) rows.push([t('account.updated'), s.when]);
    rows.forEach(([k, v], i) => {
      add(text(this, x + 36, y + 78 + i * 32, k, 12, '#c8d0f0'));
      add(text(this, x + 424, y + 78 + i * 32, v, 12, '#ffffff').setOrigin(1, 0));
    });
  }

  private async submit() {
    if (this.busy || currentUser() || !cloudEnabled) return;
    const vals = this.doms.map((d) => (d.node as HTMLInputElement).value.trim());
    const [email, password] = vals;
    if (!email || !password) return this.say(t('account.needBoth'));
    this.busy = true;
    this.say(t('account.working'), '#c8d0f0');
    const r = this.tab === 'login' ? await signIn(email, password) : await signUp(email, password);
    this.busy = false;
    if (!r.ok) {
      playSfx('warn');
      return this.say(r.error ?? t('account.error'));
    }
    if ('needsConfirm' in r && r.needsConfirm) {
      playSfx('select');
      this.tab = 'login';
      this.render();
      return this.say(t('account.created'), '#9fe08a');
    }
    playSfx('badge');
    await this.afterLogin();
    // tài khoản mới (hoặc chưa thiết lập): chọn nhân vật + đặt tên trước
    if (!currentUser()?.setupDone) this.scene.start('Character', { next: 'Account' });
  }

  /** Vừa đăng nhập: tự đồng bộ nếu chỉ có một bên có save; có cả hai thì để người chơi chọn */
  private async afterLogin() {
    this.cloud = await fetchCloudSave();
    const local = getGame() ?? peekLocalSave();
    const u = currentUser();
    if (!this.cloud && local) {
      if (u) local.trainer = u.trainerName;
      await pushCloudSave(local);
      this.cloud = await fetchCloudSave();
      this.render();
      this.say(t('account.hiUploaded', { name: u?.trainerName ?? '' }), '#9fe08a');
    } else if (this.cloud && !local) {
      importSave(this.cloud.data);
      this.render();
      this.say(t('account.hiDownloaded', { name: u?.trainerName ?? '' }), '#9fe08a');
    } else if (this.cloud && local) {
      this.render();
      this.say(t('account.both'), '#ffd34a');
    } else {
      this.render();
      this.say(t('account.hiNew', { name: u?.trainerName ?? '' }), '#9fe08a');
    }
  }

  private async refreshCloud() {
    this.cloud = await fetchCloudSave();
    if (this.scene.isActive()) this.render();
  }

  private async upload() {
    const local = getGame() ?? peekLocalSave();
    if (!local || this.busy) return;
    this.busy = true;
    const ok = await pushCloudSave(local as GameState);
    this.cloud = await fetchCloudSave();
    this.busy = false;
    this.render();
    if (ok) playSfx('pickup');
    this.say(ok ? t('account.uploaded') : t('account.uploadFail', { err: syncStatus.lastError }), ok ? '#9fe08a' : '#ff9a9a');
  }

  private async download() {
    if (!this.cloud || this.busy) return;
    const g = importSave(this.cloud.data);
    this.render();
    if (g) playSfx('pickup');
    this.say(g ? t('account.downloaded') : t('account.badCloud'), g ? '#9fe08a' : '#ff9a9a');
  }

  private async logout() {
    if (this.busy) return;
    this.busy = true;
    await signOut();
    this.busy = false;
    this.cloud = null;
    this.render();
    this.say(t('account.loggedOut'), '#c8d0f0');
  }

  private leave() {
    this.clear();
    playSfx('select');
    this.scene.start(this.from);
  }
}
