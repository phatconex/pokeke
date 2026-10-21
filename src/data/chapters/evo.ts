// Dạng tiến hóa của các loài chương 1–3 (không có ải riêng).
// Mỗi dạng tiến hóa giữ phần lớn bộ chiêu của dạng trước và có thêm một chiêu U mạnh mang cá tính riêng.
import type { ChapterContent } from './types';
import { B, C, P, type MoveDef } from '../moveKit';
import { sk } from '../kit';

// ======================================================================= chiêu mới (tiền tố evo_)
const moves: Record<string, MoveDef> = {
  // ---- bộ ba khởi đầu
  evo_solarBeam: C({ id: 'evo_solarBeam', name: 'Tia Mặt Trời', type: 'grass', power: 58, cooldownMs: 5200, windupMs: 900, sfx: 'thunder', icon: 'sparkle',
    anim: 'shoot', animMs: 360, sprayMs: 300, moveSlow: 0.3, particle: 'leafpuff', knockback: 260, line: 230, lineWidth: 30,
    desc: 'Gồng 0,9 giây hấp thụ nắng rồi bắn tia sáng thẳng tắp dài 230px, trúng mọi địch trên đường.' }),
  evo_skyDive: C({ id: 'evo_skyDive', name: 'Bổ Nhào', type: 'flying', power: 28, cooldownMs: 1800, sfx: 'dash', icon: 'wing', range: 52, halfAngleDeg: 65, sprayMs: 200,
    particle: 'windpuff', knockback: 250, lunge: 130,
    desc: 'Sải cánh bổ nhào xa tới 130px (không bị trúng đòn khi lao) rồi quạt cánh quét rộng, hất văng cả đám.' }),
  evo_fireBlast: P({ id: 'evo_fireBlast', name: 'Đại Hỏa', type: 'fire', power: 54, cooldownMs: 5200, windupMs: 600, sfx: 'flame', icon: 'flame', anim: 'shoot', animMs: 340,
    speed: 250, lifeMs: 900, radius: 9, texture: 'fireball', particle: 'flamepuff', knockback: 280, explode: 84,
    status: { kind: 'burn', chance: 0.7, ms: 3500 }, desc: 'Gồng 0,6 giây rồi phóng quả cầu lửa khổng lồ, nổ tung cả vùng rất rộng. 70% gây Bỏng.' }),
  evo_hydroPump: P({ id: 'evo_hydroPump', name: 'Bơm Thủy Lực', type: 'water', power: 40, cooldownMs: 4800, windupMs: 700, sfx: 'water', icon: 'drop', anim: 'shoot', animMs: 360,
    speed: 480, lifeMs: 700, radius: 8, count: 2, spreadDeg: 6, texture: 'bubble', particle: 'bubblepuff', knockback: 380, pierce: true,
    desc: 'Gồng 0,7 giây, hai khẩu pháo trên mai phun hai cột nước xuyên thấu, đẩy văng mọi địch trên đường.' }),

  // ---- bọ
  evo_silverWind: P({ id: 'evo_silverWind', name: 'Gió Bạc', type: 'bug', power: 9, cooldownMs: 520, sfx: 'dash', icon: 'wind', speed: 300, lifeMs: 900, radius: 6,
    texture: 'wind', spin: 10, particle: 'spark', knockback: 90, pierce: true,
    desc: 'Cơn gió lấp lánh phấn bạc bay xuyên qua cả hàng địch, đẩy lùi nhẹ.' }),
  evo_sleepPowder: B({ id: 'evo_sleepPowder', name: 'Phấn Ngủ', type: 'grass', power: 2, cooldownMs: 4200, sfx: 'leaf', knockback: 0, icon: 'cloud', particle: 'psypuff',
    atTarget: true, zone: { radius: 52, ms: 3000, tickMs: 500 }, status: { kind: 'sleep', chance: 0.4, ms: 2500 },
    desc: 'Rắc mây phấn ngủ tại chỗ địch (3 giây): địch trong mây dễ Ngủ say, đòn đầu tiên đánh thức nó gây ×1,5.' }),
  evo_bugBuzz: B({ id: 'evo_bugBuzz', name: 'Tiếng Vo Ve', type: 'bug', power: 30, cooldownMs: 3600, sfx: 'zap', knockback: 200, icon: 'wave', burstRadius: 105, particle: 'leafpuff',
    status: { kind: 'confuse', chance: 0.35, ms: 1800 }, desc: 'Đập cánh tạo sóng âm vo ve lan rộng quanh người (bán kính 105px). 35% gây Rối loạn.' }),
  evo_twineedle: C({ id: 'evo_twineedle', name: 'Kim Đôi', type: 'bug', power: 13, cooldownMs: 750, sfx: 'whip', icon: 'horn', range: 42, halfAngleDeg: 35, particle: 'poisonpuff',
    knockback: 90, lunge: 40, hits: 2, hitGapMs: 110, status: { kind: 'poison', chance: 0.3, ms: 3000 },
    desc: 'Lao tới đâm hai kim liên tiếp. Mỗi kim 30% gây Nhiễm độc.' }),
  evo_pinMissile: P({ id: 'evo_pinMissile', name: 'Mưa Kim', type: 'bug', power: 10, cooldownMs: 2400, sfx: 'zap', icon: 'sword', speed: 420, lifeMs: 700, count: 5, spreadDeg: 9,
    texture: 'needle', particle: 'poisonpuff', knockback: 50, homing: 4, crit: 0.2,
    desc: 'Phóng 5 cây kim tự lượn theo địch. Mỗi kim 20% Chí mạng.' }),
  evo_spore: B({ id: 'evo_spore', name: 'Bào Tử Ký Sinh', type: 'grass', power: 3, cooldownMs: 3800, sfx: 'leaf', knockback: 0, icon: 'cloud', particle: 'leafpuff', slow: 0.6,
    atTarget: true, zone: { radius: 56, ms: 3600, tickMs: 450 }, status: { kind: 'seed', chance: 0.5, ms: 4000 },
    desc: 'Cây nấm trên lưng phun mây bào tử tại chỗ địch: địch trong mây chậm lại và dễ bị ký sinh (mất máu dần, máu đó hồi cho bạn).' }),
  evo_xScissor: C({ id: 'evo_xScissor', name: 'Kéo Chữ X', type: 'bug', power: 24, cooldownMs: 1900, sfx: 'whip', icon: 'claw', range: 50, halfAngleDeg: 50, particle: 'leafpuff',
    knockback: 200, lunge: 50, hits: 2, hitGapMs: 140, crit: 0.35,
    desc: 'Lao tới cắt chéo hai càng thành hình chữ X: 2 nhát, mỗi nhát 35% Chí mạng.' }),

  // ---- chim
  evo_hurricane: P({ id: 'evo_hurricane', name: 'Cuồng Phong', type: 'flying', power: 34, cooldownMs: 4600, windupMs: 500, sfx: 'dash', icon: 'whirl', anim: 'shoot', animMs: 340,
    speed: 210, lifeMs: 1600, radius: 12, texture: 'wind', spin: 24, particle: 'windpuff', knockback: 340, pierce: true,
    status: { kind: 'confuse', chance: 0.4, ms: 1800 }, desc: 'Gồng 0,5 giây rồi thả cơn lốc khổng lồ trôi chậm, xuyên cả đám và hất văng địch. 40% gây Rối loạn.' }),

  // ---- nước
  evo_aquaJet: C({ id: 'evo_aquaJet', name: 'Phóng Thủy', type: 'water', power: 18, cooldownMs: 1100, sfx: 'water', icon: 'play', range: 44, halfAngleDeg: 45, particle: 'bubblepuff',
    knockback: 200, lunge: 110, desc: 'Phóng mình như mũi tên nước lao tới 110px (không bị trúng đòn khi lao) rồi húc mạnh.' }),
  evo_surf: B({ id: 'evo_surf', name: 'Lướt Sóng', type: 'water', power: 34, cooldownMs: 4400, sfx: 'water', knockback: 300, icon: 'wave', burstRadius: 115, particle: 'bubblepuff',
    slow: 0.5, desc: 'Gọi con sóng lớn cuộn quanh người (bán kính 115px), đẩy văng và làm chậm mọi địch dính sóng.' }),

  // ---- đá
  evo_rockSlide: P({ id: 'evo_rockSlide', name: 'Lở Đá', type: 'rock', power: 18, cooldownMs: 2600, sfx: 'hit', icon: 'rock', speed: 250, lifeMs: 750, radius: 7, count: 3, spreadDeg: 16,
    texture: 'boulder', particle: 'dustpuff', knockback: 160, explode: 36, status: { kind: 'paralyze', chance: 0.3, ms: 700 },
    desc: 'Ném 3 tảng đá lớn tỏa hình quạt, mỗi tảng vỡ tung theo vùng. 30% làm địch khựng lại.' }),
  evo_boulderCrash: C({ id: 'evo_boulderCrash', name: 'Lăn Tảng Đá', type: 'rock', power: 48, cooldownMs: 4400, windupMs: 450, sfx: 'dash', icon: 'rock', range: 54, halfAngleDeg: 60,
    particle: 'dustpuff', knockback: 360, lunge: 150, status: { kind: 'paralyze', chance: 0.5, ms: 900 },
    desc: 'Gồng 0,45 giây, cuộn tròn lăn ầm ầm tới 150px (không bị trúng đòn khi lăn) rồi nghiền nát cả vùng trước mặt. 50% gây choáng.' }),
  evo_explosion: B({ id: 'evo_explosion', name: 'Đại Bùng Nổ', type: 'normal', power: 95, cooldownMs: 8000, windupMs: 500, sfx: 'thunder', knockback: 360, icon: 'skull',
    burstRadius: 135, particle: 'flamepuff', selfCost: 0.6,
    desc: 'Gồng 0,5 giây rồi nổ tung cực lớn quanh người (bán kính 135px), nhưng tự mất 60% máu hiện tại (không bao giờ tự gục).' }),

  // ---- thường / giác đấu
  evo_powerGem: P({ id: 'evo_powerGem', name: 'Ngọc Quyền Năng', type: 'rock', power: 30, cooldownMs: 2600, sfx: 'pickup', icon: 'sparkle', speed: 460, lifeMs: 700, radius: 6,
    texture: 'starshot', spin: 8, particle: 'spark', knockback: 150, pierce: true, crit: 0.3, money: 3,
    desc: 'Viên ngọc trên trán bắn tia sáng xuyên thấu (30% Chí mạng); mỗi địch trúng rơi thêm 3₽.' }),
  evo_thrash: C({ id: 'evo_thrash', name: 'Nổi Điên', type: 'fighting', power: 14, cooldownMs: 2600, sfx: 'dash', icon: 'fist', range: 48, halfAngleDeg: 60, particle: 'dustpuff',
    knockback: 120, lunge: 60, randomHits: [3, 6], hitGapMs: 100, crit: 0.2,
    desc: 'Nổi điên lao tới 60px rồi đấm đá loạn xạ 3–6 đòn quét rộng. Mỗi đòn 20% Chí mạng.' }),

  // ---- siêu linh
  // ---- hệ Siêu linh, bộ chiêu mới cho Alakazam (xem skills/kits.ts → TYPE_KITS.psychic) ----
  evo_psyBeamN3: C({ id: 'evo_psyBeamN3', name: 'Tia Siêu Linh Lớn', type: 'psychic', power: 34, cooldownMs: 3400, sfx: 'swap', icon: 'spiral', anim: 'shoot', animMs: 380, line: 210, lineWidth: 28, sprayMs: 640, moveSlow: 0.3,
    particle: 'psypuff', knockback: 80, status: { kind: 'confuse', chance: 0.35, ms: 1800 }, archetype: 'stream', desc: 'Ngắm rồi bắn tia sóng ý nghĩ đổi màu xanh-tím-hồng, dày và dài, xuyên mọi địch. 35% gây Rối loạn.' }),
  evo_psyStrikeN3: B({ id: 'evo_psyStrikeN3', name: 'Cú Đánh Siêu Linh', type: 'psychic', power: 50, cooldownMs: 4800, sfx: 'thunder', icon: 'eye', anim: 'charge', animMs: 480, burstRadius: 66, atTarget: true, particle: 'psypuff', knockback: 300,
    status: { kind: 'confuse', chance: 0.5, ms: 2000 }, archetype: 'blast', desc: 'Khóa mục tiêu, ném quả cầu tinh thể có gai nổ thành các vòng sóng ý nghĩ và sao 6 cánh. 50% gây Rối loạn.' }),
  evo_spoonBend: P({ id: 'evo_spoonBend', name: 'Thìa Bay', type: 'psychic', power: 13, cooldownMs: 900, sfx: 'swap', icon: 'spiral', speed: 320, lifeMs: 1200, count: 2, spreadDeg: 20,
    texture: 'psyball', spin: 20, particle: 'psypuff', knockback: 60, boomerang: true, pierce: true, status: { kind: 'confuse', chance: 0.2, ms: 1400 },
    desc: 'Bẻ cong 2 chiếc thìa bằng ý niệm: thìa bay ra rồi quay về như boomerang, xuyên địch. 20% gây Rối loạn.' }),
  evo_psychic: P({ id: 'evo_psychic', name: 'Siêu Năng Lực', type: 'psychic', power: 44, cooldownMs: 4800, windupMs: 500, sfx: 'thunder', icon: 'eye', anim: 'shoot', animMs: 340,
    speed: 300, lifeMs: 900, radius: 9, texture: 'psyball', particle: 'psypuff', knockback: 260, pierce: true, explode: 64,
    status: { kind: 'confuse', chance: 0.6, ms: 2200 }, desc: 'Gồng 0,5 giây rồi phóng khối siêu linh xuyên thấu, nổ thành sóng ở mỗi địch trúng. 60% gây Rối loạn.' }),
  evo_dreamEater: B({ id: 'evo_dreamEater', name: 'Ăn Giấc Mơ', type: 'psychic', power: 30, cooldownMs: 3400, sfx: 'swap', knockback: 120, icon: 'eye', burstRadius: 90, particle: 'psypuff',
    drain: 0.6, desc: 'Nuốt giấc mơ của địch quanh người (bán kính 90px), hồi máu bằng 60% sát thương. Địch đang Ngủ chịu ×1,5.' }),

  // ---- cỏ / độc
  evo_acidSpray: C({ id: 'evo_acidSpray', name: 'Phun Axit', type: 'poison', power: 18, cooldownMs: 2300, sfx: 'leaf', icon: 'skull', anim: 'shoot', animMs: 360, range: 92, halfAngleDeg: 32,
    sprayMs: 380, moveSlow: 0.4, particle: 'poisonpuff', knockback: 110, slow: 0.6, status: { kind: 'poison', chance: 0.5, ms: 3500 },
    desc: 'Phun axit hình quạt tầm xa: làm chậm địch và 50% gây Nhiễm độc.' }),
  evo_gulp: C({ id: 'evo_gulp', name: 'Nuốt Chửng', type: 'grass', power: 28, cooldownMs: 2200, sfx: 'whip', icon: 'fang', range: 46, halfAngleDeg: 35, particle: 'leafpuff',
    knockback: 60, lunge: 40, drain: 0.5, status: { kind: 'paralyze', chance: 1, ms: 1100 },
    desc: 'Lao tới đớp địch vào miệng bình: giữ chặt 1,1 giây và hồi máu bằng 50% sát thương.' }),
  evo_leafStorm: P({ id: 'evo_leafStorm', name: 'Bão Lá', type: 'grass', power: 14, cooldownMs: 4000, sfx: 'leaf', icon: 'leaf', anim: 'shoot', animMs: 320, speed: 360, lifeMs: 800,
    count: 7, spreadDeg: 10, texture: 'leaf', spin: 18, particle: 'leafpuff', knockback: 120, pierce: true, crit: 0.2,
    desc: 'Thổi bão 7 lá sắc tỏa hình quạt rộng, xuyên qua mọi địch. Mỗi lá 20% Chí mạng.' }),
  evo_megaDrain: P({ id: 'evo_megaDrain', name: 'Hút Cạn', type: 'grass', power: 12, cooldownMs: 520, sfx: 'leaf', icon: 'heart', speed: 310, lifeMs: 900, count: 2, spreadDeg: 10,
    texture: 'seed', particle: 'leafpuff', homing: 3, drain: 0.7,
    desc: 'Bắn 2 hạt hút sinh lực tự lượn theo địch, hồi máu bằng 70% sát thương.' }),
  evo_petalDance: B({ id: 'evo_petalDance', name: 'Vũ Điệu Cánh Hoa', type: 'grass', power: 9, cooldownMs: 4200, anim: 'attack', animMs: 320, sfx: 'leaf', knockback: 170, icon: 'sparkle',
    burstRadius: 54, particle: 'leafpuff', spinMs: 2000,
    desc: 'Xoay tròn trong bão cánh hoa 2 giây: chạy nhanh hơn, cánh hoa sắc chém liên tục mọi địch trong vòng 54px.' }),

  // ---- điện
  evo_discharge: B({ id: 'evo_discharge', name: 'Phóng Điện', type: 'electric', power: 26, cooldownMs: 3200, sfx: 'thunder', knockback: 170, icon: 'bolt', burstRadius: 95, particle: 'zappuff',
    status: { kind: 'paralyze', chance: 0.35, ms: 900 }, desc: 'Xả điện ra mọi hướng quanh người (bán kính 95px). 35% gây Tê liệt.' }),
  evo_zapCannon: P({ id: 'evo_zapCannon', name: 'Pháo Điện Từ', type: 'electric', power: 48, cooldownMs: 5000, windupMs: 650, sfx: 'thunder', icon: 'bolt', anim: 'shoot', animMs: 340,
    speed: 190, lifeMs: 1300, radius: 10, texture: 'zap', particle: 'zappuff', knockback: 220, homing: 2, explode: 60,
    status: { kind: 'paralyze', chance: 1, ms: 1300 },
    desc: 'Gồng 0,65 giây, ba nam châm hợp lực bắn quả cầu điện chậm tự lượn theo địch, nổ vùng và chắc chắn gây Tê liệt.' }),
};

