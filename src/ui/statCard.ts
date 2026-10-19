// Mảnh giao diện dùng chung cho thẻ thông tin Pokémon (Đội hình, Pokédex, Tiến hóa):
// khung chân dung viền vàng, nhãn hệ bo tròn, các hàng chỉ số có thanh, viên giá tiền, nấc cấp.
import Phaser from 'phaser';
import { STATS } from '../config/balance';
import { POKEMON } from '../data/pokemon';
import { SpeciesStats, statMax } from '../data/stats';
import { TYPE_COLOR, type PokemonType } from '../data/types';
import type { GameState, MemberStats, PartyMember } from '../game/state';
import { evoStatus } from '../game/evolution';
import { dexOf } from '../game/dex';
import { evolutionsOf } from '../data/pokemon';
import { fmtNum, t } from '../i18n';
import { itemName, typeLabel } from '../i18n/content';
import { pokemonIcon } from './pokemonIcon';
import { COLORS, icon, text } from './style';

export type Add = <T extends Phaser.GameObjects.GameObject>(o: T) => T;

export const STAT_COLOR = {
  hp: 0x5ad06a,
  atk: 0xf0a030,
  def: 0x5a9af0,
  speed: 0x3ec8f0,
  crit: 0xff6a5a,
  haste: 0xc080ff,
  regen: 0x9fe08a,
} as const;

/** chiều cao thật của khung chữ (bỏ phần đệm phía trên dành cho dấu) */
export const textH = (o: Phaser.GameObjects.Text) => o.height - (o.padding?.top ?? 0);

/** cắt bớt chữ cho vừa bề ngang */
export function fit<T extends Phaser.GameObjects.Text>(o: T, maxW: number): T {
  if (o.width <= maxW) return o;
  let s = o.text;
  while (s.length > 1 && o.width > maxW) {
    s = s.slice(0, -1);
    o.setText(`${s.trimEnd()}…`);
  }
  return o;
}

export const dexNo = (n: number) => String(n).padStart(3, '0');

/** độ hiếm theo tỉ lệ bắt */
export function rarityOf(speciesId: string): { label: string; color: string } {
  const sp = POKEMON[speciesId];
  const cr = sp?.catchRate ?? 255;
  if (cr <= 3) return { label: t('stat.rarity.legendary'), color: '#ffd34a' };
  if (cr <= 45) return { label: t('stat.rarity.rare'), color: '#ff9ad0' };
  if (cr <= 120) return { label: t('stat.rarity.uncommon'), color: '#9ad0ff' };
  return { label: t('stat.rarity.common'), color: '#c8d0f0' };
}

/** Khung chân dung bo góc: nền tối có quầng sáng, viền vàng (hoặc xám nếu chưa bắt) */
export function spriteFrame(scene: Phaser.Scene, add: Add, x: number, y: number, size: number, speciesId: string, opts: { gold?: boolean; seen?: boolean; animate?: boolean } = {}) {
  const g = add(scene.add.graphics());
  const r = 14;
  g.fillStyle(0x000000, 0.35).fillRoundedRect(x + 3, y + 5, size, size, r);
  g.fillStyle(0x0b0f1e, 1).fillRoundedRect(x, y, size, size, r);
  // nền chuyển sắc từ dưới lên (các dải ngang) + quầng sáng giữa
  const bands = 8;
  for (let i = 0; i < bands; i++) {
    const c = Phaser.Display.Color.Interpolate.ColorWithColor(
      Phaser.Display.Color.ValueToColor(0x2a3a78), Phaser.Display.Color.ValueToColor(0x0f1530), bands - 1, i);
    const yy = y + 4 + ((size - 8) * i) / bands;
    g.fillStyle(Phaser.Display.Color.GetColor(c.r, c.g, c.b), 1);
    const top = i === 0 ? r - 4 : 0;
    const bot = i === bands - 1 ? r - 4 : 0;
    g.fillRoundedRect(x + 4, yy, size - 8, (size - 8) / bands + 1, { tl: top, tr: top, bl: bot, br: bot });
  }
  g.fillStyle(0x6a7ae0, 0.18).fillEllipse(x + size / 2, y + size * 0.58, size * 0.8, size * 0.5);
  g.fillStyle(0x000000, 0.35).fillEllipse(x + size / 2, y + size * 0.8, size * 0.5, size * 0.1);
  g.lineStyle(3, opts.gold === false ? 0x5a6488 : 0xffd34a, 1).strokeRoundedRect(x + 1.5, y + 1.5, size - 3, size - 3, r);
  g.lineStyle(1, 0x0b0f1e, 0.8).strokeRoundedRect(x + 4, y + 4, size - 8, size - 8, r - 3);
  const spr = add(pokemonIcon(scene, speciesId, x + size / 2, y + size * 0.56, size * 0.56, opts.animate ?? true));
  if (opts.seen === false) spr.setTintFill(0x000000).setAlpha(0.8);
  return spr;
}

