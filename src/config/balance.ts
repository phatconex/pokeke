// Mọi con số cân bằng gameplay tập trung tại đây.
// Đơn vị: khoảng cách = pixel thế giới, tốc độ = pixel/giây, thời gian = mili giây.
// Chiêu thức (sát thương, hồi chiêu...) nằm ở data/moves.ts.
import { CHAPTERS } from '../data/chapters';

export const GAME = {
  width: 1280,
  height: 720,
  worldZoom: 2,
  tile: 16,
  /** kích thước bản đồ chế độ Sinh tồn (ô) */
  worldTilesW: 100,
  worldTilesH: 76,
} as const;

export const PLAYER = {
  /** Thời gian bất tử sau khi bị đánh */
  hurtInvulnMs: 800,
  pickupRadius: 14,
  magnetRadius: 70,
  magnetSpeed: 260,
} as const;

export const DASH = {
  cooldownMs: 1100,
  speed: 480,
  durationMs: 170,
  invulnMs: 260,
} as const;

/**
 * Chỉ số theo cấp. Mốc tham chiếu là Lv 5 (hệ số = 1).
 * - máu:      base × (0.5 + 0.1·Lv)
 * - sức mạnh: (atk/50) × (0.6 + 0.08·Lv)   → nhân vào sát thương chiêu
 */
export const STATS = {
  hpAt: (base: number, level: number) => Math.max(1, Math.round(base * (0.5 + 0.1 * level))),
  powerAt: (atk: number, level: number) => (atk / 50) * (0.6 + 0.08 * level),
  /** hệ số sát thương của Pokémon hoang dã/đối thủ (contact, đạn) */
  enemyDamageAt: (level: number) => 0.6 + 0.08 * level,
  speedAt: (base: number, level: number) => base + level,
  // cấp càng cao càng cần nhiều EXP (bậc 2) – tránh chạm giới hạn cấp quá sớm
  xpForLevel: (level: number) => Math.round(5 + 4 * level + 0.15 * level * level),
  /** EXP nhận được khi hạ một Pokémon */
  xpYield: (baseXp: number, level: number) => Math.max(1, Math.round(baseXp * level * 1.2)),
  /** Pokémon của huấn luyện viên (hội quán / Tứ Thiên Vương / Shigeru) trâu hơn hoang dã (trước: 3) */
  trainerHpMult: 5,
  /** boss của thủ lĩnh (vd. Onix) đã có máu gốc lớn nên nhân ít hơn (trước: 1.5) */
  trainerBossHpMult: 2.2,
  maxLevel: 70,
} as const;

/** Giới hạn cấp theo số huy hiệu (index = số huy hiệu đang có) */
export const LEVEL_CAP = [15, 20, 25, 30, 35, 40, 45, 50, 60] as const;
export const levelCapFor = (badges: number) => LEVEL_CAP[Math.min(badges, LEVEL_CAP.length - 1)];

/** Đổi Pokémon trong trận */
export const SWITCH = {
  cooldownMs: 3000,
  /** chờ một chút sau khi con đang ra sân gục rồi mới tự đổi */
  faintDelayMs: 700,
} as const;

/** Thu phục */
export const CATCH = {
  /** máu dưới ngưỡng này → choáng, có thể ném bóng */
  stunHpRatio: 0.25,
  stunMs: 4500,
  /** khoảng cách tối đa để ném bóng */
  throwRange: 90,
  wobbleMs: 450,
  balls: {
    pokeball: { name: 'Poké Ball', bonus: 1, price: 150, texture: 'pokeball' },
    greatball: { name: 'Great Ball', bonus: 1.6, price: 600, texture: 'greatball' },
    ultraball: { name: 'Ultra Ball', bonus: 2.5, price: 1200, texture: 'ultraball' },
  },
  /** thứ tự bóng từ rẻ đến tốt (E ném quả rẻ nhất còn có, Q ném quả tốt nhất) */
  ballOrder: ['pokeball', 'greatball', 'ultraball'] as const,
  /** Huyền thoại: tỉ lệ tối thiểu theo bóng (trước đây chỉ ~5–11%) và số lần được ném lại trong một trận (vùng ra → choáng lại sau 1,8s) */
  legendFloor: { pokeball: 0.12, greatball: 0.2, ultraball: 0.32 } as Record<string, number>,
  legendTries: 3,
  legendRestunMs: 1800,
  /** tỷ lệ = catchRate/255 × (1 − 0.6×máu%) × bóng × 1.8 (đang choáng); kẹp trong [min, max] */
  chance: (catchRate: number, hpRatio: number, ballBonus: number) =>
    Math.max(0.05, Math.min(0.95, (catchRate / 255) * (1 - 0.6 * hpRatio) * ballBonus * 1.8)),
} as const;

