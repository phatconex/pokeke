// Màn tiến hóa sau trận: hình bóng trắng nhấp nháy giữa 2 dạng, có thể hủy (B / Esc).
import Phaser from 'phaser';
import { POKEMON } from '../data/pokemon';
import { markCaught } from '../game/dex';
import { EvolutionItem, evolveMember, getGame, MemberStats, memberStats, saveGame } from '../game/state';
import { playSfx } from '../systems/sfx';
import { pokemonIcon } from '../ui/pokemonIcon';
import { COLORS, outlinedText, pixelPanel, text } from '../ui/style';
import { playMusic } from '../systems/music';
import { fmtNum, t } from '../i18n';
import { card, STAT_COLOR } from '../ui/statCard';
import { itemName } from '../i18n/content';

interface EvoItem {
  uid: string;
  from: string;
  into: string;
  /** tiến hóa bằng vật phẩm: hủy thì trả lại vật phẩm */
  item?: EvolutionItem;
}

export class EvolutionScene extends Phaser.Scene {
  private queue: EvoItem[] = [];
  private phase: 'anim' | 'done' = 'anim';
  private cancelled = false;
  private layer: Phaser.GameObjects.Container | null = null;

  constructor() {
    super('Evolution');
  }

  init(data: { queue?: EvoItem[] } | undefined) {
    this.queue = [...(data?.queue ?? [])];
  }

