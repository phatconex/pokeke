// Trạng thái cuộc phiêu lưu (v2 – bản đồ ải): Hộp Pokémon, đội 3 con, tiền, bóng, huy hiệu, kết quả từng ải.
// Lưu bằng localStorage (an toàn khi lỗi). Tự chuyển dữ liệu từ bản lưu v1 (bản đồ đi bộ).
import { ECONOMY, levelCapFor, POTION, SKILL_UPGRADE, skillGate, STATS, TRAIN_STATS, trainBadgesFor, trainGate, TRAINING, TrainStat } from '../config/balance';
import { BASE_CRIT, CRIT_MULT, DEFENSE, speciesStats } from '../data/stats';
import { evolutionsOf, POKEMON, SkillSlot } from '../data/pokemon';
import { MOVES, MoveDef, SKILL_MAX_LEVEL, slotScaledMove, upgradeMove } from '../data/moves';
import { loadJson, saveJson } from '../systems/storage';
import { ALL_ITEMS, ItemId } from './items';
import { markCaught } from './dex';
import { isAvatar } from '../data/avatars';
import { currentUser, scheduleCloudSave } from '../systems/cloud';
import { t, tr } from '../i18n';
import { isLearned, migrateUnlocks, slotLevel, UnlockProgress } from './unlocks';

export interface PartyMember {
  uid: string;
  speciesId: string;
  level: number;
  xp: number;
  hp: number;
  /** gục ở hội quán → phải trả tiền chăm sóc mới ra trận được */
  injured?: boolean;
  /** ải đã bắt được (để hiển thị) */
  caughtAt?: string;
  /** cấp nâng cấp của từng ô chiêu (mua bằng tiền), giữ nguyên khi tiến hóa */
  skillLv?: Partial<Record<SkillSlot, number>>;
  /** Thông thạo từng ô chiêu: số lần ra chiêu TRÚNG ít nhất một địch (mỗi lần ra chiêu tính 1), giữ nguyên khi tiến hóa.
   *  Lên cấp nâng chiêu cần SKILL_UPGRADE.mastery[cấp mới]. */
  mastery?: Partial<Record<SkillSlot, number>>;
  /** cấp Huấn luyện từng chỉ số (mua bằng tiền), giữ nguyên khi tiến hóa – xem TRAINING */
  train?: Partial<Record<TrainStat, number>>;
  /** Mở khóa chiêu bằng thành tích (game/unlocks.ts): ô đã học, bộ đếm nhiệm vụ, thử thách, thắng trận lớn, KO – giữ nguyên khi tiến hóa */
  unlocks?: UnlockProgress;
}

export interface StageRecord {
  stars: number;
  clears: number;
  bestTimeMs: number;
}

export interface GameState {
  version: 2;
  trainer: string;
  region: string;
  /** starter đã chọn (để Shigeru chọn starter khắc chế) */
  starter?: string;
  /** nhân vật người chơi (data/avatars.ts) */
  avatar?: string;
  box: PartyMember[];
  /** uid các con trong đội, tối đa 3, theo thứ tự ra sân */
  team: string[];
  money: number;
  items: Record<ItemId, number>;
  badges: string[];
  stages: Record<string, StageRecord>;
  /** ải đang chọn trên bản đồ */
  cursor: string;
  flags: Record<string, boolean>;
  playMs: number;
  /** Pokédex: loài đã gặp / đã bắt, mốc thưởng đã nhận */
  dex?: { seen: string[]; caught: string[]; claimed: number[] };
}

export const TEAM_SIZE = 3;

/** Túi đồ ban đầu (balls = số Poké Ball khởi đầu) */
function emptyItems(balls: number = ECONOMY.startBalls): Record<ItemId, number> {
  const items = Object.fromEntries(ALL_ITEMS.map((id) => [id, 0])) as Record<ItemId, number>;
  items.pokeball = balls;
  items.potion = POTION.startCount;
  return items;
}
const SAVE_KEY = 'save';
let current: GameState | null = null;

/** chí mạng mặc định đã được trừ vào sức mạnh → loài trung bình gây sát thương kỳ vọng như trước */
const CRIT_NORM = 1 + BASE_CRIT * (CRIT_MULT - 1);

