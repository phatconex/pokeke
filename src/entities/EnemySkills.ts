// Chiêu đặc trưng theo HỆ của địch (ải, hội quán, boss): đạn theo hệ, vùng nổ báo trước, sóng xung kích.
// Địch thi triển trong lúc vẫn di chuyển; mọi đòn đều có báo trước (vạch / ô sáng) để người chơi né.
import type { MoveDef } from '../data/moveKit';
import type { PokemonType } from '../data/types';
import { TYPE_COLOR } from '../data/types';
import { groundWarn } from '../fx/IceFx';
import { impactRays, powBurst } from '../fx/FightFx';
import { scatter } from '../fx/TypeFx';
import { dialectFor } from '../skills/dialects';
import type { FxDialectId } from '../skills/types';
import { legendOf } from '../data/legendary';
import { playSfx, type SfxName } from '../systems/sfx';
import type { Enemy } from './Enemy';
import type { Fighter } from './Fighter';
import type { BattleCtx } from './types';

type Kind = 'volley' | 'zone' | 'nova' | 'charge' | 'barrage';

interface TypeSkill {
  kinds: [Kind, Kind];
  shot: string;
  /** số viên · góc xòe (độ) · tốc độ */
  fan: [number, number, number];
  /** số ô nổ · bán kính · báo trước (ms) */
  zone: [number, number, number];
  warn: [number, number];
  sfx: SfxName;
}

const T: Partial<Record<PokemonType, TypeSkill>> = {
  fire: { kinds: ['volley', 'zone'], shot: 'fireball', fan: [3, 22, 170], zone: [3, 24, 750], warn: [0xff7a30, 0x3a1204], sfx: 'flame' },
  water: { kinds: ['volley', 'zone'], shot: 'bubble', fan: [3, 26, 160], zone: [4, 22, 750], warn: [0x4ab0ff, 0x0a2a4a], sfx: 'water' },
  electric: { kinds: ['volley', 'zone'], shot: 'zap', fan: [5, 36, 230], zone: [4, 18, 560], warn: [0xffd34a, 0x3a3004], sfx: 'zap' },
  grass: { kinds: ['volley', 'zone'], shot: 'seed', fan: [3, 20, 170], zone: [4, 22, 800], warn: [0x78c850, 0x10300a], sfx: 'leaf' },
  ice: { kinds: ['volley', 'zone'], shot: 'iceshard', fan: [3, 30, 200], zone: [4, 20, 800], warn: [0xa8e4ff, 0x103a5a], sfx: 'waterHi' },
  fighting: { kinds: ['nova', 'zone'], shot: 'rockball', fan: [3, 20, 170], zone: [3, 26, 700], warn: [0xff5a3a, 0x3a1008], sfx: 'hit' },
  psychic: { kinds: ['volley', 'nova'], shot: 'psyball', fan: [3, 28, 170], zone: [3, 22, 800], warn: [0xff60c8, 0x3a0a30], sfx: 'swap' },
  ghost: { kinds: ['volley', 'zone'], shot: 'shadowball', fan: [3, 24, 150], zone: [3, 22, 800], warn: [0x9a5aff, 0x1a0a30], sfx: 'swap' },
  dragon: { kinds: ['volley', 'nova'], shot: 'dragonflame', fan: [5, 44, 190], zone: [3, 24, 750], warn: [0x4a5aff, 0x10103a], sfx: 'roar' },
  rock: { kinds: ['zone', 'volley'], shot: 'rockball', fan: [3, 18, 150], zone: [5, 22, 800], warn: [0xc8b890, 0x2a2018], sfx: 'boom' },
  ground: { kinds: ['zone', 'nova'], shot: 'sludge', fan: [3, 18, 150], zone: [3, 34, 900], warn: [0xe8d090, 0x4a3010], sfx: 'boom' },
  flying: { kinds: ['volley', 'zone'], shot: 'wind', fan: [3, 30, 210], zone: [3, 24, 650], warn: [0xffffff, 0x3a5a8a], sfx: 'dash' },
  poison: { kinds: ['volley', 'zone'], shot: 'poison', fan: [5, 24, 220], zone: [4, 22, 800], warn: [0xd8e040, 0x1a3a08], sfx: 'powder' },
  bug: { kinds: ['volley', 'zone'], shot: 'poison', fan: [2, 12, 220], zone: [4, 18, 700], warn: [0xc8e040, 0x1a2a08], sfx: 'dash' },
  normal: { kinds: ['volley', 'nova'], shot: 'starshot', fan: [3, 20, 190], zone: [3, 22, 750], warn: [0xffffff, 0x3a3a3a], sfx: 'hit' },
};