/** Tiền */
export const ECONOMY = {
  startMoney: 500,
  startBalls: 6,
  /** cấp Pokémon khởi đầu (chỉ có 1 con nên nhỉnh hơn Lv 5 một chút) */
  starterLevel: 6,
  /** chăm sóc Pokémon bị thương sau hội quán: × cấp (trước: 30 – hội quán khó hơn, thua nhiều hơn nên rẻ đi) */
  carePerLevel: 20,
  /** thưởng thêm theo số sao (trước: 0.25) */
  starBonus: 0.2,
} as const;

/**
 * Tiền thưởng ải = money của ải × moneyMult × (1 + starBonus·(sao−1)) × (lần đầu ? firstClearMult : replayMult).
 * Đánh lại ải đã qua chỉ được ~30% (không có thưởng lần đầu) → không "cày" tiền để nâng cấp ồ ạt.
 */
export const STAGE_REWARD = {
  /** cắt bớt tiền gốc của mọi ải (data/stages.ts giữ số gốc) */
  moneyMult: 0.8,
  /** thắng lần đầu */
  firstClearMult: 1.5,
  /** đánh lại ải đã thắng (trước: 0.3, ban đầu 1) */
  replayMult: 0.35,
  /** đánh lại ải đã thắng mà được 3 sao: tặng thêm số Poké Ball này */
  replay3StarBalls: 1,
  /** bắt được loài MỚI (chưa có trong Pokédex): thưởng newSpeciesPerLevel₽ × cấp con vừa bắt (cộng vào tiền của ải) */
  newSpeciesPerLevel: 50,
} as const;

/**
 * Pokémon của huấn luyện viên (mọi trận có thủ lĩnh: hội quán, Tứ Thiên Vương, Shigeru, Nhà vô địch).
 * Máu thêm nằm ở STATS.trainerHpMult / trainerBossHpMult; cấp đội thủ lĩnh: thành viên ≈ giới hạn cấp, con át chủ bài cao hơn 3–4 cấp.
 */
export const TRAINER = {
  /** sát thương của Pokémon huấn luyện viên (nhân thêm sau STAGE_TUNING.dmgMult) */
  dmgMult: 1.35,
  /** càng về sau càng khó (đội người chơi đã tiến hóa / mạnh hơn): mỗi huy hiệu đang có +hp máu, +dmg sát thương
   *  → Tứ Thiên Vương (8 huy hiệu): máu ×1.4, sát thương ×1.24 */
  perBadge: { hp: 0.05, dmg: 0.03 },
  /** hồi chiêu / nghỉ giữa các đòn (đánh xa, vồ, đào đất, Ma) – nhỏ hơn = dồn dập hơn */
  attackGapMult: 0.75,
  /** tốc độ chạy */
  speedMult: 1.1,
  /** boss: nghỉ giữa các đòn lớn (× BOSS.attackGapMs) khi chưa nổi giận */
  bossGapMult: 0.8,
  /** boss nổi giận khi máu ≤ ngưỡng: đòn dồn dập hơn, cảnh báo ngắn hơn, chạy nhanh hơn, thêm đá rơi + 2 vòng đạn */
  enrage: { hpRatio: 0.4, gapMult: 0.5, telegraphMult: 0.8, speedMult: 1.35, extraDrops: 3 },
  /** số Thuốc được dùng mỗi trận có thủ lĩnh */
  potionLimit: 2,
  /** Shigeru: cấp = đội người chơi + aboveTeam, kẹp trong [cấp tối thiểu của bậc, giới hạn cấp + aboveCap];
   *  thành viên lv−1..lv, con starter (boss) lv + aceBonus */
  rival: { aboveTeam: 2, aboveCap: 1, aceBonus: 3 },
} as const;

/**
 * Chống "giữ J rồi chạy vòng tròn" (người chơi chỉ thả diều + spam J vẫn thắng dễ):
 * J tốn năng lượng (như PP), ra chiêu thì đi chậm lại, J yếu hơn còn K/L/U + liên hoàn mạnh hơn
 * → xoay vòng chiêu và đứng lại bắn / lướt mới là lối chơi mạnh nhất. Chỉ áp cho người chơi.
 */