/**
 * Chỉ số thực của một Pokémon = chỉ số gốc của LOÀI HIỆN TẠI (data/stats.ts) theo cấp + Huấn luyện.
 * speciesId cho phép tính thử với loài khác (vd. so sánh trước/sau tiến hóa).
 * - maxHp  = hpAt(hp, Lv) × (1 + Sinh lực)
 * - power  = powerAt(atk, Lv) × (1 + Sức mạnh) / CRIT_NORM   (nhân vào sát thương chiêu)
 * - def    = def × (1 + Giáp)  → takenMult = DEFENSE.takenMult(def, Lv) (nhân vào sát thương nhận)
 * - speed  = speedAt(speed, Lv) × (1 + Sải bước)
 * - crit   = crit loài + Chí mạng (×1.5 sát thương) · haste = haste loài + Phản xạ (hồi chiêu × (1 − haste))
 * - regen  = (regen loài + Quang hợp) × maxHp mỗi giây · xpMult = 1 + Thông thái
 */
export function memberStats(m: PartyMember, speciesId = m.speciesId) {
  const s = speciesStats(POKEMON[speciesId]);
  const tb = (k: TrainStat) => trainLevel(m, k) * TRAINING[k].per;
  const maxHp = Math.max(1, Math.round(STATS.hpAt(s.hp, m.level) * (1 + tb('vitality'))));
  const def = Math.round(s.def * (1 + tb('armor')));
  const haste = Math.min(0.5, s.haste + tb('reflexes'));
  const regenPct = s.regen + tb('synthesis');
  return {
    maxHp,
    power: (STATS.powerAt(s.atk, m.level) * (1 + tb('strength'))) / CRIT_NORM,
    /** Tấn công hiển thị (thang giống atk gốc ở Lv 5) */
    attack: Math.round(STATS.powerAt(s.atk, m.level) * (1 + tb('strength')) * 50),
    speed: STATS.speedAt(s.speed, m.level) * (1 + tb('stride')),
    def,
    takenMult: DEFENSE.takenMult(def, m.level),
    crit: Math.min(0.75, s.crit + tb('critical')),
    haste,
    cdMult: 1 - haste,
    regenPct,
    regen: regenPct * maxHp,
    xpMult: 1 + tb('wisdom'),
  };
}
export type MemberStats = ReturnType<typeof memberStats>;

export function trainLevel(m: PartyMember, k: TrainStat) {
  const v = m.train?.[k] ?? 0;
  return Number.isFinite(v) ? Math.max(0, Math.min(TRAINING[k].max, Math.floor(v))) : 0;
}

/** Giá Huấn luyện lên cấp kế tiếp (null = đã tối đa) */
export function trainCost(m: PartyMember, k: TrainStat): number | null {
  const lv = trainLevel(m, k);
  const c = TRAINING[k];
  if (lv >= c.max) return null;
  return Math.round((c.cost * Math.pow(c.growth, lv)) / 10) * 10;
}

/** Nấc Huấn luyện kế tiếp còn khóa theo tiến độ: trả về số huy hiệu cần (null = đã mở / đã tối đa). Xem trainGate. */
export function trainLockedBadges(state: GameState, m: PartyMember, k: TrainStat): number | null {
  const lv = trainLevel(m, k);
  if (lv >= TRAINING[k].max || lv < trainGate(k, state.badges.length)) return null;
  return trainBadgesFor(k, lv + 1);
}

/** Huấn luyện một chỉ số (trừ tiền). Trả về lý do nếu không được. */
export function trainMember(state: GameState, m: PartyMember, k: TrainStat): string | null {
  const cost = trainCost(m, k);
  if (cost === null) return t('train.errMax');
  const need = trainLockedBadges(state, m, k);
  if (need !== null) return t('train.errGate', { n: need });
  if (state.money < cost) return t('team.errMoney');
  const before = memberStats(m).maxHp;
  state.money -= cost;
  m.train = { ...m.train, [k]: trainLevel(m, k) + 1 };
  // Sinh lực: máu hiện tại tăng theo phần máu tối đa vừa thêm
  const after = memberStats(m).maxHp;
  if (m.hp > 0) m.hp = Math.min(after, m.hp + Math.max(0, after - before));
  return null;
}

/** Cách tính khóa chiêu: 'earned' = đã học bằng thành tích (game/unlocks.ts) · 'level' = luật cũ theo cấp loài (Sinh tồn) · 'free' = không khóa (Skill Lab) */
export type SkillLockMode = 'earned' | 'level' | 'free';