  create() {
    playMusic('evolution');
    this.cameras.main.setBackgroundColor('#0b0f1e');
    const kb = this.input.keyboard!;
    kb.on('keydown-B', () => this.cancel());
    kb.on('keydown-ESC', () => this.cancel());
    kb.on('keydown-ENTER', () => this.next());
    kb.on('keydown-SPACE', () => this.next());
    this.input.on(Phaser.Input.Events.POINTER_DOWN, () => this.next());
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      kb.removeAllListeners();
      this.input.removeAllListeners(Phaser.Input.Events.POINTER_DOWN);
    });
    this.play();
  }

  private play() {
    this.layer?.destroy(true);
    const item = this.queue[0];
    const game = getGame();
    const m = game?.box.find((b) => b.uid === item?.uid);
    if (!item || !m || m.speciesId !== item.from) {
      this.queue.shift();
      if (this.queue.length) this.play();
      else this.scene.start('StageMap', {});
      return;
    }
    this.phase = 'anim';
    this.cancelled = false;
    const { width, height } = this.scale;
    const items: Phaser.GameObjects.GameObject[] = [];
    // tia sáng nền
    const rays = this.add.graphics();
    for (let i = 0; i < 16; i++) {
      const a = (i / 16) * Math.PI * 2;
      rays.fillStyle(i % 2 ? 0x24305a : 0x1a2244, 1).slice(0, 0, 900, a, a + Math.PI / 8, false).fillPath();
    }
    // vẽ quanh gốc (0,0) rồi đặt vào tâm để xoay quanh tâm
    rays.setPosition(width / 2, height / 2 - 40);
    this.tweens.add({ targets: rays, angle: 360, duration: 20000, repeat: -1 });
    items.push(rays);
    const fromSpr = pokemonIcon(this, item.from, width / 2, height / 2 - 40, 140);
    const intoSpr = pokemonIcon(this, item.into, width / 2, height / 2 - 40, 140).setVisible(false);
    items.push(fromSpr, intoSpr);
    items.push(pixelPanel(this, 110, height - 170, width - 220, 130));
    const line = text(this, width / 2, height - 128, t('evolution.start', { name: POKEMON[item.from].name }), 24, '#ffffff').setOrigin(0.5);
    const hint = text(this, width / 2, height - 84, t('evolution.cancelHint'), 12, '#c8d0f0').setOrigin(0.5);
    items.push(line, hint);
    this.layer = this.add.container(0, 0, items);
    playSfx('level');

    // nhấp nháy giữa 2 hình bóng trắng, nhanh dần
    fromSpr.setTintFill(0xffffff);
    intoSpr.setTintFill(0xffffff);
    let elapsed = 0;
    let gap = 420;
    const flip = () => {
      if (this.cancelled || this.phase !== 'anim') return;
      elapsed += gap;
      const showInto = !intoSpr.visible;
      intoSpr.setVisible(showInto);
      fromSpr.setVisible(!showInto);
      playSfx('talk');
      gap = Math.max(70, gap * 0.85);
      if (elapsed < 3600) this.time.delayedCall(gap, flip);
      else this.finish(item, fromSpr, intoSpr, line, hint);
    };
    this.time.delayedCall(700, flip);
  }

  private finish(item: EvoItem, fromSpr: Phaser.GameObjects.Sprite, intoSpr: Phaser.GameObjects.Sprite, line: Phaser.GameObjects.Text, hint: Phaser.GameObjects.Text) {
    const game = getGame();
    const m = game?.box.find((b) => b.uid === item.uid);
    if (!m) return;
    // chỉ số gốc chuyển sang loài mới; cấp, Huấn luyện, nâng chiêu giữ nguyên (xem evolveMember)
    const before = memberStats(m);
    evolveMember(m, item.into);
    const after = memberStats(m);
    markCaught(game ?? null, item.into);
    saveGame();
    this.phase = 'done';
    this.cameras.main.flash(400, 255, 255, 255);
    playSfx('badge');
    fromSpr.setVisible(false);
    intoSpr.setVisible(true).clearTint();
    const { width, height } = this.scale;
    const title = outlinedText(this, width / 2, 90, t('evolution.title'), 48, COLORS.gold, '#2a1430', 4);
    this.layer?.add(title.all);
    line.setText(t('evolution.done', { from: POKEMON[item.from].name, into: POKEMON[item.into].name }));
    hint.setText(t('evolution.continue'));
    this.layer?.add(this.compare(before, after));
    for (let i = 0; i < 24; i++) {
      const s = this.add.image(width / 2, height / 2 - 40, 'icons', 'star').setScale(2);
      const a = Math.random() * Math.PI * 2;
      this.tweens.add({ targets: s, x: s.x + Math.cos(a) * 220, y: s.y + Math.sin(a) * 160, alpha: 0, duration: 900, onComplete: () => s.destroy() });
    }
  }

  /** Bảng so sánh chỉ số trước → sau tiến hóa */
  private compare(a: MemberStats, b: MemberStats): Phaser.GameObjects.GameObject[] {
    const items: Phaser.GameObjects.GameObject[] = [];
    const add = <T extends Phaser.GameObjects.GameObject>(o: T) => {
      items.push(o);
      return o;
    };
    const pct = (v: number) => `${Math.round(v * 100)}%`;
    const rows: [string, string, string, number, number, number][] = [
      [t('stat.hp'), fmtNum(a.maxHp), fmtNum(b.maxHp), a.maxHp, b.maxHp, STAT_COLOR.hp],
      [t('stat.atk'), fmtNum(a.attack), fmtNum(b.attack), a.attack, b.attack, STAT_COLOR.atk],
      [t('stat.def'), String(a.def), String(b.def), a.def, b.def, STAT_COLOR.def],
      [t('stat.speed'), String(Math.round(a.speed)), String(Math.round(b.speed)), Math.round(a.speed), Math.round(b.speed), STAT_COLOR.speed],
      [t('stat.crit'), pct(a.crit), pct(b.crit), a.crit, b.crit, STAT_COLOR.crit],
      [t('stat.haste'), a.haste > 0 ? `−${pct(a.haste)}` : '0%', b.haste > 0 ? `−${pct(b.haste)}` : '0%', a.haste, b.haste, STAT_COLOR.haste],
    ];
    if (a.regen > 0 || b.regen > 0) rows.push([t('stat.regen'), `${a.regen.toFixed(1)}/s`, `${b.regen.toFixed(1)}/s`, a.regenPct, b.regenPct, STAT_COLOR.regen]);
    const w = 330;
    const rowH = 30;
    const h = 64 + rows.length * rowH + 30;
    const x = this.scale.width - w - 40;
    const y = 150;
    card(this, add, x, y, w, h, { fill: 0x141c3a, edge: 0xffd34a, r: 14, edgeW: 3 });
    add(text(this, x + w / 2, y + 24, t('stat.compare'), 12, COLORS.gold).setOrigin(0.5));
    const g = add(this.add.graphics());
    rows.forEach(([label, va, vb, na, nb, color], i) => {
      const cy = y + 60 + i * rowH;
      g.fillStyle(color, 1).fillRoundedRect(x + 18, cy - 5, 10, 10, 3);
      add(text(this, x + 36, cy, label, 10, '#c8d0f0').setOrigin(0, 0.5));
      add(text(this, x + 196, cy, va, 10, '#a8b0d0').setOrigin(1, 0.5));
      const up = nb > na + 1e-9;
      const down = nb < na - 1e-9;
      add(text(this, x + 222, cy, '→', 10, up ? '#9fe08a' : down ? '#ff9a9a' : '#7a84a8').setOrigin(0.5));
      add(text(this, x + w - 18, cy, vb, 12, up ? '#9fe08a' : down ? '#ff9a9a' : '#ffffff').setOrigin(1, 0.5));
    });
    add(text(this, x + w / 2, y + h - 22, t('stat.compareNote'), 10, '#8a94b8').setOrigin(0.5));
    return items;
  }

  private cancel() {
    if (this.phase !== 'anim' || this.cancelled) return;
    this.cancelled = true;
    this.phase = 'done';
    const item = this.queue[0];
    const game = getGame();
    if (item.item && game) {
      game.items[item.item] += 1;
      saveGame();
    }
    playSfx('select');
    this.layer?.destroy(true);
    const { width, height } = this.scale;
    const items: Phaser.GameObjects.GameObject[] = [pokemonIcon(this, item.from, width / 2, height / 2 - 40, 140)];
    items.push(pixelPanel(this, 110, height - 170, width - 220, 130));
    items.push(text(this, width / 2, height - 128, t('evolution.stopped', { name: POKEMON[item.from].name }), 24, '#ffffff').setOrigin(0.5));
    items.push(text(this, width / 2, height - 84, item.item ? t('evolution.itemBack', { item: itemName(item.item) }) : t('evolution.askLater'), 12, '#c8d0f0').setOrigin(0.5));
    this.layer = this.add.container(0, 0, items);
  }

  private next() {
    if (this.phase !== 'done') return;
    this.queue.shift();
    if (this.queue.length) this.play();
    else this.scene.start('StageMap', {});
  }
}