export const COMBAT = {
  /** Năng lượng dùng chung cho mọi ô chiêu của Pokémon đang ra sân (0..max, hồi liên tục regenPerSec/giây).
   *  Giá mặc định theo ô (slotCost) – nguyên mẫu / loài / bậc cấp có thể đổi (skills/kits.ts → SkillSpec.cost).
   *  Không đủ năng lượng thì không ra chiêu được. Tuyệt chiêu (I) không tốn năng lượng. */
  energy: { max: 100, deniedCueMs: 650 },
  /** chậm khi ra chiêu: J ×jMult trong jMs (sau mỗi phát).
   *  K/L/U: gồng ngắn ×skillMult, thời gian = skillBaseMs + sức mạnh gốc × skillMsPerPower, kẹp [skillMinMs, skillMaxMs].
   *  Lướt (Space) xóa hiệu ứng chậm này. */
  castSlow: { jMult: 0.85, jMs: 220, skillMult: 0.3, skillBaseMs: 110, skillMsPerPower: 2.2, skillMinMs: 150, skillMaxMs: 250 },
  /** hệ số sức mạnh theo ô chiêu (trước: tất cả = 1) – J yếu đi, K/L/U mạnh lên */
  slotPower: { J: 0.8, K: 1.15, L: 1.15, U: 1.15 } as Record<string, number>,
  /** liên hoàn: đổi ô chiêu trong windowMs → +perStep sát thương mỗi bậc (tối đa +max).
   *  J lặp lại không làm đứt chuỗi (nhưng không cộng bậc) – J là chiêu "đệm" giữa K/L/U. (trước: +10%/bậc, tối đa +40%, J lặp lại thì đứt) */
  combo: { windowMs: 1500, perStep: 0.12, max: 0.6 },
} as const;

type EnergySlot = 'J' | 'K' | 'L' | 'U';
export interface CombatProfile {
  /** hồi năng lượng mỗi giây (trước: 14) */
  regenPerSec: number;
  /** giá năng lượng mặc định theo ô (trước: J5 K15 L30 U45); spec.cost của nguyên mẫu / loài / bậc vẫn ghi đè được */
  slotCost: Record<EnergySlot, number>;
  /** ra BẤT KỲ chiêu nào thì ngừng hồi năng lượng trong ms này (chống xả liên tục) */
  regenPauseMs: number;
  /** ngừng hồi sau mỗi phát J (ngắn hơn khoảng cách 2 phát J ≈ 0,34s để vẫn hồi một phần) */
  jRegenPauseMs: number;
  /** mỗi phát J trúng địch hoàn lại năng lượng (tối đa 1 lần cho mỗi cặp lần-bắn × mục tiêu; trượt thì không) */
  jHitRefund: number;
  /** hệ số sát thương của J lên NGƯỜI CHƠI khác (PvP; PvE = 1, chưa dùng) */
  jVsPlayerDmgMult: number;
}
/**
 * Hồ sơ chiến đấu theo chế độ. Hiện chỉ PvE chạy (combatProfile() luôn trả pve);
 * pvp là khung chờ (số tạm) cho chế độ đấu người sau này: hồi chậm hơn, J yếu hơn khi bắn người.
 * Với pve: đầy 100 → spam J (7) không trúng ≈ 7 giây là cạn (8/s hồi nhưng mỗi lần bắn ngừng hồi 0,5 s).
 */
export const COMBAT_PROFILES: Record<'pve' | 'pvp', CombatProfile> = {
  pve: { regenPerSec: 8, slotCost: { J: 7, K: 18, L: 32, U: 45 }, regenPauseMs: 500, jRegenPauseMs: 100, jHitRefund: 2, jVsPlayerDmgMult: 1 },
  pvp: { regenPerSec: 6, slotCost: { J: 8, K: 20, L: 34, U: 48 }, regenPauseMs: 650, jRegenPauseMs: 150, jHitRefund: 1, jVsPlayerDmgMult: 0.6 },
};
export type CombatMode = keyof typeof COMBAT_PROFILES;
let activeCombatMode: CombatMode = 'pve';
/** hồ sơ chiến đấu đang dùng (trận gọi; hiện luôn 'pve') */
export const combatProfile = (): CombatProfile => COMBAT_PROFILES[activeCombatMode];
/** đổi hồ sơ (chưa dùng – để dành cho PvP) */
export const setCombatMode = (m: CombatMode) => {
  activeCombatMode = m;
};

/** Địch "vồ" (rusher): thấy người chơi trong [lungeMinDist, lungeMaxDist] thì chớp sáng + vạch báo rồi phóng tới.
 *  Gần hơn lungeMinDist: vồ ngắn như cũ (windup 260ms, lao 260ms × 2,3 tốc độ). */
export const RUSHER = {
  lungeMinDist: 60,
  lungeMaxDist: 150,
  /** thời gian lấy đà (chớp trắng + vạch đỏ) */
  windupMs: 380,
  lungeMs: 300,
  /** phóng quá vị trí người chơi lúc lấy đà một đoạn (px) */
  overshoot: 26,
  /** tốc độ phóng tối đa (px/s) – Pokémon huấn luyện viên (giữ như cũ, còn nhân TRAINER.speedMult) */
  maxSpeed: 560,
  /** tốc độ phóng tối đa thực tế của Pokémon hoang dã trong ải (trước: 560) */
  wildMaxSpeed: 450,
} as const;

