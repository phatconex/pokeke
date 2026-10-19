// Đội hình: chọn tối đa 3 Pokémon từ Hộp, xem thẻ chỉ số, nâng chiêu và Huấn luyện bằng tiền.
// Bố cục 1280×720: trái = đội + Hộp · giữa = thẻ thông tin con đang chọn · phải = thẻ Chiêu / Huấn luyện.
import Phaser from 'phaser';
import { skillGate, TRAIN_STATS, trainGate, TRAINING, TrainStat } from '../config/balance';
import { SKILL_MAX_LEVEL, upgradePerks } from '../data/moves';
import { hasUltimate, POKEMON, SKILL_SLOTS, SkillSlot } from '../data/pokemon';
import { STAGE_BY_ID } from '../data/stages';
import { speciesStats } from '../data/stats';
import { ultimateFor } from '../data/ultimates';
import {
  EVOLUTION_ITEMS, EvolutionItem, GameState, getGame, itemEvolution, memberSkills, memberStats, PartyMember, saveGame, skillLevel, TEAM_SIZE,
  trainCost, trainLevel, trainLockedBadges, trainMember, upgradeCost, upgradeSkill, xpToNext, upgradeBlock, skillMastery, masteryNeeded,
} from '../game/state';
import { playSfx } from '../systems/sfx';
import { pokemonIcon } from '../ui/pokemonIcon';
import { button, COLORS, icon, outlinedText, pixelFont, pixelPanel, text } from '../ui/style';
import { evoHighlight, evoStatus } from '../game/evolution';
import { Add, card, dexNo, evoProgress, fit, memberRows, pips, pricePill, rarityOf, spriteFrame, statRows, textH, typePills } from '../ui/statCard';
import { fmtNum, t } from '../i18n';
import { itemName, moveDesc, moveName, stageName, ultimateText } from '../i18n/content';
import { playMusic } from '../systems/music';
import { isLearned, slotUnlock, UnlockSlot } from '../game/unlocks';
import { reqLine, ultAnyText } from '../ui/unlockText';

/** Hộp: 4 cột × 3 hàng mỗi trang */
const COLS = 4;
const BOX_ROWS = 3;
const CELL_W = 84;
const CELL_H = 100;

const TOP = 66;
const PANEL_H = 576;
const LEFT = { x: 20, w: 400 };
const MID = { x: 432, w: 396 };
const RIGHT = { x: 840, w: 420 };

type Tab = 'moves' | 'train';
const KEY_NAMES = ['ONE', 'TWO', 'THREE', 'FOUR', 'FIVE', 'SIX', 'SEVEN', 'EIGHT'];

/** hiệu quả Huấn luyện dạng chữ: v = tổng (per × cấp) */
function trainValue(k: TrainStat, v: number) {
  const n = k === 'synthesis' ? (v * 100).toFixed(2).replace(/0$/, '') : String(Math.round(v * 100));
  return n;
}

export class TeamScene extends Phaser.Scene {
  private g_!: GameState;
  private stageId: string | null = null;
  private layer: Phaser.GameObjects.Container | null = null;
  /** con trỏ bàn phím: index trong danh sách Hộp */
  private sel = 0;
  private tab: Tab = 'moves';
  private msg!: Phaser.GameObjects.Text;

  constructor() {
    super('Team');
  }

  init(data: { stageId?: string } | undefined) {
    this.stageId = data?.stageId ?? null;
  }

