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
import { playSfx, type SfxName } from '../systems/sfx';
import type { Enemy } from './Enemy';
import type { Fighter } from './Fighter';
import type { BattleCtx } from './types';

type Kind = 'volley' | 'zone' | 'nova';

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

/** hệ thể hiện của loài: ưu tiên hệ khác Thường (Pidgey = Bay) */
export function skillTypeOf(e: Enemy): PokemonType {
  const ty = e.species.types;
  return (ty.find((t) => t !== 'normal') ?? ty[0]) as PokemonType;
}

export function skillCooldown(e: Enemy, boss: boolean): number {
  if (boss) return 4200;
  if (e.trainer) return 5400;
  return e.alpha ? 6500 : 9500;
}

const STUB = { id: 'enemySkill', name: '', type: 'normal', power: 0, cooldownMs: 0, sfx: 'hit', icon: 'play' } as unknown as MoveDef;

/** gọi mỗi khung từ Enemy/Boss.update khi đã biết mục tiêu */
export function tickEnemySkill(e: Enemy, ctx: BattleCtx, target: Fighter, boss = false) {
  if (e.dead || e.dummy || e.beingCaught) return;
  const now = ctx.clock;
  if (e.nextSkillAt === 0) e.nextSkillAt = now + 2500 + Math.random() * 5000;
  if (now < e.nextSkillAt || e.isStunned(now)) return;
  const dist = Math.hypot(target.x - e.x, target.y - e.y);
  if (dist > 300) return;
  const type = skillTypeOf(e);
  const def = T[type] ?? T.normal!;
  e.nextSkillAt = now + skillCooldown(e, boss) * e.rangedCdMult * (0.85 + Math.random() * 0.3);
  const kind = def.kinds[e.skillIdx++ % 2];
  const base = Math.max(7, (e.stats.rangedDamage ?? e.stats.contactDamage * 0.9)) * (boss ? 1.5 : 1.2) * e.dmgMult;
  if (kind === 'volley') volley(e, ctx, target, type, def, base);
  else if (kind === 'zone') zone(e, ctx, target, type, def, base * 1.3);
  else nova(e, ctx, type, def, base * 1.4);
}

const alive = (e: Enemy) => !e.dead && !e.beingCaught;

function volley(e: Enemy, ctx: BattleCtx, target: Fighter, type: PokemonType, def: TypeSkill, dmg: number) {
  const a = Math.atan2(target.y - e.y, target.x - e.x);
  const tele = 520;
  const now = ctx.clock;
  ctx.fx.addTelegraph({ kind: 'line', x: e.x, y: e.y, angle: a, len: 130, width: 5, start: now, end: now + tele, color: def.warn[0], owner: e });
  e.anim.playOnce('shoot', tele + 150);
  playSfx('warn');
  ctx.host.time.delayedCall(tele, () => {
    if (!alive(e)) return;
    playSfx(def.sfx);
    const [n, spread, speed] = def.fan;
    for (let i = 0; i < n; i++) {
      const ang = a + (n === 1 ? 0 : ((i / (n - 1)) - 0.5) * (spread * Math.PI) / 180);
      const s = ctx.enemyShots.spawn(def.shot, e.x, e.centerY, Math.cos(ang) * speed, Math.sin(ang) * speed, 5, dmg, 2400, 6);
      s.type = type;
    }
  });
}

function zone(e: Enemy, ctx: BattleCtx, target: Fighter, type: PokemonType, def: TypeSkill, dmg: number) {
  const [n, r, warnMs] = def.zone;
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

function nova(e: Enemy, ctx: BattleCtx, type: PokemonType, def: TypeSkill, dmg: number) {
  const R = 74;
  const warnMs = 700;
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
