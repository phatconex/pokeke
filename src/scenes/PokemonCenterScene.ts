// Trung tâm Pokémon: bước vào bên trong – Joy sau quầy, máy hồi phục, các Pokémon bị thương
// nằm trên giường (bấm vào giường để chữa), quầy Poké Mart bên phải để mua bóng / thuốc.
import Phaser from 'phaser';
import { CATCH, POTION } from '../config/balance';
import { CENTER_BEDS, CENTER_COUNTER, generateCenterInterior, generateCounterFront } from '../art/centerArt';
import { POKEMON } from '../data/pokemon';
import { careCost, GameState, getGame, memberStats, PartyMember, saveGame } from '../game/state';
import { playMusic } from '../systems/music';
import { playSfx } from '../systems/sfx';
import { pokemonIcon } from '../ui/pokemonIcon';
import { button, COLORS, icon, outlinedText, pixelFont, pixelPanel, text } from '../ui/style';
import { fmtNum, t } from '../i18n';
import { itemName, moveName, typeLabel } from '../i18n/content';
import { SKILL_UNLOCK } from '../config/balance';
import { MOVES } from '../data/moves';
import { slotLevel, trialState } from '../game/unlocks';

type ShopKey = 'pokeball' | 'greatball' | 'ultraball' | 'potion';
const SHOP: { key: ShopKey; need: number }[] = [
  { key: 'pokeball', need: 0 }, { key: 'greatball', need: 1 }, { key: 'ultraball', need: 5 }, { key: 'potion', need: 0 },
];

export class PokemonCenterScene extends Phaser.Scene {
  private g_!: GameState;
  private layer: Phaser.GameObjects.Container | null = null;
  private joyLine!: Phaser.GameObjects.Text;
  private busy = false;
  /** bảng Thử thách chiêu đang mở */
  private trialLayer: Phaser.GameObjects.Container | null = null;
  private openTrials = false;

  constructor() {
    super('PokeCenter');
  }

  init(data: { trials?: boolean } | undefined) {
    this.openTrials = !!data?.trials;
  }

