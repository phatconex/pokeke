// Mở khóa chiêu bằng thành tích: tiến độ lưu trên PartyMember.unlocks (giữ nguyên khi tiến hóa).
// Dữ liệu nhiệm vụ / thử thách: data/unlocks.ts · ngưỡng: config/balance.ts → SKILL_UNLOCK.
// Quy tắc: J có sẵn · K: Lv + J trúng ×30 · L: Lv + nhiệm vụ theo hệ · U: Lv + Thử thách chiêu · I: tiến hóa + thắng trận lớn / KO.
// Đủ điều kiện giữa trận → toast "sẵn sàng học"; chiêu được HỌC khi trận kết thúc (learnReady) → dùng từ trận sau.
import { legendOf } from '../data/legendary';
import { ENEMY_STATS, SKILL_UNLOCK } from '../config/balance';
import { MOVES } from '../data/moves';
import { hasPreEvolution, hasUltimate, POKEMON, SkillSlot } from '../data/pokemon';
import { effectiveness, PokemonType } from '../data/types';
import { FALLBACK_QUEST, QUEST_EVENTS, QuestDef, QuestEvent, SPECIES_UNLOCKS, TRIAL_THEMES, TYPE_QUESTS } from '../data/unlocks';
import type { PartyMember } from './state';

export type UnlockSlot = 'K' | 'L' | 'U' | 'I';
export const UNLOCK_SLOTS: UnlockSlot[] = ['K', 'L', 'U', 'I'];

export interface UnlockProgress {
  /** ô đã học (vĩnh viễn) */
  learned?: UnlockSlot[];
  /** bộ đếm sự kiện nhiệm vụ L */
  quest?: Partial<Record<QuestEvent, number>>;
  /** đã vượt Thử thách chiêu (U) */
  trial?: boolean;
  /** số trận thủ lĩnh / Tứ Thiên Vương / Shigeru thắng khi có mặt trong đội */
  bigWins?: number;
  /** số đòn kết liễu (KO!) khi đang ra sân */
  kos?: number;
}

export type ReqKind = 'level' | 'jHits' | 'quest' | 'trial' | 'evolve' | 'bigWin' | 'kos';
export interface Req {
  kind: ReqKind;
  have: number;
  need: number;
  done: boolean;
  event?: QuestEvent;
}

export interface SlotUnlock {
  slot: UnlockSlot;
  learned: boolean;
  /** đủ mọi điều kiện (chưa học thì sẽ học khi hết trận) */
  ready: boolean;
  /** điều kiện bắt buộc (tất cả) */
  reqs: Req[];
  /** điều kiện "một trong" (Tuyệt chiêu: thắng trận lớn HOẶC KO) */
  anyOf: Req[];
}

const STATUS_EVENTS = ['burn', 'poison', 'paralyze', 'confuse', 'sleep', 'freeze'] as const;

/** bộ chiêu J/K của loài có gây được sự kiện này không (để chọn nhiệm vụ khả thi) */
function questFeasible(speciesId: string, ev: QuestEvent): boolean {
  const moves = POKEMON[speciesId].skills.filter((s) => s.slot === 'J' || s.slot === 'K').map((s) => MOVES[s.move]).filter(Boolean);
  if ((STATUS_EVENTS as readonly string[]).includes(ev)) return moves.some((m) => m.status?.kind === ev);
  if (ev === 'drain') return moves.some((m) => !!m.drain || m.status?.kind === 'seed');
  if (ev === 'knockback') return moves.some((m) => (m.knockback ?? 0) >= SKILL_UNLOCK.knockbackMin);
  return true;
}

/** nhiệm vụ L của loài: đặt riêng → hệ chính → hệ phụ → mặc định */
export function questFor(speciesId: string): QuestDef {
  const o = SPECIES_UNLOCKS[speciesId]?.L;
  if (o) return o;
  for (const ty of POKEMON[speciesId]?.types ?? []) {
    const q = TYPE_QUESTS[ty];
    if (q && questFeasible(speciesId, q.event)) return q;
  }
  return FALLBACK_QUEST;
}

/** cấp yêu cầu của ô = max(cấp trong SKILL_UNLOCK / đặt riêng, cấp mở của loài) */
export function slotLevel(speciesId: string, slot: SkillSlot): number {
  const sp = POKEMON[speciesId];
  const own = sp?.skills.find((s) => s.slot === slot)?.level ?? 1;
  if (slot === 'J') return 1;
  const base = SPECIES_UNLOCKS[speciesId]?.levels?.[slot] ?? SKILL_UNLOCK[slot].level;
  return Math.max(base, own);
}

function up(m: PartyMember): UnlockProgress {
  if (!m.unlocks) m.unlocks = {};
  return m.unlocks;
}

export function isLearned(m: PartyMember, slot: SkillSlot | 'I'): boolean {
  if (slot === 'J') return true;
  // huyền thoại: mọi chiêu (kể cả tuyệt chiêu) mở sẵn, không cần nhiệm vụ / thử thách
  if (legendOf(m.speciesId)) return true;
  return !!m.unlocks?.learned?.includes(slot);
}

export function questCount(m: PartyMember, ev: QuestEvent): number {
  return Math.max(0, Math.floor(m.unlocks?.quest?.[ev] ?? 0));
}

