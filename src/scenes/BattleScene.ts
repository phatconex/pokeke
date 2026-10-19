import Phaser from 'phaser';
import { scatter } from '../fx/TypeFx';
import { leafBurst } from '../fx/GrassFx';
import { AIM, BOSS, CAPS, CATCH, COMBAT, combatProfile, ECONOMY, FINISHER, PLAYER, POTION, SKILL_UNLOCK, SPAWN, STAGE_REWARD, STAGE_RAMP, STAGE_TUNING, SURVIVAL, stageRamp, SWITCH, TRAINER, arenaSize } from '../config/balance';
import { makeFrame } from '../art/chapters';
import { arenaLayout, generateArena } from '../art/arenaArt';
import { METRONOME_POOL, MOVES, MoveDef, slotScaledMove, STATUS_COLOR, upgradeMove } from '../data/moves';
import { hasUltimate, POKEMON, SKILL_SLOTS, SkillSlot } from '../data/pokemon';
import { STAGES, STAGE_BY_ID, StageDef, TUTORIAL_STAGE_ID } from '../data/stages';
import { CRIT_MULT } from '../data/stats';
import { BADGES, GYMS, GymDef } from '../data/trainers';
import { effectiveness, PokemonType, TYPE_COLOR } from '../data/types';
import { pickWeighted, waveAt, WAVES } from '../data/waves';
import { buildRivalGym, rivalSpeciesPool } from '../data/rival';
import { ULT_GAIN, ULT_PACING, ultimateFor } from '../data/ultimates';
import { castArchetype, castUltArchetype } from '../skills/archetypes';
import { resolveUlt, SPECIES_DMG_MULT } from '../skills/kits';
import type { SkillHost } from '../skills/host';
import type { SkillSpec } from '../skills/types';
import { lang, t, tr } from '../i18n';
import { badgeName, gymText, itemName, moveName, stageName, statusLabel, typeLabel, ultimateText } from '../i18n/content';
import { addBigWin, addKo, addQuest, isLearned, learnReady, markTrialCleared, readySlots, slotUnlock, trialPool, trialTheme, UnlockSlot } from '../game/unlocks';
import type { QuestEvent } from '../data/unlocks';
import { readyToast, reqLine, slotLockShort } from '../ui/unlockText';
import type { HazardDef, HazardFx, HazardHit, Solid } from '../data/hazards';
import { legendOf } from '../data/legendary';
import { impactRays, powBurst } from '../fx/FightFx';
import { drawHexCluster, hexShatter } from '../fx/PsyFx';
import { flameMantle, frostMantle, scatter as scatterFx, thunderMantle } from '../fx/TypeFx';
import { iceBlock, radialShards, shardBurst } from '../fx/IceFx';
import { finalizeSpecies, queueSheets } from '../systems/spriteLoader';
import { dexOf, markCaught, markSeen } from '../game/dex';
import { playMusic } from '../systems/music';
import { FONT } from '../ui/style';
import { Boss } from '../entities/Boss';
import { applyStageTuning, Enemy } from '../entities/Enemy';
import { Fighter } from '../entities/Fighter';
import { ProjectilePool } from '../entities/Projectiles';
import type { BattleCtx } from '../entities/types';
import { Effects } from '../fx/Effects';
import { BallThrow, materialize, throwPokeball, trainerThrowPose } from '../fx/ballThrow';
import type { GymIntroScene } from './GymIntroScene';
import type { HudScene } from './HudScene';
import { evoStatus, EvoState } from '../game/evolution';
import {
  addMastery, addToBox, battleTeam, evolutionReady, gainXp, GameState, getGame, healTeam, levelCap, makeMember, memberSkills, PartyMember, saveGame, skillMastery,
} from '../game/state';
import { submitRun, Records } from '../systems/records';
import { playSfx, resetSfxThrottle } from '../systems/sfx';
import { AimMode, getSettings } from '../systems/settings';
import { buildForest, circleHitsRects, generateForest, SolidRect } from '../world/forestMap';

/** hiệu ứng rơi của chiêu nhiều đòn giáng xuống (strikes) theo hệ */
const STRIKE_FX: Partial<Record<PokemonType, HazardFx>> = {
  electric: 'lightning', fire: 'flame', ice: 'ice', rock: 'rock', ground: 'rock', water: 'water', psychic: 'psychic',
  ghost: 'shadow', poison: 'poison', grass: 'spore', bug: 'spore', dragon: 'flame', fighting: 'rock', normal: 'rock', flying: 'ice',
};

/** tên tuyệt chiêu theo ngôn ngữ đang chọn */
const ULT_NAME_BY_SPECIES: Record<string, { vi: string; en: string }> = {
  ivysaur: { vi: 'Vũ Điệu Cánh Hoa', en: 'Petal Dance' },
  venusaur: { vi: 'Rừng Cây Phủ Sân', en: 'Overgrowth' },
  kadabra: { vi: 'Ngưng Đọng Thời Gian', en: 'Time Stop' },
  alakazam: { vi: 'Ngưng Đọng Thời Gian', en: 'Time Stop' },
  mewtwo: { vi: 'Phá Vỡ Tâm Trí', en: 'Mind Break' },
  moltres: { vi: 'Tái Sinh Phượng Hoàng', en: 'Phoenix Rebirth' },
  zapdos: { vi: 'Phán Quyết Sấm Sét', en: 'Thunder Judgement' },
  articuno: { vi: 'Cực Quang Vĩnh Cửu', en: 'Eternal Aurora' },
  dewgong: { vi: 'Kỷ Băng Hà', en: 'Ice Age' },
  machoke: { vi: 'Loạt Đấm', en: 'Flurry' },
  machamp: { vi: 'Đấm Hạ Gục', en: 'K.O. Rush' },
};
const ultName = (types: PokemonType[], speciesId?: string) => {
  const o = speciesId ? ULT_NAME_BY_SPECIES[speciesId] : undefined;
  return o ? (lang() === 'en' ? o.en : o.vi) : ultimateText(types[0], ultimateFor(types)).name;
};

/** nhãn khắc hệ (Rất hiệu quả! / Không hiệu quả lắm / Gần như vô hiệu...) */
function effLabel(mult: number): { text: string; color: string } | null {
  if (mult >= 2) return { text: t('battle.eff.super'), color: '#ffd34a' };
  if (mult <= 0.3) return { text: t('battle.eff.immune'), color: '#9a9a9a' };
  if (mult < 1) return { text: t('battle.eff.weak'), color: '#c0c0c0' };
  return null;
}

/** tên đợt Sinh tồn ('Đợt 3' → 'Wave 3'; 'Boss' giữ nguyên) */
function survivalWaveName(name: string): string {
  const n = /(\d+)$/.exec(name);
  return name === 'Boss' || !n ? name : t('battle.waveN', { n: n[1] });
}

/** Cấu hình trận: chế độ Sinh tồn, hoặc một ải trên bản đồ */
export type BattleConfig =
  | { kind: 'survival' }
  | { kind: 'stage'; stageId: string; /** bỏ đoạn mở màn hội quán (kiểm thử) */ skipIntro?: boolean; /** bài hướng dẫn xem lại (không thưởng / không giữ Pokémon bắt được) */ replay?: boolean }
  /** Skill Lab: một Pokémon (không lấy từ save) + hình nộm vô hạn máu; không thưởng / không lưu / không EXP */
  | { kind: 'lab'; speciesId: string; level: number }
  /** Thử thách chiêu (U): chỉ một Pokémon (uid trong Hộp), sân theo hệ, bẫy lan dần, sống sót + hạ đủ địch (SKILL_UNLOCK.trial) */
  | { kind: 'trial'; uid: string };

/** hình nộm của Skill Lab (hệ Thường → không lệch khắc hệ) */
const LAB_DUMMIES = ['rattata', 'meowth', 'pidgey', 'rattata', 'meowth'];
const LAB_DUMMY_HP = 1e9;

/** trainer trong sân hội quán phóng to cho dễ nhìn (sprite gốc ~16×24) */
export const TRAINER_SCALE = 1.5;
/** vị trí đoạn mở màn hội quán theo kích thước sân: Pokémon đối thủ = makeFrame().startR, thủ lĩnh / người chơi đứng
 *  hai bên trong khung 640 px giữa sân (camera giữ tâm sân suốt đoạn mở màn nên cả hai đều trong hình) */
export function gymPositions(W: number, H: number) {
  const f = makeFrame(W, H);
  return { leader: { x: Math.round(W / 2 + 280), y: Math.round(H / 2 + 22) }, foe: { ...f.startR }, trainer: { x: Math.round(W / 2 - 276), y: Math.round(H / 2 + 22) }, player: { ...f.startL } };
}

/** vùng mây của Phấn Độc / Bào Tử Tê */
interface MoveZone {
  x: number;
  y: number;
  r: number;
  until: number;
  nextTick: number;
  move: MoveDef;
  power: number;
  gfx: Phaser.GameObjects.Graphics;
  color: number;
}

interface XpOrb {
  img: Phaser.GameObjects.Image;
  x: number;
  y: number;
  value: number;
  active: boolean;
  bornAt: number;
}

export interface HudState {
  mode: 'survival' | 'stage' | 'gym' | 'lab';
  title: string;
  subtitle: string;
  active: { id: string; name: string; level: number; hp: number; maxHp: number; xp: number; xpToNext: number; types: PokemonType[]; guard: boolean;
    /** tiến độ tiến hóa (game/evolution.ts): tên loài mới, số cấp còn thiếu, giới hạn cấp, đá */
    evo: { state: EvoState; into: string; levelsLeft: number; cap: number; item?: string; atCap: boolean } };
  bench: { id: string; level: number; hp: number; maxHp: number; active: boolean; dead: boolean }[];
  skills: {
    key: string; name: string; upgrade: number; icon: string; color: number; left: number; total: number; locked: boolean; unlockLevel: number;
    /** chữ khóa ngắn: trong ô (vd. "Lv 10", "9/25") và dưới ô (vd. "Burn") – ui/unlockText.ts */
    lockTop?: string; lockLabel?: string;
    /** năng lượng mỗi lần dùng (0 = miễn phí, vd. Lướt) và đủ năng lượng chưa */
    cost: number; affordable: boolean;
  }[];
  /** năng lượng chung của Pokémon đang ra sân */
  energy: { value: number; max: number };
  /** đồng hồ cơ chế riêng của hệ (Cơn giận / Da đá / Bầy đàn); null = hệ không có */
  mech: { kind: 'fury' | 'armor' | 'swarm' | 'static'; value: number; label: string; color: number; ticks: number; active: boolean } | null;
  switchLeft: number;
  kills: number;
  enemiesLeft: number;
  timeMs: number;
  waveName: string;
  boss: { hp: number; maxHp: number; name: string; level: number; id: string; types: PokemonType[] } | null;
  leaderTeam: { id: string; dead: boolean; active: boolean }[];
  bossInMs: number;
  balls: number;
  potions: number;
  potionLeft: number;
  parTimeS: number;
  dev: boolean;
  canRun: boolean;
  /** tuyệt chiêu của con đang ra sân */
  ult: { charge: number; name: string; locked: boolean; /** còn khóa sau lần tung trước (ms, 0 = không khóa) */ cdLeftMs: number; lockTop?: string; lockLabel?: string };
}

export interface GameOverInfo {
  won: boolean;
  timeMs: number;
  kills: number;
  level: number;
  newBest: string[];
  saved: boolean;
  records: Records;
}

export interface StageEndInfo {
  result: 'win' | 'lose' | 'fled';
  title: string;
  stars: number;
  starReasons: string[];
  money: number;
  balls: number;
  xpLines: string[];
  caught: string[];
  badge?: { name: string; texture: string };
  notes: string[];
  evolutions: { uid: string; from: string; into: string }[];
  /** Thông thạo nhận được trong trận (mỗi lần ra chiêu trúng ≥1 địch = +1), theo Pokémon × ô chiêu; chỉ các mục > 0 */
  mastery: { uid: string; species: string; slot: SkillSlot; move: string; gained: number; total: number }[];
  /** thưởng bắt được loài mới (đã cộng vào money) */
  newSpeciesMoney: number;
  /** thẻ EXP từng con đã chiến đấu (màn kết quả: thanh EXP chạy từ cũ tới mới) */
  xpCards: { uid: string; species: string; name: string; gained: number; fromLevel: number; fromXp: number; toLevel: number; toXp: number; moves: string[];
    /** chiêu vừa HỌC sau trận (mở khóa bằng thành tích) – chip "Đã học: ...!" */
    learned?: string[] }[];
  /** nhãn nút quay lại (mặc định: về bản đồ) */
  backLabel?: string;
  /** kết quả Thử thách chiêu (không sao / không thưởng) */
  trial?: boolean;
}

type KeyName = 'W' | 'A' | 'S' | 'D' | 'UP' | 'DOWN' | 'LEFT' | 'RIGHT' | 'J' | 'K' | 'L' | 'U' | 'SPACE' | 'Q' | 'R' | 'E' | 'F' | 'ONE' | 'TWO' | 'THREE';
type Keys = Record<KeyName, Phaser.Input.Keyboard.Key>;

const INPUT_BUFFER_MS = 140;
const SLOT_KEYS: Record<SkillSlot, KeyName> = { J: 'J', K: 'K', L: 'L', U: 'U' };

const FLAIR_TEX: Partial<Record<string, string>> = { dragon: 'scaleD', rock: 'boulderB', ground: 'mudball', flying: 'featherA', poison: 'goo', bug: 'bugdot', normal: 'star5' };

export class BattleScene extends Phaser.Scene implements BattleCtx {
  clock = 0;
  fx!: Effects;
  enemyShots!: ProjectilePool;
  config: BattleConfig = { kind: 'survival' };
  private playerShots!: ProjectilePool;
  fighters: Fighter[] = [];
  private activeIdx = 0;
  private enemies: Enemy[] = [];
  private enemyGroup!: Phaser.Physics.Arcade.Group;
  private zoneToEnemy = new Map<Phaser.GameObjects.GameObject, Enemy>();
  private solidRects: SolidRect[] = [];
  private orbs: XpOrb[] = [];
  private keys!: Keys;
  private buffered: Record<SkillSlot | 'dash', number> = { J: 0, K: 0, L: 0, U: 0, dash: 0 };
  private nextSpawnAt = 0;
  private waveName = '';
  private boss: Enemy | null = null;
  private bossSpawned = false;
  private kills = 0;
  over = false;
  private worldW = 0;
  private worldH = 0;
  /** vị trí đoạn mở màn / ra sân của trận huấn luyện viên (theo kích thước sân) */
  gymPos = gymPositions(800, 450);
  private coneGfx!: Phaser.GameObjects.Graphics;
  private barGfx!: Phaser.GameObjects.Graphics;
  /** mũi tên mép màn hình chỉ tới địch ngoài khung camera (vẽ cố định theo màn hình) */
  private arrowGfx!: Phaser.GameObjects.Graphics;
  private nextJetAt = new Map<Fighter, number>();
  private aimTarget: Enemy | null = null;
  private reticle!: Phaser.GameObjects.Image;
  private mouseWorld = new Phaser.Math.Vector2();
  private cursorMode: AimMode | null = null;
  private mouseSeen = false;
  private switchReadyAt = 0;
  private pendingSwitchAt = 0;
  // ---- ải ----
  stage: StageDef | null = null;
  private gym: GymDef | null = null;
  private gymIndex = 0;
  private waveIndex = 0;
  private pending: { species: string; level: number; boss?: boolean; alpha?: boolean; at: number; line?: string; thrown?: boolean; flank?: number }[] = [];
  /** đoạn mở màn hội quán đang chạy (GymIntroScene): dừng AI, điều khiển và đồng hồ trận */
  introActive = false;
  /** gọi bỏ qua mở màn trước khi GymIntroScene kịp tạo */
  introSkipRequested = false;
  /** hình thủ lĩnh / người chơi đứng ở hai đầu sân (hội quán) */
  leaderSprite: Phaser.GameObjects.Sprite | null = null;
  trainerSprite: Phaser.GameObjects.Sprite | null = null;
  playerSpawn = { x: 0, y: 0 };
  private potionReadyAt = 0;
  /** số Thuốc đã dùng trong trận (trận có thủ lĩnh giới hạn TRAINER.potionLimit) */
  private potionsUsed = 0;
  private slowZones: { x: number; y: number; w: number; h: number }[] = [];
  /** hệ không bị vùng làm chậm ảnh hưởng (mặc định hệ Nước) */
  private slowImmune: PokemonType[] = ['water'];
  /** bẫy sân đấu (sàn điện, bào tử, mưa đá, ô dịch chuyển, băng, bóng tối, gió) */
  private hazards: HazardDef[] = [];
  private hazardState: { nextAt: number; warned: boolean; group: number; spots: { x: number; y: number }[]; dir: number }[] = [];
  private hiddenWalls = new Map<Phaser.GameObjects.GameObject, { rect: Solid; flashUntil: number }>();
  private hazardGfx: Phaser.GameObjects.Graphics | null = null;
  private darkMask: Phaser.GameObjects.Image | null = null;
  private teleportReadyAt = 0;
  /** vật phẩm nhận được khi thắng (để hiện ở màn kết quả) */
  private nextWaveAt = 0;
  private fainted = new Set<PartyMember>();
  private xpLog = new Map<PartyMember, { name: string; xp: number; from: number; fromXp: number; moves: string[] }>();
  /** quầng sáng quanh con đang ra sân khi đã đủ cấp tiến hóa (tới hết trận) */
  private evoAura: Phaser.GameObjects.Ellipse | null = null;
  private caught: { species: string; level: number }[] = [];
  private catching = false;
  private labelCooldown = new Map<Enemy, number>();
  private effLabelAt = 0;
  /** liên hoàn: chiêu khác nhau nối tiếp trong 1,5 giây */
  private combo = 0;
  private comboSlot: SkillSlot | null = null;
  private comboAt = 0;
  private comboMult = 1;
  /** đã hiện thông báo "không đủ năng lượng" trong trận này; lần báo kế tiếp sớm nhất */
  private energyHinted = false;
  private energyCueAt = 0;
  /** cầu nối cho nguyên mẫu chiêu (skills/archetypes.ts) */
  private skillHost!: SkillHost;
  private faintAnnounced = new Set<Fighter>();
  private devMode = import.meta.env.DEV;
  /** việc hẹn giờ theo đồng hồ trận (nhát đánh liên hoàn, trồi lên khi Đào Đất...) */
  private scheduled: { at: number; fn: () => void }[] = [];
  private zones: MoveZone[] = [];
  private spinTickAt = 0;
  private preloadIds = new Set<string>();
  /** Giác đấu – Phản Đòn đang giữ thế đỡ, và buff L/U sau khi phản */
  private counter: { until: number; reduce: number; onHit: () => void; done: boolean } | null = null;
  private counterBuff = { until: 0, mult: 1 };
  /** huyền thoại: lá chắn lục giác tự động + hào quang lơ lửng */
  private legendShieldAt = 0;
  private legendShieldOn = false;
  /** Cơ chế riêng từng hệ: Rồng – Cơn giận · Đá – Da đá · Độc – cộng dồn/ăn mòn */
  private furyHits = 0;
  private furyUntil = 0;
  private armorStacks = 0;
  private armorUntil = 0;
  private armorGainAt = 0;
  private toxicTickAt = 0;
  private rebirthUsed = false;
  private staticCharge = 0;
  private staticReady = false;
  /** Bài hướng dẫn: bộ đếm hành động cho TutorialScene đọc */
  tutorial = false;
  tutReplay = false;
  tut = { moved: 0, dashes: 0, kills: 0, throws: 0, caught: 0, potions: 0, casts: {} as Record<string, number> };
  private tutItems: Record<string, number> | null = null;
  private swarmUntil = 0;
  private swarmReadyAt = 0;
  private swarmLastT = 0;
  private swarmBugs: { img: Phaser.GameObjects.Image; x: number; y: number; bite: number; ph: number }[] = [];
  private legendLiftPause = 0;
  private legendNextPuffAt = 0;
  private legendGfx: Phaser.GameObjects.Graphics | null = null;
  private loadingText: Phaser.GameObjects.Text | null = null;
  /** tiền nhặt được bằng Ném Xu trong trận */
  private bonusMoney = 0;
  /** thưởng bắt loài mới trong trận (STAGE_REWARD.newSpeciesPerLevel × cấp) */
  private newSpeciesMoney = 0;
  /** mỗi lần người chơi ra chiêu: ô, Pokémon, các địch đã trúng (hoàn năng lượng J / Thông thạo đếm 1 lần) */
  private casts = new Map<number, { slot: SkillSlot; member: PartyMember; hit: Set<Enemy>; counted: boolean }>();
  private castSeq = 0;
  /** Thông thạo nhận trong trận: uid → ô → số lần */
  private masteryGain = new Map<PartyMember, Partial<Record<SkillSlot, number>>>();
  /** tuyệt chiêu: khóa tới mốc này (ULT_PACING.cooldownMs, chung cả đội) + lần cuối gây sát thương (để giảm thanh) */
  private ultLockUntil = 0;
  private lastDealtAt = 0;
  private moneyLabelAt = 0;
  /** việc chạy mỗi khung hình đến hạn `until` (vạch ngắm, dòng lửa, cầu lửa bay...); done() dọn đồ họa */
  private frameTasks: { until: number; tick: (now: number, dt: number) => void; done?: () => void }[] = [];
  /** khựng hình khi trúng đòn nặng (ms thực) */
  private hitStopMs = 0;
  /** chuyển động chậm của đòn kết liễu (ms thực còn lại) */
  private slowMoMs = 0;
  /** Skill Lab: hình nộm trôi chậm, năng lượng vô hạn */
  labMoving = false;
  labFreeEnergy = false;
  /** Thử thách chiêu đang chạy */
  trial: { member: PartyMember; type: PokemonType; pool: string[]; nextSpawnAt: number; durationMs: number; kills: number } | null = null;
  /** ô đã báo "sẵn sàng học" trong trận (uid:ô) */
  private unlockAnnounced = new Set<string>();

  constructor() {
    super('Battle');
  }

  get host(): Phaser.Scene {
    return this;
  }

  /** Pokémon đang ra sân */
  get player(): Fighter {
    return this.fighters[this.activeIdx];
  }

  /** hội quán / Tứ Thiên Vương / Shigeru của trận này (null nếu ải thường) */
  get gymDef(): GymDef | null {
    return this.gym;
  }

  init(data: BattleConfig | undefined) {
    this.config = data && 'kind' in data ? data : { kind: 'survival' };
  }

  /** Nạp sheet hành động (đánh, bắn, bị đánh...) của các loài sẽ xuất hiện trong trận */
  preload() {
    const ids = new Set<string>();
    const game = getGame();
    for (const m of game ? battleTeam(game) : []) ids.add(m.speciesId);
    if (this.config.kind === 'lab') {
      ids.clear();
      ids.add(this.config.speciesId);
      LAB_DUMMIES.forEach((x) => ids.add(x));
    } else if (this.config.kind === 'trial') {
      ids.clear();
      const m = game?.box.find((b) => b.uid === (this.config as { uid: string }).uid);
      if (m) {
        ids.add(m.speciesId);
        trialPool(POKEMON[m.speciesId].types[0]).forEach((x) => ids.add(x));
      }
    } else if (this.config.kind === 'survival') {
      ids.add(SURVIVAL.starter).add('onix');
      for (const w of WAVES) Object.keys(w.weights).forEach((k) => ids.add(k));
    } else {
      const st = STAGE_BY_ID[this.config.stageId];
      st?.waves?.flat().forEach((sp) => ids.add(sp.species));
      if (st?.gymId) GYMS[st.gymId]?.team.forEach((t) => ids.add(t.species));
      if (st?.rival) rivalSpeciesPool().forEach((x) => ids.add(x));
    }
    if (queueSheets(this, ids)) {
      const { width, height } = this.scale;
      this.loadingText = this.add.text(width / 2, height / 2, t('battle.loading'), { fontFamily: FONT, fontSize: '24px', color: '#ffffff' }).setOrigin(0.5).setScrollFactor(0);
    }
    this.preloadIds = ids;
  }