const DIALECT: Record<string, FxDialectId> = {
  fire: 'fire', water: 'water', electric: 'electric', grass: 'grass', ice: 'ice', fighting: 'fighting', psychic: 'psychic', ghost: 'ghost',
  dragon: 'dragon', rock: 'rock', ground: 'ground', flying: 'flying', poison: 'poison', bug: 'bug', normal: 'normal',
};

/** hồ sơ chiêu của MỘT loài: suy từ hệ + kiểu hành vi + cỡ (tiến hóa) + độ lệch cố định theo tên loài; bảng OVERRIDE ghi đè cho loài đặc biệt */
interface Profile {
  kinds: Kind[];
  shot: string;
  fan: [number, number, number];
  zone: [number, number, number];
  nova: number;
  charge: [number, number];
  barrage: number;
  def: TypeSkill;
}

const OVERRIDE: Record<string, Partial<Pick<Profile, 'kinds' | 'shot' | 'fan' | 'nova' | 'barrage'>>> = {
  onix: { kinds: ['barrage', 'nova', 'charge'], barrage: 9, nova: 96 },
  geodude: { kinds: ['nova', 'charge'], nova: 62 },
  graveler: { kinds: ['charge', 'barrage', 'nova'] },
  golem: { kinds: ['barrage', 'charge', 'nova'], barrage: 8, nova: 90 },
  staryu: { kinds: ['volley', 'zone'], fan: [8, 360, 140], shot: 'starshot' },
  starmie: { kinds: ['volley', 'barrage', 'nova'], fan: [12, 360, 170], shot: 'starshot' },
  voltorb: { kinds: ['nova', 'charge'], nova: 70 },
  electrode: { kinds: ['nova', 'barrage', 'charge'], nova: 92 },
  pikachu: { kinds: ['charge', 'volley', 'zone'], fan: [3, 20, 240] },
  raichu: { kinds: ['volley', 'barrage', 'charge'], fan: [5, 30, 260] },
  zubat: { kinds: ['charge', 'volley'] },
  gengar: { kinds: ['volley', 'zone', 'nova'], fan: [7, 80, 150] },
  gyarados: { kinds: ['barrage', 'volley', 'nova'], nova: 100, barrage: 9 },
  dragonite: { kinds: ['volley', 'barrage', 'nova'], fan: [7, 60, 200], nova: 104 },
  charizard: { kinds: ['barrage', 'volley', 'charge'], barrage: 8 },
  arcanine: { kinds: ['charge', 'barrage'] },
  machamp: { kinds: ['nova', 'charge', 'zone'], nova: 96 },
  alakazam: { kinds: ['volley', 'zone', 'nova'], fan: [5, 50, 170] },
};

const cache = new Map<string, Profile>();
const hashOf = (id: string) => [...id].reduce((a, c) => (a * 31 + c.charCodeAt(0)) >>> 0, 7);

function profileFor(e: Enemy, boss: boolean): Profile {
  const key = e.species.id + (boss ? ':b' : e.alpha ? ':alpha' : '');
  const hit = cache.get(key);
  if (hit) return hit;
  const type = skillTypeOf(e);
  const def = T[type] ?? T.normal!;
  const h = hashOf(e.species.id);
  const hp = e.stats.bossHp ?? e.stats.hp;
  const tier = hp < 28 ? 0 : hp < 55 ? 1 : 2;
  const beh = e.stats.behavior;
  const byBeh: Kind[] = beh === 'rusher' ? ['charge'] : beh === 'ranged' ? ['volley'] : beh === 'tank' ? ['nova'] : beh === 'burrow' ? ['zone'] : beh === 'phantom' ? ['volley'] : beh === 'bomber' ? ['zone'] : [];
  const seq: Kind[] = [];
  for (const k of [...byBeh, ...def.kinds, ...(tier >= 1 ? (['barrage'] as Kind[]) : [])]) if (!seq.includes(k)) seq.push(k);
  // đảo thứ tự theo tên loài để hai loài cùng hệ không mở đầu giống nhau
  if (h % 2 === 1 && seq.length > 1) seq.push(seq.shift()!);
  const kinds = seq.slice(0, boss ? 3 : tier >= 1 ? 3 : 2);
  const j = (a: number, b: number) => a + ((h >> 3) % 100) / 100 * (b - a);
  const prof: Profile = {
    kinds,
    shot: def.shot,
    fan: [Math.max(2, def.fan[0] - 1 + tier + (h % 2)), Math.round(def.fan[1] * j(0.8, 1.25)), Math.round(def.fan[2] * j(0.9, 1.15))],
    zone: [def.zone[0] + tier - (h % 2), Math.round(def.zone[1] * (1 + 0.12 * tier)), def.zone[2]],
    nova: 58 + tier * 14 + (h % 3) * 6,
    charge: [100 + tier * 30 + (h % 3) * 10, 12 + tier * 4],
    barrage: 5 + tier + (h % 2),
    def,
  };
  const o = OVERRIDE[e.species.id];
  if (o) Object.assign(prof, o);
  // Retain species-specific attacks, then fill out the alpha's rotation.
  // Copy the array: OVERRIDE and ordinary enemies must remain unchanged.
  if (e.alpha && !boss) prof.kinds = [...new Set<Kind>([...prof.kinds, ...seq, 'zone', 'volley', 'nova', 'charge'])].slice(0, 4);
  cache.set(key, prof);
  return prof;
}