/** Trạng thái mở khóa một ô (null nếu loài không có ô đó) */
export function slotUnlock(m: PartyMember, slot: UnlockSlot): SlotUnlock | null {
  const sp = POKEMON[m.speciesId];
  if (!sp) return null;
  const learned = isLearned(m, slot);
  const reqs: Req[] = [];
  const anyOf: Req[] = [];
  const req = (kind: ReqKind, have: number, need: number, event?: QuestEvent): Req => ({ kind, have: Math.min(have, need), need, done: have >= need, event });
  if (slot === 'I') {
    reqs.push(req('evolve', hasUltimate(sp.id) ? 1 : 0, 1));
    anyOf.push(req('bigWin', m.unlocks?.bigWins ?? 0, SKILL_UNLOCK.I.bigWins), req('kos', m.unlocks?.kos ?? 0, SKILL_UNLOCK.I.kos));
  } else {
    if (!sp.skills.some((s) => s.slot === slot)) return null;
    reqs.push(req('level', m.level, slotLevel(sp.id, slot)));
    if (slot === 'K') reqs.push(req('jHits', Math.floor(m.mastery?.J ?? 0), SKILL_UNLOCK.K.jHits));
    else if (slot === 'L') {
      const q = questFor(sp.id);
      reqs.push(req('quest', questCount(m, q.event), q.n, q.event));
    } else reqs.push(req('trial', m.unlocks?.trial ? 1 : 0, 1));
  }
  const ready = reqs.every((r) => r.done) && (!anyOf.length || anyOf.some((r) => r.done));
  // Tuyệt chiêu đã học nhưng dạng hiện tại chưa có (không xảy ra với dòng tiến hóa thường) → vẫn khóa
  return { slot, learned: learned && (slot !== 'I' || hasUltimate(sp.id)), ready, reqs, anyOf };
}

/** ô đã đủ điều kiện nhưng chưa học */
export function readySlots(m: PartyMember): UnlockSlot[] {
  return UNLOCK_SLOTS.filter((s) => {
    const u = slotUnlock(m, s);
    return !!u && !u.learned && u.ready;
  });
}

/** Học mọi ô đã đủ điều kiện (gọi khi hết trận / vào trận) – trả về các ô vừa học */
export function learnReady(m: PartyMember): UnlockSlot[] {
  const now = readySlots(m);
  if (now.length) {
    const p = up(m);
    p.learned = [...new Set([...(p.learned ?? []), ...now])];
  }
  return now;
}

export function addQuest(m: PartyMember, ev: QuestEvent, n = 1) {
  const p = up(m);
  p.quest = { ...p.quest, [ev]: questCount(m, ev) + n };
}

export function addKo(m: PartyMember) {
  const p = up(m);
  p.kos = (p.kos ?? 0) + 1;
}

export function addBigWin(m: PartyMember) {
  const p = up(m);
  p.bigWins = (p.bigWins ?? 0) + 1;
}

export function markTrialCleared(m: PartyMember) {
  up(m).trial = true;
}

/** Thử thách chiêu mở được chưa: loài có ô U, đủ cấp U, chưa vượt */
export function trialState(m: PartyMember): 'none' | 'level' | 'open' | 'cleared' {
  const sp = POKEMON[m.speciesId];
  if (!sp?.skills.some((s) => s.slot === 'U')) return 'none';
  if (m.unlocks?.trial) return 'cleared';
  return m.level >= slotLevel(sp.id, 'U') ? 'open' : 'level';
}

/**
 * Bản lưu cũ (chưa có unlocks): mọi chiêu đã dùng được theo luật cũ (đủ cấp mở của loài; K luôn mở từ Lv 1;
 * Tuyệt chiêu khi đã tiến hóa) giữ nguyên là đã học – không khóa lại chiêu của người chơi cũ.
 */
export function migrateUnlocks(m: PartyMember) {
  const raw = m.unlocks as unknown;
  if (raw && typeof raw === 'object') {
    // làm sạch
    const r = raw as Record<string, unknown>;
    const learned = Array.isArray(r.learned) ? (r.learned as unknown[]).filter((s): s is UnlockSlot => UNLOCK_SLOTS.includes(s as UnlockSlot)) : [];
    const quest: Partial<Record<QuestEvent, number>> = {};
    if (r.quest && typeof r.quest === 'object') {
      for (const ev of QUEST_EVENTS) {
        const v = Number((r.quest as Record<string, unknown>)[ev]);
        if (Number.isFinite(v) && v > 0) quest[ev] = Math.floor(v);
      }
    }
    const num = (v: unknown) => (Number.isFinite(Number(v)) && Number(v) > 0 ? Math.floor(Number(v)) : 0);
    m.unlocks = { learned: [...new Set(learned)], quest, trial: r.trial === true, bigWins: num(r.bigWins), kos: num(r.kos) };
    return;
  }
  const sp = POKEMON[m.speciesId];
  const learned: UnlockSlot[] = [];
  for (const s of sp.skills) if (s.slot !== 'J' && m.level >= s.level) learned.push(s.slot as UnlockSlot);
  if (hasUltimate(sp.id)) learned.push('I');
  m.unlocks = { learned, trial: learned.includes('U') };
}

/** Địch của Thử thách chiêu theo hệ: loài cơ bản bị hệ này khắc (×2), thiếu thì thêm loài trung tính */
export function trialPool(type: PokemonType): string[] {
  const cands = Object.values(POKEMON)
    .filter((sp) => ENEMY_STATS[sp.id] && ENEMY_STATS[sp.id].behavior !== 'boss' && !hasPreEvolution(sp.id) && sp.catchRate >= 45)
    .sort((a, b) => a.dex - b.dex);
  const strong = cands.filter((sp) => effectiveness(type, sp.types) >= 2).map((sp) => sp.id);
  const neutral = cands.filter((sp) => effectiveness(type, sp.types) === 1).map((sp) => sp.id);
  const pool = strong.slice(0, 4);
  for (const id of neutral) {
    if (pool.length >= 5) break;
    pool.push(id);
  }
  return pool.length ? pool : ['rattata', 'pidgey'];
}

export function trialTheme(type: PokemonType) {
  return TRIAL_THEMES[type] ?? TRIAL_THEMES.normal;
}