  create() {
    // tạo animation cho các sheet vừa nạp ở preload()
    finalizeSpecies(this, this.preloadIds);
    this.loadingText?.destroy();
    this.loadingText = null;
    // Scene được tái sử dụng → khởi tạo lại mọi trạng thái
    this.clock = 0;
    this.enemies = [];
    this.zoneToEnemy = new Map();
    this.orbs = [];
    this.fighters = [];
    this.buffered = { J: 0, K: 0, L: 0, U: 0, dash: 0 };
    this.nextSpawnAt = 800;
    this.waveName = '';
    this.boss = null;
    this.bossSpawned = false;
    this.kills = 0;
    this.over = false;
    this.nextJetAt = new Map();
    this.aimTarget = null;
    this.cursorMode = null;
    this.mouseSeen = false;
    this.switchReadyAt = 0;
    this.pendingSwitchAt = 0;
    this.stage = null;
    this.gym = null;
    this.introActive = false;
    this.introSkipRequested = false;
    this.leaderSprite = null;
    this.trainerSprite = null;
    this.gymIndex = 0;
    this.waveIndex = 0;
    this.pending = [];
    this.nextWaveAt = 0;
    this.fainted = new Set();
    this.xpLog = new Map();
    this.caught = [];
    this.catching = false;
    this.labelCooldown = new Map();
    this.effLabelAt = 0;
    this.combo = 0;
    this.comboSlot = null;
    this.comboAt = 0;
    this.comboMult = 1;
    this.energyHinted = false;
    this.energyCueAt = 0;
    this.faintAnnounced = new Set();
    this.potionReadyAt = 0;
    this.potionsUsed = 0;
    this.slowZones = [];
    this.hazards = [];
    this.hazardState = [];
    this.hiddenWalls = new Map();
    this.darkMask = null;
    this.hazardGfx = null;
    this.teleportReadyAt = 0;
    this.scheduled = [];
    this.clearFrameTasks();
    this.zones = [];
    this.furyHits = 0;
    this.furyUntil = 0;
    this.armorStacks = 0;
    this.armorUntil = 0;
    this.toxicTickAt = 0;
    this.rebirthUsed = false;
    this.staticCharge = 0;
    this.staticReady = false;
    this.swarmUntil = 0;
    this.swarmReadyAt = 0;
    this.swarmBugs = [];
    this.spinTickAt = 0;
    this.bonusMoney = 0;
    this.newSpeciesMoney = 0;
    this.casts.clear();
    this.castSeq = 0;
    this.masteryGain.clear();
    this.ultLockUntil = 0;
    this.lastDealtAt = 0;
    this.moneyLabelAt = 0;
    this.trial = null;
    this.unlockAnnounced = new Set();
    resetSfxThrottle();

    const cfg = this.config;
    const game = getGame();
    const lab = cfg.kind === 'lab';
    if (cfg.kind === 'stage') {
      this.stage = STAGE_BY_ID[cfg.stageId] ?? null;
      if (!game || !this.stage || !battleTeam(game).length) {
        this.scene.start('Menu');
        return;
      }
      this.gym = this.stage.gymId ? gymText(GYMS[this.stage.gymId]) : this.stage.rival ? buildRivalGym(game, this.stage) : null;
      this.tutorial = this.stage.id === TUTORIAL_STAGE_ID;
      this.tutReplay = this.tutorial && !!cfg.replay;
      this.tut = { moved: 0, dashes: 0, kills: 0, throws: 0, caught: 0, potions: 0, casts: {} };
      this.tutItems = null;
      if (this.tutorial) {
        this.tutItems = { ...game.items };
        game.items.pokeball = Math.max(game.items.pokeball, 4);
        game.items.potion = Math.max(game.items.potion, 2);
      }
    } else if (cfg.kind === 'trial') {
      const m = game?.box.find((b) => b.uid === cfg.uid);
      if (!game || !m) {
        this.scene.start('PokeCenter');
        return;
      }
      const type = POKEMON[m.speciesId].types[0];
      const theme = trialTheme(type);
      // ải ảo: dùng sân + hệ thống thả địch của ải thường, không có đợt cố định
      this.stage = { id: `trial-${type}`, kind: 'stage', name: t('trial.title', { type: typeLabel(type) }), area: '', x: 0, y: 0, playable: true, biome: theme.biome, waves: [], parTimeS: SKILL_UNLOCK.trial.durationS };
      this.trial = { member: m, type, pool: trialPool(type), nextSpawnAt: 600, durationMs: SKILL_UNLOCK.trial.durationS * 1000, kills: 0 };
    }

    this.fx = new Effects(this);
    this.playerShots = new ProjectilePool(this, CAPS.playerProjectiles);
    this.enemyShots = new ProjectilePool(this, CAPS.enemyProjectiles);
    this.coneGfx = this.add.graphics().setDepth(99990);
    this.barGfx = this.add.graphics().setDepth(100003);
    this.arrowGfx = this.add.graphics().setDepth(100004).setScrollFactor(0);
    this.reticle = this.add.image(0, 0, 'reticle').setDepth(99980).setVisible(false);
    this.enemyGroup = this.physics.add.group();
    this.skillHost = this.makeSkillHost();

    // ---- sân đấu ----
    let spawn = { x: 0, y: 0 };
    const solids = this.physics.add.staticGroup();
    if (this.stage || lab) {
      const biome = this.stage?.biome ?? 'forest';
      const size = arenaSize(lab ? 'lab' : this.gym ? 'trainer' : 'stage');
      this.worldW = size.w;
      this.worldH = size.h;
      this.gymPos = gymPositions(size.w, size.h);
      const key = `arena-${biome}-${size.w}x${size.h}`;
      if (!this.textures.exists(key)) generateArena(this, key, biome, size.w, size.h);
      this.add.image(0, 0, key).setOrigin(0).setDepth(-10000);
      const lay = arenaLayout(biome, size.w, size.h);
      this.physics.world.setBounds(lay.inset, lay.inset, this.worldW - lay.inset * 2, this.worldH - lay.inset * 2);
      this.solidRects = lay.solids;
      this.slowZones = lay.slowZones ?? [];
      this.slowImmune = lay.slowImmuneTypes ?? ['water'];
      this.hazards = [...(lay.hazards ?? [])];
      if (this.trial) {
        // bẫy theo hệ, số vòng tăng dần theo thời gian (trialTick)
        const tc = SKILL_UNLOCK.trial;
        this.hazards.push({
          kind: 'rain', count: tc.hazardCount[0], radius: tc.hazardRadius, periodMs: tc.hazardPeriodMs, warnMs: tc.hazardWarnMs,
          fx: trialTheme(this.trial.type).fx, color: TYPE_COLOR[this.trial.type], damagePct: tc.hazardDamagePct, type: this.trial.type,
        });
      }
      this.hazardState = this.hazards.map((_, i) => ({ nextAt: 3500 + i * 900, warned: false, group: 0, spots: [], dir: 1 }));
      for (const r of lay.solids) {
        const z = this.add.zone(r.x + r.w / 2, r.y + r.h / 2, r.w, r.h);
        solids.add(z);
        if (r.hidden) this.hiddenWalls.set(z, { rect: r, flashUntil: 0 });
      }
      // trận huấn luyện viên: vòng xuất phát bên trái · ải thường: giữa sân (chỗ trống gần nhất)
      spawn = this.gym ? { ...this.gymPos.player } : this.freeSpot(this.worldW / 2 - (lab ? 120 : 0), this.worldH / 2 + 10, 14);
    } else {
      const map = generateForest();
      this.worldW = map.widthPx;
      this.worldH = map.heightPx;
      const built = buildForest(this, map);
      this.solidRects = built.rects;
      built.solids.getChildren().forEach((c) => solids.add(c));
      this.physics.world.setBounds(0, 0, map.widthPx, map.heightPx);
      spawn = map.spawn;
    }

    // ---- đội ----
    const team: PartyMember[] = cfg.kind === 'lab' ? [makeMember(cfg.speciesId, cfg.level)] : this.trial ? [this.trial.member] : this.stage ? battleTeam(game!) : [makeMember(SURVIVAL.starter, SURVIVAL.starterLevel)];
    // Skill Lab: không khóa · Sinh tồn: giữ luật cũ theo cấp · Ải / thử thách: học trước các chiêu đã đủ điều kiện ngoài trận (vd. vừa tiến hóa)
    const free = cfg.kind === 'lab' || cfg.kind === 'survival' || this.tutorial;
    const lockMode = cfg.kind === 'lab' || this.tutorial ? 'free' : cfg.kind === 'survival' ? 'level' : 'earned';
    const learnedAtStart: string[] = [];
    if (!free) {
      for (const m of team) {
        for (const slot of learnReady(m)) learnedAtStart.push(t('unlock.learnedToast', { name: POKEMON[m.speciesId].name, move: this.unlockMoveName(m, slot) }));
      }
    }
    for (const m of team) {
      const f = new Fighter(this, m, spawn.x, spawn.y, lockMode);
      f.onStep = (x, y) => this.fx.dustPuff(x, y, 2);
      this.physics.add.collider(f.zone, solids, (_a, b) => {
        // tường tàng hình: va vào thì hiện viền chốc lát
        const w = this.hiddenWalls.get(b as Phaser.GameObjects.GameObject);
        if (w && w.flashUntil < this.clock + 200) {
          w.flashUntil = this.clock + 900;
          playSfx('hit');
        }
      });
      this.fighters.push(f);
    }
    this.activeIdx = Math.max(0, this.fighters.findIndex((f) => !f.dead));
    if (learnedAtStart.length) this.time.delayedCall(900, () => !this.over && this.events.emit('toast', learnedAtStart.join('\n')));
    this.playerSpawn = { ...spawn };
    this.player.setOnField(true, spawn.x, spawn.y);
    this.player.faceTo(1, 0);

    this.physics.add.collider(this.enemyGroup, solids, undefined, (a) => {
      const e = this.zoneToEnemy.get(a as Phaser.GameObjects.GameObject);
      return !e?.isBoss && !e?.phasing;
    }, this);
    this.physics.add.collider(this.enemyGroup, this.enemyGroup);

    const cam = this.cameras.main;
    cam.setZoom(2);
    cam.setBounds(0, 0, this.worldW, this.worldH);
    cam.startFollow(this.player.zone, true, 0.12, 0.12);
    // sân to hơn màn hình: camera bám theo mượt, vùng chết nhỏ ở giữa để đi vòng vòng không rung hình
    if (this.config.kind !== 'survival') cam.setDeadzone(64, 40);
    cam.setRoundPixels(true);
    cam.setBackgroundColor(this.gym ? '#5a4632' : '#1f4a26');
    cam.fadeIn(300, 0, 0, 0);

    // ---- nhạc nền theo loại trận ----
    const kind = this.stage?.kind;
    playMusic(kind === 'champion' ? 'champion' : kind === 'league' ? 'league' : this.gym ? 'gym' : 'battle');

    // ---- đối thủ ----
    if (this.gym) {
      this.waveName = this.gym.title;
      this.placeGymTrainers(game?.avatar);
      // mở màn: thủ lĩnh chào → ném bóng → người chơi chọn Pokémon và ném bóng (GymIntroScene)
      const skip = (cfg.kind === 'stage' && cfg.skipIntro) || !!(window as unknown as { __skipIntro?: boolean }).__skipIntro;
      if (skip) this.queueGymPokemon(700);
      else {
        this.introActive = true;
        this.player.setOnField(false);
        cam.stopFollow();
        cam.centerOn(this.worldW / 2, this.worldH / 2);
        this.input.keyboard!.enabled = false;
      }
    } else if (this.trial) {
      this.waveName = '';
      this.time.delayedCall(500, () => !this.over && this.events.emit('banner', t('trial.intro', { s: SKILL_UNLOCK.trial.durationS, n: SKILL_UNLOCK.trial.kills })));
    } else if (this.stage) {
      if (!this.tutorial) this.startWave(0, 400);
    } else if (lab) {
      this.waveName = '';
      this.labResetDummies();
    } else {
      const params = new URLSearchParams(window.location.search);
      if (this.devMode && params.has('boss')) this.clock = BOSS.spawnAtMs - 3000;
    }

    // ---- điều khiển ----
    const kb = this.input.keyboard!;
    this.keys = kb.addKeys('W,A,S,D,UP,DOWN,LEFT,RIGHT,J,K,L,U,SPACE,Q,R,E,F,ONE,TWO,THREE', true) as Keys;
    kb.on('keydown-F', () => this.usePotion());
    for (const slot of SKILL_SLOTS) kb.on(`keydown-${SLOT_KEYS[slot]}`, () => (this.buffered[slot] = this.clock + INPUT_BUFFER_MS));
    kb.on('keydown-SPACE', () => (this.buffered.dash = this.clock + INPUT_BUFFER_MS));
    kb.on('keydown-Q', () => this.cycleSwitch());
    kb.on('keydown-ONE', () => this.switchTo(0));
    kb.on('keydown-TWO', () => this.switchTo(1));
    kb.on('keydown-THREE', () => this.switchTo(2));
    kb.on('keydown-E', () => this.throwBall());
    kb.on('keydown-Q', () => this.throwBall(true));
    kb.on('keydown-I', () => this.castUltimate());
    kb.on('keydown-R', () => {
      if (this.stage && !this.gym && !this.over) this.endStage('fled');
    });
    if (this.devMode) {
      kb.on('keydown-B', () => {
        if (this.config.kind === 'survival' && !this.bossSpawned && !this.over) this.clock = Math.max(this.clock, BOSS.spawnAtMs);
      });
    }
    this.input.mouse?.disableContextMenu();
    this.input.on(Phaser.Input.Events.POINTER_MOVE, () => (this.mouseSeen = true));
    this.input.on(Phaser.Input.Events.POINTER_DOWN, () => (this.mouseSeen = true));

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, this.cleanup, this);
    this.scene.launch('Hud');
    if (this.tutorial) this.scene.launch('Tutorial');
    if (this.introActive) this.scene.launch('GymIntro');
  }

  private cleanup() {
    this.input.keyboard?.removeAllListeners();
    this.input.removeAllListeners(Phaser.Input.Events.POINTER_MOVE);
    this.input.removeAllListeners(Phaser.Input.Events.POINTER_DOWN);
    this.input.setDefaultCursor('default');
    this.fx?.destroy();
    for (const e of this.enemies) e.destroy();
    this.enemies = [];
    this.zoneToEnemy.clear();
    this.orbs = [];
    for (const z of this.zones) z.gfx.destroy();
    this.zones = [];
    this.scheduled = [];
    this.clearFrameTasks();
  }

  /** Cầu nối cho nguyên mẫu chiêu: chỉ lộ những gì skills/archetypes.ts cần */
  private makeSkillHost(): SkillHost {
    // eslint-disable-next-line @typescript-eslint/no-this-alias
    const b = this;
    return {
      scene: this,
      get fx() { return b.fx; },
      get clock() { return b.clock; },
      get over() { return b.over; },
      get worldW() { return b.worldW; },
      get worldH() { return b.worldH; },
      get aimTarget() { return b.aimTarget; },
      enemies: () => [...b.enemies],
      schedule: (at, fn) => b.schedule(at, fn),
      addFrameTask: (ms, tick, done) => b.addFrameTask(ms, tick, done),
      damageEnemy: (e, m, amount, dx, dy, big, quiet) => b.damageEnemy(e, m, amount, dx, dy, big, quiet),
      stackMult: (f, m) => b.stackMult(f, m),
      hitStop: (ms) => b.hitStop(ms),
      armCounter: (ms, reduce, onHit) => {
        b.counter = { until: b.clock + ms, reduce, onHit, done: false };
      },
      setCounterBuff: (ms, mult) => {
        b.counterBuff = { until: b.clock + ms, mult };
        b.fx.floatingLabel(b.player.x, b.player.chestY - 28, t('battle.counterBuff'), '#ffd34a');
      },
      addZone: (z) => b.zones.push({ x: z.x, y: z.y, r: z.r, until: b.clock + z.ms, nextTick: b.clock + z.firstTickMs, move: z.move, power: z.power, gfx: b.add.graphics().setDepth(-2950), color: z.color }),
      spawnShot: (tex, x, y, vx, vy, r, dmg, life, spin) => b.playerShots.spawn(tex, x, y, vx, vy, r, dmg, life, spin),
      meleeSequence: (f, m, aim, mult) => b.meleeSequence(f, m, aim, mult),
    };
  }

  private clearFrameTasks() {
    for (const t of this.frameTasks) t.done?.();
    this.frameTasks = [];
    this.hitStopMs = 0;
    this.slowMoMs = 0;
    if (this.physics?.world) {
      this.physics.world.timeScale = 1;
      if (this.physics.world.isPaused) this.physics.world.resume();
    }
  }

  resetInput() {
    this.input.keyboard?.resetKeys();
    this.buffered = { J: 0, K: 0, L: 0, U: 0, dash: 0 };
  }

  // ======================================================================= vòng lặp

  update(_time: number, delta: number) {
    // khựng hình / chuyển động chậm (đếm theo thời gian thực, kể cả khi trận vừa kết thúc)
    if (this.hitStopMs > 0) {
      this.hitStopMs -= delta;
      if (this.hitStopMs > 0) return;
      if (this.physics.world.isPaused) this.physics.world.resume();
    }
    let dt = Math.min(delta, 50);
    if (this.slowMoMs > 0) {
      this.slowMoMs -= delta;
      if (this.slowMoMs > 0) dt *= FINISHER.timeScale;
      else this.physics.world.timeScale = 1;
    }
    if (this.over || !this.fighters.length) {
      this.evoAura?.setVisible(false);
      this.fx?.update(this.clock, dt);
      return;
    }
    if (this.introActive) {
      this.introTick(dt);
      return;
    }
    this.clock += dt;
    const clock = this.clock;
    const k = this.keys;
    const p = this.player;

    const move = {
      x: (k.D.isDown || k.RIGHT.isDown ? 1 : 0) - (k.A.isDown || k.LEFT.isDown ? 1 : 0),
      y: (k.S.isDown || k.DOWN.isDown ? 1 : 0) - (k.W.isDown || k.UP.isDown ? 1 : 0),
    };
    if (this.tutorial && (move.x || move.y)) this.tut.moved += (p.speed * dt) / 1000;
    if ((move.x || move.y) && legendOf(p.species.id)?.staticCharge) this.gainStatic((p.speed * dt) / 1000 * 0.3);
    const mode = getSettings().aimMode;
    this.syncCursor(mode);
    const pointer = this.input.activePointer;
    const useMouse = mode === 'mouse' && this.mouseSeen;
    let lookAt: { x: number; y: number } | null = null;
    if (useMouse) {
      pointer.updateWorldPoint(this.cameras.main);
      this.mouseWorld.set(pointer.worldX, pointer.worldY);
      lookAt = { x: this.mouseWorld.x - p.x, y: this.mouseWorld.y - p.chestY };
    }
    p.zoneSlow = this.inSlowZone(p.x, p.feetY) && !p.species.types.some((t) => this.slowImmune.includes(t)) ? 0.55 : 1;
    p.update(clock, dt, move, lookAt);
    this.updateEvoAura();
    // chơi bàn phím (chưa dùng chuột) thì tự khóa mục tiêu 360°, không bắn mù theo hướng quay
    this.updateAimTarget(useMouse ? 'mouse' : mode === 'mouse' ? 'auto' : mode);

    if ((k.SPACE.isDown || this.buffered.dash > clock) && p.ready('dash', clock)) {
      this.buffered.dash = 0;
      p.startDash(clock);
      if (legendOf(p.species.id)?.staticCharge) this.gainStatic(14);
      this.tut.dashes++;
      this.fx.dustPuff(p.x, p.feetY, 6);
      playSfx('dash');
    }
    const mouseDown: Partial<Record<SkillSlot, boolean>> = { J: useMouse && pointer.leftButtonDown(), K: useMouse && pointer.rightButtonDown() };
    for (const slot of SKILL_SLOTS) {
      const pressed = k[SLOT_KEYS[slot]].isDown || mouseDown[slot] || this.buffered[slot] > clock;
      // dưới đất (Đào Đất) thì không ra chiêu khác
      if (pressed && p.ready(slot, clock) && !p.isBurrowed(clock)) {
        // không đủ năng lượng: không ra chiêu, báo hiệu (có giới hạn tần suất)
        if (!p.canAfford(slot)) {
          this.buffered[slot] = 0;
          this.onEnergyDenied(p, slot);
          continue;
        }
        this.buffered[slot] = 0;
        const sk = p.skill(slot)!;
        p.spendEnergy(slot, clock);
        this.registerCombo(slot);
        this.tut.casts[slot] = (this.tut.casts[slot] ?? 0) + 1;
        if (slot === 'L' || slot === 'U') this.skillFlair(p, sk.move);
        this.castMove(p, slot, sk.move, this.aimDirection(p, sk.move.speed ?? 340), sk.spec);
        this.castRecoil(p, slot, sk.base);
        if (this.staticReady && slot !== 'J') {
          // Tích điện: chiêu này miễn phí + hồi chiêu giảm nửa
          this.staticReady = false;
          this.staticCharge = 0;
          p.energy = Math.min(p.energyMax, p.energy + sk.spec.cost);
          p.readyAt[slot] = clock + Math.max(0, p.readyAt[slot] - clock) * 0.5;
          this.fx.floatingLabel(p.x, p.chestY - 30, t('mech.staticOn'), '#ffe04a');
          scatterFx(this, 'spark', p.x, p.chestY, 8, 28, 0xffe04a, 1.2);
        }
      }
    }
    for (const f of this.fighters) if (!f.dead) f.regenEnergy(dt, clock);
    this.decayUlt(dt);
    if (this.config.kind === 'lab') this.labTick();
    this.updateSpray(p);
    this.runScheduled();
    this.runFrameTasks(dt);
    this.updateCombo();
    this.updateSpin(p);
    this.updateZones();
    this.updateHazards();
    this.tickStatuses();

    if (this.config.kind === 'survival') {
      this.updateSpawning();
      if (!this.bossSpawned && clock >= BOSS.spawnAtMs) this.spawnSurvivalBoss();
    } else {
      if (this.trial) this.trialTick();
      this.updatePending();
    }

    for (const e of this.enemies) {
      if (this.slowZones.length && !e.species.types.some((t) => this.slowImmune.includes(t)) && this.inSlowZone(e.x, e.feetY)) e.applySlow(0.55, 150, clock);
      e.update(this, dt);
    }
    // con tự gục trong lượt của nó (Voltorb tự nổ)
    for (const e of [...this.enemies]) if (e.dead) this.killEnemy(e);
    this.checkContactDamage();
    this.updateLegend();
    this.updateTypeMechanics();
    this.updateSwarm();
    this.updateCollisions();
    this.updateProjectiles(dt);
    this.updateOrbs(dt);
    this.fx.update(clock, dt);
    this.drawEnemyBars();
    this.drawEdgeArrows();
    this.checkFaints();
    this.checkEnd();
  }

  // ======================================================================= mở màn hội quán

  /** Hình thủ lĩnh đứng đầu phải sân, người chơi đầu trái (không có texture thì bỏ qua) */
  private placeGymTrainers(avatar?: string) {
    const lk = `trainer-${this.gym?.leaderSprite ?? ''}`;
    if (this.textures.exists(lk)) {
      this.leaderSprite = this.add.sprite(this.gymPos.leader.x, this.gymPos.leader.y, lk, 3).setOrigin(0.5, 1).setScale(TRAINER_SCALE).setDepth(this.gymPos.leader.y);
    }
    const pk = this.textures.exists(`trainer-${avatar}`) ? `trainer-${avatar}` : 'trainer-satoshi';
    if (this.textures.exists(pk)) {
      this.trainerSprite = this.add.sprite(this.gymPos.trainer.x, this.gymPos.trainer.y, pk, 6).setOrigin(0.5, 1).setScale(TRAINER_SCALE).setDepth(this.gymPos.trainer.y);
    }
  }

  /** Trong lúc mở màn: chỉ cập nhật hình (Pokémon đứng yên, không AI, đồng hồ trận dừng) */
  private introTick(dt: number) {
    this.fx.update(this.clock, dt);
    for (const e of this.enemies) {
      e.anim.loop('idle');
      e.anim.setDirFromVector(-1, 0);
      e.anim.place(e.x, e.feetY, false, dt);
      (e as unknown as { shadow: Phaser.GameObjects.Image }).shadow.setPosition(e.x, e.feetY);
    }
    const p = this.player;
    if (p.onField) p.update(this.clock, dt, { x: 0, y: 0 });
  }

  /** Thủ lĩnh ném bóng tới điểm ra sân; onOpen gọi khi bóng bật mở */
  leaderThrow(onOpen: () => void): BallThrow {
    const s = this.leaderSprite;
    const from = s ? { x: s.x - 7 * TRAINER_SCALE, y: s.y - 17 * TRAINER_SCALE } : { x: this.worldW + 12, y: this.gymPos.foe.y - 50 };
    if (s) trainerThrowPose(this, s, -1);
    return throwPokeball(this, this.fx, from, { x: this.gymPos.foe.x, y: this.gymPos.foe.y + 8 }, onOpen);
  }

  /** Mở màn: Pokémon kế tiếp của thủ lĩnh ra sân ngay (bóng đã mở) */
  introSendOut(): Enemy | null {
    if (!this.gym) return null;
    if (!this.enemies.length && !this.pending.length) this.queueGymPokemon(0);
    for (const p of this.pending) {
      p.thrown = true;
      p.at = Math.min(p.at, this.clock);
    }
    this.updatePending();
    return this.enemies[this.enemies.length - 1] ?? null;
  }

  /** Mở màn: Pokémon người chơi chọn ra sân tại điểm xuất phát */
  introSendFighter(index: number): Fighter {
    const ok = this.fighters[index] && !this.fighters[index].dead;
    const idx = ok ? index : Math.max(0, this.fighters.findIndex((f) => !f.dead));
    if (idx !== this.activeIdx) this.player.setOnField(false);
    this.activeIdx = idx;
    const f = this.player;
    if (!f.onField) f.setOnField(true, this.playerSpawn.x, this.playerSpawn.y);
    f.faceTo(1, 0);
    this.cameras.main.startFollow(f.zone, true, 0.12, 0.12);
    return f;
  }

  /** Kết thúc mở màn → bắt đầu đánh */
  endIntro() {
    if (!this.introActive) return;
    if (!this.player.onField) this.introSendFighter(this.activeIdx);
    if (!this.enemies.length) this.introSendOut();
    this.introActive = false;
    this.input.keyboard!.enabled = true;
    this.resetInput();
    this.switchReadyAt = 0;
    this.events.emit('banner', t('battle.intro.fight'));
  }

  /** Bỏ qua mở màn (Esc trong GymIntroScene, hoặc kiểm thử gọi trực tiếp) */
  skipIntro() {
    if (!this.introActive) return;
    if (this.scene.isActive('GymIntro')) (this.scene.get('GymIntro') as GymIntroScene).skip();
    else this.introSkipRequested = true;
  }

  // ======================================================================= phe ta

  aliveFighters(): Fighter[] {
    const p = this.player;
    return p && !p.dead && p.onField ? [p] : [];
  }

  targetFor(): Fighter | null {
    const p = this.player;
    return p && !p.dead && p.onField ? p : null;
  }

  /** Đổi Pokémon ra sân (1/2/3). Con mới xuất hiện tại chỗ con cũ. */
  switchTo(index: number, forced = false) {
    if (this.over || index === this.activeIdx) return;
    const f = this.fighters[index];
    if (!f || f.dead) return;
    if (!forced && this.clock < this.switchReadyAt) {
      this.events.emit('toast', t('battle.switchWait', { s: ((this.switchReadyAt - this.clock) / 1000).toFixed(1) }));
      return;
    }
    const old = this.player;
    const x = old.x;
    const y = old.y;
    old.setOnField(false);
    this.activeIdx = index;
    f.setOnField(true, x, y);
    f.faceTo(old.facing.x, old.facing.y);
    f.invulnUntil = this.clock + 500;
    this.switchReadyAt = this.clock + SWITCH.cooldownMs;
    this.cameras.main.startFollow(f.zone, true, 0.12, 0.12);
    this.aimTarget = null;
    this.resetInput();
    playSfx('swap');
    this.fx.puff('zappuff', f.x, f.chestY, 8);
    this.fx.floatingLabel(f.x, f.chestY - 22, t('battle.goOut', { name: f.species.name }), '#9fe08a');
    this.events.emit('swap', f.species.name);
  }

  private cycleSwitch() {
    const n = this.fighters.length;
    for (let i = 1; i < n; i++) {
      const idx = (this.activeIdx + i) % n;
      if (!this.fighters[idx].dead) {
        this.switchTo(idx);
        return;
      }
    }
  }

  private inSlowZone(x: number, y: number) {
    return this.slowZones.some((z) => x > z.x && x < z.x + z.w && y > z.y && y < z.y + z.h);
  }

  /** F: dùng Thuốc hồi máu cho con đang ra sân */
  usePotion() {
    const game = getGame();
    const p = this.player;
    if (this.over || !this.stage || !game || p.dead) return;
    if (this.clock < this.potionReadyAt) return;
    if (game.items.potion <= 0) {
      this.events.emit('toast', t('battle.noPotion'));
      return;
    }
    if (this.gym && this.potionsUsed >= TRAINER.potionLimit) {
      this.events.emit('toast', t('battle.potionLimit', { n: TRAINER.potionLimit }));
      return;
    }
    if (p.hp >= p.maxHp) {
      this.events.emit('toast', t('battle.hpFull'));
      return;
    }
    game.items.potion--;
    this.tut.potions++;
    this.potionsUsed++;
    this.potionReadyAt = this.clock + POTION.cooldownMs;
    const amount = Math.round(p.maxHp * POTION.healRatio);
    p.heal(amount);
    playSfx('heal');
    this.fx.puff('leafpuff', p.x, p.chestY, 10);
    this.fx.floatingLabel(p.x, p.chestY - 22, t('battle.hpPlus', { n: amount }), '#9fe08a');
  }

  // ======================================================================= ngắm

  private syncCursor(mode: AimMode) {
    if (mode === this.cursorMode) return;
    this.cursorMode = mode;
    this.input.setDefaultCursor(mode === 'mouse' ? 'crosshair' : 'default');
  }

  /**
   * Tự khóa mục tiêu: đang chạy thì chỉ khóa địch phía trước (nón AIM.coneHalfDeg quanh hướng quay); hai bên (tới AIM.sideHalfDeg)
   * vẫn khóa được nhưng bị trừ điểm; sau lưng thì không (trừ khi sát người < AIM.closeRange) → chạy trốn thì bắn về phía trước.
   * Đứng yên thì khóa mọi hướng như cũ.
   * Bỏ qua con đang choáng (để không lỡ tay hạ mất con định thu phục) trừ khi không còn con nào khác.
   */
  private updateAimTarget(mode: AimMode) {
    const p = this.player;
    let best: Enemy | null = null;
    if (mode === 'mouse' && !p.dead) {
      let bestD = AIM.mouseSnap + 1;
      for (const e of this.enemies) {
        if (!e.targetable) continue;
        const d = Math.max(0, Math.hypot(e.x - this.mouseWorld.x, e.centerY - this.mouseWorld.y) - e.radius);
        if (d < bestD) {
          bestD = d;
          best = e;
        }
      }
    } else if (mode === 'auto' && !p.dead) {
      const fAng = Math.atan2(p.facing.y, p.facing.x);
      const still = p.moveDir.lengthSq() === 0 && !p.isDashing;
      const score = (e: Enemy) => {
        if (!e.targetable) return Infinity;
        const dx = e.x - p.x;
        const dy = e.y - p.y;
        const d = Math.hypot(dx, dy);
        if (d > AIM.range) return Infinity;
        const off = Phaser.Math.RadToDeg(Math.abs(Phaser.Math.Angle.Wrap(Math.atan2(dy, dx) - fAng)));
        // khóa mục tiêu 360°: con gần nhất (kể cả đang dí sau lưng); phía trước chỉ được ưu tiên nhẹ
        void still;
        return d * (off > AIM.coneHalfDeg ? AIM.sidePenalty : 1) + (e.isStunned(this.clock) ? 1000 : 0);
      };
      let bestD = Infinity;
      for (const e of this.enemies) {
        const d = score(e);
        if (d < bestD) {
          bestD = d;
          best = e;
        }
      }
      const cur = this.aimTarget;
      if (cur && cur !== best && this.enemies.includes(cur)) {
        const curD = score(cur);
        if (curD < Infinity && bestD > curD * AIM.switchRatio) best = cur;
      }
    }
    this.aimTarget = best;
    p.aimDir.copy(this.aimDirection(p, 340));
    p.hasTarget = !!best || mode === 'mouse';
    if (best) {
      const pulse = 1 + Math.sin(this.clock / 90) * 0.08;
      const size = Math.max(1, (best.radius * 2 + 8) / 20);
      this.reticle.setVisible(true).setPosition(Math.round(best.x), Math.round(best.centerY)).setScale(size * pulse);
    } else {
      this.reticle.setVisible(false);
    }
  }

  private leadDir(f: Fighter, t: Enemy, projectileSpeed: number) {
    let tx = t.x;
    let ty = t.centerY;
    const d = Math.hypot(tx - f.x, ty - f.chestY);
    const lead = Number.isFinite(projectileSpeed) ? (d / projectileSpeed) * AIM.leadFactor : 0;
    tx += t.body.velocity.x * lead;
    ty += t.body.velocity.y * lead;
    const v = new Phaser.Math.Vector2(tx - f.x, ty - f.chestY);
    return v.lengthSq() > 0 ? v.normalize() : f.facing.clone();
  }

  private aimDirection(f: Fighter, projectileSpeed: number) {
    const t = this.aimTarget;
    if (t) return this.leadDir(f, t, projectileSpeed);
    if (getSettings().aimMode === 'mouse' && this.mouseSeen) {
      const v = new Phaser.Math.Vector2(this.mouseWorld.x - f.x, this.mouseWorld.y - f.chestY);
      if (v.lengthSq() > 4) return v.normalize();
    }
    return f.facing.clone();
  }

  // ======================================================================= chiêu thức

  private castMove(f: Fighter, slot: SkillSlot, m: MoveDef, dir: Phaser.Math.Vector2, spec?: SkillSpec) {
    f.use(slot, this.clock);
    // gắn ô + mã lần ra chiêu (bản sao { ...m } giữ nguyên) → hoàn năng lượng J, tuyệt chiêu chỉ từ K/L/U, Thông thạo
    if (m.castId === undefined) {
      const id = ++this.castSeq;
      m = { ...m, castSlot: slot, castId: id };
      this.casts.set(id, { slot, member: f.member, hit: new Set(), counted: false });
      if (this.casts.size > 300) this.casts.delete(this.casts.keys().next().value as number);
    }
    if (m.metronome) {
      // Phẩy Ngón Tay: tung ngẫu nhiên một chiêu khác (cùng cấp nâng cấp)
      f.playMove(m);
      const pick = slotScaledMove(upgradeMove(MOVES[Phaser.Utils.Array.GetRandom(METRONOME_POOL)], f.skill(slot)?.upgrade ?? 0), slot);
      this.fx.floatingLabel(f.x, f.chestY - 24, `${moveName(m)} → ${moveName(pick)}!`, '#ffb0f0');
      playSfx(m.sfx);
      const d = this.aimDirection(f, pick.speed ?? 340);
      this.schedule(this.clock + 220, () => {
        if (this.over || f.dead || !f.onField || f.isBurrowed(this.clock)) return;
        const cdUntil = f.readyAt[slot];
        this.castMove(f, slot, pick, d);
        f.readyAt[slot] = cdUntil;
      });
      return;
    }
    if (m.windupMs && !(m as MoveDef & { _charged?: boolean })._charged) {
      // gồng đòn: chậm lại, vòng sáng quanh người, hết thời gian mới tung chiêu
      f.faceTo(dir.x, dir.y);
      f.sprayUntil = this.clock + m.windupMs;
      f.sprayMove = { ...m, moveSlow: 0.25 };
      f.anim.playOnce('charge', m.windupMs);
      this.fx.addTelegraph({ kind: 'glow', target: f.zone, r: 22, start: this.clock, end: this.clock + m.windupMs, color: TYPE_COLOR[m.type], owner: f });
      this.fx.floatingLabel(f.x, f.chestY - 26, `${moveName(m)}...`, '#ffffff');
      const charged = { ...m, _charged: true } as MoveDef;
      this.schedule(this.clock + m.windupMs, () => {
        if (this.over || f.dead || !f.onField || f.isBurrowed(this.clock)) return;
        const cdUntil = f.readyAt[slot];
        this.castMove(f, slot, charged, this.aimDirection(f, m.speed ?? 340), spec);
        f.readyAt[slot] = cdUntil;
      });
      return;
    }
    if (m.kind !== 'buff') f.faceTo(dir.x, dir.y);
    playSfx(m.sfx);
    if (spec?.archetype) {
      // nguyên mẫu chiêu (skills/archetypes.ts) – tham số theo hệ / loài / bậc cấp
      castArchetype(this.skillHost, f, m, spec, dir);
      this.paySelfCost(f, m);
      return;
    }
    if (m.kind === 'projectile') this.castProjectile(f, m, dir);
    else if (m.kind === 'cone') this.castCone(f, m, dir);
    else if (m.kind === 'burst') this.castBurst(f, m);
    if (m.kind !== 'buff') this.paySelfCost(f, m);
    else if (m.blink) this.castBlink(f, m);
    else if (m.heal) {
      // tự hồi máu (có thể kèm cường hóa nếu chiêu có guard/evade)
      const amount = Math.round(f.maxHp * m.heal);
      f.heal(amount);
      if (m.guard || m.evade || m.reflect) f.startGuard(m, this.clock);
      else f.playMove(m);
      this.fx.puff('leafpuff', f.x, f.chestY, 10);
      this.fx.floatingLabel(f.x, f.chestY - 22, `${moveName(m)} +${amount}`, '#9fe08a');
    }
    else {
      f.startGuard(m, this.clock);
      this.fx.floatingLabel(f.x, f.chestY - 22, moveName(m), '#9ad0ff');
      this.fx.puff(m.evade ? 'psypuff' : 'bubblepuff', f.x, f.chestY, 8);
    }
  }

  // ======================================================================= liên hoàn & tuyệt chiêu

  /**
   * Chiêu khác ô với chiêu trước, trong COMBAT.combo.windowMs → liên hoàn +perStep sát thương mỗi bậc (tối đa +max).
   * J bắn liền nhau giữ chuỗi (không cộng bậc, không đứt) – J là đòn đệm giữa K/L/U.
   */
  private registerCombo(slot: SkillSlot) {
    const cfg = COMBAT.combo;
    const live = this.combo > 0 && this.clock - this.comboAt < cfg.windowMs;
    const before = this.combo;
    if (live && this.comboSlot !== slot) this.combo++;
    else if (!(live && slot === 'J')) this.combo = 1;
    this.comboSlot = slot;
    this.comboAt = this.clock;
    this.comboMult = 1 + Math.min(cfg.max, cfg.perStep * (this.combo - 1));
    if (this.combo > before && this.combo >= 2) this.events.emit('combo', this.combo, Math.round((this.comboMult - 1) * 100));
    if (this.combo > before && this.combo >= 3 && slot !== 'J') this.gainUlt(ULT_GAIN.combo);
  }

  /**
   * Sau khi ra chiêu: J đi chậm ngắn; K/L/U gồng ngắn (chậm hẳn) theo sức mạnh.
   * Chiêu tự cường hóa / dịch chuyển / đào đất / xoay tít không bị chậm.
   */
  private castRecoil(f: Fighter, slot: SkillSlot, base: MoveDef) {
    const cs = COMBAT.castSlow;
    if (slot === 'J') {
      f.applyCastSlow(cs.jMult, cs.jMs, this.clock);
      return;
    }
    if (base.kind === 'buff' || base.blink || base.burrowMs || base.spinMs) return;
    const ms = Phaser.Math.Clamp(cs.skillBaseMs + base.power * cs.skillMsPerPower, cs.skillMinMs, cs.skillMaxMs);
    f.applyCastSlow(cs.skillMult, ms, this.clock);
  }

  /** Bấm chiêu khi không đủ năng lượng: chữ nhỏ trên đầu + HUD chớp ô (giới hạn tần suất); lần đầu mỗi trận thì nhắc bằng toast */
  private onEnergyDenied(f: Fighter, slot: SkillSlot) {
    if (this.clock < this.energyCueAt) return;
    this.energyCueAt = this.clock + COMBAT.energy.deniedCueMs;
    this.fx.floatingLabel(f.x, f.chestY - 24, t('battle.noEnergy'), '#7ad8ff');
    playSfx('warn');
    this.events.emit('energy-denied', slot);
    if (!this.energyHinted) {
      this.energyHinted = true;
      this.events.emit('toast', t('battle.noEnergyHint'));
    }
  }

  /** Hết thời gian liên hoàn thì về hệ số 1 */
  private updateCombo() {
    if (this.combo && this.clock - this.comboAt > COMBAT.combo.windowMs) {
      this.combo = 0;
      this.comboMult = 1;
      this.comboSlot = null;
    }
  }

  /** Chiêu L/U: tên chiêu lớn, vòng sáng theo hệ, máy quay giật nhẹ */
  private skillFlair(f: Fighter, m: MoveDef) {
    this.events.emit('callout', moveName(m), TYPE_COLOR[m.type]);
    if (m.type === 'grass') leafBurst(this, f.x, f.feetY, 46, 8, ['leafA', 'leafB', 'petalP'], 480, 0.8);
    // Giác đấu / Băng: không dùng vòng tròn (giữ bản sắc hình dáng riêng của hệ)
    else if (m.type === 'fighting') impactRays(this, f.x, f.chestY, 10, 14, 34, 0xfff06a, 260);
    else if (m.type === 'ice') radialShards(this, f.x, f.feetY - 6, 8, 26);
    else if (legendOf(f.species.id) && m.type === 'fire') scatter(this, 'fireFeather', f.x, f.feetY - 4, 8, 34);
    else if (FLAIR_TEX[m.type]) scatter(this, FLAIR_TEX[m.type]!, f.x, f.feetY - 4, 8, 28);
    else {
      const ring = this.add.circle(f.x, f.feetY, 10, TYPE_COLOR[m.type], 0.25).setStrokeStyle(3, TYPE_COLOR[m.type], 1).setDepth(-2700);
      this.tweens.add({ targets: ring, scale: 5, alpha: 0, duration: 420, onComplete: () => ring.destroy() });
    }
    const cam = this.cameras.main;
    const z = cam.zoom;
    cam.zoomTo(z * 1.05, 70, 'Sine.easeOut', true);
    this.time.delayedCall(90, () => cam.zoomTo(z, 200, 'Sine.easeInOut', true));
  }

  private gainUlt(v: number) {
    const f = this.player;
    if (!f || f.dead || this.over) return;
    // dạng gốc chưa tiến hóa / chưa mở khóa: không có tuyệt chiêu → không tích năng lượng
    if (!this.ultOpen(f)) return;
    const before = f.ultCharge;
    f.ultCharge = Math.min(1, f.ultCharge + v * (legendOf(f.species.id)?.ultChargeMult ?? 1));
    if (before < 1 && f.ultCharge >= 1) {
      this.events.emit('toast', t('battle.ultReady', { name: ultName(f.species.types, f.species.id) }));
      playSfx('level');
    }
  }

  /** không gây sát thương quá ULT_PACING.decayAfterMs → thanh tuyệt chiêu giảm dần (không áp ở Skill Lab) */
  private decayUlt(dt: number) {
    const f = this.player;
    if (!f || this.config.kind === 'lab' || f.ultCharge <= 0) return;
    if (this.clock - this.lastDealtAt < ULT_PACING.decayAfterMs) return;
    f.ultCharge = Math.max(0, f.ultCharge - (ULT_PACING.decayPerSec * dt) / 1000);
  }

  /** Một đòn trúng địch: hoàn năng lượng J (1 lần / lần bắn × mục tiêu), Thông thạo (1 lần / lần ra chiêu) */
  private onCastHit(e: Enemy, m: MoveDef) {
    const c = m.castId !== undefined ? this.casts.get(m.castId) : undefined;
    if (!c || c.hit.has(e)) return;
    c.hit.add(e);
    if (c.slot === 'J' && this.labFreeEnergy !== true) {
      const f = this.fighters.find((x) => x.member === c.member);
      if (f && !f.dead) f.energy = Math.min(f.energyMax, f.energy + combatProfile().jHitRefund);
    }
    if (!c.counted && this.config.kind !== 'lab' && this.config.kind !== 'trial') {
      c.counted = true;
      addMastery(c.member, c.slot);
      const g = this.masteryGain.get(c.member) ?? {};
      g[c.slot] = (g[c.slot] ?? 0) + 1;
      this.masteryGain.set(c.member, g);
      if (c.slot === 'K') this.questEvent('castK', c.member);
      else if (c.slot === 'J') this.checkUnlockReady(c.member);
    }
  }

  /** I: tung tuyệt chiêu theo hệ chính của Pokémon đang ra sân */
  castUltimate() {
    const f = this.player;
    if (this.over || !f || f.dead || f.isBurrowed(this.clock)) return;
    // Skill Lab: I = tuyệt chiêu đầy ngay (kể cả dạng chưa tiến hóa, để xem trước)
    if (this.config.kind === 'lab') f.ultCharge = 1;
    else if (!hasUltimate(f.species.id)) {
      this.events.emit('toast', t('battle.ultLocked', { name: f.species.name }));
      return;
    } else if (!this.ultOpen(f)) {
      const u = slotUnlock(f.member, 'I');
      this.events.emit('toast', t('unlock.ultLockedToast', { req: u ? reqLine(u, f.member) : '' }));
      return;
    }
    // khóa sau lần tung trước (Skill Lab bỏ qua)
    if (this.config.kind !== 'lab' && this.clock < this.ultLockUntil) {
      this.events.emit('toast', t('battle.ultCooldown', { s: Math.ceil((this.ultLockUntil - this.clock) / 1000) }));
      return;
    }
    if (f.ultCharge < 1) {
      this.events.emit('toast', t('battle.ultNotReady', { pct: Math.floor(f.ultCharge * 100) }));
      return;
    }
    f.ultCharge = 0;
    this.ultLockUntil = this.clock + (legendOf(f.species.id)?.ultCooldownMs ?? ULT_PACING.cooldownMs);
    this.legendLiftPause = this.clock + 3200;
    const u = ultimateFor(f.species.types);
    const type = f.species.types[0];
    const mv: MoveDef = {
      id: 'ultimate', name: ultName(f.species.types, f.species.id), desc: u.desc, type, kind: 'burst', power: u.power, cooldownMs: 0, anim: 'charge', animMs: 600,
      sfx: 'thunder', knockback: u.pattern === 'wave' ? 420 : 160, icon: 'crown', particle: 'spark', status: u.status,
    };
    // cảnh cắt: địch khựng lại, người dùng bất tử trong lúc tung chiêu
    this.events.emit('ultimate', { name: ultName(f.species.types, f.species.id), species: f.species.id, color: TYPE_COLOR[type] });
    f.invulnUntil = Math.max(f.invulnUntil, this.clock + 1800);
    f.anim.playOnce('charge', 800);
    for (const e of this.enemies) if (e.targetable) e.applyStatus('paralyze', 1000, this.clock);
    playSfx('boss');
    const amount = u.power * f.power * ULT_PACING.powerMult;
    const style = resolveUlt(f.species.id, f.species.types);
    if (style) {
      // tuyệt chiêu riêng của loài (nguyên mẫu, xem skills/kits.ts → SPECIES_KITS[id].ult)
      playSfx('roar');
      this.schedule(this.clock + style.params.windupMs, () => castUltArchetype(this.skillHost, f, style, u, mv, amount));
      return;
    }
    this.schedule(this.clock + 800, () => {
      if (this.over) return;
      this.cameras.main.flash(260, (TYPE_COLOR[type] >> 16) & 255, (TYPE_COLOR[type] >> 8) & 255, TYPE_COLOR[type] & 255, false);
      this.fx.shake(0.016, 500);
      playSfx('thunder');
      if (u.pattern === 'storm') {
        const targets = this.enemies.filter((e) => e.targetable);
        targets.forEach((e, i) => {
          for (let h = 0; h < (u.hits ?? 1); h++) {
            this.schedule(this.clock + i * 70 + h * 280, () => {
              if (e.dead || !e.targetable) return;
              this.hazardFx(u.fx, e.x, e.y);
              this.damageEnemy(e, mv, amount, 0, 0, true);
            });
          }
        });
        // vài đòn rơi ngẫu nhiên cho đẹp
        for (let k = 0; k < 8; k++) this.schedule(this.clock + k * 60, () => this.hazardFx(u.fx, 60 + Math.random() * (this.worldW - 120), 60 + Math.random() * (this.worldH - 120)));
      } else if (u.pattern === 'wave') {
        const ring = this.add.circle(f.x, f.y, 20, TYPE_COLOR[type], 0.18).setStrokeStyle(8, TYPE_COLOR[type], 0.9).setDepth(-2700);
        this.tweens.add({ targets: ring, scale: 36, alpha: 0, duration: 900, onComplete: () => ring.destroy() });
        for (const e of this.enemies.filter((x) => x.targetable)) {
          const d = Math.hypot(e.x - f.x, e.y - f.y);
          this.schedule(this.clock + (d / 720) * 900, () => {
            if (e.dead || !e.targetable) return;
            this.hazardFx(u.fx, e.x, e.y);
            this.damageEnemy(e, mv, amount, (e.x - f.x) / (d || 1), (e.y - f.y) / (d || 1), true);
          });
        }
      } else {
        this.burstAt(f.x, f.y, 150, mv, amount);
        if (u.heal) {
          const h = Math.round(f.maxHp * u.heal);
          f.heal(h);
          this.fx.floatingLabel(f.x, f.chestY - 30, t('battle.hpPlus', { n: h }), '#9fe08a');
        }
      }
    });
  }

  // ======================================================================= việc mỗi khung, khựng hình, kết liễu

  private addFrameTask(ms: number, tick: (now: number, dt: number) => void, done?: () => void) {
    this.frameTasks.push({ until: this.clock + ms, tick, done });
  }

  private runFrameTasks(dt: number) {
    if (!this.frameTasks.length) return;
    const now = this.clock;
    for (const t of [...this.frameTasks]) {
      if (now >= t.until) {
        this.frameTasks.splice(this.frameTasks.indexOf(t), 1);
        t.done?.();
      } else t.tick(now, dt);
    }
  }

  /** khựng hình: dừng vật lý + logic trận trong ms (thời gian thực) */
  private hitStop(ms: number) {
    if (this.slowMoMs > 0) return;
    this.hitStopMs = Math.max(this.hitStopMs, ms);
    if (!this.physics.world.isPaused) this.physics.world.pause();
  }

  /** Đòn kết liễu boss / Pokémon của huấn luyện viên: chậm 0,6 s, vòng sáng, chữ KO! */
  private finisher(e: Enemy) {
    this.hitStopMs = 0;
    if (this.physics.world.isPaused) this.physics.world.resume();
    this.slowMoMs = FINISHER.slowMs;
    this.physics.world.timeScale = 1 / FINISHER.timeScale;
    const ring = this.add.circle(e.x, e.centerY, 14, 0xffffff, 0).setStrokeStyle(4, 0xffffff, 1).setDepth(100004);
    const ring2 = this.add.circle(e.x, e.centerY, 10, 0xffd34a, 0).setStrokeStyle(2, 0xffd34a, 1).setDepth(100004);
    this.tweens.add({ targets: ring, scale: 7, alpha: 0, duration: 620, ease: 'Cubic.out', onComplete: () => ring.destroy() });
    this.tweens.add({ targets: ring2, scale: 10, alpha: 0, delay: 80, duration: 700, ease: 'Cubic.out', onComplete: () => ring2.destroy() });
    this.cameras.main.flash(140, 255, 255, 255, false);
    this.fx.bigLabel(e.x, e.topY - 12, t('battle.ko'));
    playSfx('boom');
  }

  /** Hệ số tích lũy (Liên Trảm, Lăn Tròn): dùng liền nhau trong 2 giây thì mạnh dần */
  private stackMult(f: Fighter, m: MoveDef) {
    if (!m.stack) return 1;
    if (f.stackId === m.id && this.clock - f.stackAt < 2000) f.stackCount = Math.min(4, f.stackCount + 1);
    else f.stackCount = 0;
    f.stackId = m.id;
    f.stackAt = this.clock;
    const mult = 1 + f.stackCount * m.stack;
    if (f.stackCount > 0) this.fx.floatingLabel(f.x, f.chestY - 26, `×${tr(mult.toFixed(1), mult.toFixed(1).replace('.', ','))}`, '#ffd34a');
    return mult;
  }

  /** Điểm đặt chiêu "tại mục tiêu": mục tiêu đang khóa, hoặc phía trước mặt */
  private targetPoint(f: Fighter, ahead = 70) {
    const t = this.aimTarget;
    if (t && !t.dead) return { x: t.x, y: t.y };
    return { x: f.x + f.facing.x * ahead, y: f.y + f.facing.y * ahead };
  }

  private castProjectile(f: Fighter, m: MoveDef, dir: Phaser.Math.Vector2) {
    f.playMove(m);
    const n = m.count ?? 1;
    const base = Math.atan2(dir.y, dir.x);
    const spread = Phaser.Math.DegToRad(m.spreadDeg ?? 0);
    const speed = m.speed ?? 340;
    for (let i = 0; i < n; i++) {
      const a = base + (i - (n - 1) / 2) * spread;
      const vx = Math.cos(a);
      const vy = Math.sin(a);
      const shot = this.playerShots.spawn(m.texture ?? 'fireball', f.x + vx * 9, f.chestY + vy * 5, vx * speed, vy * speed, m.radius ?? 4, m.power * f.power, m.lifeMs ?? 700, m.spin ?? 0);
      shot.type = m.type;
      shot.knockback = m.knockback;
      shot.puff = m.particle ?? 'flamepuff';
      shot.move = m;
      if ((m.radius ?? 4) >= 7) shot.sprite.setScale(1.5);
      else shot.sprite.setScale(1);
    }
    this.fx.puff(m.particle ?? 'flamepuff', f.x + dir.x * 9, f.chestY + dir.y * 5, 2);
  }

  /** Chuỗi nhát cận chiến (hình quạt / đường thẳng, 1..n nhát) theo hướng aim, kèm đứng tấn + hạt phun */
  private meleeSequence(f: Fighter, m: MoveDef, aim: Phaser.Math.Vector2, mult: number) {
    f.startSpray(m, this.clock);
    this.nextJetAt.set(f, this.clock);
    const hits = m.randomHits ? Phaser.Math.Between(m.randomHits[0], m.randomHits[1]) : m.hits ?? 1;
    // khóa hướng trong suốt chuỗi đòn (không xoay theo hướng chạy)
    const gap = m.hitGapMs ?? 120;
    f.sprayUntil = Math.max(f.sprayUntil, this.clock + (hits - 1) * gap + 60);
    for (let i = 0; i < hits; i++) {
      const at = this.clock + i * gap;
      this.schedule(at, () => {
        if (this.over || f.dead || !f.onField || f.isBurrowed(this.clock)) return;
        f.faceTo(aim.x, aim.y);
        if (i > 0) f.playMove(m);
        if (m.line) this.lineStrike(f, m, mult);
        else this.coneStrike(f, m, mult);
        if (hits > 1) this.fx.floatingLabel(f.x + f.facing.x * 20, f.chestY - 10, `${i + 1}`, '#ffffff');
      });
    }
  }

  private castCone(f: Fighter, m: MoveDef, dir: Phaser.Math.Vector2) {
    const mult = this.stackMult(f, m);
    const aim = dir.clone();
    if (m.lunge) {
      // lao tới mục tiêu (dừng trước nó một chút) rồi mới đánh
      const t = this.aimTarget;
      const dist = t ? Phaser.Math.Clamp(Math.hypot(t.x - f.x, t.y - f.y) - t.radius - 8, 0, m.lunge) : m.lunge;
      const ms = 150;
      f.startLunge(dir, Math.max(8, dist), ms, this.clock);
      f.playMove(m);
      this.fx.dustPuff(f.x, f.feetY, 5);
      this.schedule(this.clock + ms, () => {
        if (this.over || f.dead || !f.onField || f.isBurrowed(this.clock)) return;
        f.faceTo(aim.x, aim.y);
        this.meleeSequence(f, m, aim, mult);
      });
      return;
    }
    this.meleeSequence(f, m, aim, mult);
  }

  /** Một nhát cận chiến hình quạt trước mặt */
  private coneStrike(f: Fighter, m: MoveDef, mult = 1) {
    const ang = Math.atan2(f.facing.y, f.facing.x);
    const range = m.range ?? 90;
    const half = Phaser.Math.DegToRad(m.halfAngleDeg ?? 30);
    this.drawCone(f.x, f.y, ang, range, half, TYPE_COLOR[m.type]);
    this.fx.shake(0.003, 120);
    for (const e of [...this.enemies]) {
      if (!e.targetable) continue;
      const dx = e.x - f.x;
      const dy = e.y - f.y;
      const d = Math.hypot(dx, dy);
      if (d > range + e.radius) continue;
      const diff = Math.abs(Phaser.Math.Angle.Wrap(Math.atan2(dy, dx) - ang));
      if (d > e.radius + 6 && diff > half) continue;
      this.damageEnemy(e, m, m.power * f.power * mult, dx / (d || 1), dy / (d || 1), true);
    }
  }

  /** Đòn quất thẳng (Roi Dây Leo): hình chữ nhật dài trước mặt */
  private lineStrike(f: Fighter, m: MoveDef, mult = 1) {
    const len = m.line ?? 100;
    const w = (m.lineWidth ?? 18) / 2;
    const fx = f.facing.x;
    const fy = f.facing.y;
    const g = this.coneGfx;
    g.clear();
    g.lineStyle(w * 1.2, TYPE_COLOR[m.type], 0.55);
    g.beginPath();
    g.moveTo(f.x, f.chestY);
    // roi uốn nhẹ cho có cảm giác quất
    const steps = 8;
    for (let i = 1; i <= steps; i++) {
      const t = i / steps;
      const wob = Math.sin(t * Math.PI) * 8 * (Math.random() > 0.5 ? 1 : -1) * 0.5;
      g.lineTo(f.x + fx * len * t - fy * wob, f.chestY + fy * len * t + fx * wob);
    }
    g.strokePath();
    g.setAlpha(1);
    this.tweens.killTweensOf(g);
    this.tweens.add({ targets: g, alpha: 0, duration: 220, onComplete: () => g.clear() });
    for (let i = 1; i <= 5; i++) this.fx.puff(m.particle ?? 'leafpuff', f.x + fx * len * (i / 5), f.chestY + fy * len * (i / 5), 1);
    for (const e of [...this.enemies]) {
      if (!e.targetable) continue;
      const rx = e.x - f.x;
      const ry = e.y - f.y;
      const along = rx * fx + ry * fy;
      const side = Math.abs(rx * -fy + ry * fx);
      if (along < -e.radius || along > len + e.radius || side > w + e.radius) continue;
      this.damageEnemy(e, m, m.power * f.power * mult, fx, fy, true);
    }
  }

  private castBurst(f: Fighter, m: MoveDef) {
    f.playMove(m);
    if (m.burrowMs) return this.castDig(f, m);
    if (m.spinMs) {
      f.startSpin(m, this.clock);
      this.fx.floatingLabel(f.x, f.chestY - 22, moveName(m), '#ffffff');
      return;
    }
    if (m.zone) return this.castZone(f, m);
    if (m.strikes) return this.castStrikes(f, m);
    if (m.chain) return this.castChainLightning(f, m);
    if (m.magnitude) {
      // Cường Độ 4–10: sức mạnh ×0,4–2 và vùng 50–122px
      const k = Phaser.Math.Between(4, 10);
      this.fx.floatingLabel(f.x, f.chestY - 26, t('battle.magnitude', { k }), k >= 9 ? '#ffd34a' : '#e0c080');
      this.burstAt(f.x, f.y, 50 + (k - 4) * 12, m, m.power * f.power * (0.4 + (k - 4) * 0.27));
      return;
    }
    const c = m.atTarget ? this.targetPoint(f) : { x: f.x, y: f.y };
    this.burstAt(c.x, c.y, m.burstRadius ?? 80, m, m.power * f.power);
  }

  /** Tự Nổ, Cuồng Hỏa...: mất một phần máu hiện tại nhưng không bao giờ tự gục */
  private paySelfCost(f: Fighter, m: MoveDef) {
    if (!m.selfCost || f.dead) return;
    const lost = Math.floor(f.hp * m.selfCost);
    if (lost <= 0) return;
    f.member.hp = Math.max(1, f.hp - lost);
    this.fx.floatingLabel(f.x, f.chestY - 26, t('battle.hpMinus', { n: lost }), '#ff8a8a');
    this.fx.puff(m.particle ?? 'flamepuff', f.x, f.chestY, 10);
    this.fx.shake(0.01, 220);
  }

  /** Dịch Chuyển: biến ra xa địch gần nhất (hoặc theo hướng đang chạy), không vào vật cản */
  private castBlink(f: Fighter, m: MoveDef) {
    const dist = m.blink ?? 120;
    const near = this.nearestEnemy(f.x, f.chestY, 400);
    const away = near ? new Phaser.Math.Vector2(f.x - near.x, f.y - near.y) : f.moveDir.lengthSq() > 0 ? f.moveDir.clone() : f.facing.clone().negate();
    if (away.lengthSq() < 1) away.set(0, 1);
    away.normalize();
    let tx = f.x;
    let ty = f.y;
    // thử vài góc lệch, chọn điểm hợp lệ xa nhất
    for (const off of [0, 0.5, -0.5, 1, -1, 1.6, -1.6]) {
      const a = Math.atan2(away.y, away.x) + off;
      for (let d = dist; d >= 30; d -= 15) {
        const x = Phaser.Math.Clamp(f.x + Math.cos(a) * d, 20, this.worldW - 20);
        const y = Phaser.Math.Clamp(f.y + Math.sin(a) * d, 20, this.worldH - 20);
        if (!circleHitsRects(this.solidRects, x, y, 8)) {
          tx = x;
          ty = y;
          break;
        }
      }
      if (tx !== f.x || ty !== f.y) break;
    }
    this.fx.puff('psypuff', f.x, f.chestY, 10);
    f.body.reset(tx, ty);
    f.invulnUntil = Math.max(f.invulnUntil, this.clock + 450);
    this.fx.puff('psypuff', tx, ty - 8, 10);
    this.fx.floatingLabel(tx, ty - 30, moveName(m), '#ffb0f0');
  }

  /** Sát thương vùng tròn tại (x, y) */
  private burstAt(x: number, y: number, r: number, m: MoveDef, amount: number, skip?: Enemy) {
    const ring = this.add.circle(x, y, r, TYPE_COLOR[m.type], 0.12).setStrokeStyle(2, TYPE_COLOR[m.type], 0.9).setDepth(-2900).setScale(0.3);
    this.tweens.add({ targets: ring, scale: 1, alpha: 0, duration: 320, onComplete: () => ring.destroy() });
    this.fx.shake(0.005, 160);
    for (const e of [...this.enemies]) {
      if (e === skip || !e.targetable) continue;
      const dx = e.x - x;
      const dy = e.y - y;
      const d = Math.hypot(dx, dy);
      if (d > r + e.radius) continue;
      this.fx.puff(m.particle ?? 'flamepuff', e.x, e.centerY, 4);
      this.damageEnemy(e, m, amount, dx / (d || 1), dy / (d || 1), true);
    }
    for (let i = 0; i < 10; i++) {
      const a = (i / 10) * Math.PI * 2;
      this.fx.puff(m.particle ?? 'flamepuff', x + Math.cos(a) * r * 0.6, y + Math.sin(a) * r * 0.6, 1);
    }
  }

  /** Sấm Sét: đánh mục tiêu gần nhất rồi lan sang các địch khác */
  private castChainLightning(f: Fighter, m: MoveDef) {
    const first = this.aimTarget && !this.aimTarget.dead ? this.aimTarget : this.nearestEnemy(f.x, f.y, 160);
    if (!first) {
      this.fx.lightning(f.x + f.facing.x * 30, f.y + f.facing.y * 30);
      return;
    }
    this.fx.shake(0.005, 160);
    this.fx.lightning(first.x, first.centerY);
    this.damageEnemy(first, m, m.power * f.power, 0, 0, true);
    this.chainFrom(first, m, m.power * f.power * 0.8, m.chain ?? 0);
  }

  /** Nảy sang N địch gần nhất chưa trúng (tia điện nối giữa hai con) */
  private chainFrom(from: Enemy, m: MoveDef, amount: number, n: number) {
    const hit = new Set<Enemy>([from]);
    let cur = { x: from.x, y: from.centerY };
    for (let i = 0; i < n; i++) {
      let best: Enemy | null = null;
      let bestD = 130;
      for (const e of this.enemies) {
        if (hit.has(e) || !e.targetable) continue;
        const d = Math.hypot(e.x - cur.x, e.centerY - cur.y);
        if (d < bestD) {
          bestD = d;
          best = e;
        }
      }
      if (!best) break;
      hit.add(best);
      const target = best;
      const start = cur;
      this.schedule(this.clock + 70 * (i + 1), () => {
        this.fx.arc(start.x, start.y, target.x, target.centerY, TYPE_COLOR[m.type]);
        if (!target.dead && !target.beingCaught) this.damageEnemy(target, m, amount, 0, 0);
      });
      cur = { x: best.x, y: best.centerY };
    }
  }

  /** Sấm Sét Lớn: nhiều tia sét giáng quanh mục tiêu */
  private castStrikes(f: Fighter, m: MoveDef) {
    const c = this.targetPoint(f);
    const n = m.strikes ?? 3;
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2 + Math.random();
      const r = i === 0 ? 0 : 26 + Math.random() * 12;
      const x = c.x + Math.cos(a) * r;
      const y = c.y + Math.sin(a) * r;
      this.fx.addTelegraph({ kind: 'circle', x, y, r: m.burstRadius ?? 40, start: this.clock, end: this.clock + 260 + i * 150, color: TYPE_COLOR[m.type], owner: f });
      this.schedule(this.clock + 260 + i * 150, () => {
        if (this.over) return;
        this.hazardFx(STRIKE_FX[m.type] ?? 'rock', x, y);
        this.burstAt(x, y, m.burstRadius ?? 40, m, m.power * f.power);
      });
    }
  }

  /** Đào Đất: chui xuống, đi được, rồi trồi lên hất tung */
  private castDig(f: Fighter, m: MoveDef) {
    const ms = m.burrowMs ?? 900;
    f.startBurrow(ms, this.clock);
    if (m.particle && m.particle !== 'dustpuff') this.fx.puff(m.particle, f.x, f.chestY, 10);
    else this.fx.dustPuff(f.x, f.feetY, 10);
    this.fx.floatingLabel(f.x, f.chestY - 22, `${moveName(m)}!`, '#e0c080');
    this.schedule(this.clock + ms, () => {
      if (f.dead || !f.onField) return;
      f.burrowUntil = 0;
      if (m.particle && m.particle !== 'dustpuff') this.fx.puff(m.particle, f.x, f.chestY, 14);
      else this.fx.dustPuff(f.x, f.feetY, 14);
      this.fx.shake(0.008, 200);
      f.anim.playOnce('attack', 300);
      this.burstAt(f.x, f.y, m.burstRadius ?? 66, m, m.power * f.power);
    });
  }

  /** Mây độc / bào tử: vùng tồn tại, gây sát thương và trạng thái theo nhịp */
  private castZone(f: Fighter, m: MoveDef) {
    const z = m.zone!;
    const c = this.targetPoint(f);
    const color = TYPE_COLOR[m.type];
    const gfx = this.add.graphics().setDepth(-2950);
    this.zones.push({ x: c.x, y: c.y, r: z.radius, until: this.clock + z.ms, nextTick: this.clock + 150, move: m, power: m.power * f.power, gfx, color });
    this.fx.puff(m.particle ?? 'poisonpuff', c.x, c.y, 12);
  }

  private updateZones() {
    for (let i = this.zones.length - 1; i >= 0; i--) {
      const z = this.zones[i];
      const left = z.until - this.clock;
      if (left <= 0) {
        z.gfx.destroy();
        this.zones.splice(i, 1);
        continue;
      }
      const fade = Math.min(1, left / 500);
      const pulse = 1 + Math.sin(this.clock / 160) * 0.04;
      z.gfx.clear();
      z.gfx.fillStyle(z.color, 0.22 * fade).fillCircle(z.x, z.y, z.r * pulse);
      z.gfx.lineStyle(2, z.color, 0.6 * fade).strokeCircle(z.x, z.y, z.r * pulse);
      if (this.clock < z.nextTick) continue;
      z.nextTick = this.clock + (z.move.zone?.tickMs ?? 450);
      for (let k = 0; k < 3; k++) {
        const a = Math.random() * Math.PI * 2;
        const r = Math.random() * z.r * 0.8;
        this.fx.puff(z.move.particle ?? 'poisonpuff', z.x + Math.cos(a) * r, z.y + Math.sin(a) * r, 1);
      }
      for (const e of [...this.enemies]) {
        // không đánh con đang choáng chờ bắt (nó không thể ra khỏi mây)
        if (!e.targetable || e.isStunned(this.clock)) continue;
        if (Math.hypot(e.x - z.x, e.y - z.y) > z.r + e.radius * 0.5) continue;
        this.damageEnemy(e, z.move, z.power, 0, 0, false, true);
      }
    }
  }

  // ======================================================================= bẫy sân đấu

  /** tạo lớp phủ bóng tối (lỗ sáng quanh người chơi) và lớp vẽ bẫy */
  private setupHazardLayers() {
    this.hazardGfx = this.add.graphics().setDepth(-2800);
    const dark = this.hazards.find((h) => h.kind === 'darkness');
    if (dark && dark.kind === 'darkness') {
      const key = `darkmask-${dark.radius}`;
      if (!this.textures.exists(key)) {
        const W = 1400;
        const H = 820;
        const tex = this.textures.createCanvas(key, W, H);
        if (tex) {
          const c = tex.getContext();
          c.fillStyle = 'rgba(6,4,14,0.94)';
          c.fillRect(0, 0, W, H);
          c.globalCompositeOperation = 'destination-out';
          const g = c.createRadialGradient(W / 2, H / 2, dark.radius * 0.55, W / 2, H / 2, dark.radius);
          g.addColorStop(0, 'rgba(0,0,0,1)');
          g.addColorStop(1, 'rgba(0,0,0,0)');
          c.fillStyle = g;
          c.beginPath();
          c.arc(W / 2, H / 2, dark.radius, 0, Math.PI * 2);
          c.fill();
          tex.refresh();
        }
      }
      this.darkMask = this.add.image(0, 0, key).setDepth(99985);
    }
  }

  private updateHazards() {
    if (!this.hazards.length) return;
    if (!this.hazardGfx) this.setupHazardLayers();
    const f = this.player;
    const g = this.hazardGfx!;
    g.clear();
    // tường tàng hình vừa va
    for (const w of this.hiddenWalls.values()) {
      if (this.clock >= w.flashUntil) continue;
      const a = (w.flashUntil - this.clock) / 900;
      g.fillStyle(0xa060e0, 0.25 * a).fillRect(w.rect.x, w.rect.y, w.rect.w, w.rect.h);
      g.lineStyle(2, 0xd0a0ff, a).strokeRect(w.rect.x, w.rect.y, w.rect.w, w.rect.h);
    }
    f.onIce = false;
    this.hazards.forEach((h, i) => {
      const st = this.hazardState[i];
      switch (h.kind) {
        case 'pulse': {
          const groups = Math.max(1, ...h.areas.map((a) => a.group + 1));
          const areas = h.areas.filter((a) => a.group === st.group);
          if (!st.warned && this.clock >= st.nextAt - h.warnMs) {
            st.warned = true;
            for (const a of areas) this.fx.addTelegraph({ kind: 'line', x: a.x, y: a.y + a.h / 2, angle: 0, len: a.w, width: a.h, start: this.clock, end: st.nextAt, color: h.color, owner: this.hazards });
            playSfx('warn');
          }
          if (this.clock < st.nextAt) break;
          for (const a of areas) for (let k = 0; k < 2; k++) this.hazardFx(h.fx, a.x + 12 + Math.random() * Math.max(1, a.w - 24), a.y + 10 + Math.random() * Math.max(1, a.h - 20));
          this.fx.shake(0.004, 120);
          if (areas.some((a) => f.x > a.x && f.x < a.x + a.w && f.feetY > a.y && f.feetY < a.y + a.h)) this.hazardHit(f, h, f.x, f.y - 10);
          st.group = (st.group + 1) % groups;
          st.nextAt = this.clock + h.periodMs;
          st.warned = false;
          break;
        }
        case 'rain': {
          if (!st.warned && this.clock >= st.nextAt - h.warnMs) {
            st.warned = true;
            st.spots = [];
            for (let k = 0; k < h.count; k++) {
              // một vòng ngay dưới chân, còn lại rải quanh
              const a = Math.random() * Math.PI * 2;
              const d = k === 0 ? 0 : 30 + Math.random() * 80;
              const x = Phaser.Math.Clamp(f.x + Math.cos(a) * d, 30, this.worldW - 30);
              const y = Phaser.Math.Clamp(f.y + Math.sin(a) * d, 30, this.worldH - 30);
              st.spots.push({ x, y });
              this.fx.addTelegraph({ kind: 'circle', x, y, r: h.radius, start: this.clock, end: st.nextAt, color: h.color, owner: this.hazards });
            }
            playSfx('warn');
          }
          if (this.clock < st.nextAt) break;
          for (const p of st.spots) this.hazardFx(h.fx, p.x, p.y);
          this.fx.shake(0.004, 120);
          const hit = st.spots.find((p) => Math.hypot(f.x - p.x, f.y - p.y) <= h.radius + 4);
          if (hit) this.hazardHit(f, h, hit.x, hit.y);
          st.nextAt = this.clock + h.periodMs;
          st.warned = false;
          break;
        }
        case 'teleport': {
          for (const pad of h.pads) {
            g.lineStyle(2, 0xf878f0, 0.5 + Math.sin(this.clock / 150) * 0.3).strokeCircle(pad.x, pad.y, pad.r);
          }
          if (this.clock < this.teleportReadyAt || f.dead || f.isBurrowed(this.clock)) break;
          const from = h.pads.findIndex((p) => Math.hypot(f.x - p.x, f.feetY - p.y) < p.r * 0.7);
          if (from >= 0) {
            const to = h.pads[h.pads[from].to];
            if (to) {
              this.fx.puff('psypuff', f.x, f.chestY, 10);
              f.body.reset(to.x, to.y - 4);
              f.invulnUntil = Math.max(f.invulnUntil, this.clock + 300);
              this.fx.puff('psypuff', to.x, to.y - 10, 10);
              playSfx('swap');
              this.teleportReadyAt = this.clock + 1100;
            }
          }
          break;
        }
        case 'ice': {
          if (h.areas.some((a) => f.x > a.x && f.x < a.x + a.w && f.feetY > a.y && f.feetY < a.y + a.h)) f.onIce = true;
          break;
        }
        case 'darkness': {
          this.darkMask?.setPosition(f.x, f.chestY);
          break;
        }
        case 'wind': {
          if (!st.warned && this.clock >= st.nextAt - h.warnMs) {
            st.warned = true;
            st.dir = Math.random() < 0.5 ? -1 : 1;
            this.fx.addTelegraph({ kind: 'line', x: st.dir > 0 ? 30 : this.worldW - 30, y: f.y, angle: st.dir > 0 ? 0 : Math.PI, len: this.worldW - 60, width: 40, start: this.clock, end: st.nextAt, color: 0xc0e0ff, owner: this.hazards });
            this.fx.floatingLabel(f.x, f.chestY - 30, st.dir > 0 ? t('battle.windRight') : t('battle.windLeft'), '#c0e0ff');
            playSfx('warn');
          }
          if (this.clock < st.nextAt) break;
          if (!f.isBurrowed(this.clock)) f.push.set(st.dir * h.force, 0);
          for (let k = 0; k < 8; k++) this.fx.jetOf('windpuff', st.dir > 0 ? 40 : this.worldW - 40, 40 + Math.random() * (this.worldH - 80), st.dir > 0 ? 0 : 180, 6, 2);
          playSfx('dash');
          st.nextAt = this.clock + h.periodMs;
          st.warned = false;
          break;
        }
      }
    });
  }

  /** hiệu ứng hình ảnh của bẫy */
  private hazardFx(kind: HazardFx, x: number, y: number) {
    switch (kind) {
      case 'lightning':
        this.fx.lightning(x, y);
        break;
      case 'flame':
        this.fx.flameBurst(x, y, 10);
        this.fx.puff('flamepuff', x, y, 6);
        break;
      case 'rock': {
        const img = this.add.image(x, y - 70, 'boulder').setDepth(y + 5).setOrigin(0.5, 1);
        this.tweens.add({ targets: img, y: y + 6, duration: 120, ease: 'Quad.in', onComplete: () => {
          this.fx.dustPuff(x, y, 8);
          this.tweens.add({ targets: img, alpha: 0, delay: 200, duration: 220, onComplete: () => img.destroy() });
        } });
        break;
      }
      default: {
        const tex: Record<HazardFx, string> = { lightning: 'zappuff', flame: 'flamepuff', rock: 'dustpuff', spore: 'leafpuff', ice: 'icepuff', shadow: 'shadowpuff', water: 'bubblepuff', psychic: 'psypuff', poison: 'poisonpuff' };
        this.fx.puff(tex[kind], x, y, 10);
      }
    }
  }

  /** người chơi dính bẫy: sát thương theo % máu (có khắc hệ) và làm chậm */
  private hazardHit(f: Fighter, h: HazardHit, x: number, y: number) {
    if (f.dead || !f.onField || f.isBurrowed(this.clock)) return;
    if (h.immuneTypes?.some((ty) => f.species.types.includes(ty))) {
      this.fx.floatingLabel(f.x, f.chestY - 20, t('battle.immune'), '#c0c0c0');
      return;
    }
    this.damageFighter(f, f.maxHp * h.damagePct, x, y, h.type);
    if (h.slowMs) f.applySlow(0.5, h.slowMs, this.clock);
  }

  /** Xoay Tốc Độ: sát thương theo nhịp quanh người khi đang xoay */
  private updateSpin(f: Fighter) {
    const m = f.spinMove;
    if (!m || !f.isSpinning(this.clock) || f.dead) return;
    if (this.clock < this.spinTickAt) return;
    this.spinTickAt = this.clock + 160;
    const r = m.burstRadius ?? 36;
    for (let i = 0; i < 4; i++) {
      const a = this.clock / 60 + (i / 4) * Math.PI * 2;
      this.fx.puff(m.particle ?? 'windpuff', f.x + Math.cos(a) * r * 0.7, f.y + Math.sin(a) * r * 0.5, 1);
    }
    for (const e of [...this.enemies]) {
      if (!e.targetable || e.isStunned(this.clock)) continue;
      const dx = e.x - f.x;
      const dy = e.y - f.y;
      const d = Math.hypot(dx, dy);
      if (d > r + e.radius) continue;
      this.damageEnemy(e, m, m.power * f.power, dx / (d || 1), dy / (d || 1), false, true);
    }
  }

  /** Bỏng / Độc / Hạt: mất máu theo nhịp 0,5 giây */
  private tickStatuses() {
    const clock = this.clock;
    for (const e of [...this.enemies]) {
      if (e.dead || e.beingCaught || clock < e.dotNextAt) continue;
      let dmg = 0;
      let color = '#ffffff';
      let heal = 0;
      for (const kind of ['burn', 'poison', 'seed'] as const) {
        const st = e.status[kind];
        if (!st || st.until <= clock) continue;
        dmg += st.power;
        color = STATUS_COLOR[kind];
        if (kind === 'seed') heal += st.power;
        this.fx.puff(kind === 'burn' ? 'flamepuff' : kind === 'poison' ? 'poisonpuff' : 'leafpuff', e.x, e.centerY, 2);
      }
      e.dotNextAt = clock + 500;
      if (e.hasStatus('paralyze', clock) && Math.random() < 0.5) this.fx.puff('zappuff', e.x, e.centerY, 2);
      if (e.hasStatus('confuse', clock)) this.fx.puff('psypuff', e.x, e.topY, 2);
      if (e.hasStatus('sleep', clock)) this.fx.puff('bubblepuff', e.x + 6, e.topY - 4, 1);
      if (e.hasStatus('freeze', clock)) this.fx.puff('icepuff', e.x, e.centerY, 2);
      if (dmg <= 0) continue;
      const amount = Math.max(1, Math.round(dmg));
      const wasStunned = e.isStunned(clock);
      e.hit(amount, 0, 0, 0, clock, false);
      this.notifyStun(e, wasStunned);
      this.fx.damageNumber(e.x, e.centerY - 8, amount, color);
      if (heal > 0 && !this.player.dead) {
        const h = Math.max(1, Math.round(heal * 0.8));
        this.player.heal(h);
        this.fx.drainPulse(e.x, e.centerY, this.player.x, this.player.chestY);
      }
      if (e.dead) this.killEnemy(e);
    }
  }

  /** Vừa bị choáng (máu thấp) → nhắc ném bóng, xóa cảnh báo đòn đang lấy đà */
  private notifyStun(e: Enemy, wasStunned: boolean) {
    if (wasStunned || !e.isStunned(this.clock)) return;
    this.fx.clearTelegraphsOf(e);
    this.events.emit('toast', t('battle.stunned', { name: e.species.name }));
    playSfx('warn');
  }

  private nearestEnemy(x: number, y: number, maxD: number, skip?: Set<unknown>) {
    let best: Enemy | null = null;
    let bestD = maxD;
    for (const e of this.enemies) {
      if (!e.targetable || skip?.has(e)) continue;
      const d = Math.hypot(e.x - x, e.centerY - y);
      if (d < bestD) {
        bestD = d;
        best = e;
      }
    }
    return best;
  }

  /** Hẹn giờ theo đồng hồ trận (dừng khi tạm dừng) */
  private schedule(at: number, fn: () => void) {
    this.scheduled.push({ at, fn });
  }

  private runScheduled() {
    if (!this.scheduled.length) return;
    const due = this.scheduled.filter((s) => s.at <= this.clock);
    if (!due.length) return;
    this.scheduled = this.scheduled.filter((s) => s.at > this.clock);
    for (const s of due) s.fn();
  }

  private updateSpray(f: Fighter) {
    if (this.clock >= f.sprayUntil || !f.sprayMove) return;
    if (f.sprayMove.line || f.sprayMove.lunge || f.sprayMove.hits || f.sprayMove.randomHits) return;
    if (this.clock < (this.nextJetAt.get(f) ?? 0)) return;
    this.nextJetAt.set(f, this.clock + 45);
    const m = f.sprayMove;
    const ang = Phaser.Math.RadToDeg(Math.atan2(f.facing.y, f.facing.x));
    this.fx.jetOf(m.particle ?? 'flamepuff', f.x + f.facing.x * 9, f.chestY + f.facing.y * 5, ang, (m.halfAngleDeg ?? 30) * 0.8, (m.range ?? 60) > 60 ? 7 : 4);
  }

  private drawCone(x: number, y: number, ang: number, range: number, half: number, color: number) {
    const g = this.coneGfx;
    g.clear();
    g.fillStyle(color, 0.28);
    g.slice(x, y, range, ang - half, ang + half, false);
    g.fillPath();
    g.setAlpha(1);
    this.tweens.killTweensOf(g);
    this.tweens.add({ targets: g, alpha: 0, duration: 260, onComplete: () => g.clear() });
  }

  /** quiet: nhịp sát thương nhỏ (mây, xoay) – không rung, không bật chữ khắc hệ liên tục */
  /** Huyền thoại: lơ lửng + hạt hào quang + lá chắn lục giác tự động (mỗi shieldEveryMs) */
  private updateLegend() {
    const p = this.player;
    const lg = p && !p.dead ? legendOf(p.species.id) : undefined;
    if (!lg) {
      if (this.legendGfx) {
        this.legendGfx.destroy();
        this.legendGfx = null;
      }
      this.legendShieldOn = false;
      return;
    }
    if (this.legendShieldAt === 0) this.legendShieldAt = this.clock + 3000;
    if (!this.legendShieldOn && lg.shieldEveryMs > 0 && this.clock >= this.legendShieldAt) {
      this.legendShieldOn = true;
      playSfx('swap');
    }
    if (this.clock >= this.legendLiftPause) p.anim.lift = lg.levitate + Math.sin(this.clock / 380) * 1.5;
    if (this.clock >= this.legendNextPuffAt) {
      this.legendNextPuffAt = this.clock + 110;
      this.fx.puff(lg.puff ?? 'psypuff', p.x + (Math.random() - 0.5) * 16, p.feetY - 8 - Math.random() * 26, 1);
    }
    if (!this.legendGfx) this.legendGfx = this.add.graphics().setDepth(99994);
    this.legendGfx.clear();
    if (this.legendShieldOn) {
      const sa = 0.55 + 0.25 * Math.sin(this.clock / 110);
      if (lg.shield === 'flame') flameMantle(this.legendGfx, p.x, p.chestY, this.clock, sa);
      else if (lg.shield === 'thunder') thunderMantle(this.legendGfx, p.x, p.chestY, this.clock, sa);
      else if (lg.shield === 'frost') frostMantle(this.legendGfx, p.x, p.chestY, this.clock, sa);
      else drawHexCluster(this.legendGfx, p.x, p.chestY, 8, lg.colors, 0.55 + 0.25 * Math.sin(this.clock / 110));
    }
  }

  /** Vụ nổ khi trúng nặng: đốm trắng sáng + tia tỏa mọi hướng (chí mạng = lớn, rất hiệu quả = vừa) */
  private impactFlash(x: number, y: number, k: number, tint: number) {
    const core = this.add.circle(x, y, 9 * k, 0xffffff, 0.95).setDepth(100000);
    const halo = this.add.circle(x, y, 15 * k, tint, 0.45).setDepth(99999);
    this.tweens.add({ targets: core, scale: 2.4, alpha: 0, duration: 200, onComplete: () => core.destroy() });
    this.tweens.add({ targets: halo, scale: 2.2, alpha: 0, duration: 260, onComplete: () => halo.destroy() });
    impactRays(this, x, y, k > 0.9 ? 14 : 9, 8 * k, 34 * k, 0xffffff, 240);
    if (k > 0.9) this.fx.shake(0.004, 90);
  }

  /** nhân sát thương theo cơ chế hệ (Cơn giận, Ăn mòn) + cộng dồn (Da đá, Độc) */
  private typeMechanicsOnHit(e: Enemy, m: MoveDef, amount: number, quiet: boolean): number {
    let k = 1;
    const now = this.clock;
    if (m.type === 'dragon') {
      if (now < this.furyUntil) k *= 1.6;
      else {
        this.furyHits += quiet ? 2 : 6;
        if (this.furyHits >= 100) {
          this.furyHits = 0;
          this.furyUntil = now + 4000;
          this.fx.floatingLabel(this.player.x, this.player.chestY - 30, t('battle.fury'), '#ff7a30');
          this.cameras.main.flash(120, 255, 120, 40, false);
          playSfx('roar');
        }
      }
    }
    if (m.type === 'rock' && !quiet && now >= this.armorGainAt) {
      this.armorGainAt = now + 250;
      this.armorUntil = now + 6000;
      if (this.armorStacks < 5) {
        this.armorStacks++;
        this.fx.floatingLabel(this.player.x, this.player.chestY - 26, `${t('battle.stoneSkin')} ×${this.armorStacks}`, '#c8b890');
        if (this.armorStacks === 5) this.fortress();
      }
    }
    if (m.type === 'bug' && !quiet && now >= this.swarmReadyAt && this.swarmBugs.length === 0) this.spawnSwarm();
    if (m.type === 'poison') {
      if (!quiet && e.toxic < 5) {
        e.toxic++;
        if (e.toxic === 5) this.fx.floatingLabel(e.x, e.topY - 16, t('battle.corrode'), '#c8e040');
      }
      if (!quiet) {
        e.toxicUntil = now + 5000;
        e.toxicDot = Math.max(e.toxicDot, amount * 0.1);
      }
    }
    if (e.toxic >= 5 && now < e.toxicUntil) k *= 1.2;
    return k;
  }

  /** Đá – Pháo đài: đủ 5 tầng Da đá → xung chấn đẩy lùi mọi địch gần */
  private fortress() {
    const p = this.player;
    this.fx.floatingLabel(p.x, p.chestY - 38, t('battle.fortress'), '#ffd34a');
    this.fx.shake(0.012, 260);
    this.fx.dustPuff(p.x, p.feetY, 8);
    playSfx('boom');
    const push: MoveDef = { ...MOVES.withdraw, id: 'fortress', type: 'rock', power: 0, knockback: 360, status: undefined, castSlot: undefined, shatterChild: true };
    for (const e of this.enemies) {
      if (e.dead || !e.targetable) continue;
      const dx = e.x - p.x;
      const dy = e.y - p.y;
      const d = Math.hypot(dx, dy / 0.8);
      if (d > 80 + e.radius) continue;
      this.damageEnemy(e, push, p.power * 10, dx / (d || 1), dy / (d || 1), true, true);
    }
  }

  /** hết hạn Da đá / Độc; độc cộng dồn gây sát thương mỗi giây theo số tầng */
  private updateTypeMechanics() {
    const now = this.clock;
    if (this.armorStacks && now >= this.armorUntil) this.armorStacks = 0;
    if (now < this.toxicTickAt) return;
    this.toxicTickAt = now + 1000;
    const tick: MoveDef = { ...MOVES.withdraw, id: 'toxicTick', type: 'poison', power: 0, knockback: 0, status: undefined, castSlot: undefined, shatterChild: true };
    for (const e of this.enemies) {
      if (e.dead || !e.toxic) continue;
      if (now >= e.toxicUntil) {
        e.toxic = 0;
        e.toxicDot = 0;
        continue;
      }
      this.damageEnemy(e, tick, e.toxicDot * e.toxic * 0.5, 0, 0, false, true);
    }
  }

  /** Giác đấu – Va chạm: địch đang bị đánh văng đâm vào địch khác → cả hai chịu sát thương */
  private updateCollisions() {
    for (const e of this.enemies) {
      if (e.dead || this.clock > e.bangUntil || e.knockSpeed < 70 || this.clock < e.bangHitAt) continue;
      for (const o of this.enemies) {
        if (o === e || o.dead || !o.targetable) continue;
        const dx = o.x - e.x;
        const dy = o.y - e.y;
        const d = Math.hypot(dx, dy / 0.8);
        if (d > e.radius + o.radius) continue;
        e.bangHitAt = this.clock + 350;
        const mv: MoveDef = { ...MOVES.withdraw, id: 'collision', type: 'fighting', power: 0, knockback: 120, status: undefined, castSlot: undefined, shatterChild: true };
        this.fx.floatingLabel(o.x, o.topY - 14, t('battle.collision'), '#ffb02a');
        powBurst(this, (o.x + e.x) / 2, (o.y + e.y) / 2 - 6, 14, 200);
        this.fx.shake(0.005, 100);
        this.damageEnemy(o, mv, e.bangAmount, dx / (d || 1), dy / (d || 1), true, true);
        this.damageEnemy(e, mv, e.bangAmount * 0.6, -dx / (d || 1), -dy / (d || 1), false, true);
        break;
      }
    }
  }

  /** Lạnh (hệ Băng): cộng dồn, địch chậm dần; đủ 3 điểm → Đóng băng (boss chỉ bị chậm) */
  private applyChill(e: Enemy, n: number) {
    if (e.dead) return;
    if (this.clock > e.chillUntil) e.chill = 0;
    e.chillUntil = this.clock + 3200;
    const before = Math.floor(e.chill);
    e.chill += n;
    e.applySlow(Math.max(0.5, 1 - 0.14 * e.chill), 1800, this.clock);
    if (e.chill >= 3) {
      e.chill = 0;
      if (e.applyStatus('freeze', 2400, this.clock)) {
        this.questEvent('freeze');
        this.fx.floatingLabel(e.x, e.topY - 16, t('battle.frozen'), '#9ae8ff');
        iceBlock(this, e, () => e.hasStatus('freeze', this.clock));
      }
    } else if (Math.floor(e.chill) > before) {
      this.fx.floatingLabel(e.x, e.topY - 16, t('battle.chill', { n: Math.floor(e.chill) }), '#bfefff');
    }
  }

  /** Vỡ nát: mảnh băng văng ra gây sát thương lan + cộng Lạnh cho địch bên cạnh */
  private iceShatter(e: Enemy, m: MoveDef, amount: number) {
    this.fx.floatingLabel(e.x, e.topY - 22, t('battle.shatter'), '#e8fbff');
    shardBurst(this.fx, e.x, e.centerY, 14);
    this.fx.shake(0.006, 120);
    const frag: MoveDef = { ...m, id: `${m.id}Frag`, status: undefined, knockback: 80, castSlot: undefined, shatterChild: true, chill: 0 };
    for (const o of this.enemies) {
      if (o === e || o.dead || !o.targetable) continue;
      const dx = o.x - e.x;
      const dy = o.y - e.y;
      const d = Math.hypot(dx, dy);
      if (d > 52) continue;
      this.damageEnemy(o, frag, amount * 0.5, dx / (d || 1), dy / (d || 1), false, true);
      this.applyChill(o, 1);
    }
  }

  private damageEnemy(e: Enemy, m: MoveDef, amount: number, dirX: number, dirY: number, big = false, quiet = false) {
    if (!e.targetable) return;
    let mult = m.fixedPerLevel ? 1 : effectiveness(m.type, e.species.types);
    // Thường – không bao giờ bị kháng (tối thiểu ×1)
    if (m.type === 'normal' && !m.fixedPerLevel) mult = Math.max(1, mult);
    // Sóng Âm: sát thương cố định theo cấp, không tính khắc hệ
    let raw = m.fixedPerLevel ? this.player.level * m.fixedPerLevel : amount * mult * (0.9 + Math.random() * 0.2);
    // chí mạng riêng của chiêu (×1.8), nếu trượt thì thử chí mạng của Pokémon (×1.5, Huấn luyện Chí mạng)
    const moveCrit = !!m.crit && Math.random() < m.crit;
    const statCrit = !moveCrit && !m.fixedPerLevel && Math.random() < this.player.crit;
    const crit = moveCrit || statCrit;
    if (moveCrit) raw *= 1.8;
    else if (statCrit) raw *= CRIT_MULT;
    raw *= this.comboMult * (SPECIES_DMG_MULT[this.player.species.id] ?? 1);
    const lgb = legendOf(this.player.species.id)?.lowHpBonus;
    if (lgb) raw *= 1 + lgb * (1 - this.player.hp / Math.max(1, this.player.maxHp));
    if (!m.shatterChild && m.id !== 'toxicTick') raw *= this.typeMechanicsOnHit(e, m, amount, quiet);
    const spread = legendOf(this.player.species.id)?.frostSpread;
    if (spread && m.type === 'ice' && !m.shatterChild && !quiet && Math.random() < spread) {
      const o = this.enemies.find((x) => x !== e && !x.dead && x.targetable && Math.hypot(x.x - e.x, x.y - e.y) < 80);
      if (o) {
        this.applyChill(o, 1);
        scatterFx(this, 'snowdot', o.x, o.centerY, 4, 18, undefined, 1);
      }
    }
    if ((m.castSlot === 'L' || m.castSlot === 'U') && this.clock < this.counterBuff.until) raw *= this.counterBuff.mult;
    // Giác đấu – Va chạm: bị đánh văng mạnh thì trong 0,45s đâm địch khác sẽ gây sát thương cho cả hai
    if (m.type === 'fighting' && !m.shatterChild && (m.knockback ?? 0) >= 150) {
      e.bangUntil = this.clock + 450;
      e.bangAmount = amount * 0.4;
    }
    // hệ Băng: đòn băng trúng địch ĐANG ĐÓNG BĂNG → VỠ NÁT (×1,6, mảnh băng văng sang địch bên cạnh)
    const iceMove = m.type === 'ice' && !m.shatterChild;
    const shatter = iceMove && e.hasStatus('freeze', this.clock);
    if (shatter) {
      raw *= 1.6;
      delete e.status.freeze;
      this.iceShatter(e, m, amount);
    }
    // tuyệt chiêu chỉ tích từ đòn K/L/U (J, tuyệt chiêu, phản đòn... không tích)
    this.lastDealtAt = this.clock;
    if (m.castSlot && m.castSlot !== 'J') this.gainUlt(quiet ? ULT_GAIN.hit * 0.3 : ULT_GAIN.hit);
    this.onCastHit(e, m);
    // đang Ngủ: đòn đầu tiên đánh thức và mạnh hơn
    // Đóng băng: đòn hệ Lửa làm tan băng
    if (e.hasStatus('freeze', this.clock) && m.type === 'fire') {
      delete e.status.freeze;
      this.fx.floatingLabel(e.x, e.topY - 16, t('battle.thawed'), '#ff9a50');
    }
    if (e.hasStatus('sleep', this.clock) && m.status?.kind !== 'sleep') {
      raw *= 1.5;
      delete e.status.sleep;
      this.fx.floatingLabel(e.x, e.topY - 16, t('battle.wokeUp'), '#a8c0ff');
    }
    if (m.money) {
      this.bonusMoney += m.money;
      if (this.clock >= this.moneyLabelAt) {
        this.moneyLabelAt = this.clock + 400;
        this.fx.floatingLabel(e.x + 10, e.centerY, `+${m.money}₽`, '#ffd34a');
      }
    }
    if (m.halveHp) raw = Math.max(raw, e.hp * (e.isBoss || e.trainer ? 0.2 : 0.5));
    const dmg = Math.max(1, Math.round(raw));
    const wasStunned = e.isStunned(this.clock);
    e.hit(dmg, dirX, dirY, m.knockback, this.clock, !quiet);
    if (iceMove && !shatter && !e.dead) this.applyChill(e, m.chill ?? 1);
    if (m.slow && !e.dead) e.applySlow(m.slow, 2000, this.clock);
    if (m.drain) this.player.heal(Math.round(dmg * m.drain));
    // nhiệm vụ mở khóa L (chỉ đòn của người chơi): hút máu, đẩy lùi, chí mạng, rất hiệu quả
    if (m.drain) this.questEvent('drain');
    if ((m.knockback ?? 0) >= SKILL_UNLOCK.knockbackMin) this.questEvent('knockback');
    if (crit) this.questEvent('crit');
    if (mult >= 2) this.questEvent('superEff');
    if (m.status && !e.dead && Math.random() < m.status.chance) {
      const st = m.status;
      // sát thương mỗi nhịp 0,5 s của Bỏng / Độc / Hạt
      const dot = st.kind === 'burn' || st.kind === 'poison' || st.kind === 'seed' ? Math.max(1, this.player.power * (st.kind === 'seed' ? 3.2 : 2.6) * mult) : 0;
      if (e.applyStatus(st.kind, st.ms, this.clock, dot)) {
        this.questEvent(st.kind === 'seed' ? 'drain' : st.kind);
        this.fx.floatingLabel(e.x, e.topY - 16, statusLabel(st.kind), STATUS_COLOR[st.kind]);
        if (st.kind === 'paralyze' || st.kind === 'confuse') this.fx.clearTelegraphsOf(e);
      }
    }
    if (!quiet) {
      this.fx.sparkBurst(e.x, e.centerY, big ? 6 : 8);
      this.fx.puff(m.particle ?? 'flamepuff', e.x, e.centerY, 2);
    }
    const color = crit ? '#ff7a3a' : mult >= 2 ? '#ffd34a' : mult < 1 ? '#b8b8b8' : big ? '#ffe9a0' : '#ffffff';
    this.fx.damageNumber(e.x, e.centerY - 8, dmg, color, (big || mult >= 2 || crit) && !quiet, crit && !quiet);
    if (crit && (moveCrit || !quiet)) this.fx.floatingLabel(e.x + 18, e.centerY - 26, t('battle.crit'), '#ffd34a');
    if ((crit && !quiet) || (big && !quiet && mult >= 2)) this.impactFlash(e.x, e.centerY - 4, crit ? 1 : 0.65, TYPE_COLOR[m.type]);
    const label = effLabel(mult);
    // nhãn khắc hệ: mỗi con 1,5 giây một lần, toàn sân tối đa ~3 nhãn mỗi giây
    if (label && !quiet && (this.labelCooldown.get(e) ?? 0) < this.clock && this.clock >= this.effLabelAt) {
      this.labelCooldown.set(e, this.clock + 1500);
      this.effLabelAt = this.clock + 350;
      this.fx.floatingLabel(e.x, e.topY - 10, label.text, label.color);
      if (mult >= 2) playSfx('super');
    }
    this.notifyStun(e, wasStunned);
    if (!quiet) playSfx('hit');
    if (e.dead) this.killEnemy(e);
  }

  private killEnemy(e: Enemy, byCatch = false) {
    this.kills++;
    if (!byCatch) this.tut.kills++;
    if (this.trial && !byCatch) this.trial.kills++;
    if (!byCatch) this.questEvent('kill');
    if (!byCatch && (e.isBoss || e.trainer)) {
      this.finisher(e);
      // đòn kết liễu tính cho điều kiện Tuyệt chiêu
      if (this.tracksUnlocks() && !this.player.dead) {
        addKo(this.player.member);
        this.checkUnlockReady(this.player.member);
      }
    }
    this.gainUlt(e.isBoss ? ULT_GAIN.bossKill : e.trainer ? ULT_GAIN.trainerKill : ULT_GAIN.kill);
    this.fx.sparkBurst(e.x, e.centerY, e.isBoss ? 40 : 12);
    this.fx.dustPuff(e.x, e.feetY, 6);
    this.fx.clearTelegraphsOf(e);
    const xp = e.xpYield * (this.stage ? STAGE_TUNING.xpMult : 1);
    if (byCatch) {
      this.awardXp(xp);
    } else {
      const pieces = e.isBoss || e.trainer ? 8 : xp >= 10 ? 2 : 1;
      for (let i = 0; i < pieces; i++) {
        const a = Math.random() * Math.PI * 2;
        const r = pieces > 1 ? 6 + Math.random() * 14 : 0;
        this.dropOrb(e.x + Math.cos(a) * r, e.y + Math.sin(a) * r, xp / pieces);
      }
    }
    if (this.aimTarget === e) this.aimTarget = null;
    this.zoneToEnemy.delete(e.zone);
    this.enemyGroup.remove(e.zone);
    this.enemies.splice(this.enemies.indexOf(e), 1);
    if (!e.isBoss && !e.trainer) {
      e.destroy();
      return;
    }
    this.fx.shake(0.01, 400);
    e.anim.playOnce('hurt', 700);
    this.tweens.add({ targets: e.sprite, alpha: 0, duration: 900, onComplete: () => e.destroy() });
    if (this.gym) this.queueGymPokemon(1400);
  }

  // ======================================================================= thu phục

  /** E: ném bóng rẻ nhất còn có · Q (best = true): ném bóng tốt nhất – vào con đang choáng gần nhất */
  throwBall(best = false) {
    const game = getGame();
    if (this.over || this.catching || !this.stage || !game) return;
    const p = this.player;
    if (p.dead) return;
    const targets = this.enemies.filter((e) => e.isStunned(this.clock) && !e.beingCaught && Math.hypot(e.x - p.x, e.y - p.y) < CATCH.throwRange);
    if (!targets.length) {
      this.events.emit('toast', this.gym ? t('battle.cantCatchGym') : t('battle.catchHint'));
      return;
    }
    const order = best ? [...CATCH.ballOrder].reverse() : [...CATCH.ballOrder];
    const ballKey = order.find((k) => game.items[k] > 0) ?? null;
    if (!ballKey) {
      this.events.emit('toast', t('battle.noBalls'));
      return;
    }
    const e = targets.sort((a, b) => Math.hypot(a.x - p.x, a.y - p.y) - Math.hypot(b.x - p.x, b.y - p.y))[0];
    game.items[ballKey]--;
    this.tut.throws++;
    const ball = CATCH.balls[ballKey];
    const chance = CATCH.chance(POKEMON[e.species.id].catchRate * (e.alpha ? STAGE_TUNING.alpha.catchMult : 1), e.hp / e.maxHp, ball.bonus);
    const success = Math.random() < chance;
    // 3 lần lắc nếu thành công; thất bại thì thoát ra sau 0–2 lần lắc
    const wobbles = success ? 3 : Math.floor(Math.random() * 3);
    this.catching = true;
    e.beingCaught = true;
    playSfx('dash');
    const img = this.add.image(p.x, p.chestY, 'icons', ball.texture).setDepth(100010);
    this.tweens.add({
      targets: img, x: e.x, duration: 320, ease: 'Linear',
      onUpdate: (tw) => (img.y = Phaser.Math.Linear(p.chestY, e.feetY - 6, tw.progress) - Math.sin(tw.progress * Math.PI) * 30),
      onComplete: () => {
        e.sprite.setAlpha(0);
        this.fx.sparkBurst(e.x, e.centerY, 10);
        this.wobble(img, wobbles, () => this.resolveCatch(e, img, success));
      },
    });
    this.events.emit('toast', t('battle.throw', { ball: itemName(ballKey), pct: Math.round(chance * 100) }));
  }

  private wobble(img: Phaser.GameObjects.Image, times: number, done: () => void) {
    if (times <= 0) {
      this.time.delayedCall(250, done);
      return;
    }
    this.tweens.add({
      targets: img, angle: { from: -25, to: 25 }, duration: CATCH.wobbleMs / 2, yoyo: true, delay: 150,
      onStart: () => playSfx('talk'),
      onComplete: () => {
        img.setAngle(0);
        this.wobble(img, times - 1, done);
      },
    });
  }

  private resolveCatch(e: Enemy, img: Phaser.GameObjects.Image, success: boolean) {
    this.catching = false;
    const game = getGame();
    if (!game || this.over) {
      img.destroy();
      return;
    }
    if (success) {
      playSfx('badge');
      this.fx.floatingLabel(e.x, e.topY - 6, t('battle.caught', { name: e.species.name }), '#9fe08a');
      this.tweens.add({ targets: img, y: img.y - 6, alpha: 0, delay: 400, duration: 500, onComplete: () => img.destroy() });
      this.tut.caught++;
      const m = makeMember(e.species.id, e.level);
      m.caughtAt = this.stage?.id;
      if (!this.tutReplay) addToBox(game, m);
      // loài mới (chưa có trong Pokédex): thưởng tiền theo cấp
      if (!dexOf(game).caught.includes(m.speciesId) && this.stage) {
        const bonus = STAGE_REWARD.newSpeciesPerLevel * e.level;
        this.newSpeciesMoney += bonus;
        this.fx.floatingLabel(e.x, e.topY - 22, t('battle.newSpeciesMoney', { n: bonus }), '#ffd34a');
        this.events.emit('toast', t('battle.newSpeciesMoney', { n: bonus }));
      }
      markCaught(game, m.speciesId);
      this.caught.push({ species: e.species.id, level: e.level });
      e.dead = true;
      this.killEnemy(e, true);
      this.events.emit('caught', e.species.name);
    } else {
      playSfx('hurt');
      this.fx.floatingLabel(e.x, e.topY - 6, t('battle.brokeFree'), '#ff9a7a');
      img.destroy();
      e.beingCaught = false;
      e.stunnedUntil = 0;
      e.sprite.setAlpha(1);
      this.fx.sparkBurst(e.x, e.centerY, 8);
    }
  }

  // ======================================================================= sát thương lên phe ta

  damageFighter(f: Fighter, amount: number, fromX: number, fromY: number, type: PokemonType) {
    if (this.over) return;
    // bài hướng dẫn: địch chỉ gây sát thương nhẹ và không bao giờ hạ gục
    if (this.tutorial) {
      if (f.hp <= f.maxHp * 0.3) return;
      amount *= 0.12;
    }
    if (!f.isInvulnerable(this.clock) && f.tryEvade(this.clock)) {
      // Thu Nhỏ: né hoàn toàn
      f.invulnUntil = this.clock + 250;
      this.fx.floatingLabel(f.x, f.chestY - 20, t('battle.dodge'), '#ffb0f0');
      return;
    }
    // Huyền thoại: lá chắn lục giác tự động hấp thụ hoàn toàn đòn kế tiếp, vỡ thì đẩy lùi địch gần
    const lg = legendOf(f.species.id);
    if (lg && f === this.player && this.legendShieldOn) {
      this.legendShieldOn = false;
      this.legendShieldAt = this.clock + lg.shieldEveryMs;
      const flame = lg.shield === 'flame';
      const thunder = lg.shield === 'thunder';
      const frost = lg.shield === 'frost';
      this.fx.floatingLabel(f.x, f.chestY - 24, flame ? t('battle.flameMantle') : thunder ? t('battle.thunderShell') : frost ? t('battle.frostShell') : t('battle.barrier'), flame ? '#ffb02a' : thunder ? '#ffe04a' : frost ? '#9ae8ff' : '#ff9ad0');
      if (thunder) {
        scatterFx(this, 'spark', f.x, f.chestY, 14, 46, 0xffe04a, 1.4);
        this.fx.shake(0.01, 140);
      } else if (frost) {
        scatterFx(this, 'snowdot', f.x, f.chestY, 14, 46, undefined, 1.4);
      } else if (flame) {
        scatterFx(this, 'fireFeather', f.x, f.chestY, 10, 44, undefined, 1.3);
        this.fx.fireHit(f.x, f.chestY, true);
      } else hexShatter(this, f.x, f.chestY, 18, lg.colors);
      this.fx.shake(0.008, 140);
      playSfx(flame ? 'flame' : thunder ? 'zap' : frost ? 'waterHi' : 'swap');
      const push: MoveDef = { ...MOVES.withdraw, id: 'legendBarrier', type: flame ? 'fire' : thunder ? 'electric' : frost ? 'ice' : 'psychic', power: 0, knockback: 280, status: undefined, castSlot: undefined, shatterChild: true };
      for (const e of this.enemies) {
        if (e.dead || !e.targetable) continue;
        const dx = e.x - f.x;
        const dy = e.y - f.y;
        const d = Math.hypot(dx, dy / 0.8);
        if (d > 70 + e.radius) continue;
        this.damageEnemy(e, push, f.power * 8, dx / (d || 1), dy / (d || 1), true, true);
        if (flame) e.applyStatus('burn', 3000, this.clock, f.power * 1.2);
        if (thunder) e.applyStatus('paralyze', 1500, this.clock);
        if (frost) e.applyStatus('freeze', 1600, this.clock);
      }
      return;
    }
    const mult = effectiveness(type, f.species.types);
    if (f === this.player && this.armorStacks && this.clock < this.armorUntil) amount *= 1 - 0.08 * this.armorStacks;
    // Phản Đòn: đang giữ thế đỡ → nhận ít sát thương hơn và phản lại
    if (this.counter && !this.counter.done && this.clock < this.counter.until && f === this.player) {
      amount *= this.counter.reduce;
      this.counter.done = true;
      const fn = this.counter.onHit;
      this.counter = null;
      this.fx.floatingLabel(f.x, f.chestY - 22, t('battle.counter'), '#ffd34a');
      fn();
    }
    // Huyền thoại – Tái Sinh: 1 lần mỗi trận, đòn sắp hạ gục → bùng cháy, hồi máu, đốt địch quanh
    if (lg?.rebirth && f === this.player && !this.rebirthUsed && !f.isInvulnerable(this.clock)) {
      const est = Math.max(1, Math.round(amount * mult * f.takenMult * (this.clock < f.guardUntil ? f.guardMult : 1)));
      if (est >= f.hp) {
        this.rebirthUsed = true;
        f.member.hp = Math.max(1, Math.round(f.maxHp * lg.rebirth));
        f.invulnUntil = this.clock + 1600;
        this.fx.floatingLabel(f.x, f.chestY - 34, t('battle.rebirth'), '#ffb02a');
        this.cameras.main.flash(260, 255, 160, 50, false);
        this.fx.shake(0.016, 320);
        playSfx('roar');
        scatterFx(this, 'fireFeather', f.x, f.chestY, 22, 80, undefined, 1.5);
        this.fx.fireHit(f.x, f.chestY, true);
        const blast: MoveDef = { ...MOVES.withdraw, id: 'rebirth', type: 'fire', power: 0, knockback: 360, status: undefined, castSlot: undefined, shatterChild: true };
        for (const e of this.enemies) {
          if (e.dead || !e.targetable) continue;
          const dx = e.x - f.x;
          const dy = e.y - f.y;
          const d = Math.hypot(dx, dy / 0.8);
          if (d > 110 + e.radius) continue;
          this.damageEnemy(e, blast, f.power * 14, dx / (d || 1), dy / (d || 1), true, true);
          e.applyStatus('burn', 4000, this.clock, f.power * 1.5);
        }
        return;
      }
    }
    const dmg = f.takeDamage(amount * mult, this.clock);
    if (!dmg) return;
    this.gainUlt(ULT_GAIN.hurt);
    this.fx.damageNumber(f.x, f.chestY - 14, dmg, '#ff5a5a', true);
    this.fx.sparkBurst(f.x, f.chestY, 6);
    this.fx.shake(0.006, 140);
    this.cameras.main.flash(90, 120, 0, 0, false);
    playSfx('hurt');
    const dx = f.x - fromX;
    const dy = f.y - fromY;
    const d = Math.hypot(dx, dy) || 1;
    if (!f.dead) {
      f.body.x += (dx / d) * 4;
      f.body.y += (dy / d) * 4;
    }
  }

  private checkContactDamage() {
    if (this.config.kind === 'lab') return;
    const f = this.player;
    if (!f || f.dead || f.isInvulnerable(this.clock)) return;
    for (const e of this.enemies) {
      if (e.beingCaught || e.disabled(this.clock)) continue;
      const dx = e.x - f.x;
      const dy = e.y - f.y;
      const r = e.radius + 10;
      if (dx * dx + dy * dy < r * r) {
        this.damageFighter(f, e.stats.contactDamage * e.dmgMult, e.x, e.y, 'normal');
        e.onContactHit(f.x, f.y);
        // Thủ Mai: phản đòn kẻ chạm vào
        if (f.reflect > 0 && this.clock < f.guardUntil && !e.dead) {
          const d = Math.hypot(dx, dy) || 1;
          this.fx.floatingLabel(e.x, e.topY - 8, t('battle.counter'), '#9ad0ff');
          this.damageEnemy(e, MOVES.withdraw, f.power * 14 * f.reflect, dx / d, dy / d, true);
        }
        break;
      }
    }
  }

  /** Con đang ra sân gục → ghi nhận, chờ một chút rồi tự đổi sang con còn đứng được */
  private checkFaints() {
    const p = this.player;
    if (p.dead && !this.faintAnnounced.has(p)) {
      this.faintAnnounced.add(p);
      this.fainted.add(p.member);
      playSfx('faint');
      this.events.emit('fainted', p.species.name);
      this.pendingSwitchAt = this.clock + SWITCH.faintDelayMs;
    }
    if (p.dead && this.pendingSwitchAt && this.clock >= this.pendingSwitchAt) {
      this.pendingSwitchAt = 0;
      const next = this.fighters.findIndex((f) => !f.dead);
      if (next >= 0) this.switchTo(next, true);
    }
  }

  private updateProjectiles(dt: number) {
    const rects = this.solidRects;
    this.playerShots.update(dt, (s) => {
      const mv = s.move;
      const sec = dt / 1000;
      // nguyên mẫu bolt: vệt sau đạn
      s.onFly?.(s);
      // Sao Băng: tự rẽ về phía địch gần nhất
      if (mv?.homing) {
        const t = this.nearestEnemy(s.x, s.y, 240, s.hit);
        if (t) {
          const want = Math.atan2(t.centerY - s.y, t.x - s.x);
          const cur = Math.atan2(s.vy, s.vx);
          const a = cur + Phaser.Math.Clamp(Phaser.Math.Angle.Wrap(want - cur), -mv.homing * sec, mv.homing * sec);
          const sp = Math.hypot(s.vx, s.vy);
          s.vx = Math.cos(a) * sp;
          s.vy = Math.sin(a) * sp;
        }
      }
      // Lá Sắc: bay ra một nửa thời gian rồi quay về người chơi
      if (mv?.boomerang) {
        if (!s.returning && s.age > (mv.lifeMs ?? 1200) * 0.4) {
          s.returning = true;
          s.hit.clear();
        }
        if (s.returning) {
          const p = this.player;
          const dx = p.x - s.x;
          const dy = p.chestY - s.y;
          const d = Math.hypot(dx, dy);
          if (d < 10 || p.dead) {
            this.playerShots.kill(s);
            return;
          }
          const sp = (mv.speed ?? 330) * 1.1;
          s.vx = (dx / d) * sp;
          s.vy = (dy / d) * sp;
        }
      }
      if (!mv?.boomerang && circleHitsRects(rects, s.x, s.y + 6, 2)) {
        this.fx.sparkBurst(s.x, s.y, 4);
        if (mv?.explode) this.burstAt(s.x, s.y, mv.explode, mv, s.damage * 0.7);
        this.playerShots.kill(s);
        return;
      }
      for (const e of this.enemies) {
        if (!e.targetable || s.hit.has(e)) continue;
        const top = e.topY - 2;
        const bottom = e.feetY + 3;
        if (Math.abs(e.x - s.x) < e.radius + s.radius + 2 && s.y > top && s.y < bottom) {
          const sp = Math.hypot(s.vx, s.vy) || 1;
          const m: MoveDef = mv ?? { id: 'shot', name: '', desc: '', type: s.type, kind: 'projectile', power: 0, cooldownMs: 0, anim: 'attack', animMs: 0, sfx: 'hit', knockback: s.knockback, icon: '', particle: s.puff };
          s.onHitFx?.(s);
          this.damageEnemy(e, m, s.damage, s.vx / sp, s.vy / sp);
          if (m.explode) this.burstAt(s.x, s.y, m.explode, m, s.damage * 0.7, e);
          if (m.chain) this.chainFrom(e, m, s.damage * 0.75, m.chain);
          if (m.pierce || m.boomerang) {
            s.hit.add(e);
            continue;
          }
          this.playerShots.kill(s);
          return;
        }
      }
    });

    this.enemyShots.update(dt, (s) => {
      if (circleHitsRects(rects, s.x, s.y + 6, 2)) {
        this.fx.dustPuff(s.x, s.y, 3);
        this.enemyShots.kill(s);
        return;
      }
      const f = this.player;
      if (!f || f.dead || !f.onField) return;
      const dx = f.x - s.x;
      const dy = f.chestY - s.y;
      const r = s.radius + 7;
      if (dx * dx + dy * dy < r * r && !f.isInvulnerable(this.clock)) {
        this.damageFighter(f, s.damage, s.x, s.y, s.type);
        this.enemyShots.kill(s);
      }
    });
  }

  // ======================================================================= kinh nghiệm

  private dropOrb(x: number, y: number, value: number) {
    const live = this.orbs.filter((o) => o.active);
    if (live.length >= CAPS.xpOrbs) {
      live[Math.floor(Math.random() * live.length)].value += value;
      return;
    }
    let o = this.orbs.find((x) => !x.active);
    if (!o) {
      o = { img: this.add.image(x, y, 'xp'), x, y, value, active: true, bornAt: this.clock };
      this.orbs.push(o);
    }
    o.active = true;
    o.x = x;
    o.y = y;
    o.value = value;
    o.bornAt = this.clock;
    o.img.setVisible(true).setPosition(x, y).setDepth(y - 2);
  }

  private updateOrbs(dt: number) {
    const f = this.player;
    if (!f || f.dead) return;
    for (const o of this.orbs) {
      if (!o.active) continue;
      const dx = f.x - o.x;
      const dy = f.y - o.y;
      const d = Math.hypot(dx, dy);
      if (d < PLAYER.pickupRadius) {
        o.active = false;
        o.img.setVisible(false);
        playSfx('pickup');
        this.awardXp(o.value);
        continue;
      }
      if (d < PLAYER.magnetRadius * 1.6) {
        const sp = (PLAYER.magnetSpeed * dt) / 1000;
        o.x += (dx / d) * sp;
        o.y += (dy / d) * sp;
      }
      o.img.setPosition(Math.round(o.x), Math.round(o.y + Math.sin((this.clock - o.bornAt) / 200) * 1.5)).setDepth(o.y - 2);
    }
  }

  /** Chỉ con đang ra sân (con thực sự chiến đấu) nhận EXP; con dự bị không được gì */
  private awardXp(value: number) {
    // Thử thách chiêu / bài hướng dẫn: không thưởng EXP
    if (this.trial || this.tutorial) return;
    const cap = this.stage ? levelCap() : 50;
    this.fighters.forEach((f, i) => {
      if (f.dead || i !== this.activeIdx) return;
      // Thông thái (Huấn luyện) tăng EXP
      const amount = Math.max(1, Math.round(value * f.xpMult));
      const m = f.member;
      const log = this.xpLog.get(m) ?? { name: f.species.name, xp: 0, from: m.level, fromXp: m.xp, moves: [] };
      log.xp += amount;
      this.xpLog.set(m, log);
      const wasReady = !!evolutionReady(m);
      const gained = gainXp(m, amount, cap);
      if (gained > 0) {
        f.refreshStats();
        playSfx('level');
        if (f.onField) {
          this.fx.floatingLabel(f.x, f.chestY - 22, t('battle.levelUp', { n: m.level }), '#ffd34a');
          this.fx.puff('zappuff', f.x, f.chestY, 10);
        }
        // chiêu mới không còn mở chỉ bằng cấp: đủ mọi điều kiện → toast "sẵn sàng học" (học khi hết trận)
        this.events.emit('levelup', f.species.name, m.level, undefined);
        if (this.tracksUnlocks()) this.checkUnlockReady(m);
        // vừa đủ cấp tiến hóa giữa trận → băng rôn + quầng sáng tới hết trận
        if (!wasReady && evolutionReady(m)) this.events.emit('evo-ready', f.species.name);
      }
    });
  }

  private collectAllOrbs() {
    let total = 0;
    for (const o of this.orbs) {
      if (!o.active) continue;
      total += o.value;
      o.active = false;
      o.img.setVisible(false);
    }
    if (total > 0) this.awardXp(total);
  }

  // ======================================================================= đối thủ

  private startWave(index: number, delay: number) {
    const waves = this.stage?.waves ?? [];
    if (index >= waves.length) return;
    this.waveIndex = index;
    this.waveName = t('battle.wave', { n: index + 1, total: waves.length });
    // chia đợt ra vài hướng cách đều quanh người chơi (bọc sườn), con kế tiếp sang hướng kế tiếp
    const n = STAGE_TUNING.spawnFlanks;
    const base = Math.random() * Math.PI * 2;
    waves[index].forEach((sp, i) => this.pending.push({
      species: sp.species, level: sp.level, alpha: sp.alpha, at: this.clock + delay + i * STAGE_TUNING.spawnGapMs,
      flank: base + ((i % n) / n) * Math.PI * 2,
    }));
    if (waves[index].some((sp) => sp.alpha)) this.time.delayedCall(delay + waves[index].length * STAGE_TUNING.spawnGapMs, () => !this.over && this.events.emit('banner', t('battle.alpha')));
    if (index > 0) this.events.emit('banner', this.waveName);
  }

  private queueGymPokemon(delay: number) {
    if (!this.gym || this.gymIndex >= this.gym.team.length) return;
    const p = this.gym.team[this.gymIndex];
    this.pending.push({ species: p.species, level: p.level, boss: p.boss, at: this.clock + delay, line: this.gym.sendOut[this.gymIndex] });
    this.gymIndex++;
  }

  private updatePending() {
    for (const p of [...this.pending]) {
      // thủ lĩnh ném bóng trước (~0,7 giây); Pokémon ra sân khi bóng bật mở
      if (this.gym && !p.thrown && this.clock >= p.at - 700) {
        p.thrown = true;
        p.at = Infinity;
        this.leaderThrow(() => (p.at = 0));
        continue;
      }
      if (this.clock < p.at) continue;
      this.pending.splice(this.pending.indexOf(p), 1);
      const trainer = !!this.gym;
      const pos = trainer ? { ...this.gymPos.foe } : this.findStageSpawn(p.flank);
      const e = p.boss ? new Boss(this, pos.x, pos.y, this.clock, p.level, trainer, p.species) : new Enemy(this, p.species, pos.x, pos.y, this.clock, p.level, trainer, p.alpha);
      markSeen(getGame(), p.species);
      e.catchable = !trainer && !!this.stage?.catchable?.includes(p.species);
      applyStageTuning(e, trainer ? STAGE_TUNING.gymHpMult : STAGE_TUNING.hpMult, STAGE_TUNING.dmgMult, STAGE_TUNING.rangedCooldownMult);
      // độ khó tăng dần theo thứ tự ải (ải đầu nhẹ hơn)
      if (this.stage) {
        const idx = STAGES.findIndex((st) => st.id === this.stage!.id);
        const r = stageRamp(idx, trainer);
        e.maxHp = e.hp = Math.max(1, Math.round(e.maxHp * r.hp));
        e.dmgMult *= r.dmg;
        e.rangedCdMult /= Math.max(0.5, r.dmg);
        if (!trainer && idx < STAGE_RAMP.wildSkillsFromIndex) e.skillsOff = true;
      }
      // Pokémon của thủ lĩnh: đánh đau hơn, ra đòn dồn dập hơn, chạy nhanh hơn (TRAINER)
      if (trainer) {
        const badges = getGame()?.badges.length ?? 0;
        e.maxHp = e.hp = Math.round(e.maxHp * (1 + TRAINER.perBadge.hp * badges));
        e.dmgMult *= TRAINER.dmgMult * (1 + TRAINER.perBadge.dmg * badges);
        e.rangedCdMult *= TRAINER.attackGapMult;
        e.attackGapMult = TRAINER.attackGapMult;
        e.speedMult = TRAINER.speedMult;
      } else if (!p.boss && !p.alpha) {
        // hoang dã thường chậm hơn một chút (sân ải rộng hơn); đầu đàn / boss giữ nguyên tốc độ
        e.speedMult = STAGE_TUNING.wildSpeedMult;
      }
      this.addEnemy(e);
      if (trainer) {
        this.boss = e;
        this.fx.shake(0.006, 300);
        playSfx(p.boss ? 'boss' : 'encounter');
        // mở màn tự hiện câu tung Pokémon trong hộp thoại
        if (!this.introActive) this.events.emit('banner', p.line ?? t('battle.enters', { name: e.species.name }));
        materialize(this, e.sprite, this.introActive);
        // giữa trận: syncVisual tô lại màu mỗi khung → chớp trắng bằng hitFlashUntil
        if (!this.introActive) (e as unknown as { hitFlashUntil: number }).hitFlashUntil = this.clock + 280;
      }
    }
    // hết đợt → đợt kế tiếp
    if (!this.gym && this.stage && this.enemies.length <= STAGE_TUNING.nextWaveAtLeft && this.pending.length === 0) {
      const waves = this.stage.waves ?? [];
      if (this.waveIndex < waves.length - 1) {
        if (!this.nextWaveAt) this.nextWaveAt = this.clock + 900;
        if (this.clock >= this.nextWaveAt) {
          this.nextWaveAt = 0;
          this.startWave(this.waveIndex + 1, 200);
        }
      }
    }
  }

  private updateSpawning() {
    const wave = waveAt(this.clock);
    const wName = survivalWaveName(wave.name);
    if (wName !== this.waveName) {
      this.waveName = wName;
      this.events.emit('wave', wName);
    }
    if (this.clock < this.nextSpawnAt) return;
    const rate = this.bossSpawned ? SPAWN.afterBossRateMult : 1;
    this.nextSpawnAt = this.clock + wave.intervalMs / rate;
    for (let i = 0; i < wave.batch; i++) {
      if (this.enemies.length >= SPAWN.maxEnemiesAlive) break;
      const pos = this.findSpawnPoint(14, SPAWN.minDistance, SPAWN.maxDistance);
      if (!pos) continue;
      this.addEnemy(new Enemy(this, pickWeighted(wave.weights), pos.x, pos.y, this.clock, wave.level));
    }
  }

  /** angle: hướng ưu tiên (bọc sườn) – thử quanh hướng đó trước, nới dần, rồi mới thử ngẫu nhiên */
  findSpawnPoint(radius: number, minD: number, maxD: number, angle?: number) {
    const p = this.player;
    const b = this.physics.world.bounds;
    const margin = 12;
    for (let i = 0; i < 40; i++) {
      const a = angle !== undefined && i < 24 ? angle + (Math.random() - 0.5) * (0.6 + i * 0.12) : Math.random() * Math.PI * 2;
      const r = minD + Math.random() * (maxD - minD);
      const x = p.x + Math.cos(a) * r;
      const y = p.y + Math.sin(a) * r;
      if (x < b.x + margin || y < b.y + margin || x > b.right - margin || y > b.bottom - margin) continue;
      if (circleHitsRects(this.solidRects, x, y, radius)) continue;
      return { x, y };
    }
    return null;
  }

  /** chỗ trống (không đè vật cản, trong biên vật lý) gần (x, y) nhất — dò theo vòng xoắn */
  private freeSpot(x: number, y: number, radius: number) {
    const b = this.physics.world.bounds;
    for (let r = 0; r < 200; r += 8) {
      const steps = r === 0 ? 1 : Math.ceil((Math.PI * 2 * r) / 10);
      for (let i = 0; i < steps; i++) {
        const a = (i / steps) * Math.PI * 2;
        const px = x + Math.cos(a) * r;
        const py = y + Math.sin(a) * r;
        if (px < b.x + radius || py < b.y + radius || px > b.right - radius || py > b.bottom - radius) continue;
        if (!circleHitsRects(this.solidRects, px, py, radius)) return { x: Math.round(px), y: Math.round(py) };
      }
    }
    return { x: Math.round(x), y: Math.round(y) };
  }

  /**
   * Điểm xuất hiện của địch trong ải: ngay ngoài khung camera theo hướng bọc sườn (đi vào màn hình sau ~1 giây),
   * hết chỗ thì sát mép sân, cuối cùng mới tới vòng quanh người chơi như cũ. Không bao giờ sát người chơi.
   */
  private findStageSpawn(flank?: number) {
    const p = this.player;
    const b = this.physics.world.bounds;
    const v = this.cameras.main.worldView;
    const margin = 14;
    const radius = 14;
    const ok = (x: number, y: number) =>
      x >= b.x + margin && y >= b.y + margin && x <= b.right - margin && y <= b.bottom - margin &&
      Math.hypot(x - p.x, y - p.y) >= 140 && !circleHitsRects(this.solidRects, x, y, radius);
    const outsideView = (x: number, y: number) => x < v.x - 6 || x > v.right + 6 || y < v.y - 6 || y > v.bottom + 6;
    // 1) theo hướng (bọc sườn), đi ra tới mép khung camera rồi thêm 16–70 px
    for (let i = 0; i < 36; i++) {
      const a = flank !== undefined && i < 24 ? flank + (Math.random() - 0.5) * (0.5 + i * 0.16) : Math.random() * Math.PI * 2;
      const cx = Math.cos(a);
      const cy = Math.sin(a);
      const tx = cx > 0 ? (v.right - p.x) / cx : cx < 0 ? (v.x - p.x) / cx : Infinity;
      const ty = cy > 0 ? (v.bottom - p.y) / cy : cy < 0 ? (v.y - p.y) / cy : Infinity;
      const d = Math.max(0, Math.min(tx, ty)) + 16 + Math.random() * 54;
      const x = p.x + cx * d;
      const y = p.y + cy * d;
      if (ok(x, y) && outsideView(x, y)) return { x, y };
    }
    // 2) mép sân (người chơi đứng sát góc: phía ngoài camera có thể hết chỗ)
    for (let i = 0; i < 40; i++) {
      const side = Math.floor(Math.random() * 4);
      const t = Math.random();
      const x = side < 2 ? b.x + margin + t * (b.width - margin * 2) : side === 2 ? b.x + margin + 4 : b.right - margin - 4;
      const y = side >= 2 ? b.y + margin + t * (b.height - margin * 2) : side === 0 ? b.y + margin + 4 : b.bottom - margin - 4;
      if (ok(x, y) && Math.hypot(x - p.x, y - p.y) >= 200) return { x, y };
    }
    return this.findSpawnPoint(radius, 160, 360, flank) ?? this.freeSpot(p.x < this.worldW / 2 ? b.right - 40 : b.x + 40, p.y, radius);
  }

  /** còn địch sống (cho TutorialScene) */
  enemiesAlive() {
    return this.enemies.some((e) => !e.dead && !e.beingCaught) || this.catching;
  }

  /** Bài hướng dẫn: đẻ 1 địch yếu quanh người chơi */
  tutSpawn(speciesId: string, opts: { hpRatio?: number; catchable?: boolean } = {}) {
    const p = this.player;
    const a = Math.random() * Math.PI * 2;
    const x = Phaser.Math.Clamp(p.x + Math.cos(a) * 130, 60, this.worldW - 60);
    const y = Phaser.Math.Clamp(p.y + Math.sin(a) * 90, 60, this.worldH - 60);
    const e = new Enemy(this, speciesId, x, y, this.clock, 4, false, false);
    e.maxHp = e.hp = 26;
    if (opts.hpRatio) e.hp = Math.max(1, Math.round(e.maxHp * opts.hpRatio));
    e.dmgMult *= 0.5;
    e.skillsOff = true;
    e.speedMult = 0.7;
    e.catchable = !!opts.catchable;
    markSeen(getGame(), speciesId);
    this.addEnemy(e);
    this.fx.puff('dustpuff', x, y + 6, 6);
    return e;
  }

  /** Bài hướng dẫn xong / bỏ qua: trả lại túi đồ, tặng quà (lần đầu), về bản đồ (lần đầu) hoặc Menu (xem lại) */
  finishTutorial(skipped: boolean) {
    if (!this.tutorial || this.over) return;
    const game = getGame();
    this.stopBattle();
    if (game && this.tutItems) {
      for (const k of Object.keys(this.tutItems)) game.items[k as keyof typeof game.items] = this.tutItems[k];
      if (!this.tutReplay && !skipped) {
        game.items.pokeball += 3;
        game.items.potion += 2;
        game.money += 300;
      }
      if (!this.tutReplay) game.flags.tutorialDone = true;
      saveGame();
    }
    const to = this.tutReplay ? 'Menu' : 'StageMap';
    this.scene.stop('Tutorial');
    this.scene.stop('Hud');
    this.scene.start(to, to === 'StageMap' ? { intro: true } : undefined);
  }

  private addEnemy(e: Enemy) {
    this.enemies.push(e);
    this.enemyGroup.add(e.zone);
    e.body.setCollideWorldBounds(true);
    this.zoneToEnemy.set(e.zone, e);
  }

  private spawnSurvivalBoss() {
    this.bossSpawned = true;
    const p = this.player;
    let pos = this.findSpawnPoint(26, SPAWN.minDistance, SPAWN.maxDistance);
    if (!pos) pos = { x: Phaser.Math.Clamp(p.x, 80, this.worldW - 80), y: Phaser.Math.Clamp(p.y - 200, 80, this.worldH - 80) };
    this.boss = new Boss(this, pos.x, pos.y, this.clock, SURVIVAL.bossLevel);
    this.addEnemy(this.boss);
    this.fx.shake(0.008, 600);
    playSfx('boss');
    this.events.emit('boss-spawn', this.boss.species.name);
  }

  /**
   * Mũi tên nhỏ sát mép màn hình chỉ về phía địch đang ở ngoài khung camera (ải / trận huấn luyện viên):
   * đỏ = địch thường, vàng to hơn = boss / đầu đàn / Pokémon của thủ lĩnh. Không vẽ ở Sinh tồn.
   */
  private drawEdgeArrows() {
    const g = this.arrowGfx;
    g.clear();
    if (this.config.kind === 'survival' || this.introActive || this.over) return;
    const cam = this.cameras.main;
    // đồ vật scrollFactor 0 trên camera zoom: toạ độ vẽ = toạ độ thế giới − scroll; khung nhìn = [ox, ox + w/zoom]
    const vw = cam.width / cam.zoom;
    const vh = cam.height / cam.zoom;
    const ox = (cam.width - vw) / 2;
    const oy = (cam.height - vh) / 2;
    const inset = 9;
    const cx = ox + vw / 2;
    const cy = oy + vh / 2;
    const pulse = 0.75 + 0.25 * Math.sin(this.clock / 160);
    // các khối HUD (toạ độ màn hình) → toạ độ vẽ; mũi tên bị đẩy ra khỏi chúng, trượt dọc mép an toàn
    const hud = this.scene.get('Hud') as HudScene | null;
    const pad = 7;
    const blocks = (hud && this.scene.isActive('Hud') ? hud.hudRects : []).map((r) => ({
      l: ox + r.x / cam.zoom - pad, t: oy + r.y / cam.zoom - pad, r: ox + r.right / cam.zoom + pad, b: oy + r.bottom / cam.zoom + pad,
    }));
    for (const e of this.enemies) {
      if (e.dead || e.beingCaught) continue;
      const sx = e.x - cam.scrollX;
      const sy = e.y - cam.scrollY;
      if (sx >= ox - 2 && sx <= ox + vw + 2 && sy >= oy - 8 && sy <= oy + vh + 4) continue;
      const big = e === this.boss || e.isBoss || e.alpha;
      const dx = sx - cx;
      const dy = sy - cy;
      // giao tia tâm→địch với khung thu vào inset px
      const hx = vw / 2 - inset;
      const hy = vh / 2 - inset;
      const t = Math.min(dx !== 0 ? hx / Math.abs(dx) : Infinity, dy !== 0 ? hy / Math.abs(dy) : Infinity);
      let ax = cx + dx * t;
      let ay = cy + dy * t;
      for (let pass = 0; pass < 3; pass++) {
        const k = blocks.find((q) => ax > q.l && ax < q.r && ay > q.t && ay < q.b);
        if (!k) break;
        // dịch ít nhất ra khỏi khối (vẫn trong khung nhìn)
        const opts = [
          { x: k.l, y: ay, ok: k.l > ox + inset }, { x: k.r, y: ay, ok: k.r < ox + vw - inset },
          { x: ax, y: k.t, ok: k.t > oy + inset }, { x: ax, y: k.b, ok: k.b < oy + vh - inset },
        ].filter((o) => o.ok);
        if (!opts.length) break;
        const best = opts.reduce((m, o) => (Math.hypot(o.x - ax, o.y - ay) < Math.hypot(m.x - ax, m.y - ay) ? o : m));
        ax = best.x;
        ay = best.y;
      }
      const a = Math.atan2(dy, dx);
      const len = big ? 9 : 7;
      const half = big ? 6 : 4.5;
      const tip = { x: ax + Math.cos(a) * len * 0.5, y: ay + Math.sin(a) * len * 0.5 };
      const bl = { x: ax - Math.cos(a) * len * 0.5 + Math.cos(a + Math.PI / 2) * half, y: ay - Math.sin(a) * len * 0.5 + Math.sin(a + Math.PI / 2) * half };
      const br = { x: ax - Math.cos(a) * len * 0.5 - Math.cos(a + Math.PI / 2) * half, y: ay - Math.sin(a) * len * 0.5 - Math.sin(a + Math.PI / 2) * half };
      // càng xa càng mờ một chút
      const far = Phaser.Math.Clamp(1 - (Math.hypot(dx, dy) - 400) / 900, 0.55, 1);
      g.lineStyle(big ? 2 : 1.5, 0x1a0808, 0.85 * far);
      g.fillStyle(big ? 0xffc830 : 0xff4040, (big ? pulse : 0.9) * far);
      g.fillTriangle(tip.x, tip.y, bl.x, bl.y, br.x, br.y);
      g.strokeTriangle(tip.x, tip.y, bl.x, bl.y, br.x, br.y);
    }
  }

  private drawEnemyBars() {
    const g = this.barGfx;
    g.clear();
    for (const e of this.enemies) {
      if (e === this.boss || e.dead || e.beingCaught) continue;
      if (this.config.kind === 'survival' && e.hp >= e.maxHp) continue;
      const w = e.alpha ? 30 : 18;
      const x = Math.round(e.x - w / 2);
      const y = Math.round(e.topY - 5);
      g.fillStyle(0x000000, 0.8);
      g.fillRect(x - 1, y - 1, w + 2, 4);
      const r = Phaser.Math.Clamp(e.hp / e.maxHp, 0, 1);
      g.fillStyle(e.isStunned(this.clock) ? 0xffd34a : r < 0.3 ? 0xff4040 : r < 0.6 ? 0xf0c040 : 0x60d060, 1);
      g.fillRect(x, y, Math.round(w * r), 2);
    }
  }

  // ======================================================================= kết thúc

  private checkEnd() {
    if (this.config.kind === 'lab' || this.tutorial) return;
    if (this.fighters.every((f) => f.dead)) {
      if (this.config.kind === 'survival') this.endSurvival(false);
      else this.endStage('lose');
      return;
    }
    if (this.config.kind === 'survival') {
      if (this.boss && this.boss.dead) this.endSurvival(true);
      return;
    }
    if (this.trial) {
      if (this.clock >= this.trial.durationMs) this.endTrial(this.trial.kills >= SKILL_UNLOCK.trial.kills ? 'win' : 'lose');
      return;
    }
    if (this.catching || this.enemies.length || this.pending.length) return;
    const waves = this.stage?.waves ?? [];
    const allWaves = this.gym ? this.gymIndex >= this.gym.team.length : this.waveIndex >= waves.length - 1;
    if (allWaves) this.endStage('win');
  }

  private stopBattle() {
    this.over = true;
    this.scheduled = [];
    // trận kết thúc khi đang dưới đất / đang xoay → hiện lại Pokémon
    for (const f of this.fighters) {
      f.burrowUntil = 0;
      f.spinUntil = 0;
      if (f.onField) f.anim.sprite.setVisible(true).setAlpha(1);
    }
    this.physics.pause();
    this.enemyShots.clear();
    this.playerShots.clear();
    this.reticle.setVisible(false);
  }

  private endSurvival(won: boolean) {
    if (this.over) return;
    this.stopBattle();
    playMusic(won ? 'victory' : 'map');
    playSfx(won ? 'win' : 'lose');
    const level = this.fighters[0].level;
    const { records, newBest, saved } = submitRun({ timeMs: this.clock, kills: this.kills, level, won });
    const info: GameOverInfo = { won, timeMs: this.clock, kills: this.kills, level, newBest, saved, records };
    this.events.emit('gameover', info);
  }

  /** Kết thúc ải: tính sao, thưởng, EXP, huy hiệu, bị thương; lưu game; báo HUD */
  endStage(result: StageEndInfo['result']) {
    if (this.over || !this.stage) return;
    if (this.trial) return this.endTrial(result);
    const game = getGame() as GameState;
    if (result === 'win') this.collectAllOrbs();
    this.stopBattle();
    const st = this.stage;
    const info: StageEndInfo = {
      result,
      title: result === 'win' ? (this.gym ? t('battle.title.beat', { name: this.gym.leader }) : t('battle.title.win')) : result === 'lose' ? t('battle.title.lose') : t('battle.title.fled'),
      stars: 0, starReasons: [], money: 0, balls: 0, xpLines: [], caught: this.caught.map((c) => `${POKEMON[c.species].name} Lv${c.level}`),
      notes: [], evolutions: [], xpCards: [], mastery: this.masteryLines(), newSpeciesMoney: this.newSpeciesMoney,
    };
    for (const [m, log] of this.xpLog) {
      info.xpLines.push(m.level > log.from ? `${log.name} +${log.xp} EXP · Lv ${log.from} → ${m.level}` : `${log.name} +${log.xp} EXP`);
      info.xpCards.push({ uid: m.uid, species: m.speciesId, name: log.name, gained: log.xp, fromLevel: log.from, fromXp: log.fromXp, toLevel: m.level, toXp: m.xp, moves: log.moves });
    }
    const cap = levelCap(game);
    const capNote = t('battle.note.cap', { cap });
    if (this.fighters.some((f) => f.level >= cap)) info.notes.push(capNote);

    if (result === 'win') {
      playSfx('win');
      const noFaint = this.fainted.size === 0;
      const fast = this.clock <= (st.parTimeS ?? 90) * 1000;
      info.stars = 1 + (noFaint ? 1 : 0) + (fast ? 1 : 0);
      info.starReasons = [t('battle.star.clear'), noFaint ? t('battle.star.noFaint') : t('battle.star.faint'), t(fast ? 'battle.star.fast' : 'battle.star.slow', { s: st.parTimeS ?? 90 })];
      const rec = game.stages[st.id] ?? { stars: 0, clears: 0, bestTimeMs: 0 };
      const first = rec.clears === 0;
      // đánh lại ải đã thắng chỉ được ~30% (STAGE_REWARD) → không cày tiền
      info.money = Math.round((st.money ?? 100) * STAGE_REWARD.moneyMult * (1 + ECONOMY.starBonus * (info.stars - 1)) * (first ? STAGE_REWARD.firstClearMult : STAGE_REWARD.replayMult));
      info.balls = first ? st.ballsFirstClear ?? 0 : info.stars >= 3 ? STAGE_REWARD.replay3StarBalls : 0;
      if (first && st.itemFirstClear) {
        game.items[st.itemFirstClear.item] += 1;
        info.notes.push(t('battle.note.item', { item: itemName(st.itemFirstClear.item) }));
      }
      if (this.bonusMoney > 0) {
        info.money += this.bonusMoney;
        info.notes.push(t('battle.note.payDay', { n: this.bonusMoney }));
      }
      if (this.newSpeciesMoney > 0) {
        info.money += this.newSpeciesMoney;
        info.notes.push(t('battle.note.newSpecies', { n: this.newSpeciesMoney }));
      }
      game.money += info.money;
      game.items.pokeball += info.balls;
      rec.clears++;
      rec.stars = Math.max(rec.stars, info.stars);
      rec.bestTimeMs = rec.bestTimeMs ? Math.min(rec.bestTimeMs, this.clock) : this.clock;
      game.stages[st.id] = rec;
      if (st.kind === 'champion') {
        const firstTitle = !game.flags.champion;
        game.flags.champion = true;
        if (firstTitle) info.notes.push(t('battle.note.champion'));
      }
      if (this.gym && this.gym.badgeId && !game.badges.includes(this.gym.badgeId)) {
        game.badges.push(this.gym.badgeId);
        const b = BADGES[this.gym.badgeId];
        info.badge = { name: badgeName(this.gym.badgeId, b.name), texture: b.texture };
        info.notes = info.notes.filter((n) => n !== capNote);
        info.notes.push(t('battle.note.capUp', { n: levelCap(game) }));
        if (this.gym.reward) {
          game.items[this.gym.reward.item] += 1;
          info.notes.push(t('battle.note.item', { item: itemName(this.gym.reward.item) }));
        }
        playSfx('badge');
      }
    } else {
      playSfx(result === 'lose' ? 'lose' : 'select');
      // thua / bỏ chạy vẫn giữ con đã bắt → vẫn nhận thưởng loài mới
      if (this.newSpeciesMoney > 0) {
        info.money = this.newSpeciesMoney;
        game.money += info.money;
        info.notes.push(t('battle.note.newSpecies', { n: this.newSpeciesMoney }));
      }
    }

    // Hội quán: con nào gục thì bị thương (tốn tiền chăm sóc). Ải thường: hồi đầy cả đội.
    if (this.gym) {
      for (const m of this.fainted) {
        m.injured = true;
        info.notes.push(t('battle.note.injured', { name: POKEMON[m.speciesId].name }));
      }
    }
    // thắng thủ lĩnh / Tứ Thiên Vương / Shigeru: tính cho điều kiện Tuyệt chiêu của mọi con trong đội
    if (result === 'win' && this.gym) for (const f of this.fighters) addBigWin(f.member);
    this.learnAfterBattle(info);
    healTeam(game);
    const evoCandidates = [...this.fighters.map((f) => f.member), ...game.box.filter((m) => m.caughtAt === st.id && this.caught.length)];
    for (const m of evoCandidates) {
      const into = evolutionReady(m);
      if (into && !info.evolutions.some((e) => e.uid === m.uid)) info.evolutions.push({ uid: m.uid, from: m.speciesId, into });
    }
    game.cursor = st.id;
    saveGame();
    playMusic(result === 'win' ? 'victory' : 'map');
    this.events.emit('stage-end', info);
  }

  /** Thông thạo nhận trong trận (cho màn kết quả: StageEndInfo.mastery) */
  private masteryLines(): StageEndInfo['mastery'] {
    const out: StageEndInfo['mastery'] = [];
    for (const [m, g] of this.masteryGain) {
      const skills = memberSkills(m);
      for (const slot of SKILL_SLOTS) {
        const n = g[slot] ?? 0;
        if (n <= 0) continue;
        const base = skills.find((s) => s.slot === slot)?.base;
        out.push({ uid: m.uid, species: m.speciesId, slot, move: base ? moveName(base) : slot, gained: n, total: skillMastery(m, slot) });
      }
    }
    return out;
  }

  /** HUD gọi khi xác nhận màn kết quả */
  finishStage(info: StageEndInfo) {
    this.scene.stop('Hud');
    if (this.config.kind === 'trial') this.scene.start('PokeCenter', { trials: true });
    else if (info.evolutions.length) this.scene.start('Evolution', { queue: info.evolutions });
    else this.scene.start('StageMap', { from: this.stage?.id });
  }

  private activeEvo(game: GameState | null): HudState['active']['evo'] {
    const cap = this.stage ? levelCap() : 50;
    const e = evoStatus(this.player.member, game, cap);
    return { state: e.state, into: e.into ? POKEMON[e.into].name : '', levelsLeft: e.levelsLeft, cap, item: e.item ? itemName(e.item) : undefined, atCap: this.player.level >= cap };
  }

  /** quầng sáng tiến hóa quanh con đang ra sân (đủ cấp tiến hóa) */
  private updateEvoAura() {
    const p = this.player;
    const on = !this.over && !p.dead && p.onField && !!evolutionReady(p.member);
    if (!on) {
      this.evoAura?.setVisible(false);
      return;
    }
    if (!this.evoAura || !this.evoAura.active) this.evoAura = this.add.ellipse(0, 0, 100, 100, 0xfff0a0, 0.3).setBlendMode(Phaser.BlendModes.ADD);
    const w = Math.max(44, p.species.body.w * 2);
    const h = Math.max(44, p.anim.height * 1.05);
    const pulse = 1 + Math.sin(this.clock / 160) * 0.08;
    this.evoAura.setVisible(true).setPosition(p.x, p.chestY).setScale((w * pulse) / 100, (h * pulse) / 100)
      .setFillStyle(0xfff0a0, 0.22 + Math.sin(this.clock / 160) * 0.08).setDepth(p.feetY - 1);
  }

  getHudState(): HudState {
    const p = this.player;
    const boss = this.boss;
    const mode: HudState['mode'] = this.config.kind === 'lab' ? 'lab' : this.config.kind === 'survival' ? 'survival' : this.gym ? 'gym' : 'stage';
    const game = getGame();
    // ải thường: tên đợt dựng lại mỗi lần (đổi ngôn ngữ giữa trận vẫn đúng)
    const waveName = this.trial
      ? t('trial.subtitle', { k: Math.min(this.trial.kills, SKILL_UNLOCK.trial.kills), n: SKILL_UNLOCK.trial.kills, s: Math.max(0, Math.ceil((this.trial.durationMs - this.clock) / 1000)) })
      : mode === 'stage' && this.stage?.waves?.length ? t('battle.wave', { n: this.waveIndex + 1, total: this.stage.waves.length }) : this.waveName;
    return {
      mode,
      title: mode === 'survival' ? t('battle.survivalTitle') : mode === 'lab' ? t('lab.title') : this.trial ? t('trial.title', { type: typeLabel(this.trial.type) }) : this.stage ? stageName(this.stage) : '',
      subtitle: mode === 'gym' ? t('battle.leader', { name: this.gym?.leader ?? '' }) : waveName,
      active: { id: p.species.id, name: p.species.name, level: p.level, hp: p.hp, maxHp: p.maxHp, xp: p.xp, xpToNext: p.xpToNext, types: p.species.types, guard: this.clock < p.guardUntil, evo: this.activeEvo(game) },
      bench: this.fighters.map((f, i) => ({ id: f.species.id, level: f.level, hp: f.hp, maxHp: f.maxHp, active: i === this.activeIdx, dead: f.dead })),
      skills: [
        ...p.skills.map((s) => ({
          key: s.slot, name: moveName(s.move), upgrade: s.upgrade, icon: s.move.icon, color: TYPE_COLOR[s.move.type],
          left: p.cooldownLeft(s.slot, this.clock), total: p.cooldownTotal(s.slot), locked: !s.unlocked, unlockLevel: s.unlockLevel,
          cost: s.spec.cost, affordable: p.energy >= s.spec.cost,
          ...(s.unlocked || this.config.kind === 'survival' ? {} : (() => { const l = slotLockShort(p.member, s.slot); return { lockTop: l.top, lockLabel: l.label }; })()),
        })),
        { key: 'Space', name: t('battle.dash'), upgrade: 0, icon: 'play', color: 0xf0e0b0, left: p.cooldownLeft('dash', this.clock), total: p.cooldownTotal('dash'), locked: false, unlockLevel: 1, cost: 0, affordable: true },
      ],
      switchLeft: Math.max(0, this.switchReadyAt - this.clock),
      kills: this.kills,
      enemiesLeft: this.enemies.length + this.pending.length,
      timeMs: this.clock,
      waveName,
      boss: boss ? { hp: Math.max(0, boss.hp), maxHp: boss.maxHp, name: boss.species.name, level: boss.level, id: boss.species.id, types: boss.species.types } : null,
      leaderTeam: this.gym ? this.gym.team.map((t, i) => ({ id: t.species, dead: i < this.gymIndex - ((boss && !boss.dead) || this.pending.length ? 1 : 0), active: i === this.gymIndex - 1 && !!boss && !boss.dead })) : [],
      bossInMs: mode === 'survival' ? Math.max(0, BOSS.spawnAtMs - this.clock) : 0,
      balls: (game?.items.pokeball ?? 0) + (game?.items.greatball ?? 0),
      // trận có thủ lĩnh: chỉ còn số lọ được phép dùng
      potions: Math.max(0, Math.min(game?.items.potion ?? 0, this.gym ? TRAINER.potionLimit - this.potionsUsed : Infinity)),
      potionLeft: Math.max(0, this.potionReadyAt - this.clock),
      parTimeS: this.trial ? 0 : this.stage?.parTimeS ?? 0,
      dev: this.devMode,
      canRun: !!this.stage && !this.gym,
      ult: {
        charge: p.ultCharge, name: ultName(p.species.types, p.species.id), locked: !this.ultOpen(p),
        cdLeftMs: this.config.kind === 'lab' ? 0 : Math.max(0, this.ultLockUntil - this.clock),
        ...(this.ultOpen(p) ? {} : (() => { const l = slotLockShort(p.member, 'I'); return { lockTop: l.top, lockLabel: l.label }; })()),
      },
      energy: { value: p.energy, max: p.energyMax },
      mech: this.mechHud(p),
    };
  }

  private mechHud(p: Fighter): HudState['mech'] {
    const ty = p.species.types;
    const now = this.clock;
    if (legendOf(p.species.id)?.staticCharge) {
      return { kind: 'static', value: this.staticReady ? 1 : this.staticCharge / 100, label: this.staticReady ? t('mech.staticOn') : t('mech.static'), color: 0xffe04a, ticks: 0, active: this.staticReady };
    }
    if (ty.includes('dragon')) {
      const on = now < this.furyUntil;
      return { kind: 'fury', value: on ? (this.furyUntil - now) / 4000 : this.furyHits / 100, label: on ? t('battle.fury') : t('mech.fury'), color: on ? 0xff7a30 : 0x6a7aff, ticks: 0, active: on };
    }
    if (ty.includes('rock')) {
      const on = this.armorStacks > 0 && now < this.armorUntil;
      return { kind: 'armor', value: on ? this.armorStacks / 5 : 0, label: `${t('battle.stoneSkin')} ${on ? this.armorStacks : 0}/5`, color: 0xc8b890, ticks: 5, active: this.armorStacks >= 5 };
    }
    if (ty.includes('bug')) {
      const on = now < this.swarmUntil;
      const cd = Math.max(0, this.swarmReadyAt - now);
      return { kind: 'swarm', value: on ? (this.swarmUntil - now) / 6000 : 1 - cd / 10000, label: on ? t('mech.swarmOn') : t('mech.swarm'), color: 0x9ac040, ticks: 0, active: on };
    }
    return null;
  }

  /** Tích điện (Zapdos): đi/lướt tích thanh Tĩnh điện; đầy → chiêu K/L/U kế tiếp miễn phí và hồi chiêu giảm nửa */
  private gainStatic(v: number) {
    if (this.staticReady) return;
    this.staticCharge = Math.min(100, this.staticCharge + v);
    if (this.staticCharge >= 100) {
      this.staticReady = true;
      this.fx.floatingLabel(this.player.x, this.player.chestY - 30, t('battle.staticFull'), '#ffe04a');
      scatterFx(this, 'spark', this.player.x, this.player.chestY, 10, 30, 0xffe04a, 1.2);
      playSfx('zap');
    }
  }

  /** Bọ – Bầy đàn: đòn Bọ trúng gọi 3–5 con bọ đồng minh bám theo, tự cắn địch gần nhất trong 6s (hồi 10s) */
  private spawnSwarm() {
    const p = this.player;
    const n = 3 + (p.level >= 25 ? 1 : 0) + (p.level >= 40 ? 1 : 0);
    this.swarmUntil = this.clock + 6000;
    this.swarmReadyAt = this.clock + 10000;
    this.fx.floatingLabel(p.x, p.chestY - 30, t('mech.swarmOn'), '#c8e040');
    for (const b of this.swarmBugs) b.img.destroy();
    this.swarmBugs = Array.from({ length: n }, (_, i) => ({ img: this.add.image(p.x, p.chestY, 'bugdot').setScale(1.6).setDepth(99990), x: p.x, y: p.chestY, bite: 0, ph: i * 1.7 }));
  }

  private updateSwarm() {
    const dt = Math.min(50, this.clock - this.swarmLastT);
    this.swarmLastT = this.clock;
    if (!this.swarmBugs.length) return;
    const p = this.player;
    if (this.clock >= this.swarmUntil || p.dead) {
      for (const b of this.swarmBugs) b.img.destroy();
      this.swarmBugs = [];
      return;
    }
    const tick: MoveDef = { ...MOVES.withdraw, id: 'swarmBite', type: 'bug', power: 0, knockback: 0, status: undefined, castSlot: undefined, shatterChild: true };
    for (const b of this.swarmBugs) {
      let tgt: Enemy | null = null;
      let best = 190;
      for (const e of this.enemies) {
        if (e.dead || !e.targetable) continue;
        const d = Math.hypot(e.x - b.x, e.centerY - b.y);
        if (d < best) {
          best = d;
          tgt = e;
        }
      }
      const tx = tgt ? tgt.x + Math.cos(this.clock / 120 + b.ph) * 6 : p.x + Math.cos(this.clock / 400 + b.ph) * 26;
      const ty = tgt ? tgt.centerY + Math.sin(this.clock / 110 + b.ph) * 5 : p.chestY + Math.sin(this.clock / 400 + b.ph) * 18;
      const dx = tx - b.x;
      const dy = ty - b.y;
      const d = Math.hypot(dx, dy) || 1;
      const sp = ((tgt ? 190 : 140) * dt) / 1000;
      b.x += (dx / d) * Math.min(sp, d);
      b.y += (dy / d) * Math.min(sp, d);
      b.img.setPosition(b.x, b.y).setDepth(b.y + 3000);
      if (tgt && d < 10 && this.clock >= b.bite) {
        b.bite = this.clock + 550;
        this.damageEnemy(tgt, tick, p.power * 2.2, 0, 0, false, true);
      }
    }
  }

  // ======================================================================= mở khóa chiêu / Thử thách chiêu

  /** trận này có tính tiến độ mở khóa không (ải, trận thủ lĩnh, thử thách; không tính Skill Lab / Sinh tồn) */
  private tracksUnlocks() {
    return this.config.kind === 'stage' || this.config.kind === 'trial';
  }

  /** Tuyệt chiêu dùng được chưa: Skill Lab luôn được · Sinh tồn theo tiến hóa · còn lại cần đã học (game/unlocks.ts) */
  private ultOpen(f: Fighter) {
    if (this.config.kind === 'lab') return true;
    if (this.config.kind === 'survival') return hasUltimate(f.species.id);
    return hasUltimate(f.species.id) && isLearned(f.member, 'I');
  }

  /** tên chiêu của ô (I = tên Tuyệt chiêu) */
  private unlockMoveName(m: PartyMember, slot: UnlockSlot) {
    if (slot === 'I') return ultName(POKEMON[m.speciesId].types, m.speciesId);
    const s = POKEMON[m.speciesId].skills.find((x) => x.slot === slot);
    return s ? moveName(MOVES[s.move]) : slot;
  }

  /** sự kiện nhiệm vụ L của Pokémon đang ra sân (hoặc con ra chiêu) */
  private questEvent(ev: QuestEvent, member?: PartyMember) {
    if (!this.tracksUnlocks() || this.over) return;
    const m = member ?? this.player?.member;
    if (!m) return;
    addQuest(m, ev);
    this.checkUnlockReady(m);
  }

  /** vừa đủ điều kiện một chiêu → toast "sẵn sàng học" (mỗi ô một lần mỗi trận) */
  private checkUnlockReady(m: PartyMember) {
    if (!this.tracksUnlocks()) return;
    for (const slot of readySlots(m)) {
      const key = `${m.uid}:${slot}`;
      if (this.unlockAnnounced.has(key)) continue;
      this.unlockAnnounced.add(key);
      this.events.emit('toast', readyToast(m, this.unlockMoveName(m, slot)));
      playSfx('level');
    }
  }

  /** Hết trận: học mọi chiêu đã đủ điều kiện → chip "Đã học" trên thẻ EXP (con không có thẻ: ghi chú) */
  private learnAfterBattle(info: StageEndInfo) {
    for (const f of this.fighters) {
      const m = f.member;
      const names = learnReady(m).map((slot) => this.unlockMoveName(m, slot));
      if (!names.length) continue;
      let card = info.xpCards.find((c) => c.uid === m.uid);
      if (!card && this.trial) {
        card = { uid: m.uid, species: m.speciesId, name: f.species.name, gained: 0, fromLevel: m.level, fromXp: m.xp, toLevel: m.level, toXp: m.xp, moves: [] };
        info.xpCards.push(card);
      }
      if (card) card.learned = [...(card.learned ?? []), ...names];
      else for (const n of names) info.notes.push(t('unlock.learnedNote', { name: f.species.name, move: n }));
      playSfx('badge');
    }
  }

  /** Thử thách chiêu: thả địch liên tục (tối đa maxAlive), bẫy lan dần theo thời gian */
  private trialTick() {
    const tr0 = this.trial!;
    const tc = SKILL_UNLOCK.trial;
    const frac = Math.min(1, this.clock / tr0.durationMs);
    const rain = this.hazards.find((h) => h.kind === 'rain');
    if (rain && rain.kind === 'rain') rain.count = Math.round(tc.hazardCount[0] + (tc.hazardCount[1] - tc.hazardCount[0]) * frac);
    if (this.clock < tr0.nextSpawnAt || this.clock >= tr0.durationMs) return;
    tr0.nextSpawnAt = this.clock + tc.spawnGapMs;
    if (this.enemies.length + this.pending.length >= tc.maxAlive) return;
    const level = Math.max(3, tr0.member.level + tc.levelOffset);
    const species = tr0.pool[Math.floor(Math.random() * tr0.pool.length)];
    this.pending.push({ species, level, at: this.clock, flank: Math.random() * Math.PI * 2 });
  }

  /** Kết thúc Thử thách chiêu: thắng → mở điều kiện U (học ngay ở màn kết quả). Không thưởng / không mất gì. */
  private endTrial(result: StageEndInfo['result']) {
    if (this.over || !this.trial) return;
    const game = getGame() as GameState;
    this.stopBattle();
    const tr0 = this.trial;
    const tc = SKILL_UNLOCK.trial;
    const m = tr0.member;
    const info: StageEndInfo = {
      result, title: result === 'win' ? t('trial.win') : t('trial.lose'), stars: 0, starReasons: [], money: 0, balls: 0, xpLines: [], caught: [],
      notes: [], evolutions: [], xpCards: [], mastery: [], newSpeciesMoney: 0, backLabel: t('trial.back'), trial: true,
    };
    if (result === 'win') {
      playSfx('win');
      markTrialCleared(m);
    } else {
      playSfx(result === 'lose' ? 'lose' : 'select');
      info.notes.push(t('trial.noteFail', { k: Math.min(tr0.kills, tc.kills), n: tc.kills }), t('trial.noteRetry'));
    }
    // thẻ của con thử thách (không EXP) để hiện chip "Đã học"
    info.xpCards.push({ uid: m.uid, species: m.speciesId, name: POKEMON[m.speciesId].name, gained: 0, fromLevel: m.level, fromXp: m.xp, toLevel: m.level, toXp: m.xp, moves: [] });
    this.learnAfterBattle(info);
    // không bị thương, hồi đầy
    m.injured = false;
    healTeam(game);
    saveGame();
    playMusic(result === 'win' ? 'victory' : 'map');
    this.events.emit('stage-end', info);
  }

  // ======================================================================= Skill Lab

  /** Đặt lại hình nộm: xếp hàng trước mặt người chơi, đầy máu (vô hạn), xóa trạng thái */
  labResetDummies() {
    if (this.config.kind !== 'lab') return;
    for (const e of [...this.enemies]) {
      this.zoneToEnemy.delete(e.zone);
      this.enemyGroup.remove(e.zone);
      e.destroy();
    }
    this.enemies = [];
    for (const z of this.zones) z.gfx.destroy();
    this.zones = [];
    this.aimTarget = null;
    const p = this.player;
    p.body.reset(this.worldW / 2 - 90, this.worldH / 2);
    p.faceTo(1, 0);
    const spots = [{ x: 70, y: 0 }, { x: 115, y: -38 }, { x: 115, y: 38 }, { x: 165, y: -14 }, { x: 165, y: 30 }];
    LAB_DUMMIES.forEach((id, i) => {
      const e = new Enemy(this, id, p.x + spots[i].x, p.y + spots[i].y, this.clock, this.config.kind === 'lab' ? this.config.level : 5);
      e.dummy = true;
      e.catchable = false;
      e.hp = e.maxHp = LAB_DUMMY_HP;
      this.addEnemy(e);
    });
    this.labDamageBase = 0;
    this.labStartAt = this.clock;
  }

  private labDamageBase = 0;
  private labStartAt = 0;

  /** Tổng sát thương lên hình nộm kể từ lần đặt lại, và thời gian (ms) */
  labDamage(): { total: number; ms: number } {
    const total = this.enemies.reduce((n, e) => n + (e.maxHp - e.hp), 0);
    return { total: Math.round(total + this.labDamageBase), ms: this.clock - this.labStartAt };
  }

  /** Đổi cấp tại chỗ (tính lại chỉ số + phân giải lại chiêu theo bậc cấp), hồi chiêu & năng lượng đầy */
  labSetLevel(level: number) {
    if (this.config.kind !== 'lab') return;
    this.config = { ...this.config, level };
    const p = this.player;
    p.member.level = level;
    p.refreshStats();
    p.member.hp = p.maxHp;
    p.energy = p.energyMax;
    for (const k of Object.keys(p.readyAt) as (keyof typeof p.readyAt)[]) p.readyAt[k] = 0;
  }

  /** Bấm ô chiêu từ nút của Skill Lab (như bấm phím) */
  labPress(slot: SkillSlot | 'I') {
    if (slot === 'I') this.castUltimate();
    else this.buffered[slot] = this.clock + INPUT_BUFFER_MS;
  }

  private labTick() {
    const p = this.player;
    p.member.hp = p.maxHp;
    if (this.labFreeEnergy) p.energy = p.energyMax;
    const cx = this.worldW / 2;
    const cy = this.worldH / 2;
    this.enemies.forEach((e, i) => {
      // hồi máu "vô hạn": cộng phần đã mất vào bộ đếm rồi trả máu lại
      if (e.hp < e.maxHp * 0.5) {
        this.labDamageBase += e.maxHp - e.hp;
        e.hp = e.maxHp;
      }
      e.dead = false;
      if (!this.labMoving) {
        e.dummyVel.set(0, 0);
        return;
      }
      // trôi chậm theo vòng tròn quanh tâm sân, mỗi con một pha
      const a = this.clock / 1400 + i * 1.3;
      const tx = cx + 40 + Math.cos(a) * (60 + i * 14);
      const ty = cy + Math.sin(a * 1.3) * (50 + i * 8);
      e.dummyVel.set(Phaser.Math.Clamp((tx - e.x) * 2, -36, 36), Phaser.Math.Clamp((ty - e.y) * 2, -36, 36));
    });
  }

  debugCounts() {
    return {
      enemies: this.enemies.length,
      children: this.children.length,
      playerShots: this.playerShots.activeCount(),
      enemyShots: this.enemyShots.activeCount(),
      orbs: this.orbs.filter((o) => o.active).length,
      tweens: this.tweens.getTweens().length,
      timers: (this.time as unknown as { _active: unknown[] })._active?.length ?? -1,
      keyboardListeners: this.input.keyboard?.listenerCount('keydown-J') ?? 0,
    };
  }
}
