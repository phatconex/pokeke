// Chương 5 · Đường Xe Đạp → Hội quán Fuchsia (4 huy hiệu khi bắt đầu, Lv 31–38).
// Hang ổ Hỏa Tiễn, Đường Xe Đạp lộng gió, Snorlax chặn đường, Khu Safari, Đường 15 và Hội quán Fuchsia của ninja Kyo.
import type { EnemyStats } from '../../config/balance';
import type { TrainerPalette } from '../../art/townArt';
import type { BossPattern } from '../../entities/bossTypes';
import { A, many, s, sk } from '../kit';
import { B, C, F, MoveDef, P } from '../moveKit';
import type { PokemonSpecies } from '../pokemon';
import type { StageDef } from '../stages';
import type { BadgeDef, GymDef } from '../trainers';
import type { ChapterContent } from './types';

// ======================================================================= chiêu thức mới
const moves: Record<string, MoveDef> = {
  // ---------------------------------------------------------------- Koffing / Weezing: khí độc
  ch5_smog: P({ id: 'ch5_smog', name: 'Khói Độc', type: 'poison', power: 10, cooldownMs: 520, sfx: 'leaf', icon: 'cloud', speed: 200, lifeMs: 1100, radius: 7, texture: 'poison', particle: 'poisonpuff', knockback: 30,
    explode: 34, status: { kind: 'poison', chance: 0.5, ms: 3000 }, desc: 'Phun cục khói độc bay chậm, nổ bung thành đám khói rộng. 50% gây Nhiễm độc.' }),
  ch5_smokescreen: B({ id: 'ch5_smokescreen', name: 'Màn Khói', type: 'normal', power: 4, cooldownMs: 3600, sfx: 'swap', icon: 'cloud', knockback: 60, burstRadius: 76, particle: 'dustpuff',
    status: { kind: 'confuse', chance: 0.8, ms: 1800 }, desc: 'Xả màn khói đen quanh người: 80% làm mọi địch xung quanh Rối loạn, mất phương hướng 1,8 giây.' }),
  ch5_toxicFog: B({ id: 'ch5_toxicFog', name: 'Sương Độc Dày', type: 'poison', power: 7, cooldownMs: 3800, sfx: 'leaf', icon: 'skull', knockback: 0, particle: 'poisonpuff',
    atTarget: true, zone: { radius: 72, ms: 4500, tickMs: 400 }, status: { kind: 'poison', chance: 0.8, ms: 3500 }, desc: 'Phả một đám sương độc rất rộng tại chỗ địch (4,5 giây). Địch trong sương gần như chắc chắn Nhiễm độc.' }),
  ch5_explosion: B({ id: 'ch5_explosion', name: 'Đại Bộc Phá', type: 'normal', power: 96, cooldownMs: 8000, sfx: 'thunder', icon: 'skull', knockback: 340, burstRadius: 140, particle: 'flamepuff',
    windupMs: 700, selfCost: 0.6, desc: 'Phình to 0,7 giây rồi phát nổ dữ dội, quét sạch vùng 140px quanh người; tự mất 60% máu hiện tại (không bao giờ tự gục).' }),

  // ---------------------------------------------------------------- Grimer / Muk: bùn thải
  ch5_sludge: P({ id: 'ch5_sludge', name: 'Bùn Thải', type: 'poison', power: 13, cooldownMs: 560, sfx: 'water', icon: 'drop', speed: 230, radius: 6, texture: 'sludge', particle: 'poisonpuff', knockback: 60,
    explode: 26, slow: 0.6, status: { kind: 'poison', chance: 0.3, ms: 3000 }, desc: 'Ném cục bùn thải nhớp nháp: văng thành vũng nhỏ, làm chậm địch và 30% gây Nhiễm độc.' }),
  ch5_acidArmor: F({ id: 'ch5_acidArmor', name: 'Giáp Axit', type: 'poison', power: 0, cooldownMs: 9000, sfx: 'swap', icon: 'shield', guard: 0.3, reflect: 0.6, buffMs: 3500,
    desc: 'Hóa lỏng cơ thể: giảm 70% sát thương nhận vào trong 3,5 giây, địch nào chạm vào bị axit ăn mòn ngược lại.' }),
  ch5_sludgeBomb: P({ id: 'ch5_sludgeBomb', name: 'Bom Bùn Độc', type: 'poison', power: 26, cooldownMs: 2800, sfx: 'water', icon: 'skull', anim: 'charge', animMs: 320, speed: 240, radius: 8, texture: 'sludge', particle: 'poisonpuff', knockback: 170,
    explode: 58, status: { kind: 'poison', chance: 0.6, ms: 3500 }, desc: 'Quả bom bùn độc lớn nổ tung cả vùng 58px. 60% gây Nhiễm độc mọi địch dính.' }),
  ch5_gunkShot: P({ id: 'ch5_gunkShot', name: 'Phun Rác Độc', type: 'poison', power: 46, cooldownMs: 4600, sfx: 'water', icon: 'skull', anim: 'charge', animMs: 360, speed: 300, radius: 9, texture: 'sludge', particle: 'poisonpuff', knockback: 260,
    windupMs: 600, explode: 72, status: { kind: 'poison', chance: 0.8, ms: 4000 }, desc: 'Gồng 0,6 giây rồi phóng khối rác độc khổng lồ, nổ tung vùng 72px. 80% gây Nhiễm độc.' }),

  // ---------------------------------------------------------------- Doduo / Dodrio: nhiều đầu, chạy nhanh
  ch5_doublePeck: C({ id: 'ch5_doublePeck', name: 'Mổ Đôi', type: 'flying', power: 11, cooldownMs: 620, sfx: 'whip', icon: 'wing', range: 42, particle: 'windpuff', knockback: 70, lunge: 40,
    hits: 2, hitGapMs: 100, desc: 'Hai cái đầu cùng lao tới, mổ liền 2 nhát.' }),
  ch5_triPeck: C({ id: 'ch5_triPeck', name: 'Mổ Ba Đầu', type: 'flying', power: 12, cooldownMs: 680, sfx: 'whip', icon: 'wing', range: 46, particle: 'windpuff', knockback: 80, lunge: 52,
    hits: 3, hitGapMs: 90, crit: 0.15, desc: 'Ba cái đầu lao tới mổ liên tiếp 3 nhát. 15% Chí mạng mỗi nhát.' }),
  ch5_agility: F({ id: 'ch5_agility', name: 'Cao Tốc', type: 'psychic', power: 0, cooldownMs: 7000, sfx: 'dash', icon: 'play', evade: 0.35, buffMs: 3000,
    desc: 'Chạy nước rút loạn xạ: né 35% mọi đòn trong 3 giây.' }),
  ch5_triAttack: P({ id: 'ch5_triAttack', name: 'Tam Kích', type: 'normal', power: 14, cooldownMs: 2600, sfx: 'zap', icon: 'star', speed: 380, lifeMs: 800, radius: 5, texture: 'starshot', spin: 14, count: 3, spreadDeg: 20, particle: 'spark', knockback: 110,
    pierce: true, status: { kind: 'paralyze', chance: 0.25, ms: 900 }, desc: 'Ba cái đầu cùng bắn 3 tia năng lượng tỏa hình quạt, xuyên qua địch. 25% gây Tê liệt.' }),

  // ---------------------------------------------------------------- Tauros: bò tót hung hăng
  ch5_rage: C({ id: 'ch5_rage', name: 'Thịnh Nộ', type: 'normal', power: 9, cooldownMs: 520, sfx: 'whip', icon: 'fist', range: 44, particle: 'dustpuff', knockback: 90,
    stack: 0.35, desc: 'Húc cáu tiết: dùng liền nhau mạnh thêm 35% mỗi lần (tối đa ×2,4).' }),
  ch5_stampede: C({ id: 'ch5_stampede', name: 'Lao Phăng', type: 'normal', power: 24, cooldownMs: 1500, sfx: 'dash', icon: 'horn', range: 46, halfAngleDeg: 50, particle: 'dustpuff', knockback: 280,
    lunge: 120, desc: 'Cúi sừng lao phăng phăng tới 120px rồi húc tung mọi thứ trước mặt.' }),
  ch5_thrash: B({ id: 'ch5_thrash', name: 'Quẫy Loạn', type: 'normal', power: 10, cooldownMs: 3200, anim: 'attack', animMs: 320, sfx: 'dash', icon: 'whirl', knockback: 180, burstRadius: 44, particle: 'dustpuff',
    spinMs: 1600, desc: 'Lồng lộn 1,6 giây: chạy nhanh hơn, húc văng liên tục mọi địch quanh người.' }),
  ch5_gigaImpact: C({ id: 'ch5_gigaImpact', name: 'Va Chạm Tối Thượng', type: 'normal', power: 56, cooldownMs: 5200, sfx: 'dash', icon: 'fist', range: 54, halfAngleDeg: 45, particle: 'spark', knockback: 360,
    lunge: 130, windupMs: 650, crit: 0.2, desc: 'Gồng 0,65 giây rồi lao 130px húc bằng toàn bộ sức nặng. Cực mạnh, 20% Chí mạng.' }),

  // ---------------------------------------------------------------- Snorlax: khổng lồ, ăn ngủ
  ch5_bodySlam: C({ id: 'ch5_bodySlam', name: 'Đè Bẹp', type: 'normal', power: 26, cooldownMs: 1400, sfx: 'hit', icon: 'fist', range: 46, halfAngleDeg: 70, particle: 'dustpuff', knockback: 240,
    lunge: 56, status: { kind: 'paralyze', chance: 0.35, ms: 900 }, desc: 'Nhảy chồm tới đè cả thân hình nặng nề lên địch. 35% gây Tê liệt.' }),
  ch5_rest: F({ id: 'ch5_rest', name: 'Ngủ Sâu', type: 'psychic', power: 0, cooldownMs: 12000, sfx: 'heal', icon: 'heart', heal: 0.4, guard: 0.5, buffMs: 2500,
    desc: 'Đánh một giấc: hồi ngay 40% máu tối đa và giảm 50% sát thương nhận vào trong 2,5 giây.' }),
  ch5_heavySlam: B({ id: 'ch5_heavySlam', name: 'Dậm Nặng', type: 'normal', power: 32, cooldownMs: 3600, sfx: 'hit', icon: 'rock', knockback: 260, burstRadius: 96, particle: 'dustpuff',
    status: { kind: 'paralyze', chance: 0.3, ms: 800 }, desc: 'Nhảy lên rồi rơi ầm xuống, rung chuyển vùng 96px quanh người. 30% làm địch khựng lại.' }),
  ch5_hyperBeam: C({ id: 'ch5_hyperBeam', name: 'Phá Hủy', type: 'normal', power: 60, cooldownMs: 5600, sfx: 'thunder', icon: 'star', anim: 'shoot', animMs: 380, sprayMs: 320, moveSlow: 0.2, particle: 'spark', knockback: 300,
    line: 210, lineWidth: 28, windupMs: 900, desc: 'Gồng 0,9 giây rồi bắn tia năng lượng thẳng dài 210px, xuyên qua mọi địch trên đường.' }),

  // ---------------------------------------------------------------- Kangaskhan: mẹ và con
  ch5_cometPunch: C({ id: 'ch5_cometPunch', name: 'Liên Hoàn Quyền', type: 'normal', power: 7, cooldownMs: 820, sfx: 'whip', icon: 'fist', range: 42, particle: 'spark', knockback: 60,
    randomHits: [2, 5], hitGapMs: 85, desc: 'Đấm liên hoàn như mưa sao chổi, ngẫu nhiên 2–5 cú.' }),
  ch5_dizzyPunch: C({ id: 'ch5_dizzyPunch', name: 'Cú Đấm Choáng', type: 'normal', power: 22, cooldownMs: 1300, sfx: 'whip', icon: 'fist', range: 44, particle: 'spark', knockback: 200,
    lunge: 40, status: { kind: 'confuse', chance: 0.45, ms: 1800 }, desc: 'Lao tới đấm thẳng vào đầu. 45% làm địch Rối loạn.' }),
  ch5_parentalBond: C({ id: 'ch5_parentalBond', name: 'Mẹ Con Đồng Lòng', type: 'normal', power: 26, cooldownMs: 2600, sfx: 'dash', icon: 'heart', range: 50, halfAngleDeg: 55, particle: 'spark', knockback: 220,
    lunge: 60, hits: 2, hitGapMs: 180, crit: 0.25, desc: 'Mẹ lao tới tung cú đấm, đứa con trong túi đấm thêm cú thứ hai. 25% Chí mạng mỗi cú.' }),

  // ---------------------------------------------------------------- Scyther: lưỡi liềm
  ch5_doubleTeam: F({ id: 'ch5_doubleTeam', name: 'Ảo Ảnh', type: 'normal', power: 0, cooldownMs: 8000, sfx: 'swap', icon: 'sparkle', evade: 0.55, buffMs: 3000,
    desc: 'Lướt nhanh tạo ra nhiều ảo ảnh: né 55% mọi đòn trong 3 giây.' }),
  ch5_xScissor: C({ id: 'ch5_xScissor', name: 'Kéo Chữ X', type: 'bug', power: 30, cooldownMs: 2200, sfx: 'dash', icon: 'claw', range: 52, halfAngleDeg: 40, particle: 'leafpuff', knockback: 220,
    lunge: 80, hits: 2, hitGapMs: 120, crit: 0.3, desc: 'Lao 80px rồi chém chéo hai lưỡi liềm thành chữ X (2 nhát). 30% Chí mạng.' }),

  // ---------------------------------------------------------------- Pinsir: gọng kìm
  ch5_viceGrip: C({ id: 'ch5_viceGrip', name: 'Gọng Kìm', type: 'bug', power: 18, cooldownMs: 1300, sfx: 'whip', icon: 'claw', range: 42, halfAngleDeg: 35, particle: 'leafpuff', knockback: 0,
    status: { kind: 'paralyze', chance: 1, ms: 1100 }, desc: 'Kẹp chặt địch bằng cặp sừng: địch bị giữ đứng im 1,1 giây.' }),
  ch5_seismicToss: C({ id: 'ch5_seismicToss', name: 'Quật Ngã', type: 'fighting', power: 0, cooldownMs: 2200, sfx: 'hit', icon: 'fist', range: 44, particle: 'dustpuff', knockback: 320,
    lunge: 36, fixedPerLevel: 2.8, desc: 'Nhấc bổng địch rồi quật xuống đất: sát thương cố định theo cấp (không bị khắc hệ), hất văng rất xa.' }),
  ch5_guillotine: C({ id: 'ch5_guillotine', name: 'Máy Chém', type: 'bug', power: 54, cooldownMs: 5200, sfx: 'whip', icon: 'claw', range: 52, halfAngleDeg: 40, particle: 'spark', knockback: 320,
    windupMs: 700, crit: 0.45, desc: 'Banh rộng cặp sừng 0,7 giây rồi khép mạnh như máy chém. 45% Chí mạng.' }),

  // ---------------------------------------------------------------- Chansey: y tá trứng
  ch5_softBoiled: F({ id: 'ch5_softBoiled', name: 'Trứng Bổ Dưỡng', type: 'normal', power: 0, cooldownMs: 8000, sfx: 'heal', icon: 'heart', heal: 0.3,
    desc: 'Ăn quả trứng bổ dưỡng: hồi ngay 30% máu tối đa.' }),
  ch5_sing: C({ id: 'ch5_sing', name: 'Hát Ru', type: 'normal', power: 0, cooldownMs: 3600, sfx: 'select', icon: 'note', anim: 'shoot', animMs: 320, range: 120, halfAngleDeg: 50, sprayMs: 300, particle: 'psypuff', knockback: 0,
    status: { kind: 'sleep', chance: 1, ms: 2600 }, desc: 'Cất tiếng hát ru: mọi địch trong hình quạt rộng trước mặt Ngủ 2,6 giây.' }),
  ch5_eggBomb: P({ id: 'ch5_eggBomb', name: 'Bom Trứng', type: 'normal', power: 28, cooldownMs: 2600, sfx: 'hit', icon: 'star', anim: 'charge', animMs: 320, speed: 230, radius: 7, texture: 'psyball', spin: 8, particle: 'spark', knockback: 180,
    explode: 52, desc: 'Ném quả trứng to bay vòng, nổ tung cả vùng 52px khi trúng.' }),

  // ---------------------------------------------------------------- Exeggcute / Exeggutor: chùm trứng, cây dừa
  ch5_barrage: P({ id: 'ch5_barrage', name: 'Loạt Trứng', type: 'normal', power: 6, cooldownMs: 520, sfx: 'pickup', icon: 'seed', speed: 300, radius: 4, texture: 'seed', spin: 10, count: 3, spreadDeg: 26, particle: 'leafpuff', knockback: 50,
    explode: 16, desc: 'Tung 3 quả trứng tỏa hình quạt, mỗi quả nổ lách tách khi trúng.' }),
  ch5_solarBeam: C({ id: 'ch5_solarBeam', name: 'Tia Mặt Trời', type: 'grass', power: 52, cooldownMs: 4800, sfx: 'thunder', icon: 'leaf', anim: 'shoot', animMs: 360, sprayMs: 300, moveSlow: 0.3, particle: 'leafpuff', knockback: 260,
    line: 220, lineWidth: 30, windupMs: 950, desc: 'Hấp thụ nắng 0,95 giây rồi phóng tia sáng thẳng dài 220px, xuyên mọi địch trên đường.' }),

  // ---------------------------------------------------------------- Venonat / Venomoth: mắt kép, phấn cánh
  ch5_signalBeam: P({ id: 'ch5_signalBeam', name: 'Tia Mắt Kép', type: 'bug', power: 8, cooldownMs: 460, sfx: 'zap', icon: 'eye', speed: 320, lifeMs: 1000, texture: 'psyball', particle: 'psypuff', count: 2, spreadDeg: 10, knockback: 40,
    homing: 5, status: { kind: 'confuse', chance: 0.12, ms: 1200 }, desc: 'Đôi mắt kép bắn 2 tia tự dò theo địch. 12% gây Rối loạn.' }),
  ch5_sleepPowder: B({ id: 'ch5_sleepPowder', name: 'Phấn Ngủ', type: 'grass', power: 2, cooldownMs: 3800, sfx: 'leaf', icon: 'cloud', knockback: 0, particle: 'leafpuff',
    atTarget: true, zone: { radius: 50, ms: 3000, tickMs: 500 }, status: { kind: 'sleep', chance: 0.35, ms: 2000 }, desc: 'Rắc mây phấn ngủ tại chỗ địch (3 giây): địch đứng trong dễ Ngủ thiếp đi.' }),
  ch5_silverWind: P({ id: 'ch5_silverWind', name: 'Gió Bạc', type: 'bug', power: 11, cooldownMs: 2400, sfx: 'dash', icon: 'wind', speed: 300, lifeMs: 900, radius: 6, texture: 'wind', spin: 10, count: 5, spreadDeg: 14, particle: 'windpuff', knockback: 120,
    pierce: true, desc: 'Đập cánh tung 5 luồng gió phấn bạc tỏa rộng, xuyên qua cả đám địch.' }),

  // ---------------------------------------------------------------- họ Nidoran
  ch5_doubleKick: C({ id: 'ch5_doubleKick', name: 'Đá Đôi', type: 'fighting', power: 10, cooldownMs: 700, sfx: 'whip', icon: 'fist', range: 42, particle: 'dustpuff', knockback: 100,
    lunge: 26, hits: 2, hitGapMs: 110, desc: 'Lao tới đá liền 2 cú bằng hai chân sau.' }),
  ch5_poisonJab: C({ id: 'ch5_poisonJab', name: 'Đâm Độc', type: 'poison', power: 22, cooldownMs: 1000, sfx: 'whip', icon: 'horn', range: 46, halfAngleDeg: 30, particle: 'poisonpuff', knockback: 180,
    lunge: 56, status: { kind: 'poison', chance: 0.4, ms: 3500 }, desc: 'Lao tới đâm sừng tẩm độc. 40% gây Nhiễm độc.' }),
  ch5_earthPower: B({ id: 'ch5_earthPower', name: 'Lực Đất', type: 'ground', power: 40, cooldownMs: 4600, sfx: 'hit', icon: 'rock', knockback: 260, burstRadius: 110, particle: 'dustpuff',
    windupMs: 500, status: { kind: 'paralyze', chance: 0.3, ms: 900 }, desc: 'Dồn sức 0,5 giây rồi nện xuống, mặt đất nứt toác trong vùng 110px quanh người. 30% làm địch khựng lại.' }),

  // ---------------------------------------------------------------- Eevee và các dạng tiến hóa
  ch5_lastResort: C({ id: 'ch5_lastResort', name: 'Tuyệt Chiêu', type: 'normal', power: 38, cooldownMs: 3400, sfx: 'dash', icon: 'star', range: 48, particle: 'spark', knockback: 260,
    lunge: 64, crit: 0.2, desc: 'Dồn hết sức lao 64px húc thật mạnh. 20% Chí mạng.' }),
  ch5_aquaRing: F({ id: 'ch5_aquaRing', name: 'Vòng Nước', type: 'water', power: 0, cooldownMs: 10000, sfx: 'heal', icon: 'drop', heal: 0.2, guard: 0.6, buffMs: 4000,
    desc: 'Bao quanh mình vòng nước mát: hồi 20% máu và giảm 40% sát thương nhận vào trong 4 giây.' }),
  ch5_hydroPump: C({ id: 'ch5_hydroPump', name: 'Bơm Thủy Lực', type: 'water', power: 46, cooldownMs: 4200, sfx: 'water', icon: 'wave', anim: 'shoot', animMs: 360, sprayMs: 300, moveSlow: 0.3, particle: 'bubblepuff', knockback: 340,
    line: 190, lineWidth: 26, windupMs: 500, desc: 'Gồng 0,5 giây rồi xịt cột nước áp lực cao thẳng dài 190px, đẩy văng mọi địch trên đường.' }),
  ch5_pinMissile: P({ id: 'ch5_pinMissile', name: 'Tên Lửa Gai', type: 'bug', power: 5, cooldownMs: 620, sfx: 'zap', icon: 'horn', speed: 460, lifeMs: 600, texture: 'needle', count: 4, spreadDeg: 7, particle: 'zappuff', knockback: 30,
    crit: 0.15, desc: 'Xù lông bắn liền 4 chiếc gai nhọn chụm một hướng, bay rất nhanh. 15% Chí mạng.' }),
  ch5_discharge: B({ id: 'ch5_discharge', name: 'Phóng Điện', type: 'electric', power: 32, cooldownMs: 3600, sfx: 'thunder', icon: 'bolt', knockback: 180, burstRadius: 100, particle: 'zappuff',
    status: { kind: 'paralyze', chance: 0.45, ms: 1000 }, desc: 'Phóng điện cực mạnh ra mọi hướng quanh người (vùng 100px). 45% gây Tê liệt.' }),
  ch5_flareBlitz: C({ id: 'ch5_flareBlitz', name: 'Hỏa Tốc Xung', type: 'fire', power: 50, cooldownMs: 4400, sfx: 'flame', icon: 'flame', range: 52, halfAngleDeg: 45, particle: 'flamepuff', knockback: 320,
    lunge: 120, windupMs: 400, status: { kind: 'burn', chance: 0.6, ms: 3500 }, desc: 'Bùng lửa toàn thân 0,4 giây rồi lao 120px húc cháy rực. 60% gây Bỏng.' }),
};

