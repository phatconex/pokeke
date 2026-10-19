// Bản đồ ải của vùng: chọn ải, xem thông tin, vào Trung tâm Pokémon, đội hình.
import Phaser from 'phaser';
import { generateRegionMap } from '../art/regionMapArt';
import { levelCapFor, STAGE_REWARD } from '../config/balance';
import { isUnlocked, NodeKind, STAGES, StageDef } from '../data/stages';
import { BADGES, GYMS } from '../data/trainers';
import { buildRivalGym, rivalTeam } from '../data/rival';
import { CHAPTERS } from '../data/chapters';
import { GameState, getGame, saveGame, stageCleared } from '../game/state';
import { playSfx } from '../systems/sfx';
import { DialogBox } from '../ui/dialog';
import { pokemonIcon } from '../ui/pokemonIcon';
import { COLORS, icon, pixelFont, pixelPanel, text } from '../ui/style';
import { playMusic } from '../systems/music';
import { fmtNum, t } from '../i18n';
import { chapterTitle, gymText, stageLabel, stageName } from '../i18n/content';

const S = 2;

export class StageMapScene extends Phaser.Scene {
  private game_!: GameState;
  private cursor = 0;
  private hero!: Phaser.GameObjects.Sprite;
  private ring!: Phaser.GameObjects.Arc;
  private info!: Phaser.GameObjects.Container;
  private topRight: Phaser.GameObjects.Text[] = [];
  private dialog!: DialogBox;
  private moving = false;
  private fromData: { from?: string; intro?: boolean } = {};

  constructor() {
    super('StageMap');
  }

  init(data: { from?: string; intro?: boolean } | undefined) {
    this.fromData = data ?? {};
  }