/** Các chiêu: ô → chiêu (đã áp nâng cấp), cấp yêu cầu, đã mở chưa, cấp nâng cấp */
export function memberSkills(m: PartyMember, mode: SkillLockMode = 'earned'): { slot: SkillSlot; move: MoveDef; base: MoveDef; unlockLevel: number; unlocked: boolean; upgrade: number }[] {
  return POKEMON[m.speciesId].skills.map((s) => {
    const upgrade = skillLevel(m, s.slot);
    const unlocked = mode === 'free' || (mode === 'level' ? m.level >= s.level : isLearned(m, s.slot));
    return { slot: s.slot, move: slotScaledMove(upgradeMove(MOVES[s.move], upgrade), s.slot), base: MOVES[s.move], unlockLevel: mode === 'level' ? s.level : slotLevel(m.speciesId, s.slot), unlocked, upgrade };
  });
}

export function skillLevel(m: PartyMember, slot: SkillSlot) {
  return Math.max(0, Math.min(SKILL_MAX_LEVEL, m.skillLv?.[slot] ?? 0));
}

/** Giá để nâng ô chiêu lên cấp kế tiếp (null = đã tối đa) */
export function upgradeCost(m: PartyMember, slot: SkillSlot): number | null {
  const lv = skillLevel(m, slot);
  if (lv >= SKILL_MAX_LEVEL) return null;
  return Math.round((SKILL_UPGRADE.cost[lv] * (SKILL_UPGRADE.slotMult[slot] ?? 1)) / 10) * 10;
}

/** Cấp nâng chiêu kế tiếp còn khóa theo tiến độ: trả về số huy hiệu cần (null = đã mở / đã tối đa). Xem skillGate. */
export function skillLockedBadges(state: GameState, m: PartyMember, slot: SkillSlot): number | null {
  const lv = skillLevel(m, slot);
  if (lv >= SKILL_MAX_LEVEL || lv < skillGate(state.badges.length)) return null;
  let b = state.badges.length;
  while (skillGate(b) <= lv && b < 8) b++;
  return b;
}

export function skillMastery(m: PartyMember, slot: SkillSlot): number {
  return Math.max(0, Math.floor(m.mastery?.[slot] ?? 0));
}

/** Thông thạo cần để lên cấp nâng kế tiếp (0 = không cần; null = đã tối đa) */
export function masteryNeeded(m: PartyMember, slot: SkillSlot): number | null {
  const lv = skillLevel(m, slot);
  if (lv >= SKILL_MAX_LEVEL) return null;
  return SKILL_UPGRADE.mastery[lv + 1] ?? 0;
}

export function addMastery(m: PartyMember, slot: SkillSlot, n = 1) {
  m.mastery = { ...m.mastery, [slot]: skillMastery(m, slot) + n };
}

/** Lý do chưa nâng cấp được (theo thứ tự ưu tiên hiển thị) – null = nâng được */
export function upgradeBlock(state: GameState, m: PartyMember, slot: SkillSlot): { kind: 'max' } | { kind: 'badges'; n: number } | { kind: 'mastery'; have: number; need: number } | { kind: 'money'; cost: number } | null {
  const cost = upgradeCost(m, slot);
  if (cost === null) return { kind: 'max' };
  const badges = skillLockedBadges(state, m, slot);
  if (badges !== null) return { kind: 'badges', n: badges };
  const need = masteryNeeded(m, slot) ?? 0;
  const have = skillMastery(m, slot);
  if (have < need) return { kind: 'mastery', have, need };
  if (state.money < cost) return { kind: 'money', cost };
  return null;
}

/** Nâng cấp chiêu (trừ tiền). Trả về lý do nếu không được. */
export function upgradeSkill(state: GameState, m: PartyMember, slot: SkillSlot): string | null {
  const cost = upgradeCost(m, slot);
  if (cost === null) return t('team.maxed');
  const need = skillLockedBadges(state, m, slot);
  if (need !== null) return t('train.errGate', { n: need });
  const mNeed = masteryNeeded(m, slot) ?? 0;
  if (skillMastery(m, slot) < mNeed) return t('team.errMastery', { have: skillMastery(m, slot), need: mNeed });
  if (state.money < cost) return tr('Not enough money!', 'Không đủ tiền!');
  state.money -= cost;
  m.skillLv = { ...m.skillLv, [slot]: skillLevel(m, slot) + 1 };
  return null;
}

export function xpToNext(level: number) {
  return STATS.xpForLevel(level);
}

