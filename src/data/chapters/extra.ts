// Bổ sung 12 loài Kanto còn thiếu (2026-10-19): Jigglypuff, Wigglytuff, Farfetch'd, Lickitung, Seaking, Electabuzz,
// Porygon, Omanyte, Omastar, Kabuto, Kabutops, Mew. Không có ải riêng: được thả thêm vào các ải sẵn có qua EXTRA_SPAWNS
// (stages.ts áp vào sau khi dựng STAGES). Sprite: PMDCollab SpriteCollab (xem ASSET_SOURCES.md).
import type { ChapterContent } from './types';
import { A, s, sk } from '../kit';
import type { Spawn } from '../stages';

const species: ChapterContent['species'] = {
  jigglypuff: {
    dex: 39, name: 'Jigglypuff', types: ['normal'], body: { w: 13, h: 11 }, fallbackColor: 0xf8b8c8,
    base: { hp: 150, atk: 48, speed: 82 }, skills: sk('doubleSlap', 'ch5_sing', ['ch5_bodySlam', 18]),
    evolution: { into: 'wigglytuff', item: 'moonStone' }, catchRate: 170,
    blurb: 'Hát ru bằng giọng trong veo; ai nghe hết bài đều ngủ say. Giận lên thì phồng tròn như quả bóng.',
  },
  wigglytuff: {
    dex: 40, name: 'Wigglytuff', types: ['normal'], body: { w: 16, h: 14 }, fallbackColor: 0xf8b8c8,
    base: { hp: 205, atk: 82, speed: 90 }, skills: sk('doubleSlap', 'ch5_sing', ['ch5_bodySlam', 1], ['ch5_gigaImpact', 36]), catchRate: 50,
    blurb: 'Bộ lông mềm như mây. Hít đầy hơi có thể phồng to gấp đôi.',
  },
  farfetchd: {
    dex: 83, name: "Farfetch'd", types: ['normal', 'flying'], body: { w: 14, h: 11 }, fallbackColor: 0xb08850,
    base: { hp: 112, atk: 84, speed: 122 }, skills: sk('peck', 'slash', ['wingAttack', 18], ['league_aerialDive', 30]), catchRate: 45,
    blurb: 'Luôn cắp theo một cọng hành dài làm kiếm. Mất cọng hành là mất hết khí thế.',
  },
  lickitung: {
    dex: 108, name: 'Lickitung', types: ['normal'], body: { w: 16, h: 14 }, fallbackColor: 0xf0a0b0,
    base: { hp: 172, atk: 72, speed: 70 }, skills: sk('wrap', 'ch7_stomp', ['ch5_bodySlam', 20], ['ch5_heavySlam', 30]), catchRate: 45,
    blurb: 'Lưỡi dài gấp đôi thân; một cú liếm làm đối thủ tê rần.',
  },
  seaking: {
    dex: 119, name: 'Seaking', types: ['water'], body: { w: 18, h: 12 }, fallbackColor: 0xf08060,
    base: { hp: 150, atk: 98, speed: 106 }, skills: sk('waterGun', 'hornAttack', ['league_waterfall', 1], ['hornDrill', 36]), catchRate: 60,
    blurb: 'Bơi ngược thác bằng chiếc sừng nhọn; mùa thu đẻ trứng thì ao hồ ngập sắc đỏ.',
  },
  electabuzz: {
    dex: 125, name: 'Electabuzz', types: ['electric'], body: { w: 16, h: 16 }, fallbackColor: 0xf8d030,
    base: { hp: 132, atk: 104, speed: 140 }, skills: sk('thundershock', 'ch5_cometPunch', ['thunderbolt', 30], ['thunder', 40]), catchRate: 45,
    blurb: 'Hay quanh quẩn nhà máy điện, ăn điện từ dây cáp. Bão đến là nó phấn khích.',
  },
  porygon: {
    dex: 137, name: 'Porygon', types: ['normal'], body: { w: 14, h: 12 }, fallbackColor: 0xf08890,
    base: { hp: 130, atk: 86, speed: 92 }, skills: sk('psybeam', 'tackle', ['ch5_triAttack', 25], ['ch5_hyperBeam', 40]), catchRate: 45,
    blurb: 'Pokémon nhân tạo đầu tiên làm từ mã lập trình; có thể đi vào không gian số.',
  },
  omanyte: {
    dex: 138, name: 'Omanyte', types: ['rock', 'water'], body: { w: 13, h: 11 }, fallbackColor: 0x70b8e8,
    base: { hp: 110, atk: 66, speed: 72 }, skills: sk('waterGun', 'withdraw', ['bubbleBeam', 20]),
    evolution: { into: 'omastar', level: 40 }, catchRate: 45,
    blurb: 'Pokémon cổ đại hồi sinh từ hóa thạch. Bơi bằng cách vặn xoắn mười xúc tu.',
  },
  omastar: {
    dex: 139, name: 'Omastar', types: ['rock', 'water'], body: { w: 16, h: 14 }, fallbackColor: 0x70b8e8,
    base: { hp: 150, atk: 112, speed: 80 }, skills: sk('waterGun', 'withdraw', ['bubbleBeam', 1], ['evo_hydroPump', 40]), catchRate: 45,
    blurb: 'Vỏ quá nặng nên tuyệt chủng; răng sắc cắn vỡ cả vỏ sò.',
  },
  kabuto: {
    dex: 140, name: 'Kabuto', types: ['rock', 'water'], body: { w: 13, h: 9 }, fallbackColor: 0xb08850,
    base: { hp: 100, atk: 82, speed: 92 }, skills: sk('scratch', 'harden', ['rockThrow', 20]),
    evolution: { into: 'kabutops', level: 40 }, catchRate: 45,
    blurb: 'Hóa thạch sống từ 300 triệu năm trước; ẩn dưới cát, mắt lấp lánh trong bóng tối.',
  },
  kabutops: {
    dex: 141, name: 'Kabutops', types: ['rock', 'water'], body: { w: 15, h: 15 }, fallbackColor: 0xb08850,
    base: { hp: 140, atk: 126, speed: 122 }, skills: sk('scratch', 'slash', ['evo_rockSlide', 1], ['ch7_crabhammer', 40]), catchRate: 45,
    blurb: 'Hai lưỡi liềm sắc như dao cạo; săn mồi dưới nước nhanh như chớp.',
  },
  mew: {
    dex: 151, name: 'Mew', types: ['psychic'], body: { w: 12, h: 10 }, fallbackColor: 0xf8b8d8, scale: 1.2,
    base: { hp: 175, atk: 132, speed: 150 }, skills: sk('psybeam', 'ch6_barrier', ['evo_psychic', 1], ['ch5_triAttack', 1]), catchRate: 3,
    blurb: 'Pokémon huyền ảo mang gen của mọi Pokémon. Hiếm ai tận mắt thấy nó.',
  },
};