/** Ngắm bắn */
export const AIM = {
  /** nửa góc nón ưu tiên quanh hướng quay (độ) → 60 = nón 120°; ngoài nón (tới sideHalfDeg) vẫn khóa được nhưng bị trừ điểm */
  coneHalfDeg: 60,
  /** quá góc này (phía sau lưng) thì không tự khóa – chạy trốn thì bắn về phía trước chứ không bắn ngược ra sau */
  sideHalfDeg: 95,
  /** điểm phạt (× khoảng cách) cho địch ngoài nón ưu tiên */
  sidePenalty: 1.15,
  /** tầm tìm mục tiêu (px) */
  range: 230,
  /** địch sát người hơn khoảng này thì được chọn dù ở phía sau (trước: 26, và mọi hướng đều được chọn) */
  closeRange: 14,
  /** giữ mục tiêu cũ trừ khi mục tiêu mới gần hơn hệ số này (chống nhảy mục tiêu) */
  switchRatio: 0.7,
  /** tính trước vị trí địch đang chạy (0 = không, 1 = đầy đủ) */
  leadFactor: 0.8,
  /** chế độ chuột: con trỏ cách địch dưới khoảng này (px thế giới) thì khóa vào địch đó */
  mouseSnap: 18,
} as const;

/** burrow: chui đất rồi trồi lên dưới chân (Diglett) · bomber: lao tới tự nổ (Voltorb) · phantom: Ma – xuyên vật cản, biến mất rồi hiện cạnh người chơi và bắn */
export type EnemyBehavior = 'tank' | 'rusher' | 'ranged' | 'boss' | 'burrow' | 'bomber' | 'phantom';

/** Chỉ số Pokémon khi làm đối thủ, tham chiếu ở Lv 5 */
export interface EnemyStats {
  hp: number;
  speed: number;
  contactDamage: number;
  /** EXP gốc (nhân theo cấp) */
  xp: number;
  behavior: EnemyBehavior;
  /** máu gốc khi làm boss (đòn boss của hội quán / Tứ Thiên Vương / đối thủ) – thay cho hp */
  bossHp?: number;
  /** chỉ dùng cho địch đánh xa */
  rangedDamage?: number;
  rangedCooldownMs?: number;
  rangedTelegraphMs?: number;
  rangedProjectileSpeed?: number;
  preferredRange?: number;
  rangedTexture?: string;
}