/** Nhãn hệ bo tròn; trả về bề ngang đã dùng */
export function typePills(scene: Phaser.Scene, add: Add, x: number, y: number, types: PokemonType[], h = 22) {
  let tx = x;
  for (const ty of types) {
    // vẽ nền trước (để nằm dưới chữ), đo chữ rồi mới tô nền
    const g = add(scene.add.graphics());
    const tt = add(text(scene, 0, y, typeLabel(ty).toUpperCase(), 10, '#ffffff').setOrigin(0.5));
    const w = Math.max(64, Math.ceil(tt.width) + 20);
    g.fillStyle(0x0b0f1e, 1).fillRoundedRect(tx - 1, y - h / 2 - 1, w + 2, h + 2, h / 2 + 1);
    g.fillStyle(TYPE_COLOR[ty], 1).fillRoundedRect(tx, y - h / 2, w, h, h / 2);
    g.fillStyle(0xffffff, 0.18).fillRoundedRect(tx + 4, y - h / 2 + 2, w - 8, h / 2 - 2, h / 4);
    tt.setX(tx + w / 2);
    tx += w + 6;
  }
  return tx - x;
}

export interface StatRow {
  label: string;
  /** phần gốc (0..1) */
  ratio: number;
  /** tổng có cộng Huấn luyện (0..1), ≥ ratio */
  total?: number;
  value: string;
  color: number;
  valueColor?: string;
}

/** Các hàng chỉ số: nhãn | thanh bo tròn | giá trị (canh phải) */
export function statRows(scene: Phaser.Scene, add: Add, x: number, y: number, w: number, rows: StatRow[], opts: { rowH?: number; labelW?: number; valueW?: number; size?: number } = {}) {
  const rowH = opts.rowH ?? 24;
  const labelW = opts.labelW ?? 92;
  const valueW = opts.valueW ?? 58;
  const size = opts.size ?? 10;
  const g = add(scene.add.graphics());
  const bx = x + labelW;
  const bw = w - labelW - valueW;
  const bh = 8;
  rows.forEach((r, i) => {
    const cy = y + i * rowH + rowH / 2;
    add(fit(text(scene, x, cy, r.label, size, '#c8d0f0').setOrigin(0, 0.5), labelW - 6));
    g.fillStyle(0x0b0f1e, 1).fillRoundedRect(bx - 1, cy - bh / 2 - 1, bw + 2, bh + 2, (bh + 2) / 2);
    g.fillStyle(0x2a3050, 1).fillRoundedRect(bx, cy - bh / 2, bw, bh, bh / 2);
    const tot = Phaser.Math.Clamp(r.total ?? r.ratio, 0, 1);
    const base = Phaser.Math.Clamp(r.ratio, 0, 1);
    if (tot > base + 0.001) {
      g.fillStyle(0xfff0a0, 1).fillRoundedRect(bx, cy - bh / 2, Math.max(bh, bw * tot), bh, bh / 2);
    }
    if (base > 0) g.fillStyle(r.color, 1).fillRoundedRect(bx, cy - bh / 2, Math.max(bh, bw * base), bh, bh / 2);
    add(text(scene, x + w, cy, r.value, size, r.valueColor ?? '#ffffff').setOrigin(1, 0.5));
  });
  return rows.length * rowH;
}

const pct = (v: number) => `${Math.round(v * 100)}%`;
const regenStr = (v: number) => (v > 0 ? `${(v * 100).toFixed(1)}%/s` : '—');

/** Hàng chỉ số gốc của loài (Pokédex) */
export function speciesRows(s: SpeciesStats): StatRow[] {
  const mx = statMax();
  const rows: StatRow[] = [
    { label: t('stat.hp'), ratio: s.hp / mx.hp, value: String(s.hp), color: STAT_COLOR.hp },
    { label: t('stat.atk'), ratio: s.atk / mx.atk, value: String(s.atk), color: STAT_COLOR.atk },
    { label: t('stat.def'), ratio: s.def / 160, value: String(s.def), color: STAT_COLOR.def },
    { label: t('stat.speed'), ratio: s.speed / mx.speed, value: String(s.speed), color: STAT_COLOR.speed },
    { label: t('stat.crit'), ratio: s.crit / 0.25, value: pct(s.crit), color: STAT_COLOR.crit, valueColor: s.crit > 0.05 ? '#ffb09a' : undefined },
    { label: t('stat.haste'), ratio: s.haste / 0.25, value: s.haste > 0 ? `−${pct(s.haste)}` : '0%', color: STAT_COLOR.haste, valueColor: s.haste > 0 ? '#e0b8ff' : undefined },
  ];
  if (s.regen > 0) rows.push({ label: t('stat.regen'), ratio: s.regen / 0.012, value: regenStr(s.regen), color: STAT_COLOR.regen, valueColor: '#c8f0b8' });
  return rows;
}