// ======================================================================= loài
const species: Record<string, Omit<PokemonSpecies, 'id'>> = {
  koffing: {
    dex: 109, name: 'Koffing', types: ['poison'], body: { w: 14, h: 11 }, fallbackColor: 0x8a6aa8,
    base: { hp: 96, atk: 58, speed: 94 }, skills: sk('ch5_smog', 'ch5_smokescreen', ['selfDestruct', 20]),
    evolution: { into: 'weezing', level: 35 }, catchRate: 190,
    blurb: 'Quả bóng khí độc lơ lửng. Gây rối loạn cả đám rồi tự nổ khi bị dồn ép.',
  },
  weezing: {
    dex: 110, name: 'Weezing', types: ['poison'], body: { w: 20, h: 14 }, fallbackColor: 0x7a5a98, scale: 1.35,
    base: { hp: 122, atk: 74, speed: 98 }, skills: sk('ch5_smog', 'ch5_smokescreen', ['ch5_toxicFog', 1], ['ch5_explosion', 35]), catchRate: 60,
    blurb: 'Hai đầu khí độc. Phủ sương độc khắp sân và có cú Đại Bộc Phá san phẳng mọi thứ.',
  },
  grimer: {
    dex: 88, name: 'Grimer', types: ['poison'], body: { w: 15, h: 10 }, fallbackColor: 0x9a6ab8,
    base: { hp: 118, atk: 56, speed: 82 }, skills: sk('ch5_sludge', 'ch5_acidArmor', ['ch5_sludgeBomb', 22]),
    evolution: { into: 'muk', level: 38 }, catchRate: 190,
    blurb: 'Khối bùn thải chậm chạp nhưng lì đòn, làm chậm địch bằng bùn nhớp.',
  },
  muk: {
    dex: 89, name: 'Muk', types: ['poison'], body: { w: 22, h: 14 }, fallbackColor: 0x7a4a98, scale: 1.35,
    base: { hp: 148, atk: 72, speed: 86 }, skills: sk('ch5_sludge', 'ch5_acidArmor', ['ch5_sludgeBomb', 1], ['ch5_gunkShot', 38]), catchRate: 75,
  },
  doduo: {
    dex: 84, name: 'Doduo', types: ['normal', 'flying'], body: { w: 14, h: 10 }, fallbackColor: 0xb08a58,
    base: { hp: 86, atk: 66, speed: 138 }, skills: sk('ch5_doublePeck', 'quickAttack', ['ch5_agility', 18], ['drillPeck', 26]),
    evolution: { into: 'dodrio', level: 31 }, catchRate: 190,
    blurb: 'Chim hai đầu chạy cực nhanh trên Đường Xe Đạp. Mổ đôi liên tục.',
  },
  dodrio: {
    dex: 85, name: 'Dodrio', types: ['normal', 'flying'], body: { w: 18, h: 12 }, fallbackColor: 0x9a7040, scale: 1.3,
    base: { hp: 108, atk: 82, speed: 146 }, skills: sk('ch5_triPeck', 'ch5_agility', ['drillPeck', 1], ['ch5_triAttack', 31]), catchRate: 45,
  },
  tauros: {
    dex: 128, name: 'Tauros', types: ['normal'], body: { w: 20, h: 12 }, fallbackColor: 0xa87848, scale: 1.3,
    base: { hp: 112, atk: 80, speed: 132 }, skills: sk('ch5_rage', 'ch5_stampede', ['ch5_thrash', 20], ['ch5_gigaImpact', 32]), catchRate: 45,
    blurb: 'Bò tót Safari. Càng đánh càng điên, lao phăng phăng húc tung cả đàn.',
  },
  snorlax: {
    dex: 143, name: 'Snorlax', types: ['normal'], body: { w: 24, h: 16 }, fallbackColor: 0x3a6a7a, scale: 1.6,
    base: { hp: 150, atk: 76, speed: 80 }, skills: sk('ch5_bodySlam', 'ch5_rest', ['ch5_heavySlam', 20], ['ch5_hyperBeam', 34]), catchRate: 25,
    blurb: 'Ngủ chắn ngang đường. Máu cực trâu, tự ngủ hồi máu và đè bẹp mọi thứ.',
  },
  kangaskhan: {
    dex: 115, name: 'Kangaskhan', types: ['normal'], body: { w: 18, h: 14 }, fallbackColor: 0x8a7050, scale: 1.4,
    base: { hp: 136, atk: 78, speed: 106 }, skills: sk('ch5_cometPunch', 'bite', ['ch5_dizzyPunch', 20], ['ch5_parentalBond', 30]), catchRate: 45,
    blurb: 'Mẹ địu con trong túi, hai mẹ con cùng ra đòn.',
  },
  scyther: {
    dex: 123, name: 'Scyther', types: ['bug', 'flying'], body: { w: 18, h: 12 }, fallbackColor: 0x58b058, scale: 1.3,
    base: { hp: 104, atk: 86, speed: 148 }, skills: sk('furyCutter', 'ch5_doubleTeam', ['wingAttack', 20], ['ch5_xScissor', 30]), catchRate: 45,
    blurb: 'Ninja bọ ngựa. Ảo ảnh né đòn rồi chém chữ X chí mạng.',
  },
  pinsir: {
    dex: 127, name: 'Pinsir', types: ['bug'], body: { w: 18, h: 13 }, fallbackColor: 0x9a8468, scale: 1.3,
    base: { hp: 112, atk: 88, speed: 108 }, skills: sk('ch5_viceGrip', 'ch5_seismicToss', ['harden', 18], ['ch5_guillotine', 30]), catchRate: 45,
    blurb: 'Cặp sừng gọng kìm kẹp chặt địch, quật ngã bằng sát thương cố định.',
  },
  chansey: {
    dex: 113, name: 'Chansey', types: ['normal'], body: { w: 16, h: 12 }, fallbackColor: 0xf0a8b8, scale: 1.3,
    base: { hp: 150, atk: 44, speed: 92 }, skills: sk('doubleSlap', 'ch5_softBoiled', ['ch5_sing', 18], ['ch5_eggBomb', 28]), catchRate: 30,
    blurb: 'Cực hiếm ở Safari. Máu khổng lồ, tự hồi máu và hát ru cả đám ngủ say.',
  },
  exeggcute: {
    dex: 102, name: 'Exeggcute', types: ['grass', 'psychic'], body: { w: 16, h: 10 }, fallbackColor: 0xf0c8c0,
    base: { hp: 100, atk: 60, speed: 92 }, skills: sk('ch5_barrage', 'hypnosis', ['leechSeed', 16], ['confusion', 26]),
    evolution: { into: 'exeggutor', item: 'leafStone' }, catchRate: 90,
    blurb: 'Sáu quả trứng thần giao cách cảm. Dùng Đá Lá để tiến hóa.',
  },
  exeggutor: {
    dex: 103, name: 'Exeggutor', types: ['grass', 'psychic'], body: { w: 18, h: 14 }, fallbackColor: 0x6ab050, scale: 1.45,
    base: { hp: 140, atk: 86, speed: 90 }, skills: sk('ch5_barrage', 'hypnosis', ['ch5_eggBomb', 1], ['ch5_solarBeam', 1]), catchRate: 45,
  },
  venonat: {
    dex: 48, name: 'Venonat', types: ['bug', 'poison'], body: { w: 14, h: 10 }, fallbackColor: 0x8a5ab0,
    base: { hp: 100, atk: 54, speed: 98 }, skills: sk('ch5_signalBeam', 'poisonPowder', ['psybeam', 18], ['ch5_sleepPowder', 26]),
    evolution: { into: 'venomoth', level: 31 }, catchRate: 190,
    blurb: 'Đôi mắt kép như ra-đa: đạn tự dò theo địch.',
  },
  venomoth: {
    dex: 49, name: 'Venomoth', types: ['bug', 'poison'], body: { w: 18, h: 12 }, fallbackColor: 0xb090d8, scale: 1.3,
    base: { hp: 114, atk: 70, speed: 128 }, skills: sk('ch5_signalBeam', 'poisonPowder', ['ch5_sleepPowder', 1], ['ch5_silverWind', 31]), catchRate: 75,
  },
  nidoranf: {
    dex: 29, name: 'Nidoran♀', types: ['poison'], body: { w: 13, h: 9 }, fallbackColor: 0x8ab0d8,
    base: { hp: 104, atk: 50, speed: 98 }, skills: sk('poisonSting', 'scratch', ['ch5_doubleKick', 12]),
    evolution: { into: 'nidorina', level: 16 }, catchRate: 235,
  },
  nidorina: {
    dex: 30, name: 'Nidorina', types: ['poison'], body: { w: 15, h: 10 }, fallbackColor: 0x78a0d0,
    base: { hp: 124, atk: 62, speed: 102 }, skills: sk('poisonSting', 'ch5_doubleKick', ['bite', 16], ['poisonFang', 24]),
    evolution: { into: 'nidoqueen', item: 'moonStone' }, catchRate: 120,
    blurb: 'Dùng Đá Trăng để tiến hóa thành Nidoqueen.',
  },
  nidoqueen: {
    dex: 31, name: 'Nidoqueen', types: ['poison', 'ground'], body: { w: 18, h: 13 }, fallbackColor: 0x5a88b8, scale: 1.4,
    base: { hp: 148, atk: 80, speed: 104 }, skills: sk('ch5_doubleKick', 'ch5_bodySlam', ['poisonFang', 1], ['ch5_earthPower', 1]), catchRate: 45,
    blurb: 'Pháo đài bọc giáp. Đè bẹp và làm nứt toác mặt đất quanh mình.',
  },
  nidoranm: {
    dex: 32, name: 'Nidoran♂', types: ['poison'], body: { w: 13, h: 9 }, fallbackColor: 0xc078c0,
    base: { hp: 96, atk: 58, speed: 104 }, skills: sk('hornAttack', 'poisonSting', ['ch5_doubleKick', 12]),
    evolution: { into: 'nidorino', level: 16 }, catchRate: 235,
  },
  nidorino: {
    dex: 33, name: 'Nidorino', types: ['poison'], body: { w: 15, h: 10 }, fallbackColor: 0xb068b8,
    base: { hp: 112, atk: 70, speed: 110 }, skills: sk('hornAttack', 'poisonSting', ['ch5_doubleKick', 16], ['hornDrill', 24]),
    evolution: { into: 'nidoking', item: 'moonStone' }, catchRate: 120,
    blurb: 'Dùng Đá Trăng để tiến hóa thành Nidoking.',
  },
  nidoking: {
    dex: 34, name: 'Nidoking', types: ['poison', 'ground'], body: { w: 18, h: 13 }, fallbackColor: 0x9050a8, scale: 1.4,
    base: { hp: 136, atk: 90, speed: 112 }, skills: sk('ch5_poisonJab', 'ch5_thrash', ['hornDrill', 1], ['earthquake', 1]), catchRate: 45,
    blurb: 'Vua hung bạo: đâm sừng độc, lồng lộn rồi gây động đất.',
  },
  eevee: {
    dex: 133, name: 'Eevee', types: ['normal'], body: { w: 13, h: 9 }, fallbackColor: 0xc89a60,
    base: { hp: 98, atk: 56, speed: 118 }, skills: sk('quickAttack', 'swift', ['bite', 16], ['ch5_lastResort', 26]),
    evolutions: [
      { into: 'vaporeon', item: 'waterStone' },
      { into: 'jolteon', item: 'thunderStone' },
      { into: 'flareon', item: 'fireStone' },
    ],
    catchRate: 45,
    blurb: 'Rất hiếm! Đá Nước → Vaporeon, Đá Sấm → Jolteon, Đá Lửa → Flareon.',
  },
  vaporeon: {
    dex: 134, name: 'Vaporeon', types: ['water'], body: { w: 17, h: 11 }, fallbackColor: 0x58a8d8, scale: 1.3,
    base: { hp: 150, atk: 70, speed: 108 }, skills: sk('waterGun', 'quickAttack', ['ch5_aquaRing', 1], ['ch5_hydroPump', 1]), catchRate: 45,
    blurb: 'Bền bỉ nhất nhà Eevee: tự hồi máu bằng vòng nước, xịt nước đẩy văng địch.',
  },
  jolteon: {
    dex: 135, name: 'Jolteon', types: ['electric'], body: { w: 15, h: 10 }, fallbackColor: 0xf0d040, scale: 1.3,
    base: { hp: 104, atk: 78, speed: 150 }, skills: sk('thundershock', 'quickAttack', ['ch5_pinMissile', 1], ['ch5_discharge', 1]), catchRate: 45,
    blurb: 'Nhanh nhất nhà Eevee: lông gai bắn liên thanh, phóng điện quanh người.',
  },
  flareon: {
    dex: 136, name: 'Flareon', types: ['fire'], body: { w: 15, h: 11 }, fallbackColor: 0xf07838, scale: 1.3,
    base: { hp: 118, atk: 88, speed: 112 }, skills: sk('ember', 'quickAttack', ['fireFang', 1], ['ch5_flareBlitz', 1]), catchRate: 45,
    blurb: 'Mạnh nhất nhà Eevee: lao vào giữa đám địch, bùng lửa thiêu rụi.',
  },
};

