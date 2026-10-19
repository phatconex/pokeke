// Màn hình chính: nền hoàng hôn Kanto, logo, menu nút bo tròn (Tiếp tục / Phiêu lưu mới / Sinh tồn / Tài khoản / Cài đặt),
// thanh trên (tiền, huy hiệu, tắt tiếng / toàn màn hình / cài đặt), thẻ đội, chân trang gọn.
import Phaser from 'phaser';
import { generateTitleScene } from '../art/titleArt';
import { STAGE_BY_ID } from '../data/stages';
import { BADGES } from '../data/trainers';
import { applyDevTest, getGame, hasSave, loadGame, teamMembers } from '../game/state';
import { formatTime, loadRecords } from '../systems/records';
import { getSettings, toggleSetting } from '../systems/settings';
import { playSfx } from '../systems/sfx';
import { pokemonIcon } from '../ui/pokemonIcon';
import { COLORS, icon, outlinedText, text } from '../ui/style';
import { animKey, SPRITE_METRICS } from '../entities/PokemonSprite';
import { assetStatus } from './BootScene';
import { playMusic } from '../systems/music';
import { cloudEnabled, currentUser } from '../systems/cloud';
import { trainerAvatar } from '../game/state';
import { openSettingsPanel, SettingsTab } from '../ui/settingsPanel';
import { fmtNum, t } from '../i18n';
import { stageName } from '../i18n/content';

interface Item {
  icon: string;
  title: string;
  sub: string;
  enabled: boolean;
  run: () => void;
}

interface Row {
  draw: (on: boolean, hover?: boolean) => void;
  arrow: Phaser.GameObjects.Image;
  title: Phaser.GameObjects.Text;
  sub: Phaser.GameObjects.Text;
}

// bảng màu nút bo tròn (đồng bộ với bảng Cài đặt)
const PILL = {
  fill: 0x1f2a5c,
  fillHover: 0x2a3a82,
  fillOn: 0x3a5ab8,
  fillOff: 0x161c34,
  edge: 0x8a9ad8,
  edgeOn: 0xffd34a,
  edgeOff: 0x3a4468,
};

/** thu nhỏ chữ nếu vượt quá bề rộng cho phép (chuỗi dịch dài hơn bản gốc) */
function fit(tx: Phaser.GameObjects.Text, max: number) {
  tx.setScale(1);
  if (tx.width > max) tx.setScale(max / tx.width);
  return tx;
}

export class MenuScene extends Phaser.Scene {
  private items: Item[] = [];
  private rows: Row[] = [];
  private selected = 0;
  private confirmNew = false;
  private leaving = false;
  private settings: Phaser.GameObjects.Container | null = null;
  private soundBtn: Phaser.GameObjects.Image | null = null;

  constructor() {
    super('Menu');
  }

  /** mở lại bảng Cài đặt ở thẻ này sau khi vẽ lại menu (đổi ngôn ngữ...) */
  private reopenTab: SettingsTab | null = null;

  init(data: { settingsTab?: SettingsTab } | undefined) {
    this.reopenTab = data?.settingsTab ?? null;
  }