/** Hàng chỉ số thực của một Pokémon trong đội (theo cấp + Huấn luyện); phần sáng trên thanh = phần đã luyện */
export function memberRows(s: SpeciesStats, st: MemberStats, level: number): StatRow[] {
  const mx = statMax();
  const hpBase = STATS.hpAt(s.hp, level);
  const hpMax = STATS.hpAt(mx.hp, level) * 1.3;
  const atkBase = STATS.powerAt(s.atk, level) * 50;
  const atkMax = STATS.powerAt(mx.atk, level) * 50 * 1.25;
  const spBase = STATS.speedAt(s.speed, level);
  const spMax = STATS.speedAt(mx.speed, level) * 1.1;
  const up = '#fff0a0';
  return [
    { label: t('stat.hp'), ratio: hpBase / hpMax, total: st.maxHp / hpMax, value: fmtNum(st.maxHp), color: STAT_COLOR.hp, valueColor: st.maxHp > hpBase ? up : undefined },
    { label: t('stat.atk'), ratio: atkBase / atkMax, total: st.attack / atkMax, value: fmtNum(st.attack), color: STAT_COLOR.atk, valueColor: st.attack > Math.round(atkBase) ? up : undefined },
    { label: t('stat.def'), ratio: s.def / 200, total: st.def / 200, value: String(st.def), color: STAT_COLOR.def, valueColor: st.def > s.def ? up : undefined },
    { label: t('stat.speed'), ratio: spBase / spMax, total: st.speed / spMax, value: String(Math.round(st.speed)), color: STAT_COLOR.speed, valueColor: Math.round(st.speed) > Math.round(spBase) ? up : undefined },
    { label: t('stat.crit'), ratio: s.crit / 0.3, total: st.crit / 0.3, value: pct(st.crit), color: STAT_COLOR.crit, valueColor: st.crit > s.crit + 1e-6 ? up : undefined },
    { label: t('stat.haste'), ratio: s.haste / 0.3, total: st.haste / 0.3, value: st.haste > 0 ? `−${pct(st.haste)}` : '0%', color: STAT_COLOR.haste, valueColor: st.haste > s.haste + 1e-6 ? up : undefined },
    { label: t('stat.regen'), ratio: s.regen / 0.012, total: st.regenPct / 0.012, value: st.regen > 0 ? `${st.regen.toFixed(1)}/s` : '—', color: STAT_COLOR.regen, valueColor: st.regenPct > s.regen + 1e-6 ? up : undefined },
  ];
}

/** Nấc cấp: ô vuông bo nhẹ, vàng = đã có */
export function pips(g: Phaser.GameObjects.Graphics, x: number, y: number, n: number, filled: number, size = 10, gap = 4) {
  for (let i = 0; i < n; i++) {
    const px = x + i * (size + gap);
    g.fillStyle(0x0b0f1e, 1).fillRoundedRect(px - 1, y - 1, size + 2, size + 2, 3);
    g.fillStyle(i < filled ? 0xffd34a : 0x2c3558, 1).fillRoundedRect(px, y, size, size, 2);
    if (i < filled) g.fillStyle(0xfff4c0, 1).fillRect(px + 2, y + 2, Math.max(2, size / 3), 2);
  }
  return n * (size + gap) - gap;
}