// ======================================================================= loài
const species: ChapterContent['species'] = {
  venusaur: {
    dex: 3, name: 'Venusaur', types: ['grass', 'poison'], body: { w: 20, h: 13 }, fallbackColor: 0x4aa070, scale: 1.3,
    base: { hp: 150, atk: 78, speed: 110 }, skills: sk('seedBombG3', 'vineSlamG3', ['solarBeamG3', 10], ['frenzyPlantG3', 32]), catchRate: 45,
    blurb: 'Bông hoa khổng lồ trên lưng hút nắng để bắn Tia Mặt Trời xuyên cả sân.',
  },
  charizard: {
    dex: 6, name: 'Charizard', types: ['fire', 'flying'], body: { w: 18, h: 12 }, fallbackColor: 0xf07830, scale: 1.2,
    base: { hp: 136, atk: 86, speed: 130 }, skills: sk('emberF3', 'seismicTossF3', ['flamethrowerF3', 10], ['fireMeteorF3', 36]), catchRate: 45,
    blurb: 'Bay lượn bổ nhào khắp sân, phun Đại Hỏa thiêu rụi cả vùng.',
  },
  blastoise: {
    dex: 9, name: 'Blastoise', types: ['water'], body: { w: 19, h: 13 }, fallbackColor: 0x4a70c0, scale: 1.3,
    base: { hp: 146, atk: 76, speed: 112 }, skills: sk('waterGunS', 'rapidSpinS', ['hydroPumpS', 10], ['surfS', 16]), catchRate: 45,
    blurb: 'Pháo đài di động: hai khẩu pháo nước đẩy văng mọi thứ chắn đường.',
  },
  butterfree: {
    dex: 12, name: 'Butterfree', types: ['bug', 'flying'], body: { w: 14, h: 10 }, fallbackColor: 0x9a8ad0,
    base: { hp: 106, atk: 58, speed: 118 }, skills: sk('evo_silverWind', 'stringShot', ['evo_sleepPowder', 12], ['evo_bugBuzz', 18]), catchRate: 45,
    blurb: 'Rắc phấn ru ngủ và trói chân địch – giỏi khống chế đám đông.',
  },
  beedrill: {
    dex: 15, name: 'Beedrill', types: ['bug', 'poison'], body: { w: 15, h: 10 }, fallbackColor: 0xe0c040,
    base: { hp: 104, atk: 72, speed: 132 }, skills: sk('poisonSting', 'evo_twineedle', ['furyAttack', 12], ['evo_pinMissile', 18]), catchRate: 45,
    blurb: 'Sát thủ tốc độ: lao vào chích kim đôi rồi rút ra bắn mưa kim.',
  },
  pidgeot: {
    dex: 18, name: 'Pidgeot', types: ['normal', 'flying'], body: { w: 18, h: 12 }, fallbackColor: 0xc89860, scale: 1.2,
    base: { hp: 128, atk: 72, speed: 140 }, skills: sk('gust', 'quickAttack', ['wingAttack', 12], ['evo_hurricane', 36]), catchRate: 45,
  },
  golduck: {
    dex: 55, name: 'Golduck', types: ['water'], body: { w: 16, h: 11 }, fallbackColor: 0x4a90d0,
    base: { hp: 128, atk: 74, speed: 118 }, skills: sk('waterGun', 'evo_aquaJet', ['confusion', 14], ['evo_surf', 33]), catchRate: 75,
    blurb: 'Bơi nhanh như tên bắn, viên ngọc trên trán phát sóng siêu linh.',
  },
  graveler: {
    dex: 75, name: 'Graveler', types: ['rock', 'ground'], body: { w: 20, h: 13 }, fallbackColor: 0x8a8478,
    base: { hp: 136, atk: 74, speed: 86 }, skills: sk('rockThrow', 'rollout', ['magnitude', 25], ['evo_rockSlide', 30]),
    evolution: { into: 'golem', level: 40 }, catchRate: 120,
  },
  golem: {
    dex: 76, name: 'Golem', types: ['rock', 'ground'], body: { w: 22, h: 15 }, fallbackColor: 0x7a7a60, scale: 1.3,
    base: { hp: 150, atk: 88, speed: 88 }, skills: sk('rockThrow', 'rollout', ['evo_rockSlide', 1], ['evo_boulderCrash', 40]), catchRate: 45,
    blurb: 'Lớp vỏ đá cứng như thép – cuộn tròn lăn qua là san phẳng cả đám.',
  },
  persian: {
    dex: 53, name: 'Persian', types: ['normal'], body: { w: 17, h: 11 }, fallbackColor: 0xf0d8a0,
    base: { hp: 112, atk: 70, speed: 142 }, skills: sk('payDay', 'bite', ['slash', 20], ['evo_powerGem', 32]), catchRate: 90,
    blurb: 'Kiêu kỳ và nhanh nhẹn; viên ngọc trên trán vừa bắn vừa kiếm thêm tiền.',
  },
  primeape: {
    dex: 57, name: 'Primeape', types: ['fighting'], body: { w: 16, h: 11 }, fallbackColor: 0xe8c8a0,
    base: { hp: 112, atk: 86, speed: 132 }, skills: sk('karateChop', 'lowKick', ['crossChop', 16], ['evo_thrash', 32]), catchRate: 75,
  },
  kadabra: {
    dex: 64, name: 'Kadabra', types: ['psychic'], body: { w: 14, h: 10 }, fallbackColor: 0xd8b040,
    base: { hp: 94, atk: 82, speed: 122 }, skills: sk('psybeam', 'teleport', ['confusion', 14], ['evo_spoonBend', 22]),
    evolution: { into: 'alakazam', level: 36 }, catchRate: 100,
  },
  alakazam: {
    dex: 65, name: 'Alakazam', types: ['psychic'], body: { w: 15, h: 11 }, fallbackColor: 0xd8a830, scale: 1.2,
    base: { hp: 108, atk: 90, speed: 128 }, skills: sk('psybeam', 'teleport', ['evo_psyBeamN3', 1], ['evo_psyStrikeN3', 36]), catchRate: 50,
    blurb: 'Trí tuệ siêu phàm: dịch chuyển né đòn và bẻ cong thìa thành vũ khí.',
  },
  weepinbell: {
    dex: 70, name: 'Weepinbell', types: ['grass', 'poison'], body: { w: 14, h: 10 }, fallbackColor: 0xd0d050,
    base: { hp: 114, atk: 68, speed: 100 }, skills: sk('acid', 'wrap', ['vineWhip', 12], ['evo_acidSpray', 24]),
    evolution: { into: 'victreebel', item: 'leafStone' }, catchRate: 120,
  },
  victreebel: {
    dex: 71, name: 'Victreebel', types: ['grass', 'poison'], body: { w: 17, h: 12 }, fallbackColor: 0xc0c840, scale: 1.2,
    base: { hp: 134, atk: 82, speed: 104 }, skills: sk('acid', 'evo_gulp', ['evo_acidSpray', 1], ['evo_leafStorm', 1]), catchRate: 45,
    blurb: 'Cây nắp ấm háu ăn: đớp gọn địch vào miệng để hút sinh lực.',
  },
  vileplume: {
    dex: 45, name: 'Vileplume', types: ['grass', 'poison'], body: { w: 17, h: 12 }, fallbackColor: 0xd04060, scale: 1.3,
    base: { hp: 138, atk: 76, speed: 98 }, skills: sk('evo_megaDrain', 'acid', ['stunSpore', 1], ['evo_petalDance', 1]), catchRate: 45,
    blurb: 'Đóa hoa khổng lồ tỏa phấn tê liệt rồi xoay tròn trong bão cánh hoa.',
  },
  parasect: {
    dex: 47, name: 'Parasect', types: ['bug', 'grass'], body: { w: 18, h: 11 }, fallbackColor: 0xe05a30,
    base: { hp: 122, atk: 70, speed: 86 }, skills: sk('furyCutter', 'absorb', ['evo_spore', 24], ['evo_xScissor', 30]), catchRate: 75,
    blurb: 'Cây nấm ký sinh điều khiển cơ thể: rải bào tử hút máu cả đám.',
  },
  electrode: {
    dex: 101, name: 'Electrode', types: ['electric'], body: { w: 15, h: 11 }, fallbackColor: 0xd84040,
    base: { hp: 112, atk: 66, speed: 150 }, skills: sk('sonicBoom', 'rollout', ['evo_discharge', 30], ['evo_explosion', 36]), catchRate: 60,
    blurb: 'Nhanh nhất Kanto và nóng tính nhất – chạm nhẹ là nổ tung.',
  },
  magneton: {
    dex: 82, name: 'Magneton', types: ['electric'], body: { w: 18, h: 12 }, fallbackColor: 0xa8b0c0,
    base: { hp: 108, atk: 82, speed: 106 }, skills: sk('thundershock', 'sonicBoom', ['thunderWave', 12], ['evo_zapCannon', 30]), catchRate: 60,
  },
  hypno: {
    dex: 97, name: 'Hypno', types: ['psychic'], body: { w: 16, h: 12 }, fallbackColor: 0xe0c040, scale: 1.1,
    base: { hp: 138, atk: 70, speed: 98 }, skills: sk('psybeam', 'headbutt', ['hypnosis', 14], ['evo_dreamEater', 26]), catchRate: 75,
    blurb: 'Đung đưa con lắc ru ngủ địch rồi nuốt trọn giấc mơ của chúng.',
  },
};

