// Chương 4: Tàu S.S. Anne → Tháp Pokémon Lavender → Đường 8 → Hội quán Celadon (Erika).
// Loài mới: dòng Ma (Gastly → Haunter → Gengar), Cubone/Marowak, Growlithe/Arcanine, Vulpix/Ninetales, Tangela.
import { B, C, F, P, type MoveDef } from '../moveKit';
import { A, many, s, sk } from '../kit';
import type { ChapterContent } from './types';

// ======================================================================= chiêu thức mới
const MOVES: Record<string, MoveDef> = {
  // ---------------------------------------------------------------- Ma
  // ---- hệ Ma, bộ chiêu mới (nguyên mẫu): xem skills/kits.ts → TYPE_KITS.ghost + SPECIES_KITS gastly/haunter/gengar ----
  ch4_gasCloudN1: C({ id: 'ch4_gasCloudN1', name: 'Khí Ma', type: 'ghost', power: 8, cooldownMs: 3400, sfx: 'powder', icon: 'cloud', anim: 'attack', animMs: 340, range: 84, halfAngleDeg: 46, particle: 'shadowpuff',
    knockback: 0, status: { kind: 'poison', chance: 0.5, ms: 3000 }, archetype: 'cloud', desc: 'Phả đám khí ma tím hình quạt, lơ lửng ~2,4 giây: địch trong khí dễ Nhiễm độc và Rối loạn.' }),
  ch4_confuseBeamN2: C({ id: 'ch4_confuseBeamN2', name: 'Tia Mê Hoặc', type: 'ghost', power: 8, cooldownMs: 2600, sfx: 'swap', icon: 'spiral', anim: 'shoot', animMs: 300, line: 150, lineWidth: 14, sprayMs: 520, moveSlow: 0.5,
    particle: 'psypuff', knockback: 0, status: { kind: 'confuse', chance: 0.5, ms: 2000 }, archetype: 'stream', desc: 'Ngắm rồi bắn tia sáng ma quái xuyên mọi địch trên đường, mỗi nhịp có thể gây Rối loạn.' }),
  ch4_darkPulseN3: C({ id: 'ch4_darkPulseN3', name: 'Xung Bóng Tối', type: 'ghost', power: 34, cooldownMs: 3800, sfx: 'swap', icon: 'eye', anim: 'shoot', animMs: 420, line: 210, lineWidth: 34, sprayMs: 720, moveSlow: 0.3,
    particle: 'shadowpuff', knockback: 90, status: { kind: 'confuse', chance: 0.3, ms: 1800 }, archetype: 'stream', desc: 'Ngắm 0,4 giây rồi phóng cột bóng tối dày, dài, xuyên mọi địch và làm rung màn hình. 30% gây Rối loạn.' }),
  ch4_shadowBlastN3: B({ id: 'ch4_shadowBlastN3', name: 'Bùng Bóng Ma', type: 'ghost', power: 44, cooldownMs: 4600, sfx: 'swap', icon: 'skull', anim: 'charge', animMs: 440, burstRadius: 64, atTarget: true, particle: 'shadowpuff', knockback: 280,
    status: { kind: 'confuse', chance: 0.45, ms: 1800 }, archetype: 'blast', desc: 'Khóa mục tiêu, ném quả cầu bóng ma khổng lồ nổ thành vòng ma quái và sao 8 cánh. 45% gây Rối loạn.' }),
  ch4_lick: C({ id: 'ch4_lick', name: 'Liếm', type: 'ghost', power: 15, cooldownMs: 650, sfx: 'whip', icon: 'fang', range: 38, lunge: 26, particle: 'shadowpuff', knockback: 90,
    status: { kind: 'paralyze', chance: 0.3, ms: 900 }, desc: 'Lướt tới liếm bằng chiếc lưỡi lạnh buốt. 30% gây Tê liệt.' }),
  ch4_nightShade: P({ id: 'ch4_nightShade', name: 'Bóng Đêm', type: 'ghost', power: 0, cooldownMs: 480, sfx: 'swap', icon: 'eye', speed: 280, lifeMs: 1000, radius: 5, texture: 'shadowball', particle: 'shadowpuff', knockback: 40,
    homing: 5, fixedPerLevel: 1.6, desc: 'Cầu bóng tối tự lượn theo địch, luôn gây sát thương cố định theo cấp (không bị khắc hệ).' }),
  ch4_confuseRay: P({ id: 'ch4_confuseRay', name: 'Tia Rối Loạn', type: 'ghost', power: 4, cooldownMs: 2400, sfx: 'swap', icon: 'spiral', speed: 240, lifeMs: 1400, radius: 6, texture: 'psyball', particle: 'psypuff', knockback: 0,
    homing: 7, status: { kind: 'confuse', chance: 1, ms: 2400 }, desc: 'Đốm sáng ma quái tự đuổi theo mục tiêu: trúng là chắc chắn Rối loạn 2,4 giây.' }),
  ch4_poisonGas: B({ id: 'ch4_poisonGas', name: 'Khí Độc', type: 'poison', power: 6, cooldownMs: 3600, sfx: 'leaf', knockback: 0, icon: 'cloud', particle: 'poisonpuff', slow: 0.7,
    atTarget: true, zone: { radius: 66, ms: 2800, tickMs: 400 }, status: { kind: 'poison', chance: 0.5, ms: 3000 },
    desc: 'Phả đám khí độc dày đặc tại chỗ địch: địch trong khí bị chậm lại và dễ Nhiễm độc.' }),
  ch4_phantomForce: B({ id: 'ch4_phantomForce', name: 'Tàng Hình Tập Kích', type: 'ghost', power: 30, cooldownMs: 3800, sfx: 'swap', knockback: 200, icon: 'sparkle', burstRadius: 72, particle: 'shadowpuff',
    burrowMs: 1000, desc: 'Tan biến vào bóng tối 1 giây (bất tử, vẫn di chuyển được) rồi hiện ra giáng đòn quanh người.' }),
  ch4_shadowBall: P({ id: 'ch4_shadowBall', name: 'Cầu Bóng Ma', type: 'ghost', power: 36, cooldownMs: 2800, sfx: 'swap', icon: 'skull', anim: 'charge', animMs: 320, speed: 230, lifeMs: 1300, radius: 8,
    texture: 'shadowball', particle: 'shadowpuff', knockback: 200, homing: 2.5, explode: 56, status: { kind: 'confuse', chance: 0.3, ms: 1500 },
    desc: 'Quả cầu bóng ma lớn bám theo mục tiêu rồi nổ tung cả vùng. 30% gây Rối loạn.' }),

  // ---------------------------------------------------------------- Cubone / Marowak
  ch4_boneClub: C({ id: 'ch4_boneClub', name: 'Gậy Xương', type: 'ground', power: 18, cooldownMs: 800, sfx: 'hit', icon: 'sword', range: 42, halfAngleDeg: 50, particle: 'dustpuff', knockback: 170,
    status: { kind: 'paralyze', chance: 0.3, ms: 700 }, desc: 'Vung gậy xương nện mạnh. 30% làm địch choáng khựng lại.' }),
  ch4_bonemerang: P({ id: 'ch4_bonemerang', name: 'Xương Boomerang', type: 'ground', power: 13, cooldownMs: 950, sfx: 'whip', icon: 'whirl', speed: 300, lifeMs: 1100, radius: 5, texture: 'bone', spin: 20, particle: 'dustpuff', knockback: 80,
    boomerang: true, pierce: true, desc: 'Ném khúc xương bay ra rồi quay về tay, đánh trúng địch cả lượt đi lẫn lượt về.' }),
  ch4_rage: C({ id: 'ch4_rage', name: 'Cuồng Nộ', type: 'normal', power: 11, cooldownMs: 560, sfx: 'whip', icon: 'fist', range: 40, lunge: 22, particle: 'dustpuff', knockback: 90,
    stack: 0.45, desc: 'Nổi cơn cuồng nộ: đánh liền tay thì mỗi đòn mạnh thêm 45% (tối đa 4 lần).' }),
  ch4_boneRush: C({ id: 'ch4_boneRush', name: 'Xương Liên Hoàn', type: 'ground', power: 11, cooldownMs: 2000, sfx: 'dash', icon: 'sword', range: 46, halfAngleDeg: 50, lunge: 64, particle: 'dustpuff', knockback: 120,
    randomHits: [2, 5], hitGapMs: 100, crit: 0.2, desc: 'Lao tới đập xương liên hoàn 2–5 nhát. 20% Chí mạng mỗi nhát.' }),

  // ---------------------------------------------------------------- Growlithe / Arcanine
  ch4_flameWheel: C({ id: 'ch4_flameWheel', name: 'Bánh Xe Lửa', type: 'fire', power: 18, cooldownMs: 1000, sfx: 'flame', icon: 'flame', range: 44, halfAngleDeg: 50, lunge: 84, particle: 'flamepuff', knockback: 180,
    status: { kind: 'burn', chance: 0.3, ms: 2500 }, desc: 'Cuộn mình thành bánh xe lửa lăn vút tới húc. 30% gây Bỏng.' }),
  ch4_roar: B({ id: 'ch4_roar', name: 'Gầm Vang', type: 'normal', power: 4, cooldownMs: 4200, sfx: 'boss', knockback: 340, icon: 'wave', burstRadius: 96, particle: 'dustpuff',
    status: { kind: 'paralyze', chance: 1, ms: 600 }, desc: 'Gầm vang: hất văng mọi địch quanh người ra thật xa và làm chúng khựng lại 0,6 giây.' }),
  ch4_extremeSpeed: C({ id: 'ch4_extremeSpeed', name: 'Thần Tốc', type: 'normal', power: 30, cooldownMs: 1500, sfx: 'dash', icon: 'play', range: 48, halfAngleDeg: 45, lunge: 150, particle: 'spark', knockback: 230,
    crit: 0.3, desc: 'Phóng vút một quãng rất xa trong chớp mắt rồi húc mạnh. 30% Chí mạng.' }),

  // ---------------------------------------------------------------- Vulpix / Ninetales
  ch4_willOWisp: P({ id: 'ch4_willOWisp', name: 'Ma Trơi', type: 'fire', power: 6, cooldownMs: 560, sfx: 'ember', icon: 'flame', speed: 210, lifeMs: 1400, radius: 4, texture: 'fireball', particle: 'flamepuff', knockback: 30,
    count: 3, spreadDeg: 36, homing: 4.5, status: { kind: 'burn', chance: 0.5, ms: 2500 }, desc: 'Ba đốm ma trơi chập chờn tự tìm tới địch. Mỗi đốm 50% gây Bỏng.' }),
  ch4_fireSpin: B({ id: 'ch4_fireSpin', name: 'Lốc Lửa', type: 'fire', power: 7, cooldownMs: 3400, sfx: 'flame', knockback: 0, icon: 'whirl', particle: 'flamepuff', slow: 0.6,
    atTarget: true, zone: { radius: 52, ms: 3200, tickMs: 400 }, status: { kind: 'burn', chance: 0.35, ms: 2500 },
    desc: 'Dựng vòng lửa xoáy tại chỗ địch 3,2 giây: địch bên trong bị chậm lại và dễ Bỏng.' }),
  ch4_nineFlames: P({ id: 'ch4_nineFlames', name: 'Cửu Vĩ Hồ Hỏa', type: 'fire', power: 14, cooldownMs: 3600, sfx: 'flame', icon: 'crown', anim: 'charge', animMs: 360, speed: 250, lifeMs: 1500, radius: 5,
    texture: 'fireball', particle: 'flamepuff', knockback: 90, count: 9, spreadDeg: 200, homing: 4, status: { kind: 'burn', chance: 0.35, ms: 3000 },
    desc: 'Chín chiếc đuôi tung chín ngọn hồ hỏa xòe hình quạt rồi tự đuổi theo địch. 35% gây Bỏng.' }),

  // ---------------------------------------------------------------- Tangela
  ch4_bind: C({ id: 'ch4_bind', name: 'Dây Trói', type: 'grass', power: 10, cooldownMs: 1900, sfx: 'whip', icon: 'leaf', animMs: 300, sprayMs: 260, moveSlow: 0.4, particle: 'leafpuff', knockback: 0,
    line: 100, lineWidth: 18, status: { kind: 'paralyze', chance: 1, ms: 1200 }, desc: 'Phóng mớ dây leo thẳng tới trước: mọi địch trúng bị trói đứng im 1,2 giây.' }),
  ch4_ingrain: F({ id: 'ch4_ingrain', name: 'Bám Rễ', type: 'grass', power: 0, cooldownMs: 9000, sfx: 'heal', icon: 'seed', heal: 0.2, guard: 0.6, buffMs: 3500,
    desc: 'Cắm rễ xuống đất: hồi 20% máu tối đa và giảm 40% sát thương nhận vào trong 3,5 giây.' }),
  ch4_powerWhip: C({ id: 'ch4_powerWhip', name: 'Roi Quyền Lực', type: 'grass', power: 44, cooldownMs: 3200, sfx: 'whip', icon: 'leaf', animMs: 340, sprayMs: 300, moveSlow: 0.3, particle: 'leafpuff', knockback: 280,
    line: 136, lineWidth: 26, windupMs: 450, desc: 'Gồng mình rồi quật roi dây leo khổng lồ thật xa: sát thương cực lớn, hất văng địch.' }),
};