/** Viên giá tiền vàng bo tròn có icon xu; state: ok (mua được) · poor (thiếu tiền) · max (đã tối đa) · locked */
export function pricePill(scene: Phaser.Scene, add: Add, cx: number, cy: number, w: number, cost: number | null, state: 'ok' | 'poor' | 'max' | 'locked', onClick?: () => void, label?: string) {
  const h = 28;
  const g = add(scene.add.graphics());
  const draw = (hover: boolean) => {
    g.clear();
    const fill = state === 'ok' ? (hover ? 0xffe070 : 0xf0c040) : state === 'max' ? 0x2f5a30 : 0x3a3f58;
    const edge = state === 'ok' ? 0xfff0a0 : state === 'max' ? 0x9fe08a : 0x5a6080;
    g.fillStyle(0x0b0f1e, 1).fillRoundedRect(cx - w / 2 - 2, cy - h / 2 - 2, w + 4, h + 4, h / 2 + 2);
    g.fillStyle(fill, 1).fillRoundedRect(cx - w / 2, cy - h / 2, w, h, h / 2);
    g.fillStyle(0xffffff, state === 'ok' ? 0.3 : 0.08).fillRoundedRect(cx - w / 2 + 6, cy - h / 2 + 3, w - 12, h / 2 - 4, h / 4);
    g.lineStyle(1, edge, 1).strokeRoundedRect(cx - w / 2, cy - h / 2, w, h, h / 2);
  };
  draw(false);
  if (state === 'max' || state === 'locked' || cost === null) {
    add(text(scene, cx, cy, label ?? t('train.max'), 10, state === 'max' ? '#c8f0b8' : '#9aa0b8').setOrigin(0.5));
  } else {
    const s = add(text(scene, 0, cy, `${fmtNum(cost)}₽`, 12, state === 'ok' ? '#3a2208' : '#9aa0b8').setOrigin(0, 0.5));
    if (state === 'ok') s.setShadow(1, 1, '#fff4c0', 0, false, true);
    const ic = add(icon(scene, 0, cy, 'coin', 1.25));
    if (state !== 'ok') ic.setAlpha(0.5);
    const total = 20 + 4 + s.width;
    ic.setX(cx - total / 2 + 10);
    s.setX(cx - total / 2 + 24);
  }
  if (onClick && state !== 'locked') {
    const z = add(scene.add.zone(cx, cy, w, h).setInteractive({ useHandCursor: true }));
    z.on('pointerover', () => draw(true)).on('pointerout', () => draw(false)).on('pointerdown', onClick);
  }
}

/** Panel bo tròn (thẻ) */
export function card(scene: Phaser.Scene, add: Add, x: number, y: number, w: number, h: number, opts: { fill?: number; edge?: number; r?: number; edgeW?: number } = {}) {
  const g = add(scene.add.graphics());
  const r = opts.r ?? 10;
  g.fillStyle(0x000000, 0.3).fillRoundedRect(x + 2, y + 4, w, h, r);
  g.fillStyle(opts.fill ?? 0x1a2650, 1).fillRoundedRect(x, y, w, h, r);
  g.lineStyle(opts.edgeW ?? 2, opts.edge ?? 0x3a4a88, 1).strokeRoundedRect(x + 1, y + 1, w - 2, h - 2, r);
  return g;
}

/** loài đã gặp / bắt trong Pokédex (chưa thì vẽ bóng đen, tên ???) */
export function dexSeen(game: GameState | null, id: string) {
  if (!game) return true;
  const d = dexOf(game);
  return d.seen.includes(id) || d.caught.includes(id);
}

/**
 * Tiến độ tiến hóa (thẻ Đội hình): dạng hiện tại → thanh tiến độ (cấp tới cấp tiến hóa / có đá chưa) → dạng tiến hóa
 * (bóng đen nếu chưa gặp trong Pokédex). Trả về chiều cao đã dùng.
 */