export function makeMember(speciesId: string, level: number): PartyMember {
  const m: PartyMember = { uid: `${speciesId}-${Date.now().toString(36)}-${Math.floor(Math.random() * 1e6).toString(36)}`, speciesId, level, xp: 0, hp: 0, unlocks: {} };
  m.hp = memberStats(m).maxHp;
  return m;
}

export function levelCap(state: GameState | null = current) {
  return levelCapFor(state?.badges.length ?? 0);
}

/** Cộng EXP (không vượt giới hạn cấp theo huy hiệu); trả về số cấp vừa tăng */
export function gainXp(m: PartyMember, amount: number, cap = levelCap()): number {
  let gained = 0;
  if (m.level >= cap) {
    m.xp = Math.min(m.xp, xpToNext(m.level) - 1);
    return 0;
  }
  m.xp += amount;
  while (m.level < cap && m.xp >= xpToNext(m.level)) {
    const before = memberStats(m).maxHp;
    m.xp -= xpToNext(m.level);
    m.level++;
    gained++;
    const after = memberStats(m).maxHp;
    if (m.hp > 0) m.hp = Math.min(after, m.hp + (after - before));
  }
  if (m.level >= cap) m.xp = Math.min(m.xp, xpToNext(m.level) - 1);
  return gained;
}

/** Hồi đầy máu (không chữa con bị thương) */
export function healTeam(state: GameState, includeInjured = false) {
  for (const m of state.box) {
    if (m.injured && !includeInjured) continue;
    if (includeInjured) m.injured = false;
    m.hp = memberStats(m).maxHp;
  }
}

export function careCost(m: PartyMember) {
  return ECONOMY.carePerLevel * m.level;
}

export function teamMembers(state: GameState): PartyMember[] {
  return state.team.map((uid) => state.box.find((m) => m.uid === uid)).filter((m): m is PartyMember => !!m);
}

/** Đội ra trận: bỏ con bị thương; nếu trống thì lấy con khỏe đầu tiên trong Hộp */
export function battleTeam(state: GameState): PartyMember[] {
  const t = teamMembers(state).filter((m) => !m.injured);
  if (t.length) return t;
  const ok = state.box.find((m) => !m.injured);
  return ok ? [ok] : [];
}

/** Thêm Pokémon mới bắt vào Hộp, tự đưa vào đội nếu còn chỗ */
/** Chế độ thử (chỉ bản dev, mở bằng ?test trên URL): mở mọi ải + tặng 3 Pokémon dạng cuối Lv50 làm đội hình. Chạy 1 lần mỗi save. */
export const DEV_TEST_TEAM = ['charizard', 'blastoise', 'venusaur'];
const devLearnAll = (state: GameState) => {
  for (const m of state.box) {
    if (!DEV_TEST_TEAM.includes(m.speciesId) || m.level < 50) continue;
    m.unlocks = { ...(m.unlocks ?? {}), learned: ['K', 'L', 'U', 'I'] };
  }
};
export function applyDevTest(state: GameState): boolean {
  if (state.flags.devUnlockAll) {
    // save đã bật chế độ thử trước đó: chỉ mở full chiêu cho đội thử
    devLearnAll(state);
    saveGame();
    return false;
  }
  state.flags.devUnlockAll = true;
  const uids: string[] = [];
  for (const sp of DEV_TEST_TEAM) {
    const m = makeMember(sp, 50);
    state.box.push(m);
    uids.push(m.uid);
  }
  state.team = uids;
  devLearnAll(state);
  state.items.pokeball += 20;
  state.items.ultraball += 10;
  state.items.potion += 10;
  state.money += 20000;
  saveGame();
  return true;
}

export function addToBox(state: GameState, m: PartyMember) {
  state.box.push(m);
  if (state.team.length < TEAM_SIZE) state.team.push(m.uid);
}

/**
 * Tiến hóa: chỉ đổi speciesId. Quy tắc chỉ số:
 * - chỉ số gốc (Máu, Tấn công, Phòng thủ, Tốc độ, Chí mạng, Hồi chiêu, Hồi máu) chuyển hẳn sang chỉ số gốc của loài mới;
 * - cấp, EXP, cấp nâng chiêu (skillLv) và cấp Huấn luyện (train) nằm trên PartyMember nên giữ nguyên
 *   và tiếp tục cộng % lên chỉ số mới;
 * - máu hiện tại tăng thêm đúng phần máu tối đa vừa tăng.
 */
