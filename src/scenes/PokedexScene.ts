// Pokédex: lưới các loài theo số dex (chia trang), bảng chi tiết loài đang chọn và bảng phần thưởng theo số loài đã bắt.
import Phaser from 'phaser';
import { MOVES } from '../data/moves';
import { evolutionsOf, hasUltimate, POKEMON, PokemonSpecies, SKILL_SLOTS } from '../data/pokemon';
import { STAGES } from '../data/stages';
import { TYPE_COLOR } from '../data/types';
import { speciesStats } from '../data/stats';
import { ultimateFor } from '../data/ultimates';
import { claimDexReward, DEX_REWARDS, dexOf, dexTotal, rewardLabel } from '../game/dex';
import { GameState, getGame, saveGame } from '../game/state';
import { playMusic } from '../systems/music';
import { playSfx } from '../systems/sfx';
import { pokemonIcon } from '../ui/pokemonIcon';
import { button, COLORS, icon, outlinedText, pixelPanel, text } from '../ui/style';
import { t } from '../i18n';
import { blurb, moveDesc, moveName, stageName, typeLabel, ultimateText } from '../i18n/content';
import { Add, dexNo as pad3, evoChain, fit, rarityOf, speciesRows, spriteFrame, statRows, textH, typePills } from '../ui/statCard';

const COLS = 5;
const ROWS = 4;
const PER_PAGE = COLS * ROWS;
const CELL_W = 84;
const CELL_H = 112;
const GAP = 6;

/** khung lưới / chi tiết / phần thưởng (cùng chiều cao) */
const PANEL_Y = 78;
const PANEL_H = 572;
const GRID = { x: 20, w: 500 };
const DETAIL = { x: 532, w: 480 };
const REWARD = { x: 1024, w: 236 };

interface Encounter {
  name: string;
  catchable: boolean;
}

const dexNo = (n: number) => `#${pad3(n)}`;

export class PokedexScene extends Phaser.Scene {
  private from = 'StageMap';
  private g_!: GameState;
  private list: PokemonSpecies[] = [];
  private sel = 0;
  private layer: Phaser.GameObjects.Container | null = null;
  private msg!: Phaser.GameObjects.Text;
  private encounters = new Map<string, Encounter[]>();
  private preEvos = new Map<string, { from: string; level?: number; item?: string }[]>();

  constructor() {
    super('Pokedex');
  }

  init(data: { from?: string } | undefined) {
    this.from = data?.from ?? 'StageMap';
  }