const CORE_ENEMY_STATS: Record<string, EnemyStats> = {
  caterpie: { hp: 22, speed: 34, contactDamage: 6, xp: 2, behavior: 'tank' },
  weedle: {
    hp: 18, speed: 48, contactDamage: 6, xp: 2, behavior: 'ranged',
    rangedDamage: 7, rangedCooldownMs: 2800, rangedTelegraphMs: 600, rangedProjectileSpeed: 140, preferredRange: 120,
    rangedTexture: 'poison',
  },
  pidgey: { hp: 18, speed: 112, contactDamage: 7, xp: 3, behavior: 'rusher' },
  rattata: { hp: 16, speed: 125, contactDamage: 6, xp: 2, behavior: 'rusher' },
  oddish: {
    hp: 24, speed: 55, contactDamage: 6, xp: 3, behavior: 'ranged',
    rangedDamage: 10, rangedCooldownMs: 2600, rangedTelegraphMs: 650, rangedProjectileSpeed: 150, preferredRange: 150,
    rangedTexture: 'poison',
  },
  geodude: { hp: 60, speed: 42, contactDamage: 13, xp: 4, behavior: 'tank' },
  // starter (đội của Shigeru): con cuối làm boss
  bulbasaur: { hp: 26, speed: 70, contactDamage: 8, xp: 5, behavior: 'tank', bossHp: 360 },
  charmander: { hp: 22, speed: 100, contactDamage: 9, xp: 5, behavior: 'rusher', bossHp: 340 },
  squirtle: { hp: 24, speed: 80, contactDamage: 8, xp: 5, behavior: 'ranged', rangedDamage: 10, rangedCooldownMs: 2200, rangedTelegraphMs: 550, rangedProjectileSpeed: 180, preferredRange: 130, rangedTexture: 'bubble', bossHp: 360 },
  clefable: { hp: 60, speed: 80, contactDamage: 12, xp: 12, behavior: 'ranged', rangedDamage: 15, rangedCooldownMs: 1800, rangedTelegraphMs: 500, rangedProjectileSpeed: 190, preferredRange: 140, rangedTexture: 'starshot' },
  ivysaur: { hp: 44, speed: 75, contactDamage: 12, xp: 9, behavior: 'tank', bossHp: 400 },
  charmeleon: { hp: 38, speed: 105, contactDamage: 13, xp: 9, behavior: 'rusher', bossHp: 380 },
  wartortle: { hp: 44, speed: 85, contactDamage: 12, xp: 9, behavior: 'ranged', rangedDamage: 13, rangedCooldownMs: 2000, rangedTelegraphMs: 500, rangedProjectileSpeed: 200, preferredRange: 140, rangedTexture: 'bubble', bossHp: 400 },
  metapod: { hp: 34, speed: 14, contactDamage: 4, xp: 3, behavior: 'tank' },
  kakuna: { hp: 32, speed: 14, contactDamage: 5, xp: 3, behavior: 'tank' },
  pidgeotto: { hp: 40, speed: 120, contactDamage: 10, xp: 6, behavior: 'rusher' },
  raticate: { hp: 34, speed: 130, contactDamage: 10, xp: 6, behavior: 'rusher' },
  gloom: {
    hp: 40, speed: 50, contactDamage: 8, xp: 6, behavior: 'ranged',
    rangedDamage: 13, rangedCooldownMs: 2400, rangedTelegraphMs: 600, rangedProjectileSpeed: 160, preferredRange: 150,
    rangedTexture: 'poison',
  },
  zubat: { hp: 20, speed: 135, contactDamage: 8, xp: 4, behavior: 'rusher' },
  golbat: { hp: 40, speed: 140, contactDamage: 12, xp: 8, behavior: 'rusher' },
  paras: { hp: 34, speed: 40, contactDamage: 10, xp: 4, behavior: 'tank' },
  clefairy: {
    hp: 40, speed: 70, contactDamage: 8, xp: 7, behavior: 'ranged',
    rangedDamage: 11, rangedCooldownMs: 2000, rangedTelegraphMs: 550, rangedProjectileSpeed: 180, preferredRange: 140, rangedTexture: 'starshot',
  },
  sandshrew: { hp: 46, speed: 60, contactDamage: 12, xp: 5, behavior: 'tank' },
  sandslash: { hp: 70, speed: 70, contactDamage: 16, xp: 9, behavior: 'tank' },
  psyduck: {
    hp: 36, speed: 60, contactDamage: 8, xp: 5, behavior: 'ranged',
    rangedDamage: 12, rangedCooldownMs: 2200, rangedTelegraphMs: 600, rangedProjectileSpeed: 170, preferredRange: 150, rangedTexture: 'bubble',
  },
  goldeen: { hp: 30, speed: 120, contactDamage: 10, xp: 5, behavior: 'rusher' },
  staryu: {
    hp: 40, speed: 95, contactDamage: 10, xp: 7, behavior: 'ranged',
    rangedDamage: 13, rangedCooldownMs: 1600, rangedTelegraphMs: 450, rangedProjectileSpeed: 210, preferredRange: 150, rangedTexture: 'starshot',
  },
  starmie: { hp: 52, speed: 95, contactDamage: 14, xp: 10, behavior: 'ranged', rangedDamage: 15, rangedCooldownMs: 1700, rangedTelegraphMs: 450, rangedProjectileSpeed: 220, preferredRange: 150, rangedTexture: 'starshot', bossHp: 420 },
  pikachu: {
    hp: 26, speed: 110, contactDamage: 7, xp: 6, behavior: 'ranged',
    rangedDamage: 10, rangedCooldownMs: 1800, rangedTelegraphMs: 450, rangedProjectileSpeed: 220, preferredRange: 130,
    rangedTexture: 'zap',
  },
  onix: { hp: 90, speed: 55, contactDamage: 18, xp: 8, behavior: 'tank', bossHp: 400 },
  // ---- chương 3
  spearow: { hp: 20, speed: 132, contactDamage: 9, xp: 4, behavior: 'rusher' },
  fearow: { hp: 46, speed: 145, contactDamage: 15, xp: 10, behavior: 'rusher' },
  ekans: {
    hp: 32, speed: 70, contactDamage: 10, xp: 5, behavior: 'ranged',
    rangedDamage: 12, rangedCooldownMs: 2300, rangedTelegraphMs: 600, rangedProjectileSpeed: 165, preferredRange: 130, rangedTexture: 'poison',
  },
  arbok: { hp: 72, speed: 85, contactDamage: 17, xp: 11, behavior: 'tank' },
  meowth: { hp: 28, speed: 128, contactDamage: 9, xp: 5, behavior: 'rusher' },
  mankey: { hp: 32, speed: 138, contactDamage: 13, xp: 6, behavior: 'rusher' },
  abra: {
    hp: 20, speed: 60, contactDamage: 6, xp: 8, behavior: 'ranged',
    rangedDamage: 14, rangedCooldownMs: 2000, rangedTelegraphMs: 500, rangedProjectileSpeed: 200, preferredRange: 170, rangedTexture: 'psyball',
  },
  bellsprout: {
    hp: 26, speed: 70, contactDamage: 8, xp: 5, behavior: 'ranged',
    rangedDamage: 12, rangedCooldownMs: 2200, rangedTelegraphMs: 550, rangedProjectileSpeed: 170, preferredRange: 140, rangedTexture: 'poison',
  },
  diglett: { hp: 24, speed: 120, contactDamage: 11, xp: 5, behavior: 'burrow' },
  dugtrio: { hp: 52, speed: 140, contactDamage: 16, xp: 11, behavior: 'burrow' },
  voltorb: { hp: 30, speed: 140, contactDamage: 12, xp: 6, behavior: 'bomber' },
  magnemite: {
    hp: 28, speed: 60, contactDamage: 9, xp: 6, behavior: 'ranged',
    rangedDamage: 13, rangedCooldownMs: 1900, rangedTelegraphMs: 500, rangedProjectileSpeed: 220, preferredRange: 160, rangedTexture: 'zap',
  },
  drowzee: {
    hp: 42, speed: 55, contactDamage: 10, xp: 7, behavior: 'ranged',
    rangedDamage: 12, rangedCooldownMs: 2600, rangedTelegraphMs: 650, rangedProjectileSpeed: 150, preferredRange: 140, rangedTexture: 'psyball',
  },
  raichu: { hp: 44, speed: 115, contactDamage: 13, xp: 10, behavior: 'ranged', rangedDamage: 14, rangedCooldownMs: 1700, rangedTelegraphMs: 450, rangedProjectileSpeed: 230, preferredRange: 130, rangedTexture: 'zap', bossHp: 380 },
};

