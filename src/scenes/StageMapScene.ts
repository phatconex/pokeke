// Bản đồ ải của vùng: chọn ải, xem thông tin, vào Trung tâm Pokémon, đội hình.
import Phaser from 'phaser';
import { generateKantoMap, KMAP_H, KMAP_W } from '../art/kantoMapArt';
import { KANTO_POS, KANTO_ROADS } from '../data/kantoLayout';
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
/** vị trí ải trên bản đồ Kanto v2 (pixel thế giới) */
const posOf = (n: StageDef) => {
  const p = KANTO_POS[n.id] ?? { x: n.x * 1.5, y: n.y * 1.5 };
  return { x: p.x * S, y: p.y * S };
};
const TOWN_KINDS: NodeKind[] = ['start', 'gym', 'league', 'champion'];

export class StageMapScene extends Phaser.Scene {
  private game_!: GameState;
  private cursor = 0;
  private hero!: Phaser.GameObjects.Sprite;
  /** khung chứa nhân vật: khung di chuyển giữa các ải, nhân vật nhún nhảy bên trong (tách 2 tween y khỏi đè nhau) */
  private heroBox!: Phaser.GameObjects.Container;
  private ring!: Phaser.GameObjects.Arc;
  private info!: Phaser.GameObjects.Container;
  private topRight: Phaser.GameObjects.Text[] = [];
  private dialog!: DialogBox;
  private moving = false;
  /** lớp thế giới (bản đồ + ải + nhân vật) – dịch chuyển để "cuộn camera", giao diện đứng yên */
  private world!: Phaser.GameObjects.Container;
  private mini: Phaser.GameObjects.GameObject[] = [];
  private miniView: Phaser.GameObjects.Rectangle | null = null;
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
    // phiên bản scene được dùng lại: bỏ tham chiếu tới đối tượng cũ đã bị hủy (bản đồ nhỏ) trước khi dựng lại
    this.mini = [];
    this.miniView = null;
    const { width } = this.scale;
    this.input.setDefaultCursor('default');

    if (!this.textures.exists('map-kanto2')) {
      const byId = Object.fromEntries(STAGES.map((st) => [st.id, st]));
      generateKantoMap(this, 'map-kanto2', { roads: KANTO_ROADS.map((r) => r.filter((id) => byId[id]).map((id) => { const p = posOf(byId[id]); return { x: p.x / S, y: p.y / S }; })) });
    }
    this.world = this.add.container(0, 0);
    this.world.add(this.add.image(0, 0, 'map-kanto2').setOrigin(0).setScale(S));
    this.cameras.main.fadeIn(300, 0, 0, 0);

    this.drawPathAndNodes();