/** hệ thể hiện của loài: ưu tiên hệ khác Thường (Pidgey = Bay) */
export function skillTypeOf(e: Enemy): PokemonType {
  const ty = e.species.types;
  return (ty.find((t) => t !== 'normal') ?? ty[0]) as PokemonType;
}

export function skillCooldown(e: Enemy, boss: boolean): number {
  if (boss) return e.trainer ? 2600 : 3600;
  if (e.trainer) return e.enraged ? 1900 : 3000;
  return e.alpha ? 6500 : 9500;
}

const STUB = { id: 'enemySkill', name: '', type: 'normal', power: 0, cooldownMs: 0, sfx: 'hit', icon: 'play' } as unknown as MoveDef;

/** gọi mỗi khung từ Enemy/Boss.update khi đã biết mục tiêu */
export function tickEnemySkill(e: Enemy, ctx: BattleCtx, target: Fighter, boss = false) {
  if (e.dead || e.dummy || e.beingCaught || e.skillsOff || e.usesKit || legendOf(e.species.id)) return;
  const now = ctx.clock;
  if (e.nextSkillAt === 0) e.nextSkillAt = now + (e.trainer || boss || e.alpha ? 900 + Math.random() * 1500 : 2500 + Math.random() * 5000);
  if (now < e.nextSkillAt || e.isStunned(now)) return;
  const dist = Math.hypot(target.x - e.x, target.y - e.y);
  if (dist > 300) return;
  const type = skillTypeOf(e);
  const pf = profileFor(e, boss);
  e.nextSkillAt = now + skillCooldown(e, boss) * e.rangedCdMult * (0.85 + Math.random() * 0.3);
  let kind = pf.kinds[e.skillIdx++ % pf.kinds.length];
  if (e.trainer) {
    // hội quán: chọn ngẫu nhiên có trọng số (không lặp một vòng cố định), hạn chế lặp lại đòn vừa dùng
    const w = pf.kinds.map((k) => (k === e.lastKind ? 0.35 : 1) * (k === 'charge' && dist < 70 ? 0.4 : 1));
    let r = Math.random() * w.reduce((a, b) => a + b, 0);
    kind = pf.kinds[w.findIndex((x) => (r -= x) < 0)] ?? kind;
    // đánh lừa: khởi động đòn rồi hủy, đổi sang đòn khác
    if (!e.enraged || Math.random() < 0.5) {
      if (pf.kinds.length > 1 && Math.random() < 0.22) {
        const alt = pf.kinds.filter((k) => k !== kind);
        e.feint(ctx);
        kind = alt[Math.floor(Math.random() * alt.length)];
      }
    }
    e.lastKind = kind;
  }
  const base = Math.max(7, (e.stats.rangedDamage ?? e.stats.contactDamage * 0.9)) * (boss ? 1.5 : 1.2) * e.dmgMult;
  if (kind === 'volley') volley(e, ctx, target, type, pf, base * 0.7);
  else if (kind === 'zone') zone(e, ctx, target, type, pf, base * 0.8);
  else if (kind === 'nova') nova(e, ctx, type, pf, base * 0.9);
  else if (kind === 'charge') charge(e, ctx, target, type, pf, base * 0.9);
  else barrage(e, ctx, target, type, pf, base * 0.5);
}

