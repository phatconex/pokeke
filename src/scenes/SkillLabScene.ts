// Skill Lab: xem trước chiêu của mọi loài ở mọi cấp, dùng ĐÚNG mã ra chiêu của trận đấu.
// Cảnh này chỉ là lớp giao diện phủ lên trên: nó chạy BattleScene với cấu hình { kind: 'lab', speciesId, level }
// (một Pokémon + hình nộm vô hạn máu, không thưởng / không lưu / không EXP) và HUD như trận thật.
import Phaser from 'phaser';
import { POKEMON, PokemonSpecies, SKILL_SLOTS, SkillSlot } from '../data/pokemon';
import { PokemonType, TYPE_COLOR } from '../data/types';
import { ultimateFor } from '../data/ultimates';
import { t } from '../i18n';
import { moveName, typeLabel } from '../i18n/content';
import { resolveUlt } from '../skills/kits';
import { playSfx } from '../systems/sfx';
import { pokemonIcon } from '../ui/pokemonIcon';
import { COLORS, pixelPanel, text } from '../ui/style';
import { reqSummary } from '../ui/unlockText';
import { fit } from '../ui/statCard';
import type { UnlockSlot } from '../game/unlocks';
import type { BattleScene } from './BattleScene';

const PILL = { fill: 0x1f2a5c, fillHover: 0x2a3a82, fillOn: 0x3a5ab8, edge: 0x8a9ad8, edgeOn: 0xffd34a };
const ROW_H = 34;
const TYPES: (PokemonType | null)[] = [null, ...(Object.keys(TYPE_COLOR) as PokemonType[])];

export interface SkillLabData {
  speciesId?: string;
  level?: number;
}

export class SkillLabScene extends Phaser.Scene {
  private speciesId = 'charmeleon';
  private level = 20;
  private query = '';
  private typeIdx = 0;
  private searchFocused = false;
  private moving = false;
  private freeEnergy = false;
  private list!: Phaser.GameObjects.Container;
  private listTop = 0;
  private listH = 0;
  private scrollY = 0;
  private contentH = 0;
  private searchText!: Phaser.GameObjects.Text;
  private typeText!: Phaser.GameObjects.Text;
  private info!: Phaser.GameObjects.Container;
  private levelText!: Phaser.GameObjects.Text;
  private dmgText!: Phaser.GameObjects.Text;
  private toggles: { moving: Phaser.GameObjects.Text; energy: Phaser.GameObjects.Text } | null = null;
  private infoKey = '';

  constructor() {
    super('SkillLab');
  }

  init(data?: SkillLabData) {
    if (data?.speciesId && POKEMON[data.speciesId]) this.speciesId = data.speciesId;
    if (data?.level) this.level = Phaser.Math.Clamp(Math.round(data.level), 1, 70);
  }

  private get battle(): BattleScene {
    return this.scene.get('Battle') as BattleScene;
  }

