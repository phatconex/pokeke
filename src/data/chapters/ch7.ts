// Chương 7 · Biển Seafoam → Hội quán Cinnabar (Lv 41–49).
// Đường biển 19–20, hang băng Seafoam (Articuno), dinh thự hoang phế trên đảo Cinnabar, Hội quán Cinnabar (Katsura).
import type { ChapterContent } from './types';
import { B, C, F, P } from '../moveKit';
import type { MoveDef } from '../moveKit';
import { A, many, s, sk } from '../kit';

// ======================================================================= chiêu mới
const MOVES: Record<string, MoveDef> = {
  // ---------------------------------------------------------------- Băng
  // ---- hệ Băng, bộ chiêu mới (xem skills/kits.ts → TYPE_KITS.ice + SPECIES_KITS seel/dewgong) ----
  ch7_iceShardN1: P({ id: 'ch7_iceShardN1', name: 'Mảnh Băng', type: 'ice', power: 9, cooldownMs: 400, sfx: 'waterHi', icon: 'sparkle', speed: 420, lifeMs: 620, texture: 'iceShardB', particle: 'snowdot', knockback: 40,
    chill: 0.5, archetype: 'bolt', desc: 'Bắn một mảnh băng nhọn, vệt tuyết; trúng thì vỡ thành mảnh vụn. Cộng dồn Lạnh.' }),
  ch7_iceShardN3: P({ id: 'ch7_iceShardN3', name: 'Mảnh Băng', type: 'ice', power: 12, cooldownMs: 440, sfx: 'waterHi', icon: 'sparkle', speed: 440, lifeMs: 640, texture: 'iceShardA', particle: 'snowdot', knockback: 60, pierce: true,
    chill: 0.5, archetype: 'bolt', desc: 'Ba mảnh băng lớn xòe quạt xuyên qua địch, vỡ nát thành chùm mảnh vụn. Cộng dồn Lạnh.' }),
  ch7_iceFangN1: C({ id: 'ch7_iceFangN1', name: 'Nanh Băng', type: 'ice', power: 14, cooldownMs: 900, sfx: 'dash', icon: 'fang', range: 40, halfAngleDeg: 55, particle: 'snowdot', knockback: 100, lunge: 56,
    chill: 1, archetype: 'dashStrike', desc: 'Lao ngắn cắn địch, để lại 3 tinh thể băng nhỏ mọc dọc đường lao. +1 Lạnh.' }),
  ch7_iceSlamN3: C({ id: 'ch7_iceSlamN3', name: 'Đập Băng', type: 'ice', power: 26, cooldownMs: 1900, sfx: 'waterLo', icon: 'fist', range: 56, halfAngleDeg: 70, particle: 'snowdot', knockback: 200, lunge: 30,
    chill: 1, archetype: 'dashStrike', desc: 'Đập mình xuống đất: nền nứt, hàng gai băng mọc thẳng về phía trước. +1 Lạnh.' }),
  ch7_iceBeamN1: C({ id: 'ch7_iceBeamN1', name: 'Mũi Băng', type: 'ice', power: 20, cooldownMs: 2600, sfx: 'waterHi', icon: 'wave', anim: 'shoot', animMs: 300, line: 150, lineWidth: 14, sprayMs: 520, moveSlow: 0.5,
    particle: 'snowdot', knockback: 20, chill: 1, archetype: 'lance', desc: 'Một mũi tinh thể mọc dài từng đốt ra phía trước, xuyên mọi địch; để lại mảng băng rách làm trơn.' }),
  ch7_iceBeamN3: C({ id: 'ch7_iceBeamN3', name: 'Mũi Băng Lớn', type: 'ice', power: 34, cooldownMs: 3600, sfx: 'waterLo', icon: 'wave', anim: 'shoot', animMs: 420, line: 220, lineWidth: 30, sprayMs: 700, moveSlow: 0.3,
    particle: 'snowdot', knockback: 30, chill: 1, archetype: 'lance', desc: 'Cột tinh thể lăng trụ lớn mọc dài, có nhánh con hai bên, xuyên mọi địch; đường mũi băng hóa thành mảng băng trơn.' }),
  ch7_snowGustN1: C({ id: 'ch7_snowGustN1', name: 'Gió Tuyết', type: 'ice', power: 12, cooldownMs: 3200, sfx: 'powder', icon: 'wind', anim: 'attack', animMs: 340, range: 84, halfAngleDeg: 40, particle: 'flake',
    knockback: 0, chill: 0.5, archetype: 'gale', desc: 'Thổi những đường gió tuyết dài ngang qua dải phía trước, bông tuyết bay theo gió; địch trong đó cộng dồn Lạnh.' }),
  ch7_blizzardN3: B({ id: 'ch7_blizzardN3', name: 'Mưa Băng', type: 'ice', power: 14, cooldownMs: 5200, sfx: 'waterLo', icon: 'cloud', anim: 'charge', animMs: 420, burstRadius: 60, atTarget: true, particle: 'snowdot',
    knockback: 0, chill: 0.5, archetype: 'blizzard', desc: 'Hiện bóng báo trước rồi nhiều giá băng dài rơi đâm xuống đất, để lại cụm tinh thể; gió tuyết ngang quét qua cộng dồn Lạnh.' }),
  ch7_powderSnow: P({ id: 'ch7_powderSnow', name: 'Bột Tuyết', type: 'ice', power: 7, cooldownMs: 400, sfx: 'water', icon: 'sparkle', speed: 300, lifeMs: 620, texture: 'icepuff', spin: 8, particle: 'icepuff', knockback: 30,
    count: 3, spreadDeg: 14, slow: 0.6, status: { kind: 'freeze', chance: 0.08, ms: 1200 },
    desc: 'Thổi 3 nắm tuyết hình quạt: địch trúng bị chậm lại, 8% Đóng băng.' }),
  // ---- huyền thoại Articuno (skills/kits.ts → TK.articuno, data/legendary.ts): dải cực quang · lướt băng · tinh thể lăng kính · tường băng giá ----
  ch7_auroraA: P({ id: 'ch7_auroraA', name: 'Dải Cực Quang', type: 'ice', power: 14, cooldownMs: 520, sfx: 'waterHi', icon: 'sparkle', speed: 320, lifeMs: 600, radius: 6, texture: 'iceshard', particle: 'icepuff', knockback: 40, archetype: 'aurora',
    chill: 1, desc: 'Ba dải sóng cực quang (xanh ngọc → tím) lượn đường sin, để lại vệt sương giá. Trúng = Lạnh +1.' }),
  ch7_glideA: C({ id: 'ch7_glideA', name: 'Lướt Băng', type: 'ice', power: 22, cooldownMs: 3400, sfx: 'waterHi', icon: 'wing', range: 200, halfAngleDeg: 30, particle: 'icepuff', knockback: 100, archetype: 'iceglide',
    chill: 1, desc: 'Bay vút một đường (bất tử khi lướt), để lại ĐƯỜNG BĂNG TRƠN 3 giây làm chậm địch.' }),
  ch7_prismA: B({ id: 'ch7_prismA', name: 'Tinh Thể Lăng Kính', type: 'ice', power: 36, cooldownMs: 3800, sfx: 'waterLo', icon: 'sparkle', anim: 'charge', animMs: 380, burstRadius: 90, atTarget: true, particle: 'icepuff', knockback: 160, archetype: 'prism',
    chill: 1, desc: 'Một tinh thể băng mọc dưới địch rồi khúc xạ thành 8 tia sáng thẳng hình sao.' }),
  ch7_wallA: B({ id: 'ch7_wallA', name: 'Tường Băng Giá', type: 'ice', power: 38, cooldownMs: 4800, sfx: 'waterLo', icon: 'sparkle', anim: 'charge', animMs: 380, burstRadius: 70, particle: 'icepuff', knockback: 200, archetype: 'icewall',
    chill: 1, desc: 'Dựng bức tường pha lê tiến thẳng tới, đẩy và làm Lạnh mọi địch; tường vỡ thành mảnh gây sát thương.' }),
  ch7_iceShard: P({ id: 'ch7_iceShard', name: 'Mảnh Băng', type: 'ice', power: 12, cooldownMs: 320, sfx: 'zap', icon: 'sparkle', speed: 480, lifeMs: 520, texture: 'iceshard', particle: 'icepuff', knockback: 50,
    crit: 0.2, desc: 'Mũi băng bắn cực nhanh, gần như không kịp né. 20% Chí mạng.' }),
  ch7_auroraBeam: P({ id: 'ch7_auroraBeam', name: 'Tia Cực Quang', type: 'ice', power: 16, cooldownMs: 1500, sfx: 'zap', icon: 'wave', speed: 360, lifeMs: 900, radius: 6, texture: 'iceshard', particle: 'icepuff', knockback: 80,
    pierce: true, slow: 0.5, status: { kind: 'freeze', chance: 0.1, ms: 1200 },
    desc: 'Dải cực quang xuyên qua cả hàng địch, làm chậm tất cả. 10% Đóng băng.' }),
  ch7_iceBeam: C({ id: 'ch7_iceBeam', name: 'Tia Băng', type: 'ice', power: 26, cooldownMs: 2600, sfx: 'zap', icon: 'sparkle', anim: 'shoot', animMs: 340, range: 128, halfAngleDeg: 16, sprayMs: 320, moveSlow: 0.4, particle: 'icepuff', knockback: 110,
    status: { kind: 'freeze', chance: 0.35, ms: 1600 },
    desc: 'Tia băng hẹp, tầm rất xa. 35% Đóng băng địch 1,6 giây (đòn hệ Lửa làm tan băng).' }),
  ch7_blizzard: B({ id: 'ch7_blizzard', name: 'Bão Tuyết', type: 'ice', power: 40, cooldownMs: 5600, sfx: 'thunder', icon: 'cloud', burstRadius: 125, particle: 'icepuff', knockback: 220,
    windupMs: 650, status: { kind: 'freeze', chance: 0.4, ms: 1800 },
    desc: 'Gồng 0,65 giây rồi thổi bão tuyết quanh người, vùng rất rộng. 40% Đóng băng.' }),
  ch7_bellySlide: C({ id: 'ch7_bellySlide', name: 'Trượt Bụng', type: 'ice', power: 20, cooldownMs: 1300, sfx: 'dash', icon: 'play', range: 44, halfAngleDeg: 40, particle: 'icepuff', knockback: 200,
    lunge: 110, slow: 0.5, desc: 'Nằm bụng trượt băng lao xa 110px rồi húc, làm địch chậm. Không bị trúng đòn khi đang trượt.' }),
  ch7_sheerCold: B({ id: 'ch7_sheerCold', name: 'Băng Tuyệt Đối', type: 'ice', power: 14, cooldownMs: 6500, sfx: 'thunder', icon: 'skull', burstRadius: 72, particle: 'icepuff', knockback: 0,
    windupMs: 800, halveHp: true, status: { kind: 'freeze', chance: 1, ms: 1400 },
    desc: 'Gồng 0,8 giây rồi tỏa khí lạnh tuyệt đối: cắt nửa máu hiện tại của mọi địch quanh người (thủ lĩnh: 20%) và Đóng băng chúng.' }),
  ch7_spikeCannon: P({ id: 'ch7_spikeCannon', name: 'Pháo Gai', type: 'ice', power: 6, cooldownMs: 700, sfx: 'zap', icon: 'shell', speed: 400, lifeMs: 560, texture: 'iceshard', particle: 'icepuff', knockback: 40,
    count: 5, spreadDeg: 9, desc: 'Bắn liền 5 gai băng hình quạt hẹp – càng đứng sát địch càng trúng nhiều gai.' }),
  ch7_icicleBurst: P({ id: 'ch7_icicleBurst', name: 'Nổ Gai Băng', type: 'ice', power: 16, cooldownMs: 3000, sfx: 'thunder', icon: 'sparkle', anim: 'charge', animMs: 320, speed: 300, lifeMs: 700, radius: 5, texture: 'iceshard', particle: 'icepuff', knockback: 140,
    count: 12, spreadDeg: 30, pierce: true, status: { kind: 'freeze', chance: 0.2, ms: 1200 },
    desc: 'Vỏ bung ra 12 gai băng tỏa đều mọi hướng, xuyên qua địch. 20% Đóng băng.' }),
  ch7_glacialWind: P({ id: 'ch7_glacialWind', name: 'Gió Băng Giá', type: 'ice', power: 12, cooldownMs: 1600, sfx: 'dash', icon: 'wind', speed: 290, lifeMs: 850, radius: 7, texture: 'wind', spin: 12, particle: 'icepuff', knockback: 170,
    count: 5, spreadDeg: 10, pierce: true, slow: 0.45,
    desc: 'Đập cánh tung 5 luồng gió băng xuyên thấu: đẩy lùi và làm chậm mọi địch dính phải.' }),
  ch7_mist: F({ id: 'ch7_mist', name: 'Sương Huyền Ảo', type: 'ice', power: 0, cooldownMs: 9000, sfx: 'heal', icon: 'cloud', heal: 0.12, guard: 0.55, evade: 0.3, buffMs: 5000,
    desc: 'Phủ sương băng quanh mình: hồi 12% máu, 30% né đòn và giảm 45% sát thương nhận vào trong 5 giây.' }),
  ch7_absoluteZero: B({ id: 'ch7_absoluteZero', name: 'Độ Không Tuyệt Đối', type: 'ice', power: 50, cooldownMs: 7000, sfx: 'thunder', icon: 'crown', burstRadius: 145, particle: 'icepuff', knockback: 260,
    windupMs: 900, status: { kind: 'freeze', chance: 0.75, ms: 2200 },
    desc: 'Gồng 0,9 giây rồi đóng băng cả vùng cực rộng quanh người. 75% Đóng băng 2,2 giây.' }),

  // ---------------------------------------------------------------- Siêu Linh
  ch7_lovelyKiss: C({ id: 'ch7_lovelyKiss', name: 'Nụ Hôn Ru Ngủ', type: 'psychic', power: 10, cooldownMs: 3000, sfx: 'swap', icon: 'heart', range: 48, halfAngleDeg: 40, particle: 'psypuff', knockback: 0,
    lunge: 40, drain: 0.5, status: { kind: 'sleep', chance: 1, ms: 2600 },
    desc: 'Lướt tới trao nụ hôn: địch trúng Ngủ 2,6 giây, bạn hồi 50% sát thương gây ra. Đòn kế tiếp đánh thức nó với ×1,5 sát thương.' }),

  // ---------------------------------------------------------------- Nước
  ch7_bubble: P({ id: 'ch7_bubble', name: 'Bong Bóng', type: 'water', power: 6, cooldownMs: 420, sfx: 'water', icon: 'drop', speed: 200, lifeMs: 1100, radius: 5, texture: 'bubble', particle: 'bubblepuff', knockback: 30,
    count: 2, spreadDeg: 16, homing: 3, slow: 0.7, desc: 'Thả 2 bong bóng bay chậm, hơi lượn theo địch; vỡ ra làm địch chậm lại.' }),
  ch7_smokescreen: B({ id: 'ch7_smokescreen', name: 'Phun Mực', type: 'water', power: 3, cooldownMs: 3400, sfx: 'water', icon: 'cloud', particle: 'shadowpuff', knockback: 0,
    atTarget: true, zone: { radius: 50, ms: 3000, tickMs: 450 }, slow: 0.6, status: { kind: 'confuse', chance: 0.4, ms: 1200 },
    desc: 'Phun đám mực đen tại chỗ địch (3 giây): địch trong mực bị chậm và dễ Rối loạn.' }),
  ch7_clamp: C({ id: 'ch7_clamp', name: 'Kẹp Vỏ', type: 'water', power: 12, cooldownMs: 1600, sfx: 'whip', icon: 'shell', range: 40, particle: 'bubblepuff', knockback: 0,
    lunge: 30, hits: 3, hitGapMs: 220, status: { kind: 'paralyze', chance: 1, ms: 900 },
    desc: 'Lao tới ngậm chặt địch trong vỏ: siết 3 lần, mục tiêu bị giữ đứng im.' }),
  ch7_hydroPump: C({ id: 'ch7_hydroPump', name: 'Vòi Rồng Nước', type: 'water', power: 44, cooldownMs: 4200, sfx: 'water', icon: 'drop', anim: 'shoot', animMs: 360, sprayMs: 360, moveSlow: 0.2, particle: 'bubblepuff', knockback: 320,
    windupMs: 550, line: 160, lineWidth: 26, desc: 'Gồng 0,55 giây rồi phun cột nước thẳng tắp dài 160px, hất văng mọi địch trên đường.' }),
  ch7_crabhammer: C({ id: 'ch7_crabhammer', name: 'Búa Càng', type: 'water', power: 30, cooldownMs: 1800, sfx: 'hit', icon: 'fist', range: 48, halfAngleDeg: 40, particle: 'bubblepuff', knockback: 240,
    lunge: 36, crit: 0.6, desc: 'Lao tới nện càng như búa nước. 60% Chí mạng.' }),

  // ---------------------------------------------------------------- Thường / Rồng
  ch7_viceGrip: C({ id: 'ch7_viceGrip', name: 'Kẹp Càng', type: 'normal', power: 14, cooldownMs: 800, sfx: 'whip', icon: 'claw', range: 40, halfAngleDeg: 35, particle: 'spark', knockback: 60,
    crit: 0.15, status: { kind: 'paralyze', chance: 0.3, ms: 700 }, desc: 'Kẹp mạnh bằng càng. 30% giữ chặt địch (khựng lại), 15% Chí mạng.' }),
  ch7_guillotine: C({ id: 'ch7_guillotine', name: 'Càng Chém Đứt', type: 'normal', power: 18, cooldownMs: 5200, sfx: 'whip', icon: 'claw', range: 50, halfAngleDeg: 30, particle: 'spark', knockback: 280,
    windupMs: 600, lunge: 50, halveHp: true, desc: 'Gồng càng 0,6 giây rồi lao tới kẹp đứt: cắt một nửa máu hiện tại của địch (thủ lĩnh: 20%).' }),
  ch7_stomp: B({ id: 'ch7_stomp', name: 'Giẫm Đạp', type: 'normal', power: 16, cooldownMs: 1100, sfx: 'hit', icon: 'fist', anim: 'attack', animMs: 260, burstRadius: 52, particle: 'dustpuff', knockback: 180,
    status: { kind: 'paralyze', chance: 0.3, ms: 700 }, desc: 'Dậm vó xuống đất gây chấn động quanh người. 30% làm địch khựng lại.' }),
  ch7_twister: P({ id: 'ch7_twister', name: 'Lốc Rồng', type: 'dragon', power: 14, cooldownMs: 1800, sfx: 'dash', icon: 'whirl', speed: 230, lifeMs: 1300, radius: 7, texture: 'wind', spin: 16, particle: 'dragonpuff', knockback: 120,
    count: 2, spreadDeg: 30, boomerang: true, pierce: true, status: { kind: 'confuse', chance: 0.2, ms: 1200 },
    desc: 'Hai cơn lốc rồng bay chéo ra rồi quay về, xuyên qua mọi địch. 20% Rối loạn.' }),

  // ---------------------------------------------------------------- Độc
  ch7_constrict: C({ id: 'ch7_constrict', name: 'Xúc Tu Quất', type: 'poison', power: 9, cooldownMs: 1300, sfx: 'whip', icon: 'whirl', animMs: 300, sprayMs: 300, moveSlow: 0.4, particle: 'poisonpuff', knockback: 60,
    line: 104, lineWidth: 16, hits: 3, hitGapMs: 140, slow: 0.6, status: { kind: 'poison', chance: 0.25, ms: 3000 },
    desc: 'Quất xúc tu dài 3 lần liên tiếp theo đường thẳng: làm chậm, 25% Nhiễm độc.' }),
  ch7_toxicSpikes: B({ id: 'ch7_toxicSpikes', name: 'Rải Gai Độc', type: 'poison', power: 6, cooldownMs: 3600, sfx: 'leaf', icon: 'skull', particle: 'poisonpuff', knockback: 0,
    atTarget: true, zone: { radius: 58, ms: 4500, tickMs: 500 }, slow: 0.7, status: { kind: 'poison', chance: 0.7, ms: 3500 },
    desc: 'Rải bãi gai độc rộng tại chỗ địch (4,5 giây): ai giẫm vào bị chậm và dễ Nhiễm độc.' }),
  ch7_sludgeWave: B({ id: 'ch7_sludgeWave', name: 'Sóng Bùn Độc', type: 'poison', power: 34, cooldownMs: 4800, sfx: 'water', icon: 'wave', burstRadius: 120, particle: 'poisonpuff', knockback: 220,
    status: { kind: 'poison', chance: 0.6, ms: 3500 }, desc: 'Dâng sóng bùn độc tràn ra quanh người, vùng rộng. 60% Nhiễm độc.' }),
  ch7_smog: C({ id: 'ch7_smog', name: 'Khói Độc', type: 'poison', power: 12, cooldownMs: 1200, sfx: 'leaf', icon: 'cloud', anim: 'shoot', animMs: 300, range: 72, halfAngleDeg: 40, sprayMs: 300, particle: 'poisonpuff', knockback: 60,
    status: { kind: 'poison', chance: 0.45, ms: 3000 }, desc: 'Phả khói độc mù mịt hình quạt trước mặt. 45% Nhiễm độc.' }),

  // ---------------------------------------------------------------- Lửa
  ch7_flameCharge: C({ id: 'ch7_flameCharge', name: 'Lao Lửa', type: 'fire', power: 18, cooldownMs: 1400, sfx: 'dash', icon: 'flame', range: 44, halfAngleDeg: 45, particle: 'flamepuff', knockback: 200,
    lunge: 120, stack: 0.3, status: { kind: 'burn', chance: 0.3, ms: 2500 },
    desc: 'Phi nước đại 120px trong lửa rồi húc. Dùng liền nhau mạnh dần +30% mỗi lần. 30% Bỏng.' }),
  ch7_flareBlitz: C({ id: 'ch7_flareBlitz', name: 'Cuồng Hỏa Xung Kích', type: 'fire', power: 46, cooldownMs: 3800, sfx: 'flame', icon: 'flame', range: 54, halfAngleDeg: 50, particle: 'flamepuff', knockback: 320,
    windupMs: 450, lunge: 140, crit: 0.25, status: { kind: 'burn', chance: 0.5, ms: 3000 },
    desc: 'Gồng 0,45 giây, bốc cháy toàn thân rồi lao xa 140px húc tung địch. 50% Bỏng, 25% Chí mạng.' }),
  ch7_firePunch: C({ id: 'ch7_firePunch', name: 'Quyền Lửa', type: 'fire', power: 11, cooldownMs: 700, sfx: 'whip', icon: 'fist', range: 42, particle: 'flamepuff', knockback: 130,
    lunge: 26, hits: 2, hitGapMs: 130, status: { kind: 'burn', chance: 0.2, ms: 2500 }, desc: 'Lao tới đấm lửa hai tay liên tiếp. 20% Bỏng.' }),
  ch7_fireSpin: B({ id: 'ch7_fireSpin', name: 'Lốc Lửa', type: 'fire', power: 8, cooldownMs: 3400, sfx: 'flame', icon: 'whirl', particle: 'flamepuff', knockback: 0,
    atTarget: true, zone: { radius: 52, ms: 3000, tickMs: 400 }, slow: 0.6, status: { kind: 'burn', chance: 0.35, ms: 2500 },
    desc: 'Dựng lốc lửa tại chỗ địch (3 giây): địch mắc kẹt bị chậm, bị đốt liên tục và dễ Bỏng.' }),
  ch7_fireBlast: P({ id: 'ch7_fireBlast', name: 'Đại Hỏa', type: 'fire', power: 40, cooldownMs: 4600, sfx: 'flame', icon: 'flame', anim: 'charge', animMs: 340, speed: 260, lifeMs: 900, radius: 8, texture: 'fireball', particle: 'flamepuff', knockback: 260,
    windupMs: 500, explode: 72, status: { kind: 'burn', chance: 0.6, ms: 3500 },
    desc: 'Gồng 0,5 giây rồi ném khối lửa hình ngôi sao, nổ tung một vùng rất rộng. 60% Bỏng.' }),

  // ---------------------------------------------------------------- Giác Đấu
  ch7_submission: C({ id: 'ch7_submission', name: 'Vật Ngã', type: 'fighting', power: 28, cooldownMs: 1700, sfx: 'hit', icon: 'fist', range: 46, halfAngleDeg: 40, particle: 'dustpuff', knockback: 300,
    lunge: 50, crit: 0.2, status: { kind: 'paralyze', chance: 0.5, ms: 900 },
    desc: 'Lao tới tóm lấy rồi quật ngã: hất văng xa, 50% làm địch choáng, 20% Chí mạng.' }),
  ch7_dynamicPunch: C({ id: 'ch7_dynamicPunch', name: 'Đấm Bộc Phá', type: 'fighting', power: 46, cooldownMs: 4200, sfx: 'hit', icon: 'fist', range: 50, halfAngleDeg: 40, particle: 'spark', knockback: 320,
    windupMs: 500, lunge: 60, status: { kind: 'confuse', chance: 1, ms: 2200 },
    desc: 'Gồng 0,5 giây rồi tung cú đấm nổ tung: địch trúng chắc chắn Rối loạn 2,2 giây.' }),
};