export function evoProgress(scene: Phaser.Scene, add: Add, x: number, y: number, w: number, m: PartyMember, game: GameState | null) {
  const e = evoStatus(m, game);
  if (e.state === 'final' || !e.into) {
    add(text(scene, x, y, t('evo.team.final'), 10, '#a8b0d0'));
    return 20;
  }
  const fs = 52;
  spriteFrame(scene, add, x, y, fs, m.speciesId, { animate: false });
  const seen = dexSeen(game, e.into);
  spriteFrame(scene, add, x + w - fs, y, fs, e.into, { seen, gold: seen, animate: false });
  const bx = x + fs + 14;
  const bw = w - 2 * (fs + 14);
  const ready = e.state === 'ready' || e.state === 'item-ready';
  const capped = e.state === 'capped';
  // nhãn trên: tiến độ cấp / đá — tên dạng mới
  const top = e.level ? t('evo.team.lvProgress', { lv: m.level, evo: e.level }) : itemName(e.item ?? '');
  add(text(scene, bx, y + 4, top, 10, '#ffffff'));
  add(fit(text(scene, bx + bw, y + 4, seen ? POKEMON[e.into].name : '???', 10, seen ? '#ffd34a' : '#7a84a8').setOrigin(1, 0), bw / 2));
  const g = add(scene.add.graphics());
  const by = y + 24;
  const color = ready ? 0xffd34a : capped ? 0xa06a5a : e.state === 'soon' ? 0x9fe08a : 0x3ec8f0;
  g.fillStyle(0x0b0f1e, 1).fillRoundedRect(bx - 1, by - 1, bw + 2, 12, 6);
  g.fillStyle(0x2a3050, 1).fillRoundedRect(bx, by, bw, 10, 5);
  if (e.progress > 0) g.fillStyle(color, 1).fillRoundedRect(bx, by, Math.max(10, bw * e.progress), 10, 5);
  // mũi tên → ở cuối thanh
  g.fillStyle(0xffffff, 0.8).fillTriangle(bx + bw + 4, by - 2, bx + bw + 4, by + 12, bx + bw + 11, by + 5);
  const n = evolutionsOf(POKEMON[m.speciesId]).length;
  let status =
    e.state === 'ready' ? t('evo.team.ready')
      : e.state === 'soon' || e.state === 'far' ? (e.levelsLeft === 1 ? t('evo.team.soon1') : t('evo.team.soon', { n: e.levelsLeft }))
        : capped ? t('evo.team.capped', { cap: e.cap })
          : e.state === 'item-ready' ? t('evo.team.itemHave', { item: itemName(e.item ?? '') })
            : t('evo.team.itemNeed', { item: itemName(e.item ?? '') });
  if (n > 1) status += ` · ${t('evo.team.branches', { n })}`;
  add(fit(text(scene, bx, y + 40, status, 10, ready ? '#fff0a0' : capped ? '#ffc0a0' : e.state === 'soon' ? '#9fe08a' : '#c8d0f0'), bw));
  if (ready || e.state === 'soon') {
    const sp = add(icon(scene, x + fs - 4, y + 6, 'sparkle', 1.25));
    scene.tweens.add({ targets: sp, scale: 1.6, yoyo: true, repeat: -1, duration: 450 });
  }
  return fs + 8;
}

/** Chuỗi tiến hóa đầy đủ (Pokédex): gốc → ... → các nhánh; loài chưa gặp vẽ bóng đen, tên ??? */
export function evoChain(scene: Phaser.Scene, add: Add, x: number, y: number, w: number, speciesId: string, game: GameState | null) {
  // lần ngược về dạng gốc
  let root = speciesId;
  for (let guard = 0; guard < 5; guard++) {
    const pre = Object.values(POKEMON).find((sp) => evolutionsOf(sp).some((e) => e.into === root));
    if (!pre) break;
    root = pre.id;
  }
  // dàn theo tầng: tầng 0 = gốc, tầng k = các dạng tiến hóa từ tầng k-1 (kèm điều kiện)
  const tiers: { id: string; how: string }[][] = [[{ id: root, how: '' }]];
  for (let k = 0; k < 4; k++) {
    const next = tiers[k].flatMap((n) => evolutionsOf(POKEMON[n.id]).map((e) => ({ id: e.into, how: e.level ? `Lv ${e.level}` : itemName(e.item ?? '') })));
    if (!next.length) break;
    tiers.push(next);
  }
  const maxRows = Math.max(...tiers.map((tr) => tr.length));
  const rowH = maxRows > 1 ? 30 : 56;
  const cell = maxRows > 1 ? 28 : 48;
  const colW = Math.min(150, w / tiers.length);
  const g = add(scene.add.graphics());
  tiers.forEach((tier, k) => {
    tier.forEach((n, r) => {
      const cx = x + k * colW;
      const cy = y + r * rowH;
      const seen = dexSeen(game, n.id);
      const cur = n.id === speciesId;
      g.fillStyle(cur ? 0x2a3a78 : 0x0b0f1e, 1).fillRoundedRect(cx, cy, cell, cell, 6);
      g.lineStyle(2, cur ? 0xffd34a : 0x3a4a88, 1).strokeRoundedRect(cx, cy, cell, cell, 6);
      const spr = add(pokemonIcon(scene, n.id, cx + cell / 2, cy + cell / 2 + 1, cell * 0.6, false));
      if (!seen) spr.setTintFill(0x000000).setAlpha(0.8);
      const tx = cx + cell + 6;
      const tw = colW - cell - 10;
      if (k > 0) add(fit(text(scene, tx, cy + (maxRows > 1 ? 1 : 8), n.how, 9, '#ffd0a0'), tw));
      add(fit(text(scene, tx, cy + (maxRows > 1 ? 14 : 24), seen ? POKEMON[n.id].name : '???', 10, cur ? '#ffd34a' : seen ? '#ffffff' : '#7a84a8'), tw));
      if (k > 0) g.fillStyle(0xffffff, 0.7).fillTriangle(cx - 10, cy + cell / 2 - 5, cx - 10, cy + cell / 2 + 5, cx - 4, cy + cell / 2);
    });
  });
  return maxRows * rowH;
}

export { COLORS };