// ======================================================================= chương
export const CHAPTER: ChapterContent = {
  id: 'ch4',
  title: 'Chương 4 · Lavender → Hội quán Celadon',
  badgesAtStart: 3,

  species: {
    gastly: {
      dex: 92, name: 'Gastly', types: ['ghost', 'poison'], body: { w: 14, h: 10 }, fallbackColor: 0x403060,
      base: { hp: 82, atk: 66, speed: 118 }, skills: sk('ch4_nightShade', 'ch4_lick', ['ch4_confuseRay', 18], ['ch4_gasCloudN1', 24]),
      evolution: { into: 'haunter', level: 30 }, catchRate: 190,
      blurb: 'Làn khí ma quái. Bóng Đêm luôn gây sát thương cố định, kể cả với hệ Thường.',
    },
    haunter: {
      dex: 93, name: 'Haunter', types: ['ghost', 'poison'], body: { w: 16, h: 11 }, fallbackColor: 0x6a50a0,
      base: { hp: 100, atk: 76, speed: 124 }, skills: sk('ch4_nightShade', 'ch4_lick', ['ch4_confuseBeamN2', 1], ['ch4_phantomForce', 30]),
      evolution: { into: 'gengar', level: 38 }, catchRate: 90,
      blurb: 'Lẩn vào bóng tối rồi bất ngờ tập kích từ sau lưng.',
    },
    gengar: {
      dex: 94, name: 'Gengar', types: ['ghost', 'poison'], body: { w: 18, h: 13 }, fallbackColor: 0x5a4a8a, scale: 1.3,
      base: { hp: 118, atk: 88, speed: 128 }, skills: sk('ch4_nightShade', 'ch4_phantomForce', ['ch4_darkPulseN3', 1], ['ch4_shadowBlastN3', 1]),
      catchRate: 45,
      blurb: 'Chúa tể bóng tối: tàng hình né đòn, Cầu Bóng Ma nổ tung cả đám.',
    },
    cubone: {
      dex: 104, name: 'Cubone', types: ['ground'], body: { w: 12, h: 9 }, fallbackColor: 0xc8a060,
      base: { hp: 106, atk: 58, speed: 96 }, skills: sk('ch4_boneClub', 'ch4_bonemerang', ['ch4_rage', 18], ['dig', 24]),
      evolution: { into: 'marowak', level: 28 }, catchRate: 190,
      blurb: 'Đội chiếc sọ của mẹ. Xương Boomerang đánh trúng cả lượt đi lẫn lượt về.',
    },
    marowak: {
      dex: 105, name: 'Marowak', types: ['ground'], body: { w: 14, h: 10 }, fallbackColor: 0xb08a50,
      base: { hp: 128, atk: 72, speed: 100 }, skills: sk('ch4_boneClub', 'ch4_bonemerang', ['ch4_rage', 1], ['ch4_boneRush', 28]),
      catchRate: 75,
      blurb: 'Bậc thầy dùng xương: Cuồng Nộ càng đánh càng mạnh.',
    },
    growlithe: {
      dex: 58, name: 'Growlithe', types: ['fire'], body: { w: 15, h: 10 }, fallbackColor: 0xf08a30,
      base: { hp: 104, atk: 66, speed: 118 }, skills: sk('bite', 'ch4_flameWheel', ['ch4_roar', 18], ['flamethrower', 26]),
      evolution: { into: 'arcanine', item: 'fireStone' }, catchRate: 190,
      blurb: 'Chú chó trung thành, xông pha cận chiến. Gầm Vang hất văng cả đám vây quanh.',
    },
    arcanine: {
      dex: 59, name: 'Arcanine', types: ['fire'], body: { w: 22, h: 14 }, fallbackColor: 0xf07a28, scale: 1.4,
      base: { hp: 140, atk: 86, speed: 136 }, skills: sk('fireFang', 'ch4_flameWheel', ['ch4_roar', 1], ['ch4_extremeSpeed', 1]),
      catchRate: 75,
      blurb: 'Pokémon huyền thoại của phương Đông. Thần Tốc lao qua nửa sân trong chớp mắt.',
    },
    vulpix: {
      dex: 37, name: 'Vulpix', types: ['fire'], body: { w: 14, h: 9 }, fallbackColor: 0xc85a3a,
      base: { hp: 92, atk: 58, speed: 116 }, skills: sk('ember', 'ch4_willOWisp', ['ch4_fireSpin', 18], ['ch4_confuseRay', 24]),
      evolution: { into: 'ninetales', item: 'fireStone' }, catchRate: 190,
      blurb: 'Cáo lửa tinh ranh: đánh xa, thả ma trơi tự đuổi và giam địch trong lốc lửa.',
    },
    ninetales: {
      dex: 38, name: 'Ninetales', types: ['fire'], body: { w: 20, h: 12 }, fallbackColor: 0xf0e0a0, scale: 1.3,
      base: { hp: 120, atk: 76, speed: 128 }, skills: sk('ch4_willOWisp', 'ch4_fireSpin', ['ch4_confuseRay', 1], ['ch4_nineFlames', 1]),
      catchRate: 75,
      blurb: 'Hồ ly chín đuôi ngàn năm tuổi, tung chín ngọn lửa phủ kín màn hình.',
    },
    tangela: {
      dex: 114, name: 'Tangela', types: ['grass'], body: { w: 15, h: 11 }, fallbackColor: 0x3a6ac8,
      base: { hp: 130, atk: 62, speed: 90 }, skills: sk('absorb', 'ch4_bind', ['ch4_ingrain', 20], ['ch4_powerWhip', 26]),
      catchRate: 45,
      blurb: 'Búi dây leo lì lợm: trói chân địch, bám rễ hồi máu, quật roi cực mạnh.',
    },
  },

  moves: MOVES,

  enemyStats: {
    gastly: {
      hp: 24, speed: 80, contactDamage: 9, xp: 6, behavior: 'phantom',
      rangedDamage: 12, rangedCooldownMs: 2400, rangedTelegraphMs: 600, rangedProjectileSpeed: 170, preferredRange: 110, rangedTexture: 'shadowball',
    },
    haunter: {
      hp: 40, speed: 90, contactDamage: 12, xp: 9, behavior: 'phantom',
      rangedDamage: 15, rangedCooldownMs: 2100, rangedTelegraphMs: 550, rangedProjectileSpeed: 190, preferredRange: 120, rangedTexture: 'shadowball',
    },
    gengar: {
      hp: 60, speed: 95, contactDamage: 15, xp: 12, behavior: 'phantom', bossHp: 460,
      rangedDamage: 18, rangedCooldownMs: 1900, rangedTelegraphMs: 500, rangedProjectileSpeed: 210, preferredRange: 130, rangedTexture: 'shadowball',
    },
    cubone: {
      hp: 34, speed: 70, contactDamage: 11, xp: 6, behavior: 'ranged',
      rangedDamage: 13, rangedCooldownMs: 2200, rangedTelegraphMs: 550, rangedProjectileSpeed: 190, preferredRange: 130, rangedTexture: 'bone',
    },
    marowak: {
      hp: 62, speed: 75, contactDamage: 15, xp: 11, behavior: 'ranged',
      rangedDamage: 17, rangedCooldownMs: 1900, rangedTelegraphMs: 500, rangedProjectileSpeed: 210, preferredRange: 130, rangedTexture: 'bone',
    },
    growlithe: { hp: 34, speed: 135, contactDamage: 12, xp: 7, behavior: 'rusher' },
    arcanine: { hp: 70, speed: 150, contactDamage: 19, xp: 13, behavior: 'rusher', bossHp: 480 },
    vulpix: {
      hp: 28, speed: 95, contactDamage: 9, xp: 6, behavior: 'ranged',
      rangedDamage: 13, rangedCooldownMs: 2100, rangedTelegraphMs: 550, rangedProjectileSpeed: 190, preferredRange: 140, rangedTexture: 'fireball',
    },
    ninetales: {
      hp: 56, speed: 110, contactDamage: 14, xp: 12, behavior: 'ranged',
      rangedDamage: 17, rangedCooldownMs: 1700, rangedTelegraphMs: 480, rangedProjectileSpeed: 220, preferredRange: 150, rangedTexture: 'fireball',
    },
    tangela: { hp: 64, speed: 48, contactDamage: 13, xp: 8, behavior: 'tank' },
  },

  stages: [
    {
      id: 'ss-anne', kind: 'rival', name: 'Tàu S.S. Anne', area: 'Vermilion', x: 580, y: 226, playable: true, biome: 'ss-anne',
      rival: { tier: 1 }, levels: [28, 34], money: 1500, parTimeS: 160,
    },
    {
      id: 'lavender-tower', kind: 'elite', name: 'Tháp Pokémon Lavender', area: 'Lavender', x: 572, y: 196, label: 'Lavender', playable: true, biome: 'pokemon-tower',
      waves: [
        [...many('gastly', 28, 6), ...many('cubone', 28, 3)],
        [...many('gastly', 28, 4), ...many('cubone', 29, 3), s('haunter', 29), s('haunter', 29)],
        [...many('haunter', 29, 3), ...many('gastly', 29, 4), s('marowak', 30), s('cubone', 30)],
        [A('haunter', 31), A('marowak', 31), ...many('gastly', 30, 4), ...many('cubone', 30, 2)],
      ],
      catchable: ['gastly', 'haunter', 'cubone', 'marowak'], levels: [28, 31], money: 820, ballsFirstClear: 3, parTimeS: 160,
    },
    {
      id: 'route8', kind: 'stage', name: 'Đường 8 – Lối sang Celadon', area: 'Đường 8', x: 548, y: 206, playable: true, biome: 'blossom',
      waves: [
        [...many('growlithe', 29, 4), ...many('pidgeotto', 29, 3)],
        [...many('vulpix', 29, 4), ...many('meowth', 29, 3), s('abra', 29)],
        [...many('ekans', 30, 3), ...many('sandshrew', 30, 3), ...many('growlithe', 30, 2)],
        [...many('vulpix', 30, 3), ...many('growlithe', 30, 3), s('persian', 31), s('arbok', 31)],
        [...many('growlithe', 31, 3), ...many('vulpix', 31, 3), s('sandslash', 31), A('growlithe', 32)],
      ],
      catchable: ['growlithe', 'vulpix', 'meowth', 'ekans', 'sandshrew', 'abra', 'pidgeotto'], levels: [29, 32], money: 720, ballsFirstClear: 2, parTimeS: 135,
    },
    {
      id: 'gym-celadon', kind: 'gym', name: 'Hội quán Celadon', area: 'Celadon', x: 505, y: 206, label: 'Celadon', playable: true, biome: 'gym-celadon', gymId: 'celadon',
      levels: [29, 33], money: 2400, parTimeS: 180,
    },
  ],

  gyms: {
    celadon: {
      id: 'celadon',
      city: 'Thành phố Celadon',
      title: 'Hội quán Celadon',
      leader: 'Erika',
      leaderSprite: 'erika',
      badgeId: 'rainbow',
      team: [
        { species: 'tangela', level: 29 },
        { species: 'weepinbell', level: 30 },
        { species: 'vileplume', level: 33, boss: true },
      ],
      // hội quán động: 2 con bốc từ kho (khác loài), rồi át chủ bài
      pool: [
        { species: 'tangela', level: 29 },
        { species: 'weepinbell', level: 30 },
        { species: 'gloom', level: 29 },
        { species: 'exeggcute', level: 29 },
        { species: 'parasect', level: 30 },
        { species: 'victreebel', level: 31 },
      ],
      pick: 2,
      ace: { species: 'vileplume', level: 33, boss: true },
      tuning: { attackSpeed: 1.2, aceHp: 0.45, aceDmg: 0.85 },
      intro: [
        'Erika: Ôi... xin lỗi, tôi lỡ thiu thiu ngủ giữa vườn hoa. Chào mừng cậu đến Hội quán Celadon.',
        'Erika: Tôi là Erika. Những bồn hoa kia thỉnh thoảng sẽ tỏa bào tử — đứng trong đó đúng lúc hoa phun thì chân cậu sẽ nặng trĩu đấy.',
        'Erika: Hoa tuy dịu dàng nhưng rễ thì bền bỉ lắm. Tôi sẽ không nương tay đâu.',
      ],
      sendOut: ['Erika: Tangela, giăng dây leo nào.', 'Erika: Weepinbell, đến lượt em.', 'Erika: Vileplume, hãy nở rộ đi!'],
      winLines: [
        'Erika: Ôi... tôi thua rồi. Cậu mạnh thật đấy.',
        'Erika: Xin hãy nhận Huy hiệu Cầu Vồng này, nó lấp lánh đủ bảy sắc như vườn hoa sau mưa.',
        'Erika: Và cả Đá Lá nữa — vài loài Pokémon hệ Cỏ sẽ tiến hóa khi chạm vào nó.',
      ],
      afterLines: ['Erika: Hoa trong vườn đang nở đẹp lắm. Lúc nào rảnh cứ ghé uống trà với tôi nhé.'],
      reward: { item: 'leafStone', name: 'Đá Lá' },
    },
  },

  badges: {
    rainbow: { id: 'rainbow', name: 'Huy hiệu Cầu Vồng', texture: 'badge-rainbow' },
  },

  bossPatterns: {
    // Gengar: mưa cầu bóng ma, vòng bóng tối, lao xuyên bóng
    gengar: { type: 'ghost', dropTexture: 'shadowball', ringTexture: 'shadowball', ringCount: 18, ringSpeed: 180, glow: 0x9a70e0, impact: 'shadow' },
    // Arcanine: mưa cầu lửa, vòng lửa dày, lao Thần Tốc
    arcanine: { type: 'fire', dropTexture: 'fireball', ringTexture: 'fireball', ringCount: 20, ringSpeed: 200, glow: 0xf08030, impact: 'flame' },
  },

  trainerPalettes: {
    // Erika: tóc đen ngắn, kimono xanh lá viền vàng, hakama đỏ
    erika: { skin: 0xf4cca8, hair: 0x1a1a2a, cap: null, shirt: 0x4a9a4a, shirtTrim: 0xf0d050, arms: 0x4a9a4a, pants: 0xc83a3a, shoes: 0x5a3a2a, hairStyle: 'long' },
  },
};