// ======================================================================= ải
const STAGES: ChapterContent['stages'] = [
  {
    id: 'sea-route', kind: 'stage', name: 'Đường biển 19 – Bãi cát giữa khơi', area: 'Đường 19', x: 272, y: 234, playable: true, biome: 'sea-route',
    waves: [
      [...many('tentacool', 41, 5), ...many('horsea', 41, 3)],
      [...many('krabby', 41, 4), ...many('poliwag', 41, 3)],
      [...many('shellder', 42, 4), ...many('tentacool', 42, 3), s('seel', 42)],
      [...many('horsea', 42, 3), ...many('poliwhirl', 43, 2), ...many('krabby', 42, 3)],
      [...many('tentacool', 43, 4), s('seadra', 43), s('kingler', 43), A('tentacruel', 44)],
    ],
    catchable: ['tentacool', 'tentacruel', 'horsea', 'seadra', 'krabby', 'kingler', 'poliwag', 'poliwhirl', 'shellder', 'seel'],
    levels: [41, 44], money: 1040, ballsFirstClear: 3, parTimeS: 135,
  },
  {
    id: 'seafoam', kind: 'event', name: 'Hang băng Seafoam – Tiếng kêu giá lạnh', area: 'Quần đảo Seafoam', x: 252, y: 244, playable: true, biome: 'seafoam',
    waves: [
      [...many('seel', 43, 5), ...many('shellder', 43, 3)],
      [...many('horsea', 43, 3), ...many('dewgong', 44, 2), ...many('shellder', 44, 3)],
      [...many('cloyster', 44, 2), ...many('seel', 44, 4), s('dewgong', 45)],
      [s('dewgong', 46), s('cloyster', 46), A('articuno', 50)],
    ],
    catchable: ['articuno', 'seel', 'dewgong', 'shellder', 'cloyster', 'horsea'],
    levels: [43, 50], money: 1100, ballsFirstClear: 3, parTimeS: 115,
    itemFirstClear: { item: 'waterStone', name: 'Đá Nước' },
  },
  {
    id: 'cinnabar-mansion', kind: 'elite', name: 'Dinh thự hoang trên đảo Cinnabar', area: 'Đảo Cinnabar', x: 236, y: 228, playable: true, biome: 'mansion',
    waves: [
      [...many('ponyta', 45, 4), ...many('koffing', 45, 3), ...many('grimer', 45, 2)],
      [...many('growlithe', 45, 3), ...many('vulpix', 45, 3), ...many('magmar', 46, 2)],
      [...many('rapidash', 46, 2), ...many('weezing', 46, 2), ...many('ponyta', 46, 3), s('muk', 46)],
      [...many('magmar', 47, 2), ...many('ponyta', 46, 3), A('magmar', 48), A('rapidash', 48)],
    ],
    catchable: ['ponyta', 'rapidash', 'magmar', 'growlithe', 'vulpix', 'koffing', 'grimer'],
    levels: [45, 48], money: 1280, ballsFirstClear: 3, parTimeS: 160,
  },
  {
    id: 'gym-cinnabar', kind: 'gym', name: 'Hội quán Cinnabar', area: 'Cinnabar', x: 236, y: 204, label: 'Cinnabar', playable: true, biome: 'gym-cinnabar',
    gymId: 'cinnabar', levels: [45, 49], money: 4500, parTimeS: 180,
  },
];