export function evolveMember(m: PartyMember, into: string) {
  const before = memberStats(m).maxHp;
  m.speciesId = into;
  const after = memberStats(m).maxHp;
  m.hp = Math.min(after, m.hp + Math.max(0, after - before));
}

export { EVOLUTION_ITEMS } from './items';
export type { EvolutionItem } from './items';

/** Tiến hóa bằng vật phẩm (vd. Pikachu + Đá Sấm): trả về loài mới nếu dùng được */
export function itemEvolution(m: PartyMember, item: string): string | null {
  return evolutionsOf(POKEMON[m.speciesId]).find((e) => e.item === item)?.into ?? null;
}

/** Loài này có thể tiến hóa ngay không (theo cấp) */
export function evolutionReady(m: PartyMember): string | null {
  return evolutionsOf(POKEMON[m.speciesId]).find((e) => e.level && m.level >= e.level)?.into ?? null;
}

export function stageCleared(state: GameState | null, id: string) {
  if (id === 'pallet') return true;
  return (state?.stages[id]?.clears ?? 0) > 0;
}

/** nhân vật + tên vừa chọn ở màn Chọn nhân vật (dùng khi bắt đầu Cuộc phiêu lưu mới) */
let pendingHero: { name: string; avatar: string } | null = null;
export function setPendingHero(name: string, avatar: string) {
  pendingHero = { name: name.trim().slice(0, 16) || 'Satoshi', avatar };
}

/** Nhân vật đang dùng (bản lưu → màn chọn → tài khoản → mặc định) */
export function trainerAvatar(): string {
  return current?.avatar || pendingHero?.avatar || currentUser()?.avatar || 'satoshi';
}

export function newGame(region: string, starterId: string, trainer = pendingHero?.name ?? currentUser()?.trainerName ?? 'Satoshi'): GameState {
  const starter = makeMember(starterId, ECONOMY.starterLevel);
  current = {
    version: 2,
    trainer,
    avatar: pendingHero?.avatar ?? currentUser()?.avatar ?? 'satoshi',
    region,
    starter: starterId,
    box: [starter],
    team: [starter.uid],
    money: ECONOMY.startMoney,
    items: emptyItems(),
    badges: [],
    stages: {},
    cursor: 'route1-a',
    flags: {},
    playMs: 0,
  };
  markCaught(current, starterId);
  saveGame();
  return current;
}

function validMember(m: unknown): m is PartyMember {
  const x = m as PartyMember;
  return !!x && typeof x.speciesId === 'string' && !!POKEMON[x.speciesId] && Number.isFinite(x.level) && Number.isFinite(x.hp);
}