// ======================================================================= chỉ số khi làm đối thủ (Lv 5)
const enemyStats: Record<string, EnemyStats> = {
  // Koffing lơ lửng áp sát rồi tự nổ (như Voltorb nhưng chậm, trâu hơn)
  koffing: { hp: 34, speed: 92, contactDamage: 12, xp: 7, behavior: 'bomber' },
  weezing: {
    hp: 62, speed: 58, contactDamage: 15, xp: 12, behavior: 'ranged', bossHp: 460,
    rangedDamage: 16, rangedCooldownMs: 1900, rangedTelegraphMs: 550, rangedProjectileSpeed: 170, preferredRange: 150, rangedTexture: 'sludge',
  },
  grimer: { hp: 56, speed: 44, contactDamage: 13, xp: 7, behavior: 'tank' },
  muk: {
    hp: 82, speed: 48, contactDamage: 18, xp: 13, behavior: 'ranged',
    rangedDamage: 17, rangedCooldownMs: 2400, rangedTelegraphMs: 650, rangedProjectileSpeed: 150, preferredRange: 110, rangedTexture: 'sludge',
  },
  doduo: { hp: 28, speed: 142, contactDamage: 12, xp: 7, behavior: 'rusher' },
  dodrio: { hp: 52, speed: 150, contactDamage: 16, xp: 12, behavior: 'rusher' },
  tauros: { hp: 58, speed: 145, contactDamage: 18, xp: 12, behavior: 'rusher' },
  snorlax: { hp: 90, speed: 40, contactDamage: 20, xp: 14, behavior: 'tank' },
  kangaskhan: { hp: 76, speed: 78, contactDamage: 18, xp: 13, behavior: 'tank' },
  scyther: { hp: 52, speed: 150, contactDamage: 18, xp: 13, behavior: 'rusher' },
  pinsir: { hp: 66, speed: 72, contactDamage: 19, xp: 13, behavior: 'tank' },
  chansey: {
    hp: 90, speed: 62, contactDamage: 8, xp: 14, behavior: 'ranged',
    rangedDamage: 11, rangedCooldownMs: 2400, rangedTelegraphMs: 600, rangedProjectileSpeed: 170, preferredRange: 160, rangedTexture: 'psyball',
  },
  exeggcute: {
    hp: 38, speed: 50, contactDamage: 10, xp: 7, behavior: 'ranged',
    rangedDamage: 13, rangedCooldownMs: 2300, rangedTelegraphMs: 600, rangedProjectileSpeed: 165, preferredRange: 150, rangedTexture: 'psyball',
  },
  exeggutor: {
    hp: 72, speed: 54, contactDamage: 16, xp: 13, behavior: 'ranged',
    rangedDamage: 17, rangedCooldownMs: 2100, rangedTelegraphMs: 600, rangedProjectileSpeed: 180, preferredRange: 150, rangedTexture: 'psyball',
  },
  venonat: {
    hp: 34, speed: 68, contactDamage: 10, xp: 6, behavior: 'ranged',
    rangedDamage: 12, rangedCooldownMs: 2200, rangedTelegraphMs: 550, rangedProjectileSpeed: 180, preferredRange: 140, rangedTexture: 'psyball',
  },
  venomoth: {
    hp: 48, speed: 112, contactDamage: 13, xp: 10, behavior: 'ranged',
    rangedDamage: 15, rangedCooldownMs: 1800, rangedTelegraphMs: 500, rangedProjectileSpeed: 200, preferredRange: 160, rangedTexture: 'poison',
  },
  nidoranf: { hp: 28, speed: 108, contactDamage: 10, xp: 5, behavior: 'rusher' },
  nidorina: { hp: 50, speed: 82, contactDamage: 14, xp: 9, behavior: 'tank' },
  nidoqueen: { hp: 84, speed: 70, contactDamage: 19, xp: 13, behavior: 'tank' },
  nidoranm: { hp: 24, speed: 122, contactDamage: 11, xp: 5, behavior: 'rusher' },
  nidorino: { hp: 44, speed: 132, contactDamage: 15, xp: 9, behavior: 'rusher' },
  nidoking: { hp: 76, speed: 112, contactDamage: 20, xp: 13, behavior: 'rusher' },
  eevee: { hp: 30, speed: 128, contactDamage: 10, xp: 9, behavior: 'rusher' },
  vaporeon: {
    hp: 70, speed: 70, contactDamage: 14, xp: 12, behavior: 'ranged',
    rangedDamage: 15, rangedCooldownMs: 2000, rangedTelegraphMs: 550, rangedProjectileSpeed: 190, preferredRange: 140, rangedTexture: 'bubble',
  },
  jolteon: {
    hp: 46, speed: 140, contactDamage: 13, xp: 12, behavior: 'ranged', bossHp: 420,
    rangedDamage: 14, rangedCooldownMs: 1500, rangedTelegraphMs: 420, rangedProjectileSpeed: 240, preferredRange: 150, rangedTexture: 'zap',
  },
  flareon: { hp: 56, speed: 122, contactDamage: 19, xp: 12, behavior: 'rusher' },
};