const alive = (e: Enemy) => !e.dead && !e.beingCaught;

function volley(e: Enemy, ctx: BattleCtx, target: Fighter, type: PokemonType, pf: Profile, dmg: number) {
  const def = pf.def;
  const a = Math.atan2(target.y - e.y, target.x - e.x);
  const tele = e.trainer ? 280 : 520;
  const now = ctx.clock;
  // đòn nhỏ của hội quán: chỉ báo bằng ánh sáng + âm thanh, không vẽ vạch đỏ
  if (e.trainer) ctx.fx.addTelegraph({ kind: 'glow', target: { x: e.x, y: e.feetY }, r: 12, start: now, end: now + tele, color: def.warn[0], owner: e });
  else ctx.fx.addTelegraph({ kind: 'line', x: e.x, y: e.y, angle: a, len: 130, width: 5, start: now, end: now + tele, color: def.warn[0], owner: e });
  e.anim.playOnce('shoot', tele + 150);
  playSfx('warn');
  ctx.host.time.delayedCall(tele, () => {
    if (!alive(e)) return;
    playSfx(def.sfx);
    const [n, spread, speed] = pf.fan;
    for (let i = 0; i < n; i++) {
      const ang = spread >= 360 ? a + (i / n) * Math.PI * 2 : a + (n === 1 ? 0 : ((i / (n - 1)) - 0.5) * (spread * Math.PI) / 180);
      const s = ctx.enemyShots.spawn(pf.shot, e.x, e.centerY, Math.cos(ang) * speed, Math.sin(ang) * speed, 5, dmg, 2400, 6);
      s.type = type;
    }
  });
}

function zone(e: Enemy, ctx: BattleCtx, target: Fighter, type: PokemonType, pf: Profile, dmg: number) {
  const def = pf.def;
  const [n, r, w0] = pf.zone;
  const warnMs = e.trainer ? Math.round(w0 * 0.5) : w0;
  const d = dialectFor(DIALECT[type] ?? 'generic', ctx.fx, { ...STUB, type } as MoveDef);
  const spots: { x: number; y: number }[] = [];
  for (let i = 0; i < n; i++) {
    const ang = (i / n) * Math.PI * 2 + Math.random();
    const rad = i === 0 ? 0 : 28 + Math.random() * 34;
    spots.push({ x: target.x + Math.cos(ang) * rad, y: target.y + Math.sin(ang) * rad * 0.8 });
  }
  e.anim.playOnce('shoot', warnMs);
  playSfx('warn');
  spots.forEach((s) => groundWarn(ctx.host, s.x, s.y, warnMs, def.warn[0], def.warn[1]));
  ctx.host.time.delayedCall(warnMs, () => {
    if (e.dead) return;
    playSfx(def.sfx);
    for (const s of spots) {
      d.explosion(s.x, s.y, r);
      d.pillar(s.x, s.y, 3);
      d.scorch(s.x, s.y, r, 900);
      for (const f of ctx.aliveFighters()) {
        if (Math.hypot(f.x - s.x, (f.y - s.y) / 0.8) <= r + 8) ctx.damageFighter(f, dmg, s.x, s.y, type);
      }
    }
  });
}

function nova(e: Enemy, ctx: BattleCtx, type: PokemonType, pf: Profile, dmg: number) {
  const def = pf.def;
  const R = pf.nova;
  const warnMs = e.trainer ? 380 : 700;
  const d = dialectFor(DIALECT[type] ?? 'generic', ctx.fx, { ...STUB, type } as MoveDef);
  const now = ctx.clock;
  e.anim.playOnce('charge', warnMs);
  playSfx('warn');
  // báo trước: 6 ô sáng quanh thân (không phải vòng tròn)
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    groundWarn(ctx.host, e.x + Math.cos(a) * R * 0.75, e.y + Math.sin(a) * R * 0.6, warnMs, def.warn[0], def.warn[1]);
  }
  ctx.fx.addTelegraph({ kind: 'glow', target: { x: e.x, y: e.feetY }, r: 14, start: now, end: now + warnMs, color: def.warn[0], owner: e });
  ctx.host.time.delayedCall(warnMs, () => {
    if (!alive(e)) return;
    playSfx(def.sfx);
    ctx.fx.shake(0.01, 200);
    d.explosion(e.x, e.y, R * 0.7);
    powBurst(ctx.host, e.x, e.centerY, 16, 220);
    impactRays(ctx.host, e.x, e.centerY, 12, 10, R, TYPE_COLOR[type], 260);
    scatter(ctx.host, 'star5', e.x, e.centerY, 6, R * 0.8, TYPE_COLOR[type]);
    for (const f of ctx.aliveFighters()) {
      if (Math.hypot(f.x - e.x, (f.y - e.y) / 0.8) <= R + 8) ctx.damageFighter(f, dmg, e.x, e.y, type);
    }
  });
}