  create() {
    const { width, height } = this.scale;
    this.searchFocused = false;
    this.scrollY = 0;
    this.infoKey = '';

    // ---- trái: danh sách loài ----
    const lx = 8;
    const ly = 104;
    const lw = 240;
    const lh = height - ly - 8;
    pixelPanel(this, lx, ly, lw, lh);
    const search = this.add.graphics();
    const drawSearch = () => {
      search.clear();
      search.fillStyle(0x0b0f1e, 1).fillRoundedRect(lx + 12, ly + 12, lw - 24, 28, 8);
      search.lineStyle(2, this.searchFocused ? PILL.edgeOn : PILL.edge, 1).strokeRoundedRect(lx + 12, ly + 12, lw - 24, 28, 8);
    };
    drawSearch();
    this.searchText = text(this, lx + 22, ly + 26, '', 11, '#ffffff').setOrigin(0, 0.5);
    this.add.rectangle(lx + lw / 2, ly + 26, lw - 24, 28, 0xffffff, 0.001).setInteractive({ useHandCursor: true }).on('pointerdown', () => {
      this.setSearchFocus(true);
      drawSearch();
    });
    this.input.on(Phaser.Input.Events.POINTER_DOWN, (_p: Phaser.Input.Pointer, over: Phaser.GameObjects.GameObject[]) => {
      if (this.searchFocused && !over.length) {
        this.setSearchFocus(false);
        drawSearch();
      }
    });
    // lọc theo hệ: ◀ hệ ▶
    this.typeText = text(this, lx + lw / 2, ly + 58, '', 11, '#ffffff').setOrigin(0.5);
    this.smallButton(lx + 12, ly + 46, 28, 24, '<', () => this.cycleType(-1));
    this.smallButton(lx + lw - 40, ly + 46, 28, 24, '>', () => this.cycleType(1));
    this.listTop = ly + 80;
    this.listH = lh - 88;
    this.list = this.add.container(lx + 10, this.listTop);
    const maskG = this.make.graphics({}, false).fillStyle(0xffffff).fillRect(lx + 6, this.listTop, lw - 12, this.listH);
    this.list.setMask(maskG.createGeometryMask());
    this.input.on(Phaser.Input.Events.POINTER_WHEEL, (p: Phaser.Input.Pointer, _o: unknown, _dx: number, dy: number) => {
      if (p.x < lx || p.x > lx + lw) return;
      this.scrollTo(this.scrollY + dy * 0.6);
    });
    this.buildList();

    // ---- phải: thông tin chiêu + điều khiển ----
    const rw = 300;
    const rx = width - rw - 8;
    const ry = 104;
    pixelPanel(this, rx, ry, rw, height - ry - 8);
    this.info = this.add.container(0, 0);
    // cấp
    const lvY = ry + 74;
    text(this, rx + 16, lvY, t('lab.level'), 11, COLORS.gold).setOrigin(0, 0.5);
    this.smallButton(rx + 86, lvY - 12, 34, 24, '-5', () => this.setLevel(this.level - 5));
    this.smallButton(rx + 124, lvY - 12, 26, 24, '-', () => this.setLevel(this.level - 1));
    this.levelText = text(this, rx + 182, lvY, '', 13, '#ffffff').setOrigin(0.5);
    this.smallButton(rx + 214, lvY - 12, 26, 24, '+', () => this.setLevel(this.level + 1));
    this.smallButton(rx + 244, lvY - 12, 34, 24, '+5', () => this.setLevel(this.level + 5));
    // nút ra chiêu
    const by = height - 196;
    [...SKILL_SLOTS, 'I' as const].forEach((s, i) => this.smallButton(rx + 16 + i * 54, by, 46, 30, s, () => this.battle.labPress(s as SkillSlot | 'I'), 14));
    // bật/tắt + đặt lại
    const tg = (y: number, fn: () => void) => this.smallButton(rx + 16, y, rw - 32, 26, '', fn, 11);
    this.toggles = {
      moving: tg(by + 40, () => { this.moving = !this.moving; this.refreshToggles(); }),
      energy: tg(by + 70, () => { this.freeEnergy = !this.freeEnergy; this.refreshToggles(); }),
    };
    tg(by + 100, () => this.battle.labResetDummies()).setText(t('lab.reset'));
    this.dmgText = text(this, rx + rw / 2, by + 140, '', 11, '#bfefff').setOrigin(0.5);
    this.smallButton(rx + rw - 96, ry + 12, 80, 26, t('lab.back'), () => this.back(), 11);
    text(this, width / 2, height - 110, t('lab.hint'), 10, '#ffffff').setOrigin(0.5).setAlpha(0.85);
    this.refreshToggles();

    // ---- bàn phím: gõ tìm kiếm khi ô tìm đang chọn (nghe thẳng DOM để mỗi phím đúng một lần) ----
    const onKey = (e: KeyboardEvent) => {
      if (!this.searchFocused) return;
      if (e.key === 'Escape' || e.key === 'Enter') {
        this.setSearchFocus(false);
        drawSearch();
      } else if (e.key === 'Backspace') this.setQuery(this.query.slice(0, -1));
      else if (e.key.length === 1 && this.query.length < 16) this.setQuery(this.query + e.key);
    };
    window.addEventListener('keydown', onKey);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      window.removeEventListener('keydown', onKey);
      this.setSearchFocus(false, false);
      this.input.removeAllListeners();
    });

    this.startBattle();
  }

  update() {
    const b = this.battle;
    if (!b?.scene.isActive() || b.config.kind !== 'lab' || !b.fighters.length) return;
    b.labMoving = this.moving;
    b.labFreeEnergy = this.freeEnergy;
    this.levelText.setText(`Lv ${this.level}`);
    const d = b.labDamage();
    this.dmgText.setText(t('lab.damage', { n: d.total, dps: d.ms > 500 ? Math.round(d.total / (d.ms / 1000)) : 0 }));
    // thông tin chiêu: dựng lại khi loài / cấp đổi
    const key = `${b.player.species.id}:${b.player.level}`;
    if (key !== this.infoKey) {
      this.infoKey = key;
      this.buildInfo();
    }
  }

  // ======================================================================= trận thử

  private startBattle() {
    this.scene.stop('Hud');
    this.scene.stop('Battle');
    this.scene.launch('Battle', { kind: 'lab', speciesId: this.speciesId, level: this.level });
    this.infoKey = '';
  }

  private setLevel(lv: number) {
    lv = Phaser.Math.Clamp(lv, 1, 70);
    if (lv === this.level) return;
    this.level = lv;
    playSfx('select');
    this.battle.labSetLevel(lv);
  }

  private pickSpecies(id: string) {
    if (id === this.speciesId) return;
    this.speciesId = id;
    playSfx('select');
    if (this.searchFocused) this.setSearchFocus(false, false);
    this.buildList();
    this.startBattle();
  }

  private back() {
    this.scene.stop('Hud');
    this.scene.stop('Battle');
    this.scene.start('Menu');
  }

  // ======================================================================= danh sách loài

  private filtered(): PokemonSpecies[] {
    const ty = TYPES[this.typeIdx];
    const q = this.query.trim().toLowerCase().replace(/^#/, '');
    return Object.values(POKEMON)
      .filter((sp) => (!ty || sp.types.includes(ty)) && (!q || sp.name.toLowerCase().includes(q) || sp.id.includes(q) || String(sp.dex) === q.replace(/^0+/, '')))
      .sort((a, b) => a.dex - b.dex);
  }

  private buildList() {
    this.list.removeAll(true);
    const items = this.filtered();
    const w = 220;
    items.forEach((sp, i) => {
      const y = i * ROW_H;
      const on = sp.id === this.speciesId;
      const bg = this.add.rectangle(0, y, w, ROW_H - 2, on ? PILL.fillOn : 0x0b0f1e, on ? 0.9 : 0.5).setOrigin(0).setInteractive({ useHandCursor: true });
      bg.on('pointerover', () => !on && bg.setFillStyle(PILL.fillHover, 0.8));
      bg.on('pointerout', () => !on && bg.setFillStyle(0x0b0f1e, 0.5));
      bg.on('pointerdown', (p: Phaser.Input.Pointer) => {
        if (p.y < this.listTop || p.y > this.listTop + this.listH) return;
        this.pickSpecies(sp.id);
      });
      const ic = pokemonIcon(this, sp.id, 18, y + ROW_H / 2, 22, false);
      const no = text(this, 38, y + ROW_H / 2, `#${String(sp.dex).padStart(3, '0')}`, 10, '#9aa6d8').setOrigin(0, 0.5);
      const nm = text(this, 78, y + ROW_H / 2, sp.name, 11, on ? '#ffd34a' : '#ffffff').setOrigin(0, 0.5);
      const dots = sp.types.map((ty, k) => this.add.circle(w - 12 - k * 12, y + ROW_H / 2, 4, TYPE_COLOR[ty]).setStrokeStyle(1, 0x0b0f1e));
      this.list.add([bg, ic, no, nm, ...dots]);
    });
    if (!items.length) this.list.add(text(this, w / 2, 20, t('lab.empty'), 11, '#9aa6d8').setOrigin(0.5));
    this.contentH = items.length * ROW_H;
    this.searchText.setText(this.query ? this.query + (this.searchFocused ? '_' : '') : this.searchFocused ? '_' : t('lab.search')).setColor(this.query || this.searchFocused ? '#ffffff' : '#7a84a8');
    const ty = TYPES[this.typeIdx];
    this.typeText.setText(ty ? typeLabel(ty) : t('lab.allTypes')).setColor(ty ? '#' + TYPE_COLOR[ty].toString(16).padStart(6, '0') : '#ffffff');
    this.scrollTo(this.scrollY);
  }

  private scrollTo(y: number) {
    this.scrollY = Phaser.Math.Clamp(y, 0, Math.max(0, this.contentH - this.listH));
    this.list.y = this.listTop - this.scrollY;
  }

  private setQuery(q: string) {
    this.query = q;
    this.scrollY = 0;
    this.buildList();
  }

  private cycleType(d: number) {
    this.typeIdx = (this.typeIdx + d + TYPES.length) % TYPES.length;
    this.scrollY = 0;
    playSfx('select');
    this.buildList();
  }

  /** gõ tìm kiếm: tắt phím của trận + HUD để chữ không thành lệnh ra chiêu */
  private setSearchFocus(on: boolean, rebuild = true) {
    this.searchFocused = on;
    const b = this.battle;
    const hud = this.scene.get('Hud');
    if (b?.input?.keyboard) b.input.keyboard.enabled = !on;
    if (hud?.input?.keyboard) hud.input.keyboard.enabled = !on;
    if (!on) b?.resetInput();
    if (rebuild) this.buildList();
  }

  // ======================================================================= bảng thông tin

  private buildInfo() {
    const { width } = this.scale;
    const rx = width - 308;
    const ry = 104;
    this.info.removeAll(true);
    const p = this.battle.player;
    const sp = p.species;
    const add = <T extends Phaser.GameObjects.GameObject>(o: T) => {
      this.info.add(o);
      return o;
    };
    add(pokemonIcon(this, sp.id, rx + 34, ry + 32, 28, false));
    add(text(this, rx + 62, ry + 18, `${sp.name}  #${String(sp.dex).padStart(3, '0')}`, 13, '#ffffff'));
    add(text(this, rx + 62, ry + 38, sp.types.map((ty) => typeLabel(ty)).join(' / '), 10, '#' + TYPE_COLOR[sp.types[0]].toString(16).padStart(6, '0')));
    let y = ry + 100;
    for (const s of p.skills) {
      const spec = s.spec;
      const color = s.unlocked ? '#ffffff' : '#7a84a8';
      add(text(this, rx + 16, y, s.slot, 12, COLORS.gold));
      add(text(this, rx + 36, y, moveName(s.move), 11, color));
      const arch = spec.archetype
        ? `${spec.archetype}${spec.tierCount ? ' · ' + t('lab.tier', { t: spec.tier, n: spec.tierCount }) : ''}${spec.nextTierAt ? ' · ' + t('lab.nextTier', { lv: spec.nextTierAt }) : ''}`
        : t('lab.legacy');
      add(text(this, rx + 36, y + 16, arch, 10, spec.archetype ? '#ffb070' : '#9aa6d8'));
      const line = s.unlocked
        ? t('lab.stats', { cost: spec.cost, cd: (p.cooldownTotal(s.slot) / 1000).toFixed(2), pow: s.move.power.toFixed(1) })
        : t('lab.locked', { lv: s.unlockLevel });
      add(text(this, rx + 36, y + 30, line, 10, s.unlocked ? '#bfefff' : '#ff9a7a'));
      // điều kiện mở khóa trong game (Skill Lab bỏ qua khóa)
      const req = s.slot === 'J' ? '' : reqSummary(sp.id, s.slot as UnlockSlot);
      if (req) add(fit(text(this, rx + 36, y + 44, req, 9, '#ffd0a0'), 260));
      y += req ? 62 : 50;
    }
    const ult = resolveUlt(sp.id, sp.types);
    add(text(this, rx + 16, y, 'I', 12, COLORS.gold));
    add(text(this, rx + 36, y, ult ? t('lab.ultSpecies', { style: ult.archetype }) : t('lab.ultType', { pattern: ultimateFor(sp.types).pattern }), 10, ult ? '#ffb070' : '#9aa6d8'));
    add(text(this, rx + 36, y + 16, reqSummary(sp.id, 'I'), 9, '#ffd0a0', { wordWrap: { width: 260 }, maxLines: 2 }));
  }

  private refreshToggles() {
    if (!this.toggles) return;
    this.toggles.moving.setText(t(this.moving ? 'lab.dummiesMoving' : 'lab.dummiesStill')).setColor(this.moving ? '#ffd34a' : '#ffffff');
    this.toggles.energy.setText(t(this.freeEnergy ? 'lab.energyFree' : 'lab.energyNormal')).setColor(this.freeEnergy ? '#ffd34a' : '#ffffff');
  }

  /** nút bo tròn nhỏ (đồng bộ màu với menu / Cài đặt); trả về chữ để đổi nhãn */
  private smallButton(x: number, y: number, w: number, h: number, label: string, onClick: () => void, size = 12) {
    const g = this.add.graphics();
    const draw = (hover: boolean) => {
      g.clear();
      g.fillStyle(0x000000, 0.35).fillRoundedRect(x + 2, y + 3, w, h, Math.min(10, h / 2));
      g.fillStyle(hover ? PILL.fillHover : PILL.fill, 0.95).fillRoundedRect(x, y, w, h, Math.min(10, h / 2));
      g.lineStyle(2, hover ? PILL.edgeOn : PILL.edge, 1).strokeRoundedRect(x + 1, y + 1, w - 2, h - 2, Math.min(9, h / 2 - 1));
    };
    draw(false);
    const label_ = text(this, x + w / 2, y + h / 2, label, size, '#ffffff').setOrigin(0.5);
    this.add.rectangle(x + w / 2, y + h / 2, w, h, 0xffffff, 0.001).setInteractive({ useHandCursor: true })
      .on('pointerover', () => draw(true))
      .on('pointerout', () => draw(false))
      .on('pointerdown', onClick);
    return label_;
  }
}