// ======================================================================= nút bản đồ
const stages: StageDef[] = [
  {
    id: 'rocket-hideout', kind: 'event', name: 'Hang ổ Hỏa Tiễn', area: 'Celadon', x: 483, y: 210, playable: true, biome: 'rocket-hideout',
    waves: [
      [...many('raticate', 31, 4), ...many('koffing', 31, 3)],
      [...many('grimer', 32, 4), ...many('golbat', 32, 2), ...many('arbok', 32, 2)],
      [...many('koffing', 32, 3), ...many('persian', 33, 2), ...many('raticate', 32, 3)],
      [A('muk', 34), ...many('koffing', 33, 3), ...many('grimer', 33, 3)],
    ],
    catchable: ['koffing', 'grimer', 'muk', 'raticate', 'golbat', 'arbok'], levels: [31, 34], money: 780, ballsFirstClear: 2, parTimeS: 115,
    itemFirstClear: { item: 'fireStone', name: 'Đá Lửa' },
  },
  {
    id: 'cycling-road', kind: 'stage', name: 'Đường Xe Đạp – Dốc lộng gió', area: 'Đường 17', x: 462, y: 214, playable: true, biome: 'cycling-road',
    waves: [
      [...many('doduo', 32, 5), ...many('fearow', 32, 3)],
      [...many('raticate', 32, 3), ...many('grimer', 32, 2), ...many('doduo', 32, 3)],
      [...many('koffing', 33, 3), ...many('fearow', 33, 3), ...many('grimer', 33, 2)],
      [...many('dodrio', 33, 2), ...many('raticate', 33, 3), ...many('doduo', 33, 3)],
      [...many('doduo', 34, 4), ...many('koffing', 34, 2), ...many('fearow', 34, 2), A('dodrio', 35)],
    ],
    catchable: ['doduo', 'dodrio', 'fearow', 'raticate', 'grimer', 'koffing'], levels: [32, 35], money: 820, ballsFirstClear: 3, parTimeS: 130,
  },
  {
    id: 'snorlax-route', kind: 'event', name: 'Snorlax ngủ chắn đường', area: 'Đường 12', x: 441, y: 218, playable: true, biome: 'forest',
    waves: [
      [...many('venonat', 33, 4), ...many('gloom', 33, 2), ...many('pidgeotto', 33, 2)],
      [...many('exeggcute', 34, 3), ...many('venonat', 34, 3), ...many('weepinbell', 34, 2)],
      [A('snorlax', 35), ...many('venomoth', 34, 2), ...many('gloom', 34, 2)],
    ],
    catchable: ['snorlax', 'venonat', 'venomoth', 'exeggcute', 'gloom', 'weepinbell', 'pidgeotto'], levels: [33, 35], money: 800, ballsFirstClear: 3, parTimeS: 110,
  },
  {
    id: 'safari-zone', kind: 'elite', name: 'Khu Safari', area: 'Fuchsia', x: 420, y: 222, playable: true, biome: 'safari',
    waves: [
      [...many('nidoranm', 33, 3), ...many('nidoranf', 33, 3), ...many('doduo', 33, 3)],
      [...many('exeggcute', 34, 3), ...many('venonat', 34, 3), s('chansey', 35), s('eevee', 34)],
      [...many('nidorino', 35, 3), ...many('nidorina', 35, 3), ...many('tauros', 35, 2), s('kangaskhan', 35)],
      [A('scyther', 37), A('pinsir', 37), ...many('tauros', 35, 2), ...many('venomoth', 35, 2), ...many('exeggcute', 35, 2)],
    ],
    catchable: ['eevee', 'chansey', 'scyther', 'pinsir', 'tauros', 'kangaskhan', 'exeggcute', 'venonat', 'venomoth', 'doduo', 'nidoranf', 'nidorina', 'nidoranm', 'nidorino'],
    levels: [33, 37], money: 980, ballsFirstClear: 5, parTimeS: 160,
  },
  {
    id: 'route15', kind: 'stage', name: 'Đường 15 – Lối vào Fuchsia', area: 'Đường 15', x: 396, y: 223, playable: true, biome: 'blossom',
    waves: [
      [...many('venonat', 34, 4), ...many('pidgeotto', 34, 3)],
      [...many('nidorino', 35, 3), ...many('nidorina', 35, 3), ...many('gloom', 34, 2)],
      [...many('venomoth', 35, 3), ...many('exeggcute', 35, 3), ...many('weepinbell', 35, 2)],
      [...many('nidorino', 36, 3), ...many('venomoth', 36, 2), ...many('pidgeotto', 36, 3)],
      [...many('nidorina', 36, 3), ...many('venonat', 36, 2), s('nidoqueen', 36), A('nidoking', 37)],
    ],
    catchable: ['venonat', 'venomoth', 'nidorino', 'nidorina', 'nidoqueen', 'nidoking', 'exeggcute', 'pidgeotto', 'gloom', 'weepinbell'],
    levels: [34, 37], money: 860, ballsFirstClear: 3, parTimeS: 135,
  },
  { id: 'gym-fuchsia', kind: 'gym', name: 'Hội quán Fuchsia', area: 'Fuchsia', x: 372, y: 224, label: 'Fuchsia', playable: true, biome: 'gym-fuchsia', gymId: 'fuchsia', levels: [35, 39], money: 3100, parTimeS: 180 },
];