// ======================================================================= nội dung chương
export const CHAPTER: ChapterContent = {
  id: 'ch7',
  title: 'Chương 7 · Biển Seafoam → Hội quán Cinnabar',
  badgesAtStart: 6,
  moves: MOVES,

  species: {
    seel: {
      dex: 86, name: 'Seel', types: ['water'], body: { w: 15, h: 10 }, fallbackColor: 0xe8eef8,
      base: { hp: 112, atk: 50, speed: 100 }, skills: sk('ch7_iceShardN1', 'ch7_iceFangN1', ['ch7_iceBeamN1', 28], ['ch7_snowGustN1', 32]),
      evolution: { into: 'dewgong', level: 34 }, catchRate: 190,
      blurb: 'Hải cẩu tinh nghịch, thích trượt bụng trên băng để húc đối thủ.',
    },
    dewgong: {
      dex: 87, name: 'Dewgong', types: ['water', 'ice'], body: { w: 20, h: 12 }, fallbackColor: 0xf0f4fc, scale: 1.3,
      base: { hp: 140, atk: 66, speed: 106 }, skills: sk('ch7_iceShardN3', 'ch7_iceSlamN3', ['ch7_iceBeamN3', 1], ['ch7_blizzardN3', 1]), catchRate: 75,
      blurb: 'Bơi trong nước băng như không. Hơi lạnh của nó cắt nửa sinh lực kẻ địch.',
    },
    shellder: {
      dex: 90, name: 'Shellder', types: ['water'], body: { w: 13, h: 9 }, fallbackColor: 0x9a7ac8,
      base: { hp: 96, atk: 56, speed: 92 }, skills: sk('ch7_iceShard', 'withdraw', ['ch7_clamp', 20], ['ch7_auroraBeam', 30]),
      evolution: { into: 'cloyster', item: 'waterStone' }, catchRate: 190,
      blurb: 'Vỏ cứng hơn kim cương. Ngậm chặt đối thủ rồi không chịu nhả.',
    },
    cloyster: {
      dex: 91, name: 'Cloyster', types: ['water', 'ice'], body: { w: 20, h: 14 }, fallbackColor: 0x6a5aa0, scale: 1.35,
      base: { hp: 124, atk: 76, speed: 98 }, skills: sk('ch7_spikeCannon', 'withdraw', ['ch7_iceShard', 1], ['ch7_icicleBurst', 1]), catchRate: 60,
      blurb: 'Pháo đài gai băng: thủ trong vỏ rồi bắn gai ra tứ phía.',
    },
    horsea: {
      dex: 116, name: 'Horsea', types: ['water'], body: { w: 12, h: 10 }, fallbackColor: 0x70b0e8,
      base: { hp: 86, atk: 58, speed: 122 }, skills: sk('ch7_bubble', 'ch7_smokescreen', ['ch7_twister', 22]),
      evolution: { into: 'seadra', level: 32 }, catchRate: 225,
      blurb: 'Phun mực làm rối mắt kẻ thù rồi lặn đi thật nhanh.',
    },
    seadra: {
      dex: 117, name: 'Seadra', types: ['water'], body: { w: 16, h: 12 }, fallbackColor: 0x5098d8,
      base: { hp: 110, atk: 72, speed: 128 }, skills: sk('ch7_bubble', 'ch7_smokescreen', ['ch7_twister', 1], ['ch7_hydroPump', 1]), catchRate: 75,
      blurb: 'Vây lưng có độc. Vòi rồng nước của nó đủ sức đánh chìm thuyền nhỏ.',
    },
    krabby: {
      dex: 98, name: 'Krabby', types: ['water'], body: { w: 14, h: 9 }, fallbackColor: 0xe86040,
      base: { hp: 92, atk: 70, speed: 104 }, skills: sk('ch7_viceGrip', 'ch7_bubble', ['harden', 18], ['ch7_crabhammer', 26]),
      evolution: { into: 'kingler', level: 28 }, catchRate: 225,
    },
    kingler: {
      dex: 99, name: 'Kingler', types: ['water'], body: { w: 20, h: 12 }, fallbackColor: 0xd84a30, scale: 1.3,
      base: { hp: 118, atk: 90, speed: 100 }, skills: sk('ch7_viceGrip', 'ch7_bubble', ['ch7_crabhammer', 1], ['ch7_guillotine', 1]), catchRate: 60,
      blurb: 'Chiếc càng khổng lồ nặng ngang cả thân, một cú kẹp có thể bẻ gãy thép.',
    },
    tentacool: {
      dex: 72, name: 'Tentacool', types: ['water', 'poison'], body: { w: 13, h: 10 }, fallbackColor: 0x60a8e0,
      base: { hp: 92, atk: 50, speed: 112 }, skills: sk('acid', 'ch7_constrict', ['ch7_toxicSpikes', 20]),
      evolution: { into: 'tentacruel', level: 30 }, catchRate: 190,
    },
    tentacruel: {
      dex: 73, name: 'Tentacruel', types: ['water', 'poison'], body: { w: 18, h: 13 }, fallbackColor: 0x4a90d0, scale: 1.3,
      base: { hp: 124, atk: 72, speed: 112 }, skills: sk('acid', 'ch7_constrict', ['ch7_toxicSpikes', 1], ['ch7_sludgeWave', 1]), catchRate: 60,
      blurb: '80 xúc tu độc quất tứ phía. Biển nơi nó qua thường phải đóng cửa.',
    },
    jynx: {
      dex: 124, name: 'Jynx', types: ['ice', 'psychic'], body: { w: 15, h: 12 }, fallbackColor: 0xd04060,
      base: { hp: 108, atk: 74, speed: 106 }, skills: sk('ch7_powderSnow', 'ch7_lovelyKiss', ['ch7_iceBeam', 30], ['ch7_blizzard', 40]), catchRate: 45,
      blurb: 'Vừa múa vừa ru ngủ đối thủ bằng nụ hôn, rồi thổi bão tuyết.',
    },
    ponyta: {
      dex: 77, name: 'Ponyta', types: ['fire'], body: { w: 15, h: 11 }, fallbackColor: 0xf8c060,
      base: { hp: 92, atk: 66, speed: 136 }, skills: sk('ember', 'ch7_stomp', ['ch7_flameCharge', 24], ['flamethrower', 30]),
      evolution: { into: 'rapidash', level: 40 }, catchRate: 190,
      blurb: 'Bờm lửa không làm bỏng người nó tin tưởng. Càng chạy càng nhanh.',
    },
    rapidash: {
      dex: 78, name: 'Rapidash', types: ['fire'], body: { w: 20, h: 14 }, fallbackColor: 0xf8b050, scale: 1.3,
      base: { hp: 112, atk: 80, speed: 150 }, skills: sk('ember', 'ch7_stomp', ['ch7_flameCharge', 1], ['ch7_flareBlitz', 1]), catchRate: 60,
      blurb: 'Phi nước đại 240 km/giờ, để lại vệt lửa sau lưng.',
    },
    magmar: {
      dex: 126, name: 'Magmar', types: ['fire'], body: { w: 16, h: 12 }, fallbackColor: 0xf06030,
      base: { hp: 116, atk: 82, speed: 110 }, skills: sk('ch7_firePunch', 'ch7_smog', ['ch7_fireSpin', 30], ['ch7_fireBlast', 38]), catchRate: 45,
      blurb: 'Sinh ra trong miệng núi lửa. Thân nhiệt hơn 1.200 độ.',
    },
    articuno: {
      dex: 144, name: 'Articuno', types: ['ice', 'flying'], body: { w: 22, h: 14 }, fallbackColor: 0x80c8f0, scale: 1.5,
      base: { hp: 190, atk: 118, speed: 112 }, skills: sk('ch7_auroraA', 'ch7_glideA', ['ch7_prismA', 1], ['ch7_wallA', 1]), catchRate: 15,
      blurb: 'Chim huyền thoại của băng giá. Mỗi lần vỗ cánh, không khí đóng thành tuyết.',
    },
    poliwag: {
      dex: 60, name: 'Poliwag', types: ['water'], body: { w: 13, h: 10 }, fallbackColor: 0x6080d0,
      base: { hp: 96, atk: 50, speed: 112 }, skills: sk('ch7_bubble', 'doubleSlap', ['hypnosis', 16]),
      evolution: { into: 'poliwhirl', level: 25 }, catchRate: 255,
    },
    poliwhirl: {
      dex: 61, name: 'Poliwhirl', types: ['water'], body: { w: 15, h: 11 }, fallbackColor: 0x5070c8,
      base: { hp: 116, atk: 64, speed: 116 }, skills: sk('ch7_bubble', 'doubleSlap', ['hypnosis', 1], ['waterPulse', 30]),
      evolution: { into: 'poliwrath', item: 'waterStone' }, catchRate: 120,
      blurb: 'Nhìn vào vòng xoắn trên bụng nó lâu sẽ buồn ngủ.',
    },
    poliwrath: {
      dex: 62, name: 'Poliwrath', types: ['water', 'fighting'], body: { w: 18, h: 13 }, fallbackColor: 0x4060b8, scale: 1.3,
      base: { hp: 136, atk: 82, speed: 112 }, skills: sk('ch7_bubble', 'ch7_submission', ['hypnosis', 1], ['ch7_dynamicPunch', 1]), catchRate: 45,
      blurb: 'Võ sĩ bơi lội: ru ngủ đối thủ rồi tung cú đấm bộc phá.',
    },
  },

  enemyStats: {
    seel: { hp: 46, speed: 100, contactDamage: 12, xp: 7, behavior: 'rusher' },
    dewgong: {
      hp: 70, speed: 80, contactDamage: 16, xp: 11, behavior: 'ranged', bossHp: 440,
      rangedDamage: 15, rangedCooldownMs: 2000, rangedTelegraphMs: 550, rangedProjectileSpeed: 200, preferredRange: 140, rangedTexture: 'iceshard',
    },
    shellder: { hp: 40, speed: 45, contactDamage: 12, xp: 6, behavior: 'tank' },
    cloyster: {
      hp: 80, speed: 45, contactDamage: 18, xp: 12, behavior: 'ranged', bossHp: 460,
      rangedDamage: 16, rangedCooldownMs: 2200, rangedTelegraphMs: 600, rangedProjectileSpeed: 210, preferredRange: 120, rangedTexture: 'iceshard',
    },
    horsea: {
      hp: 26, speed: 70, contactDamage: 8, xp: 5, behavior: 'ranged',
      rangedDamage: 12, rangedCooldownMs: 1900, rangedTelegraphMs: 500, rangedProjectileSpeed: 190, preferredRange: 150, rangedTexture: 'bubble',
    },
    seadra: {
      hp: 48, speed: 80, contactDamage: 12, xp: 10, behavior: 'ranged',
      rangedDamage: 15, rangedCooldownMs: 1700, rangedTelegraphMs: 450, rangedProjectileSpeed: 230, preferredRange: 160, rangedTexture: 'bubble',
    },
    krabby: { hp: 36, speed: 95, contactDamage: 14, xp: 6, behavior: 'rusher' },
    kingler: { hp: 66, speed: 100, contactDamage: 19, xp: 11, behavior: 'rusher' },
    tentacool: {
      hp: 30, speed: 80, contactDamage: 10, xp: 5, behavior: 'ranged',
      rangedDamage: 12, rangedCooldownMs: 2200, rangedTelegraphMs: 550, rangedProjectileSpeed: 170, preferredRange: 130, rangedTexture: 'poison',
    },
    tentacruel: {
      hp: 62, speed: 85, contactDamage: 15, xp: 11, behavior: 'ranged',
      rangedDamage: 15, rangedCooldownMs: 1900, rangedTelegraphMs: 500, rangedProjectileSpeed: 190, preferredRange: 140, rangedTexture: 'sludge',
    },
    jynx: {
      hp: 50, speed: 65, contactDamage: 11, xp: 11, behavior: 'ranged', bossHp: 420,
      rangedDamage: 16, rangedCooldownMs: 2000, rangedTelegraphMs: 600, rangedProjectileSpeed: 180, preferredRange: 160, rangedTexture: 'iceshard',
    },
    ponyta: { hp: 36, speed: 140, contactDamage: 13, xp: 7, behavior: 'rusher' },
    rapidash: { hp: 58, speed: 150, contactDamage: 18, xp: 11, behavior: 'rusher', bossHp: 420 },
    magmar: {
      hp: 60, speed: 70, contactDamage: 15, xp: 12, behavior: 'ranged',
      rangedDamage: 16, rangedCooldownMs: 1900, rangedTelegraphMs: 550, rangedProjectileSpeed: 200, preferredRange: 140, rangedTexture: 'fireball',
    },
    articuno: {
      hp: 90, speed: 95, contactDamage: 18, xp: 14, behavior: 'ranged', bossHp: 480,
      rangedDamage: 18, rangedCooldownMs: 1500, rangedTelegraphMs: 500, rangedProjectileSpeed: 240, preferredRange: 160, rangedTexture: 'iceshard',
    },
    poliwag: { hp: 28, speed: 105, contactDamage: 8, xp: 4, behavior: 'rusher' },
    poliwhirl: {
      hp: 44, speed: 90, contactDamage: 11, xp: 7, behavior: 'ranged',
      rangedDamage: 13, rangedCooldownMs: 2100, rangedTelegraphMs: 550, rangedProjectileSpeed: 180, preferredRange: 140, rangedTexture: 'bubble',
    },
    poliwrath: { hp: 72, speed: 95, contactDamage: 18, xp: 12, behavior: 'rusher' },
  },

  stages: STAGES,

  gyms: {
    cinnabar: {
      id: 'cinnabar',
      city: 'Đảo Cinnabar',
      title: 'Hội quán Cinnabar',
      leader: 'Katsura',
      leaderSprite: 'katsura',
      badgeId: 'volcano',
      team: [
        { species: 'growlithe', level: 45 },
        { species: 'ponyta', level: 45 },
        { species: 'rapidash', level: 46 },
        { species: 'arcanine', level: 49, boss: true },
      ],
      // hội quán động: 3 con bốc từ kho (khác loài), rồi át chủ bài
      pool: [
        { species: 'growlithe', level: 45 },
        { species: 'ponyta', level: 45 },
        { species: 'rapidash', level: 46 },
        { species: 'flareon', level: 46 },
        { species: 'magmar', level: 46 },
        { species: 'ninetales', level: 47 },
      ],
      pick: 3,
      ace: { species: 'arcanine', level: 49, boss: true },
      tuning: { attackSpeed: 1.2, aceHp: 0.45, aceDmg: 0.85 },
      intro: [
        'Katsura: Hô hô! Ta là Katsura, thủ lĩnh nóng bỏng nhất đảo Cinnabar!',
        'Katsura: Câu đố đây: thứ gì càng dội nước càng sôi sục? Đáp án: ý chí chiến đấu của ta! Hô hô!',
        'Katsura: Miệng núi lửa dưới sàn đỏ rực lên là sắp phun đấy. Né kịp thì tốt, không thì... chín tới!',
      ],
      sendOut: [
        'Katsura: Growlithe, khởi động lò nào!',
        'Katsura: Ponyta, phi nước đại!',
        'Katsura: Rapidash, đốt cháy đường đua!',
        'Katsura: Arcanine! Câu trả lời cuối cùng của ta!',
      ],
      winLines: [
        'Katsura: Hô hô... ngọn lửa của ta bị dập tắt hoàn toàn rồi!',
        'Katsura: Cậu đã giải được câu đố khó nhất của ta. Huy hiệu Núi Lửa là của cậu!',
        'Katsura: Cầm luôn Đá Lửa này — nó sẽ thắp lên sức mạnh tiềm ẩn của vài Pokémon đấy.',
      ],
      afterLines: [
        'Katsura: Câu đố hôm nay: ai sẽ là người tiếp theo thách đấu Hội quán Viridian? Hô hô, ta đoán là cậu!',
      ],
      reward: { item: 'fireStone', name: 'Đá Lửa' },
    },
  },

  badges: {
    volcano: { id: 'volcano', name: 'Huy hiệu Núi Lửa', texture: 'badge-volcano' },
  },

  bossPatterns: {
    articuno: { type: 'ice', dropTexture: 'iceshard', ringTexture: 'iceshard', ringCount: 18, ringSpeed: 190, glow: 0x9ae8ff, impact: 'ice' },
  },

  trainerPalettes: {
    // nhà khoa học hói, râu trắng, áo blouse trắng viền đỏ cam
    katsura: { skin: 0xf0c098, hair: 0xe8e8e8, cap: null, shirt: 0xf4f4f4, shirtTrim: 0xd84a20, arms: 0xf4f4f4, pants: 0x4a3a3a, shoes: 0x2a2a2a, hairStyle: 'bald' },
  },
};