/** Lao: vạch báo dài rồi phóng thẳng tới theo vạch, gây sát thương ai nằm trên đường */
function charge(e: Enemy, ctx: BattleCtx, target: Fighter, type: PokemonType, pf: Profile, dmg: number) {
  const def = pf.def;
  const d = dialectFor(DIALECT[type] ?? 'generic', ctx.fx, { ...STUB, type } as MoveDef);
  const a = Math.atan2(target.y - e.y, target.x - e.x);
  const [len, wid] = pf.charge;
  const warnMs = e.trainer ? 330 : 560;
  const now = ctx.clock;
  ctx.fx.addTelegraph({ kind: 'line', x: e.x, y: e.y, angle: a, len, width: wid, start: now, end: now + warnMs, color: def.warn[0], owner: e });
  e.anim.playOnce('attack', warnMs + 300);
  playSfx('warn');
  ctx.host.time.delayedCall(warnMs, () => {
    if (!alive(e)) return;
    playSfx(def.sfx);
    const sx = e.x;
    const sy = e.y;
    const o = { k: 0 };
    const hit = new Set<Fighter>();
    ctx.host.tweens.add({
      targets: o, k: 1, duration: 280, ease: 'Cubic.in',
      onUpdate: () => {
        if (!alive(e)) return;
        const x = sx + Math.cos(a) * len * o.k;
        const y = sy + Math.sin(a) * len * o.k;
        e.body.reset(x, y);
        d.trail(x, y + 6, 1);
        for (const f of ctx.aliveFighters()) {
          if (hit.has(f)) continue;
          if (Math.hypot(f.x - x, (f.y - y) / 0.8) <= wid + 8) {
            hit.add(f);
            d.hit(f.x, f.chestY, true);
            ctx.damageFighter(f, dmg, x, y, type);
          }
        }
      },
      onComplete: () => {
        if (alive(e)) {
          ctx.fx.shake(0.006, 100);
          d.explosion(e.x, e.y, 16);
        }
      },
    });
  });
}

/** Hàng loạt nổ: một đường ô nổ nối tiếp nhau chạy từ chân địch tới chỗ người chơi (đá nhô, cột lửa, gai băng...) */
function barrage(e: Enemy, ctx: BattleCtx, target: Fighter, type: PokemonType, pf: Profile, dmg: number) {
  const def = pf.def;
  const d = dialectFor(DIALECT[type] ?? 'generic', ctx.fx, { ...STUB, type } as MoveDef);
  const n = pf.barrage;
  const a = Math.atan2(target.y - e.y, target.x - e.x);
  const reach = Math.max(90, Math.min(220, Math.hypot(target.x - e.x, target.y - e.y) + 40));
  const r = Math.round(pf.zone[1] * 0.85);
  const warnMs = e.trainer ? 320 : 560;
  const gap = 90;
  const spots = Array.from({ length: n }, (_, i) => ({ x: e.x + Math.cos(a) * (24 + ((i + 1) / n) * reach), y: e.y + Math.sin(a) * (24 + ((i + 1) / n) * reach) * 0.9 }));
  e.anim.playOnce('shoot', warnMs + 200);
  playSfx('warn');
  spots.forEach((s, i) => groundWarn(ctx.host, s.x, s.y, warnMs + i * gap, def.warn[0], def.warn[1]));
  spots.forEach((s, i) => {
    ctx.host.time.delayedCall(warnMs + i * gap, () => {
      if (e.dead) return;
      if (i === 0) playSfx(def.sfx);
      d.explosion(s.x, s.y, r);
      d.pillar(s.x, s.y, 2);
      d.scorch(s.x, s.y, r, 700);
      for (const f of ctx.aliveFighters()) {
        if (Math.hypot(f.x - s.x, (f.y - s.y) / 0.8) <= r + 8) ctx.damageFighter(f, dmg, s.x, s.y, type);
      }
    });
  });
}