  create() {
    playMusic('map');
    const g0 = getGame();
    if (!g0) {
      this.scene.start('Menu');
      return;
    }
    this.game_ = g0;
    this.moving = false;
    this.topRight = [];
    const { width } = this.scale;
    this.input.setDefaultCursor('default');

    if (!this.textures.exists('map-kanto')) generateRegionMap(this, 'map-kanto', { path: STAGES });
    this.add.image(0, 0, 'map-kanto').setOrigin(0).setScale(S);
    this.cameras.main.fadeIn(300, 0, 0, 0);

    this.drawPathAndNodes();

    // vị trí con trỏ: ải đang chọn, hoặc ải mới mở xa nhất
    const want = STAGES.findIndex((st) => st.id === this.game_.cursor);
    this.cursor = want >= 0 && this.unlocked(want) ? want : this.furthestUnlocked();
    const n = STAGES[this.cursor];
    this.ring = this.add.circle(n.x * S, n.y * S, 24).setStrokeStyle(3, 0xffffff, 0.9);
    this.tweens.add({ targets: this.ring, scale: 1.25, alpha: 0, duration: 900, repeat: -1 });
    this.hero = this.add.sprite(n.x * S, n.y * S - 40, `trainer-${this.game_.avatar ?? 'satoshi'}`, 0).setScale(2).setDepth(10);
    this.tweens.add({ targets: this.hero, y: '-=4', duration: 450, yoyo: true, repeat: -1, ease: 'Sine.inOut' });

    // ---- thanh trên ----
    pixelPanel(this, 10, 8, 440, 64);
    text(this, 30, 22, 'KANTO', 24, COLORS.gold);
    const b = this.game_.badges;
    const core = ['ch1', 'ch2', 'ch3'].map((id) => chapterTitle(id, t(`map.${id}`)));
    const later = CHAPTERS.filter((c) => c.title && c.badgesAtStart <= b.length).pop();
    const chapter = this.game_.flags.champion ? chapterTitle('champion', t('map.champion')) : later ? chapterTitle(later.id, later.title) : core[Math.min(b.length, core.length - 1)];
    const chT = text(this, 128, 20, chapter, 12, '#ffffff');
    // tiêu đề dài (vd. tiếng Anh) → thu nhỏ cho vừa khung
    if (chT.width > 306) {
      const f = pixelFont(10);
      chT.setFontFamily(f.family).setFontSize(f.px).setY(23);
    }
    text(this, 128, 40, t('map.levelCap', { lv: levelCapFor(this.game_.badges.length) }), 12, '#c8d0f0');
    pixelPanel(this, width - 470, 8, 460, 64);
    for (let i = 0; i < 8; i++) {
      const b = this.game_.badges[i];
      this.add.image(width - 446 + i * 28, 40, b ? BADGES[b]?.texture ?? 'badge-empty' : 'badge-empty').setScale(1.5);
    }
    icon(this, width - 216, 40, 'coin', 2);
    this.topRight.push(text(this, width - 198, 40, '', 24, COLORS.gold).setOrigin(0, 0.5));
    icon(this, width - 78, 40, 'pokeball', 2);
    this.topRight.push(text(this, width - 62, 40, '', 12, '#ffffff').setOrigin(0, 0.5));

    // ---- nút tròn trên cùng: Đội hình / Pokédex / Trung tâm / Menu ----
    const btns: [string, string, string, () => void][] = [
      ['people', t('map.btn.team'), 'T', () => this.openTeam()],
      ['book', t('map.btn.dex'), 'P', () => this.openDex()],
      ['heart', t('map.btn.center'), 'H', () => this.openCenter()],
      ['gear', t('map.btn.menu'), 'Esc', () => this.toMenu()],
    ];
    const BW = 84;
    btns.forEach(([ic, label, key, fn], i) => {
      const x = 462 + i * (BW + 6);
      const gfx = this.add.graphics();
      gfx.fillStyle(0x000000, 0.35).fillRoundedRect(x + 3, 12, BW, 56, 12);
      gfx.fillStyle(0x1a2238, 0.92).fillRoundedRect(x, 8, BW, 56, 12);
      gfx.lineStyle(3, 0x8a96b8, 1).strokeRoundedRect(x + 2, 10, BW - 4, 52, 10);
      icon(this, x + BW / 2, 28, ic, 2);
      text(this, x + BW / 2, 48, `${label} (${key})`, 10, '#ffffff').setOrigin(0.5, 0);
      this.add.rectangle(x + BW / 2, 36, BW, 56, 0xffffff, 0.001).setInteractive({ useHandCursor: true }).on('pointerdown', () => !this.blocked() && fn());
    });

    this.info = this.add.container(0, 0);
    this.refreshInfo();
    this.dialog = new DialogBox(this);

    // ---- điều khiển ----
    const kb = this.input.keyboard!;
    const nav = (step: number) => () => this.step(step);
    kb.on('keydown-LEFT', nav(-1));
    kb.on('keydown-A', nav(-1));
    kb.on('keydown-RIGHT', nav(1));
    kb.on('keydown-D', nav(1));
    kb.on('keydown-ENTER', () => this.confirm());
    kb.on('keydown-SPACE', () => this.confirm());
    kb.on('keydown-T', () => !this.blocked() && this.openTeam());
    kb.on('keydown-H', () => !this.blocked() && this.openCenter());
    kb.on('keydown-P', () => !this.blocked() && this.openDex());
    kb.on('keydown-ESC', () => {
      if (this.dialog.busy) return;
      this.toMenu();
    });
    this.input.on(Phaser.Input.Events.POINTER_DOWN, () => this.dialog.advance());
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      kb.removeAllListeners();
      this.input.removeAllListeners(Phaser.Input.Events.POINTER_DOWN);
    });

    this.afterArrive();
  }

  update() {
    if (!this.game_) return;
    this.topRight[0]?.setText(fmtNum(this.game_.money));
    this.topRight[1]?.setText(`${this.game_.items.pokeball}${this.game_.items.greatball ? ` + ${this.game_.items.greatball}` : ''}`);
  }

  // ======================================================================= vẽ bản đồ

  private unlocked(i: number) {
    return isUnlocked(i, (id) => stageCleared(this.game_, id));
  }

  private furthestUnlocked() {
    let last = 0;
    STAGES.forEach((_, i) => {
      if (this.unlocked(i)) last = i;
    });
    return last;
  }

  private drawPathAndNodes() {
    const g = this.add.graphics();
    for (let i = 0; i < STAGES.length - 1; i++) {
      const a = STAGES[i];
      const b = STAGES[i + 1];
      const done = stageCleared(this.game_, a.id) && stageCleared(this.game_, b.id);
      const open = this.unlocked(i + 1);
      const len = Math.hypot(b.x - a.x, b.y - a.y) * S;
      const steps = Math.floor(len / 8);
      for (let k = 0; k < steps; k++) {
        if (!done && k % 2 === 1) continue;
        const t0 = k / steps;
        const t1 = Math.min(1, (k + (done ? 1 : 0.6)) / steps);
        const x0 = (a.x + (b.x - a.x) * t0) * S;
        const y0 = (a.y + (b.y - a.y) * t0) * S;
        const x1 = (a.x + (b.x - a.x) * t1) * S;
        const y1 = (a.y + (b.y - a.y) * t1) * S;
        g.lineStyle(7, 0x1a2a18, 0.55).lineBetween(x0, y0, x1, y1);
        g.lineStyle(3, done ? 0xffd34a : open ? 0xf0f0e0 : 0x9aa598, done ? 1 : open ? 0.9 : 0.6).lineBetween(x0, y0, x1, y1);
      }
    }
    const iconName: Record<NodeKind, string> = { start: 'house', stage: '', elite: 'skull', gym: 'gym', event: 'star', rival: 'people', league: 'crown', champion: 'trophy' };
    let num = 0;
    STAGES.forEach((n, i) => {
      const x = n.x * S;
      const y = n.y * S;
      const cleared = n.kind !== 'start' && stageCleared(this.game_, n.id);
      const open = this.unlocked(i);
      const big = n.kind === 'gym' || n.kind === 'league' || n.kind === 'champion' || n.kind === 'start';
      const r = big ? 17 : n.kind === 'elite' || n.kind === 'event' ? 13 : 11;
      const fill = !open ? 0x2a3428 : n.kind === 'gym' ? 0x8a3a10 : n.kind === 'rival' ? 0x2a4a9a : n.kind === 'league' || n.kind === 'champion' ? 0x3a3a7a : n.kind === 'elite' ? 0x6a1a1a : n.kind === 'event' ? 0x7a5a10 : 0x1f4a26;
      g.fillStyle(0x0b120d, 0.6).fillCircle(x + 2, y + 3, r + 3);
      g.fillStyle(fill, open ? 1 : 0.85).fillCircle(x, y, r);
      g.lineStyle(3, cleared ? 0xffd34a : open ? 0xffffff : 0x8a9a88, 1).strokeCircle(x, y, r);
      if (n.kind === 'stage') num++;
      const badge = n.gymId ? BADGES[GYMS[n.gymId]?.badgeId ?? ''] : undefined;
      if (cleared && badge) this.add.image(x, y, badge.texture).setScale(2);
      else if (cleared) icon(this, x, y + 1, 'check', 2);
      else if (!open && n.playable) icon(this, x, y, 'lock', 1.5);
      else if (n.kind === 'stage') text(this, x, y, String(num), 12, open ? '#ffffff' : '#c0c8bc').setOrigin(0.5);
      else icon(this, x, y, iconName[n.kind], 2).setAlpha(open ? 1 : 0.7);
      // sao đã đạt
      const stars = this.game_.stages[n.id]?.stars ?? 0;
      if (stars) for (let k = 0; k < 3; k++) icon(this, x - 12 + k * 12, y - r - 8, k < stars ? 'star' : 'starEmpty', 0.75);
      if (n.label) text(this, x, y + r + 12, stageLabel(n) ?? '', 12, open ? '#ffffff' : '#d8e0d4').setOrigin(0.5);
      // click để chọn
      const hit = this.add.circle(x, y, r + 6, 0xffffff, 0.001).setInteractive({ useHandCursor: open });
      hit.on('pointerdown', () => {
        if (this.blocked() || !open) return;
        if (i === this.cursor) this.confirm();
        else this.moveTo(i);
      });
    });
  }

  // ======================================================================= chọn ải

  private blocked() {
    return this.dialog.busy || this.moving;
  }

  private step(dir: number) {
    if (this.blocked()) return;
    let i = this.cursor + dir;
    while (i >= 0 && i < STAGES.length && !this.unlocked(i)) i += dir;
    if (i < 0 || i >= STAGES.length) {
      playSfx('warn');
      return;
    }
    this.moveTo(i);
  }

  private moveTo(i: number) {
    this.cursor = i;
    this.game_.cursor = STAGES[i].id;
    const n = STAGES[i];
    this.moving = true;
    playSfx('talk');
    this.tweens.add({ targets: this.ring, x: n.x * S, y: n.y * S, duration: 220 });
    this.hero.setFrame(n.x * S > this.hero.x ? 6 : 3);
    this.tweens.add({
      targets: this.hero, x: n.x * S, duration: 260, ease: 'Sine.inOut',
      onComplete: () => {
        this.hero.setFrame(0);
        this.moving = false;
      },
    });
    this.tweens.add({ targets: this.hero, y: n.y * S - 40, duration: 260 });
    this.refreshInfo();
  }

  private confirm() {
    if (this.dialog.advance()) return;
    if (this.moving) return;
    const st = STAGES[this.cursor];
    if (st.kind === 'start') {
      this.openCenter();
      return;
    }
    if (!st.playable) return;
    playSfx('select');
    saveGame();
    this.scene.start('Team', { stageId: st.id });
  }

  /** Bảng thông tin ải đang chọn */
  private refreshInfo() {
    this.info.removeAll(true);
    const st = STAGES[this.cursor];
    const px = 340;
    const py = 478;
    const items: Phaser.GameObjects.GameObject[] = [pixelPanel(this, px, py, 640, 128)];
    const rec = this.game_.stages[st.id];
    if (st.kind === 'start') {
      items.push(text(this, px + 26, py + 18, t('map.pallet.title'), 24, COLORS.gold));
      items.push(text(this, px + 26, py + 58, t('map.pallet.desc'), 12, '#ffffff'));
      items.push(text(this, px + 26, py + 80, t('map.pallet.hint'), 12, '#c8d0f0'));
    } else {
      items.push(text(this, px + 26, py + 16, stageName(st), 24, COLORS.gold));
      // mỗi dòng: icon · nhãn ngắn · hàng chân dung Pokémon (không liệt kê tên dài để khỏi tràn khung)
      const row = (y: number, iconName: string, label: string, color: string, species: string[]) => {
        items.push(icon(this, px + 36, y, iconName, 2));
        const t = text(this, px + 56, y, label, 12, color).setOrigin(0, 0.5);
        items.push(t);
        const x0 = px + 56 + t.width + 18;
        const fit = Math.max(1, Math.floor((px + 372 - x0) / 30));
        species.slice(0, fit).forEach((id, i) => items.push(pokemonIcon(this, id, x0 + i * 30, y, 22, false)));
        if (species.length > fit) items.push(text(this, x0 + fit * 30 - 8, y, `+${species.length - fit}`, 10, color).setOrigin(0, 0.5));
      };
      const lv = st.levels ? `Lv ${st.levels[0]}–${st.levels[1]}` : '';
      if (st.gymId) {
        const gym = GYMS[st.gymId];
        row(py + 66, st.kind === 'league' ? 'crown' : 'gym', `${gym.leader} · ${lv}`, '#ffffff', gym.team.map((t) => t.species));
        items.push(icon(this, px + 36, py + 100, 'heart', 2));
        items.push(text(this, px + 56, py + 100, t(st.kind === 'league' ? 'map.leagueLoss' : 'map.gymLoss'), 12, '#ffd0a0').setOrigin(0, 0.5));
      } else if (st.rival) {
        // đội Shigeru tự lên cấp theo đội người chơi
        const team = rivalTeam(this.game_, st);
        const lvMin = Math.min(...team.map((t) => t.level));
        const lvMax = Math.max(...team.map((t) => t.level));
        row(py + 66, 'people', `Shigeru · Lv ${lvMin}–${lvMax}`, '#ffffff', team.map((t) => t.species));
        items.push(icon(this, px + 36, py + 100, 'heart', 2));
        items.push(text(this, px + 56, py + 100, t('map.rivalLoss'), 12, '#ffd0a0').setOrigin(0, 0.5));
      } else {
        row(py + 66, 'sword', t((st.waves?.length ?? 0) === 1 ? 'map.wave1' : 'map.waves', { lv, n: st.waves?.length ?? 0 }), '#ffffff', [...new Set((st.waves ?? []).flat().map((s) => s.species))]);
        if (st.catchable?.length) row(py + 100, 'pokeball', t('map.catchable'), '#c8d0f0', st.catchable);
      }
      for (let i = 0; i < 3; i++) items.push(icon(this, px + 390 + i * 24, py + 66, i < (rec?.stars ?? 0) ? 'star' : 'starEmpty', 1.5));
      items.push(icon(this, px + 390, py + 100, 'coin', 2), text(this, px + 410, py + 100, `${fmtNum(Math.round((st.money ?? 0) * STAGE_REWARD.moneyMult * (rec?.clears ? STAGE_REWARD.replayMult : 1)))}${rec?.clears ? t('map.replayPay') : t('map.firstBonus')}`, 12, COLORS.gold).setOrigin(0, 0.5));
      const btn = this.add.graphics();
      btn.fillStyle(0x000000, 0.35).fillRect(px + 486, py + 30, 140, 56);
      btn.fillStyle(0xd85a18, 1).fillRect(px + 482, py + 26, 140, 56);
      btn.fillStyle(0xff8a3a, 1).fillRect(px + 482, py + 26, 140, 6);
      btn.lineStyle(3, 0xffe9a0, 1).strokeRect(px + 482, py + 26, 140, 56);
      const hit = this.add.rectangle(px + 552, py + 54, 140, 56, 0xffffff, 0.001).setInteractive({ useHandCursor: true });
      hit.on('pointerdown', () => !this.blocked() && this.confirm());
      items.push(btn, hit, text(this, px + 552, py + 54, t('map.enter'), 24, '#ffffff').setOrigin(0.5));
      if (rec?.clears) items.push(text(this, px + 552, py + 96, t('map.clears', { n: rec.clears }), 10, '#c8d0f0').setOrigin(0.5, 0));
    }
    this.info.add(items);
  }

  // ======================================================================= Trung tâm Pokémon

  private openCenter() {
    if (this.dialog.busy) return;
    saveGame();
    this.scene.start('PokeCenter');
  }



  // ======================================================================= điều hướng

  private openTeam() {
    if (this.blocked()) return;
    playSfx('select');
    this.scene.start('Team', {});
  }

  private openDex() {
    saveGame();
    playSfx('select');
    this.scene.start('Pokedex', { from: 'StageMap' });
  }

  private toMenu() {
    saveGame();
    this.scene.start('Menu');
  }

  private afterArrive() {
    const g = this.game_;
    if (this.fromData.intro) {
      this.dialog.say([
        t('map.intro1', { name: g.trainer }),
        t('map.intro2'),
        t('map.intro3'),
        t('map.intro4'),
      ]);
      return;
    }
    const from = this.fromData.from ? STAGES.find((s) => s.id === this.fromData.from) : null;
    if (from?.kind === 'champion' && g.flags.champion && !g.flags['champion-ending']) {
      g.flags['champion-ending'] = true;
      saveGame();
      this.dialog.say([
        t('map.end1', { name: g.trainer }),
        t('map.end2'),
        t('map.end3'),
        t('map.end4'),
      ]);
      return;
    }
    if (from?.rival) {
      const flag = `rival-${from.id}-talked`;
      if (g.stages[from.id]?.clears && !g.flags[flag]) {
        g.flags[flag] = true;
        saveGame();
        this.dialog.say(buildRivalGym(g, from).winLines);
      }
      return;
    }
    if (from?.gymId) {
      const gym = GYMS[from.gymId];
      const flag = `gym-${gym.id}-thanked`;
      if ((gym.badgeId ? g.badges.includes(gym.badgeId) : !!g.stages[from.id]?.clears) && !g.flags[flag]) {
        g.flags[flag] = true;
        saveGame();
        this.dialog.say(gymText(gym).winLines);
      }
    }
  }

  /** Dùng cho kiểm thử */
  selectStage(st: StageDef) {
    const i = STAGES.indexOf(st);
    if (i >= 0) this.moveTo(i);
  }
}