// ======================================================================= hội quán Fuchsia
const gyms: Record<string, GymDef> = {
  fuchsia: {
    id: 'fuchsia',
    city: 'Thành phố Fuchsia',
    title: 'Hội quán Fuchsia',
    leader: 'Kyo',
    leaderSprite: 'kyo',
    badgeId: 'soul',
    team: [
      { species: 'koffing', level: 35 },
      { species: 'muk', level: 36 },
      { species: 'koffing', level: 36 },
      { species: 'weezing', level: 39, boss: true },
    ],
    intro: [
      'Kyo: Hừm hừm hừm... Ngươi lần được tới đây cơ à? Ta là Kyo, ninja độc dược của Fuchsia!',
      'Kyo: Sàn đấu của ta giăng đầy tường tàng hình — chỉ khi va phải ngươi mới thấy nó. Còn trên đầu thì mưa độc rơi không ngớt.',
      'Kyo: Nhẫn thuật chân chính là đánh lừa con mắt kẻ địch. Xem ngươi trụ được bao lâu!',
    ],
    sendOut: [
      'Kyo: Koffing, giăng khói mù đi!',
      'Kyo: Muk, nhấn chìm chúng trong bùn độc!',
      'Kyo: Koffing thứ hai — tự nổ nếu cần!',
      'Kyo: Weezing! Tung tuyệt kỹ nhẫn thuật độc khí!',
    ],
    winLines: [
      'Kyo: Hừ! Ngươi đã nhìn thấu nhẫn thuật của ta...',
      'Kyo: Huy hiệu Linh Hồn là của ngươi. Kèm theo viên Đá Nước này — kẻ biết dùng sẽ thấy nó quý lắm.',
      'Kyo: Natsume ở Saffron mạnh hơn ta nhiều. Đừng để bị đọc thấu suy nghĩ đấy.',
    ],
    afterLines: ['Kyo: Hừm hừm... lần sau ta sẽ giấu tường kỹ hơn. Ngươi sẽ không thấy ta tới đâu.'],
    reward: { item: 'waterStone', name: 'Đá Nước' },
  },
};

const badges: Record<string, BadgeDef> = {
  soul: { id: 'soul', name: 'Huy hiệu Linh Hồn', texture: 'badge-soul' },
};

// Weezing của Kyo: mưa bùn độc, vòng khí độc, lao húc phun khói
const bossPatterns: Record<string, BossPattern> = {
  weezing: { type: 'poison', dropTexture: 'sludge', ringTexture: 'poison', ringCount: 18, ringSpeed: 180, glow: 0xa040a0, impact: 'poison' },
};

// Kyo: ninja áo tím sẫm, khăn quàng đỏ, tóc đen dựng
const trainerPalettes: Record<string, TrainerPalette> = {
  kyo: { skin: 0xe8b890, hair: 0x1a1a24, cap: null, shirt: 0x3a2a5a, shirtTrim: 0xc83040, arms: 0x2a1e44, pants: 0x2a1e44, shoes: 0x1a1a1a, hairStyle: 'spiky' },
};

export const CHAPTER: ChapterContent = {
  id: 'ch5',
  title: 'Chương 5 · Đường Xe Đạp → Hội quán Fuchsia',
  badgesAtStart: 4,
  species,
  moves,
  enemyStats,
  stages,
  gyms,
  badges,
  bossPatterns,
  trainerPalettes,
};