/** Đọc bản lưu (v2, hoặc chuyển từ v1) */
function parse(raw: unknown): GameState | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Record<string, unknown>;
  if (r.version === 1 && Array.isArray(r.party)) {
    const party = (r.party as unknown[]).filter(validMember);
    if (!party.length) return null;
    const badges = Array.isArray(r.badges) ? (r.badges as string[]) : [];
    const stages: Record<string, StageRecord> = {};
    if (badges.includes('boulder')) {
      for (const id of ['route1-a', 'route1-b', 'forest-a', 'forest-event', 'forest-b', 'forest-elite', 'gym-pewter']) stages[id] = { stars: 1, clears: 1, bestTimeMs: 0 };
    }
    return {
      version: 2, trainer: 'Satoshi', region: 'kanto', box: party, team: party.slice(0, TEAM_SIZE).map((m) => m.uid),
      money: ECONOMY.startMoney, items: emptyItems(), badges, stages,
      cursor: 'route1-a', flags: {}, playMs: Number(r.playMs) || 0,
    };
  }
  if (r.version !== 2 || !Array.isArray(r.box)) return null;
  const g = raw as GameState;
  g.box = g.box.filter(validMember);
  if (!g.box.length) return null;
  g.team = (Array.isArray(g.team) ? g.team : []).filter((uid) => g.box.some((m) => m.uid === uid)).slice(0, TEAM_SIZE);
  if (!g.team.length) g.team = [g.box[0].uid];
  g.money = Number.isFinite(g.money) ? g.money : 0;
  const rawItems = (g.items ?? {}) as Partial<Record<ItemId, unknown>>;
  g.items = emptyItems(0);
  for (const id of ALL_ITEMS) {
    const v = Number(rawItems[id]);
    if (Number.isFinite(v) && v >= 0) g.items[id] = Math.floor(v);
  }
  if (!Number.isFinite(Number(rawItems.potion))) g.items.potion = POTION.startCount;
  g.badges = Array.isArray(g.badges) ? g.badges : [];
  g.stages = g.stages && typeof g.stages === 'object' ? g.stages : {};
  g.flags = g.flags ?? {};
  g.playMs = Number.isFinite(g.playMs) ? g.playMs : 0;
  g.cursor = typeof g.cursor === 'string' ? g.cursor : 'route1-a';
  g.trainer = typeof g.trainer === 'string' && g.trainer.trim() ? g.trainer.trim().slice(0, 16) : 'Satoshi';
  g.avatar = isAvatar(g.avatar) ? g.avatar : 'satoshi';
  // Pokédex: bản lưu cũ thì dựng từ Hộp; lọc loài không còn tồn tại
  const dex = g.dex && Array.isArray(g.dex.seen) && Array.isArray(g.dex.caught) ? g.dex : { seen: [], caught: [], claimed: [] };
  dex.seen = dex.seen.filter((id) => typeof id === 'string' && !!POKEMON[id]);
  dex.caught = dex.caught.filter((id) => typeof id === 'string' && !!POKEMON[id]);
  dex.claimed = Array.isArray(dex.claimed) ? dex.claimed.filter((i) => Number.isInteger(i)) : [];
  g.dex = dex;
  for (const m of g.box) markCaught(g, m.speciesId);
  for (const m of g.box) {
    m.xp = Number.isFinite(m.xp) ? m.xp : 0;
    if (m.skillLv && typeof m.skillLv !== 'object') delete m.skillLv;
    // Thông thạo: bản lưu cũ không có → 0 (cấp nâng đã mua giữ nguyên)
    if (m.mastery && typeof m.mastery === 'object') {
      const raw = m.mastery as Record<string, unknown>;
      const clean: Partial<Record<SkillSlot, number>> = {};
      for (const k of ['J', 'K', 'L', 'U'] as SkillSlot[]) {
        const v = Number(raw[k]);
        if (Number.isFinite(v) && v > 0) clean[k] = Math.floor(v);
      }
      m.mastery = clean;
    } else delete m.mastery;
    if (m.train && typeof m.train === 'object') {
      const tr0 = m.train as Record<string, unknown>;
      const clean: Partial<Record<TrainStat, number>> = {};
      for (const k of TRAIN_STATS) {
        const v = Number(tr0[k]);
        if (Number.isFinite(v) && v > 0) clean[k] = Math.min(TRAINING[k].max, Math.floor(v));
      }
      m.train = clean;
    } else delete m.train;
    // mở khóa chiêu: bản lưu cũ → giữ mọi chiêu đã dùng được theo luật cũ (game/unlocks.ts)
    migrateUnlocks(m);
    m.hp = Math.min(Math.max(0, m.hp), memberStats(m).maxHp);
  }
  return g;
}

export function hasSave(): boolean {
  return parse(loadJson<unknown>(SAVE_KEY, null as unknown)) !== null;
}

export function loadGame(): GameState | null {
  const g = parse(loadJson<unknown>(SAVE_KEY, null as unknown));
  if (!g) return null;
  current = g;
  return current;
}

export function saveGame(): boolean {
  if (!current) return false;
  const ok = saveJson(SAVE_KEY, current);
  // đã đăng nhập → hẹn đồng bộ lên mây
  scheduleCloudSave(current);
  return ok;
}

/** Nạp bản lưu từ nơi khác (save trên mây): kiểm tra hợp lệ, đặt làm bản hiện tại và lưu trên máy */
export function importSave(raw: unknown): GameState | null {
  const g = parse(JSON.parse(JSON.stringify(raw ?? null)));
  if (!g) return null;
  current = g;
  saveJson(SAVE_KEY, current);
  return current;
}

/** Đọc bản lưu trên máy (không đổi bản hiện tại) – để so với bản trên mây */
export function peekLocalSave(): GameState | null {
  return parse(loadJson<unknown>(SAVE_KEY, null as unknown));
}

/** Tên huấn luyện viên đang dùng (bản lưu → tài khoản → mặc định) */
export function trainerName(): string {
  return current?.trainer || pendingHero?.name || currentUser()?.trainerName || 'Satoshi';
}

export function getGame(): GameState | null {
  return current;
}