// ======================================================================= chỉ số khi làm đối thủ (tham chiếu Lv 5)
const enemyStats: ChapterContent['enemyStats'] = {
  venusaur: { hp: 78, speed: 60, contactDamage: 18, xp: 14, behavior: 'tank', bossHp: 480 },
  charizard: { hp: 62, speed: 115, contactDamage: 19, xp: 14, behavior: 'rusher', bossHp: 460 },
  blastoise: {
    hp: 74, speed: 75, contactDamage: 17, xp: 14, behavior: 'ranged', bossHp: 480,
    rangedDamage: 18, rangedCooldownMs: 1800, rangedTelegraphMs: 500, rangedProjectileSpeed: 230, preferredRange: 150, rangedTexture: 'bubble',
  },
  butterfree: {
    hp: 38, speed: 90, contactDamage: 9, xp: 8, behavior: 'ranged',
    rangedDamage: 12, rangedCooldownMs: 2000, rangedTelegraphMs: 550, rangedProjectileSpeed: 170, preferredRange: 150, rangedTexture: 'wind',
  },
  beedrill: { hp: 40, speed: 140, contactDamage: 14, xp: 8, behavior: 'rusher' },
  pidgeot: { hp: 58, speed: 145, contactDamage: 16, xp: 12, behavior: 'rusher' },
  golduck: {
    hp: 56, speed: 85, contactDamage: 13, xp: 11, behavior: 'ranged',
    rangedDamage: 15, rangedCooldownMs: 1900, rangedTelegraphMs: 500, rangedProjectileSpeed: 210, preferredRange: 150, rangedTexture: 'bubble',
  },
  graveler: { hp: 76, speed: 48, contactDamage: 17, xp: 10, behavior: 'tank' },
  golem: { hp: 90, speed: 52, contactDamage: 20, xp: 14, behavior: 'tank' },
  persian: { hp: 44, speed: 145, contactDamage: 14, xp: 10, behavior: 'rusher' },
  primeape: { hp: 52, speed: 145, contactDamage: 17, xp: 11, behavior: 'rusher' },
  kadabra: {
    hp: 34, speed: 70, contactDamage: 8, xp: 11, behavior: 'ranged',
    rangedDamage: 17, rangedCooldownMs: 1800, rangedTelegraphMs: 450, rangedProjectileSpeed: 220, preferredRange: 170, rangedTexture: 'psyball',
  },
  alakazam: {
    hp: 44, speed: 80, contactDamage: 10, xp: 14, behavior: 'ranged', bossHp: 440,
    rangedDamage: 20, rangedCooldownMs: 1600, rangedTelegraphMs: 450, rangedProjectileSpeed: 240, preferredRange: 175, rangedTexture: 'psyball',
  },
  weepinbell: {
    hp: 40, speed: 75, contactDamage: 11, xp: 8, behavior: 'ranged',
    rangedDamage: 14, rangedCooldownMs: 2100, rangedTelegraphMs: 550, rangedProjectileSpeed: 180, preferredRange: 140, rangedTexture: 'poison',
  },
  victreebel: {
    hp: 62, speed: 80, contactDamage: 15, xp: 12, behavior: 'ranged',
    rangedDamage: 17, rangedCooldownMs: 2000, rangedTelegraphMs: 550, rangedProjectileSpeed: 190, preferredRange: 140, rangedTexture: 'sludge',
  },
  vileplume: {
    hp: 64, speed: 52, contactDamage: 13, xp: 13, behavior: 'ranged', bossHp: 460,
    rangedDamage: 17, rangedCooldownMs: 2200, rangedTelegraphMs: 600, rangedProjectileSpeed: 170, preferredRange: 150, rangedTexture: 'petal',
  },
  parasect: { hp: 66, speed: 45, contactDamage: 15, xp: 10, behavior: 'tank' },
  electrode: { hp: 42, speed: 150, contactDamage: 18, xp: 10, behavior: 'bomber' },
  magneton: {
    hp: 50, speed: 65, contactDamage: 12, xp: 12, behavior: 'ranged',
    rangedDamage: 17, rangedCooldownMs: 1700, rangedTelegraphMs: 450, rangedProjectileSpeed: 240, preferredRange: 165, rangedTexture: 'zap',
  },
  hypno: {
    hp: 66, speed: 60, contactDamage: 13, xp: 12, behavior: 'ranged',
    rangedDamage: 16, rangedCooldownMs: 2300, rangedTelegraphMs: 600, rangedProjectileSpeed: 170, preferredRange: 150, rangedTexture: 'psyball',
  },
};

export const CHAPTER: ChapterContent = {
  id: 'evo',
  title: '',
  badgesAtStart: 99,
  species,
  moves,
  enemyStats,
  stages: [],
  bossPatterns: {
    // Vileplume của Erika: mưa cánh hoa, vòng phấn độc
    vileplume: { type: 'grass', dropTexture: 'petal', ringTexture: 'poison', ringCount: 18, ringSpeed: 170, glow: 0xd060a0, impact: 'poison' },
    // Alakazam của Natsume: cầu siêu linh rơi xuống, vòng cầu siêu linh dày đặc
    alakazam: { type: 'psychic', dropTexture: 'psyball', ringTexture: 'psyball', ringCount: 20, ringSpeed: 200, glow: 0xf85888, impact: 'psy' },
  },
};
