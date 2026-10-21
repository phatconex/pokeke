// Chương 8: Nhà máy điện → Hội quán Viridian.
// Loài sở hữu: Rhyhorn, Rhydon (boss của Sakaki), Zapdos (huyền thoại ở Nhà máy điện).
import type { ChapterContent } from './types';
import { B, C, P } from '../moveKit';
import { A, many, s, sk } from '../kit';

export const CHAPTER: ChapterContent = {
  id: 'ch8',
  title: 'Chương 8 · Nhà máy điện → Hội quán Viridian',
  badgesAtStart: 7,

  // ================================================================ loài
  species: {
    rhyhorn: {
      dex: 111, name: 'Rhyhorn', types: ['ground', 'rock'], body: { w: 18, h: 11 }, fallbackColor: 0x9aa0a8, scale: 1.2,
      base: { hp: 128, atk: 68, speed: 88 },
      skills: sk('hornAttack', 'ch8_stomp', ['ch8_rockCharge', 30], ['hornDrill', 40]),
      evolution: { into: 'rhydon', level: 42 }, catchRate: 120,
      blurb: 'Da đá dày, cứ cắm đầu xông thẳng như xe tăng. Không sợ điện.',
    },
    rhydon: {
      dex: 112, name: 'Rhydon', types: ['ground', 'rock'], body: { w: 20, h: 13 }, fallbackColor: 0x8a8a94, scale: 1.45,
      base: { hp: 150, atk: 88, speed: 94 },
      skills: sk('hornAttack', 'ch8_stomp', ['ch8_rockCharge', 1], ['ch8_rockWrecker', 1]),
      catchRate: 60,
      blurb: 'Đứng thẳng trên hai chân, sừng khoan nghiền nát cả đá tảng. Ném đá như trời sập.',
    },
    zapdos: {
      dex: 145, name: 'Zapdos', types: ['electric', 'flying'], body: { w: 22, h: 14 }, fallbackColor: 0xf8d030, scale: 1.5,
      base: { hp: 130, atk: 135, speed: 165 },
      skills: sk('ch8_forkZ', 'ch8_blinkZ', ['ch8_stormZ', 1], ['ch8_gridZ', 1]),
      catchRate: 15,
      blurb: 'Chim sấm huyền thoại, làm tổ trong nhà máy điện bỏ hoang. Mỗi cú vỗ cánh tóe ra tia lửa điện.',
    },
  },

  // ================================================================ chiêu mới
  moves: {
    // ---- huyền thoại Zapdos (skills/kits.ts → TK.zapdos, data/legendary.ts): chớp phân nhánh · chớp dịch chuyển · mây bão · lưới điện ----
    ch8_forkZ: P({ id: 'ch8_forkZ', name: 'Chớp Phân Nhánh', type: 'electric', power: 14, cooldownMs: 380, sfx: 'zap', icon: 'bolt', speed: 400, lifeMs: 500, radius: 5, texture: 'zap', particle: 'spark', knockback: 40, archetype: 'forkbolt',
      status: { kind: 'paralyze', chance: 0.15, ms: 1200 }, desc: 'Sét zic-zắc tức thời nhảy qua 3 địch gần nhất, mỗi mắt xích rẽ nhánh nhỏ. 15% Tê liệt.' }),
    ch8_blinkZ: C({ id: 'ch8_blinkZ', name: 'Chớp Dịch Chuyển', type: 'electric', power: 24, cooldownMs: 2800, sfx: 'zap', icon: 'bolt', range: 190, halfAngleDeg: 30, particle: 'spark', knockback: 120, archetype: 'blink',
      status: { kind: 'paralyze', chance: 0.4, ms: 1500 }, desc: 'Dịch chuyển xuyên địch (bất tử, 3 ảo ảnh), để lại vệt sét; kết thúc bằng một tiếng sấm nổ. 40% Tê liệt.' }),
    ch8_stormZ: B({ id: 'ch8_stormZ', name: 'Mây Bão', type: 'electric', power: 30, cooldownMs: 4200, sfx: 'thunder', icon: 'bolt', anim: 'charge', animMs: 380, burstRadius: 70, atTarget: true, particle: 'spark', knockback: 80, archetype: 'stormcloud',
      status: { kind: 'paralyze', chance: 0.25, ms: 1500 }, desc: 'Mây đen hình thành trên đầu địch, giáng sét liên tục 3 giây xuống quanh khu vực (có vạch báo).' }),
    ch8_gridZ: B({ id: 'ch8_gridZ', name: 'Lưới Điện', type: 'electric', power: 28, cooldownMs: 4800, sfx: 'thunder', icon: 'bolt', anim: 'charge', animMs: 380, burstRadius: 80, atTarget: true, particle: 'spark', knockback: 0, archetype: 'powergrid',
      status: { kind: 'paralyze', chance: 1, ms: 1500 }, desc: 'Cắm 4 cọc sét nối nhau bằng dây điện thành lưới đa giác: địch trong lưới bị Tê liệt và giật liên tục.' }),
    ch8_stomp: B({
      id: 'ch8_stomp', name: 'Giậm Chân', type: 'ground', power: 18, cooldownMs: 1500, sfx: 'hit', icon: 'rock', anim: 'attack', animMs: 300,
      burstRadius: 64, particle: 'dustpuff', knockback: 130,
      status: { kind: 'paralyze', chance: 0.35, ms: 700 },
      desc: 'Giậm mạnh xuống đất: hất văng mọi địch trong bán kính 64px, 35% làm chúng khựng lại.',
    }),
    ch8_rockCharge: C({
      id: 'ch8_rockCharge', name: 'Xung Phong Đá', type: 'rock', power: 26, cooldownMs: 1800, sfx: 'dash', icon: 'horn',
      range: 54, halfAngleDeg: 50, particle: 'dustpuff', knockback: 300, lunge: 110, crit: 0.25,
      desc: 'Cúi sừng xông thẳng 110px như xe tăng (không bị trúng đòn khi lao), hất văng cả đám trước mặt. 25% Chí mạng.',
    }),
    ch8_rockWrecker: P({
      id: 'ch8_rockWrecker', name: 'Phá Đá Tảng', type: 'rock', power: 50, cooldownMs: 5600, sfx: 'hit', icon: 'rock', anim: 'charge', animMs: 360,
      windupMs: 650, speed: 230, lifeMs: 1100, radius: 8, texture: 'boulder', spin: 6, particle: 'dustpuff', knockback: 280,
      explode: 72,
      desc: 'Gồng 0,65 giây rồi ném tảng đá khổng lồ, vỡ tung gây sát thương cả vùng rộng 72px.',
    }),
    ch8_chargeBeam: P({
      id: 'ch8_chargeBeam', name: 'Tia Tích Điện', type: 'electric', power: 11, cooldownMs: 300, sfx: 'zap', icon: 'bolt',
      speed: 470, lifeMs: 600, texture: 'zap', particle: 'zappuff', knockback: 40, pierce: true,
      status: { kind: 'paralyze', chance: 0.12, ms: 600 },
      desc: 'Tia điện cực nhanh xuyên qua cả hàng địch. 12% gây Tê liệt.',
    }),
    ch8_discharge: B({
      id: 'ch8_discharge', name: 'Phóng Điện', type: 'electric', power: 30, cooldownMs: 3400, sfx: 'thunder', icon: 'bolt',
      burstRadius: 104, particle: 'zappuff', knockback: 180,
      status: { kind: 'paralyze', chance: 0.45, ms: 1000 },
      desc: 'Xả điện ra mọi hướng, trúng tất cả địch trong bán kính 104px. 45% gây Tê liệt.',
    }),
    ch8_zapCannon: P({
      id: 'ch8_zapCannon', name: 'Pháo Điện Từ', type: 'electric', power: 54, cooldownMs: 6400, sfx: 'thunder', icon: 'bolt', anim: 'charge', animMs: 380,
      windupMs: 700, speed: 210, lifeMs: 1700, radius: 8, texture: 'zap', spin: 10, particle: 'zappuff', knockback: 220,
      homing: 3.5, explode: 64, status: { kind: 'paralyze', chance: 1, ms: 1500 },
      desc: 'Gồng 0,7 giây rồi bắn quả cầu điện tự dò mục tiêu, nổ vùng 64px và chắc chắn gây Tê liệt.',
    }),
  },

  // ================================================================ chỉ số khi làm đối thủ
  enemyStats: {
    rhyhorn: { hp: 64, speed: 96, contactDamage: 16, xp: 9, behavior: 'rusher' },
    rhydon: { hp: 88, speed: 78, contactDamage: 20, xp: 13, behavior: 'tank', bossHp: 500 },
    zapdos: {
      hp: 82, speed: 118, contactDamage: 16, xp: 14, behavior: 'ranged',
      rangedDamage: 18, rangedCooldownMs: 1400, rangedTelegraphMs: 450, rangedProjectileSpeed: 260, preferredRange: 170, rangedTexture: 'zap',
    },
  },

  bossPatterns: {
    // Rhydon của Sakaki: mưa đá tảng, vòng đá văng, lao húc bằng sừng khoan
    rhydon: { type: 'rock', dropTexture: 'boulder', ringTexture: 'rockball', ringCount: 18, ringSpeed: 185, glow: 0xc8a060, impact: 'dust' },
  },

  // ================================================================ nút bản đồ
  stages: [
    {
      id: 'power-plant', kind: 'event', name: 'Nhà máy điện bỏ hoang', area: 'Nhà máy điện', x: 216, y: 184, playable: true, biome: 'power-plant',
      waves: [
        [...many('voltorb', 46, 4), ...many('magnemite', 46, 4)],
        [...many('magneton', 47, 3), ...many('electrode', 47, 2), ...many('pikachu', 47, 3)],
        [...many('raichu', 48, 2), ...many('magneton', 48, 2), ...many('electrode', 48, 2), s('magnemite', 48)],
        [A('zapdos', 50), s('magneton', 48), s('electrode', 48)],
      ],
      catchable: ['zapdos', 'voltorb', 'electrode', 'magnemite', 'magneton', 'pikachu', 'raichu'],
      levels: [46, 50], money: 1150, ballsFirstClear: 3, parTimeS: 115,
      itemFirstClear: { item: 'thunderStone', name: 'Đá Sấm' },
    },
    {
      id: 'route22', kind: 'stage', name: 'Đường 22 – Lối về Viridian', area: 'Đường 22', x: 206, y: 212, playable: true, biome: 'forest',
      waves: [
        [...many('nidorino', 47, 3), ...many('nidorina', 47, 3), ...many('fearow', 47, 2)],
        [...many('rhyhorn', 47, 4), ...many('primeape', 48, 3)],
        [...many('sandslash', 48, 3), ...many('dugtrio', 48, 2), ...many('fearow', 48, 3)],
        [...many('rhyhorn', 49, 3), ...many('nidorino', 49, 2), ...many('nidorina', 49, 2), s('primeape', 49)],
        [...many('rhyhorn', 50, 3), ...many('fearow', 50, 3), A('rhyhorn', 51)],
      ],
      catchable: ['rhyhorn', 'nidorino', 'nidorina', 'fearow', 'primeape', 'sandslash', 'dugtrio'],
      levels: [47, 51], money: 1220, ballsFirstClear: 2, parTimeS: 135,
    },
    {
      id: 'gym-viridian', kind: 'gym', name: 'Hội quán Viridian', area: 'Viridian', x: 190, y: 200, label: 'Viridian', playable: true,
      biome: 'gym-viridian', gymId: 'viridian', levels: [50, 54], money: 5200, parTimeS: 185,
    },
  ],

  // ================================================================ hội quán
  gyms: {
    viridian: {
      id: 'viridian',
      city: 'Thành phố Viridian',
      title: 'Hội quán Viridian',
      leader: 'Sakaki',
      leaderSprite: 'sakaki',
      badgeId: 'earth',
      team: [
        { species: 'dugtrio', level: 50 },
        { species: 'nidoqueen', level: 50 },
        { species: 'nidoking', level: 51 },
        { species: 'rhydon', level: 54, boss: true },
      ],
      // hội quán động: 3 con bốc từ kho (khác loài), rồi át chủ bài
      pool: [
        { species: 'dugtrio', level: 50 },
        { species: 'nidoqueen', level: 50 },
        { species: 'nidoking', level: 51 },
        { species: 'rhyhorn', level: 50 },
        { species: 'golem', level: 51 },
        { species: 'sandslash', level: 50 },
        { species: 'marowak', level: 50 },
      ],
      pick: 3,
      ace: { species: 'rhydon', level: 54, boss: true },
      tuning: { attackSpeed: 1.2, aceHp: 0.45, aceDmg: 0.85 },
      intro: [
        'Sakaki: Cuối cùng cậu cũng tìm đến đây. Ta là Sakaki, thủ lĩnh Hội quán Viridian.',
        'Sakaki: Ở tòa nhà Silph, cậu đã phá hỏng kế hoạch của Đội Hỏa Tiễn. Hôm nay ta đứng đây với tư cách thủ lĩnh, và ta sẽ không nương tay.',
        'Sakaki: Đá sẽ trút xuống từ trần, cát lún sẽ níu chân cậu. Muốn có Huy hiệu Đất thì hãy đứng cho vững!',
      ],
      sendOut: [
        'Sakaki: Dugtrio, chui xuống và chờ thời cơ!',
        'Sakaki: Nidoqueen, nghiền nát chúng đi!',
        'Sakaki: Nidoking, cho chúng thấy sức mạnh của mặt đất!',
        'Sakaki: Rhydon! Kết thúc trận này!',
      ],
      winLines: [
        'Sakaki: Hừ... Ta thua rồi. Sức mạnh của cậu là thật.',
        'Sakaki: Đây là Huy hiệu Đất, huy hiệu thứ tám. Liên đoàn Indigo đang chờ cậu ở cuối Đường Chiến Thắng.',
        'Sakaki: Cầm luôn Đá Trăng này. Còn Đội Hỏa Tiễn... kể từ hôm nay sẽ giải tán. Ta cần thời gian để tự rèn luyện lại.',
      ],
      afterLines: ['Sakaki: Rồi sẽ có ngày ta quay lại, mạnh hơn bây giờ. Đi đi, Liên đoàn đang chờ cậu đấy.'],
      reward: { item: 'moonStone', name: 'Đá Trăng' },
    },
  },
  badges: {
    earth: { id: 'earth', name: 'Huy hiệu Đất', texture: 'badge-earth' },
  },
  trainerPalettes: {
    // vest nâu cam, tóc đen vuốt gọn, giày da đen
    sakaki: {
      skin: 0xf0c098, hair: 0x1c1a22, cap: null, shirt: 0xb8642a, shirtTrim: 0x2a2228, arms: 0xb8642a,
      pants: 0x6a3a1c, shoes: 0x1a1414, hairStyle: 'spiky',
    },
  },
};
