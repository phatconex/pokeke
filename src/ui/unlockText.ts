// Chữ hiển thị yêu cầu mở khóa chiêu (HUD, Đội hình, Skill Lab, Trung tâm Pokémon) – dùng chung.
import { POKEMON, SkillSlot } from '../data/pokemon';
import type { PartyMember } from '../game/state';
import { SKILL_UNLOCK } from '../config/balance';
import { questFor, Req, slotLevel, slotUnlock, SlotUnlock, UnlockSlot } from '../game/unlocks';
import { t } from '../i18n';

const OK = '✓';
const NO = '✗';

/** một điều kiện dạng đầy đủ: "Lv 10 ✓", "Burn 18/25 enemies", "Skill Trial ✗ (Pokémon Center)" */
export function reqText(r: Req, m: PartyMember): string {
  const name = POKEMON[m.speciesId]?.name ?? '';
  const p = `${r.have}/${r.need}`;
  switch (r.kind) {
    case 'level': return `Lv ${r.need} ${r.done ? OK : NO}`;
    case 'jHits': return t('unlock.jHits', { p }) + (r.done ? ` ${OK}` : '');
    case 'quest': return t(`unlock.q.${r.event}`, { p, name }) + (r.done ? ` ${OK}` : '');
    case 'trial': return r.done ? `${t('unlock.trial')} ${OK}` : `${t('unlock.trial')} ${NO} ${t('unlock.trialWhere')}`;
    case 'evolve': return `${t('unlock.evolve')} ${r.done ? OK : NO}`;
    case 'bigWin': return t('unlock.bigWin', { name, p });
    case 'kos': return t('unlock.kos', { p });
  }
}

/** danh sách điều kiện một dòng: "Lv 10 ✓ · Burn 18/25 enemies" (Tuyệt chiêu: "... · Win a gym battle with X or 3 KO finishers (1/3)") */
export function reqLine(u: SlotUnlock, m: PartyMember): string {
  const parts = u.reqs.filter((r) => !(u.slot === 'I' && r.kind === 'evolve' && r.done)).map((r) => reqText(r, m));
  if (u.anyOf.length) parts.push(ultAnyText(u, m));
  return parts.join(' · ');
}

/** "Win a gym battle with Charmeleon or 3 KO finishers (1/3)" */
export function ultAnyText(u: SlotUnlock, m: PartyMember): string {
  const win = u.anyOf.find((r) => r.kind === 'bigWin');
  const ko = u.anyOf.find((r) => r.kind === 'kos');
  if (u.anyOf.some((r) => r.done)) return `${t('unlock.ultAnyDone')} ${OK}`;
  return t('unlock.ultAny', { name: POKEMON[m.speciesId]?.name ?? '', n: ko?.need ?? 3, have: ko?.have ?? 0, w: win?.need ?? 1 });
}

/** nhãn ngắn trên ô HUD khi khóa: { top: trong ô (vd. "Lv 10", "9/25"), label: dưới ô (vd. "Burn") } */
export function slotLockShort(m: PartyMember, slot: SkillSlot | 'I'): { top: string; label: string } {
  const u = slotUnlock(m, slot as UnlockSlot);
  if (!u) return { top: '', label: '???' };
  const lvl = u.reqs.find((r) => r.kind === 'level');
  if (lvl && !lvl.done) return { top: `Lv ${lvl.need}`, label: '???' };
  if (u.ready) return { top: '✦', label: t('unlock.s.ready') };
  const r = u.reqs.find((x) => !x.done);
  if (r?.kind === 'evolve') return { top: '', label: t('hud.ultLocked') };
  if (r?.kind === 'jHits') return { top: `${r.have}/${r.need}`, label: t('unlock.s.jHits') };
  if (r?.kind === 'quest') return { top: `${r.have}/${r.need}`, label: t(`unlock.s.${r.event}`) };
  if (r?.kind === 'trial') return { top: '', label: t('unlock.s.trial') };
  const ko = u.anyOf.find((x) => x.kind === 'kos');
  return { top: ko ? `${ko.have}/${ko.need}` : '', label: t('unlock.s.ko') };
}

/** Thông báo "sẵn sàng học" */
export function readyToast(m: PartyMember, moveName: string): string {
  return t('unlock.readyToast', { name: POKEMON[m.speciesId]?.name ?? '', move: moveName });
}

/** Tóm tắt điều kiện của một ô theo loài (không kèm tiến độ) – Skill Lab: "Unlock: Lv 10 + Burn 25 enemies" */
export function reqSummary(speciesId: string, slot: UnlockSlot): string {
  const sp = POKEMON[speciesId];
  if (!sp) return '';
  const name = sp.name;
  if (slot === 'I') return t('unlock.summary', { req: `${t('unlock.evolve')} + ${t('unlock.ultAny', { name, n: SKILL_UNLOCK.I.kos, have: 0 }).replace(/\s*\(0\/\d+\)$/, '')}` });
  if (!sp.skills.some((s) => s.slot === slot)) return '';
  const lv = `Lv ${slotLevel(speciesId, slot)}`;
  const q = questFor(speciesId);
  const what = slot === 'K' ? t('unlock.jHits', { p: `×${SKILL_UNLOCK.K.jHits}` }) : slot === 'L' ? t(`unlock.q.${q.event}`, { p: q.n, name }) : t('unlock.trial');
  return t('unlock.summary', { req: `${lv} + ${what}` });
}