/** chỉ số đối thủ: chương 1–3 ở trên, các chương sau ở data/chapters/* */
export const ENEMY_STATS: Record<string, EnemyStats> = Object.assign({}, CORE_ENEMY_STATS, ...CHAPTERS.map((c) => c.enemyStats));

/** Độ khó của các ải (nhân lên chỉ số đối thủ trong chế độ bản đồ ải) */
/** Độ khó tăng dần theo thứ tự ải: ải đầu nhẹ (địch ít máu, đánh yếu, ra đòn thưa), tới `fullAtIndex` thì như bình thường. */
export const STAGE_RAMP = {
  /** hệ số sát thương địch ở ải đầu tiên */
  startDmg: 0.5,
  startHp: 0.7,
  /** vị trí ải (trong STAGES) đạt độ khó đủ */
  fullAtIndex: 9,
  /** hội quán không xuống dưới mức này */
  gymFloor: 0.8,
  /** Pokémon hoang dã chỉ ra chiêu đặc trưng từ ải có vị trí ≥ số này */
  wildSkillsFromIndex: 4,
};
export function stageRamp(index: number, gym: boolean): { dmg: number; hp: number } {
  const k = Math.max(0, Math.min(1, (index - 1) / (STAGE_RAMP.fullAtIndex - 1)));
  const dmg = STAGE_RAMP.startDmg + (1 - STAGE_RAMP.startDmg) * k;
  const hp = STAGE_RAMP.startHp + (1 - STAGE_RAMP.startHp) * k;
  return gym ? { dmg: Math.max(dmg, STAGE_RAMP.gymFloor), hp: Math.max(hp, STAGE_RAMP.gymFloor) } : { dmg, hp };
}

export const STAGE_TUNING = {
  /** (trước: 3.8 / 2.5) – ải thường khó hơn ~20% */
  hpMult: 4.4,
  dmgMult: 2.9,
  /** EXP trong ải (nhiều địch → giảm để mỗi ải cho khoảng 1–2 cấp) */
  xpMult: 0.18,
  /** đợt sau ập tới khi đợt trước còn ≤ số con này */
  nextWaveAtLeft: 2,
  /** hội quán: máu nhân thêm hệ số này (thay cho hpMult); dmgMult vẫn áp, thêm TRAINER.dmgMult */
  gymHpMult: 3,
  /** địch đánh xa ra đòn nhanh hơn */
  rangedCooldownMult: 0.75,
  /** con "đầu đàn" ở đợt cuối mỗi ải */
  alpha: { hpMult: 4, dmgMult: 1.4, scale: 1.4, catchMult: 0.5 },
  /** khoảng cách giữa các con xuất hiện trong một đợt (ms) */
  spawnGapMs: 520,
  /** mỗi đợt chia địch ra vài hướng (cách đều quanh người chơi) để bọc sườn, không dồn một phía */
  spawnFlanks: 3,
  /** Pokémon hoang dã thường (không phải huấn luyện viên / boss / đầu đàn) chạy chậm hơn ~12% — sân ải giờ rộng hơn */
  wildSpeedMult: 0.88,
} as const;