    // vị trí con trỏ: ải đang chọn, hoặc ải mới mở xa nhất
    const want = STAGES.findIndex((st) => st.id === this.game_.cursor);
    this.cursor = want >= 0 && this.unlocked(want) ? want : this.furthestUnlocked();
    const n = STAGES[this.cursor];
    const np = posOf(n);
    this.ring = this.add.circle(np.x, np.y, 22).setStrokeStyle(3, 0xffd34a, 0.95);
    this.tweens.add({ targets: this.ring, scale: 1.3, alpha: 0, duration: 900, repeat: -1 });
    this.hero = this.add.sprite(0, -40, `trainer-${this.game_.avatar ?? 'satoshi'}`, 0).setScale(2);
    this.heroBox = this.add.container(np.x, np.y, [this.hero]);
    this.tweens.add({ targets: this.hero, y: -44, duration: 450, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
    this.world.add([this.ring, this.heroBox]);
    this.scrollTo(np.x, np.y, false);

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
    this.buildMini();
    this.dialog = new DialogBox(this);

    // ---- điều khiển ----
    const kb = this.input.keyboard!;
    const nav = (step: number) => () => this.step(step);
    kb.on('keydown-LEFT', nav(-1));
    kb.on('keydown-A', nav(-1));
    kb.on('keydown-RIGHT', nav(1));
    kb.on('keydown-D', nav(1));
    kb.on('keydown-UP', () => this.jumpTown(-1));
    kb.on('keydown-W', () => this.jumpTown(-1));
    kb.on('keydown-DOWN', () => this.jumpTown(1));
    kb.on('keydown-S', () => this.jumpTown(1));
    kb.on('keydown-M', () => this.toggleMini());
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
    return !!this.game_?.flags.devUnlockAll || isUnlocked(i, (id) => stageCleared(this.game_, id));
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
    this.world.add(g);
    const byId = Object.fromEntries(STAGES.map((st, i) => [st.id, { st, i }]));
    // ---- LỘ TRÌNH: nối các ải theo đúng thứ tự chơi, đi dọc mạng đường (BFS) ----
    // đã đi: vàng đậm · đoạn kế tiếp (ải mới mở): trắng đậm + mũi tên chạy · chưa tới: chấm xám mờ
    const adj = new Map<string, Set<string>>();
    for (const road of KANTO_ROADS) {
      for (let k = 0; k < road.length - 1; k++) {
        if (!byId[road[k]] || !byId[road[k + 1]]) continue;
        if (!adj.has(road[k])) adj.set(road[k], new Set());
        if (!adj.has(road[k + 1])) adj.set(road[k + 1], new Set());
        adj.get(road[k])!.add(road[k + 1]);
        adj.get(road[k + 1])!.add(road[k]);
      }
    }
    const route = (from: string, to: string): string[] => {
      const prev = new Map<string, string>([[from, '']]);
      const q = [from];
      while (q.length) {
        const c = q.shift()!;
        if (c === to) break;
        for (const nb of adj.get(c) ?? []) if (!prev.has(nb)) { prev.set(nb, c); q.push(nb); }
      }
      if (!prev.has(to)) return [from, to];
      const out = [to];
      while (out[0] !== from) out.unshift(prev.get(out[0])!);
      return out;
    };
    const segState = new Map<string, number>(); // 0 chưa tới · 1 kế tiếp · 2 đã đi
    const nextSegs: [number, number, number, number][] = [];
    for (let i = 0; i < STAGES.length - 1; i++) {
      const A = STAGES[i];
      const B = STAGES[i + 1];
      const aDone = A.kind === 'start' || stageCleared(this.game_, A.id);
      const bDone = stageCleared(this.game_, B.id);
      const st = aDone && bDone ? 2 : this.unlocked(i + 1) ? 1 : 0;
      const path = route(A.id, B.id);
      for (let k = 0; k < path.length - 1; k++) {
        const key = [path[k], path[k + 1]].sort().join('|');
        segState.set(key, Math.max(segState.get(key) ?? -1, st));
        if (st === 1) {
          const a = posOf(byId[path[k]].st);
          const b = posOf(byId[path[k + 1]].st);
          nextSegs.push([a.x, a.y, b.x, b.y]);
        }
      }
    }
    for (const [key, st] of segState) {
      const [ia, ib] = key.split('|');
      const a = posOf(byId[ia].st);
      const b = posOf(byId[ib].st);
      const len = Math.hypot(b.x - a.x, b.y - a.y);
      if (st === 2) {
        g.lineStyle(9, 0x3a2a08, 0.55).lineBetween(a.x, a.y + 2, b.x, b.y + 2);
        g.lineStyle(5, 0xffd34a, 1).lineBetween(a.x, a.y, b.x, b.y);
      } else if (st === 1) {
        g.lineStyle(9, 0x10182a, 0.5).lineBetween(a.x, a.y + 2, b.x, b.y + 2);
        g.lineStyle(5, 0xffffff, 1).lineBetween(a.x, a.y, b.x, b.y);
      } else {
        for (let d = 14; d < len - 14; d += 16) {
          const x = a.x + ((b.x - a.x) * d) / len;
          const y = a.y + ((b.y - a.y) * d) / len;
          g.fillStyle(0x1a2a18, 0.35).fillRect(x - 2, y - 1, 5, 5);
          g.fillStyle(0xd8e0d4, 0.55).fillRect(x - 2, y - 2, 3, 3);
        }
      }
    }
    // mũi tên chạy dọc đoạn kế tiếp (chỉ hướng đi)
    if (nextSegs.length) {
      const arrows = this.add.graphics();
      this.world.add(arrows);
      this.tweens.addCounter({
        from: 0, to: 1, duration: 1200, repeat: -1,
        onUpdate: (tw) => {
          arrows.clear();
          const ph = tw.getValue() ?? 0;
          for (const [ax, ay, bx, by] of nextSegs) {
            const len = Math.hypot(bx - ax, by - ay);
            const ux = (bx - ax) / len;
            const uy = (by - ay) / len;
            for (let d = ((ph * 28) % 28) + 16; d < len - 16; d += 28) {
              const x = ax + ux * d;
              const y = ay + uy * d;
              arrows.fillStyle(0xe06a20, 1).fillTriangle(x + ux * 6, y + uy * 6, x - ux * 4 - uy * 5, y - uy * 4 + ux * 5, x - ux * 4 + uy * 5, y - uy * 4 - ux * 5);
            }
          }
        },
      });
    }
    const iconName: Record<NodeKind, string> = { start: 'house', stage: '', elite: 'skull', gym: 'gym', event: 'star', rival: 'people', league: 'crown', champion: 'trophy' };
    STAGES.forEach((n, i) => {
      const { x, y } = posOf(n);
      const cleared = n.kind !== 'start' && stageCleared(this.game_, n.id);
      const open = this.unlocked(i);
      const town = TOWN_KINDS.includes(n.kind);
      const r = town ? 18 : n.kind === 'stage' ? 9 : 13;
      const fill = !open ? 0x2a3428 : n.kind === 'gym' ? 0x8a3a10 : n.kind === 'start' ? 0xa03030 : n.kind === 'rival' ? 0x2a4a9a : n.kind === 'league' || n.kind === 'champion' ? 0x3a3a7a : n.kind === 'elite' ? 0x6a1a1a : n.kind === 'event' ? 0x7a5a10 : 0x1f4a26;
      g.fillStyle(0x0b120d, 0.55).fillEllipse(x + 2, y + 4, (r + 3) * 2, (r + 2) * 1.8);
      g.fillStyle(fill, open ? 1 : 0.85).fillCircle(x, y, r);
      g.lineStyle(town ? 3 : 2, cleared ? 0x9fe08a : open ? 0xf4f1e6 : 0x8a9a88, 1).strokeCircle(x, y, r);
      const objs: Phaser.GameObjects.GameObject[] = [];
      const badge = n.gymId ? BADGES[GYMS[n.gymId]?.badgeId ?? ''] : undefined;
      if (cleared && badge) objs.push(this.add.image(x, y, badge.texture).setScale(2));
      else if (!open && n.playable && n.kind !== 'stage') objs.push(icon(this, x, y, 'lock', 1.5));
      else if (n.kind !== 'stage') objs.push(icon(this, x, y, iconName[n.kind], town ? 2 : 1.5).setAlpha(open ? 1 : 0.7));
      if (cleared && !badge) {
        g.fillStyle(0x9fe08a, 1).fillCircle(x + r * 0.72, y - r * 0.72, 5);
        g.lineStyle(1.5, 0x10301a, 1).strokeCircle(x + r * 0.72, y - r * 0.72, 5);
      }
      // sao đã đạt (chỉ thị trấn / điểm lớn – ải đường đi xem ở dải dưới)
      const stars = this.game_.stages[n.id]?.stars ?? 0;
      if (stars && n.kind !== 'stage') for (let k = 0; k < 3; k++) objs.push(icon(this, x - 12 + k * 12, y - r - 8, k < stars ? 'star' : 'starEmpty', 0.75));
      if (n.label && n.kind !== 'stage') {
        const lbl = text(this, x, y + r + 13, stageLabel(n) ?? '', town ? 12 : 10, open ? '#ffffff' : '#d8e0d4').setOrigin(0.5);
        const bg = this.add.rectangle(x, y + r + 13, lbl.width + 12, lbl.height + 4, 0x0b0f1e, 0.78).setStrokeStyle(town ? 2 : 1, town ? 0xffd34a : 0xf4f1e6, 0.9);
        objs.push(bg, lbl);
      }
      // click để chọn
      const hit = this.add.circle(x, y, r + 8, 0xffffff, 0.001).setInteractive({ useHandCursor: open });
      hit.on('pointerdown', () => {
        if (this.blocked() || !open) return;
        if (i === this.cursor) this.confirm();
        else this.moveTo(i);
      });
      objs.push(hit);
      this.world.add(objs);
    });
  }

  /** dịch lớp thế giới để điểm (x, y) nằm giữa vùng nhìn (trên dải thông tin) */
  private scrollTo(x: number, y: number, animate = true) {
    const { width, height } = this.scale;
    const W = KMAP_W * S;
    const H = KMAP_H * S;
    const tx = Phaser.Math.Clamp(width / 2 - x, width - W, 0);
    const ty = Phaser.Math.Clamp((height - 120) / 2 + 30 - y, height - 120 - H, 0);
    if (animate) this.tweens.add({ targets: this.world, x: tx, y: ty, duration: 320, ease: 'Sine.inOut', onUpdate: () => this.syncMini() });
    else {
      this.world.setPosition(tx, ty);
      this.syncMini();
    }
  }

  /** bản đồ nhỏ góc phải (M bật/tắt) */
  private buildMini() {
    const { width } = this.scale;
    const w = 192;
    const h = Math.round((w * KMAP_H) / KMAP_W);
    const x = width - w - 14;
    const y = 82;
    const box = pixelPanel(this, x - 6, y - 6, w + 12, h + 12);
    const img = this.add.image(x, y, 'map-kanto2').setOrigin(0).setDisplaySize(w, h);
    this.miniView = this.add.rectangle(x, y, 10, 10).setOrigin(0).setStrokeStyle(2, 0xffd34a, 1);
    const dot = this.add.circle(0, 0, 3, 0xff4040).setStrokeStyle(1, 0xffffff);
    this.mini = [...(Array.isArray(box) ? box : [box]), img, this.miniView, dot];
    this.syncMini();
  }

  private syncMini() {
    if (!this.miniView || !this.miniView.active || !this.world || !this.mini.length) return;
    const { width, height } = this.scale;
    const w = 192;
    const k = w / (KMAP_W * S);
    const x0 = width - w - 14;
    const y0 = 82;
    this.miniView.setPosition(x0 + -this.world.x * k, y0 + -this.world.y * k).setSize(width * k, (height - 120) * k);
    const dot = this.mini[this.mini.length - 1] as Phaser.GameObjects.Arc;
    if (this.heroBox) dot.setPosition(x0 + this.heroBox.x * k, y0 + this.heroBox.y * k);
  }

  private toggleMini() {
    const v = !(this.mini[0] as unknown as Phaser.GameObjects.Components.Visible).visible;
    for (const o of this.mini) (o as unknown as Phaser.GameObjects.Components.Visible).setVisible(v);
  }

  /** ↑ ↓: nhảy tới thị trấn / hội quán trước-sau đã mở */
  private jumpTown(dir: number) {
    if (this.blocked()) return;
    let i = this.cursor + dir;
    while (i >= 0 && i < STAGES.length && !(TOWN_KINDS.includes(STAGES[i].kind) && this.unlocked(i))) i += dir;
    if (i < 0 || i >= STAGES.length) {
      playSfx('warn');
      return;
    }
    this.moveTo(i);
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
    const np = posOf(n);
    this.moving = true;
    playSfx('talk');
    this.tweens.add({ targets: this.ring, x: np.x, y: np.y, duration: 220 });
    this.hero.setFrame(np.x > this.heroBox.x ? 6 : 3);
    this.tweens.killTweensOf(this.heroBox);
    this.scrollTo(np.x, np.y);
    const dist = Math.hypot(np.x - this.heroBox.x, np.y - this.heroBox.y);
    this.tweens.add({
      targets: this.heroBox, x: np.x, y: np.y, duration: Phaser.Math.Clamp(dist * 1.6, 260, 700), ease: 'Sine.inOut',
      onComplete: () => {
        this.hero.setFrame(0);
        this.moving = false;
      },
    });
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
    const { width } = this.scale;
    const px = 14;
    const py = 594;
    const PW = width - 28;
    const items: Phaser.GameObjects.GameObject[] = [pixelPanel(this, px, py, PW, 120)];
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
        const fit = Math.max(1, Math.floor((px + 760 - x0) / 30));
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
      const sx = px + 800;
      for (let i = 0; i < 3; i++) items.push(icon(this, sx + i * 24, py + 66, i < (rec?.stars ?? 0) ? 'star' : 'starEmpty', 1.5));
      items.push(icon(this, sx, py + 100, 'coin', 2), text(this, sx + 20, py + 100, `${fmtNum(Math.round((st.money ?? 0) * STAGE_REWARD.moneyMult * (rec?.clears ? STAGE_REWARD.replayMult : 1)))}${rec?.clears ? t('map.replayPay') : t('map.firstBonus')}`, 12, COLORS.gold).setOrigin(0, 0.5));
      const btn = this.add.graphics();
      const bx = px + PW - 200;
      btn.fillStyle(0x000000, 0.35).fillRect(bx + 4, py + 30, 180, 56);
      btn.fillStyle(0xd85a18, 1).fillRect(bx, py + 26, 180, 56);
      btn.fillStyle(0xff8a3a, 1).fillRect(bx, py + 26, 180, 6);
      btn.lineStyle(3, 0xffe9a0, 1).strokeRect(bx, py + 26, 180, 56);
      const hit = this.add.rectangle(bx + 90, py + 54, 180, 56, 0xffffff, 0.001).setInteractive({ useHandCursor: true });
      hit.on('pointerdown', () => !this.blocked() && this.confirm());
      items.push(btn, hit, text(this, bx + 90, py + 54, t('map.enter'), 24, '#ffffff').setOrigin(0.5));
      if (rec?.clears) items.push(text(this, bx + 90, py + 96, t('map.clears', { n: rec.clears }), 10, '#c8d0f0').setOrigin(0.5, 0));
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
