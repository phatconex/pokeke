// Bộ chiêu riêng cho các dòng còn lại (không đụng bộ đã duyệt trong kits.ts: chỉ điền loài CHƯA có).
// Cách làm: mượn "mẫu" đã duyệt của hệ (fire.mid, water.swift, ...) rồi đổi ô K/L/U sang khuôn khác / chỉnh thông số theo tính cách từng dòng.
// Hệ không có mẫu (Đá, Đất, Bay, Độc, Bọ, Thường, Rồng) dùng khuôn S() giống các loài đã làm ở kits.ts.
// Mỗi dòng: dạng gốc nhỏ/nhẹ → dạng giữa → dạng cuối to/nặng (khác hình, số lượng, tầm, rung).
import type { SpeciesKit } from './types';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const S = (archetype: string, params: Record<string, unknown> = {}): any => ({ archetype, params, tiers: [] });
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const T = (template: string, slots: Record<string, any> = {}, extra: Partial<SpeciesKit> = {}): SpeciesKit => ({ template, slots, ...extra }) as SpeciesKit;

const dash = (dialect: string, o: Record<string, unknown> = {}) => S('dashStrike', { dialect, ...o });
const bolt = (dialect: string, o: Record<string, unknown> = {}) => S('bolt', { dialect, ...o });
const nova = (dialect: string, o: Record<string, unknown> = {}) => S('nova', { dialect, ...o });
const sweep = (dialect: string, o: Record<string, unknown> = {}) => S('sweep', { dialect, ...o });
const fan = (dialect: string, o: Record<string, unknown> = {}) => S('fan', { dialect, ...o });
const roll = (dialect: string, o: Record<string, unknown> = {}) => S('roll', { dialect, ...o });
const lob = (dialect: string, tex: string, o: Record<string, unknown> = {}) => S('lob', { dialect, tex, ...o });
const fallers = (dialect: string, tex: string, o: Record<string, unknown> = {}) => S('fallers', { dialect, tex, offset: { x: 0, y: -150 }, ...o });
const twister = (dialect: string, tex: string, colors: number[], o: Record<string, unknown> = {}) => S('twister', { dialect, tex, colors, ...o });
const serpent = (dialect: string, o: Record<string, unknown> = {}) => S('serpent', { dialect, ...o });
const dive = (dialect: string, o: Record<string, unknown> = {}) => S('dive', { dialect, ...o });
const web = (dialect: string, o: Record<string, unknown> = {}) => S('web', { dialect, ...o });

