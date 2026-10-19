// Liên đoàn Indigo · Đường Chiến Thắng → Nhà vô địch (+ Hang Cerulean sau khi thành Nhà vô địch).
// Loài sở hữu: magikarp gyarados dratini dragonair dragonite aerodactyl lapras moltres mewtwo (boss: lapras, dragonite).
// Ải: cổng Đường Chiến Thắng (Shigeru bậc 3), 3 chặng Đường Chiến Thắng + ải tinh anh, đỉnh lửa Moltres,
// Cao nguyên Indigo, Tứ Thiên Vương (Kanna, Shiba, Kikuko, Wataru), Nhà vô địch (Shigeru bậc 5), Hang Cerulean (Mewtwo).
import type { ChapterContent } from './types';
import { B, C, F, P } from '../moveKit';
import { A, many, s, sk } from '../kit';

export const CHAPTER: ChapterContent = {
  id: 'league',
  title: 'Liên đoàn Indigo · Tứ Thiên Vương',
  badgesAtStart: 8,

  // ================================================================== loài
  species: {
    magikarp: {
      dex: 129, name: 'Magikarp', types: ['water'], body: { w: 13, h: 9 }, fallbackColor: 0xe86a30,
      base: { hp: 80, atk: 40, speed: 90 }, skills: sk('league_splash', 'tackle', ['league_flail', 15]),
      evolution: { into: 'gyarados', level: 20 }, catchRate: 255,
      blurb: 'Bị coi là Pokémon yếu nhất... cho tới ngày nó tiến hóa.',
    },
    gyarados: {
      dex: 130, name: 'Gyarados', types: ['water', 'flying'], body: { w: 24, h: 14 }, fallbackColor: 0x3a78c8, scale: 1.6,
      base: { hp: 140, atk: 86, speed: 112 }, skills: sk('bite', 'league_waterfall', ['league_dragonRage', 20], ['league_hyperBeam', 30]),
      catchRate: 45,
      blurb: 'Hung bạo, lao như thác lũ. Tia Phá Hủy quét sạch cả một hàng địch.',
    },
    dratini: {
      dex: 147, name: 'Dratini', types: ['dragon'], body: { w: 14, h: 9 }, fallbackColor: 0x7aa0e8,
      base: { hp: 96, atk: 60, speed: 112 }, skills: sk('league_dragonBreath', 'wrap', ['league_twister', 18], ['league_dragonRage', 26]),
      evolution: { into: 'dragonair', level: 30 }, catchRate: 45,
      blurb: 'Rồng con hiếm gặp, lột da nhiều lần để lớn dần.',
    },
    dragonair: {
      dex: 148, name: 'Dragonair', types: ['dragon'], body: { w: 18, h: 11 }, fallbackColor: 0x5a88e0, scale: 1.3,
      base: { hp: 118, atk: 72, speed: 118 }, skills: sk('league_dragonBreath', 'wrap', ['league_twister', 18], ['league_dragonPulse', 30]),
      evolution: { into: 'dragonite', level: 55 }, catchRate: 45,
      blurb: 'Được cho là điều khiển được thời tiết. Long Ba bám đuổi mục tiêu rồi nổ lớn.',
    },
    dragonite: {
      dex: 149, name: 'Dragonite', types: ['dragon', 'flying'], body: { w: 20, h: 14 }, fallbackColor: 0xf0a040, scale: 1.45,
      base: { hp: 148, atk: 90, speed: 124 }, skills: sk('league_dragonBreath', 'wingAttack', ['league_twister', 18], ['league_outrage', 55]),
      catchRate: 45,
      blurb: 'Rồng hiền lành bay vòng quanh trái đất trong 16 giờ. Nổi giận thì Nghịch Lân không gì cản nổi.',
    },
    aerodactyl: {
      dex: 142, name: 'Aerodactyl', types: ['rock', 'flying'], body: { w: 20, h: 12 }, fallbackColor: 0xa890c0, scale: 1.35,
      base: { hp: 118, atk: 82, speed: 150 }, skills: sk('league_rockSlide', 'league_aerialDive', ['hyperFang', 20], ['league_skyAttack', 40]),
      catchRate: 45,
      blurb: 'Bá chủ bầu trời thời tiền sử. Nhanh nhất Liên đoàn, bổ nhào từ trên cao.',
    },
    lapras: {
      dex: 131, name: 'Lapras', types: ['water', 'ice'], body: { w: 20, h: 14 }, fallbackColor: 0x5aa0e0, scale: 1.4,
      base: { hp: 150, atk: 70, speed: 96 }, skills: sk('league_iceBeam', 'league_sing', ['waterPulse', 20], ['league_blizzard', 40]),
      catchRate: 45,
      blurb: 'Hiền lành, thích chở người qua biển. Tiếng hát ru địch ngủ, Bão Tuyết đóng băng cả vùng.',
    },
    moltres: {
      dex: 146, name: 'Moltres', types: ['fire', 'flying'], body: { w: 22, h: 14 }, fallbackColor: 0xf0a030, scale: 1.5,
      base: { hp: 140, atk: 88, speed: 130 }, skills: sk('league_heatWave', 'wingAttack', ['league_fireSpin', 30], ['league_fireBlast', 50]),
      catchRate: 15,
      blurb: 'Chim lửa huyền thoại. Mỗi lần vỗ cánh là một làn sóng nhiệt thiêu rụi mọi thứ.',
    },
    mewtwo: {
      dex: 150, name: 'Mewtwo', types: ['psychic'], body: { w: 16, h: 13 }, fallbackColor: 0xb8a0d0, scale: 1.35,
      base: { hp: 150, atk: 90, speed: 140 }, skills: sk('league_psychoCut', 'league_recover', ['league_barrier', 40], ['league_psychic', 60]),
      catchRate: 10,
      blurb: 'Pokémon được tạo ra bằng gen. Sức mạnh siêu linh của nó không có đối thủ.',
    },
  },

  // ================================================================== chiêu
  moves: {
    // ---- Magikarp / Gyarados
    league_splash: F({ id: 'league_splash', name: 'Vẫy Vùng', type: 'water', power: 0, cooldownMs: 2400, sfx: 'water', icon: 'drop', evade: 0.45, buffMs: 1500,
      desc: 'Nhảy loi choi tại chỗ: 45% né mọi đòn trong 1,5 giây... và chẳng gây chút sát thương nào.' }),
    league_flail: C({ id: 'league_flail', name: 'Quẫy Đạp', type: 'normal', power: 6, cooldownMs: 1000, sfx: 'whip', icon: 'whirl', range: 38, halfAngleDeg: 70, particle: 'bubblepuff', knockback: 60,
      randomHits: [1, 6], hitGapMs: 90, desc: 'Quẫy đạp loạn xạ trước mặt ngẫu nhiên 1–6 lần — hên xui hoàn toàn.' }),
    league_waterfall: C({ id: 'league_waterfall', name: 'Thác Đổ', type: 'water', power: 26, cooldownMs: 1300, sfx: 'water', icon: 'wave', range: 46, halfAngleDeg: 40, particle: 'bubblepuff', knockback: 230,
      lunge: 84, status: { kind: 'paralyze', chance: 0.3, ms: 700 }, desc: 'Lao vút tới như thác đổ rồi húc mạnh. 30% làm địch khựng lại.' }),
    league_dragonRage: P({ id: 'league_dragonRage', name: 'Long Nộ', type: 'dragon', power: 0, cooldownMs: 1600, sfx: 'flame', icon: 'flame', speed: 300, radius: 6, texture: 'dragonflame', particle: 'dragonpuff', knockback: 90,
      fixedPerLevel: 2.4, explode: 30, desc: 'Phun lửa rồng: luôn gây sát thương cố định theo cấp (không bị khắc hệ), nổ lan một vùng nhỏ.' }),
    league_hyperBeam: C({ id: 'league_hyperBeam', name: 'Phá Hủy', type: 'normal', power: 70, cooldownMs: 7000, sfx: 'thunder', icon: 'star', anim: 'shoot', animMs: 420, sprayMs: 300, moveSlow: 0.2, particle: 'spark', knockback: 320,
      line: 240, lineWidth: 28, windupMs: 900, desc: 'Gồng 0,9 giây rồi bắn tia hủy diệt thẳng tắp gần hết chiều ngang sân, sát thương cực lớn.' }),

    // ---- dòng rồng Dratini
    league_dragonBreath: P({ id: 'league_dragonBreath', name: 'Hơi Thở Rồng', type: 'dragon', power: 11, cooldownMs: 380, sfx: 'flame', icon: 'cloud', speed: 320, lifeMs: 700, radius: 5, texture: 'dragonflame', particle: 'dragonpuff', knockback: 60,
      status: { kind: 'paralyze', chance: 0.2, ms: 800 }, desc: 'Phả luồng long khí nhanh. 20% gây Tê liệt.' }),
    league_twister: B({ id: 'league_twister', name: 'Lốc Rồng', type: 'dragon', power: 18, cooldownMs: 2600, anim: 'attack', animMs: 320, sfx: 'dash', icon: 'whirl', knockback: 260, burstRadius: 72, particle: 'dragonpuff',
      status: { kind: 'confuse', chance: 0.3, ms: 1500 }, desc: 'Quẫy mình tạo lốc rồng quanh người, hất văng mọi địch ra xa. 30% gây Rối loạn.' }),
    league_dragonPulse: P({ id: 'league_dragonPulse', name: 'Long Ba', type: 'dragon', power: 32, cooldownMs: 3000, sfx: 'flame', icon: 'spiral', anim: 'charge', animMs: 340, speed: 230, lifeMs: 1300, radius: 8, texture: 'dragonflame', particle: 'dragonpuff', knockback: 200,
      homing: 3, explode: 54, desc: 'Quả cầu long khí bay chậm, bám theo mục tiêu rồi nổ thành sóng lớn.' }),
    league_outrage: C({ id: 'league_outrage', name: 'Nghịch Lân', type: 'dragon', power: 20, cooldownMs: 4600, sfx: 'dash', icon: 'claw', range: 52, halfAngleDeg: 60, particle: 'dragonpuff', knockback: 200,
      lunge: 70, hits: 4, hitGapMs: 150, crit: 0.3, desc: 'Nổi cơn cuồng nộ: lao tới đánh liền 4 đòn quét rộng, mỗi đòn 30% Chí mạng.' }),

    // ---- Aerodactyl
    league_rockSlide: P({ id: 'league_rockSlide', name: 'Đá Lở', type: 'rock', power: 12, cooldownMs: 700, sfx: 'hit', icon: 'rock', speed: 280, radius: 5, texture: 'rockball', particle: 'dustpuff', knockback: 110,
      count: 3, spreadDeg: 26, status: { kind: 'paralyze', chance: 0.2, ms: 600 }, desc: 'Ném 3 tảng đá tỏa hình quạt. 20% làm địch khựng lại.' }),
    league_aerialDive: C({ id: 'league_aerialDive', name: 'Bổ Nhào', type: 'flying', power: 24, cooldownMs: 1300, sfx: 'dash', icon: 'wing', range: 48, halfAngleDeg: 40, particle: 'windpuff', knockback: 200,
      lunge: 110, crit: 0.35, desc: 'Bổ nhào từ trên cao, lao rất xa tới mục tiêu. 35% Chí mạng.' }),
    league_skyAttack: C({ id: 'league_skyAttack', name: 'Không Kích', type: 'flying', power: 64, cooldownMs: 6000, sfx: 'dash', icon: 'wing', range: 56, halfAngleDeg: 45, particle: 'windpuff', knockback: 320,
      lunge: 170, crit: 0.3, windupMs: 700, desc: 'Gồng 0,7 giây rồi lao vút gần nửa sân giáng một đòn cực mạnh. 30% Chí mạng.' }),

    // ---- Lapras
    league_iceBeam: P({ id: 'league_iceBeam', name: 'Tia Băng', type: 'ice', power: 11, cooldownMs: 420, sfx: 'zap', icon: 'sparkle', speed: 380, radius: 5, texture: 'iceshard', particle: 'icepuff', knockback: 50,
      pierce: true, status: { kind: 'freeze', chance: 0.15, ms: 1200 }, desc: 'Tia băng xuyên thẳng qua cả hàng địch. 15% gây Đóng băng.' }),
    league_sing: C({ id: 'league_sing', name: 'Hát Ru', type: 'normal', power: 0, cooldownMs: 4200, sfx: 'heal', icon: 'note', anim: 'shoot', animMs: 340, range: 120, halfAngleDeg: 55, sprayMs: 300, particle: 'psypuff', knockback: 0,
      status: { kind: 'sleep', chance: 1, ms: 2600 }, desc: 'Cất tiếng hát êm dịu: mọi địch trong hình quạt rộng phía trước Ngủ 2,6 giây.' }),
    league_blizzard: B({ id: 'league_blizzard', name: 'Bão Tuyết', type: 'ice', power: 40, cooldownMs: 5600, sfx: 'thunder', icon: 'cloud', knockback: 220, burstRadius: 130, particle: 'icepuff',
      windupMs: 600, slow: 0.5, status: { kind: 'freeze', chance: 0.4, ms: 1600 }, desc: 'Gồng 0,6 giây rồi thổi bão tuyết quanh người, vùng rất rộng: làm chậm và 40% Đóng băng mọi địch.' }),

    // ---- Moltres
    league_heatWave: C({ id: 'league_heatWave', name: 'Sóng Nhiệt', type: 'fire', power: 14, cooldownMs: 1100, sfx: 'flame', icon: 'flame', anim: 'shoot', animMs: 300, range: 92, halfAngleDeg: 65, sprayMs: 240, particle: 'flamepuff', knockback: 120,
      status: { kind: 'burn', chance: 0.3, ms: 2600 }, desc: 'Vỗ cánh tỏa sóng nhiệt hình quạt rất rộng. 30% gây Bỏng.' }),
    league_fireSpin: B({ id: 'league_fireSpin', name: 'Lốc Lửa', type: 'fire', power: 7, cooldownMs: 3400, sfx: 'flame', icon: 'whirl', knockback: 0, particle: 'flamepuff', burstRadius: 50,
      atTarget: true, zone: { radius: 50, ms: 3200, tickMs: 400 }, slow: 0.6, status: { kind: 'burn', chance: 0.5, ms: 2600 },
      desc: 'Nhốt địch trong cột lửa xoáy 3,2 giây: địch bên trong chậm lại, mất máu liên tục, dễ Bỏng.' }),
    league_fireBlast: P({ id: 'league_fireBlast', name: 'Đại Hỏa Tự', type: 'fire', power: 46, cooldownMs: 5400, sfx: 'flame', icon: 'flame', anim: 'charge', animMs: 360, speed: 250, lifeMs: 1000, radius: 9, texture: 'fireball', particle: 'flamepuff', knockback: 260,
      windupMs: 600, explode: 72, status: { kind: 'burn', chance: 0.7, ms: 3400 }, desc: 'Gồng 0,6 giây rồi phóng cầu lửa khổng lồ, nổ tung một vùng cực rộng. 70% gây Bỏng.' }),

    // ---- Mewtwo
    league_psychoCut: P({ id: 'league_psychoCut', name: 'Lưỡi Siêu Linh', type: 'psychic', power: 10, cooldownMs: 380, sfx: 'zap', icon: 'spiral', speed: 440, lifeMs: 620, radius: 4, texture: 'psyball', particle: 'psypuff', knockback: 50,
      count: 3, spreadDeg: 22, pierce: true, crit: 0.2, desc: 'Phóng 3 lưỡi siêu linh tỏa quạt, xuyên qua địch. 20% Chí mạng.' }),
    league_recover: F({ id: 'league_recover', name: 'Hồi Phục', type: 'normal', power: 0, cooldownMs: 9000, sfx: 'heal', icon: 'heart', heal: 0.3,
      desc: 'Tập trung tinh thần, hồi ngay 30% máu tối đa.' }),
    league_barrier: F({ id: 'league_barrier', name: 'Rào Chắn', type: 'psychic', power: 0, cooldownMs: 8000, sfx: 'swap', icon: 'shield', guard: 0.35, reflect: 1.2, buffMs: 3500,
      desc: 'Dựng rào chắn siêu linh 3,5 giây: giảm 65% sát thương nhận vào và phản đòn mọi địch cận chiến.' }),
    league_psychic: B({ id: 'league_psychic', name: 'Siêu Năng Lực', type: 'psychic', power: 52, cooldownMs: 5400, sfx: 'thunder', icon: 'eye', knockback: 300, burstRadius: 140, particle: 'psypuff',
      windupMs: 700, status: { kind: 'confuse', chance: 0.6, ms: 2200 }, desc: 'Gồng 0,7 giây rồi giải phóng sóng siêu linh cực mạnh quanh người, vùng rất rộng. 60% gây Rối loạn.' }),
  },

  // ================================================================== chỉ số khi làm địch (Lv 5)
  enemyStats: {
    magikarp: { hp: 22, speed: 45, contactDamage: 4, xp: 4, behavior: 'tank' },
    gyarados: { hp: 84, speed: 100, contactDamage: 19, xp: 13, behavior: 'rusher' },
    dratini: {
      hp: 34, speed: 80, contactDamage: 10, xp: 7, behavior: 'ranged',
      rangedDamage: 13, rangedCooldownMs: 2200, rangedTelegraphMs: 550, rangedProjectileSpeed: 190, preferredRange: 140, rangedTexture: 'dragonflame',
    },
    dragonair: {
      hp: 58, speed: 95, contactDamage: 14, xp: 10, behavior: 'ranged',
      rangedDamage: 16, rangedCooldownMs: 1900, rangedTelegraphMs: 500, rangedProjectileSpeed: 210, preferredRange: 150, rangedTexture: 'dragonflame',
    },
    dragonite: { hp: 86, speed: 105, contactDamage: 19, xp: 14, behavior: 'rusher', bossHp: 500 },
    aerodactyl: { hp: 62, speed: 150, contactDamage: 18, xp: 12, behavior: 'rusher' },
    lapras: {
      hp: 84, speed: 60, contactDamage: 15, xp: 13, behavior: 'ranged', bossHp: 480,
      rangedDamage: 16, rangedCooldownMs: 1800, rangedTelegraphMs: 550, rangedProjectileSpeed: 200, preferredRange: 160, rangedTexture: 'iceshard',
    },
    moltres: {
      hp: 82, speed: 105, contactDamage: 18, xp: 14, behavior: 'ranged',
      rangedDamage: 18, rangedCooldownMs: 1500, rangedTelegraphMs: 500, rangedProjectileSpeed: 230, preferredRange: 150, rangedTexture: 'fireball',
    },
    // dịch chuyển tức thời: tan biến rồi hiện ra cạnh người chơi và bắn cầu siêu linh
    mewtwo: {
      hp: 90, speed: 120, contactDamage: 20, xp: 14, behavior: 'phantom',
      rangedDamage: 20, rangedCooldownMs: 1500, rangedTelegraphMs: 500, rangedProjectileSpeed: 260, preferredRange: 150, rangedTexture: 'psyball',
    },
  },

  // ================================================================== nút bản đồ
  stages: [
    {
      id: 'vr-rival', kind: 'rival', rival: { tier: 3 }, name: 'Cổng Đường Chiến Thắng', area: 'Đường 23', x: 165, y: 199, playable: true,
      biome: 'victory-road', levels: [49, 64], money: 3000, parTimeS: 170,
    },
    {
      id: 'victory-road-1', kind: 'stage', name: 'Đường Chiến Thắng – Cửa hang', area: 'Đường Chiến Thắng', x: 140, y: 198, label: 'Đường Chiến Thắng', playable: true, biome: 'victory-road',
      waves: [
        [...many('graveler', 50, 4), ...many('golbat', 50, 4)],
        [...many('machoke', 50, 4), ...many('onix', 51, 2), ...many('golbat', 51, 2)],
        [...many('marowak', 51, 3), ...many('sandslash', 51, 3), ...many('dratini', 51, 2)],
        [...many('graveler', 52, 3), ...many('machoke', 52, 3), ...many('arbok', 52, 2)],
        [...many('golbat', 52, 4), ...many('graveler', 52, 2), A('machoke', 53)],
      ],
      catchable: ['graveler', 'golbat', 'machoke', 'onix', 'marowak', 'sandslash', 'dratini', 'arbok'], levels: [50, 53], money: 1250, ballsFirstClear: 3, parTimeS: 130,
    },
    {
      id: 'victory-road-2', kind: 'stage', name: 'Đường Chiến Thắng – Hang tối', area: 'Đường Chiến Thắng', x: 118, y: 183, playable: true, biome: 'cave',
      waves: [
        [...many('venomoth', 51, 4), ...many('golbat', 51, 4)],
        [...many('dugtrio', 51, 3), ...many('marowak', 52, 3), ...many('golbat', 52, 2)],
        [...many('onix', 52, 2), ...many('graveler', 52, 4), ...many('venomoth', 52, 2)],
        [...many('primeape', 53, 3), ...many('machoke', 53, 3), ...many('golbat', 53, 2)],
        [...many('dugtrio', 53, 3), ...many('marowak', 53, 3), A('golem', 54)],
      ],
      catchable: ['venomoth', 'golbat', 'dugtrio', 'marowak', 'onix', 'graveler', 'primeape', 'machoke', 'golem'], levels: [51, 54], money: 1300, parTimeS: 135,
    },
    {
      id: 'moltres-peak', kind: 'event', name: 'Đỉnh Lửa – Cánh chim huyền thoại', area: 'Đường Chiến Thắng', x: 96, y: 168, playable: true, biome: 'volcano',
      waves: [
        [...many('ponyta', 52, 4), ...many('growlithe', 52, 3), ...many('fearow', 52, 2)],
        [...many('rapidash', 53, 2), ...many('magmar', 53, 3), ...many('ponyta', 53, 2), s('arcanine', 54)],
        [...many('fearow', 53, 3), ...many('magmar', 54, 2), ...many('rapidash', 54, 2)],
        [s('rapidash', 54), s('magmar', 54), A('moltres', 55)],
      ],
      catchable: ['moltres', 'ponyta', 'rapidash', 'growlithe', 'magmar', 'fearow'], levels: [52, 55], money: 1300, ballsFirstClear: 4, parTimeS: 115,
    },
    {
      id: 'victory-road-3', kind: 'stage', name: 'Đường Chiến Thắng – Vách đá', area: 'Đường Chiến Thắng', x: 94, y: 148, playable: true, biome: 'victory-road',
      waves: [
        [...many('golem', 53, 3), ...many('primeape', 53, 3), ...many('golbat', 53, 2)],
        [...many('rhyhorn', 54, 3), ...many('machoke', 54, 3), ...many('dratini', 54, 2)],
        [...many('arbok', 54, 2), ...many('sandslash', 54, 3), ...many('venomoth', 54, 3)],
        [...many('dragonair', 55, 2), ...many('graveler', 55, 4), ...many('magikarp', 54, 2)],
        [...many('rhyhorn', 55, 3), ...many('golbat', 55, 3), A('dragonair', 56)],
      ],
      catchable: ['golem', 'primeape', 'golbat', 'rhyhorn', 'machoke', 'dratini', 'dragonair', 'arbok', 'sandslash', 'venomoth', 'graveler', 'magikarp'],
      levels: [53, 56], money: 1350, parTimeS: 135,
    },
    {
      id: 'victory-road-elite', kind: 'elite', name: 'Đường Chiến Thắng – Hang tổ tiên', area: 'Đường Chiến Thắng', x: 92, y: 128, playable: true, biome: 'victory-road',
      waves: [
        [...many('machoke', 55, 4), ...many('golem', 55, 3), ...many('golbat', 55, 2)],
        [...many('rhyhorn', 56, 3), ...many('dragonair', 56, 2), ...many('marowak', 56, 3), s('onix', 56)],
        [...many('primeape', 56, 3), ...many('venomoth', 56, 3), ...many('dugtrio', 56, 3)],
        [...many('golbat', 57, 3), ...many('machoke', 57, 2), A('machamp', 57), A('aerodactyl', 58)],
      ],
      catchable: ['aerodactyl', 'machamp', 'machoke', 'golem', 'rhyhorn', 'dragonair', 'marowak', 'primeape', 'venomoth', 'dugtrio', 'golbat', 'onix'],
      levels: [55, 58], money: 1700, ballsFirstClear: 3, parTimeS: 160,
    },
    {
      id: 'indigo-plateau', kind: 'event', name: 'Cao nguyên Indigo – Thử thách trước cổng', area: 'Cao nguyên Indigo', x: 94, y: 105, label: 'Cao nguyên Indigo', playable: true, biome: 'indigo-plateau',
      waves: [
        [...many('dodrio', 54, 3), ...many('nidorino', 54, 3), ...many('rapidash', 54, 2)],
        [...many('kangaskhan', 55, 2), ...many('tauros', 55, 3), ...many('electrode', 55, 3)],
        [...many('alakazam', 56, 2), ...many('ninetales', 56, 2), ...many('dragonair', 56, 2), ...many('nidorina', 56, 2)],
        [...many('dewgong', 56, 3), ...many('tentacruel', 56, 2), A('gyarados', 58)],
      ],
      catchable: ['gyarados', 'dodrio', 'nidorino', 'nidorina', 'rapidash', 'kangaskhan', 'tauros', 'electrode', 'ninetales', 'dragonair', 'dewgong', 'tentacruel'],
      levels: [54, 58], money: 1500, ballsFirstClear: 5, parTimeS: 115,
      itemFirstClear: { item: 'moonStone', name: 'Đá Trăng' },
    },
    { id: 'e4-kanna', kind: 'league', name: 'Tứ Thiên Vương · Kanna', area: 'Liên đoàn Indigo', x: 136, y: 66, label: 'Sảnh Pha Lê', playable: true, biome: 'e4-kanna', gymId: 'kanna', levels: [58, 62], money: 5000, parTimeS: 180 },
    { id: 'e4-shiba', kind: 'league', name: 'Tứ Thiên Vương · Shiba', area: 'Liên đoàn Indigo', x: 248, y: 64, label: 'Sảnh Đá', playable: true, biome: 'e4-shiba', gymId: 'shiba', levels: [59, 62], money: 5300, parTimeS: 180 },
    { id: 'e4-kikuko', kind: 'league', name: 'Tứ Thiên Vương · Kikuko', area: 'Liên đoàn Indigo', x: 360, y: 64, label: 'Sảnh U Linh', playable: true, biome: 'e4-kikuko', gymId: 'kikuko', levels: [59, 63], money: 5600, parTimeS: 185 },
    { id: 'e4-wataru', kind: 'league', name: 'Tứ Thiên Vương · Wataru', area: 'Liên đoàn Indigo', x: 472, y: 66, label: 'Sảnh Rồng', playable: true, biome: 'e4-wataru', gymId: 'wataru', levels: [60, 64], money: 6000, parTimeS: 190 },
    {
      id: 'champion', kind: 'champion', rival: { tier: 5 }, name: 'Phòng Nhà vô địch', area: 'Liên đoàn Indigo', x: 590, y: 58, label: 'Nhà vô địch', playable: true,
      biome: 'champion-hall', levels: [59, 64], money: 10000, parTimeS: 190,
    },
    {
      id: 'cerulean-cave', kind: 'event', name: 'Hang Cerulean – Bí ẩn sâu thẳm', area: 'Hang Cerulean', x: 612, y: 96, label: 'Hang Cerulean', playable: true, biome: 'cerulean-cave',
      waves: [
        [...many('golbat', 60, 4), ...many('parasect', 60, 2), ...many('ditto', 60, 3)],
        [...many('electrode', 61, 3), ...many('magneton', 61, 3), ...many('kadabra', 61, 2)],
        [...many('rhydon', 62, 2), ...many('chansey', 62, 2), ...many('hypno', 62, 3), ...many('golem', 62, 2)],
        [...many('alakazam', 64, 2), ...many('ditto', 63, 3), s('rhydon', 66), A('mewtwo', 70)],
      ],
      catchable: ['mewtwo', 'ditto', 'chansey', 'kadabra', 'alakazam', 'golbat', 'parasect', 'electrode', 'magneton', 'hypno', 'rhydon', 'golem'],
      levels: [60, 70], money: 2500, ballsFirstClear: 5, parTimeS: 120,
    },
  ],

  // ================================================================== Tứ Thiên Vương
  gyms: {
    kanna: {
      id: 'kanna',
      city: 'Liên đoàn Indigo',
      title: 'Sảnh Pha Lê – Kanna',
      leader: 'Kanna',
      leaderSprite: 'kanna',
      badgeId: '',
      team: [
        { species: 'dewgong', level: 58 },
        { species: 'cloyster', level: 59 },
        { species: 'jynx', level: 60 },
        { species: 'lapras', level: 62, boss: true },
      ],
      intro: [
        'Kanna: Chào mừng tới Liên đoàn Indigo. Ta là Kanna của Tứ Thiên Vương — bậc thầy hệ Băng.',
        'Kanna: Sàn sảnh này trơn như mặt gương, còn từ trần thì mưa băng rơi không ngớt. Bước cho cẩn thận nhé.',
        'Kanna: Thứ gì Pokémon của ta chạm vào cũng sẽ đóng băng. Cậu sẵn sàng chưa?',
      ],
      sendOut: [
        'Kanna: Dewgong, trượt lên nào!',
        'Kanna: Cloyster, khép vỏ rồi bắn gai băng!',
        'Kanna: Jynx, hát cho chúng nghe một khúc thật lạnh!',
        'Kanna: Lapras, kết thúc bằng bão tuyết!',
      ],
      winLines: [
        'Kanna: Không ngờ... cậu đã làm tan băng của ta.',
        'Kanna: Đi tiếp đi. Nhưng ba người còn lại sẽ không dễ như ta đâu.',
      ],
      afterLines: ['Kanna: Hành lang phía trước dẫn tới Sảnh Đá của Shiba. Giữ ấm nhé.'],
    },
    shiba: {
      id: 'shiba',
      city: 'Liên đoàn Indigo',
      title: 'Sảnh Đá – Shiba',
      leader: 'Shiba',
      leaderSprite: 'shiba',
      badgeId: '',
      team: [
        { species: 'onix', level: 59 },
        { species: 'hitmonchan', level: 60 },
        { species: 'hitmonlee', level: 60 },
        { species: 'machamp', level: 62, boss: true },
      ],
      intro: [
        'Shiba: Ta là Shiba của Tứ Thiên Vương! Người và Pokémon cùng khổ luyện thì không gì cản nổi!',
        'Shiba: Sảnh Đá là nơi bọn ta tập luyện mỗi ngày. Đá vụn rơi từ trần xuống là chuyện thường!',
        'Shiba: Hự-ha! Thử đỡ đòn của ta xem nào!',
      ],
      sendOut: [
        'Shiba: Onix, nghiền nát chúng!',
        'Shiba: Hitmonchan, tung cú đấm!',
        'Shiba: Hitmonlee, đá bay hết!',
        'Shiba: Machamp! Bốn cánh tay — dồn toàn lực!',
      ],
      winLines: [
        'Shiba: Hự! Thua rồi sao... Cậu và Pokémon đã rèn luyện rất kỹ.',
        'Shiba: Đi đi. Kikuko đang đợi ở Sảnh U Linh.',
      ],
      afterLines: ['Shiba: Ta sẽ quay lại tập gấp đôi. Lần sau đừng mong thắng dễ!'],
    },
    kikuko: {
      id: 'kikuko',
      city: 'Liên đoàn Indigo',
      title: 'Sảnh U Linh – Kikuko',
      leader: 'Kikuko',
      leaderSprite: 'kikuko',
      badgeId: '',
      team: [
        { species: 'gengar', level: 59 },
        { species: 'golbat', level: 59 },
        { species: 'haunter', level: 60 },
        { species: 'arbok', level: 60 },
        { species: 'gengar', level: 63, boss: true },
      ],
      intro: [
        'Kikuko: Hừm... ta là Kikuko của Tứ Thiên Vương. Hồi trẻ ta cũng từng so tài với lão Okido đấy.',
        'Kikuko: Đèn ở Sảnh U Linh chẳng bao giờ sáng, còn bóng ma thì cứ rơi xuống như mưa. Cậu có thấy đường không, nhóc?',
        'Kikuko: Để bà già này dạy cho cậu biết một huấn luyện viên thực thụ chiến đấu ra sao!',
      ],
      sendOut: [
        'Kikuko: Gengar, ra đây chơi nào.',
        'Kikuko: Golbat, hút cạn sức chúng đi!',
        'Kikuko: Haunter, trêu chúng một chút!',
        'Kikuko: Arbok, trừng mắt cho chúng sợ!',
        'Kikuko: Gengar của ta... giờ mới là thật đấy!',
      ],
      winLines: [
        'Kikuko: Ôi chà... cậu khá lắm, nhóc ạ.',
        'Kikuko: Lão Okido có một đứa nhóc đáng gờm thật. Đi đi, người cuối cùng của Tứ Thiên Vương đang chờ.',
      ],
      afterLines: ['Kikuko: Đứng lâu trong bóng tối thì mắt cũng quen thôi. Hì hì...'],
    },
    wataru: {
      id: 'wataru',
      city: 'Liên đoàn Indigo',
      title: 'Sảnh Rồng – Wataru',
      leader: 'Wataru',
      leaderSprite: 'wataru',
      badgeId: '',
      team: [
        { species: 'gyarados', level: 60 },
        { species: 'dragonair', level: 60 },
        { species: 'dragonair', level: 60 },
        { species: 'aerodactyl', level: 61 },
        { species: 'dragonite', level: 64, boss: true },
      ],
      intro: [
        'Wataru: Ta là Wataru, người đứng đầu Tứ Thiên Vương — một Bậc thầy Rồng.',
        'Wataru: Rồng là Pokémon của truyền thuyết: khó bắt, khó thuần, nhưng sức mạnh của chúng vượt trên mọi loài.',
        'Wataru: Gió trong Sảnh Rồng sẽ quật cậu sang hai bên. Đứng vững được thì hãy chiến đấu!',
      ],
      sendOut: [
        'Wataru: Gyarados, nổi cơn thịnh nộ đi!',
        'Wataru: Dragonair, cuộn gió lên!',
        'Wataru: Dragonair thứ hai, tiếp tục!',
        'Wataru: Aerodactyl, xé gió mà lao tới!',
        'Wataru: Dragonite! Cho chúng thấy sức mạnh thật sự của loài rồng!',
      ],
      winLines: [
        'Wataru: ...Không thể tin nổi. Bầy rồng của ta đã gục ngã.',
        'Wataru: Cậu đã vượt qua cả Tứ Thiên Vương. Phía sau cánh cửa kia, Nhà vô địch đang chờ — và có lẽ cậu biết người đó là ai.',
      ],
      afterLines: ['Wataru: Đi đi. Thử thách cuối cùng đang ở ngay phía trước.'],
    },
  },

  // ================================================================== mẫu đòn boss
  bossPatterns: {
    // Lapras của Kanna: mưa mảnh băng, vòng gai băng
    lapras: { type: 'ice', dropTexture: 'iceshard', ringTexture: 'iceshard', ringCount: 18, ringSpeed: 180, glow: 0x98d8d8, impact: 'ice' },
    // Dragonite của Wataru: mưa lửa rồng, vòng long khí dày đặc
    dragonite: { type: 'dragon', dropTexture: 'dragonflame', ringTexture: 'dragonflame', ringCount: 20, ringSpeed: 200, glow: 0x7038f8, impact: 'flame' },
  },

  // ================================================================== bảng màu nhân vật
  trainerPalettes: {
    kanna: { skin: 0xf4cca8, hair: 0xc83a30, cap: null, shirt: 0x3a4aa0, shirtTrim: 0xe8f0ff, arms: 0xf4cca8, pants: 0x232848, shoes: 0x1a1a2a, hairStyle: 'long' },
    shiba: { skin: 0xc88a5a, hair: 0x1a1a1a, cap: null, shirt: 0xc88a5a, shirtTrim: 0x1a1a1a, arms: 0xc88a5a, pants: 0xeeeae0, shoes: 0xb07a4a, hairStyle: 'spiky' },
    kikuko: { skin: 0xe8c0a0, hair: 0xc8c8d4, cap: null, shirt: 0x6a4a8a, shirtTrim: 0xd8c8e8, arms: 0x6a4a8a, pants: 0x4a3a5a, shoes: 0x2a2030, hairStyle: 'long' },
    wataru: { skin: 0xf0c098, hair: 0xd83a30, cap: null, shirt: 0x283050, shirtTrim: 0xd8a030, arms: 0x283050, pants: 0x1a1e30, shoes: 0x3a2a20, hairStyle: 'spiky', bag: 0xb02030 },
  },
};