  create() {
    const g = getGame();
    if (!g) {
      this.scene.start('Menu');
      return;
    }
    this.g_ = g;
    this.layer = null;
    this.busy = false;
    playMusic('map');
    playSfx('heal');
    generateCenterInterior(this);
    this.add.image(0, 0, 'center-interior').setOrigin(0).setScale(2);
    // Joy đứng sau quầy: mặt trước quầy vẽ đè lên phần chân
    generateCounterFront(this);
    this.add.sprite(640, CENTER_COUNTER.y * 2 + 22, 'trainer-joy', 0).setScale(3).setOrigin(0.5, 1);
    this.add.image(CENTER_COUNTER.x * 2, CENTER_COUNTER.y * 2, 'center-counter').setOrigin(0).setScale(2);
    outlinedText(this, 640, 30, t('center.title'), 24, '#ffb0c8', '#2a1430', 2).all.forEach((o) => o.setDepth(5));

    // lời Joy
    pixelPanel(this, 460, 296, 360, 54).setDepth(4);
    this.joyLine = text(this, 640, 323, '', 12, '#ffffff', { align: 'center', wordWrap: { width: 330 } }).setOrigin(0.5).setDepth(5);

    const exit = button(this, 640, 686, t('center.exit'), () => this.leave(), 300);
    exit.bg.setDepth(5);
    exit.t.setDepth(6);
    this.input.keyboard?.on('keydown-ESC', () => (this.trialLayer ? this.closeTrials() : this.leave()));
    this.input.keyboard?.on('keydown-H', () => this.healAll());
    this.input.keyboard?.on('keydown-T', () => (this.trialLayer ? this.closeTrials() : this.showTrials()));
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.input.keyboard?.removeAllListeners());
    this.trialLayer = null;
    this.render();
    if (this.openTrials) this.showTrials();
  }

  private injured(): PartyMember[] {
    return this.g_.box.filter((m) => m.injured);
  }

  private say(line: string) {
    this.joyLine.setText(t('center.joy', { line }));
  }

  private render() {
    this.layer?.destroy(true);
    const g = this.g_;
    const items: Phaser.GameObjects.GameObject[] = [];
    const injured = this.injured();
    this.say(injured.length
      ? t('center.injured', { n: injured.length })
      : t('center.welcome'));

    // ---- tiền
    items.push(pixelPanel(this, 1040, 10, 228, 50));
    items.push(icon(this, 1066, 35, 'coin', 2));
    items.push(text(this, 1086, 35, `${fmtNum(g.money)}₽`, 20, COLORS.gold).setOrigin(0, 0.5));

    // ---- giường bệnh: Pokémon bị thương nằm nghỉ
    CENTER_BEDS.forEach((b, i) => {
      const m = injured[i];
      const cx = (b.x + b.w / 2) * 2;
      const cy = (b.y + b.h / 2) * 2;
      if (!m) {
        items.push(text(this, cx + 10, cy, t('center.empty'), 10, '#c8a8b8').setOrigin(0.5));
        return;
      }
      // nằm nghiêng trên giường, có băng y tế
      const spr = pokemonIcon(this, m.speciesId, cx + 14, cy + 4, 44, false).setAngle(-90).setTint(0xf0e0e8);
      items.push(spr);
      this.tweens.add({ targets: spr, scaleY: spr.scaleY * 1.04, yoyo: true, repeat: -1, duration: 900, ease: 'Sine.inOut' });
      items.push(icon(this, cx - 54, cy - 30, 'heart', 1.25));
      const cost = careCost(m);
      const can = g.money >= cost;
      items.push(text(this, cx + 16, cy - 38, `${POKEMON[m.speciesId].name} Lv ${m.level}`, 10, '#3a2030').setOrigin(0.5));
      const bg = this.add.rectangle(cx, cy + 60, 120, 22, can ? 0x2f7a30 : 0x6a5a62).setStrokeStyle(2, can ? 0x9fe08a : 0x9a8a92);
      bg.setInteractive({ useHandCursor: true }).on('pointerdown', () => this.heal([m]));
      items.push(bg, text(this, cx, cy + 60, t('center.heal', { cost: fmtNum(cost) }), 10, '#ffffff').setOrigin(0.5));
      // bấm vào giường cũng chữa
      const hit = this.add.rectangle(cx, cy, b.w * 2, b.h * 2, 0xffffff, 0.001).setInteractive({ useHandCursor: true });
      hit.on('pointerdown', () => this.heal([m]));
      items.push(hit);
    });
    if (injured.length > CENTER_BEDS.length) {
      items.push(text(this, 230, 700, t('center.waiting', { n: injured.length - CENTER_BEDS.length }), 10, '#ffffff').setOrigin(0.5));
    }

    // ---- máy hồi phục: chữa tất cả
    if (injured.length) {
      const total = injured.reduce((s, m) => s + careCost(m), 0);
      const b = button(this, 640, 386, t('center.healAll', { cost: fmtNum(total) }), () => this.healAll(), 300);
      b.t.setFontSize(pixelFont(12).px);
      items.push(b.bg, b.t);
    }

    // ---- Thử thách chiêu (mở chiêu U): nút cạnh máy hồi phục
    const tb = button(this, 640, 630, `${t('center.trials')} (T)`, () => this.showTrials(), 300);
    tb.t.setFontSize(pixelFont(12).px);
    items.push(tb.bg, tb.t);

    // ---- quầy Poké Mart
    const sx = 900;
    const sy = 420;
    items.push(pixelPanel(this, sx, sy, 368, 250));
    items.push(text(this, sx + 20, sy + 14, t('center.mart'), 12, COLORS.gold));
    SHOP.forEach((it, i) => {
      const y = sy + 56 + i * 48;
      const def = it.key === 'potion' ? { name: itemName('potion'), price: POTION.price, texture: 'potion' } : { ...CATCH.balls[it.key], name: itemName(it.key) };
      items.push(icon(this, sx + 32, y, def.texture, 2));
      items.push(text(this, sx + 54, y - 12, def.name, 10, '#ffffff'));
      items.push(text(this, sx + 54, y + 2, t('center.priceHave', { price: fmtNum(def.price), n: g.items[it.key] }), 10, '#c8d0f0'));
      if (g.badges.length < it.need) {
        items.push(text(this, sx + 290, y, t(it.need === 1 ? 'center.needBadge1' : 'center.needBadges', { n: it.need }), 10, '#ffd0a0').setOrigin(0.5));
        return;
      }
      for (const qty of [1, 5]) {
        const bx = sx + 240 + (qty === 1 ? 0 : 74);
        const can = g.money >= def.price * qty;
        const bg = this.add.rectangle(bx, y, 66, 26, can ? 0x8a3a10 : 0x4a4048).setStrokeStyle(2, can ? 0xffd34a : 0x7a7078);
        bg.setInteractive({ useHandCursor: true }).on('pointerdown', () => this.buy(it.key, def.price, qty, def.name));
        items.push(bg, text(this, bx, y, t('center.buy', { n: qty }), 10, '#ffffff').setOrigin(0.5));
      }
    });

    this.layer = this.add.container(0, 0, items).setDepth(3);
  }

  private heal(list: PartyMember[]) {
    if (this.busy || !list.length) return;
    const g = this.g_;
    const cost = list.reduce((s, m) => s + careCost(m), 0);
    // không còn con nào khỏe để đi kiếm tiền → chữa bằng số tiền đang có (tránh kẹt game)
    const stranded = !g.box.some((m) => !m.injured && !list.includes(m));
    if (g.money < cost && !stranded) {
      playSfx('warn');
      this.say(t('center.cantAffordCare'));
      return;
    }
    g.money -= Math.min(cost, g.money);
    for (const m of list) {
      m.injured = false;
      m.hp = memberStats(m).maxHp;
    }
    saveGame();
    playSfx('heal');
    this.busy = true;
    // hiệu ứng: máy hồi phục nháy, Joy chúc
    const flash = this.add.rectangle(0, 0, 1280, 720, 0xffb0c8, 0.35).setOrigin(0).setDepth(20);
    this.tweens.add({ targets: flash, alpha: 0, duration: 500, onComplete: () => flash.destroy() });
    const names = list.map((m) => POKEMON[m.speciesId].name).join(', ');
    this.time.delayedCall(450, () => {
      this.busy = false;
      this.render();
      this.say(t('center.healed', { names }));
    });
  }

  private healAll() {
    this.heal(this.injured());
  }

  private buy(key: ShopKey, price: number, qty: number, name: string) {
    const g = this.g_;
    if (g.money < price * qty) {
      playSfx('warn');
      this.say(t('center.noMoney'));
      return;
    }
    g.money -= price * qty;
    g.items[key] += qty;
    saveGame();
    playSfx('pickup');
    this.render();
    this.say(t('center.bought', { n: qty, item: name }));
  }

  /** Bảng Thử thách chiêu: mọi Pokémon có ô U – trạng thái (cần cấp / bắt đầu / đã vượt) */
  private showTrials() {
    if (this.trialLayer) return;
    playSfx('select');
    this.say(t('center.trialJoy'));
    const g = this.g_;
    const items: Phaser.GameObjects.GameObject[] = [];
    const W = 640;
    const x0 = 640 - W / 2;
    const tc = SKILL_UNLOCK.trial;
    // đội trước, rồi Hộp
    const list = [...g.team.map((u) => g.box.find((m) => m.uid === u)!).filter(Boolean), ...g.box.filter((m) => !g.team.includes(m.uid))]
      .filter((m) => trialState(m) !== 'none').slice(0, 6);
    const H = 176 + Math.max(1, list.length) * 56;
    const y0 = 360 - H / 2;
    items.push(this.add.rectangle(0, 0, 1280, 720, 0x000000, 0.55).setOrigin(0).setInteractive());
    items.push(pixelPanel(this, x0, y0, W, H));
    items.push(...outlinedText(this, 640, y0 + 30, t('center.trialsTitle'), 24, '#ffd34a', '#2a1430', 2).all);
    items.push(text(this, 640, y0 + 58, t('center.trialsHint', { s: tc.durationS, n: tc.kills }), 10, '#c8d0f0', { align: 'center', wordWrap: { width: W - 60 } }).setOrigin(0.5, 0));
    if (!list.length) items.push(text(this, 640, y0 + 120, t('center.trialNone'), 12, '#ffffff').setOrigin(0.5));
    list.forEach((m, i) => {
      const y = y0 + 112 + i * 56;
      const sp = POKEMON[m.speciesId];
      const st = trialState(m);
      const g2 = this.add.graphics();
      g2.fillStyle(0x1a2650, 1).fillRoundedRect(x0 + 24, y, W - 48, 48, 10);
      g2.lineStyle(2, st === 'cleared' ? 0x9fe08a : 0x3a4a88, 1).strokeRoundedRect(x0 + 24, y, W - 48, 48, 10);
      items.push(g2, pokemonIcon(this, m.speciesId, x0 + 52, y + 24, 36));
      const u = sp.skills.find((s) => s.slot === 'U');
      items.push(text(this, x0 + 80, y + 8, `${sp.name}  Lv ${m.level}`, 12, '#ffffff'));
      items.push(text(this, x0 + 80, y + 28, `${typeLabel(sp.types[0])} · U: ${u ? moveName(MOVES[u.move]) : '-'}`, 10, '#a8b0d0'));
      const bx = x0 + W - 110;
      if (st === 'cleared') items.push(text(this, bx, y + 24, t('center.trialCleared'), 12, '#9fe08a').setOrigin(0.5));
      else if (st === 'level') items.push(text(this, bx, y + 24, t('center.trialNeedLv', { lv: slotLevel(m.speciesId, 'U') }), 10, '#ffd0a0').setOrigin(0.5));
      else if (m.injured) items.push(text(this, bx, y + 24, t('team.injured'), 10, '#ff9a9a').setOrigin(0.5));
      else {
        const bg = this.add.rectangle(bx, y + 24, 140, 30, 0x8a3a10).setStrokeStyle(2, 0xffd34a).setInteractive({ useHandCursor: true });
        bg.on('pointerdown', () => this.startTrial(m));
        items.push(bg, text(this, bx, y + 24, t('center.trialStart'), 12, '#ffffff').setOrigin(0.5));
      }
    });
    const close = button(this, 640, y0 + H - 32, t('center.close'), () => this.closeTrials(), 220);
    close.t.setFontSize(pixelFont(12).px);
    items.push(close.bg, close.t);
    this.trialLayer = this.add.container(0, 0, items).setDepth(30);
  }

  private closeTrials() {
    this.trialLayer?.destroy(true);
    this.trialLayer = null;
    playSfx('select');
    this.render();
  }

  private startTrial(m: PartyMember) {
    saveGame();
    playSfx('select');
    this.cameras.main.fadeOut(250, 0, 0, 0);
    this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => this.scene.start('Battle', { kind: 'trial', uid: m.uid }));
  }

  private leave() {
    saveGame();
    playSfx('select');
    this.scene.start('StageMap', {});
  }
}