export const FAMILY_KITS: Record<string, SpeciesKit> = {
  // ===================================================================== LỬA
  // Cáo (Vulpix/Ninetales): nhiều đốm lửa ma trơi, lướt có bóng mờ, vòng lửa xoáy
  vulpix: T('fire.small', { J: bolt('fire', { scale: 0.8, split: 3, splitSpreadDeg: 22, splitPowerMult: 0.5 }), K: dash('fire', { afterimages: 3, afterimageTint: 0xff8a40 }), L: nova('fire', { pulses: 1 }) }),
  ninetales: T('fire.big', { J: bolt('fire', { scale: 1, split: 3, splitSpreadDeg: 26, splitPowerMult: 0.6 }), K: dash('fire', { afterimages: 5, afterimageTint: 0xffc060, lungeMult: 1.3 }), L: nova('fire', { pulses: 2, pulseGapMs: 260 }) }),
  // Chó (Growlithe/Arcanine): cắn lao, Extreme Speed
  growlithe: T('fire.small', { K: dash('fire', { dashMs: 120, trailCount: 3, lungeMult: 1.3 }), L: S('stream', {}) }),
  arcanine: T('fire.big', { K: dash('fire', { dashMs: 110, trailCount: 4, afterimages: 5, afterimageTint: 0xff7a30, lungeMult: 1.8 }), L: S('stream', {}), U: nova('fire', { pulses: 2, pulseGapMs: 300 }) }),
  // Ngựa (Ponyta/Rapidash): lao dài, vệt lửa
  ponyta: T('fire.small', { K: dash('fire', { dashMs: 120, trailCount: 3, lungeMult: 1.4 }), L: nova('fire', {}) }),
  rapidash: T('fire.mid', { K: dash('fire', { dashMs: 100, trailCount: 4, afterimages: 4, afterimageTint: 0xff9a40, lungeMult: 1.9 }), L: S('stream', {}), U: S('blast', {}) }),
  // Magmar: nặng, phun lửa, đấm nổ
  magmar: T('fire.mid', { J: bolt('fire', { scale: 1.3, split: 1 }), K: dash('fire', { dashMs: 160, trailCount: 2, lungeMult: 1.1 }), U: nova('fire', { pulses: 2, pulseGapMs: 320 }) }),
  flareon: T('fire.mid', { J: bolt('fire', { scale: 1.1, split: 2 }), K: dash('fire', { dashMs: 120, afterimages: 3, afterimageTint: 0xffb060 }), U: nova('fire', { pulses: 2 }) }),

  // ===================================================================== NƯỚC
  psyduck: T('water.small', { J: bolt('water', { scale: 0.9 }), L: nova('psychic', { pulses: 1 }) }),
  golduck: T('water.swift', { L: nova('psychic', { pulses: 2, pulseGapMs: 260 }), U: S('stream', {}) }),
  goldeen: T('water.small', { K: dash('water', { dashMs: 110, trailCount: 2, lungeMult: 1.4 }), L: fan('water', { n: 7, halfDeg: 24, range: 80 }) }),
  seaking: T('water.swift', { K: dash('water', { dashMs: 100, trailCount: 3, afterimages: 3, afterimageTint: 0x7ac8ff, lungeMult: 1.6 }), L: fan('water', { n: 12, halfDeg: 30, range: 95 }), U: nova('water', { pulses: 2 }) }),
  staryu: T('water.small', { K: roll('water', { size: 1.7, ms: 450, speed: 230, hitR: 20 }), L: nova('water', { pulses: 1 }) }),
  starmie: T('water.swift', { K: roll('water', { size: 2.2, ms: 520, speed: 250, hitR: 26 }), L: fan('water', { n: 12, halfDeg: 180, range: 110 }), U: nova('psychic', { pulses: 2, pulseGapMs: 240 }) }),
  vaporeon: T('water.swift', { J: bolt('water', { scale: 1.1, split: 2 }), K: dash('water', { dashMs: 120, afterimages: 3, afterimageTint: 0x7ac8ff, lungeMult: 1.3 }), U: nova('water', { pulses: 2, pulseGapMs: 280 }) }),
  shellder: T('water.small', { K: dash('water', { dashMs: 140, trailCount: 1, lungeMult: 1.2 }), L: nova('ice', { pulses: 1 }) }),
  cloyster: T('ice.big', { J: bolt('ice', { scale: 1.1, split: 3, splitSpreadDeg: 14 }), K: roll('ice', { size: 2.4, ms: 520, speed: 230, hitR: 26 }) }),
  horsea: T('water.small', { J: bolt('water', { scale: 0.8, split: 2, splitSpreadDeg: 10 }), L: fan('water', { n: 6, halfDeg: 20, range: 80 }) }),
  seadra: T('water.swift', { J: bolt('water', { scale: 1, split: 3, splitSpreadDeg: 14 }), L: fan('water', { n: 10, halfDeg: 28, range: 95 }), U: S('stream', {}) }),
  krabby: T('water.small', { J: bolt('water', { scale: 0.9 }), K: sweep('water', { reach: 40, spanDeg: 140, thick: 12 }), L: nova('water', { pulses: 1 }) }),
  kingler: T('water.heavy', { K: sweep('water', { reach: 56, spanDeg: 170, thick: 16, spikes: 3 }), L: S('stream', {}), U: nova('water', { pulses: 2, pulseGapMs: 300 }) }),
  poliwag: T('water.small', { J: bolt('water', { scale: 0.85 }), L: nova('water', { pulses: 1 }) }),
  poliwhirl: T('water.swift', { K: dash('water', { dashMs: 130, trailCount: 2, lungeMult: 1.3 }), L: nova('water', { pulses: 2, pulseGapMs: 240 }), U: S('stream', {}) }),
  poliwrath: T('fighting.big', { J: S('strike', { dialect: 'water' }) }),
  magikarp: T('water.small', { J: bolt('water', { scale: 0.7 }), K: dash('water', { dashMs: 100, trailCount: 1, lungeMult: 1.2 }), L: nova('water', { pulses: 1 }) }),
  gyarados: T('water.heavy', { J: bolt('water', { scale: 1.4, split: 3, splitSpreadDeg: 16 }), K: dive('water', { airMs: 600, hitR: 46, trailColor: 0x7ac8ff }), L: S('stream', {}), U: serpent('water', { segs: 10, size: 12, range: 210 }) }),
  lapras: T('ice.big', { K: dash('ice', { dashMs: 140, trailCount: 2, lungeMult: 1.2 }), L: S('aurora', { dialect: 'ice', n: 3, range: 175, flyMs: 600, amp: 15, waves: 1.5 }) }),
  tentacool: T('water.small', { J: bolt('poison', { scale: 0.9, texPick: ['needle'], split: 2, splitSpreadDeg: 12, splitPowerMult: 0.6 }), L: fan('poison', { n: 8, halfDeg: 26, range: 80 }) }),
  tentacruel: T('water.swift', { J: bolt('poison', { scale: 1.1, texPick: ['needle'], split: 3, splitSpreadDeg: 16, splitPowerMult: 0.6 }), K: sweep('poison', { reach: 50, spanDeg: 170, thick: 10, spikes: 4 }), L: fan('poison', { n: 14, halfDeg: 34, range: 100 }), U: nova('poison', { pulses: 2, pulseGapMs: 280 }) }),
  slowpoke: T('psychic.small', { J: bolt('water', { scale: 1 }), K: dash('psychic', { dashMs: 160, trailCount: 1, lungeMult: 1.1 }), U: nova('psychic', { pulses: 2, pulseGapMs: 300 }) }),
  slowbro: T('psychic.mid', { J: bolt('water', { scale: 1.2 }), K: dash('psychic', { dashMs: 150, trailCount: 2, lungeMult: 1.3 }), L: nova('water', { pulses: 2 }) }),

  // ===================================================================== CỎ
  oddish: T('grass.small', { L: nova('poison', { pulses: 1 }) }),
  gloom: T('grass.mid', { L: nova('poison', { pulses: 2, pulseGapMs: 260 }), U: S('rain', {}) }),
  vileplume: T('grass.big', { L: nova('poison', { pulses: 2, pulseGapMs: 240 }) }),
  bellsprout: T('grass.small', { J: S('whip', { dialect: 'grass' }), K: dash('grass', { dashMs: 130, trailCount: 1, lungeMult: 1.3 }) }),
  weepinbell: T('grass.mid', { J: S('whip', { dialect: 'grass' }), K: dash('grass', { dashMs: 130, trailCount: 2, lungeMult: 1.4 }) }),
  victreebel: T('grass.big', { J: S('whip', { dialect: 'grass' }), K: dash('grass', { dashMs: 120, trailCount: 2, lungeMult: 1.6 }) }),
  exeggcute: T('grass.small', { J: bolt('grass', { scale: 0.9, split: 2, splitSpreadDeg: 14 }), L: nova('psychic', { pulses: 1 }) }),
  exeggutor: T('grass.big', { J: bolt('grass', { scale: 1.3, split: 3, splitSpreadDeg: 18 }), K: dash('grass', { dashMs: 160, lungeMult: 1.3 }), L: nova('psychic', { pulses: 2 }) }),
  tangela: T('grass.mid', { J: S('whip', { dialect: 'grass' }), K: dash('grass', { dashMs: 140, trailCount: 2, lungeMult: 1.3 }) }),

  // ===================================================================== ĐIỆN
  voltorb: T('electric.small', { K: roll('electric', { size: 1.8, ms: 480, speed: 240, hitR: 20 }), L: nova('electric', { pulses: 1 }) }),
  electrode: T('electric.big', { K: roll('electric', { size: 2.4, ms: 560, speed: 270, hitR: 26 }), L: nova('electric', { pulses: 2, pulseGapMs: 240 }), U: nova('electric', { pulses: 3, pulseGapMs: 260 }) }),
  magnemite: T('electric.small', { L: S('chain', {}) }),
  magneton: T('electric.big', { K: dash('electric', { dashMs: 130, lungeMult: 1.3 }), L: S('chain', {}), U: nova('electric', { pulses: 2 }) }),
  jolteon: T('electric.small', { J: bolt('electric', { scale: 1, split: 3, splitSpreadDeg: 18 }), K: dash('electric', { dashMs: 100, afterimages: 4, afterimageTint: 0xffe040, lungeMult: 1.6 }), L: S('chain', {}), U: S('rain', {}) }),
  electabuzz: T('electric.big', { K: dash('electric', { dashMs: 130, trailCount: 2, lungeMult: 1.3 }), L: S('chain', {}) }),

  // ===================================================================== SIÊU LINH
  drowzee: T('psychic.small', { K: dash('psychic', { dashMs: 150, lungeMult: 1.2 }), L: nova('psychic', { pulses: 1 }) }),
  hypno: T('psychic.mid', { K: dash('psychic', { dashMs: 140, lungeMult: 1.3 }), L: nova('psychic', { pulses: 2, pulseGapMs: 260 }) }),
  mrmime: T('psychic.mid', { J: bolt('psychic', { scale: 1, split: 2, splitSpreadDeg: 12 }), K: dash('psychic', { dashMs: 120, trailCount: 2, lungeMult: 1.3 }) }),
  mew: T('psychic.big', { J: bolt('psychic', { scale: 1.1, split: 3, splitSpreadDeg: 20 }), K: dash('psychic', { dashMs: 100, afterimages: 5, afterimageTint: 0xff9ad0, lungeMult: 1.5 }), L: nova('psychic', { pulses: 2 }) }),
  jynx: T('ice.big', { J: bolt('psychic', { scale: 1, split: 2, splitSpreadDeg: 12 }), L: nova('psychic', { pulses: 2 }) }),

  // ===================================================================== GIÁC ĐẤU
  mankey: T('fighting.small'),
  primeape: T('fighting.mid', { K: dash('fighting', { dashMs: 110, trailCount: 2, lungeMult: 1.5 }) }),
  hitmonlee: T('fighting.big', { K: dive('fighting', { airMs: 500, hitR: 44, trailColor: 0xffa060 }), L: dash('fighting', { dashMs: 100, trailCount: 3, lungeMult: 1.8 }) }),
  hitmonchan: T('fighting.big', { J: S('strike', { dialect: 'fighting' }), K: dash('fighting', { dashMs: 100, trailCount: 2, afterimages: 3, afterimageTint: 0xffe040, lungeMult: 1.4 }) }),

  // ===================================================================== ĐÁ / ĐẤT
  onix: { kitType: 'rock', ult: 'rockfall', slots: { J: lob('rock', 'boulderA', { scale: 1.3, r: 30, hitStop: 60 }), K: roll('rock', { size: 3.2, ms: 640, speed: 250, hitR: 32 }), L: fallers('rock', 'slabR', { count: 8, spread: 90, offset: { x: -110, y: -150 }, rotate: true, r: 26, scorch: true }), U: serpent('rock', { segs: 12, size: 13, range: 220 }) }, ultParams: { dialect: 'rock' } },
  rhyhorn: { kitType: 'rock', slots: { J: lob('rock', 'boulderA', { scale: 0.9, r: 26 }), K: roll('rock', { size: 2.2, ms: 500, speed: 260, hitR: 24 }), L: fallers('rock', 'slabR', { count: 5, spread: 70, offset: { x: -90, y: -130 }, rotate: true, r: 24, scorch: true }), U: roll('rock', { size: 2.8, ms: 600, speed: 290, hitR: 28, powerMult: 1.1 }) } },
  rhydon: { kitType: 'rock', ult: 'rockfall', slots: { J: lob('rock', 'boulderA', { scale: 1.4, r: 32, hitStop: 70, shake: 0.01 }), K: roll('rock', { size: 3, ms: 620, speed: 280, hitR: 30 }), L: fallers('rock', 'slabR', { count: 9, spread: 100, offset: { x: -110, y: -160 }, rotate: true, r: 28, scorch: true }), U: S('ridge', { dialect: 'ground', range: 220, width: 28 }) }, ultParams: { dialect: 'rock' } },
  cubone: { kitType: 'ground', slots: { J: lob('ground', 'mudball', { scale: 0.9, r: 22 }), K: roll('ground', { size: 1.8, ms: 420, hitR: 18 }), L: S('ridge', { dialect: 'ground', range: 130, width: 18 }), U: fallers('ground', 'mudball', { count: 8, spread: 90, r: 22, scorch: true }) } },
  marowak: { kitType: 'ground', ult: 'chasm', slots: { J: lob('ground', 'mudball', { scale: 1.1, r: 26 }), K: sweep('ground', { reach: 56, spanDeg: 170, fill: 0xd8d0b8, edge: 0x6a5a40, spikes: 4 }), L: S('ridge', { dialect: 'ground', range: 180, width: 26 }), U: fallers('ground', 'mudball', { count: 12, spread: 100, r: 24, scorch: true }) }, ultParams: { dialect: 'ground', holdMs: 1100 } },
  aerodactyl: { kitType: 'rock', ult: 'flock', slots: { J: bolt('flying', { scale: 1.2, texPick: ['featherA'], split: 2, splitSpreadDeg: 14 }), K: dive('flying', { airMs: 650, hitR: 50, trailColor: 0xd8c8a0 }), L: fan('rock', { n: 12, halfDeg: 34, range: 100 }), U: fallers('rock', 'slabR', { count: 10, spread: 110, offset: { x: -80, y: -170 }, rotate: true, r: 26, scorch: true }) }, ultParams: { dialect: 'flying', birds: 18, totalMs: 2800 } },
  omanyte: T('water.small', { K: roll('rock', { size: 1.6, ms: 440, speed: 220, hitR: 18 }), L: nova('water', { pulses: 1 }) }),
  omastar: T('water.swift', { K: roll('rock', { size: 2.2, ms: 520, speed: 240, hitR: 24 }), L: fallers('rock', 'slabR', { count: 7, spread: 90, offset: { x: -100, y: -150 }, rotate: true, r: 24 }), U: nova('water', { pulses: 2 }) }),
  kabuto: T('water.small', { J: sweep('rock', { reach: 36, spanDeg: 120, thick: 10 }), K: dash('rock', { dashMs: 130, trailCount: 1, lungeMult: 1.3 }), L: roll('rock', { size: 1.7, ms: 440, speed: 230, hitR: 20 }) }),
  kabutops: T('water.swift', { J: sweep('rock', { reach: 50, spanDeg: 150, thick: 12, spikes: 3 }), K: dash('rock', { dashMs: 100, trailCount: 2, afterimages: 4, afterimageTint: 0xd8c8a0, lungeMult: 1.7 }), L: S('xslash', { dialect: 'rock' }), U: fallers('rock', 'slabR', { count: 9, spread: 100, offset: { x: -110, y: -150 }, rotate: true, r: 26 }) }),

  // ===================================================================== ĐỘC
  koffing: { kitType: 'poison', slots: { J: lob('poison', 'goo', { scale: 1, r: 24, linger: { ms: 2000, tickMs: 500, powerMult: 0.25, color: 0x7ad04a } }), K: nova('poison', { pulses: 1 }), L: lob('poison', 'goo', { scale: 1.4, r: 36, linger: { ms: 2800, tickMs: 500, powerMult: 0.3, color: 0x7ad04a } }) } },
  weezing: { kitType: 'poison', ult: 'wavefront', slots: { J: lob('poison', 'goo', { scale: 1.2, r: 30, linger: { ms: 2400, tickMs: 500, powerMult: 0.3, color: 0x7ad04a } }), K: nova('poison', { pulses: 2, pulseGapMs: 260 }), L: lob('poison', 'goo', { scale: 1.8, r: 44, linger: { ms: 3200, tickMs: 450, powerMult: 0.35, color: 0x7ad04a } }), U: fallers('poison', 'goo', { count: 12, spread: 100, r: 24, scorch: true }) }, ultParams: { dialect: 'poison', shape: 'sludge', status: 'poison', ms: 1600 } },
  nidoranf: { kitType: 'poison', slots: { J: bolt('poison', { scale: 0.9, texPick: ['needle'], trail: 'thin', split: 1 }), K: dash('poison', { dashMs: 120, trailCount: 1, streaks: true }), L: fan('poison', { n: 8, halfDeg: 28, range: 80 }) } },
  nidorina: { kitType: 'poison', slots: { J: bolt('poison', { scale: 1, texPick: ['needle'], split: 2, splitSpreadDeg: 12, splitPowerMult: 0.7 }), K: dash('poison', { dashMs: 120, trailCount: 1, streaks: true, lungeMult: 1.2 }), L: fan('poison', { n: 12, halfDeg: 32, range: 95 }), U: nova('poison', { pulses: 2 }) } },
  nidoranm: { kitType: 'poison', slots: { J: bolt('poison', { scale: 0.9, texPick: ['needle'], trail: 'thin', split: 1 }), K: dash('poison', { dashMs: 110, trailCount: 1, streaks: true, lungeMult: 1.2 }), L: S('ridge', { dialect: 'ground', range: 120, width: 16 }) } },
  nidorino: { kitType: 'poison', slots: { J: bolt('poison', { scale: 1, texPick: ['needle'], split: 2, splitSpreadDeg: 12, splitPowerMult: 0.7 }), K: dash('poison', { dashMs: 110, trailCount: 2, streaks: true, lungeMult: 1.4 }), L: S('ridge', { dialect: 'ground', range: 160, width: 22 }), U: fan('poison', { n: 14, halfDeg: 40, range: 100 }) } },
  nidoqueen: { kitType: 'poison', ult: 'wavefront', slots: { J: bolt('poison', { scale: 1.3, texPick: ['needle'], split: 3, splitSpreadDeg: 16, splitPowerMult: 0.6 }), K: sweep('poison', { reach: 52, spanDeg: 160, thick: 14, spikes: 3 }), L: S('ridge', { dialect: 'ground', range: 190, width: 28 }), U: nova('ground', { pulses: 2, pulseGapMs: 300 }) }, ultParams: { dialect: 'poison', shape: 'sludge', status: 'poison', ms: 1600 } },
  nidoking: { kitType: 'poison', ult: 'wavefront', slots: { J: bolt('poison', { scale: 1.3, texPick: ['needle'], split: 3, splitSpreadDeg: 16, splitPowerMult: 0.6 }), K: dash('poison', { dashMs: 100, trailCount: 2, streaks: true, lungeMult: 1.8 }), L: S('ridge', { dialect: 'ground', range: 200, width: 30 }), U: fallers('ground', 'mudball', { count: 12, spread: 100, r: 26, scorch: true }) }, ultParams: { dialect: 'poison', shape: 'sludge', status: 'poison', ms: 1600 } },
  zubat: { kitType: 'poison', slots: { J: bolt('flying', { scale: 0.8, texPick: ['featherA'], split: 2, splitSpreadDeg: 18, splitPowerMult: 0.6 }), K: dash('poison', { dashMs: 100, trailCount: 1, lungeMult: 1.4 }), L: sweep('flying', { reach: 40, spanDeg: 140, fill: 0x7a5ab0, edge: 0x2a1a4a }) } },
  golbat: { kitType: 'poison', slots: { J: bolt('flying', { scale: 1, texPick: ['featherA'], split: 3, splitSpreadDeg: 20, splitPowerMult: 0.6 }), K: dash('poison', { dashMs: 100, trailCount: 2, afterimages: 3, afterimageTint: 0x9a6ad0, lungeMult: 1.6 }), L: sweep('flying', { reach: 54, spanDeg: 170, fill: 0x7a5ab0, edge: 0x2a1a4a, spikes: 4 }), U: twister('poison', 'goo', [0x9a6ad0, 0x4a2a7a], { r: 36, height: 95, ms: 1700 }) } },

  // ===================================================================== BỌ
  metapod: { kitType: 'bug', slots: { J: web('bug', { r: 30, ms: 1400, bugs: 2, n: 6, rings: 2 }), K: nova('bug', { pulses: 1 }), L: web('bug', { r: 40, ms: 1800, bugs: 3, pull: true }) } },
  kakuna: { kitType: 'bug', slots: { J: bolt('bug', { scale: 0.9, texPick: ['needle'], trail: 'thin', split: 1 }), K: nova('bug', { pulses: 1 }), L: web('bug', { r: 40, ms: 1800, bugs: 3, pull: true }) } },
  pinsir: { kitType: 'bug', ult: 'wavefront', slots: { J: sweep('bug', { reach: 46, spanDeg: 150, thick: 14, spikes: 2 }), K: dash('bug', { dashMs: 110, trailCount: 1, streaks: true, lungeMult: 1.6 }), L: sweep('bug', { reach: 62, spanDeg: 180, thick: 18, spikes: 4 }), U: fallers('bug', 'needle', { count: 14, spread: 100, fallMs: 170, r: 20 }) }, ultParams: { dialect: 'bug', shape: 'swarm', ms: 1800 } },
  scyther: { kitType: 'bug', ult: 'wavefront', slots: { J: sweep('bug', { reach: 48, spanDeg: 130, thick: 10, spikes: 2 }), K: dash('bug', { dashMs: 90, trailCount: 2, afterimages: 4, afterimageTint: 0xa8e060, lungeMult: 1.8 }), L: S('xslash', { dialect: 'bug' }), U: fan('bug', { n: 18, halfDeg: 60, range: 120 }) }, ultParams: { dialect: 'bug', shape: 'swarm', ms: 1800 } },
  paras: { kitType: 'bug', slots: { J: sweep('bug', { reach: 36, spanDeg: 120, thick: 8 }), K: dash('bug', { dashMs: 120, trailCount: 1, lungeMult: 1.3 }), L: nova('grass', { pulses: 1 }) } },
  parasect: { kitType: 'bug', slots: { J: sweep('bug', { reach: 46, spanDeg: 150, thick: 12, spikes: 3 }), K: dash('bug', { dashMs: 110, trailCount: 2, lungeMult: 1.5 }), L: nova('grass', { pulses: 2, pulseGapMs: 260 }), U: S('rain', { dialect: 'grass' }) } },
  venonat: { kitType: 'bug', slots: { J: bolt('bug', { scale: 0.9, texPick: ['needle'], split: 2, splitSpreadDeg: 12, splitPowerMult: 0.7 }), K: web('bug', { r: 36, ms: 1500, bugs: 2, n: 6, rings: 3 }), L: nova('psychic', { pulses: 1 }), U: web('bug', { r: 46, ms: 2000, bugs: 4, pull: true }) } },
  venomoth: { kitType: 'bug', ult: 'wavefront', slots: { J: bolt('bug', { scale: 1.1, texPick: ['needle'], split: 3, splitSpreadDeg: 18, splitPowerMult: 0.6 }), K: web('bug', { r: 50, ms: 2200, bugs: 4, pull: true }), L: nova('psychic', { pulses: 2, pulseGapMs: 260 }), U: S('swarm', { dialect: 'bug', n: 22, ms: 4500 }) }, ultParams: { dialect: 'bug', shape: 'swarm', ms: 1800 } },

  // ===================================================================== THƯỜNG / BAY
  clefairy: { kitType: 'normal', slots: { J: bolt('normal', { scale: 0.9, texPick: ['star5'], trail: 'thin', split: 3, splitSpreadDeg: 18, splitPowerMult: 0.5 }), K: dash('normal', { dashMs: 120, trailCount: 1, streaks: true }), L: nova('normal', { pulses: 1 }), U: nova('normal', { pulses: 2, pulseGapMs: 300 }) } },
  clefable: { kitType: 'normal', slots: { J: bolt('normal', { scale: 1.1, texPick: ['star5'], split: 5, splitSpreadDeg: 36, splitPowerMult: 0.45 }), K: dash('normal', { dashMs: 110, trailCount: 2, streaks: true, lungeMult: 1.3 }), L: nova('normal', { pulses: 2, pulseGapMs: 260 }), U: S('triattack', { dialect: 'normal', r: 30, flyMs: 400 }) } },
  tauros: { kitType: 'normal', slots: { J: dash('normal', { dashMs: 100, trailCount: 1, streaks: false }), K: dash('normal', { dashMs: 100, trailCount: 3, streaks: true, afterimages: 3, afterimageTint: 0xe0c090, lungeMult: 2 }), L: roll('normal', { size: 2.4, ms: 520, speed: 280, hitR: 26 }), U: nova('normal', { pulses: 2, pulseGapMs: 320 }) } },
  kangaskhan: { kitType: 'normal', slots: { J: sweep('normal', { reach: 44, spanDeg: 130, thick: 12 }), K: dash('normal', { dashMs: 120, trailCount: 1, streaks: true, lungeMult: 1.5 }), L: nova('normal', { pulses: 1 }), U: S('triattack', { dialect: 'normal', r: 32, flyMs: 400 }) } },
  chansey: { kitType: 'normal', slots: { J: bolt('normal', { scale: 1, texPick: ['star5'], split: 3, splitSpreadDeg: 20, splitPowerMult: 0.5 }), K: dash('normal', { dashMs: 140, trailCount: 1, lungeMult: 1.2 }), L: nova('normal', { pulses: 2, pulseGapMs: 280 }), U: S('triattack', { dialect: 'normal', r: 30, flyMs: 420 }) } },
  ditto: { kitType: 'normal', slots: { J: dash('normal', { dashMs: 110, trailCount: 0 }), K: dash('normal', { dashMs: 120, trailCount: 1, streaks: true, lungeMult: 1.3 }), L: nova('normal', { pulses: 1 }) } },
  jigglypuff: { kitType: 'normal', slots: { J: bolt('normal', { scale: 0.9, texPick: ['star5'], split: 2, splitSpreadDeg: 14, splitPowerMult: 0.6 }), K: dash('normal', { dashMs: 130, trailCount: 1, lungeMult: 1.2 }), L: nova('normal', { pulses: 2, pulseGapMs: 300 }) } },
  wigglytuff: { kitType: 'normal', slots: { J: bolt('normal', { scale: 1.1, texPick: ['star5'], split: 3, splitSpreadDeg: 20, splitPowerMult: 0.55 }), K: dash('normal', { dashMs: 120, trailCount: 2, streaks: true, lungeMult: 1.4 }), L: nova('normal', { pulses: 3, pulseGapMs: 280 }), U: S('triattack', { dialect: 'normal', r: 32, flyMs: 420 }) } },
  lickitung: { kitType: 'normal', slots: { J: S('whip', { dialect: 'normal' }), K: dash('normal', { dashMs: 130, trailCount: 1, streaks: true, lungeMult: 1.4 }), L: sweep('normal', { reach: 58, spanDeg: 160, thick: 16 }), U: nova('normal', { pulses: 2 }) } },
  porygon: { kitType: 'normal', slots: { J: bolt('normal', { scale: 1, texPick: ['star5'], split: 2, splitSpreadDeg: 12, splitPowerMult: 0.7 }), K: dash('normal', { dashMs: 100, trailCount: 2, afterimages: 3, afterimageTint: 0xff7aa0, lungeMult: 1.4 }), L: S('beam', { dialect: 'normal' }), U: S('triattack', { dialect: 'normal', r: 30, flyMs: 400 }) } },
  spearow: { kitType: 'flying', slots: { J: bolt('flying', { scale: 0.8, texPick: ['featherA'], trail: 'thin', split: 1 }), K: dash('flying', { dashMs: 100, trailCount: 1, lungeMult: 1.5 }), L: sweep('flying', { reach: 38, spanDeg: 130, fill: 0xf4ead0, edge: 0x8a6a3a }) } },
  fearow: { kitType: 'flying', ult: 'flock', slots: { J: bolt('flying', { scale: 1.1, texPick: ['featherA'], split: 2, splitSpreadDeg: 14, splitPowerMult: 0.7 }), K: dive('flying', { airMs: 600, hitR: 42, trailColor: 0xffffff }), L: sweep('flying', { reach: 56, spanDeg: 160, fill: 0xf4ead0, edge: 0xd04a2a, spikes: 4 }), U: twister('flying', 'featherA', [0xffffff, 0xcfe6ff], { r: 38, height: 105, ms: 1800 }) }, ultParams: { dialect: 'flying', birds: 20, totalMs: 2800 } },
  doduo: { kitType: 'flying', slots: { J: bolt('flying', { scale: 0.9, texPick: ['featherA'], split: 2, splitSpreadDeg: 10, splitPowerMult: 0.7 }), K: dash('flying', { dashMs: 100, trailCount: 1, lungeMult: 1.6 }), L: sweep('flying', { reach: 44, spanDeg: 140, fill: 0xd8c0a0, edge: 0x6a4a2a }), U: twister('flying', 'featherA', [0xd8c0a0, 0xffffff], { r: 34, height: 95, ms: 1600 }) } },
  dodrio: { kitType: 'flying', ult: 'flock', slots: { J: bolt('flying', { scale: 1.1, texPick: ['featherA'], split: 3, splitSpreadDeg: 18, splitPowerMult: 0.65 }), K: dash('flying', { dashMs: 90, trailCount: 3, afterimages: 4, afterimageTint: 0xd8c0a0, lungeMult: 2 }), L: sweep('flying', { reach: 60, spanDeg: 180, fill: 0xd8c0a0, edge: 0x6a4a2a, spikes: 5 }), U: twister('flying', 'featherA', [0xd8c0a0, 0xffffff], { r: 42, height: 110, ms: 1900 }) }, ultParams: { dialect: 'flying', birds: 22, totalMs: 2800 } },
  farfetchd: { kitType: 'flying', slots: { J: sweep('flying', { reach: 46, spanDeg: 110, thick: 8 }), K: dash('flying', { dashMs: 100, trailCount: 1, streaks: true, lungeMult: 1.6 }), L: S('xslash', { dialect: 'flying' }), U: twister('flying', 'featherA', [0xffffff, 0x9acd5a], { r: 36, height: 100, ms: 1700 }) } },
};
