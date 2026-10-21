// Chương 6 · Silph → Hội quán Saffron
// Loài sở hữu: mrmime slowpoke slowbro machop machoke machamp hitmonlee hitmonchan ditto (boss: machamp).
// Ải: đụng độ Shigeru ở Silph, Công ty Silph (lính Hỏa Tiễn + ô dịch chuyển), Võ đường Karate, Hội quán Saffron (Natsume).
import type { ChapterContent } from './types';
import { B, C, F, P } from '../moveKit';
import { A, many, s, sk } from '../kit';

export const CHAPTER: ChapterContent = {
  id: 'ch6',
  title: 'Chương 6 · Silph → Hội quán Saffron',
  badgesAtStart: 5,

  // ====================================================================== loài
  species: {
    mrmime: {
      dex: 122, name: 'Mr. Mime', types: ['psychic'], body: { w: 13, h: 11 }, fallbackColor: 0xf0a8c0,
      base: { hp: 104, atk: 70, speed: 116 },
      skills: sk('ch6_mimePlate', 'ch6_barrier', ['doubleSlap', 18], ['ch6_psywave', 30]), catchRate: 45,
      blurb: 'Nghệ sĩ kịch câm: dựng tường vô hình chặn đòn rồi phản đòn ngược lại.',
    },
    slowpoke: {
      dex: 79, name: 'Slowpoke', types: ['water', 'psychic'], body: { w: 16, h: 10 }, fallbackColor: 0xf0a0b8,
      base: { hp: 132, atk: 50, speed: 82 },
      skills: sk('waterGun', 'ch6_yawn', ['confusion', 18], ['ch6_slackOff', 26]),
      evolution: { into: 'slowbro', level: 37 }, catchRate: 190,
      blurb: 'Chậm như rùa nhưng cực lì: ngáp ru địch ngủ và nằm ườn để hồi máu.',
    },
    slowbro: {
      dex: 80, name: 'Slowbro', types: ['water', 'psychic'], body: { w: 18, h: 13 }, fallbackColor: 0xe890b0, scale: 1.3,
      base: { hp: 150, atk: 68, speed: 86 },
      skills: sk('waterGun', 'ch6_yawn', ['ch6_slackOff', 1], ['ch6_psychic', 1]), catchRate: 75,
      blurb: 'Shellder cắn đuôi làm nó tỉnh táo hơn hẳn: gồng sóng siêu linh quét cả sân.',
    },
    machop: {
      dex: 66, name: 'Machop', types: ['fighting'], body: { w: 12, h: 10 }, fallbackColor: 0x90a8c8,
      base: { hp: 104, atk: 70, speed: 100 },
      skills: sk('ch6_chopN1', 'ch6_counterN1', ['ch6_tossN1', 18], ['ch6_crossN1', 24]),
      evolution: { into: 'machoke', level: 28 }, catchRate: 180,
      blurb: 'Nhỏ con nhưng khỏe phi thường: tóm địch quật xuống đất bằng sức mạnh thuần túy.',
    },
    machoke: {
      dex: 67, name: 'Machoke', types: ['fighting'], body: { w: 14, h: 11 }, fallbackColor: 0x8094b8,
      base: { hp: 122, atk: 80, speed: 106 },
      skills: sk('ch6_chopN2', 'ch6_counterN2', ['ch6_submissionN2', 1], ['ch6_crossN2', 28]),
      evolution: { into: 'machamp', level: 40 }, catchRate: 90,
      blurb: 'Đai lực sĩ giữ sức mạnh trong vòng kiểm soát. Vật siết rồi quật liền hai lần.',
    },
    machamp: {
      dex: 68, name: 'Machamp', types: ['fighting'], body: { w: 18, h: 13 }, fallbackColor: 0x7080a8, scale: 1.35,
      base: { hp: 142, atk: 90, speed: 110 },
      skills: sk('ch6_jabN3', 'ch6_counterN3', ['ch6_dynamicN3', 1], ['ch6_barrageN3', 1]), catchRate: 45,
      blurb: 'Bốn cánh tay tung cú đấm liên hoàn. Đấm Động Lực làm địch choáng váng chắc chắn.',
    },
    hitmonlee: {
      dex: 106, name: 'Hitmonlee', types: ['fighting'], body: { w: 13, h: 12 }, fallbackColor: 0xc89a6a,
      base: { hp: 106, atk: 86, speed: 134 },
      skills: sk('ch6_rollingKick', 'ch6_jumpKick', ['ch6_meditate', 20], ['ch6_hiJumpKick', 32]), catchRate: 45,
      blurb: 'Đôi chân co giãn như lò xo: phi thân từ rất xa tung cú đá trời giáng.',
    },
    hitmonchan: {
      dex: 107, name: 'Hitmonchan', types: ['fighting'], body: { w: 13, h: 12 }, fallbackColor: 0xc8a888,
      base: { hp: 114, atk: 82, speed: 122 },
      skills: sk('ch6_machPunch', 'ch6_counter', ['ch6_firePunch', 20], ['ch6_icePunch', 32]), catchRate: 45,
      blurb: 'Võ sĩ quyền anh: đấm tốc độ, thủ thế phản đòn, nắm tay mang lửa và băng.',
    },
    ditto: {
      dex: 132, name: 'Ditto', types: ['normal'], body: { w: 13, h: 8 }, fallbackColor: 0xb898d8,
      base: { hp: 100, atk: 54, speed: 100 },
      skills: sk('ch6_blobSlam', 'ch6_transform', ['ch6_melt', 18]), catchRate: 35,
      blurb: 'Khối thịt dẻo biến hình được thành bất cứ thứ gì – không ai đoán được chiêu kế tiếp.',
    },
  },

  // ====================================================================== chiêu mới
  moves: {
    // ---- Mr. Mime
    ch6_mimePlate: P({ id: 'ch6_mimePlate', name: 'Đĩa Vô Hình', type: 'psychic', power: 10, cooldownMs: 480, sfx: 'swap', icon: 'shield', speed: 300, lifeMs: 1200, radius: 5,
      texture: 'psyball', spin: 10, particle: 'psypuff', knockback: 50, boomerang: true, pierce: true,
      desc: 'Ném tấm kính vô hình bay ra rồi quay về như boomerang, xuyên qua mọi địch trên đường.' }),
    ch6_barrier: F({ id: 'ch6_barrier', name: 'Rào Chắn', type: 'psychic', power: 0, cooldownMs: 7500, sfx: 'swap', icon: 'shield', guard: 0.35, reflect: 1.5, buffMs: 3500,
      desc: 'Dựng bức tường vô hình 3,5 giây: giảm 65% sát thương nhận vào và phản đòn ×1,5 lên địch nào chạm vào.' }),
    ch6_psywave: P({ id: 'ch6_psywave', name: 'Sóng Tâm Linh', type: 'psychic', power: 0, cooldownMs: 1600, sfx: 'zap', icon: 'wave', speed: 300, lifeMs: 700, radius: 5,
      texture: 'psyball', particle: 'psypuff', knockback: 60, count: 5, spreadDeg: 16, fixedPerLevel: 1.2,
      desc: 'Tỏa 5 sóng tâm linh hình quạt; mỗi sóng gây sát thương cố định theo cấp, không bị khắc hệ.' }),

    // ---- Slowpoke / Slowbro
    ch6_yawn: B({ id: 'ch6_yawn', name: 'Ngáp Dài', type: 'normal', power: 2, cooldownMs: 3800, sfx: 'swap', knockback: 0, icon: 'cloud', particle: 'psypuff', slow: 0.6,
      atTarget: true, zone: { radius: 52, ms: 3200, tickMs: 500 }, status: { kind: 'sleep', chance: 0.3, ms: 2200 },
      desc: 'Ngáp một hơi thật dài: để lại đám mây buồn ngủ tại chỗ địch 3,2 giây – địch trong mây chậm lại và dễ Ngủ.' }),
    ch6_slackOff: F({ id: 'ch6_slackOff', name: 'Lười Biếng', type: 'normal', power: 0, cooldownMs: 9000, sfx: 'heal', icon: 'heart', heal: 0.28, guard: 0.6, buffMs: 2500,
      desc: 'Nằm ườn ra đất: hồi 28% máu tối đa và giảm 40% sát thương nhận vào trong 2,5 giây.' }),
    ch6_psychic: B({ id: 'ch6_psychic', name: 'Siêu Năng Lực', type: 'psychic', power: 44, cooldownMs: 4800, sfx: 'thunder', knockback: 260, icon: 'spiral', particle: 'psypuff',
      burstRadius: 112, windupMs: 600, status: { kind: 'confuse', chance: 0.5, ms: 2200 },
      desc: 'Gồng 0,6 giây rồi giải phóng sóng siêu linh cực mạnh quanh người, vùng rất rộng. 50% gây Rối loạn.' }),

    // ---- Machop / Machoke / Machamp
    // ---- hệ Giác đấu, bộ chiêu mới (xem skills/kits.ts → TYPE_KITS.fighting + SPECIES_KITS machop/machoke/machamp) ----
  ch6_chopN1: C({ id: 'ch6_chopN1', name: 'Chặt Tay', type: 'fighting', power: 10, cooldownMs: 380, sfx: 'whip', icon: 'claw', range: 44, halfAngleDeg: 55, particle: 'spark', knockback: 90, archetype: 'strike',
    desc: 'Một nhát chặt ngắn phía trước, vệt chặt thẳng và tia va chạm.' }),
  ch6_chopN2: C({ id: 'ch6_chopN2', name: 'Chặt Đôi', type: 'fighting', power: 11, cooldownMs: 520, sfx: 'whip', icon: 'claw', range: 48, halfAngleDeg: 58, particle: 'spark', knockback: 100, archetype: 'strike',
    desc: 'Hai nhát chặt liên tiếp trái-phải, mỗi nhát một tia va chạm.' }),
  ch6_jabN3: C({ id: 'ch6_jabN3', name: 'Bốn Tay Liên Hoàn', type: 'fighting', power: 12, cooldownMs: 640, sfx: 'whip', icon: 'fist', range: 54, halfAngleDeg: 60, particle: 'spark', knockback: 80, archetype: 'strike',
    desc: 'Bốn cú đấm liên tiếp bằng bốn tay: mỗi cú là một nắm đấm bay kèm vụ nổ nhỏ.' }),
  ch6_counterN1: C({ id: 'ch6_counterN1', name: 'Phản Đòn', type: 'fighting', power: 20, cooldownMs: 3200, sfx: 'swap', icon: 'shield', range: 54, halfAngleDeg: 180, particle: 'spark', knockback: 240, archetype: 'counter',
    desc: 'Khoanh tay đỡ 0,6s: bị đánh trúng thì chỉ nhận 40% sát thương, phản lại mọi địch gần, và L/U kế tiếp mạnh ×1,5 trong 3s.' }),
  ch6_counterN2: C({ id: 'ch6_counterN2', name: 'Phản Đòn Nặng', type: 'fighting', power: 22, cooldownMs: 3600, sfx: 'swap', icon: 'shield', range: 72, halfAngleDeg: 180, particle: 'spark', knockback: 300, archetype: 'counter',
    desc: 'Thế đỡ rộng 0,8s: nhận 30% sát thương, phản đánh văng cả đám địch vây quanh, L/U kế tiếp ×1,5.' }),
  ch6_counterN3: C({ id: 'ch6_counterN3', name: 'Phản Đòn Bốn Tay', type: 'fighting', power: 24, cooldownMs: 3800, sfx: 'swap', icon: 'shield', range: 84, halfAngleDeg: 180, particle: 'spark', knockback: 340, archetype: 'counter',
    desc: 'Bốn tay đỡ 0,9s: nhận 25% sát thương; bị trúng thì phản lại bằng loạt 4 đấm vào mọi địch gần, L/U kế tiếp ×1,5.' }),
  ch6_tossN1: C({ id: 'ch6_tossN1', name: 'Quật Đất', type: 'fighting', power: 26, cooldownMs: 3000, sfx: 'whip', icon: 'fist', range: 46, halfAngleDeg: 60, particle: 'spark', knockback: 200, archetype: 'slam',
    desc: 'Tóm địch gần nhất, ném vòng qua vai đập xuống đất: nứt đất, đá văng, choáng.' }),
  ch6_submissionN2: C({ id: 'ch6_submissionN2', name: 'Siết & Quật', type: 'fighting', power: 32, cooldownMs: 3400, sfx: 'whip', icon: 'fist', range: 54, halfAngleDeg: 60, particle: 'spark', knockback: 240, archetype: 'slam',
    desc: 'Tóm địch, xoay người một vòng rồi ném đập mạnh: nứt dài, địch bên cạnh bị hất văng (Va chạm).' }),
  ch6_dynamicN3: C({ id: 'ch6_dynamicN3', name: 'Đấm Động Lực', type: 'fighting', power: 48, cooldownMs: 4600, sfx: 'boom', icon: 'fist', range: 60, halfAngleDeg: 60, anim: 'charge', animMs: 520, particle: 'spark', knockback: 320, archetype: 'slam',
    desc: 'Gồng 0,5s rồi một nắm đấm khổng lồ giáng xuống: nứt dài, rung mạnh, địch trúng đòn choáng chắc chắn.' }),
  ch6_crossN1: C({ id: 'ch6_crossN1', name: 'Chặt Chéo', type: 'fighting', power: 22, cooldownMs: 2800, sfx: 'whip', icon: 'claw', range: 50, halfAngleDeg: 60, particle: 'spark', knockback: 160, archetype: 'cross',
    desc: 'Hai nhát chặt chéo hình chữ X đâm xuống địch, nổ truyện tranh nhỏ.' }),
  ch6_crossN2: C({ id: 'ch6_crossN2', name: 'Chặt Chéo Nặng', type: 'fighting', power: 30, cooldownMs: 3200, sfx: 'whip', icon: 'claw', range: 50, halfAngleDeg: 60, particle: 'spark', knockback: 220, archetype: 'cross',
    desc: 'Chữ X lớn: giữa chữ X nổ truyện tranh lớn, địch văng ngược.' }),
  ch6_barrageN3: C({ id: 'ch6_barrageN3', name: 'Trăm Cú Đấm', type: 'fighting', power: 40, cooldownMs: 5200, sfx: 'whip', icon: 'fist', range: 50, halfAngleDeg: 60, particle: 'spark', knockback: 200, archetype: 'cross',
    desc: '12 cú đấm cực nhanh vào cụm địch (cánh tay nhòe), hàng chục vụ nổ nhỏ rồi một cú đấm hất tung cuối.' }),
  ch6_seismicToss: C({ id: 'ch6_seismicToss', name: 'Quật Ngã', type: 'fighting', power: 0, cooldownMs: 1800, sfx: 'hit', icon: 'fist', range: 42, halfAngleDeg: 40,
      particle: 'dustpuff', knockback: 300, lunge: 40, fixedPerLevel: 3,
      desc: 'Lao tới tóm địch quật mạnh xuống đất: sát thương cố định theo cấp, không bị khắc hệ.' }),
    ch6_bulkUp: F({ id: 'ch6_bulkUp', name: 'Gồng Cơ', type: 'fighting', power: 0, cooldownMs: 8500, sfx: 'swap', icon: 'shield', heal: 0.1, guard: 0.5, buffMs: 4000,
      desc: 'Gồng căng cơ bắp: hồi 10% máu tối đa và giảm 50% sát thương nhận vào trong 4 giây.' }),
    ch6_submission: C({ id: 'ch6_submission', name: 'Vật Siết', type: 'fighting', power: 18, cooldownMs: 1900, sfx: 'whip', icon: 'fist', range: 44, halfAngleDeg: 45,
      particle: 'spark', knockback: 220, lunge: 56, hits: 2, hitGapMs: 160, crit: 0.25, status: { kind: 'paralyze', chance: 0.6, ms: 700 },
      desc: 'Lao tới vật siết địch rồi quật liền 2 lần. 25% Chí mạng, 60% làm địch khựng lại.' }),
    ch6_fourArm: C({ id: 'ch6_fourArm', name: 'Liên Hoàn Bốn Tay', type: 'fighting', power: 9, cooldownMs: 900, sfx: 'whip', icon: 'fist', range: 46, halfAngleDeg: 55,
      particle: 'spark', knockback: 80, hits: 4, hitGapMs: 85,
      desc: 'Bốn cánh tay thay nhau đấm 4 cú cực nhanh vào mọi địch trước mặt.' }),
    ch6_dynamicPunch: C({ id: 'ch6_dynamicPunch', name: 'Đấm Động Lực', type: 'fighting', power: 56, cooldownMs: 4600, sfx: 'dash', icon: 'fist', range: 54, halfAngleDeg: 50,
      particle: 'spark', knockback: 340, lunge: 70, windupMs: 550, crit: 0.2, status: { kind: 'confuse', chance: 1, ms: 2200 },
      desc: 'Gồng 0,55 giây rồi lao tới tung cú đấm toàn lực: sát thương khổng lồ, địch trúng chắc chắn bị Rối loạn.' }),

    // ---- Hitmonlee
    ch6_rollingKick: C({ id: 'ch6_rollingKick', name: 'Đá Xoay Vòng', type: 'fighting', power: 15, cooldownMs: 1000, sfx: 'whip', icon: 'whirl', range: 46, halfAngleDeg: 180,
      particle: 'dustpuff', knockback: 170, status: { kind: 'paralyze', chance: 0.3, ms: 600 },
      desc: 'Xoay người đá một vòng tròn, trúng mọi địch quanh mình. 30% làm địch khựng lại.' }),
    ch6_jumpKick: C({ id: 'ch6_jumpKick', name: 'Đá Nhảy', type: 'fighting', power: 24, cooldownMs: 1500, sfx: 'dash', icon: 'play', range: 44, halfAngleDeg: 35,
      particle: 'dustpuff', knockback: 230, lunge: 110, crit: 0.3,
      desc: 'Bật nhảy lao thật xa tới đá. 30% Chí mạng, không bị trúng đòn khi đang lao.' }),
    ch6_meditate: F({ id: 'ch6_meditate', name: 'Thiền Định', type: 'psychic', power: 0, cooldownMs: 8000, sfx: 'heal', icon: 'sparkle', heal: 0.12, evade: 0.45, buffMs: 3000,
      desc: 'Ngồi thiền: hồi 12% máu tối đa và 45% né hoàn toàn mọi đòn trong 3 giây.' }),
    ch6_hiJumpKick: C({ id: 'ch6_hiJumpKick', name: 'Phi Cước', type: 'fighting', power: 50, cooldownMs: 4200, sfx: 'dash', icon: 'play', range: 50, halfAngleDeg: 30,
      particle: 'spark', knockback: 340, lunge: 150, windupMs: 400, crit: 0.4,
      desc: 'Gồng 0,4 giây rồi phi thân cực xa tung cú đá gối trời giáng. 40% Chí mạng.' }),

    // ---- Hitmonchan
    ch6_machPunch: C({ id: 'ch6_machPunch', name: 'Quyền Tốc Độ', type: 'fighting', power: 12, cooldownMs: 450, sfx: 'dash', icon: 'fist', range: 40, halfAngleDeg: 35,
      particle: 'spark', knockback: 90, lunge: 64,
      desc: 'Lướt tới tung cú đấm nhanh như chớp, hồi chiêu cực ngắn.' }),
    ch6_counter: F({ id: 'ch6_counter', name: 'Phản Đòn', type: 'fighting', power: 0, cooldownMs: 6500, sfx: 'swap', icon: 'shield', guard: 0.6, reflect: 2.5, buffMs: 2500,
      desc: 'Thủ thế phản công 2,5 giây: giảm 40% sát thương, địch nào chạm vào bị phản đòn ×2,5.' }),
    ch6_firePunch: C({ id: 'ch6_firePunch', name: 'Đấm Lửa', type: 'fire', power: 22, cooldownMs: 1200, sfx: 'flame', icon: 'flame', range: 42, halfAngleDeg: 40,
      particle: 'flamepuff', knockback: 180, lunge: 44, status: { kind: 'burn', chance: 0.4, ms: 2800 },
      desc: 'Lao tới đấm bằng nắm tay rực lửa. 40% gây Bỏng.' }),
    ch6_icePunch: C({ id: 'ch6_icePunch', name: 'Đấm Băng', type: 'ice', power: 30, cooldownMs: 2200, sfx: 'hit', icon: 'fist', range: 46, halfAngleDeg: 50,
      particle: 'icepuff', knockback: 200, lunge: 50, status: { kind: 'freeze', chance: 0.4, ms: 1400 },
      desc: 'Lao tới đấm bằng nắm tay băng giá. 40% Đóng băng địch 1,4 giây.' }),

    // ---- Ditto
    ch6_blobSlam: C({ id: 'ch6_blobSlam', name: 'Đập Dẻo', type: 'normal', power: 12, cooldownMs: 650, sfx: 'whip', icon: 'whirl', range: 38, halfAngleDeg: 50,
      particle: 'psypuff', knockback: 160, slow: 0.55,
      desc: 'Đập thân hình dẻo quẹo vào địch; chất nhầy làm địch chậm hẳn trong 2 giây.' }),
    ch6_transform: F({ id: 'ch6_transform', name: 'Biến Hình', type: 'normal', power: 0, cooldownMs: 2800, sfx: 'pickup', icon: 'sparkle', anim: 'charge', animMs: 300,
      metronome: true, desc: 'Biến hình chớp nhoáng thành Pokémon khác và tung ngẫu nhiên một chiêu mạnh của nó!' }),
    ch6_melt: F({ id: 'ch6_melt', name: 'Chảy Nhão', type: 'normal', power: 0, cooldownMs: 8000, sfx: 'heal', icon: 'drop', heal: 0.1, evade: 0.55, buffMs: 3000,
      desc: 'Chảy nhão thành vũng: hồi 10% máu tối đa và 55% né hoàn toàn mọi đòn trong 3 giây.' }),
  },

  // ====================================================================== chỉ số khi làm đối thủ (Lv 5)
  enemyStats: {
    mrmime: {
      hp: 44, speed: 80, contactDamage: 10, xp: 10, behavior: 'ranged',
      rangedDamage: 14, rangedCooldownMs: 1900, rangedTelegraphMs: 500, rangedProjectileSpeed: 200, preferredRange: 150, rangedTexture: 'psyball',
    },
    slowpoke: { hp: 64, speed: 36, contactDamage: 12, xp: 7, behavior: 'tank' },
    slowbro: {
      hp: 84, speed: 42, contactDamage: 15, xp: 11, behavior: 'ranged',
      rangedDamage: 16, rangedCooldownMs: 2600, rangedTelegraphMs: 700, rangedProjectileSpeed: 160, preferredRange: 140, rangedTexture: 'psyball',
    },
    machop: { hp: 36, speed: 115, contactDamage: 14, xp: 6, behavior: 'rusher' },
    machoke: { hp: 54, speed: 118, contactDamage: 17, xp: 9, behavior: 'rusher' },
    machamp: { hp: 82, speed: 92, contactDamage: 20, xp: 13, behavior: 'tank', bossHp: 460 },
    hitmonlee: { hp: 50, speed: 145, contactDamage: 18, xp: 11, behavior: 'rusher' },
    hitmonchan: { hp: 58, speed: 128, contactDamage: 17, xp: 11, behavior: 'rusher' },
    ditto: { hp: 42, speed: 70, contactDamage: 11, xp: 8, behavior: 'tank' },
  },

  // ====================================================================== nút bản đồ
  stages: [
    {
      id: 'silph-rival', kind: 'rival', name: 'Silph – Đụng độ Shigeru', area: 'Saffron', x: 349, y: 221, playable: true,
      biome: 'silph-office', rival: { tier: 2 }, levels: [39, 44], money: 2200, parTimeS: 160,
    },
    {
      id: 'silph-co', kind: 'stage', name: 'Công ty Silph – Hỏa Tiễn chiếm đóng', area: 'Saffron', x: 326, y: 218, playable: true, biome: 'silph-office',
      waves: [
        [...many('raticate', 36, 4), ...many('golbat', 36, 3)],
        [...many('arbok', 36, 3), ...many('machop', 37, 4), s('drowzee', 37)],
        [...many('ditto', 37, 3), ...many('slowpoke', 37, 2), ...many('magnemite', 37, 3)],
        [...many('golbat', 38, 3), ...many('machop', 38, 3), s('mrmime', 38), s('arbok', 38)],
        [...many('raticate', 38, 3), ...many('ditto', 38, 2), s('machoke', 39), A('slowbro', 40)],
      ],
      catchable: ['ditto', 'slowpoke', 'slowbro', 'mrmime', 'machop', 'machoke', 'drowzee', 'magnemite', 'arbok', 'golbat', 'raticate'],
      levels: [36, 40], money: 940, ballsFirstClear: 3, parTimeS: 135,
    },
    {
      id: 'fighting-dojo', kind: 'elite', name: 'Võ đường Karate', area: 'Saffron', x: 303, y: 214, playable: true, biome: 'dojo',
      waves: [
        [...many('machop', 38, 5), ...many('mankey', 38, 4)],
        [...many('machoke', 39, 3), ...many('mankey', 39, 3), ...many('machop', 39, 3)],
        [...many('machoke', 40, 4), ...many('machop', 40, 3), s('hitmonchan', 40)],
        [A('hitmonlee', 42), A('hitmonchan', 42), ...many('machoke', 41, 3)],
      ],
      catchable: ['hitmonlee', 'hitmonchan', 'machop', 'machoke', 'mankey'],
      levels: [38, 42], money: 1150, ballsFirstClear: 3, parTimeS: 160,
    },
    {
      id: 'gym-saffron', kind: 'gym', name: 'Hội quán Saffron', area: 'Saffron', x: 280, y: 210, label: 'Saffron', playable: true,
      biome: 'gym-saffron', gymId: 'saffron', levels: [40, 44], money: 3800, parTimeS: 180,
    },
  ],

  // ====================================================================== hội quán
  gyms: {
    saffron: {
      id: 'saffron',
      city: 'Thành phố Saffron',
      title: 'Hội quán Saffron',
      leader: 'Natsume',
      leaderSprite: 'natsume',
      badgeId: 'marsh',
      team: [
        { species: 'kadabra', level: 40 },
        { species: 'mrmime', level: 41 },
        { species: 'hypno', level: 41 },
        { species: 'alakazam', level: 44, boss: true },
      ],
      // hội quán động: 3 con bốc từ kho (khác loài), rồi át chủ bài
      pool: [
        { species: 'kadabra', level: 40 },
        { species: 'mrmime', level: 41 },
        { species: 'hypno', level: 41 },
        { species: 'drowzee', level: 40 },
        { species: 'slowbro', level: 41 },
        { species: 'exeggutor', level: 41 },
        { species: 'starmie', level: 41 },
        { species: 'jynx', level: 41 },
      ],
      pick: 3,
      ace: { species: 'alakazam', level: 44, boss: true },
      tuning: { attackSpeed: 1.2, aceHp: 0.45, aceDmg: 0.85 },
      intro: [
        'Natsume: Ta đã thấy trước cậu sẽ đến đây. Từ năm ba tuổi, ta đã có thể bẻ cong một chiếc thìa chỉ bằng ý nghĩ.',
        'Natsume: Những ô sáng hồng trên sàn sẽ đưa cậu đến nơi khác trong chớp mắt. Còn khi sàn ánh lên, sóng siêu linh sắp quét qua — đừng đứng yên.',
        'Natsume: Ta không thích đánh nhau. Nhưng nếu cậu muốn Huy hiệu Đầm Lầy, ta sẽ cho cậu thấy sức mạnh của tâm trí.',
      ],
      sendOut: [
        'Natsume: Kadabra, đọc từng bước đi của họ.',
        'Natsume: Mr. Mime, dựng tường đi.',
        'Natsume: Hypno, đưa họ vào giấc ngủ.',
        'Natsume: Alakazam... kết thúc tất cả.',
      ],
      winLines: [
        'Natsume: ...Tương lai ta nhìn thấy không có thất bại này. Cậu đã thay đổi nó.',
        'Natsume: Huy hiệu Đầm Lầy là của cậu. Có nó, Pokémon sẽ nghe lời cậu đến Lv 45.',
        'Natsume: Đi tiếp đi. Ta cảm nhận được có ai đó đang chờ cậu ở phía biển.',
      ],
      afterLines: [
        'Natsume: Lâu lắm rồi ta mới thấy vui khi thua. Có lẽ ta nên học cách cười nhiều hơn.',
      ],
      reward: { item: 'leafStone', name: 'Đá Lá' },
    },
  },

  badges: {
    marsh: { id: 'marsh', name: 'Huy hiệu Đầm Lầy', texture: 'badge-marsh' },
  },

  bossPatterns: {
    // Machamp (boss của Shiba ở Liên đoàn): đá tảng rơi, vòng đá bắn ra, lao đấm
    machamp: { type: 'fighting', dropTexture: 'boulder', ringTexture: 'rockball', ringCount: 16, ringSpeed: 180, glow: 0xc03028, impact: 'dust' },
  },

  trainerPalettes: {
    natsume: {
      skin: 0xf4d4b8, hair: 0x22202e, cap: null, shirt: 0xb02858, shirtTrim: 0xf0c848, arms: 0xb02858,
      pants: 0x3a2a4a, shoes: 0x241a2a, hairStyle: 'long',
    },
  },
};