/** Kích thước sân đấu (px thế giới, hiển thị ×GAME.worldZoom) theo loại trận; chế độ Sinh tồn có bản đồ riêng. */
export type ArenaKind = 'stage' | 'trainer' | 'lab';
export function arenaSize(kind: ArenaKind): { w: number; h: number } {
  if (kind === 'trainer') return { w: 800, h: 450 };
  if (kind === 'lab') return { w: 640, h: 360 };
  return { w: 960, h: 540 };
}

/**
 * Nâng cấp chiêu bằng tiền: giá để lên cấp kế tiếp (0→1, 1→2, ...), ô L/U đắt hơn (trước: 200/450/800/1300/2000).
 * Cấp lưu trên PartyMember.skillLv (0 = chưa nâng, 1..5). Các bảng dưới đánh chỉ số theo cấp 0..5, so với gốc:
 *   Lv1 +5% / −3% (bước "học" chiêu)   Lv2 +10% / −6% / −1 năng lượng   Lv3 +20% / −12% / −2 + hiệu ứng đặc biệt 1
 *   Lv4 +30% / −18% / −3               Lv5 +40% / −25% / −4 + hiệu ứng đặc biệt 2
 * Lên cấp N còn cần Thông thạo (mastery[N]): số lần ra chiêu đó TRÚNG ít nhất một địch (đếm mỗi lần ra chiêu 1 lần).
 */
export const SKILL_UPGRADE = {
  cost: [300, 700, 1300, 2200, 3600],
  slotMult: { J: 1, K: 1, L: 1.4, U: 1.8 } as Record<string, number>,
  /** +sát thương theo cấp 0..5 (trước: +10%/cấp) */
  power: [0, 0.05, 0.1, 0.2, 0.3, 0.4],
  /** −hồi chiêu theo cấp 0..5 (trước: −4%/cấp) */
  cooldown: [0, 0.03, 0.06, 0.12, 0.18, 0.25],
  /** −năng lượng mỗi lần dùng theo cấp 0..5 (tối thiểu còn 1) */
  energy: [0, 0, 1, 2, 3, 4],
  /** Thông thạo cần để LÊN cấp 0..5 (lần ra chiêu trúng địch, tích trên từng Pokémon) */
  mastery: [0, 0, 40, 150, 350, 700],
  /** cấp nâng tối đa = gateBase + số huy hiệu (0 huy hiệu: Lv1, 1: Lv2, 2: Lv3, 3: Lv4, ≥4: Lv5) */
  gateBase: 1,
} as const;
/** cấp nâng chiêu tối đa đang mở theo số huy hiệu */
export const skillGate = (badges: number) => Math.max(1, SKILL_UPGRADE.gateBase + badges);

/**
 * Huấn luyện từng Pokémon bằng tiền (màn Đội hình → thẻ Huấn luyện). Lưu trên PartyMember.train,
 * giữ nguyên khi tiến hóa. per = hiệu quả mỗi cấp, max = cấp tối đa,
 * giá lên cấp kế tiếp = cost × growth^cấp hiện tại (làm tròn 10₽).
 * - vitality  +% máu tối đa        - strength  +% sát thương      - armor     +% Phòng thủ
 * - stride    +% tốc độ chạy        - reflexes  −% hồi chiêu       - synthesis hồi % máu tối đa mỗi giây
 * - critical  +tỉ lệ chí mạng       - wisdom    +% EXP nhận được
 */
export const TRAIN_STATS = ['vitality', 'strength', 'armor', 'stride', 'reflexes', 'synthesis', 'critical', 'wisdom'] as const;
export type TrainStat = (typeof TRAIN_STATS)[number];
export const TRAINING: Record<TrainStat, { per: number; max: number; cost: number; growth: number; icon: string }> = {
  // (trước: cost 150–250, growth 1.6 / 1.7)
  vitality: { per: 0.05, max: 8, cost: 220, growth: 1.65, icon: 'heart' },
  strength: { per: 0.04, max: 8, cost: 280, growth: 1.65, icon: 'sword' },
  armor: { per: 0.08, max: 8, cost: 220, growth: 1.65, icon: 'shield' },
  stride: { per: 0.03, max: 5, cost: 220, growth: 1.85, icon: 'wind' },
  reflexes: { per: 0.03, max: 5, cost: 350, growth: 1.85, icon: 'clock' },
  synthesis: { per: 0.0015, max: 5, cost: 280, growth: 1.85, icon: 'leaf' },
  critical: { per: 0.02, max: 5, cost: 280, growth: 1.85, icon: 'sparkle' },
  wisdom: { per: 0.05, max: 5, cost: 160, growth: 1.85, icon: 'book' },
};
/**
 * Mốc mở Huấn luyện theo tiến độ: cấp tối đa đang mở = ⌈max × (huy hiệu + 1) / 10⌉ (tối thiểu 1).
 * Chỉ số 8 nấc: 0–1 huy hiệu → 1–2, 2 → 3, 3 → 4, 4 → 4, 5 → 5, 6 → 6, 7 → 7, 8 → 8 · chỉ số 5 nấc: 0–1 → 1, 2–3 → 2, 4–5 → 3, 6–7 → 4, 8 → 5.
 */