  create() {
    // bản dev: ?test trên URL → mở mọi ải + tặng đội 3 Pokémon dạng cuối Lv50 (xem applyDevTest)
    if (import.meta.env.DEV && new URLSearchParams(window.location.search).has('test')) {
      const g0 = getGame() ?? loadGame();
      if (g0 && applyDevTest(g0)) console.info('[dev] test mode: all stages open, team = Charizard/Blastoise/Venusaur Lv50');
    }
    playMusic('title');
    this.leaving = false;
    this.confirmNew = false;
    this.rows = [];
    this.settings = null;
    const { width, height } = this.scale;
    this.input.setDefaultCursor('default');
    if (!this.textures.exists('title-bg')) generateTitleScene(this, 'title-bg');
    this.add.image(0, 0, 'title-bg').setOrigin(0).setScale(2);
    this.cameras.main.fadeIn(350, 0, 0, 0);

    // Satoshi & Pikachu trên đồi
    const ash = this.add.sprite(300, 558, `trainer-${trainerAvatar()}`, 9).setOrigin(0.5, 1).setScale(4);
    this.tweens.add({ targets: ash, y: ash.y - 2, duration: 1600, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
    const m = SPRITE_METRICS.pikachu;
    const pk = this.add.sprite(364, 570, m?.animated ? 'pikachu-idle' : 'pikachu-fallback', 0).setScale(3);
    if (m?.animated) pk.play(animKey('pikachu', 'idle', 4));
    pk.y = 570 - (m?.footOffset ?? 16) * 3;
    this.time.addEvent({ delay: 2600, loop: true, callback: () => pk.setFlipX(!pk.flipX) });
    for (let i = 0; i < 16; i++) {
      const f = this.add.rectangle(Phaser.Math.Between(80, 1180), Phaser.Math.Between(470, 700), 3, 3, 0xfff0a0, 0.9);
      this.tweens.add({ targets: f, y: f.y - Phaser.Math.Between(10, 40), alpha: 0.1, duration: Phaser.Math.Between(1800, 3200), yoyo: true, repeat: -1, delay: Phaser.Math.Between(0, 2000) });
    }

    // logo
    const logo = outlinedText(this, 470, 150, 'POKEKE', 80, '#ffcc40', '#2a1430', 6, true);
    const grd = logo.main.context.createLinearGradient(0, 10, 0, logo.main.height - 10);
    grd.addColorStop(0, '#fff2a0');
    grd.addColorStop(0.55, '#ffb030');
    grd.addColorStop(1, '#f05a10');
    logo.main.setFill(grd);
    this.tweens.add({ targets: logo.all, y: '-=4', duration: 1800, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
    const hero = (currentUser()?.trainerName ?? getGame()?.trainer ?? 'Satoshi').toUpperCase();
    outlinedText(this, 470, 228, t('menu.journey', { name: hero }), 24, '#fff4e0', '#2a1430', 2);

    // ---- dữ liệu lưu ----
    const save = hasSave();
    const g = save ? getGame() ?? loadGame() : null;
    const recs = loadRecords();

    // thanh trên: tiền + huy hiệu (trái), tắt tiếng / toàn màn hình / cài đặt (phải)
    if (g) {
      this.pill(16, 14, 168, fmtNum(g.money), 'coin');
      this.pill(196, 14, 132, `${g.badges.length} / 8`, 'medal');
    }
    this.soundBtn = this.roundButton(width - 196, 14, getSettings().muted ? 'mute' : 'sound', () => this.toggleSound());
    this.roundButton(width - 136, 14, 'fullscreen', () => this.scale.toggleFullscreen());
    this.roundButton(width - 76, 14, 'gear', () => this.openSettings());
    // Skill Lab (bản dev): xem trước chiêu mọi loài / mọi cấp
    if (import.meta.env.DEV) this.labButton(width - 336, 14);

    // ---- menu: các nút bo tròn ----
    const cur = g ? STAGE_BY_ID[g.cursor] : null;
    const user = currentUser();
    this.items = [
      { icon: 'pokeball', title: t('menu.continue'), sub: g ? `Kanto · ${cur ? stageName(cur) : ''} · ${formatTime(g.playMs)}` : t('menu.noSave'), enabled: !!g, run: () => this.continueGame() },
      { icon: 'map', title: t('menu.new'), sub: t('menu.newSub'), enabled: true, run: () => this.newGame() },
      { icon: 'sword', title: t('menu.survival'), sub: t('menu.survivalSub', { time: formatTime(recs.bestTimeMs), kills: recs.bestKills }), enabled: true, run: () => this.go('Battle', { kind: 'survival' }) },
      {
        icon: 'people', title: t('menu.account'), enabled: cloudEnabled, run: () => this.go('Account', { from: 'Menu' }),
        sub: !cloudEnabled ? t('menu.accountOff') : user ? t('menu.accountUser', { name: user.trainerName }) : t('menu.accountGuest'),
      },
      { icon: 'gear', title: t('menu.settings'), sub: t('menu.settingsSub'), enabled: true, run: () => this.openSettings() },
      { icon: 'book', title: t('tut.menu'), sub: t('tut.menuSub'), enabled: !!g, run: () => this.go('Battle', { kind: 'stage', stageId: 'tutorial', replay: true }) },
    ];
    const mx = 800;
    const mw = 452;
    const rh = 64;
    const my = 186;
    this.items.forEach((it, i) => {
      const y = my + i * (rh + 8);
      const gfx = this.add.graphics();
      const draw = (on: boolean, hover = false) => {
        gfx.clear();
        gfx.fillStyle(0x000000, 0.35).fillRoundedRect(mx + 3, y + 5, mw, rh, 16);
        const fill = !it.enabled ? PILL.fillOff : on ? PILL.fillOn : hover ? PILL.fillHover : PILL.fill;
        gfx.fillStyle(fill, it.enabled ? 0.94 : 0.85).fillRoundedRect(mx, y, mw, rh, 16);
        gfx.lineStyle(3, !it.enabled ? PILL.edgeOff : on ? PILL.edgeOn : PILL.edge, 1).strokeRoundedRect(mx + 1.5, y + 1.5, mw - 3, rh - 3, 15);
      };
      draw(false);
      const hit = this.add.rectangle(mx + mw / 2, y + rh / 2, mw, rh, 0xffffff, 0.001).setInteractive({ useHandCursor: it.enabled });
      hit.on('pointerover', () => this.select(i));
      hit.on('pointerdown', () => {
        this.select(i);
        this.confirm();
      });
      icon(this, mx + 36, y + rh / 2, it.icon, 2).setAlpha(it.enabled ? 1 : 0.4);
      const title = text(this, mx + 66, y + 7, it.title, 22, it.enabled ? '#ffffff' : '#7a84a8');
      const sub = fit(text(this, mx + 66, y + rh - 9, it.sub, 11, it.enabled ? '#c8d0f0' : '#5a6488').setOrigin(0, 1), mw - 110);
      const arrow = icon(this, mx + mw - 28, y + rh / 2, 'play', 2).setTint(0xffd34a).setVisible(false);
      this.rows.push({ draw, arrow, title, sub });
    });
    this.selected = g ? 0 : 1;
    this.select(this.selected);

    // ---- thẻ đội + huy hiệu ----
    if (g) {
      const ty = my + this.items.length * (rh + 8) + 6;
      const th = 86;
      const card = this.add.graphics();
      card.fillStyle(0x000000, 0.35).fillRoundedRect(mx + 3, ty + 5, mw, th, 16);
      card.fillStyle(PILL.fill, 0.94).fillRoundedRect(mx, ty, mw, th, 16);
      card.lineStyle(3, PILL.edge, 1).strokeRoundedRect(mx + 1.5, ty + 1.5, mw - 3, th - 3, 15);
      teamMembers(g).forEach((mm, i) => {
        const cx = mx + 44 + i * 66;
        pokemonIcon(this, mm.speciesId, cx, ty + 36, 36);
        text(this, cx, ty + 60, `Lv${mm.level}`, 10, '#ffffff').setOrigin(0.5, 0);
      });
      for (let i = 0; i < 8; i++) {
        const b = g.badges[i];
        this.add.image(mx + 290 + (i % 4) * 36, ty + 28 + Math.floor(i / 4) * 30, b ? BADGES[b]?.texture ?? 'badge-empty' : 'badge-empty').setScale(2);
      }
    }

    // ---- chân trang gọn: phiên bản (trái) + phím tắt (phải) ----
    this.add.rectangle(0, height - 28, width, 28, 0x0b0f1e, 0.6).setOrigin(0);
    fit(text(this, 16, height - 14, t('menu.footer'), 10, '#fff4e0').setOrigin(0, 0.5).setAlpha(0.8), width - 340);
    text(this, width - 16, height - 14, t('common.hint.udConfirm'), 10, '#fff4e0').setOrigin(1, 0.5).setAlpha(0.9);
    if (assetStatus.failed.length) text(this, 16, height - 48, t('menu.missingAssets', { list: assetStatus.failed.join(', ') }), 10, '#ff9a9a');

    const kb = this.input.keyboard!;
    kb.on('keydown-UP', () => this.move(-1));
    kb.on('keydown-W', () => this.move(-1));
    kb.on('keydown-DOWN', () => this.move(1));
    kb.on('keydown-S', () => this.move(1));
    kb.on('keydown-ENTER', () => this.confirm());
    kb.on('keydown-SPACE', () => this.confirm());
    kb.on('keydown-ESC', () => this.closeSettings());
    kb.on('keydown-M', () => this.toggleSound());
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => kb.removeAllListeners());
    if (this.reopenTab) this.openSettings(this.reopenTab);
  }

  private pill(x: number, y: number, w: number, label: string, iconName: string) {
    const h = 44;
    const g = this.add.graphics();
    g.fillStyle(0x000000, 0.35).fillRoundedRect(x + 3, y + 4, w, h, 22);
    g.fillStyle(0x0b0f1e, 0.92).fillRoundedRect(x, y, w, h, 22);
    g.lineStyle(3, PILL.edge, 1).strokeRoundedRect(x + 1.5, y + 1.5, w - 3, h - 3, 20);
    icon(this, x + 26, y + h / 2, iconName, 2);
    fit(text(this, x + 48, y + h / 2, label, 22, '#ffffff').setOrigin(0, 0.5), w - 62);
  }

  /** nút "Skill Lab" nhỏ cạnh các nút tròn (chỉ bản dev) */
  private labButton(x: number, y: number) {
    const w = 128;
    const h = 44;
    const g = this.add.graphics();
    const draw = (hover: boolean) => {
      g.clear();
      g.fillStyle(0x000000, 0.35).fillRoundedRect(x + 3, y + 4, w, h, 14);
      g.fillStyle(hover ? PILL.fillHover : PILL.fill, 0.94).fillRoundedRect(x, y, w, h, 14);
      g.lineStyle(3, hover ? PILL.edgeOn : PILL.edge, 1).strokeRoundedRect(x + 1.5, y + 1.5, w - 3, h - 3, 13);
    };
    draw(false);
    icon(this, x + 22, y + h / 2, 'flame', 1.5);
    fit(text(this, x + 38, y + h / 2, t('lab.open'), 14, '#ffffff').setOrigin(0, 0.5), w - 46);
    const hit = this.add.rectangle(x + w / 2, y + h / 2, w, h, 0xffffff, 0.001).setInteractive({ useHandCursor: true });
    hit.on('pointerover', () => draw(true));
    hit.on('pointerout', () => draw(false));
    hit.on('pointerdown', () => this.go('SkillLab', {}));
  }

  private roundButton(x: number, y: number, iconName: string, onClick: () => void) {
    const w = 50;
    const h = 44;
    const g = this.add.graphics();
    const draw = (hover: boolean) => {
      g.clear();
      g.fillStyle(0x000000, 0.35).fillRoundedRect(x + 3, y + 4, w, h, 14);
      g.fillStyle(hover ? PILL.fillHover : PILL.fill, 0.94).fillRoundedRect(x, y, w, h, 14);
      g.lineStyle(3, hover ? PILL.edgeOn : PILL.edge, 1).strokeRoundedRect(x + 1.5, y + 1.5, w - 3, h - 3, 13);
    };
    draw(false);
    const ic = icon(this, x + w / 2, y + h / 2, iconName, 2);
    const hit = this.add.rectangle(x + w / 2, y + h / 2, w, h, 0xffffff, 0.001).setInteractive({ useHandCursor: true });
    hit.on('pointerover', () => draw(true));
    hit.on('pointerout', () => draw(false));
    hit.on('pointerdown', onClick);
    return ic;
  }

  private toggleSound() {
    const s = toggleSetting('muted');
    this.soundBtn?.setFrame(s.muted ? 'mute' : 'sound');
    playSfx('select');
    if (this.settings) this.openSettings();
  }

  private move(step: number) {
    if (this.settings) return;
    let i = this.selected;
    for (let n = 0; n < this.items.length; n++) {
      i = (i + step + this.items.length) % this.items.length;
      if (this.items[i].enabled) break;
    }
    this.select(i);
    playSfx('talk');
  }

  private select(i: number) {
    if (!this.items[i]?.enabled) return;
    if (i !== this.selected) this.confirmNew = false;
    this.selected = i;
    this.rows.forEach((r, j) => {
      r.draw(j === i);
      r.arrow.setVisible(j === i);
      r.title.setColor(j === i ? COLORS.gold : this.items[j].enabled ? '#ffffff' : '#7a84a8');
    });
    const sub = this.rows[1]?.sub;
    if (sub) fit(sub.setText(this.confirmNew ? t('menu.newConfirm') : this.items[1].sub).setColor(this.confirmNew ? '#ff9a9a' : '#c8d0f0'), 452 - 110);
  }

  private confirm() {
    if (this.settings || this.leaving) return;
    this.items[this.selected]?.run();
  }

  private go(key: string, data?: object) {
    this.leaving = true;
    playSfx('select');
    this.cameras.main.fadeOut(250, 0, 0, 0);
    this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => this.scene.start(key, data));
  }

  private continueGame() {
    if (!loadGame()) return;
    this.go('StageMap', {});
  }

  private newGame() {
    if (hasSave() && !this.confirmNew) {
      this.confirmNew = true;
      this.select(1);
      playSfx('warn');
      return;
    }
    // chọn nhân vật + đặt tên trước khi chọn vùng
    this.go('Character', { next: 'RegionSelect' });
  }

  // ---- cài đặt ----
  private openSettings(tab?: SettingsTab) {
    this.settings?.destroy(true);
    this.settings = openSettingsPanel(this, {
      tab,
      onClose: () => this.closeSettings(),
      // đổi ngôn ngữ / âm thanh / đăng xuất → vẽ lại menu (mở lại đúng thẻ đang xem)
      onRebuild: (t) => this.scene.restart({ settingsTab: t }),
      onAccount: () => this.go('Account', { from: 'Menu' }),
    });
  }

  private closeSettings() {
    this.settings?.destroy(true);
    this.settings = null;
  }
}