  create() {
    playMusic('dex');
    const g = getGame();
    if (!g) {
      this.scene.start('Menu');
      return;
    }
    this.g_ = g;
    this.layer = null;
    this.tip = null;
    this.buildData();
    // mở đúng trang có loài mới gặp gần nhất
    const d = dexOf(g);
    const last = d.seen[d.seen.length - 1];
    this.sel = Math.max(0, last ? this.list.findIndex((sp) => sp.id === last) : 0);

    this.cameras.main.setBackgroundColor('#13261a');
    this.add.tileSprite(0, 0, this.scale.width / 2, this.scale.height / 2, 'tiles', 0).setOrigin(0).setScale(2).setAlpha(0.25);
    this.msg = text(this, this.scale.width - 20, this.scale.height - 34, '', 12, '#ff9a9a').setOrigin(1, 0.5).setDepth(10);
    this.render();

    const kb = this.input.keyboard!;
    const mv = (dx: number, dy: number) => () => this.moveSel(dx, dy);
    kb.on('keydown-LEFT', mv(-1, 0));
    kb.on('keydown-A', mv(-1, 0));
    kb.on('keydown-RIGHT', mv(1, 0));
    kb.on('keydown-D', mv(1, 0));
    kb.on('keydown-UP', mv(0, -1));
    kb.on('keydown-W', mv(0, -1));
    kb.on('keydown-DOWN', mv(0, 1));
    kb.on('keydown-S', mv(0, 1));
    kb.on('keydown-Q', () => this.changePage(-1));
    kb.on('keydown-PAGE_UP', () => this.changePage(-1));
    kb.on('keydown-E', () => this.changePage(1));
    kb.on('keydown-PAGE_DOWN', () => this.changePage(1));
    kb.on('keydown-ENTER', () => this.claimFirst());
    kb.on('keydown-ESC', () => this.back());
    this.input.on('wheel', (_p: unknown, _o: unknown, _dx: number, dy: number) => this.changePage(dy > 0 ? 1 : -1));
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      kb.removeAllListeners();
      this.input.off('wheel');
      this.layer = null;
    });
  }

  /** dựng sẵn danh sách loài, nơi gặp, dạng trước tiến hóa, chỉ số lớn nhất (để vẽ thanh) */
  private buildData() {
    this.list = Object.values(POKEMON)
      .filter((sp) => typeof sp.dex === 'number' && sp.dex > 0)
      .sort((a, b) => a.dex - b.dex || a.id.localeCompare(b.id));

    this.encounters.clear();
    for (const st of STAGES) {
      const ids = new Set<string>();
      for (const wave of st.waves ?? []) for (const sp of wave) ids.add(sp.species);
      for (const id of st.catchable ?? []) ids.add(id);
      for (const id of ids) {
        const arr = this.encounters.get(id) ?? [];
        const name = stageName(st);
        if (!arr.some((e) => e.name === name)) arr.push({ name, catchable: !!st.catchable?.includes(id) });
        this.encounters.set(id, arr);
      }
    }

    this.preEvos.clear();
    for (const sp of Object.values(POKEMON)) {
      for (const e of evolutionsOf(sp)) {
        const arr = this.preEvos.get(e.into) ?? [];
        arr.push({ from: sp.id, level: e.level, item: e.item });
        this.preEvos.set(e.into, arr);
      }
    }

  }

  private get pages() {
    return Math.max(1, Math.ceil(this.list.length / PER_PAGE));
  }

  private moveSel(dx: number, dy: number) {
    const n = this.list.length;
    if (!n) return;
    const next = Phaser.Math.Clamp(this.sel + dx + dy * COLS, 0, n - 1);
    if (next === this.sel) return;
    this.sel = next;
    playSfx('talk');
    this.render();
  }

  private changePage(dir: number) {
    const n = this.list.length;
    if (!n) return;
    const page = Math.floor(this.sel / PER_PAGE);
    const target = page + dir;
    if (target < 0 || target >= this.pages) return;
    this.sel = Phaser.Math.Clamp(this.sel + dir * PER_PAGE, 0, n - 1);
    playSfx('talk');
    this.render();
  }

  private select(i: number) {
    if (i === this.sel) return;
    this.sel = i;
    playSfx('talk');
    this.render();
  }

  private warn(msg: string, color = '#ff9a9a', sfx: 'warn' | null = 'warn') {
    if (sfx) playSfx(sfx);
    this.msg.setText(msg).setColor(color).setAlpha(1);
    this.tweens.killTweensOf(this.msg);
    this.tweens.add({ targets: this.msg, alpha: 0, delay: 2000, duration: 400 });
  }

  private claim(i: number) {
    const err = claimDexReward(this.g_, i);
    if (err) return this.warn(err);
    saveGame();
    playSfx('badge');
    this.render();
    this.warn(t('dex.got', { label: rewardLabel(DEX_REWARDS[i]) }), '#9fe08a', null);
  }

  /** Enter: nhận mốc thưởng đầu tiên đang chờ */
  private claimFirst() {
    const d = dexOf(this.g_);
    const i = DEX_REWARDS.findIndex((r, k) => !d.claimed.includes(k) && d.caught.length >= r.caught);
    if (i < 0) return this.warn(t('dex.noneToClaim'));
    this.claim(i);
  }

  private back() {
    saveGame();
    this.scene.start(this.from, {});
  }

  // ------------------------------------------------------------------ vẽ

  private render() {
    this.hideTip();
    this.layer?.destroy(true);
    const { width, height } = this.scale;
    const items: Phaser.GameObjects.GameObject[] = [];
    const add: Add = (o) => {
      items.push(o);
      return o;
    };
    const d = dexOf(this.g_);

    outlinedText(this, width / 2, 30, 'POKÉDEX', 24, COLORS.gold, '#2a1430', 2).all.forEach((o) => add(o));
    add(text(this, width / 2, 54, t('dex.seenCaught', { seen: d.seen.length, caught: d.caught.length, total: dexTotal() }), 12, '#c8d0f0').setOrigin(0.5, 0));

    this.drawGrid(add);
    this.drawDetail(add);
    this.drawRewards(add);

    // ---- thanh dưới ----
    const b = button(this, 150, height - 34, t('dex.back'), () => this.back(), 250);
    add(b.bg);
    add(b.t);
    add(text(this, 296, height - 34, t('dex.controls'), 10, '#a8b8c8').setOrigin(0, 0.5));

    this.layer = this.add.container(0, 0, items);
  }

  private drawGrid(add: Add) {
    const d = dexOf(this.g_);
    const page = Math.floor(this.sel / PER_PAGE);
    const pages = this.pages;
    add(pixelPanel(this, GRID.x, PANEL_Y, GRID.w, PANEL_H));
    const gridW = COLS * CELL_W + (COLS - 1) * GAP;
    const x0 = GRID.x + Math.round((GRID.w - gridW) / 2);
    const y0 = PANEL_Y + 22;

    if (!this.list.length) {
      add(text(this, GRID.x + GRID.w / 2, PANEL_Y + PANEL_H / 2, t('dex.noData'), 12, '#8a94b8').setOrigin(0.5));
      return;
    }

    this.list.slice(page * PER_PAGE, (page + 1) * PER_PAGE).forEach((sp, j) => {
      const i = page * PER_PAGE + j;
      const cx = x0 + (j % COLS) * (CELL_W + GAP);
      const cy = y0 + Math.floor(j / COLS) * (CELL_H + GAP);
      const seen = d.seen.includes(sp.id);
      const caught = d.caught.includes(sp.id);
      const selected = i === this.sel;
      const r = add(this.add.rectangle(cx + CELL_W / 2, cy + CELL_H / 2, CELL_W, CELL_H, caught ? 0x1e2a4a : seen ? 0x161d38 : 0x0b0f1e)
        .setStrokeStyle(selected ? 4 : 2, selected ? 0xffffff : caught ? 0xffd34a : 0x3a4468));
      r.setInteractive({ useHandCursor: true }).on('pointerdown', () => this.select(i));
      add(text(this, cx + 6, cy + 6, dexNo(sp.dex), 10, seen ? '#c8d0f0' : '#5a6488'));
      if (caught) add(icon(this, cx + CELL_W - 12, cy + 12, 'pokeball', 1));

      const spr = add(pokemonIcon(this, sp.id, cx + CELL_W / 2, cy + 52, 36, seen && selected));
      if (!seen) spr.setTintFill(0x000000).setAlpha(0.75);
      else if (!caught) spr.setAlpha(0.5);

      const name = add(text(this, cx + CELL_W / 2, cy + 88, seen ? sp.name : '???', 10, caught ? '#ffffff' : seen ? '#a8b0d0' : '#5a6488').setOrigin(0.5, 0));
      fit(name, CELL_W - 10);
    });

    // ---- chuyển trang ----
    const fy = PANEL_Y + PANEL_H - 40;
    const mid = GRID.x + GRID.w / 2;
    add(text(this, mid, fy, t('dex.page', { p: page + 1, n: pages }), 12, '#ffffff').setOrigin(0.5));
    const arrow = (x: number, label: string, dir: number, on: boolean) => {
      const bg = add(this.add.rectangle(x, fy, 44, 26, on ? 0x2c3a6a : 0x1a2038).setStrokeStyle(2, on ? 0xffd34a : 0x3a4468));
      add(text(this, x, fy, label, 12, on ? '#ffffff' : '#5a6488').setOrigin(0.5));
      if (on) bg.setInteractive({ useHandCursor: true }).on('pointerdown', () => this.changePage(dir));
    };
    arrow(mid - 110, '◀ Q', -1, page > 0);
    arrow(mid + 110, 'E ▶', 1, page < pages - 1);
  }

  private drawDetail(add: Add) {
    const x0 = DETAIL.x;
    const y0 = PANEL_Y;
    const w = DETAIL.w;
    const bottom = y0 + PANEL_H - 18;
    add(pixelPanel(this, x0, y0, w, PANEL_H));
    const sp = this.list[this.sel];
    if (!sp) return;
    const d = dexOf(this.g_);
    const seen = d.seen.includes(sp.id);
    const caught = d.caught.includes(sp.id);
    const lx = x0 + 22;
    const rx = x0 + w - 22;

    // ---- đầu thẻ: chân dung viền vàng + số, tên, độ hiếm, hệ ----
    const fs = 136;
    spriteFrame(this, add, lx, y0 + 20, fs, sp.id, { gold: caught, seen, animate: seen });
    const tx = lx + fs + 16;
    const tw = rx - tx;
    add(text(this, tx, y0 + 26, t('stat.dexNo', { n: dexNo(sp.dex).slice(1) }), 10, '#a8b0d0'));
    const status = caught ? t('dex.caught') : seen ? t('dex.seenOnly') : t('dex.unseen');
    const stt = add(text(this, rx, y0 + 26, status, 10, caught ? COLORS.gold : seen ? '#c8d0f0' : '#7a84a8').setOrigin(1, 0));
    if (caught) add(icon(this, rx - stt.width - 10, y0 + 26 + textH(stt) / 2, 'check', 1));
    add(fit(text(this, tx, y0 + 46, seen ? sp.name : '???', 24, seen ? '#ffffff' : '#7a84a8'), tw));

    if (!seen) {
      add(text(this, tx, y0 + 92, t('dex.unseenHint'), 10, '#a8b0d0', { lineSpacing: 6, wordWrap: { width: tw } }));
      return;
    }
    const rar = rarityOf(sp.id);
    add(icon(this, tx + 7, y0 + 92, 'pokeball', 1));
    add(text(this, tx + 18, y0 + 92, rar.label, 10, rar.color).setOrigin(0, 0.5));
    typePills(this, add, tx, y0 + 118, sp.types, 22);
    const first = sp.skills.find((k) => k.slot === 'J');
    const note = blurb(sp) || (first && MOVES[first.move] ? t('stat.startsWith', { move: moveName(MOVES[first.move]) }) : '');
    if (note) add(text(this, tx, y0 + 136, note, 10, '#c8d0f0', { wordWrap: { width: tw }, lineSpacing: 2, maxLines: 2 }));

    // ---- 2 cột: chỉ số gốc | bộ chiêu ----
    const y = y0 + 182;
    const colW = 206;
    const c2 = rx - colW;
    add(text(this, lx, y, t('dex.baseStats'), 12, COLORS.gold).setOrigin(0, 0.5));
    const sh = statRows(this, add, lx, y + 14, colW, speciesRows(speciesStats(sp)), { rowH: 22, labelW: 82, valueW: 58 });

    add(text(this, c2, y, t('dex.moves'), 12, COLORS.gold).setOrigin(0, 0.5));
    const skills = [...sp.skills].sort((a, b) => SKILL_SLOTS.indexOf(a.slot) - SKILL_SLOTS.indexOf(b.slot));
    const mvRow = 38;
    skills.forEach((s, i) => {
      const mv = MOVES[s.move];
      const ry = y + 16 + i * mvRow;
      const ig = add(this.add.graphics());
      ig.fillStyle(mv ? TYPE_COLOR[mv.type] : 0x5a6488, 1).fillRoundedRect(c2, ry + 1, 20, 20, 6);
      ig.lineStyle(1, 0x0b0f1e, 1).strokeRoundedRect(c2, ry + 1, 20, 20, 6);
      if (mv) add(icon(this, c2 + 10, ry + 11, mv.icon, 1));
      add(fit(text(this, c2 + 26, ry, `${s.slot} · ${mv ? moveName(mv) : s.move}`, 10, '#ffffff'), colW - 26));
      const ul = add(text(this, c2 + 26, ry + 18, s.level <= 1 ? t('dex.fromStart') : t('dex.unlockAt', { lv: s.level }), 10, s.level <= 1 ? '#9fe08a' : '#ffd0a0'));
      if (mv) add(fit(text(this, c2 + 26 + ul.width + 8, ry + 18, moveDesc(mv), 10, '#8a94b8'), colW - 26 - ul.width - 8));
      // rê chuột: xem đầy đủ mô tả chiêu
      if (mv) {
        const z = add(this.add.zone(c2 + colW / 2, ry + mvRow / 2 - 2, colW, mvRow).setInteractive());
        z.on('pointerover', () => this.showTip(`${moveName(mv)} · ${typeLabel(mv.type)}`, moveDesc(mv), c2 - 4, ry + mvRow));
        z.on('pointerout', () => this.hideTip());
      }
    });

    let cy = y + 14 + Math.max(sh, 16 + skills.length * mvRow) + 8;
    const sep = add(this.add.graphics());
    sep.fillStyle(0x3a4a88, 1).fillRect(lx, cy, rx - lx, 2);
    cy += 10;
    const header = (label: string) => {
      const o = add(text(this, lx, cy, label, 12, COLORS.gold));
      cy += textH(o) + 6;
      return o;
    };

    // ---- tiến hóa + tuyệt chiêu ----
    header(t('dex.evolution'));
    // chuỗi tiến hóa: gốc → ... (loài chưa gặp: bóng đen, tên ???)
    const chainH = evolutionsOf(sp).length || this.preEvos.has(sp.id) ? evoChain(this, add, lx, cy, rx - lx, sp.id, this.g_) : 0;
    if (!chainH) add(text(this, lx, cy, t('dex.noEvo'), 10, '#8a94b8'));
    cy += (chainH || 18) + 6;
    const ult = hasUltimate(sp.id);
    const u = ultimateText(sp.types[0], ultimateFor(sp.types));
    const ut = add(text(this, lx, cy, ult ? t('stat.ultLine', { name: u.name }) : t('stat.ultLocked'), 10, ult ? '#ffd0a0' : '#8a94b8'));
    fit(ut, rx - lx);
    if (ult && ut.width < rx - lx - 80) add(fit(text(this, lx + ut.width + 8, cy, `· ${u.desc}`, 10, '#8a94b8'), rx - lx - ut.width - 8));
    cy += 26;

    // ---- nơi gặp ----
    if (cy + 40 > bottom) return;
    const hy = cy;
    header(t('dex.where'));
    const legend = add(text(this, rx, hy + 2, t('dex.catchable'), 10, '#a8b0d0').setOrigin(1, 0));
    add(icon(this, rx - legend.width - 12, hy + 8, 'pokeball', 1));
    const enc = this.encounters.get(sp.id) ?? [];
    if (!enc.length) {
      add(text(this, lx, cy, this.preEvos.has(sp.id) ? t('dex.evoOnly') : t('dex.nowhere'), 10, '#8a94b8'));
      return;
    }
    const encColW = Math.floor((rx - lx) / 2);
    const rowH = 18;
    const rows = Math.max(1, Math.floor((bottom - cy) / rowH));
    const cap = rows * 2;
    const shown = enc.length > cap ? enc.slice(0, cap - 1) : enc;
    const cell = (k: number) => ({ x: lx + Math.floor(k / rows) * encColW, y: cy + (k % rows) * rowH });
    shown.forEach((e, k) => {
      const p = cell(k);
      if (e.catchable) add(icon(this, p.x + 7, p.y + 6, 'pokeball', 1));
      else add(this.add.rectangle(p.x + 7, p.y + 6, 4, 4, 0x5a6488));
      add(fit(text(this, p.x + 18, p.y, e.name, 10, e.catchable ? '#ffffff' : '#a8b0d0'), encColW - 24));
    });
    if (enc.length > cap) {
      const p = cell(cap - 1);
      add(text(this, p.x + 18, p.y, t('dex.moreStages', { n: enc.length - shown.length }), 10, '#8a94b8'));
    }
  }

  private tip: Phaser.GameObjects.Container | null = null;

  /** khung mô tả nổi (rê chuột lên chiêu) */
  private showTip(title: string, body: string, x: number, y: number) {
    this.hideTip();
    const w = 300;
    const tt = text(this, 12, 10, title, 12, COLORS.gold);
    const bt = text(this, 12, 14 + textH(tt), body, 10, '#ffffff', { wordWrap: { width: w - 24 }, lineSpacing: 2 });
    const h = 22 + textH(tt) + textH(bt);
    const g = this.add.graphics();
    g.fillStyle(0x000000, 0.4).fillRoundedRect(3, 4, w, h, 8);
    g.fillStyle(0x0b0f1e, 0.97).fillRoundedRect(0, 0, w, h, 8);
    g.lineStyle(2, 0xffd34a, 1).strokeRoundedRect(1, 1, w - 2, h - 2, 8);
    const px = Math.min(this.scale.width - w - 8, x);
    const py = y + h > this.scale.height - 8 ? y - h - 44 : y;
    this.tip = this.add.container(px, py, [g, tt, bt]).setDepth(50);
  }

  private hideTip() {
    this.tip?.destroy(true);
    this.tip = null;
  }

  private drawRewards(add: Add) {
    const x0 = REWARD.x;
    const y0 = PANEL_Y;
    const w = REWARD.w;
    add(pixelPanel(this, x0, y0, w, PANEL_H));
    const d = dexOf(this.g_);
    const have = d.caught.length;
    add(text(this, x0 + 20, y0 + 20, t('dex.rewards'), 12, COLORS.gold));
    add(text(this, x0 + 20, y0 + 42, t('dex.caughtN', { n: have }), 10, '#c8d0f0'));

    const bx = x0 + 18;
    const bw = w - 36;
    const top = y0 + 66;
    const rowH = Math.min(68, Math.floor((PANEL_H - 66 - 18) / Math.max(1, DEX_REWARDS.length)));
    DEX_REWARDS.forEach((r, i) => {
      const ry = top + i * rowH;
      const claimed = d.claimed.includes(i);
      const ready = !claimed && have >= r.caught;
      add(this.add.rectangle(bx, ry, bw, rowH - 6, ready ? 0x2a3a1e : 0x0b0f1e).setOrigin(0)
        .setStrokeStyle(2, ready ? 0x9fe08a : claimed ? 0x3a5a3a : 0x3a4468));
      add(text(this, bx + 10, ry + 6, t('dex.milestone', { n: r.caught }), 12, claimed ? '#8a94b8' : ready ? COLORS.gold : '#ffffff'));
      // thanh tiến độ nhỏ bên phải tiêu đề
      const pg = add(this.add.graphics());
      const pw = 56;
      const px = bx + bw - 10 - pw;
      pg.fillStyle(0x2a2a3a, 1).fillRect(px, ry + 10, pw, 5);
      pg.fillStyle(claimed ? 0x5a8a5a : 0x3ec8f0, 1).fillRect(px, ry + 10, Math.round(pw * Math.min(1, have / r.caught)), 5);
      add(fit(text(this, bx + 10, ry + 26, rewardLabel(r), 10, claimed ? '#7a84a8' : '#c8d0f0'), bw - 20));

      const sy = ry + 44;
      if (claimed) {
        add(icon(this, bx + 16, sy + 6, 'check', 1));
        add(text(this, bx + 28, sy, t('dex.claimed'), 10, '#9fe08a'));
      } else if (ready) {
        add(text(this, bx + 10, sy, t('dex.ready'), 10, COLORS.gold));
        const cxB = bx + bw - 42;
        const bg = add(this.add.rectangle(cxB, sy + 5, 64, 20, 0x2f7a30).setStrokeStyle(2, 0x9fe08a));
        add(text(this, cxB, sy + 5, t('dex.claim'), 10, '#ffffff').setOrigin(0.5));
        bg.setInteractive({ useHandCursor: true })
          .on('pointerover', () => bg.setFillStyle(0x3f9a40))
          .on('pointerout', () => bg.setFillStyle(0x2f7a30))
          .on('pointerdown', () => this.claim(i));
      } else {
        add(text(this, bx + 10, sy, t('dex.need', { n: r.caught - have }), 10, '#8a94b8'));
      }
    });
  }
}
