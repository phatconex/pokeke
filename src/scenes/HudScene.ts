import Phaser from 'phaser';
import type { BattleScene, GameOverInfo, StageEndInfo } from './BattleScene';
import { button, COLORS, icon, outlinedText, pixelPanel, text } from '../ui/style';
import { pokemonIcon } from '../ui/pokemonIcon';
import { formatTime } from '../systems/records';
import { cycleAimMode, getSettings, toggleSetting } from '../systems/settings';
import { lang, t } from '../i18n';
import { itemName, typeLabel } from '../i18n/content';
import { openSettingsPanel, SettingsTab } from '../ui/settingsPanel';
import { playSfx } from '../systems/sfx';
import { TYPE_COLOR, PokemonType } from '../data/types';
import { POKEMON } from '../data/pokemon';
import { getGame, saveGame, xpToNext } from '../game/state';
import { evoStatus } from '../game/evolution';
import { fit as fitText } from '../ui/statCard';
import { ULT_PACING } from '../data/ultimates';

/** ô chiêu và ô đội hình (gọn để không che sân đấu) */
const SLOT = 54;
const SLOT_GAP = 16;
const TEAM_STEP = 56;
const BAR_Y_OFF = 74;
type RegionKey = 'tl' | 'tc' | 'tr' | 'bl' | 'br' | 'bar';
/** độ mờ của bảng HUD khi người chơi đứng ngay dưới */
const FADE_ALPHA = 0.35;

/**
 * Giao diện trận đấu (theo bản mẫu): thẻ Pokémon ra sân, tiêu đề ải, đội dự bị, thanh chiêu,
 * thẻ đối thủ (hội quán), tạm dừng và màn kết quả.
 */
export class HudScene extends Phaser.Scene {
  private battle!: BattleScene;
  private g!: Phaser.GameObjects.Graphics;
  private portrait: Phaser.GameObjects.Sprite | null = null;
  private portraitId = '';
  private nameText!: Phaser.GameObjects.Text;
  private lvText!: Phaser.GameObjects.Text;
  private hpText!: Phaser.GameObjects.Text;
  private typeObjs: Phaser.GameObjects.GameObject[] = [];
  private shieldIcon!: Phaser.GameObjects.Image;
  private titleText!: Phaser.GameObjects.Text;
  private subText!: Phaser.GameObjects.Text;
  private infoTexts: Phaser.GameObjects.Text[] = [];
  private bossObjs: { portrait: Phaser.GameObjects.Sprite | null; id: string; name: Phaser.GameObjects.Text; lv: Phaser.GameObjects.Text } | null = null;
  private benchSprites: Phaser.GameObjects.Sprite[] = [];
  private leaderSprites: Phaser.GameObjects.Sprite[] = [];
  private leaderStep = 82;
  private slotTexts: {
    cd: Phaser.GameObjects.Text; name: Phaser.GameObjects.Text; key: Phaser.GameObjects.Text; up: Phaser.GameObjects.Text; icon: Phaser.GameObjects.Image; lock: Phaser.GameObjects.Text;
    /** năng lượng mỗi lần dùng (góc dưới trái ô) */
    cost: Phaser.GameObjects.Text; costIcon: Phaser.GameObjects.Image;
  }[] = [];
  private energyText!: Phaser.GameObjects.Text;
  private mechText!: Phaser.GameObjects.Text;
  private toast!: Phaser.GameObjects.Text;
  private banner!: Phaser.GameObjects.Text;
  private settingsLine!: Phaser.GameObjects.Text;
  private pauseLayer!: Phaser.GameObjects.Container;
  private paused = false;
  /** bảng Cài đặt mở từ menu tạm dừng */
  private settingsPanel: Phaser.GameObjects.Container | null = null;
  /** khởi động lại HUD sau khi đổi ngôn ngữ → mở lại bảng Cài đặt ở thẻ này */
  private reopenTab: SettingsTab | null = null;
  private overReady = false;
  private overShown = false;
  private stageEnd: StageEndInfo | null = null;
  private potionText: Phaser.GameObjects.Text | null = null;
  private ultIcon!: Phaser.GameObjects.Image;
  private ultLabel!: Phaser.GameObjects.Text;
  private ultPct!: Phaser.GameObjects.Text;
  /** trạng thái khóa tuyệt chiêu đang hiển thị (null = chưa vẽ) */
  private ultLockShown: boolean | null = null;
  private ultLabelShown = '';
  private comboText!: Phaser.GameObjects.Text;
  /** ô chiêu vừa bị từ chối vì thiếu năng lượng: chớp đỏ ô + thanh năng lượng (thời điểm theo this.time.now) */
  private deniedFlash: { slot: string; at: number } = { slot: '', at: -1e9 };
  private calloutText!: Phaser.GameObjects.Text;
  /** khối nội dung màn kết quả (chữ "LÊN CẤP!" bay lên được thêm vào đây) */
  private resultContent: Phaser.GameObjects.Container | null = null;
  /** tiến hóa: lấp lánh cạnh chân dung + dòng gợi ý dưới thanh năng lượng */
  private evoIcon!: Phaser.GameObjects.Image;
  private evoHint!: Phaser.GameObjects.Text;
  private evoHintIcon!: Phaser.GameObjects.Image;
  /** chữ "SẴN SÀNG!" trong ô tuyệt chiêu */
  private ultReady!: Phaser.GameObjects.Text;
  private ultReadyLang = '';
  /** Skill Lab: tuyệt chiêu vô hạn */
  private ultInf!: Phaser.GameObjects.Text;
  /** vùng HUD (khối bảng) – mờ đi khi người chơi đứng dưới; hình chữ nhật theo toạ độ màn hình */
  private regions: { key: RegionKey; rect: Phaser.Geom.Rectangle; c: Phaser.GameObjects.Container }[] = [];
  private rg = {} as Record<RegionKey, Phaser.GameObjects.Graphics>;
  /** các khối HUD che màn hình (mũi tên chỉ địch ngoài khung tránh các vùng này) – BattleScene.drawEdgeArrows */
  hudRects: Phaser.Geom.Rectangle[] = [];

  constructor() {
    super('Hud');
  }

  init(data?: { settingsTab?: SettingsTab }) {
    this.reopenTab = data?.settingsTab ?? null;
  }