  create() {
    playMusic('map');
    const g = getGame();
    if (!g) {
      this.scene.start('Menu');
      return;
    }
    this.g_ = g;
    this.sel = 0;
    this.layer = null;
    this.cameras.main.setBackgroundColor('#13261a');
    this.add.tileSprite(0, 0, this.scale.width / 2, this.scale.height / 2, 'tiles', 0).setOrigin(0).setScale(2).setAlpha(0.25);
    // thông báo ở góc phải dưới, cạnh các nút
    this.msg = text(this, this.scale.width - 20, this.scale.height - 44, '', 12, '#ff9a9a', { align: 'right', wordWrap: { width: 330 } }).setOrigin(1, 0.5).setDepth(10);
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
    kb.on('keydown-SPACE', () => this.toggle(this.g_.box[this.sel]));
    kb.on('keydown-ENTER', () => (this.stageId ? this.start() : this.back()));
    kb.on('keydown-ESC', () => this.back());
    kb.addCapture('TAB');
    kb.on('keydown-TAB', () => this.setTab(this.tab === 'moves' ? 'train' : 'moves'));
    kb.on('keydown-T', () => this.setTab(this.tab === 'moves' ? 'train' : 'moves'));
    // 1–4: nâng chiêu J/K/L/U · 1–8: Huấn luyện (theo thẻ đang mở)
    KEY_NAMES.forEach((key, i) => kb.on(`keydown-${key}`, () => {
      const m = this.g_.box[this.sel];
      if (!m) return;
      if (this.tab === 'train') {
        const k = TRAIN_STATS[i];
        if (k) this.train(m, k);
        return;
      }
      const slot = SKILL_SLOTS[i];
      const sk = slot && memberSkills(m).find((s) => s.slot === slot);
      if (!sk) return;
      if (!sk.unlocked) {
        const u = slotUnlock(m, slot as UnlockSlot);
        return this.warn(t('unlock.cantUpgrade', { req: u ? reqLine(u, m) : `Lv ${sk.unlockLevel}` }));
      }
      this.upgrade(m, slot);
    }));
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      kb.removeAllListeners();
      kb.removeCapture('TAB');
    });
  }

  private setTab(tab: Tab) {
    if (this.tab === tab) return;
    this.tab = tab;
    playSfx('talk');
    this.render();
  }

  private moveSel(dx: number, dy: number) {
    const n = this.g_.box.length;
    this.sel = Phaser.Math.Clamp(this.sel + dx + dy * COLS, 0, n - 1);
    playSfx('talk');
    this.render();
  }

  private selectIdx(i: number) {
    if (i < 0 || i === this.sel) return false;
    this.sel = i;
    playSfx('talk');
    this.render();
    return true;
  }

  private toggle(m?: PartyMember) {
    if (!m) return;
    const g = this.g_;
    const inTeam = g.team.includes(m.uid);
    if (inTeam) {
      if (g.team.length <= 1) return this.warn(t('team.minOne'));
      g.team = g.team.filter((u) => u !== m.uid);
    } else {
      if (m.injured) return this.warn(t('team.isInjured', { name: POKEMON[m.speciesId].name }));
      if (g.team.length >= TEAM_SIZE) return this.warn(t('team.full'));
      g.team.push(m.uid);
    }
    playSfx('select');
    saveGame();
    this.render();
  }

  private warn(msg: string, color = '#ff9a9a', sfx: 'warn' | null = 'warn') {
    if (sfx) playSfx(sfx);
    this.msg.setText(msg).setColor(color).setAlpha(1);
    this.tweens.killTweensOf(this.msg);
    this.tweens.add({ targets: this.msg, alpha: 0, delay: 1600, duration: 400 });
  }

  private render() {
    this.layer?.destroy(true);
    const { width, height } = this.scale;
    const g = this.g_;
    const items: Phaser.GameObjects.GameObject[] = [];
    const add: Add = (o) => {
      items.push(o);
      return o;
    };
    const stage = this.stageId ? STAGE_BY_ID[this.stageId] : null;
    outlinedText(this, width / 2, 34, stage ? t('team.prep', { stage: stageName(stage).toUpperCase() }) : t('team.title'), 24, COLORS.gold, '#2a1430', 2).all.forEach((o) => add(o));

    // ---- tiền (góc phải trên) ----
    const money = add(text(this, width - 24, 34, `${fmtNum(g.money)}₽`, 24, COLORS.gold).setOrigin(1, 0.5));
    add(icon(this, width - 24 - money.width - 20, 34, 'coin', 2));

    this.drawLeft(add);
    const cur = g.box[this.sel];
    this.drawDetail(add, cur);
    this.drawRight(add, cur);

    // ---- nút ----
    if (this.stageId) {
      const b1 = button(this, width / 2 - 140, height - 44, t('team.back'), () => this.back(), 220);
      const b2 = button(this, width / 2 + 140, height - 44, t('team.go'), () => this.start(), 240);
      items.push(b1.bg, b1.t, b2.bg, b2.t);
    } else {
      const b = button(this, width / 2, height - 44, t('team.done'), () => this.back(), 220);
      items.push(b.bg, b.t);
    }
    this.layer = this.add.container(0, 0, items);
  }

  // ------------------------------------------------------------------ trái: đội + Hộp

  private drawLeft(add: Add) {
    const g = this.g_;
    const x0 = LEFT.x;
    const w = LEFT.w;
    add(pixelPanel(this, x0, TOP, w, PANEL_H));
    add(text(this, x0 + 22, TOP + 22, t('team.party', { n: g.team.length, max: TEAM_SIZE }), 12, COLORS.gold).setOrigin(0, 0.5));

    // 3 ô đội ra trận
    const slotW = 116;
    const slotH = 100;
    for (let i = 0; i < TEAM_SIZE; i++) {
      const uid = g.team[i];
      const m = g.box.find((b) => b.uid === uid);
      const sx = x0 + 22 + i * (slotW + 8);
      const sy = TOP + 40;
      const idx = m ? g.box.indexOf(m) : -1;
      const selected = idx === this.sel && idx >= 0;
      card(this, add, sx, sy, slotW, slotH, { fill: m ? 0x1a2650 : 0x0b0f1e, edge: selected ? 0xffffff : m ? 0xffd34a : 0x3a4468, edgeW: selected ? 3 : 2 });
      add(text(this, sx + 8, sy + 6, String(i + 1), 10, COLORS.gold));
      if (!m) {
        add(text(this, sx + slotW / 2, sy + slotH / 2, t('team.empty'), 10, '#5a6488').setOrigin(0.5));
        continue;
      }
      const z = add(this.add.zone(sx + slotW / 2, sy + slotH / 2, slotW, slotH).setInteractive({ useHandCursor: true }));
      z.on('pointerdown', () => {
        if (!this.selectIdx(idx)) this.toggle(m);
      });
      add(pokemonIcon(this, m.speciesId, sx + slotW / 2, sy + 34, 30, selected));
      add(fit(text(this, sx + slotW / 2, sy + 58, POKEMON[m.speciesId].name, 10, '#ffffff').setOrigin(0.5, 0), slotW - 12));
      add(text(this, sx + 8, sy + 84, `Lv ${m.level}`, 10, COLORS.gold).setOrigin(0, 0.5));
      if (evoHighlight(evoStatus(m, g))) this.evoBadge(add, sx + slotW - 14, sy + 14);
      // thanh máu nhỏ
      const st = memberStats(m);
      const bg = add(this.add.graphics());
      const bx = sx + 52;
      const bw = slotW - 60;
      const hp = Phaser.Math.Clamp(m.hp / st.maxHp, 0, 1);
      bg.fillStyle(0x0b0f1e, 1).fillRoundedRect(bx - 1, sy + 80, bw + 2, 8, 4);
      bg.fillStyle(0x2a3050, 1).fillRoundedRect(bx, sy + 81, bw, 6, 3);
      if (hp > 0) bg.fillStyle(m.injured ? 0xff4040 : hp < 0.3 ? 0xf0a030 : 0x5ad06a, 1).fillRoundedRect(bx, sy + 81, Math.max(6, bw * hp), 6, 3);
    }

    // Hộp: chia trang theo con đang chọn
    const perPage = COLS * BOX_ROWS;
    const pages = Math.max(1, Math.ceil(g.box.length / perPage));
    const page = Math.min(pages - 1, Math.floor(this.sel / perPage));
    const hy = TOP + 162;
    add(text(this, x0 + 22, hy, t('team.box', { n: g.box.length }), 12, COLORS.gold).setOrigin(0, 0.5));
    add(fit(text(this, x0 + w - 22, hy, t('team.boxHint'), 10, '#a8b0d0').setOrigin(1, 0.5), w - 44 - 160));
    const gx = x0 + Math.round((w - (COLS * CELL_W + (COLS - 1) * 8)) / 2);
    const gy = hy + 18;
    g.box.slice(page * perPage, (page + 1) * perPage).forEach((m, j) => {
      const i = page * perPage + j;
      const cx = gx + (j % COLS) * (CELL_W + 8);
      const cy = gy + Math.floor(j / COLS) * (CELL_H + 8);
      const inTeam = g.team.includes(m.uid);
      const selected = i === this.sel;
      card(this, add, cx, cy, CELL_W, CELL_H, { fill: inTeam ? 0x24401e : 0x111830, edge: selected ? 0xffffff : inTeam ? 0xffd34a : 0x3a4468, edgeW: selected ? 3 : 2, r: 8 });
      const z = add(this.add.zone(cx + CELL_W / 2, cy + CELL_H / 2, CELL_W, CELL_H).setInteractive({ useHandCursor: true }));
      z.on('pointerdown', () => {
        if (!this.selectIdx(i)) this.toggle(m);
      });
      add(pokemonIcon(this, m.speciesId, cx + CELL_W / 2, cy + 38, 30, selected));
      add(fit(text(this, cx + CELL_W / 2, cy + 64, POKEMON[m.speciesId].name, 10, '#ffffff').setOrigin(0.5, 0), CELL_W - 8));
      add(text(this, cx + CELL_W / 2, cy + 84, `Lv ${m.level}`, 10, COLORS.gold).setOrigin(0.5, 0));
      if (inTeam) add(icon(this, cx + 12, cy + 12, 'check', 1.25));
      if (evoHighlight(evoStatus(m, g))) this.evoBadge(add, cx + CELL_W - 12, m.injured ? cy + 30 : cy + 12);
      if (m.injured) add(icon(this, cx + CELL_W - 12, cy + 12, 'skull', 1.25));
    });
    // chuyển trang
    if (pages > 1) {
      const fy = TOP + PANEL_H - 34;
      const mid = x0 + w / 2;
      add(text(this, mid, fy, t('team.page', { p: page + 1, n: pages }), 10, '#ffffff').setOrigin(0.5));
      const arrow = (ax: number, label: string, dir: number, on: boolean) => {
        const r = add(this.add.rectangle(ax, fy, 40, 24, on ? 0x2c3a6a : 0x1a2038).setStrokeStyle(2, on ? 0xffd34a : 0x3a4468));
        add(text(this, ax, fy, label, 10, on ? '#ffffff' : '#5a6488').setOrigin(0.5));
        if (on) r.setInteractive({ useHandCursor: true }).on('pointerdown', () => {
          this.sel = Phaser.Math.Clamp((page + dir) * perPage, 0, g.box.length - 1);
          playSfx('talk');
          this.render();
        });
      };
      arrow(x0 + 50, '◀', -1, page > 0);
      arrow(x0 + w - 50, '▶', 1, page < pages - 1);
    }
  }

  /** huy hiệu ✨ trên ô: sắp / sẵn sàng tiến hóa */
  private evoBadge(add: Add, x: number, y: number) {
    const gb = add(this.add.graphics());
    gb.fillStyle(0x0b0f1e, 0.9).fillCircle(x, y, 10);
    gb.lineStyle(2, 0xffd34a, 1).strokeCircle(x, y, 10);
    const sp = add(icon(this, x, y, 'sparkle', 1));
    this.tweens.add({ targets: sp, scale: 1.3, yoyo: true, repeat: -1, duration: 500 });
  }

  // ------------------------------------------------------------------ giữa: thẻ thông tin

  private drawDetail(add: Add, m: PartyMember | undefined) {
    const x0 = MID.x;
    const w = MID.w;
    add(pixelPanel(this, x0, TOP, w, PANEL_H));
    if (!m) return;
    const sp = POKEMON[m.speciesId];
    const base = speciesStats(sp);
    const st = memberStats(m);
    const lx = x0 + 22;
    const rx = x0 + w - 22;

    // ---- đầu thẻ: chân dung + tên ----
    const fs = 128;
    spriteFrame(this, add, lx, TOP + 20, fs, m.speciesId);
    const tx = lx + fs + 16;
    const tw = rx - tx;
    add(fit(text(this, tx, TOP + 26, t('stat.dexNo', { n: dexNo(sp.dex) }), 10, '#a8b0d0'), tw));
    add(fit(text(this, tx, TOP + 44, sp.name, 24, '#ffffff'), tw));
    const rar = rarityOf(sp.id);
    add(icon(this, tx + 7, TOP + 86, 'pokeball', 1));
    add(text(this, tx + 18, TOP + 86, rar.label, 10, rar.color).setOrigin(0, 0.5));
    // Lv + EXP
    const lv = add(text(this, tx, TOP + 108, `Lv ${m.level}`, 12, COLORS.gold).setOrigin(0, 0.5));
    const gg = add(this.add.graphics());
    const xbX = tx + lv.width + 10;
    const xbW = rx - xbX;
    const xr = Phaser.Math.Clamp(m.xp / xpToNext(m.level), 0, 1);
    gg.fillStyle(0x0b0f1e, 1).fillRoundedRect(xbX - 1, TOP + 104, xbW + 2, 8, 4);
    gg.fillStyle(0x2a3050, 1).fillRoundedRect(xbX, TOP + 105, xbW, 6, 3);
    if (xr > 0) gg.fillStyle(0x3ec8f0, 1).fillRoundedRect(xbX, TOP + 105, Math.max(6, xbW * xr), 6, 3);
    // máu hiện tại
    add(text(this, tx, TOP + 128, m.injured ? t('team.injured') : t('team.hp', { hp: m.hp, max: st.maxHp }), 10, m.injured ? '#ff8a8a' : '#c8d0f0').setOrigin(0, 0.5));
    typePills(this, add, tx, TOP + 152, sp.types, 22);

    // ---- chỉ số ----
    let y = TOP + 172;
    add(text(this, lx, y, t('stat.statsLv', { lv: m.level }), 12, COLORS.gold).setOrigin(0, 0.5));
    const leg = add(text(this, rx, y, t('stat.trained'), 10, '#fff0a0').setOrigin(1, 0.5));
    const lg = add(this.add.graphics());
    lg.fillStyle(0xfff0a0, 1).fillRoundedRect(rx - leg.width - 22, y - 4, 14, 8, 4);
    y += 14;
    y += statRows(this, add, lx, y, rx - lx, memberRows(base, st, m.level), { rowH: 24, labelW: 96, valueW: 64 });

    // ---- tiến hóa ----
    y += 10;
    const sep = add(this.add.graphics());
    sep.fillStyle(0x3a4a88, 1).fillRect(lx, y, rx - lx, 2);
    y += 10;
    // dạng hiện tại → thanh tiến độ → dạng tiến hóa (bóng đen nếu chưa gặp trong Pokédex)
    y += evoProgress(this, add, lx, y, rx - lx, m, this.g_) + 4;

    // ---- tuyệt chiêu ----
    const ult = hasUltimate(sp.id);
    const u = ultimateText(sp.types[0], ultimateFor(sp.types));
    // đã tiến hóa nhưng chưa học: điều kiện "thắng hội quán hoặc N đòn KO"
    const ultU = ult && !isLearned(m, 'I') ? slotUnlock(m, 'I') : null;
    const ultLine = !ult ? t('stat.ultLocked') : ultU ? t('unlock.ultLine', { req: ultAnyText(ultU, m) }) : t('stat.ultLine', { name: u.name });
    add(text(this, lx, y, ultLine, 10, !ult ? '#8a94b8' : ultU ? (ultU.ready ? '#9fe08a' : '#ffb070') : '#ffd0a0', { wordWrap: { width: rx - lx }, maxLines: 2 }));
    if (ultU) y += 12;
    y += 20;
    if (ult) add(text(this, lx, y, u.desc, 10, '#c8d0f0', { wordWrap: { width: rx - lx }, maxLines: 2 }));

    // ---- tiến hóa bằng đá: người chơi tự quyết định ----
    for (const key of Object.keys(EVOLUTION_ITEMS) as EvolutionItem[]) {
      const into = itemEvolution(m, key);
      const have = this.g_.items[key];
      if (!into || have <= 0) continue;
      const b = button(this, x0 + w / 2, TOP + PANEL_H - 40, t('team.useItem', { item: itemName(key), n: have }), () => {
        this.g_.items[key]--;
        saveGame();
        playSfx('select');
        this.scene.start('Evolution', { queue: [{ uid: m.uid, from: m.speciesId, into, item: key }] });
      }, w - 60);
      b.t.setFontSize(pixelFont(12).px);
      add(b.bg);
      add(b.t);
      break;
    }
  }

  // ------------------------------------------------------------------ phải: Chiêu / Huấn luyện

  private drawRight(add: Add, m: PartyMember | undefined) {
    const x0 = RIGHT.x;
    const w = RIGHT.w;
    add(pixelPanel(this, x0, TOP, w, PANEL_H));
    const lx = x0 + 20;
    const iw = w - 40;
    // tab
    const tabW = (iw - 8) / 2;
    (['moves', 'train'] as Tab[]).forEach((tb, i) => {
      const on = this.tab === tb;
      const tx = lx + i * (tabW + 8);
      card(this, add, tx, TOP + 18, tabW, 36, { fill: on ? 0x34479a : 0x111830, edge: on ? 0xffd34a : 0x3a4468, r: 10 });
      add(icon(this, tx + 22, TOP + 36, tb === 'moves' ? 'upgrade' : 'medal', 1.5).setAlpha(on ? 1 : 0.6));
      add(fit(text(this, tx + 38, TOP + 36, t(tb === 'moves' ? 'tab.moves' : 'tab.train'), 12, on ? '#ffffff' : '#8a94b8').setOrigin(0, 0.5), tabW - 46));
      const z = add(this.add.zone(tx + tabW / 2, TOP + 36, tabW, 36).setInteractive({ useHandCursor: true }));
      z.on('pointerdown', () => this.setTab(tb));
    });
    add(fit(text(this, lx, TOP + 70, `${t(this.tab === 'moves' ? 'tab.movesKeys' : 'tab.trainKeys')}  ·  ${t('tab.hint')}`, 10, '#a8b0d0').setOrigin(0, 0.5), iw));
    if (!m) return;
    const top = TOP + 88;
    const h = TOP + PANEL_H - 18 - top;
    if (this.tab === 'moves') this.drawMoves(add, m, lx, top, iw, h);
    else this.drawTraining(add, m, lx, top, iw, h);
  }

  private drawMoves(add: Add, m: PartyMember, x: number, y: number, w: number, h: number) {
    const skills = memberSkills(m);
    const gap = 8;
    const rowH = Math.floor((h - gap * 3) / 4);
    skills.forEach((s, i) => {
      const ry = y + i * (rowH + gap);
      card(this, add, x, ry, w, rowH, { fill: s.unlocked ? 0x1a2650 : 0x111628, edge: s.unlocked ? 0x3a4a88 : 0x2a3050 });
      // icon trong vòng tròn tối
      const ig = add(this.add.graphics());
      ig.fillStyle(0x0b0f1e, 1).fillCircle(x + 26, ry + 28, 18);
      add(icon(this, x + 26, ry + 28, s.unlocked ? s.base.icon : 'lock', 2).setAlpha(s.unlocked ? 1 : 0.6));
      add(text(this, x + 26, ry + 58, String(i + 1), 10, '#7a84a8').setOrigin(0.5));
      const nx = x + 52;
      const pillW = 108;
      const name = add(fit(text(this, nx, ry + 10, `${s.slot} · ${moveName(s.base)}`, 12, s.unlocked ? '#ffffff' : '#7a84a8'), w - 52 - pillW - 16));
      // nấc nâng cấp dưới tên
      const pg = add(this.add.graphics());
      const py = ry + 12 + textH(name);
      pips(pg, nx, py, SKILL_MAX_LEVEL, s.upgrade, 9, 4);
      lockPips(pg, nx, py, SKILL_MAX_LEVEL, Math.max(s.upgrade, skillGate(this.g_.badges.length)), 9, 4);
      // chưa học: danh sách điều kiện mở khóa thay cho mô tả (game/unlocks.ts)
      const ul = s.unlocked ? null : slotUnlock(m, s.slot as UnlockSlot);
      if (ul) add(text(this, nx, py + 16, reqLine(ul, m), 10, ul.ready ? '#9fe08a' : '#ffd0a0', { wordWrap: { width: w - 52 - pillW - 22 }, maxLines: 3, lineSpacing: 2 }));
      else add(text(this, nx, py + 16, moveDesc(s.base), 10, s.unlocked ? '#c8d0f0' : '#7a84a8', { wordWrap: { width: w - 52 - pillW - 22 }, maxLines: 2, lineSpacing: 2 }));
      // mốc kế tiếp (chưa học: mô tả chiêu rút gọn)
      const perks = upgradePerks(s.base);
      const next = s.upgrade < 3 ? t('team.nextLv3', { perk: perks.lv3 }) : s.upgrade < 5 ? t('team.nextLv5', { perk: perks.lv5 }) : t('team.maxed');
      if (ul) add(fit(text(this, nx, ry + rowH - 16, moveDesc(s.base), 10, '#7a84a8').setOrigin(0, 0.5), w - 52 - 14));
      else add(fit(text(this, nx, ry + rowH - 16, next, 10, s.upgrade >= 5 ? COLORS.gold : '#ffd0a0').setOrigin(0, 0.5), w - 52 - 14));
      // giá
      const cost = upgradeCost(m, s.slot);
      const pcx = x + w - 12 - pillW / 2;
      const block = upgradeBlock(this.g_, m, s.slot);
      if (!s.unlocked) pricePill(this, add, pcx, ry + 22, pillW, null, 'locked', undefined, ul?.ready ? t('unlock.pillReady') : t('unlock.pill'));
      else if (block?.kind === 'max' || cost === null) pricePill(this, add, pcx, ry + 22, pillW, null, 'max');
      else if (block?.kind === 'badges') pricePill(this, add, pcx, ry + 22, pillW, null, 'locked', undefined, t('train.gate', { n: block.n }));
      else if (block?.kind === 'mastery') pricePill(this, add, pcx, ry + 22, pillW, null, 'locked', undefined, t('team.needMastery', { n: block.need }));
      else pricePill(this, add, pcx, ry + 22, pillW, cost, block?.kind === 'money' ? 'poor' : 'ok', () => this.upgrade(m, s.slot));
      // Thông thạo: thanh tiến độ tới mốc của cấp kế tiếp + lý do chưa nâng được
      if (s.unlocked) {
        const have = skillMastery(m, s.slot);
        const need = masteryNeeded(m, s.slot);
        const bx = pcx - pillW / 2;
        const by = ry + 44;
        add(fit(text(this, bx, by, need ? t('team.mastery', { have: Math.min(have, need), need }) : t('team.masteryTotal', { n: have }), 9, '#a8e0ff').setOrigin(0, 0.5), pillW));
        const bar = add(this.add.graphics());
        const frac = need ? Math.min(1, have / need) : 1;
        bar.fillStyle(0x0b0f1e, 1).fillRoundedRect(bx, by + 8, pillW, 5, 2);
        bar.fillStyle(frac >= 1 ? 0x9fe08a : 0x5ab8ff, 1).fillRoundedRect(bx, by + 8, Math.max(2, pillW * frac), 5, 2);
        const why = block?.kind === 'money' ? t('team.whyMoney') : block?.kind === 'mastery' ? t('team.whyMastery', { n: block.need - block.have }) : block?.kind === 'badges' ? t('team.whyBadges', { n: block.n }) : '';
        if (why) add(fit(text(this, bx, by + 22, why, 9, '#ff9a7a').setOrigin(0, 0.5), pillW));
      }
    });
  }

  private drawTraining(add: Add, m: PartyMember, x: number, y: number, w: number, h: number) {
    const gap = 8;
    const cw = (w - gap) / 2;
    const ch = Math.floor((h - gap * 3) / 4);
    TRAIN_STATS.forEach((k, i) => {
      const cfg = TRAINING[k];
      const lv = trainLevel(m, k);
      const cost = trainCost(m, k);
      const cx = x + (i % 2) * (cw + gap);
      const cy = y + Math.floor(i / 2) * (ch + gap);
      card(this, add, cx, cy, cw, ch, { fill: 0x1a2650, edge: lv >= cfg.max ? 0x9fe08a : 0x3a4a88 });
      const ig = add(this.add.graphics());
      ig.fillStyle(0x0b0f1e, 1).fillRoundedRect(cx + 8, cy + 8, 36, 36, 8);
      ig.lineStyle(1, 0x3a4a88, 1).strokeRoundedRect(cx + 8, cy + 8, 36, 36, 8);
      add(icon(this, cx + 26, cy + 26, cfg.icon, 2));
      add(text(this, cx + cw - 10, cy + 10, String(i + 1), 10, '#7a84a8').setOrigin(1, 0));
      add(fit(text(this, cx + 52, cy + 8, t(`train.${k}`), 12, '#ffffff'), cw - 52 - 22));
      add(fit(text(this, cx + 52, cy + 30, t(`train.${k}.fx`, { v: trainValue(k, cfg.per) }), 10, '#c8d0f0'), cw - 52 - 8));
      // nấc + tổng hiện tại
      const pg = add(this.add.graphics());
      const ps = cfg.max > 5 ? 9 : 12;
      pips(pg, cx + 10, cy + 54, cfg.max, lv, ps, cfg.max > 5 ? 3 : 4);
      // nấc chưa mở theo số huy hiệu: tô tối + gạch chéo
      lockPips(pg, cx + 10, cy + 54, cfg.max, Math.max(lv, trainGate(k, this.g_.badges.length)), ps, cfg.max > 5 ? 3 : 4);
      if (lv > 0) {
        const total = trainValue(k, cfg.per * lv);
        const sign = k === 'reflexes' ? '−' : '+';
        add(text(this, cx + cw - 10, cy + 54 + ps / 2, `${sign}${total}%`, 10, COLORS.gold).setOrigin(1, 0.5));
      }
      const gateNeed = trainLockedBadges(this.g_, m, k);
      if (gateNeed !== null) {
        pricePill(this, add, cx + cw / 2, cy + ch - 20, cw - 20, null, 'locked', undefined, t('train.gate', { n: gateNeed }));
        return;
      }
      const state = cost === null ? 'max' : this.g_.money >= cost ? 'ok' : 'poor';
      pricePill(this, add, cx + cw / 2, cy + ch - 20, cw - 20, cost, state, () => this.train(m, k));
    });
  }

  /** Nâng một ô chiêu của con đang chọn bằng tiền */
  private upgrade(m: PartyMember, slot: SkillSlot) {
    const cost = upgradeCost(m, slot);
    if (cost === null) return this.warn(t('team.errMax'));
    const block = upgradeBlock(this.g_, m, slot);
    if (block?.kind === 'money') return this.warn(t('team.errMoney'));
    const err = upgradeSkill(this.g_, m, slot);
    if (err) return this.warn(err);
    saveGame();
    playSfx('pickup');
    this.render();
    const base = memberSkills(m).find((s) => s.slot === slot)?.base;
    this.warn(t('team.upgraded', { name: POKEMON[m.speciesId].name, move: base ? moveName(base) : slot, lv: skillLevel(m, slot) }), '#9fe08a', null);
  }

  /** Huấn luyện một chỉ số của con đang chọn bằng tiền */
  private train(m: PartyMember, k: TrainStat) {
    const err = trainMember(this.g_, m, k);
    if (err) return this.warn(err);
    saveGame();
    playSfx('pickup');
    this.render();
    this.warn(t('train.done', { name: POKEMON[m.speciesId].name, stat: t(`train.${k}`), lv: trainLevel(m, k) }), '#9fe08a', null);
  }

  private start() {
    if (!this.stageId) return;
    const ok = this.g_.team.map((u) => this.g_.box.find((m) => m.uid === u)).some((m) => m && !m.injured);
    if (!ok) return this.warn(t('team.noHealthy'));
    saveGame();
    playSfx('select');
    this.cameras.main.fadeOut(250, 0, 0, 0);
    this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => this.scene.start('Battle', { kind: 'stage', stageId: this.stageId }));
  }

  private back() {
    saveGame();
    this.scene.start('StageMap', {});
  }
}

/** Phủ tối các nấc từ `open` trở đi (chưa mở theo số huy hiệu) – cùng bố cục với pips() */
function lockPips(g: Phaser.GameObjects.Graphics, x: number, y: number, n: number, open: number, size: number, gap: number) {
  for (let i = open; i < n; i++) {
    const px = x + i * (size + gap);
    g.fillStyle(0x0b0f1e, 0.75).fillRoundedRect(px, y, size, size, 2);
    g.lineStyle(1, 0x5a6080, 1).lineBetween(px + 2, y + 2, px + size - 2, y + size - 2);
  }
}