export const TRAIN_GATE_STEPS = 10;
export const trainGate = (k: TrainStat, badges: number) =>
  Math.max(1, Math.min(TRAINING[k].max, Math.ceil((TRAINING[k].max * (Math.max(0, badges) + 1)) / TRAIN_GATE_STEPS)));
/** số huy hiệu cần để mở nấc Huấn luyện thứ `level` (1-based) */
export const trainBadgesFor = (k: TrainStat, level: number) => {
  for (let b = 0; b <= 8; b++) if (trainGate(k, b) >= level) return b;
  return 8;
};

/** Thuốc hồi máu dùng trong trận (phím F) */
export const POTION = {
  healRatio: 0.5,
  cooldownMs: 4000,
  price: 300,
  startCount: 3,
} as const;

/** Đòn của boss; sát thương ở Lv 5, nhân theo cấp */
export const BOSS = {
  spawnAtMs: 180_000,
  attackGapMs: 1150,
  rockSlide: { telegraphMs: 950, count: 5, radius: 26, damage: 18, spread: 70 },
  charge: { telegraphMs: 850, speed: 330, durationMs: 700, damage: 24 },
  ring: { telegraphMs: 700, count: 14, speed: 140, damage: 12 },
  /** dưới ngưỡng máu này boss tấn công dồn dập hơn */
  enrageHpRatio: 0.5,
  /** boss của thủ lĩnh: người chơi đứng xa hơn farDist liên tục farMs → nhảy bổ tới (vòng đỏ tại chỗ người chơi, rồi đáp xuống) */
  gapCloser: { farDist: 150, farMs: 3000, telegraphMs: 800, leapMs: 380, radius: 34, damage: 22 },
} as const;

/** Chế độ Sinh tồn */
export const SURVIVAL = {
  starter: 'charmander',
  starterLevel: 5,
  bossLevel: 9,
} as const;

export const SPAWN = {
  minDistance: 300,
  maxDistance: 430,
  maxEnemiesAlive: 55,
  /** hệ số tần suất sinh địch thường sau khi boss xuất hiện */
  afterBossRateMult: 0.35,
} as const;

/** Giới hạn đối tượng để game không chậm dần */
export const CAPS = {
  playerProjectiles: 60,
  enemyProjectiles: 80,
  xpOrbs: 120,
  damageNumbers: 30,
  particles: 360,
} as const;

/** Đòn kết liễu boss / thủ lĩnh: chuyển động chậm + chữ KO! */
export const FINISHER = {
  /** hệ số tốc độ thời gian trong lúc chậm */
  timeScale: 0.3,
  /** thời gian chậm (ms thực) */
  slowMs: 600,
} as const;

/**
 * Mở khóa chiêu bằng thành tích (data/unlocks.ts, game/unlocks.ts). Cấp yêu cầu = max(level ở đây, cấp mở của loài).
 * - K: Lv 5 + J trúng ≥ jHits lần (Thông thạo J)
 * - L: Lv 10 + nhiệm vụ huấn luyện theo hệ (số lượng mặc định questN, nhiệm vụ có thể đặt riêng)
 * - U: Lv 18 + vượt Thử thách chiêu (Trung tâm Pokémon)
 * - I: đã tiến hóa (hasUltimate) + thắng bigWins trận thủ lĩnh / Tứ Thiên Vương / Shigeru có mặt trong đội, HOẶC kos đòn kết liễu
 * Chiêu chỉ "học" khi kết thúc trận (màn kết quả) → dùng được từ trận kế tiếp.
 */
export const SKILL_UNLOCK = {
  K: { level: 5, jHits: 30 },
  L: { level: 10 },
  U: { level: 18 },
  I: { bigWins: 1, kos: 3 },
  /** đòn có knockback ≥ ngưỡng này mới tính "đẩy lùi" */
  knockbackMin: 150,
  /** Thử thách chiêu (U): sống sót durationS giây và hạ ≥ kills địch */
  trial: {
    durationS: 60,
    kills: 20,
    /** số địch tối đa cùng lúc, khoảng cách giữa 2 lần thả địch */
    maxAlive: 7,
    spawnGapMs: 900,
    /** địch thấp hơn người chơi n cấp (tối thiểu 3) */
    levelOffset: -2,
    /** bẫy theo hệ: số vòng lúc đầu → tối đa (lan dần theo thời gian), chu kỳ, báo trước, % máu */
    hazardCount: [2, 6] as [number, number],
    hazardPeriodMs: 2600,
    hazardWarnMs: 900,
    hazardRadius: 26,
    hazardDamagePct: 0.08,
  },
} as const;