  create() {
    this.battle = this.scene.get('Battle') as BattleScene;
    const reopen = this.reopenTab;
    this.paused = false;
    this.settingsPanel = null;
    this.overReady = false;
    this.overShown = false;
    this.stageEnd = null;
    this.portrait = null;
    this.portraitId = '';
    this.typeObjs = [];
    this.slotTexts = [];
    this.benchSprites = [];
    this.leaderSprites = [];
    this.infoTexts = [];
    this.bossObjs = null;
    const { width, height } = this.scale;
    const st = this.battle.getHudState();

    // gom đối tượng theo vùng để làm mờ cả khối (xem buildRegions)
    let snap = new Set(this.children.list);
    const take = () => {
      const out = this.children.list.filter((o) => !snap.has(o));
      snap = new Set(this.children.list);
      return out;
    };
    const groups: Partial<Record<RegionKey, Phaser.GameObjects.GameObject[]>> = {};
    const put = (k: RegionKey) => (groups[k] = [...(groups[k] ?? []), ...take()]);
    // ---- trên trái: thẻ Pokémon ra sân ----
    pixelPanel(this, 8, 6, 262, 66);
    this.add.circle(38, 38, 21, 0x0b0f1e).setStrokeStyle(2, 0xffd34a);
    this.nameText = text(this, 66, 14, '', 12, '#ffffff');
    // chữ trong thanh EXP dày: "Lv 26 · 340/520 EXP"
    this.lvText = text(this, 162, 60, '', 9, '#ffffff').setOrigin(0.5).setDepth(3);
    this.evoIcon = icon(this, 56, 20, 'sparkle', 1).setDepth(3).setVisible(false);
    this.evoHintIcon = icon(this, 22, 112, 'sparkle', 1).setDepth(3).setVisible(false);
    this.evoHint = text(this, 34, 112, '', 9, '#fff0a0').setOrigin(0, 0.5).setDepth(3);
    this.hpText = text(this, 258, 31, '', 10, '#ffffff').setOrigin(1, 0);
    this.shieldIcon = icon(this, 244, 50, 'shield', 1).setVisible(false);
    // năng lượng chung (ngay dưới thẻ Pokémon)
    pixelPanel(this, 8, 74, 262, 24);
    icon(this, 24, 86, 'bolt', 1).setDepth(3);
    this.energyText = text(this, 258, 86, '', 10, '#bfefff').setOrigin(1, 0.5).setDepth(3);
    this.mechText = text(this, 258, 95, '', 8, '#ffffff').setOrigin(1, 0.5).setDepth(3);
    put('tl');

    // ---- trên giữa: tên ải ----
    pixelPanel(this, width / 2 - 150, 6, 300, 50);
    // tên ải dài thì dùng cỡ chữ nhỏ hơn cho vừa khung
    this.titleText = text(this, width / 2, 14, st.title, 20, '#ffffff').setOrigin(0.5, 0);
    if (this.titleText.width > 276) {
      this.titleText.destroy();
      this.titleText = text(this, width / 2, 17, st.title, 12, '#ffffff').setOrigin(0.5, 0);
    }
    this.subText = text(this, width / 2, 37, '', 10, '#c8d0f0').setOrigin(0.5, 0);
    put('tc');

    // ---- trên phải: thông tin ải / thẻ đối thủ ----
    if (st.mode === 'gym') {
      pixelPanel(this, width - 270, 6, 262, 66);
      this.add.circle(width - 240, 38, 21, 0x0b0f1e).setStrokeStyle(2, 0xff8a6a);
      this.bossObjs = {
        portrait: null, id: '',
        name: text(this, width - 212, 14, '', 12, '#ffffff'),
        lv: text(this, width - 20, 15, '', 10, COLORS.gold).setOrigin(1, 0),
      };
      text(this, width - 212, 50, st.subtitle.toUpperCase(), 10, '#c8d0f0');
    } else if (st.mode !== 'lab') {
      pixelPanel(this, width - 196, 6, 188, 50);
      icon(this, width - 178, 22, st.mode === 'survival' ? 'skull' : 'pokeball', 1.25);
      icon(this, width - 178, 41, 'clock', 1.25);
      icon(this, width - 96, 22, 'sword', 1.25);
      this.infoTexts = [
        text(this, width - 166, 22, '', 10, '#ffffff').setOrigin(0, 0.5),
        text(this, width - 166, 41, '', 10, '#ffffff').setOrigin(0, 0.5),
        text(this, width - 84, 22, '', 10, '#ffffff').setOrigin(0, 0.5),
        text(this, width - 98, 41, '', 10, COLORS.gold).setOrigin(0, 0.5),
      ];
    }
    put('tr');

    // ---- dưới trái: đội dự bị ----
    const lab = st.mode === 'lab';
    const benchW = 18 + st.bench.length * TEAM_STEP;
    if (!lab) pixelPanel(this, 8, height - 76, benchW, 68);
    if (!lab) st.bench.forEach((b, i) => {
      const cx = 8 + 9 + TEAM_STEP / 2 + i * TEAM_STEP;
      text(this, cx - 22, height - 66, String(i + 1), 10, COLORS.gold).setDepth(3);
      this.benchSprites.push(pokemonIcon(this, b.id, cx, height - 46, 22, false));
    });

    // ---- thuốc hồi máu (phím F) ----
    this.potionText = null;
    if (st.mode !== 'survival' && !lab) {
      pixelPanel(this, 8, height - 108, 128, 30);
      icon(this, 24, height - 93, 'potion', 1.25);
      this.potionText = text(this, 36, height - 93, '', 10, '#ffffff').setOrigin(0, 0.5);
    }
    put('bl');

    // ---- đội của thủ lĩnh (hội quán) ----
    if (st.mode === 'gym') {
      // đội đông (Tứ Thiên Vương, Shigeru: 5–6 con) thì thu nhỏ ô để không đè thanh chiêu
      const n = st.leaderTeam.length;
      const barRight = width / 2 + ((st.skills.length + 1) * SLOT + st.skills.length * SLOT_GAP) / 2 + 14;
      this.leaderStep = Math.min(TEAM_STEP, Math.floor((width - 8 - barRight - 18) / Math.max(1, n)));
      const panelW = 18 + n * this.leaderStep;
      pixelPanel(this, width - 8 - panelW, height - 76, panelW, 68);
      st.leaderTeam.forEach((t, i) => {
        const cx = width - 8 - panelW + 9 + this.leaderStep / 2 + i * this.leaderStep;
        this.leaderSprites.push(pokemonIcon(this, t.id, cx, height - 46, Math.min(24, this.leaderStep - 26), false));
      });
    }
    put('br');

    // ---- dưới giữa: thanh chiêu (+ ô tuyệt chiêu I) ----
    const n = st.skills.length;
    const barW = (n + 1) * SLOT + n * SLOT_GAP;
    const bx = width / 2 - barW / 2;
    const by = height - BAR_Y_OFF;
    pixelPanel(this, bx - 10, by - 10, barW + 20, SLOT + 30);
    st.skills.forEach((s, i) => {
      const x = bx + i * (SLOT + SLOT_GAP);
      this.slotTexts.push({
        icon: icon(this, x + SLOT / 2, by + SLOT / 2 + 2, s.icon, 2),
        key: text(this, x + 4, by + 2, s.key, 10, COLORS.gold),
        // cấp nâng cấp chiêu: huy hiệu nhỏ góc phải trên của ô (không nối vào tên để khỏi tràn khung)
        up: text(this, x + SLOT - 3, by + 2, '', 10, '#9fe08a').setOrigin(1, 0),
        name: text(this, x + SLOT / 2, by + SLOT + 3, '', 9, '#ffffff').setOrigin(0.5, 0),
        cd: text(this, x + SLOT / 2, by + SLOT / 2, '', 20, '#ffffff').setOrigin(0.5).setDepth(5),
        lock: text(this, x + SLOT / 2, by + SLOT - 12, '', 10, '#ffd0a0').setOrigin(0.5).setDepth(5),
        cost: text(this, x + 4, by + SLOT - 3, '', 9, '#bfefff').setOrigin(0, 1).setDepth(5),
        costIcon: icon(this, 0, by + SLOT - 9, 'bolt', 0.6).setDepth(5),
      });
    });
    // ô tuyệt chiêu
    const ux = bx + n * (SLOT + SLOT_GAP);
    this.ultIcon = icon(this, ux + SLOT / 2, by + SLOT / 2 + 2, 'crown', 2).setDepth(2);
    this.ultLockShown = null;
    this.ultLabelShown = '';
    text(this, ux + 4, by + 2, 'I', 10, COLORS.gold).setDepth(3);
    this.ultLabel = text(this, ux + SLOT / 2, by + SLOT + 3, '', 9, '#ffd34a').setOrigin(0.5, 0);
    this.setFitted(this.ultLabel, t('hud.ult'), SLOT + SLOT_GAP - 4);
    this.ultPct = text(this, ux + SLOT / 2, by + SLOT / 2, '', 12, '#ffffff').setOrigin(0.5).setDepth(5);
    this.ultInf = text(this, ux + SLOT / 2, by + SLOT - 11, '∞', 20, '#fff0a0', { stroke: '#2a1430', strokeThickness: 3 }).setOrigin(0.5).setDepth(6).setVisible(false);
    this.ultReady = text(this, ux + SLOT / 2, by + SLOT - 9, '', 11, '#fff0a0', { stroke: '#2a1430', strokeThickness: 3 }).setOrigin(0.5).setDepth(6);
    this.ultReadyLang = '';
    this.add.rectangle(ux + SLOT / 2, by + SLOT / 2, SLOT, SLOT, 0xffffff, 0.001).setInteractive({ useHandCursor: true }).on('pointerdown', () => this.battle.castUltimate());
    put('bar');
    // chữ liên hoàn + tên chiêu lớn (L/U)
    this.comboText = text(this, width / 2, 62, '', 12, COLORS.gold).setOrigin(0.5, 0).setAlpha(0).setDepth(40);
    this.calloutText = outlinedText(this, width / 2, 130, '', 24, '#ffffff', '#1a1020', 2).main.setDepth(40).setAlpha(0);
    this.g = this.add.graphics().setDepth(1);
    take();
    // vùng (toạ độ màn hình): dùng cho làm mờ khi người chơi đứng dưới + vùng cấm mũi tên chỉ địch
    const R = (x: number, y: number, w: number, h: number) => new Phaser.Geom.Rectangle(x, y, w, h);
    const trRect = st.mode === 'gym' ? R(width - 270, 6, 262, 66) : st.mode !== 'lab' ? R(width - 196, 6, 188, 50) : null;
    const blW = lab ? 0 : Math.max(benchW, st.mode !== 'survival' ? 128 : 0);
    const leaderW = st.mode === 'gym' ? 18 + st.leaderTeam.length * this.leaderStep : 0;
    const rects: Record<RegionKey, Phaser.Geom.Rectangle | null> = {
      tl: R(8, 6, 262, 117),
      tc: R(width / 2 - 150, 6, 300, 50),
      tr: trRect,
      bl: blW ? R(8, st.mode !== 'survival' ? height - 108 : height - 76, blW, st.mode !== 'survival' ? 100 : 68) : null,
      br: leaderW ? R(width - 8 - leaderW, height - 76, leaderW, 68) : null,
      bar: R(bx - 10, by - 10, barW + 20, SLOT + 30),
    };
    // độ sâu của icon/chữ trong ô chiêu phải đặt TRƯỚC khi gom vào khối (toRegion sắp theo depth), nếu không lớp nền vẽ đè lên icon
    for (const s of this.slotTexts) {
      s.icon.setDepth(2);
      s.key.setDepth(3);
      s.up.setDepth(3);
      s.cd.setDepth(4);
      s.lock.setDepth(4);
    }
    this.buildRegions(groups, rects);
    this.hudRects = [R(8, 6, 262, 92), rects.tc!, ...(trRect ? [trRect] : []), rects.bar!, ...(rects.br ? [rects.br] : [])];
    if (!lab) this.hudRects.push(R(8, height - 76, benchW, 68));
    if (this.potionText) this.hudRects.push(R(8, height - 108, 128, 30));

    this.toast = text(this, width / 2, 84, '', 20, COLORS.gold, { align: 'center', wordWrap: { width: width - 240 } }).setOrigin(0.5).setAlpha(0).setDepth(50);
    this.banner = outlinedText(this, width / 2, height / 2 - 130, '', 36, '#ffb070', '#2a1430', 3).main.setDepth(50);
    // hội quán có bảng đội thủ lĩnh ở góc dưới phải → đẩy dòng hướng dẫn lên trên bảng
    // hướng dẫn phím: chỉ hiện vài giây đầu trận (xem lại trong menu tạm dừng – Esc)
    const hintY = height - 118;
    this.settingsLine = text(this, width - 12, hintY, '', 10, '#ffffff').setOrigin(1, 0).setAlpha(0.85);
    const hints = st.mode === 'survival' ? t('hud.hintsSurvival') : t('hud.hints') + (st.mode === 'stage' ? t('hud.hintsStage') : '');
    const hintText = text(this, width - 12, hintY + 16, hints, 10, '#ffffff').setOrigin(1, 0).setAlpha(0.85);
    this.tweens.add({ targets: [this.settingsLine, hintText], alpha: 0, delay: reopen || lab ? 0 : 6000, duration: reopen || lab ? 0 : 800 });
    this.refreshSettings();
    this.buildPauseLayer();

    // ---- sự kiện ----
    const ev = this.battle.events;
    const handlers: [string, (...a: never[]) => void][] = [
      ['levelup', this.onLevelUp], ['wave', this.onWave], ['boss-spawn', this.onBoss], ['banner', this.onBanner],
      ['swap', this.onSwap], ['fainted', this.onFainted], ['toast', this.showToast], ['caught', this.onCaught],
      ['gameover', this.onGameOver], ['stage-end', this.onStageEnd],
      ['combo', this.onCombo], ['callout', this.onCallout], ['ultimate', this.onUltimate], ['energy-denied', this.onEnergyDenied],
      ['evo-ready', this.onEvoReady],
    ];
    for (const [name, fn] of handlers) ev.on(name, fn, this);
    if (st.mode === 'stage' && !reopen) this.showBanner(st.subtitle || t('hud.start'));

    const kb = this.input.keyboard!;
    let lastStamp = -1;
    const once = (fn: () => void) => (e: KeyboardEvent) => {
      if (e.timeStamp === lastStamp) return;
      lastStamp = e.timeStamp;
      fn();
    };
    kb.on('keydown-ESC', once(() => this.onEsc()));
    kb.on('keydown-ENTER', once(() => this.onEnter()));
    kb.on('keydown-M', once(() => { toggleSetting('muted'); this.refreshSettings(); playSfx('select'); }));
    kb.on('keydown-N', once(() => { toggleSetting('reducedShake'); this.refreshSettings(); playSfx('select'); }));
    kb.on('keydown-T', once(() => {
      const mode = cycleAimMode();
      this.refreshSettings();
      this.showToast(t('hud.aimToast', { mode: t(`settings.aim.${mode}`) }));
      playSfx('select');
    }));
    kb.enableGlobalCapture();
    // vừa đổi ngôn ngữ trong bảng Cài đặt lúc tạm dừng: trận vẫn đang dừng → mở lại bảng
    if (reopen) {
      this.paused = true;
      this.openSettings(reopen);
    }
    this.game.events.on(Phaser.Core.Events.BLUR, this.onBlur, this);
    this.game.events.on(Phaser.Core.Events.HIDDEN, this.onBlur, this);
    this.game.events.on(Phaser.Core.Events.FOCUS, this.onFocus, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      for (const [name, fn] of handlers) ev.off(name, fn, this);
      this.game.events.off(Phaser.Core.Events.BLUR, this.onBlur, this);
      this.game.events.off(Phaser.Core.Events.HIDDEN, this.onBlur, this);
      this.game.events.off(Phaser.Core.Events.FOCUS, this.onFocus, this);
      this.input.keyboard?.removeAllListeners();
    });
  }

  // ======================================================================= vẽ mỗi khung

  update() {
    if (!this.battle || !this.battle.fighters.length) return;
    const s = this.battle.getHudState();
    const { width, height } = this.scale;
    this.g.clear();
    for (const k in this.rg) this.rg[k as RegionKey].clear();
    this.updateRegionFade();
    let g = this.rg.tl;

    // thẻ Pokémon ra sân
    const a = s.active;
    if (a.id !== this.portraitId) {
      this.portrait?.destroy();
      this.portrait = pokemonIcon(this, a.id, 38, 38, 26).setDepth(2);
      this.toRegion('tl', this.portrait);
      this.portraitId = a.id;
      for (const o of this.typeObjs) o.destroy();
      this.typeObjs = [];
      let tx = 66;
      for (const t of a.types) tx += this.typeTag(tx, 36, t);
      this.toRegion('tl', ...this.typeObjs);
    }
    this.nameText.setText(a.name);
    this.lvText.setText(a.evo.atCap ? t('evo.xpCap', { lv: a.level }) : t('evo.xp', { lv: a.level, xp: Math.floor(a.xp), max: a.xpToNext }));
    this.hpText.setText(`${Math.ceil(a.hp)}/${a.maxHp}`);
    this.shieldIcon.setVisible(a.guard);
    this.bar(g, 66, 46, 192, 6, a.hp / a.maxHp, a.hp / a.maxHp < 0.3 ? 0xff4040 : 0x60d060);
    this.bar(g, 66, 55, 192, 10, a.evo.atCap ? 1 : a.xp / a.xpToNext, a.evo.atCap ? 0x6a7aa8 : 0x3ec8f0);
    this.drawEvoHint(g, s);
    // thanh năng lượng: vạch chia mỗi 10, chớp đỏ khi vừa thiếu năng lượng
    const en = s.energy;
    const flash = Phaser.Math.Clamp(1 - (this.time.now - this.deniedFlash.at) / 450, 0, 1);
    this.bar(g, 36, 82, 160, 8, en.value / en.max, flash > 0 && Math.floor(this.time.now / 90) % 2 ? 0xff6050 : 0x60d8ff);
    g.fillStyle(0x0b0f1e, 0.8);
    for (let k = 10; k < en.max; k += 10) g.fillRect(Math.round(36 + (160 * k) / en.max), 82, 1, 8);
    const mc = s.mech;
    this.mechText.setText(mc ? mc.label : '').setColor(mc?.active ? '#ffe9a0' : '#c8d0e8');
    if (mc) {
      this.bar(g, 36, 91, 160, 5, Phaser.Math.Clamp(mc.value, 0, 1), mc.active && Math.floor(this.time.now / 120) % 2 ? 0xffffff : mc.color);
      g.fillStyle(0x0b0f1e, 0.8);
      for (let k = 1; k < mc.ticks; k++) g.fillRect(Math.round(36 + (160 * k) / mc.ticks), 91, 1, 5);
    }
    this.energyText.setText(`${Math.floor(en.value)}/${en.max}`).setColor(flash > 0 ? '#ff9a8a' : '#bfefff');

    g = this.rg.tr;
    this.potionText?.setText(s.potionLeft > 0 ? `F · ×${s.potions} (${(s.potionLeft / 1000).toFixed(1)}s)` : t('hud.potion', { n: s.potions })).setColor(s.potions > 0 ? '#ffffff' : '#7a84a8');

    // tiêu đề
    if (s.mode === 'survival') {
      this.titleText.setText(formatTime(s.timeMs));
      this.subText.setText(s.boss ? s.waveName : t('hud.bossIn', { wave: s.waveName, t: formatTime(s.bossInMs) }));
    } else {
      this.subText.setText(s.mode === 'gym' ? `${s.subtitle} · ${formatTime(s.timeMs)}` : s.waveName);
    }
    if (this.infoTexts.length) {
      const [balls, time, left, star] = this.infoTexts;
      if (s.mode === 'survival') {
        balls.setText(t('hud.kills', { n: s.kills }));
        time.setText(formatTime(s.timeMs));
        left.setText(`${s.enemiesLeft}`);
        star.setText('');
      } else {
        balls.setText(`× ${s.balls}`);
        time.setText(formatTime(s.timeMs));
        left.setText(t('hud.left', { n: s.enemiesLeft }));
        const fast = s.timeMs <= s.parTimeS * 1000;
        // parTimeS = 0 (Thử thách chiêu): không có sao
        if (!s.parTimeS) star.setText('');
        else star.setText(fast ? t('hud.star3', { s: s.parTimeS }) : t('hud.star3Missed')).setColor(fast ? COLORS.gold : '#9aa0b8');
      }
    }
    // thẻ đối thủ
    if (this.bossObjs) {
      const b = s.boss;
      if (b && b.id !== this.bossObjs.id) {
        this.bossObjs.portrait?.destroy();
        this.bossObjs.portrait = pokemonIcon(this, b.id, width - 240, 38, 26).setDepth(2);
        this.toRegion('tr', this.bossObjs.portrait);
        this.bossObjs.id = b.id;
      }
      this.bossObjs.name.setText(b?.name ?? '...');
      this.bossObjs.lv.setText(b ? `Lv ${b.level}` : '');
      if (b) this.bar(g, width - 212, 34, 192, 9, b.hp / b.maxHp, 0xff6a50);
      g = this.rg.br;
      s.leaderTeam.forEach((t, i) => {
        const spr = this.leaderSprites[i];
        spr?.setTint(t.dead ? 0x444444 : 0xffffff);
        const cx = spr?.x ?? 0;
        const half = (this.leaderStep - 8) / 2;
        g.lineStyle(2, t.active ? 0xffd34a : 0x5a6488, 1).strokeRect(cx - half, height - 68, half * 2, 52);
        if (t.dead) g.lineStyle(3, 0xff6a5a, 1).lineBetween(cx - 10, height - 56, cx + 10, height - 34).lineBetween(cx + 10, height - 56, cx - 10, height - 34);
        // máu của từng con (con đang nghỉ hồi máu thì thanh xanh nhấp nháy)
        if (!t.dead) this.bar(g, cx - half + 4, height - 24, half * 2 - 8, 4, t.hp, t.resting ? (Math.floor(this.time.now / 250) % 2 ? 0x9affb0 : 0x40e070) : t.hp < 0.3 ? 0xff4040 : 0xff6a50);
      });
    }
    // đội dự bị
    g = this.rg.bl;
    if (s.mode !== 'lab') s.bench.forEach((b, i) => {
      const cx = 8 + 9 + TEAM_STEP / 2 + i * TEAM_STEP;
      const spr = this.benchSprites[i];
      if (spr && spr.texture.key.split('-')[0] !== b.id) {
        spr.destroy();
        this.benchSprites[i] = pokemonIcon(this, b.id, cx, height - 46, 22, false);
        this.toRegion('bl', this.benchSprites[i]);
      }
      this.benchSprites[i].setTint(b.dead ? 0x444444 : 0xffffff);
      g.lineStyle(2, b.active ? 0xffd34a : b.healing ? 0x60ff90 : 0x5a6488, 1).strokeRect(cx - 24, height - 68, 48, 52);
      // đang nghỉ hồi máu: thanh xanh nhấp nháy + dấu + bay lên
      const heal = b.healing;
      this.bar(g, cx - 20, height - 24, 40, 4, b.hp / b.maxHp, heal ? (Math.floor(this.time.now / 250) % 2 ? 0x9affb0 : 0x40e070) : b.hp / b.maxHp < 0.3 ? 0xff4040 : 0x60d060);
      if (heal) {
        g.lineStyle(2, 0x60ff90, 0.5 + 0.5 * Math.sin(this.time.now / 160)).strokeRect(cx - 24, height - 68, 48, 52);
        // hai dấu + xanh bay lên từ ô đang hồi máu
        for (const [ox, ph] of [[-8, 0], [8, 0.5]] as const) {
          const kk = ((this.time.now / 1100 + ph) % 1);
          const yy = height - 42 - kk * 26;
          g.fillStyle(0x7aff9a, 1 - kk).fillRect(cx + ox - 2, yy - 6, 4, 12).fillRect(cx + ox - 6, yy - 2, 12, 4);
        }
      }
      if (!b.active && !b.dead && s.switchLeft > 0) {
        g.fillStyle(0x000000, 0.5).fillRect(cx - 24, height - 68, 48, 52 * (s.switchLeft / 3000));
      }
      if (b.dead) g.lineStyle(3, 0xff6a5a, 1).lineBetween(cx - 10, height - 58, cx + 10, height - 36).lineBetween(cx + 10, height - 58, cx - 10, height - 36);
    });

    // thanh chiêu (+ ô tuyệt chiêu)
    g = this.rg.bar;
    const n = s.skills.length;
    const barW = (n + 1) * SLOT + n * SLOT_GAP;
    const bx = width / 2 - barW / 2;
    const by = height - BAR_Y_OFF;
    s.skills.forEach((c, i) => {
      const x = bx + i * (SLOT + SLOT_GAP);
      const st = this.slotTexts[i];
      if (!st) return;
      const ready = c.left <= 0 && !c.locked;
      g.fillStyle(0x0b0f1e, 1).fillRect(x, by, SLOT, SLOT);
      g.fillStyle(c.color, c.locked ? 0.1 : 0.35).fillRect(x + 3, by + 3, SLOT - 6, SLOT - 6);
      if (!c.locked && c.left > 0) {
        const r = Phaser.Math.Clamp(c.left / c.total, 0, 1);
        g.fillStyle(0x000000, 0.6).fillRect(x, by + SLOT * (1 - r), SLOT, SLOT * r);
      }
      // thiếu năng lượng: ô tối đi, giá đỏ; vừa bấm mà thiếu → chớp đỏ
      const poor = !c.locked && !c.affordable;
      if (poor) g.fillStyle(0x0b0f1e, 0.55).fillRect(x, by, SLOT, SLOT);
      const flash = c.key === this.deniedFlash.slot ? Phaser.Math.Clamp(1 - (this.time.now - this.deniedFlash.at) / 450, 0, 1) : 0;
      if (flash > 0) g.fillStyle(0xff3020, 0.4 * flash).fillRect(x, by, SLOT, SLOT);
      g.lineStyle(2, ready && !poor ? 0xffd34a : 0x5a6488, 1).strokeRect(x, by, SLOT, SLOT);
      st.icon.setTexture('icons', c.locked ? 'lock' : c.icon).setAlpha(c.locked ? 0.6 : poor ? 0.45 : 1);
      this.setFitted(st.name, c.locked ? c.lockLabel ?? '???' : c.name, SLOT + SLOT_GAP - 4);
      st.name.setColor(c.locked ? '#ffd0a0' : '#ffffff');
      st.up.setText(!c.locked && c.upgrade > 0 ? `+${c.upgrade}` : '');
      st.cd.setText(!c.locked && c.left > 0 ? (c.left / 1000).toFixed(1) : '');
      // khóa: yêu cầu ngắn (cấp / tiến độ nhiệm vụ) – ui/unlockText.ts
      st.lock.setText(c.locked ? c.lockTop ?? `Lv ${c.unlockLevel}` : '');
      const showCost = !c.locked && c.cost > 0;
      st.cost.setText(showCost ? `${c.cost}` : '').setColor(poor ? '#ff8a7a' : '#bfefff');
      st.costIcon.setVisible(showCost).setX(x + 4 + st.cost.width + 4).setAlpha(poor ? 0.6 : 1);
    });
    // ô tuyệt chiêu: năng lượng dâng từ dưới lên, đầy thì nhấp nháy viền vàng
    const ux = bx + n * (SLOT + SLOT_GAP);
    // dạng gốc chưa tiến hóa: ô khóa (biểu tượng ổ khóa, mờ, nhãn "Tiến hóa")
    const locked = !!s.ult.locked;
    const ultLabel = locked ? s.ult.lockLabel ?? t('hud.ultLocked') : t('hud.ult');
    if (locked !== this.ultLockShown || ultLabel !== this.ultLabelShown) {
      this.ultLockShown = locked;
      this.ultLabelShown = ultLabel;
      this.ultIcon.setTexture('icons', locked ? 'lock' : 'crown');
      this.setFitted(this.ultLabel, ultLabel, SLOT + SLOT_GAP - 4);
    }
    if (locked) {
      g.fillStyle(0x0b0f1e, 1).fillRect(ux, by, SLOT, SLOT);
      g.lineStyle(2, 0x3a4060, 1).strokeRect(ux, by, SLOT, SLOT);
      this.ultIcon.setAlpha(0.5).setScale(2).setY(by + SLOT / 2 + 2);
      this.ultInf.setVisible(false);
      this.ultPct.setText(s.ult.lockTop ?? '').setY(by + SLOT - 12);
      this.ultLabel.setColor('#8a8aa0');
      this.ultReady.setText('');
      return;
    }
    this.ultPct.setY(by + SLOT / 2);
    const lab = s.mode === 'lab';
    const charge = lab ? 1 : Phaser.Math.Clamp(s.ult.charge, 0, 1);
    if (!lab && charge > 0) this.maybeUltHint(ux + SLOT / 2, by - 34);
    // khóa sau lần tung trước (ULT_PACING.cooldownMs, chung cả đội): phủ tối quét như kim đồng hồ + số giây
    const cdMs = s.ult.cdLeftMs ?? 0;
    g.fillStyle(0x0b0f1e, 1).fillRect(ux, by, SLOT, SLOT);
    if (cdMs > 0) {
      g.fillStyle(0xffd34a, 0.16).fillRect(ux + 3, by + 3 + (SLOT - 6) * (1 - charge), SLOT - 6, (SLOT - 6) * charge);
      g.lineStyle(2, 0x5a6488, 1).strokeRect(ux, by, SLOT, SLOT);
      this.perimeter(g, ux, by, charge, 0x8a7a40);
      g.fillStyle(0x000000, 0.7);
      this.sweep(g, ux, by, Phaser.Math.Clamp(cdMs / ULT_PACING.cooldownMs, 0, 1));
      this.ultIcon.setAlpha(0.3).setScale(2).setY(by + SLOT / 2 + 2);
      this.ultPct.setText(`${Math.ceil(cdMs / 1000)}s`);
      this.ultLabel.setColor('#8a8aa0');
      this.ultReady.setText('');
      return;
    }
    const ready = charge >= 1;
    const pulse = Math.sin(this.time.now / 120);
    g.fillStyle(0xffd34a, ready ? 0.5 + pulse * 0.2 : 0.3).fillRect(ux + 3, by + 3 + (SLOT - 6) * (1 - charge), SLOT - 6, (SLOT - 6) * charge);
    if (ready) {
      // hào quang vàng nhấp nháy quanh ô
      for (let k = 3; k >= 1; k--) g.lineStyle(2, 0xffd34a, (0.18 + pulse * 0.08) * (4 - k) / 3).strokeRect(ux - k * 2 - 1, by - k * 2 - 1, SLOT + k * 4 + 2, SLOT + k * 4 + 2);
      g.lineStyle(3, 0xfff0a0, 1).strokeRect(ux, by, SLOT, SLOT);
    } else {
      g.lineStyle(2, 0x3a4060, 1).strokeRect(ux, by, SLOT, SLOT);
      // viền vàng chạy theo chiều kim đồng hồ từ giữa cạnh trên = % tích
      this.perimeter(g, ux, by, charge, 0xffd34a);
    }
    this.ultIcon.setAlpha(ready ? 1 : 0.55).setScale(ready ? 2 + Math.sin(this.time.now / 140) * 0.15 : 2).setY(by + SLOT / 2 + (ready ? -4 : 2));
    this.ultPct.setText(ready ? '' : `${Math.floor(charge * 100)}%`);
    this.ultInf.setVisible(lab);
    this.ultLabel.setColor(ready ? '#fff0a0' : '#c8b060');
    if (ready && !lab) {
      if (this.ultReadyLang !== lang()) {
        this.ultReadyLang = lang();
        this.ultReady.setText(t('hud.ultReady'));
        if (this.ultReady.width > SLOT - 2) this.ultReady.setText(t('hud.ultReadyShort'));
      }
      this.ultReady.setVisible(true).setY(by + SLOT - 9).setAlpha(0.8 + pulse * 0.2);
    } else this.ultReady.setVisible(false);
  }

  /** viền ô (cạnh SLOT) tô theo chiều kim đồng hồ, bắt đầu từ giữa cạnh trên, tới tỉ lệ frac */
  private perimeter(g: Phaser.GameObjects.Graphics, x: number, y: number, frac: number, color: number) {
    if (frac <= 0) return;
    const S = SLOT;
    const corners = [[x + S, y], [x + S, y + S], [x, y + S], [x, y], [x + S / 2, y]];
    let left = frac * 4 * S;
    const pts: Phaser.Math.Vector2[] = [new Phaser.Math.Vector2(x + S / 2, y)];
    let cur = { x: x + S / 2, y };
    for (const [cx, cy] of corners) {
      const d = Math.abs(cx - cur.x) + Math.abs(cy - cur.y);
      if (left >= d) {
        pts.push(new Phaser.Math.Vector2(cx, cy));
        left -= d;
        cur = { x: cx, y: cy };
      } else {
        const r = left / d;
        pts.push(new Phaser.Math.Vector2(cur.x + (cx - cur.x) * r, cur.y + (cy - cur.y) * r));
        break;
      }
    }
    g.lineStyle(3, color, 1).strokePoints(pts, false, false);
  }

  /** phủ hình quạt (kim đồng hồ từ 12 giờ) cắt theo ô vuông: frac = phần còn lại */
  private sweep(g: Phaser.GameObjects.Graphics, x: number, y: number, frac: number) {
    if (frac <= 0) return;
    const h = SLOT / 2;
    const cx = x + h;
    const cy = y + h;
    // phần còn tối = từ góc (1 - frac) tới hết vòng → vùng tối co lại theo chiều kim đồng hồ
    const a0 = -Math.PI / 2 + (1 - frac) * Math.PI * 2;
    const a1 = -Math.PI / 2 + Math.PI * 2;
    const pts: Phaser.Math.Vector2[] = [new Phaser.Math.Vector2(cx, cy)];
    const steps = Math.max(2, Math.ceil(frac * 96));
    for (let i = 0; i <= steps; i++) {
      const a = a0 + ((a1 - a0) * i) / steps;
      const dx = Math.cos(a);
      const dy = Math.sin(a);
      const k = h / Math.max(Math.abs(dx), Math.abs(dy));
      pts.push(new Phaser.Math.Vector2(cx + dx * k, cy + dy * k));
    }
    g.fillPoints(pts, true);
    // kim đồng hồ: mép quét sáng
    const e = pts[1];
    g.lineStyle(2, 0xfff0a0, 0.9).lineBetween(cx, cy, e.x, e.y);
  }

  /** lần đầu (mỗi bản lưu) có tuyệt chiêu dùng được và thanh bắt đầu tích → gợi ý cách tích */
  private maybeUltHint(x: number, y: number) {
    const game = getGame();
    if (!game || game.flags.ultChargeHint) return;
    game.flags.ultChargeHint = true;
    saveGame();
    const { width } = this.scale;
    const msg = text(this, 0, 0, t('hud.ultHint'), 10, '#fff0a0').setOrigin(0.5);
    const w = msg.width + 20;
    const px = Phaser.Math.Clamp(x, w / 2 + 8, width - w / 2 - 8);
    const bg = this.add.graphics();
    bg.fillStyle(0x0b0f1e, 0.92).fillRoundedRect(-w / 2, -12, w, 24, 6);
    bg.lineStyle(2, 0xffd34a, 1).strokeRoundedRect(-w / 2, -12, w, 24, 6);
    bg.fillStyle(0xffd34a, 1).fillTriangle(x - px - 6, 12, x - px + 6, 12, x - px, 19);
    const c = this.add.container(px, y - 12, [bg, msg]).setDepth(45).setAlpha(0);
    this.tweens.add({ targets: c, alpha: 1, y: y - 16, duration: 250 });
    this.tweens.add({ targets: c, alpha: 0, delay: 7000, duration: 600, onComplete: () => c.destroy() });
  }

  /** chuyển các đối tượng vào khối vùng: giữ thứ tự theo depth (container bỏ qua depth của con) */
  private toRegion(key: RegionKey, ...objs: Phaser.GameObjects.GameObject[]) {
    const r = this.regions.find((q) => q.key === key);
    if (!r) return;
    for (const o of objs) {
      const d = (o as unknown as { depth: number }).depth ?? 0;
      const list = r.c.list as unknown as { depth: number }[];
      let i = list.length;
      while (i > 0 && (list[i - 1].depth ?? 0) > d) i--;
      r.c.addAt(o, i);
    }
  }

  private buildRegions(groups: Partial<Record<RegionKey, Phaser.GameObjects.GameObject[]>>, rects: Record<RegionKey, Phaser.Geom.Rectangle | null>) {
    this.regions = [];
    for (const key of ['tl', 'tc', 'tr', 'bl', 'br', 'bar'] as RegionKey[]) {
      const c = this.add.container(0, 0).setDepth(key === 'bar' ? 2 : 1);
      this.regions.push({ key, rect: rects[key] ?? new Phaser.Geom.Rectangle(-9, -9, 0, 0), c });
      this.rg[key] = this.add.graphics().setDepth(1);
      this.toRegion(key, ...(groups[key] ?? []), this.rg[key]);
    }
  }

  /** người chơi (hoặc sprite) nằm dưới khối HUD → khối đó mờ dần còn ~35% */
  private updateRegionFade() {
    const p = this.battle.player;
    const cam = this.battle.cameras.main;
    let box: Phaser.Geom.Rectangle | null = null;
    if (p && !p.dead && !this.paused) {
      const z = cam.zoom;
      const ox = (cam.width - cam.width / z) / 2;
      const oy = (cam.height - cam.height / z) / 2;
      const sx = (p.x - cam.scrollX - ox) * z + cam.x;
      const sy = (p.y - cam.scrollY - oy) * z + cam.y;
      box = new Phaser.Geom.Rectangle(sx - 16 * z, sy - 34 * z, 32 * z, 44 * z);
    }
    const k = Math.min(1, this.game.loop.delta / 160);
    for (const r of this.regions) {
      const target = box && Phaser.Geom.Intersects.RectangleToRectangle(box, r.rect) ? FADE_ALPHA : 1;
      r.c.alpha += (target - r.c.alpha) * k;
    }
  }

  private bar(g: Phaser.GameObjects.Graphics, x: number, y: number, w: number, h: number, ratio: number, color: number) {
    const r = Phaser.Math.Clamp(ratio, 0, 1);
    g.fillStyle(0x0b0f1e, 1).fillRect(x - 1, y - 1, w + 2, h + 2);
    g.fillStyle(0x2a2a3a, 1).fillRect(x, y, w, h);
    g.fillStyle(color, 1).fillRect(x, y, Math.round(w * r), h);
    g.fillStyle(0xffffff, 0.25).fillRect(x, y, Math.round(w * r), Math.max(1, Math.floor(h / 4)));
  }

  /** đặt chữ, rút gọn bằng "…" nếu rộng quá maxW (chỉ tính lại khi nội dung đổi) */
  private setFitted(t: Phaser.GameObjects.Text, value: string, maxW: number) {
    if (t.getData('full') === value) return;
    t.setData('full', value);
    t.setText(value);
    let v = value;
    // nhiều từ thì viết tắt các từ đầu trước ("Thunder Shock" → "T.Shock")
    const words = value.split(' ');
    if (t.width > maxW && words.length > 1) {
      v = words.slice(0, -1).map((w) => w[0] + '.').join('') + words[words.length - 1];
      t.setText(v);
    }
    while (t.width > maxW && v.length > 2) {
      v = v.slice(0, -1);
      t.setText(v.trimEnd() + '…');
    }
  }

  /** gợi ý tiến hóa: còn ≤ 2 cấp / đủ cấp / vướng giới hạn cấp / có đá */
  private drawEvoHint(g: Phaser.GameObjects.Graphics, s: ReturnType<BattleScene['getHudState']>) {
    const e = s.active.evo;
    let hint = '';
    let capped = false;
    if (s.mode !== 'lab') {
      if (e.state === 'ready') hint = t('evo.hud.ready', { name: e.into });
      else if (e.state === 'soon') hint = t('evo.hud.soon', { n: e.levelsLeft, name: e.into });
      else if (e.state === 'item-ready') hint = t('evo.hud.item', { item: e.item ?? '' });
      else if (e.state === 'capped' && (e.levelsLeft <= 2 || e.atCap)) {
        hint = t('evo.hud.capped', { cap: e.cap });
        capped = true;
      }
    }
    const pulse = 1 + Math.sin(this.time.now / 180) * 0.2;
    this.evoIcon.setVisible(!!hint && !capped).setScale(pulse).setAlpha(0.75 + (pulse - 1));
    this.evoHint.setText(hint).setColor(capped ? '#ffc0a0' : '#fff0a0');
    this.evoHintIcon.setVisible(!!hint).setFrame(capped ? 'lock' : 'sparkle');
    if (!hint) return;
    const w = 34 + this.evoHint.width + 10;
    g.fillStyle(0x0b0f1e, 0.85).fillRoundedRect(8, 101, w, 22, 6);
    g.lineStyle(2, capped ? 0xa06a5a : 0xffd34a, e.state === 'ready' ? 0.6 + Math.sin(this.time.now / 140) * 0.4 : 1).strokeRoundedRect(8, 101, w, 22, 6);
  }

  private onEvoReady(name: string) {
    this.showBanner(t('evo.banner', { name }), '#fff0a0', 2600);
  }

  private onEnergyDenied(slot: string) {
    this.deniedFlash = { slot, at: this.time.now };
  }

  private onCombo(n: number, bonus: number) {
    this.comboText.setText(t('hud.combo', { n, b: bonus })).setAlpha(1).setScale(1.15);
    this.tweens.killTweensOf(this.comboText);
    this.tweens.add({ targets: this.comboText, scale: 1, duration: 120 });
    this.tweens.add({ targets: this.comboText, alpha: 0, delay: 1300, duration: 300 });
  }

  /** tên chiêu L/U hiện lớn giữa màn hình */
  private onCallout(name: string, color: number) {
    const t = this.calloutText;
    t.setText(name).setColor(`#${color.toString(16).padStart(6, '0')}`).setAlpha(1).setY(140).setScale(0.8);
    this.tweens.killTweensOf(t);
    this.tweens.add({ targets: t, scale: 1, y: 128, duration: 140, ease: 'Back.out' });
    this.tweens.add({ targets: t, alpha: 0, delay: 650, duration: 250 });
  }

  /** cảnh cắt tuyệt chiêu: dải tối, chân dung trượt vào, tên chiêu */
  private onUltimate(info: { name: string; species: string; color: number }) {
    const { width, height } = this.scale;
    const cy = height / 2 - 40;
    const objs: Phaser.GameObjects.GameObject[] = [];
    const band = this.add.rectangle(width / 2, cy, width, 150, 0x0b0814, 0.82).setDepth(60);
    const stripe = this.add.rectangle(width / 2, cy - 78, width, 6, info.color, 1).setDepth(61);
    const stripe2 = this.add.rectangle(width / 2, cy + 78, width, 6, info.color, 1).setDepth(61);
    objs.push(band, stripe, stripe2);
    for (let i = 0; i < 10; i++) {
      const line = this.add.rectangle(Math.random() * width, cy - 60 + Math.random() * 120, 120 + Math.random() * 200, 2, 0xffffff, 0.35).setDepth(61);
      this.tweens.add({ targets: line, x: line.x - 500, duration: 700 });
      objs.push(line);
    }
    const por = pokemonIcon(this, info.species, -120, cy + 10, 110, true).setDepth(62);
    objs.push(por);
    this.tweens.add({ targets: por, x: 330, duration: 260, ease: 'Cubic.out' });
    const title = outlinedText(this, width / 2 + 160, cy - 18, t('hud.ultTitle'), 12, '#ffd34a', '#1a1020', 2);
    const name = outlinedText(this, width / 2 + 160, cy + 16, info.name, 36, `#${info.color.toString(16).padStart(6, '0')}`, '#1a1020', 3);
    for (const o of [...title.all, ...name.all]) {
      o.setDepth(63).setAlpha(0);
      objs.push(o);
    }
    this.tweens.add({ targets: [...title.all, ...name.all], alpha: 1, x: '-=40', duration: 220, delay: 120 });
    this.time.delayedCall(950, () => {
      this.tweens.add({ targets: objs, alpha: 0, duration: 220, onComplete: () => objs.forEach((o) => o.destroy()) });
    });
  }

  private typeTag(x: number, y: number, ty: PokemonType) {
    // tên hệ tiếng Anh dài hơn (ELECTRIC, FIGHTING...) → nới thẻ theo độ rộng chữ
    const tx = text(this, 0, y, typeLabel(ty).toUpperCase(), 10, '#ffffff').setOrigin(0.5).setDepth(1);
    const w = Math.max(46, Math.ceil(tx.width) + 6);
    tx.setX(x + w / 2);
    const r = this.add.rectangle(x + w / 2, y, w, lang() === 'en' ? 16 : 13, TYPE_COLOR[ty]).setStrokeStyle(1, 0x0b0f1e);
    this.typeObjs.push(r, tx);
    return w + 4;
  }

  private refreshSettings() {
    const s = getSettings();
    this.settingsLine.setText(t('hud.settingsLine', {
      aim: t(`settings.aim.${s.aimMode}`),
      snd: s.muted ? t('hud.off') : t('hud.on'),
      shake: s.reducedShake ? t('hud.shakeReduced') : t('hud.shakeNormal'),
    }));
  }

  // ======================================================================= thông báo

  private showToast(msg: string) {
    this.tweens.killTweensOf(this.toast);
    this.toast.setText(msg).setAlpha(1).setY(130);
    this.tweens.add({ targets: this.toast, alpha: 0, y: 112, delay: 1700, duration: 500 });
  }

  private showBanner(msg: string, color = '#ffb070', hold = 1500) {
    this.tweens.killTweensOf(this.banner);
    this.banner.setText(msg).setColor(color).setAlpha(1).setScale(1.3);
    this.tweens.add({ targets: this.banner, scale: 1, duration: 200, ease: 'Back.out' });
    this.tweens.add({ targets: this.banner, alpha: 0, delay: hold, duration: 500 });
  }

  private onLevelUp(name: string, level: number, newMove?: string) {
    this.showToast(newMove ? t('hud.levelUpMove', { name, n: level, move: newMove }) : t('hud.levelUp', { name, n: level }));
  }
  private onWave(name: string) {
    if (name !== 'Boss') this.showBanner(name);
  }
  private onBoss(name: string) {
    this.showBanner(t('hud.boss', { name }));
  }
  private onBanner(msg: string) {
    this.showBanner(msg);
  }
  private onSwap(name: string) {
    this.showToast(t('hud.swap', { name }));
  }
  private onFainted(name: string) {
    this.showToast(t('hud.fainted', { name }));
  }
  private onCaught(name: string) {
    this.showBanner(t('hud.caught', { name }));
  }

  // ======================================================================= tạm dừng

  private buildPauseLayer() {
    const { width, height } = this.scale;
    const dim = this.add.rectangle(0, 0, width, height, 0x000000, 0.55).setOrigin(0);
    const box = pixelPanel(this, width / 2 - 260, height / 2 - 160, 520, 320);
    const title = outlinedText(this, width / 2, height / 2 - 110, t('hud.paused'), 36, '#ffd34a', '#2a1430', 3);
    const story = this.battle.config.kind === 'stage';
    const hint = text(this, width / 2, height / 2 - 40, t('hud.pauseHint') + (story ? t('hud.pauseHintStage') : ''), 12, '#ffffff', { align: 'center' }).setOrigin(0.5);
    const b1 = button(this, width / 2 - 165, height / 2 + 80, t('hud.resume'), () => this.resume(), 150);
    const b3 = button(this, width / 2, height / 2 + 80, t('hud.settings'), () => this.openSettings(), 150);
    const b2 = button(this, width / 2 + 165, height / 2 + 80, story ? t('hud.quitStage') : t('hud.quitMenu'), () => this.quit(), 150);
    this.pauseLayer = this.add.container(0, 0, [dim, box, ...title.all, hint, b1.bg, b1.t, b3.bg, b3.t, b2.bg, b2.t]).setVisible(false).setDepth(1000);
  }

  /** Cài đặt trong lúc tạm dừng (âm thanh, ngắm, ngôn ngữ...) */
  private openSettings(tab?: SettingsTab) {
    this.settingsPanel?.destroy(true);
    this.pauseLayer.setVisible(false);
    playSfx('select');
    this.settingsPanel = openSettingsPanel(this, {
      tab,
      onClose: () => this.closeSettings(),
      // đổi ngôn ngữ → dựng lại HUD (trận vẫn dừng), mở lại đúng thẻ; còn lại chỉ cập nhật dòng cài đặt
      onRebuild: (tb) => {
        if (tb === 'language') this.scene.restart({ settingsTab: tb });
        else this.refreshSettings();
      },
    }).setDepth(1100);
  }

  private closeSettings() {
    if (!this.settingsPanel) return;
    this.settingsPanel.destroy(true);
    this.settingsPanel = null;
    this.refreshSettings();
    playSfx('select');
    if (this.paused) this.pauseLayer.setVisible(true);
  }

  private pause() {
    // mở màn hội quán: Esc = bỏ qua (GymIntroScene), không tạm dừng
    if (this.paused || this.battle.over || this.battle.introActive) return;
    this.paused = true;
    this.battle.resetInput();
    this.scene.pause('Battle');
    this.pauseLayer.setVisible(true);
  }

  private resume() {
    if (!this.paused) return;
    this.paused = false;
    this.battle.resetInput();
    this.scene.resume('Battle');
    this.pauseLayer.setVisible(false);
    playSfx('select');
  }

  private onEsc() {
    // bài hướng dẫn: Esc là "giữ để bỏ qua" (TutorialScene xử lý), không mở menu tạm dừng
    if (this.scene.isActive('Tutorial')) return;
    if (this.overShown) {
      // màn kết quả ải: Esc = tiếp tục; Sinh tồn: Esc = về menu
      if (this.stageEnd) this.onEnter();
      else this.quit();
      return;
    }
    if (this.settingsPanel) this.closeSettings();
    else if (this.paused) this.resume();
    else this.pause();
  }

  private onBlur() {
    this.battle.resetInput();
    this.input.keyboard?.disableGlobalCapture();
    this.pause();
  }

  private onFocus() {
    this.input.keyboard?.enableGlobalCapture();
  }

  private quit() {
    this.battle.abandonStage();
    this.scene.stop('Tutorial');
    this.scene.stop('Battle');
    if (this.battle.config.kind === 'lab') this.scene.stop('SkillLab');
    if (this.battle.config.kind === 'stage') this.scene.start('StageMap', {});
    else if (this.battle.config.kind === 'trial') this.scene.start('PokeCenter', { trials: true });
    else this.scene.start('Menu');
  }

  // ======================================================================= kết thúc

  private onGameOver(info: GameOverInfo) {
    this.time.delayedCall(info.won ? 1200 : 900, () => this.showGameOver(info));
  }

  private showGameOver(info: GameOverInfo) {
    const { width, height } = this.scale;
    this.overShown = true;
    const dim = this.add.rectangle(0, 0, width, height, 0x000000, 0.6).setOrigin(0);
    const box = pixelPanel(this, width / 2 - 290, height / 2 - 200, 580, 400);
    const title = outlinedText(this, width / 2, height / 2 - 150, info.won ? t('hud.won') : t('hud.lost'), 36, info.won ? COLORS.gold : '#ff6a5a', '#2a1430', 3);
    const lines = [
      t('hud.runStats', { time: formatTime(info.timeMs), kills: info.kills, lv: info.level }),
      '',
      t('hud.records', { time: formatTime(info.records.bestTimeMs), kills: info.records.bestKills, lv: info.records.bestLevel }),
      info.newBest.length ? t('hud.newBest', { list: info.newBest.map((k) => t(`hud.best.${k}`)).join(', ') }) : !info.saved ? t('hud.saveFail') : '',
      '',
      info.reward ? '' : t('hud.survivalNoSave'),
    ];
    const rewardObjs: Phaser.GameObjects.GameObject[] = [];
    if (info.reward) {
      // phần thưởng: biểu tượng lớn + con số, dễ nhìn
      const ry = height / 2 + 22;
      const col = (cx: number, ico: string, label: string, val: string, color: string) => {
        rewardObjs.push(
          this.add.rectangle(cx, ry, 220, 74, 0x1a2250, 0.9).setStrokeStyle(2, 0x5a6ab8),
          icon(this, cx - 80, ry - 6, ico, 3),
          text(this, cx - 54, ry - 22, label, 10, '#c8d0f0').setOrigin(0, 0),
          text(this, cx - 54, ry - 4, val, 22, color).setOrigin(0, 0),
        );
      };
      col(width / 2 - 125, 'coin', t('hud.rewardMoney'), `+${info.reward.money}₽`, COLORS.gold);
      if (info.reward.xp > 0) col(width / 2 + 125, 'candy', t('hud.rewardXp'), `+${info.reward.xp}`, '#7ad8ff');
      else rewardObjs.push(text(this, width / 2 + 125, ry, t('hud.rewardCapped'), 10, '#c8d0f0', { align: 'center', wordWrap: { width: 200 } }).setOrigin(0.5));
      rewardObjs.push(text(this, width / 2, ry + 48, t('hud.rewardNote'), 10, '#9fe08a').setOrigin(0.5));
    }
    const body = text(this, width / 2, height / 2 - 50, lines.join('\n'), 12, '#ffffff', { align: 'center', lineSpacing: 6, wordWrap: { width: 520 } }).setOrigin(0.5);
    const b1 = button(this, width / 2 - 130, height / 2 + 130, t('hud.again'), () => this.onEnter(), 240);
    const b2 = button(this, width / 2 + 130, height / 2 + 130, t('hud.menu'), () => this.quit(), 200);
    const layer = this.add.container(0, 0, [dim, box, ...title.all, body, ...rewardObjs, b1.bg, b1.t, b2.bg, b2.t]).setDepth(1000).setAlpha(0);
    this.tweens.add({ targets: layer, alpha: 1, duration: 250 });
    this.overReady = true;
  }

  private onStageEnd(info: StageEndInfo) {
    this.stageEnd = info;
    this.time.delayedCall(info.result === 'fled' ? 200 : 1000, () => this.showStageEnd(info));
  }

  /** Màn kết quả ải: sao, tiền, bóng, thẻ EXP từng con (thanh chạy + lên cấp + tiến độ tiến hóa), Pokémon bắt được, huy hiệu, ghi chú */
  private showStageEnd(info: StageEndInfo) {
    const { width, height } = this.scale;
    this.overShown = true;
    const dim = this.add.rectangle(0, 0, width, height, 0x000000, 0.6).setOrigin(0);
    // nội dung dựng từ top = 0 rồi dời cả khối (bảng co theo nội dung, tối đa 650)
    const items: Phaser.GameObjects.GameObject[] = [];
    const w = 760;
    const maxH = 650;
    const left = width / 2 - w / 2;
    const top = 0;
    const color = info.result === 'win' ? COLORS.gold : info.result === 'lose' ? '#ff6a5a' : '#ffffff';
    items.push(...outlinedText(this, width / 2, top + 42, info.title.toUpperCase(), 36, color, '#2a1430', 3).all);
    let y = top + 76;
    if (info.result === 'win' && !info.trial) {
      for (let i = 0; i < 3; i++) {
        const st = icon(this, width / 2 - 56 + i * 56, y + 22, i < info.stars ? 'star' : 'starEmpty', 3).setScale(0);
        this.tweens.add({ targets: st, scale: 3, duration: 260, delay: 300 + i * 220, ease: 'Back.out', onStart: () => i < info.stars && playSfx('pickup') });
        items.push(st);
      }
      y += 52;
      items.push(text(this, width / 2, y, info.starReasons.join('  ·  '), 10, '#c8d0f0').setOrigin(0.5, 0));
      y += 22;
      items.push(icon(this, width / 2 - 120, y + 12, 'coin', 2), text(this, width / 2 - 100, y + 12, `+${info.money}`, 24, COLORS.gold).setOrigin(0, 0.5));
      if (info.balls) items.push(icon(this, width / 2 + 40, y + 12, 'pokeball', 2), text(this, width / 2 + 60, y + 12, `+${info.balls}`, 24, '#ffffff').setOrigin(0, 0.5));
      y += 32;
    }
    if (info.badge) {
      items.push(this.add.image(width / 2 - 140, y + 16, info.badge.texture).setScale(3));
      items.push(text(this, width / 2 - 110, y + 4, t('hud.badge', { name: info.badge.name }), 24, '#9fe08a'));
      y += 40;
    }
    // ---- thẻ EXP: mỗi con đã chiến đấu ----
    const cards = info.xpCards ?? [];
    if (cards.length) {
      const cw = 236;
      const gap = 12;
      const x0 = width / 2 - (cards.length * cw + (cards.length - 1) * gap) / 2;
      const built = cards.map((c, i) => this.xpCard(info, c, x0 + i * (cw + gap), y + 4, cw, 900 + i * 300));
      const ch = Math.max(...built.map((b) => b.h));
      for (const b of built) {
        b.drawBg(ch);
        items.push(...b.objs);
      }
      y += ch + 14;
    }
    // ---- các dòng còn lại (bắt được, tiến hóa, ghi chú): quá nhiều thì rút gọn ----
    const lines = cards.length ? [] : [...info.xpLines];
    if (info.caught.length) lines.push(t('hud.caughtList', { list: info.caught.join(', ') }));
    // con đã có thẻ EXP thì thẻ đã báo "Sẵn sàng tiến hóa" → chỉ liệt kê con khác (vd. vừa bắt)
    const evoOthers = info.evolutions.filter((e) => !cards.some((c) => c.uid === e.uid));
    if (evoOthers.length) lines.push(t('hud.evolving', { list: evoOthers.map((e) => POKEMON[e.from].name).join(', ') }));
    lines.push(...info.notes);
    const btnTop = top + maxH - 66;
    const body = text(this, width / 2, y, '', 10, '#ffffff', { align: 'center', lineSpacing: 4, wordWrap: { width: w - 60 } }).setOrigin(0.5, 0);
    let shown = lines.length;
    body.setText(lines.join('\n'));
    while (shown > 1 && y + body.height > btnTop) {
      shown--;
      body.setText([...lines.slice(0, shown), t('evo.res.more', { n: lines.length - shown })].join('\n'));
    }
    if (!lines.length) body.setVisible(false);
    items.push(body);
    const h = Math.min(maxH, Math.max(380, (lines.length ? y + body.height : y) + 76));
    const b = button(this, width / 2, top + h - 40, info.backLabel ?? (info.evolutions.length ? t('hud.toEvo') : t('hud.toMap')), () => this.onEnter(), 300);
    items.push(b.bg, b.t);
    const ptop = Math.round(height / 2 - h / 2);
    const content = this.add.container(0, ptop, items);
    this.resultContent = content;
    const layer = this.add.container(0, 0, [dim, pixelPanel(this, left, ptop, w, h), content]).setDepth(1000).setAlpha(0);
    this.tweens.add({ targets: layer, alpha: 1, duration: 250 });
    this.overReady = true;
  }

  /** Thẻ EXP một con: chân dung, tên, cấp, thanh EXP chạy từ cũ → mới (lên cấp: chớp + cấp nảy + "ting"), tiến độ tiến hóa, chiêu mới, thông thạo */
  private xpCard(info: StageEndInfo, c: StageEndInfo['xpCards'][number], x: number, y: number, w: number, delay: number) {
    const out: Phaser.GameObjects.GameObject[] = [];
    const g = this.add.graphics();
    const drawBg = (h: number) => {
      g.fillStyle(0x000000, 0.3).fillRoundedRect(x + 2, y + 4, w, h, 10);
      g.fillStyle(0x1a2650, 1).fillRoundedRect(x, y, w, h, 10);
      g.lineStyle(2, 0x3a4a88, 1).strokeRoundedRect(x + 1, y + 1, w - 2, h - 2, 10);
    };
    const g2 = this.add.graphics();
    out.push(g, g2);
    g2.fillStyle(0x0b0f1e, 1).fillCircle(x + 32, y + 32, 24);
    g2.lineStyle(2, 0xffd34a, 1).strokeCircle(x + 32, y + 32, 24);
    out.push(pokemonIcon(this, c.species, x + 32, y + 32, 30));
    out.push(fitText(text(this, x + 64, y + 10, c.name, 10, '#ffffff'), w - 64 - 70));
    if (c.gained > 0 || !c.learned?.length) out.push(text(this, x + w - 10, y + 10, `+${c.gained} EXP`, 10, '#7ad8ff').setOrigin(1, 0));
    const lv = text(this, x + 64, y + 40, `Lv ${c.fromLevel}`, 20, COLORS.gold).setOrigin(0, 0.5);
    out.push(lv);
    // thanh EXP
    const bx = x + 10;
    const by = y + 64;
    const bw = w - 20;
    const bh = 12;
    const bar = this.add.graphics();
    const flash = this.add.rectangle(bx, by, bw, bh, 0xffffff, 1).setOrigin(0).setAlpha(0);
    const xpTxt = text(this, bx + bw / 2, by + bh / 2, '', 9, '#ffffff').setOrigin(0.5);
    out.push(bar, flash, xpTxt);
    const p0 = c.fromLevel + Math.min(0.999, c.fromXp / xpToNext(c.fromLevel));
    const p1 = c.toLevel + Math.min(0.999, c.toXp / xpToNext(c.toLevel));
    let shownLv = c.fromLevel;
    const draw = (p: number) => {
      const l = Math.min(c.toLevel, Math.floor(p));
      const frac = l === c.toLevel ? Math.min(p - l, p1 - c.toLevel) : p - l;
      bar.clear();
      bar.fillStyle(0x0b0f1e, 1).fillRect(bx - 1, by - 1, bw + 2, bh + 2);
      bar.fillStyle(0x2a2a3a, 1).fillRect(bx, by, bw, bh);
      bar.fillStyle(0x3ec8f0, 1).fillRect(bx, by, Math.round(bw * frac), bh);
      bar.fillStyle(0xffffff, 0.25).fillRect(bx, by, Math.round(bw * frac), 3);
      xpTxt.setText(`${Math.floor(frac * xpToNext(l))}/${xpToNext(l)} EXP`);
      if (l > shownLv) {
        shownLv = l;
        lv.setText(`Lv ${l}`).setScale(1.7);
        this.tweens.add({ targets: lv, scale: 1, duration: 260, ease: 'Back.out' });
        flash.setAlpha(0.9);
        this.tweens.add({ targets: flash, alpha: 0, duration: 320 });
        playSfx('level');
        const up = text(this, x + w - 12, y + 40, t('evo.res.levelUp'), 10, '#fff0a0').setOrigin(1, 0.5);
        this.resultContent?.add(up);
        this.tweens.add({ targets: up, y: y + 26, alpha: 0, delay: 350, duration: 500, onComplete: () => up.destroy() });
      }
    };
    draw(p0);
    const prog = { p: p0 };
    const levels = c.toLevel - c.fromLevel;
    // dòng tiến hóa + chiêu mới + thông thạo: hiện sau khi thanh chạy xong
    const after: Phaser.GameObjects.GameObject[] = [];
    let ty = by + bh + 8;
    const game = getGame();
    const m = game?.box.find((b) => b.uid === c.uid);
    if (m) {
      const e = evoStatus(m, game);
      const into = e.into ? POKEMON[e.into].name : '';
      let line = '';
      let col = '#c8d0f0';
      if (e.state === 'ready') [line, col] = [t('evo.res.ready', { name: into }), '#fff0a0'];
      else if (e.state === 'soon' || e.state === 'far') [line, col] = [e.levelsLeft === 1 ? t('evo.res.toGo1', { name: into }) : t('evo.res.toGo', { name: into, n: e.levelsLeft }), e.state === 'soon' ? '#fff0a0' : '#c8d0f0'];
      else if (e.state === 'capped') [line, col] = [t('evo.res.capped', { name: into, lv: e.level ?? 0, cap: e.cap }), '#ffc0a0'];
      else if (e.state === 'item-ready') [line, col] = [t('evo.res.itemReady', { item: itemName(e.item ?? ''), name: into }), '#fff0a0'];
      else if (e.state === 'item-missing') line = t('evo.res.itemMissing', { name: into, item: itemName(e.item ?? '') });
      if (line) {
        const hi = e.state === 'ready' || e.state === 'item-ready' || e.state === 'soon';
        const lx = hi ? x + 28 : x + 10;
        if (hi) {
          const sp = icon(this, x + 17, ty + 7, 'sparkle', 1);
          this.tweens.add({ targets: sp, scale: 1.35, yoyo: true, repeat: -1, duration: 420 });
          after.push(sp);
        }
        const lt = text(this, lx, ty, line, 9, col, { wordWrap: { width: x + w - 10 - lx }, maxLines: 2 });
        after.push(lt);
        ty += lt.height + 4;
      }
    }
    // chiêu mới (chip) + thông thạo
    let cx = x + 10;
    for (const mv of c.moves) {
      const label = text(this, 0, ty + 9, t('evo.res.newMove', { move: mv }), 9, '#0b0f1e').setOrigin(0, 0.5);
      fitText(label, w - 36);
      const cw = label.width + 14;
      if (cx + cw > x + w - 8 && cx > x + 10) {
        cx = x + 10;
        ty += 22;
        label.setY(ty + 9);
      }
      const chip = this.add.graphics();
      chip.fillStyle(0x9fe08a, 1).fillRoundedRect(cx, ty, cw, 18, 9);
      label.setX(cx + 7).setShadow(0, 0, '#000000', 0, false, false);
      after.push(chip, label);
      cx += cw + 6;
    }
    if (c.moves.length) ty += 22;
    // chiêu vừa học (mở khóa bằng thành tích): chip vàng + lấp lánh
    for (const mv of c.learned ?? []) {
      const label = text(this, x + 38, ty + 10, t('unlock.learnedChip', { move: mv }), 9, '#2a1430').setOrigin(0, 0.5).setShadow(0, 0, '#000000', 0, false, false);
      fitText(label, w - 56);
      const chip = this.add.graphics();
      chip.fillStyle(0xffd34a, 1).fillRoundedRect(x + 10, ty, label.width + 38, 20, 10);
      chip.lineStyle(2, 0xfff0a0, 1).strokeRoundedRect(x + 10, ty, label.width + 38, 20, 10);
      const sp = icon(this, x + 23, ty + 10, 'sparkle', 1);
      this.tweens.add({ targets: sp, scale: 1.4, angle: 20, yoyo: true, repeat: -1, duration: 380 });
      after.push(chip, label, sp);
      ty += 24;
    }
    const mastery = (info.mastery ?? []).filter((k) => k.uid === c.uid);
    if (mastery.length) {
      const mt = text(this, x + 10, ty, t('evo.res.mastery', { list: mastery.map((k) => `${k.move} +${k.gained}`).join(' · ') }), 9, '#ffd0a0', { wordWrap: { width: w - 20 }, maxLines: 2 });
      after.push(mt);
      ty += mt.height + 2;
    }
    for (const o of after) (o as unknown as Phaser.GameObjects.Components.Alpha).setAlpha(0);
    const reveal = () => this.tweens.add({ targets: after, alpha: 1, duration: 300 });
    this.tweens.add({
      targets: prog, p: p1, delay, duration: Phaser.Math.Clamp(600 + levels * 550, 600, 3200), ease: levels ? 'Linear' : 'Sine.out',
      onUpdate: () => draw(prog.p),
      onComplete: () => {
        draw(p1);
        reveal();
      },
    });
    return { objs: [...out, ...after], h: ty - y + 8, drawBg };
  }

  private onEnter() {
    if (!this.overReady) return;
    this.overReady = false;
    playSfx('select');
    if (this.stageEnd) this.battle.finishStage(this.stageEnd);
    else this.scene.start('Battle', { kind: 'survival' });
  }
}