const R = (hp: number, speed: number, contactDamage: number, xp: number, rangedDamage: number, tex: string, cd = 2000) => ({
  hp, speed, contactDamage, xp, behavior: 'ranged' as const, rangedDamage, rangedCooldownMs: cd, rangedTelegraphMs: 500, rangedProjectileSpeed: 200, preferredRange: 140, rangedTexture: tex,
});
const enemyStats: ChapterContent['enemyStats'] = {
  jigglypuff: R(34, 70, 8, 6, 11, 'starshot', 2200),
  wigglytuff: { hp: 66, speed: 70, contactDamage: 14, xp: 12, behavior: 'tank' },
  farfetchd: { hp: 36, speed: 130, contactDamage: 13, xp: 9, behavior: 'rusher' },
  lickitung: { hp: 70, speed: 64, contactDamage: 15, xp: 11, behavior: 'tank' },
  seaking: { hp: 54, speed: 118, contactDamage: 15, xp: 11, behavior: 'rusher' },
  electabuzz: R(56, 112, 15, 13, 17, 'zap', 1700),
  porygon: R(52, 90, 12, 12, 15, 'psyball', 1800),
  omanyte: R(40, 60, 10, 8, 12, 'bubble', 2200),
  omastar: R(74, 62, 16, 14, 18, 'bubble', 1800),
  kabuto: { hp: 42, speed: 70, contactDamage: 12, xp: 8, behavior: 'tank' },
  kabutops: { hp: 70, speed: 120, contactDamage: 18, xp: 14, behavior: 'rusher' },
  mew: { ...R(110, 130, 18, 30, 20, 'psyball', 1300), bossHp: 520 },
};

export const CHAPTER: ChapterContent = { id: 'extra', title: '', badgesAtStart: 99, species, moves: {}, enemyStats, stages: [] };

/** Thả thêm loài mới vào ải có sẵn: thêm vào đợt `wave` (âm = đếm từ cuối) và cho phép bắt */
export const EXTRA_SPAWNS: { stage: string; wave: number; spawns: Spawn[]; catchable: string[] }[] = [
  { stage: 'moon-b', wave: 1, spawns: [s('jigglypuff', 15), s('jigglypuff', 16)], catchable: ['jigglypuff'] },
  { stage: 'moon-elite', wave: 2, spawns: [s('omanyte', 17), s('kabuto', 17)], catchable: ['omanyte', 'kabuto'] },
  { stage: 'route6', wave: 2, spawns: [s('farfetchd', 26), s('jigglypuff', 25)], catchable: ['farfetchd', 'jigglypuff'] },
  { stage: 'route8', wave: 2, spawns: [s('lickitung', 30), s('farfetchd', 30)], catchable: ['lickitung', 'farfetchd'] },
  { stage: 'safari-zone', wave: 1, spawns: [s('seaking', 35), s('seaking', 35), s('lickitung', 35)], catchable: ['seaking', 'lickitung'] },
  { stage: 'silph-co', wave: 2, spawns: [s('porygon', 38), s('porygon', 38)], catchable: ['porygon'] },
  { stage: 'power-plant', wave: 1, spawns: [s('electabuzz', 47), s('electabuzz', 48)], catchable: ['electabuzz'] },
  { stage: 'cinnabar-mansion', wave: 1, spawns: [s('omastar', 46), s('kabutops', 46)], catchable: ['omastar', 'kabutops'] },
  // Mew: con đầu đàn đợt cuối Dinh thự hoang (nhật ký nghiên cứu Mew), tỉ lệ bắt theo luật huyền thoại
  { stage: 'cinnabar-mansion', wave: -1, spawns: [A('mew', 50)], catchable: ['mew'] },
];
