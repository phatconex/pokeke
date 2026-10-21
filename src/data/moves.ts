// Định nghĩa chiêu thức. Mỗi loài mở dần các ô chiêu J / K / L / U theo cấp (xem learnset trong pokemon.ts).
// Chiêu của chương 1–3 ở đây; chiêu các chương sau nằm trong data/chapters/* và được gộp vào MOVES.
import { B, C, F, MoveDef, P, STATUS_LABEL } from './moveKit';
import { CHAPTERS } from './chapters';
import { tr } from '../i18n';
import { COMBAT, SKILL_UPGRADE } from '../config/balance';
import { statusLabel } from '../i18n/content';

export * from './moveKit';

const CORE_MOVES: Record<string, MoveDef> = {
  // ================================================================ đạn
  ember: P({ id: 'ember', name: 'Đốm Lửa', type: 'fire', power: 12, cooldownMs: 320, sfx: 'ember', icon: 'flame', texture: 'fireball', particle: 'flamepuff',
    status: { kind: 'burn', chance: 0.25, ms: 2500 }, desc: 'Cầu lửa nhỏ. 25% gây Bỏng (mất máu dần).' }),
  thundershock: P({ id: 'thundershock', name: 'Điện Giật', type: 'electric', power: 10, cooldownMs: 260, sfx: 'zap', icon: 'bolt', speed: 430, lifeMs: 560, texture: 'zap', particle: 'zappuff', knockback: 50,
    chain: 1, status: { kind: 'paralyze', chance: 0.15, ms: 700 }, desc: 'Tia điện nảy sang 1 địch gần đó. 15% gây Tê liệt.' }),
  razorLeaf: P({ id: 'razorLeaf', name: 'Lá Sắc', type: 'grass', power: 7, cooldownMs: 420, sfx: 'leaf', icon: 'leaf', speed: 330, lifeMs: 1300, texture: 'leaf', spin: 16, count: 2, spreadDeg: 12, particle: 'leafpuff', knockback: 40,
    boomerang: true, pierce: true, desc: 'Lá bay ra rồi quay về như boomerang, xuyên qua mọi địch trên đường.' }),
  waterGun: P({ id: 'waterGun', name: 'Súng Nước', type: 'water', power: 11, cooldownMs: 340, sfx: 'water', icon: 'drop', speed: 340, texture: 'bubble', particle: 'bubblepuff', knockback: 190,
    desc: 'Tia nước đẩy lùi địch rất mạnh – giữ khoảng cách an toàn.' }),
  stringShot: P({ id: 'stringShot', name: 'Nhả Tơ', type: 'bug', power: 5, cooldownMs: 520, sfx: 'leaf', icon: 'leaf', speed: 280, texture: 'string', particle: 'leafpuff', slow: 0.35, knockback: 20,
    desc: 'Tơ dính làm địch chậm hẳn trong 2 giây.' }),
  poisonSting: P({ id: 'poisonSting', name: 'Kim Độc', type: 'poison', power: 9, cooldownMs: 360, sfx: 'zap', icon: 'skull', speed: 380, texture: 'needle', particle: 'poisonpuff',
    status: { kind: 'poison', chance: 0.35, ms: 3000 }, desc: 'Kim độc bay nhanh. 35% gây Nhiễm độc.' }),
  gust: P({ id: 'gust', name: 'Gió Xoáy', type: 'flying', power: 10, cooldownMs: 460, sfx: 'dash', icon: 'wind', speed: 280, lifeMs: 900, radius: 7, texture: 'wind', spin: 12, particle: 'windpuff', knockback: 170,
    pierce: true, desc: 'Lốc xoáy to xuyên qua cả đám, cuốn địch ra xa.' }),
  absorb: P({ id: 'absorb', name: 'Hút Năng Lượng', type: 'grass', power: 9, cooldownMs: 420, sfx: 'leaf', icon: 'heart', speed: 300, texture: 'seed', particle: 'leafpuff', drain: 0.6,
    desc: 'Hút sinh lực: hồi máu bằng 60% sát thương gây ra.' }),
  rockThrow: P({ id: 'rockThrow', name: 'Ném Đá', type: 'rock', power: 15, cooldownMs: 620, sfx: 'hit', icon: 'rock', speed: 260, texture: 'rockball', particle: 'dustpuff', knockback: 120,
    explode: 34, desc: 'Tảng đá vỡ tung khi trúng, gây sát thương cả vùng nhỏ.' }),
  leechLife: P({ id: 'leechLife', name: 'Hút Máu', type: 'bug', power: 10, cooldownMs: 400, sfx: 'zap', icon: 'fang', speed: 340, texture: 'needle', particle: 'poisonpuff', drain: 0.5, crit: 0.15,
    desc: 'Cắn hút máu: hồi 50% sát thương, 15% Chí mạng.' }),
  swift: P({ id: 'swift', name: 'Sao Băng', type: 'normal', power: 7, cooldownMs: 420, sfx: 'pickup', icon: 'star', speed: 330, lifeMs: 1100, texture: 'starshot', spin: 18, count: 3, spreadDeg: 18, particle: 'spark',
    homing: 7, desc: 'Ba ngôi sao tự đuổi theo địch – gần như không bao giờ trượt.' }),
  mudShot: P({ id: 'mudShot', name: 'Bắn Bùn', type: 'ground', power: 12, cooldownMs: 460, sfx: 'hit', icon: 'drop', speed: 300, texture: 'mud', particle: 'dustpuff', slow: 0.5, explode: 22,
    desc: 'Bùn văng tung tóe, làm chậm mọi địch quanh chỗ trúng.' }),
  acid: P({ id: 'acid', name: 'Axit', type: 'poison', power: 10, cooldownMs: 520, sfx: 'leaf', icon: 'skull', speed: 260, texture: 'poison', particle: 'poisonpuff', explode: 28,
    status: { kind: 'poison', chance: 0.3, ms: 3000 }, desc: 'Axit bắn tung tóe theo vùng. 30% gây Nhiễm độc.' }),
  leechSeed: P({ id: 'leechSeed', name: 'Gieo Hạt', type: 'grass', power: 4, cooldownMs: 2600, sfx: 'leaf', icon: 'seed', speed: 260, texture: 'seed', particle: 'leafpuff', knockback: 0, count: 3, spreadDeg: 16,
    status: { kind: 'seed', chance: 1, ms: 5000 }, desc: 'Gieo 3 hạt: địch trúng bị hút máu dần 5 giây, máu đó hồi cho bạn.' }),
  waterPulse: P({ id: 'waterPulse', name: 'Sóng Nước', type: 'water', power: 20, cooldownMs: 2200, sfx: 'water', icon: 'wave', speed: 250, radius: 7, texture: 'bubble', particle: 'bubblepuff', knockback: 160,
    explode: 44, status: { kind: 'confuse', chance: 0.35, ms: 1800 }, desc: 'Quả cầu nước nổ thành sóng tròn. 35% gây Rối loạn.' }),
  flameBurst: P({ id: 'flameBurst', name: 'Bùng Lửa', type: 'fire', power: 26, cooldownMs: 3200, sfx: 'flame', icon: 'flame', anim: 'charge', animMs: 340, speed: 240, radius: 7, texture: 'fireball', particle: 'flamepuff', knockback: 180,
    explode: 56, status: { kind: 'burn', chance: 0.5, ms: 3000 }, desc: 'Cầu lửa lớn nổ tung cả vùng. 50% gây Bỏng mọi địch dính.' }),

  payDay: P({ id: 'payDay', name: 'Ném Xu', type: 'normal', power: 8, cooldownMs: 360, sfx: 'pickup', icon: 'coin', speed: 360, texture: 'coinshot', spin: 14, particle: 'spark', knockback: 40,
    money: 2, desc: 'Ném xu vàng: mỗi lần trúng nhặt thêm 2₽ (nhận khi thắng ải).' }),
  psybeam: P({ id: 'psybeam', name: 'Tia Siêu Linh', type: 'psychic', power: 12, cooldownMs: 460, sfx: 'zap', icon: 'spiral', speed: 330, radius: 5, texture: 'psyball', particle: 'psypuff',
    pierce: true, status: { kind: 'confuse', chance: 0.2, ms: 1500 }, desc: 'Tia siêu linh xuyên qua cả hàng địch. 20% gây Rối loạn.' }),
  mudSlap: P({ id: 'mudSlap', name: 'Hất Bùn', type: 'ground', power: 10, cooldownMs: 420, sfx: 'hit', icon: 'drop', speed: 300, texture: 'mud', particle: 'dustpuff',
    status: { kind: 'confuse', chance: 0.25, ms: 1200 }, desc: 'Hất bùn vào mắt địch. 25% làm địch Rối loạn (lóa mắt).' }),
  sonicBoom: P({ id: 'sonicBoom', name: 'Sóng Âm', type: 'normal', power: 0, cooldownMs: 700, sfx: 'zap', icon: 'wave', speed: 380, radius: 6, texture: 'wind', particle: 'windpuff', knockback: 60,
    pierce: true, fixedPerLevel: 2.2, desc: 'Sóng âm xuyên thấu, luôn gây sát thương cố định theo cấp (không bị khắc hệ).' }),

  // ================================================================ cận chiến
  peck: C({ id: 'peck', name: 'Mổ', type: 'flying', power: 12, cooldownMs: 380, sfx: 'whip', icon: 'wing', range: 40, particle: 'windpuff', knockback: 80, lunge: 24,
    desc: 'Lao tới mổ nhanh, hồi chiêu rất ngắn.' }),
  furyAttack: C({ id: 'furyAttack', name: 'Đâm Loạn', type: 'normal', power: 6, cooldownMs: 900, sfx: 'whip', icon: 'horn', range: 44, particle: 'dustpuff', knockback: 50, randomHits: [2, 5], hitGapMs: 90,
    desc: 'Đâm liên tục ngẫu nhiên 2–5 lần.' }),
  drillPeck: C({ id: 'drillPeck', name: 'Mỏ Khoan', type: 'flying', power: 30, cooldownMs: 2000, sfx: 'dash', icon: 'horn', range: 50, halfAngleDeg: 30, particle: 'windpuff', knockback: 240, lunge: 84, crit: 0.3,
    desc: 'Xoáy mỏ lao vút tới. 30% Chí mạng.' }),
  wrap: C({ id: 'wrap', name: 'Quấn Siết', type: 'normal', power: 8, cooldownMs: 1700, sfx: 'whip', icon: 'whirl', range: 46, particle: 'dustpuff', knockback: 0,
    status: { kind: 'paralyze', chance: 1, ms: 1300 }, desc: 'Quấn chặt mục tiêu: địch bị trói đứng im 1,3 giây.' }),
  glare: C({ id: 'glare', name: 'Trừng Mắt', type: 'normal', power: 2, cooldownMs: 3200, sfx: 'warn', icon: 'eye', anim: 'shoot', animMs: 300, range: 96, halfAngleDeg: 40, sprayMs: 220, particle: 'zappuff', knockback: 0,
    status: { kind: 'paralyze', chance: 1, ms: 1500 }, desc: 'Trừng mắt: mọi địch trong hình quạt trước mặt bị Tê liệt 1,5 giây.' }),
  poisonFang: C({ id: 'poisonFang', name: 'Nanh Độc', type: 'poison', power: 22, cooldownMs: 1200, sfx: 'whip', icon: 'fang', range: 44, particle: 'poisonpuff', knockback: 160, lunge: 44,
    status: { kind: 'poison', chance: 0.5, ms: 3500 }, desc: 'Lao tới cắn nanh độc. 50% gây Nhiễm độc.' }),
  karateChop: C({ id: 'karateChop', name: 'Chặt Karate', type: 'fighting', power: 16, cooldownMs: 600, sfx: 'whip', icon: 'fist', range: 42, particle: 'spark', knockback: 140, crit: 0.35,
    desc: 'Chặt tay nhanh. 35% Chí mạng.' }),
  lowKick: C({ id: 'lowKick', name: 'Đá Thấp', type: 'fighting', power: 14, cooldownMs: 1000, sfx: 'whip', icon: 'fist', range: 44, halfAngleDeg: 60, particle: 'dustpuff', knockback: 120,
    status: { kind: 'paralyze', chance: 0.4, ms: 700 }, desc: 'Quét chân rộng. 40% làm địch ngã (khựng lại).' }),
  crossChop: C({ id: 'crossChop', name: 'Chặt Chéo', type: 'fighting', power: 36, cooldownMs: 2400, sfx: 'dash', icon: 'fist', range: 50, halfAngleDeg: 45, particle: 'spark', knockback: 260, lunge: 62, crit: 0.5,
    desc: 'Lao tới chặt chéo hai tay. 50% Chí mạng.' }),
  headbutt: C({ id: 'headbutt', name: 'Húc Đầu', type: 'normal', power: 20, cooldownMs: 1000, sfx: 'whip', icon: 'fist', range: 44, particle: 'dustpuff', knockback: 200, lunge: 44,
    status: { kind: 'paralyze', chance: 0.3, ms: 700 }, desc: 'Lao tới húc đầu. 30% làm địch khựng lại.' }),
  hypnosis: C({ id: 'hypnosis', name: 'Thôi Miên', type: 'psychic', power: 0, cooldownMs: 3400, sfx: 'swap', icon: 'eye', anim: 'shoot', animMs: 320, range: 116, halfAngleDeg: 24, sprayMs: 260, particle: 'psypuff', knockback: 0,
    status: { kind: 'sleep', chance: 1, ms: 3000 }, desc: 'Thôi miên: địch trúng Ngủ 3 giây. Đòn đầu tiên đánh thức nó và gây ×1,5 sát thương.' }),
  tackle: C({ id: 'tackle', name: 'Húc', type: 'normal', power: 15, cooldownMs: 700, sfx: 'whip', icon: 'sword', particle: 'dustpuff', lunge: 28,
    desc: 'Lao tới một đoạn ngắn rồi húc.' }),
  scratch: C({ id: 'scratch', name: 'Cào', type: 'normal', power: 7, cooldownMs: 700, sfx: 'whip', icon: 'claw', particle: 'dustpuff', knockback: 70, hits: 3, hitGapMs: 110,
    desc: 'Cào liên tiếp 3 nhát rất nhanh.' }),
  quickAttack: C({ id: 'quickAttack', name: 'Tấn Công Nhanh', type: 'normal', power: 16, cooldownMs: 1100, sfx: 'dash', icon: 'play', range: 44, halfAngleDeg: 40, particle: 'dustpuff', lunge: 78,
    desc: 'Lao vút tới mục tiêu. Không bị trúng đòn khi đang lao.' }),
  hyperFang: C({ id: 'hyperFang', name: 'Răng Nanh', type: 'normal', power: 24, cooldownMs: 1600, sfx: 'whip', icon: 'fang', range: 42, particle: 'dustpuff', knockback: 200, crit: 0.5,
    desc: 'Cú cắn cực mạnh. 50% Chí mạng (×1,8).' }),
  ironTail: C({ id: 'ironTail', name: 'Đuôi Sắt', type: 'normal', power: 32, cooldownMs: 2200, sfx: 'whip', icon: 'sword', range: 50, halfAngleDeg: 60, particle: 'spark', knockback: 240,
    status: { kind: 'paralyze', chance: 0.45, ms: 900 }, desc: 'Quật đuôi thép quét rộng. 45% làm địch choáng ngắn.' }),
  wingAttack: C({ id: 'wingAttack', name: 'Cánh Chém', type: 'flying', power: 22, cooldownMs: 1700, sfx: 'dash', icon: 'wing', range: 66, halfAngleDeg: 75, sprayMs: 200, particle: 'windpuff',
    desc: 'Quạt cánh cực rộng, quét sạch cả đám trước mặt.' }),
  flamethrower: C({ id: 'flamethrower', name: 'Phun Lửa', type: 'fire', power: 26, cooldownMs: 2600, sfx: 'flame', icon: 'flame', anim: 'charge', animMs: 380, range: 105, halfAngleDeg: 34, sprayMs: 380, moveSlow: 0.4, particle: 'flamepuff', knockback: 160,
    status: { kind: 'burn', chance: 0.45, ms: 3000 }, desc: 'Phun lửa tầm xa. 45% gây Bỏng.' }),
  vineWhip: C({ id: 'vineWhip', name: 'Roi Dây Leo', type: 'grass', power: 18, cooldownMs: 2000, sfx: 'whip', icon: 'leaf', animMs: 300, sprayMs: 300, moveSlow: 0.3, particle: 'leafpuff', knockback: 160,
    line: 112, lineWidth: 20, hits: 2, hitGapMs: 170, desc: 'Roi dây quất thẳng 2 lần, tầm cực xa.' }),
  bubbleBeam: C({ id: 'bubbleBeam', name: 'Tia Bong Bóng', type: 'water', power: 22, cooldownMs: 2400, sfx: 'water', icon: 'wave', anim: 'shoot', animMs: 380, range: 118, halfAngleDeg: 26, sprayMs: 380, moveSlow: 0.4, particle: 'bubblepuff', knockback: 140,
    slow: 0.45, desc: 'Chùm bong bóng tầm xa, làm chậm mọi địch trúng phải.' }),
  hornAttack: C({ id: 'hornAttack', name: 'Húc Sừng', type: 'normal', power: 20, cooldownMs: 1000, sfx: 'whip', icon: 'horn', range: 48, halfAngleDeg: 30, particle: 'dustpuff', knockback: 200, lunge: 48,
    desc: 'Lao sừng tới đâm, đẩy lùi mạnh.' }),
  hornDrill: C({ id: 'hornDrill', name: 'Mũi Khoan', type: 'normal', power: 34, cooldownMs: 2600, sfx: 'dash', icon: 'horn', range: 52, halfAngleDeg: 28, particle: 'spark', knockback: 260, lunge: 70, crit: 0.35,
    desc: 'Lao xoáy sừng như mũi khoan. 35% Chí mạng.' }),
  bite: C({ id: 'bite', name: 'Cắn', type: 'normal', power: 18, cooldownMs: 850, sfx: 'whip', icon: 'fang', range: 40, particle: 'dustpuff',
    status: { kind: 'paralyze', chance: 0.25, ms: 650 }, desc: 'Cắn mạnh. 25% làm địch khựng lại.' }),
  slash: C({ id: 'slash', name: 'Chém', type: 'normal', power: 24, cooldownMs: 1300, sfx: 'whip', icon: 'claw', range: 54, halfAngleDeg: 55, particle: 'spark', crit: 0.5,
    desc: 'Chém móng vuốt rộng. 50% Chí mạng.' }),
  furyCutter: C({ id: 'furyCutter', name: 'Liên Trảm', type: 'bug', power: 10, cooldownMs: 480, sfx: 'whip', icon: 'claw', range: 44, particle: 'leafpuff', knockback: 60,
    stack: 0.4, desc: 'Chém liên tục: mỗi lần dùng liền nhau mạnh thêm 40% (tối đa ×2,6).' }),
  doubleSlap: C({ id: 'doubleSlap', name: 'Tát Liên Hoàn', type: 'normal', power: 7, cooldownMs: 900, sfx: 'whip', icon: 'heart', particle: 'spark', knockback: 60, randomHits: [2, 5], hitGapMs: 100,
    desc: 'Tát liên hoàn ngẫu nhiên 2–5 cái.' }),
  bugBite: C({ id: 'bugBite', name: 'Cắn Bọ', type: 'bug', power: 14, cooldownMs: 800, sfx: 'whip', icon: 'fang', particle: 'leafpuff', lunge: 34, drain: 0.4,
    desc: 'Lao tới cắn, hồi máu bằng 40% sát thương.' }),
  fireFang: C({ id: 'fireFang', name: 'Nanh Lửa', type: 'fire', power: 20, cooldownMs: 1000, sfx: 'flame', icon: 'fang', range: 44, particle: 'flamepuff', knockback: 180, lunge: 46,
    status: { kind: 'burn', chance: 0.35, ms: 2500 }, desc: 'Lao tới cắn bằng nanh lửa. 35% gây Bỏng.' }),
  // ---- nguyên mẫu Charmeleon: cùng cơ chế gốc nhưng trình diễn theo nguyên mẫu (archetype, xem skills/kits.ts) ----
  emberC: P({ id: 'emberC', name: 'Đốm Lửa', type: 'fire', power: 12, cooldownMs: 320, sfx: 'ember', icon: 'flame', texture: 'fireball', particle: 'flamepuff', archetype: 'bolt',
    status: { kind: 'burn', chance: 0.25, ms: 2500 }, desc: 'Cầu lửa kéo vệt tàn lửa. Lv 16: cầu lửa lớn hơn · Lv 28: tách đôi. 25% gây Bỏng.' }),
  fireFangC: C({ id: 'fireFangC', name: 'Nanh Lửa', type: 'fire', power: 20, cooldownMs: 1000, sfx: 'dash', icon: 'fang', range: 44, particle: 'flamepuff', knockback: 180, lunge: 70, archetype: 'dashStrike',
    status: { kind: 'burn', chance: 0.35, ms: 2500 }, desc: 'Lao vút tới mục tiêu (bất tử khi lao), cắn xé để lại 3 vệt vuốt lửa. 35% gây Bỏng.' }),
  flamethrowerC: C({ id: 'flamethrowerC', name: 'Phun Lửa', type: 'fire', power: 28, cooldownMs: 2800, sfx: 'flame', icon: 'flame', anim: 'charge', animMs: 380, line: 150, lineWidth: 20, sprayMs: 640, moveSlow: 0.35,
    particle: 'flamepuff', knockback: 40, archetype: 'stream',
    status: { kind: 'burn', chance: 0.45, ms: 3000 }, desc: 'Ngắm 0,3 giây rồi phun dòng lửa dày, dài, xuyên mọi địch trên đường (nhiều nhịp). 45% gây Bỏng.' }),
  fireBlastC: B({ id: 'fireBlastC', name: 'Đại Hỏa', type: 'fire', power: 30, cooldownMs: 3600, sfx: 'flame', icon: 'flame', anim: 'charge', animMs: 400, burstRadius: 48, atTarget: true, particle: 'flamepuff', knockback: 280, archetype: 'blast',
    status: { kind: 'burn', chance: 0.5, ms: 3000 }, desc: 'Khóa mục tiêu, phóng cầu lửa nổ tung cả vùng, để lại nền cháy 2,5 giây. 50% gây Bỏng.' }),
  // ---- nguyên mẫu Squirtle / Wartortle / Blastoise (bộ chiêu nước, xem skills/kits.ts → TYPE_KITS.water + SPECIES_KITS) ----
  waterGunS: P({ id: 'waterGunS', name: 'Súng Nước', type: 'water', power: 11, cooldownMs: 340, sfx: 'water', icon: 'drop', speed: 360, texture: 'bubble', particle: 'bubblepuff', knockback: 190, archetype: 'bolt',
    desc: 'Tia nước kéo vệt giọt nước, đẩy lùi rất mạnh. Lv 14: tia to hơn · Lv 30: bắn đôi.' }),
  rapidSpinS: C({ id: 'rapidSpinS', name: 'Xoay Tốc Độ', type: 'normal', power: 9, cooldownMs: 900, sfx: 'dash', icon: 'whirl', range: 46, halfAngleDeg: 180, particle: 'bubblepuff', knockback: 200, lunge: 64,
    hits: 2, hitGapMs: 110, archetype: 'dashStrike', desc: 'Rụt vào mai xoay lao tới (bất tử khi lao), quét 2 vòng nước quanh người.' }),
  hydroPumpS: C({ id: 'hydroPumpS', name: 'Bơm Thủy Lực', type: 'water', power: 30, cooldownMs: 3000, sfx: 'water', icon: 'wave', anim: 'shoot', animMs: 380, line: 170, lineWidth: 22, sprayMs: 560, moveSlow: 0.3,
    particle: 'bubblepuff', knockback: 70, archetype: 'stream',
    desc: 'Ngắm 0,4 giây rồi bắn cột nước dày, dài, xuyên mọi địch trên đường và đẩy lùi. Wartortle: cột nước to hơn · Blastoise: pháo đôi.' }),
  surfS: B({ id: 'surfS', name: 'Lướt Sóng', type: 'water', power: 30, cooldownMs: 3600, sfx: 'water', knockback: 340, icon: 'wave', burstRadius: 84, particle: 'bubblepuff', archetype: 'nova',
    desc: 'Sóng lớn lan tròn quanh người, đẩy văng mọi địch, để lại vũng nước làm chậm. Wartortle: 2 đợt sóng · Blastoise: 3 đợt.' }),
  // ---- dòng Cỏ (Bulbasaur G1 → Ivysaur G2 → Venusaur G3) và dòng Lửa còn lại (Charmander F1, Charizard F3): xem skills/kits.ts → SPECIES_KITS ----
  // Bulbasaur (anime): Razor Leaf · Vine Whip · Sleep Powder · Leech Seed
  razorLeafG1: P({ id: 'razorLeafG1', name: 'Lá Sắc', type: 'grass', power: 4, cooldownMs: 440, sfx: 'leafHi', icon: 'leaf', speed: 330, lifeMs: 700, texture: 'leafA', spin: 14, count: 3, spreadDeg: 15, pierce: true, particle: 'leafpuff', knockback: 40,
    archetype: 'bolt', desc: 'Phóng 3 chiếc lá sắc xoay tít theo đường cong nhẹ, xuyên qua mọi địch trên đường.' }),
  vineWhipG1: C({ id: 'vineWhipG1', name: 'Roi Dây Leo', type: 'grass', power: 12, cooldownMs: 900, sfx: 'whip', icon: 'vine', range: 50, halfAngleDeg: 55, particle: 'leafpuff', knockback: 200, lunge: 56,
    status: { kind: 'seed', chance: 0.6, ms: 4000 }, archetype: 'whip', desc: 'Hai dây leo từ củ trên lưng quất một vòng cung, lao ngắn tới địch, hất văng mục tiêu và địch quanh đó. 60% gieo hạt hút máu.' }),
  sleepPowderG1: C({ id: 'sleepPowderG1', name: 'Bột Ngủ', type: 'grass', power: 16, cooldownMs: 2400, sfx: 'powder', icon: 'powder', anim: 'attack', animMs: 360, range: 78, halfAngleDeg: 40, particle: 'leafpuff',
    knockback: 0, status: { kind: 'sleep', chance: 0.55, ms: 1800 }, archetype: 'cloud', desc: 'Phun đám bột vàng-xanh hình quạt từ củ trên lưng, lơ lửng ~2 giây, làm địch trong đám mây ngủ say (đòn đầu tiên đánh thức nhưng mạnh hơn).' }),
  leechSeedG1: P({ id: 'leechSeedG1', name: 'Hạt Hút Máu', type: 'grass', power: 14, cooldownMs: 3600, sfx: 'seedPop', icon: 'seed', anim: 'charge', animMs: 300, speed: 300, lifeMs: 800, radius: 4, texture: 'seedO', particle: 'leafpuff', knockback: 30,
    status: { kind: 'seed', chance: 1, ms: 3000 }, archetype: 'tether', desc: 'Bắn hạt cắm vào địch, mọc dây leo nối về bạn hút máu ~3 giây (hồi máu cho bạn); hạt lan sang địch gần đó khi lên cấp.' }),
  // Ivysaur: Razor Leaf lốc lá · Power Whip · Poison Powder + Stun Spore · Solar Beam (ult: Petal Dance)
  razorLeafG2: P({ id: 'razorLeafG2', name: 'Lốc Lá Sắc', type: 'grass', power: 4, cooldownMs: 480, sfx: 'leafHi', icon: 'leaf', speed: 300, lifeMs: 900, texture: 'leafA', spin: 12, count: 5, spreadDeg: 11, pierce: true, particle: 'leafpuff',
    knockback: 30, archetype: 'bolt', desc: 'Lá xoáy thành lốc quanh người rồi bắn ra 5 chiếc lá lớn, xuyên qua mọi địch.' }),
  powerWhipG2: C({ id: 'powerWhipG2', name: 'Roi Quật Mạnh', type: 'grass', power: 16, cooldownMs: 1100, sfx: 'vineSnap', icon: 'vine', range: 70, halfAngleDeg: 60, particle: 'leafpuff', knockback: 260,
    status: { kind: 'seed', chance: 0.5, ms: 4000 }, archetype: 'whip', desc: 'Hai dây leo dài, dày vút qua đầu rồi đập mạnh xuống: nứt nền, hất văng và làm địch choáng ngắn. 50% gieo hạt.' }),
  poisonStunG2: C({ id: 'poisonStunG2', name: 'Bột Độc & Tê', type: 'grass', power: 18, cooldownMs: 3000, sfx: 'powder', icon: 'powder', anim: 'attack', animMs: 380, range: 96, halfAngleDeg: 46, particle: 'leafpuff',
    knockback: 0, status: { kind: 'poison', chance: 0.6, ms: 3000 }, archetype: 'cloud', desc: 'Phun đám bột tím (độc) và vàng (tê liệt) từ củ trên lưng, lơ lửng ~2,4 giây: gây Nhiễm độc và có thể Tê liệt địch trong mây.' }),
  solarBeamG2: C({ id: 'solarBeamG2', name: 'Tia Mặt Trời', type: 'grass', power: 30, cooldownMs: 3000, sfx: 'thunder', icon: 'sun', anim: 'shoot', animMs: 340, line: 190, lineWidth: 22, sprayMs: 420, moveSlow: 0.3,
    particle: 'leafpuff', knockback: 70, archetype: 'stream', desc: 'Ánh sáng xoắn ốc hội tụ vào búp hoa trên lưng ~0,5 giây rồi bắn tia xanh-vàng xuyên mọi địch trên đường.' }),
  // Venusaur: Seed Bomb · Vine Slam · Solar Beam · Frenzy Plant (ult: Overgrowth)
  seedBombG3: P({ id: 'seedBombG3', name: 'Bom Hạt', type: 'grass', power: 9, cooldownMs: 700, sfx: 'leafLo', icon: 'seed', speed: 330, lifeMs: 800, radius: 5, texture: 'seedO', spin: 3, particle: 'leafpuff', knockback: 120,
    archetype: 'bolt', desc: 'Bắn liên tiếp 5 hạt bom: mỗi hạt nổ thành đám bào tử nhỏ và mảnh lá khi trúng.' }),
  vineSlamG3: C({ id: 'vineSlamG3', name: 'Đập Dây Leo', type: 'grass', power: 24, cooldownMs: 1700, sfx: 'vineSnap', icon: 'vine', range: 70, halfAngleDeg: 60, particle: 'leafpuff', knockback: 300, lunge: 40,
    status: { kind: 'seed', chance: 0.8, ms: 4500 }, archetype: 'whip', desc: 'Hai dây leo khổng lồ đập xuống nền thành hình chữ X: nứt đất, sóng xung kích hất văng cả đám. 80% gieo hạt.' }),
  solarBeamG3: C({ id: 'solarBeamG3', name: 'Tia Mặt Trời Lớn', type: 'grass', power: 46, cooldownMs: 5000, sfx: 'thunder', icon: 'sun', anim: 'shoot', animMs: 360, line: 240, lineWidth: 34, sprayMs: 420, moveSlow: 0.25,
    particle: 'leafpuff', knockback: 260, archetype: 'stream', desc: 'Gom ánh sáng vào bông hoa lớn trên lưng 0,7 giây rồi bắn tia vàng-xanh cực dày xuyên cả sân, rung màn hình, để lại vệt cỏ bị cắt rạp.' }),
  frenzyPlantG3: B({ id: 'frenzyPlantG3', name: 'Cây Cuồng Nộ', type: 'grass', power: 40, cooldownMs: 5200, sfx: 'boom', icon: 'root', anim: 'charge', animMs: 420, burstRadius: 40, atTarget: true, strikes: 6, particle: 'leafpuff', knockback: 220,
    status: { kind: 'seed', chance: 1, ms: 5000 }, archetype: 'rain', desc: 'Nứt đất quanh địch rồi làn rễ gai khổng lồ trồi lên nối từ chân bạn tới họ, 3 đợt liên tiếp, để lại rêu làm chậm. Gieo hạt hút máu.' }),
  emberF1: P({ id: 'emberF1', name: 'Đốm Lửa', type: 'fire', power: 11, cooldownMs: 340, sfx: 'ember', icon: 'flame', texture: 'fireball', particle: 'flamepuff', archetype: 'bolt',
    status: { kind: 'burn', chance: 0.2, ms: 2200 }, desc: 'Đốm lửa nhỏ bay thẳng, vệt tàn lửa ngắn. 20% gây Bỏng.' }),
  scratchF1: C({ id: 'scratchF1', name: 'Cào', type: 'normal', power: 9, cooldownMs: 760, sfx: 'whip', icon: 'claw', range: 38, halfAngleDeg: 55, particle: 'spark', knockback: 120, lunge: 44, archetype: 'dashStrike',
    desc: 'Lao ngắn tới địch rồi cào vài nhát nhỏ.' }),
  flameletF1: C({ id: 'flameletF1', name: 'Phun Lửa', type: 'fire', power: 20, cooldownMs: 2300, sfx: 'flame', icon: 'flame', anim: 'charge', animMs: 300, line: 92, lineWidth: 16, sprayMs: 480, moveSlow: 0.4,
    particle: 'flamepuff', knockback: 25, archetype: 'stream', status: { kind: 'burn', chance: 0.35, ms: 2500 }, desc: 'Phun luồng lửa mảnh, ngắn. 35% gây Bỏng.' }),
  fireballF1: B({ id: 'fireballF1', name: 'Bùng Lửa', type: 'fire', power: 22, cooldownMs: 2800, sfx: 'flame', icon: 'flame', anim: 'charge', animMs: 300, burstRadius: 34, atTarget: true, particle: 'flamepuff', knockback: 200,
    status: { kind: 'burn', chance: 0.35, ms: 2500 }, archetype: 'blast', desc: 'Quả cầu lửa nhỏ bay nhanh, nổ vùng hẹp. 35% gây Bỏng.' }),
  emberF3: P({ id: 'emberF3', name: 'Đốm Lửa', type: 'fire', power: 12, cooldownMs: 400, sfx: 'flame', icon: 'flame', speed: 360, texture: 'fireball', particle: 'flamepuff', knockback: 90, archetype: 'bolt',
    status: { kind: 'burn', chance: 0.25, ms: 2800 }, desc: 'Ba quả cầu lửa to bắn hình quạt, vệt lửa dày, chớp nòng. 25% gây Bỏng.' }),
  wingSlashF3: C({ id: 'wingSlashF3', name: 'Cánh Chém', type: 'flying', power: 30, cooldownMs: 1700, sfx: 'dash', icon: 'wing', range: 56, halfAngleDeg: 70, sprayMs: 200, particle: 'flamepuff', knockback: 260, lunge: 120,
    archetype: 'dashStrike', desc: 'Sải cánh lao vút (bất tử khi lao) vẽ hai đường chém lưỡi liềm rộng, vệt tàn lửa, rung màn hình.' }),
  seismicTossF3: C({ id: 'seismicTossF3', name: 'Quật Ngã Địa Chấn', type: 'fighting', power: 40, cooldownMs: 3400, sfx: 'boom', icon: 'fist', range: 50, halfAngleDeg: 60, sprayMs: 200, knockback: 120, lunge: 110,
    archetype: 'throw', desc: 'Lao tới túm lấy địch, nhấc bổng lên không trung xoay vòng rồi quật xuống đất: sóng xung kích và choáng ngắn (như Charizard trong anime).' }),
  fireMeteorF3: B({ id: 'fireMeteorF3', name: 'Thiên Thạch Lửa', type: 'fire', power: 54, cooldownMs: 4200, sfx: 'flame', icon: 'flame', anim: 'charge', animMs: 450, burstRadius: 64, atTarget: true, particle: 'flamepuff', knockback: 340, archetype: 'blast',
    status: { kind: 'burn', chance: 0.5, ms: 3200 }, desc: 'Ném một tảng thiên thạch lửa khổng lồ: rơi nổ tung cả vùng, nền cháy lưu lại vài giây. 50% gây Bỏng.' }),
  flamethrowerF3: C({ id: 'flamethrowerF3', name: 'Phun Lửa', type: 'fire', power: 38, cooldownMs: 3600, sfx: 'flame', icon: 'flame', anim: 'charge', animMs: 420, line: 230, lineWidth: 36, sprayMs: 800, moveSlow: 0.3,
    particle: 'flamepuff', knockback: 60, archetype: 'stream', status: { kind: 'burn', chance: 0.6, ms: 3500 }, desc: 'Ngắm 0,45 giây rồi phun cột lửa hai lớp khổng lồ, quét chậm một vòng cung, xuyên mọi địch. 60% gây Bỏng.' }),
  fireBlastF3: B({ id: 'fireBlastF3', name: 'Đại Hỏa', type: 'fire', power: 52, cooldownMs: 5000, sfx: 'flame', icon: 'star', anim: 'charge', animMs: 480, burstRadius: 70, atTarget: true, particle: 'flamepuff', knockback: 340,
    status: { kind: 'burn', chance: 0.7, ms: 3500 }, archetype: 'blast', desc: 'Khóa mục tiêu, phóng quả cầu lửa khổng lồ nổ thành ngôi sao lửa 5 cánh, sóng xung kích rộng, mảnh vỡ văng tung tóe. 70% gây Bỏng.' }),
  // ---- nguyên mẫu Pikachu / Raichu (bộ chiêu điện, xem TYPE_KITS.electric + SPECIES_KITS) ----
  thunderShockP: P({ id: 'thunderShockP', name: 'Điện Giật', type: 'electric', power: 10, cooldownMs: 260, sfx: 'zap', icon: 'bolt', speed: 430, lifeMs: 560, texture: 'zap', particle: 'zappuff', knockback: 50,
    archetype: 'bolt', status: { kind: 'paralyze', chance: 0.15, ms: 700 }, desc: 'Tia điện kéo vệt gấp khúc. Lv 18: nảy sang 1 địch · Lv 28: nảy 2 địch, tia to hơn. 15% Tê liệt.' }),
  quickAttackP: C({ id: 'quickAttackP', name: 'Tấn Công Nhanh', type: 'normal', power: 16, cooldownMs: 1100, sfx: 'dash', icon: 'play', range: 44, halfAngleDeg: 40, particle: 'zappuff', lunge: 90, archetype: 'dashStrike',
    desc: 'Lao vút như tia chớp để lại bóng mờ điện (bất tử khi lao), chém sét tại điểm cuối.' }),
  thunderboltP: B({ id: 'thunderboltP', name: 'Sấm Sét', type: 'electric', power: 24, cooldownMs: 3000, sfx: 'thunder', knockback: 130, icon: 'bolt', particle: 'zappuff', chain: 3, archetype: 'chain',
    status: { kind: 'paralyze', chance: 0.35, ms: 1000 }, desc: 'Sét đánh mục tiêu rồi nảy sang 3 địch gần nhất (Lv 24: 4 · Raichu: 5), yếu dần mỗi lần nảy. 35% Tê liệt.' }),
  thunderP: B({ id: 'thunderP', name: 'Sấm Sét Lớn', type: 'electric', power: 34, cooldownMs: 4400, sfx: 'thunder', knockback: 160, icon: 'bolt', particle: 'zappuff', burstRadius: 42, atTarget: true, strikes: 3,
    archetype: 'rain', status: { kind: 'paralyze', chance: 0.5, ms: 1100 }, desc: 'Khóa các địch quanh mục tiêu, vòng cảnh báo rồi 3 tia sét giáng từ trời xuống (Raichu: 5 tia), để lại tĩnh điện. 50% Tê liệt.' }),
  supersonic: C({ id: 'supersonic', name: 'Siêu Âm', type: 'normal', power: 4, cooldownMs: 2600, sfx: 'swap', icon: 'spiral', anim: 'shoot', animMs: 300, range: 100, halfAngleDeg: 32, sprayMs: 260, particle: 'psypuff', knockback: 30,
    status: { kind: 'confuse', chance: 1, ms: 2000 }, desc: 'Sóng siêu âm: mọi địch trúng bị Rối loạn, đi lung tung, không tấn công.' }),
  rollout: C({ id: 'rollout', name: 'Lăn Tròn', type: 'rock', power: 13, cooldownMs: 750, sfx: 'dash', icon: 'rock', range: 42, particle: 'dustpuff', knockback: 180, lunge: 88,
    stack: 0.5, desc: 'Lăn lao tới húc. Dùng liền nhau mạnh dần +50% mỗi lần.' }),
  superFang: C({ id: 'superFang', name: 'Siêu Nanh', type: 'normal', power: 10, cooldownMs: 4200, sfx: 'whip', icon: 'fang', range: 44, particle: 'spark', knockback: 220, lunge: 40,
    halveHp: true, desc: 'Cắt một nửa máu hiện tại của địch (thủ lĩnh: 20%).' }),

  // ================================================================ quanh người / tại mục tiêu
  thunderbolt: B({ id: 'thunderbolt', name: 'Sấm Sét', type: 'electric', power: 24, cooldownMs: 3000, sfx: 'thunder', knockback: 130, icon: 'bolt', particle: 'zappuff',
    chain: 3, status: { kind: 'paralyze', chance: 0.35, ms: 1000 }, desc: 'Sét đánh mục tiêu rồi lan sang 3 địch khác. 35% Tê liệt.' }),
  thunder: B({ id: 'thunder', name: 'Sấm Sét Lớn', type: 'electric', power: 34, cooldownMs: 4400, sfx: 'thunder', knockback: 160, icon: 'bolt', particle: 'zappuff', burstRadius: 42,
    atTarget: true, strikes: 3, status: { kind: 'paralyze', chance: 0.5, ms: 1100 }, desc: 'Gọi 3 tia sét giáng xuống quanh mục tiêu. 50% Tê liệt.' }),
  poisonPowder: B({ id: 'poisonPowder', name: 'Phấn Độc', type: 'poison', power: 5, cooldownMs: 3400, sfx: 'leaf', knockback: 0, icon: 'cloud', particle: 'poisonpuff',
    atTarget: true, zone: { radius: 54, ms: 3500, tickMs: 450 }, status: { kind: 'poison', chance: 0.6, ms: 3000 }, desc: 'Rải mây độc tại chỗ địch (3,5 giây). Địch trong mây dễ Nhiễm độc.' }),
  stunSpore: B({ id: 'stunSpore', name: 'Bào Tử Tê', type: 'grass', power: 3, cooldownMs: 3400, sfx: 'leaf', knockback: 0, icon: 'cloud', particle: 'leafpuff', slow: 0.55,
    atTarget: true, zone: { radius: 54, ms: 3000, tickMs: 450 }, status: { kind: 'paralyze', chance: 0.3, ms: 900 }, desc: 'Mây bào tử: địch trong mây chậm lại và dễ Tê liệt.' }),
  confusion: B({ id: 'confusion', name: 'Siêu Âm Lực', type: 'psychic', power: 24, cooldownMs: 3000, sfx: 'thunder', knockback: 160, icon: 'spiral', burstRadius: 82, particle: 'psypuff',
    status: { kind: 'confuse', chance: 0.7, ms: 2000 }, desc: 'Sóng siêu linh quanh người. 70% gây Rối loạn.' }),
  dig: B({ id: 'dig', name: 'Đào Đất', type: 'ground', power: 32, cooldownMs: 3800, sfx: 'hit', knockback: 220, icon: 'shovel', burstRadius: 66, particle: 'dustpuff',
    burrowMs: 1000, desc: 'Chui xuống đất 1 giây (bất tử, vẫn đi được) rồi trồi lên hất tung xung quanh.' }),
  rapidSpin: B({ id: 'rapidSpin', name: 'Xoay Tốc Độ', type: 'normal', power: 7, cooldownMs: 2600, anim: 'attack', animMs: 320, sfx: 'dash', knockback: 160, icon: 'whirl', burstRadius: 36, particle: 'windpuff',
    spinMs: 1400, desc: 'Xoay tít 1,4 giây: chạy nhanh hơn, gây sát thương liên tục quanh người.' }),

  // ================================================================ tự cường hóa
  thunderWave: B({ id: 'thunderWave', name: 'Sóng Điện', type: 'electric', power: 2, cooldownMs: 3400, sfx: 'zap', knockback: 0, icon: 'bolt', particle: 'zappuff',
    atTarget: true, zone: { radius: 50, ms: 2600, tickMs: 400 }, status: { kind: 'paralyze', chance: 0.45, ms: 900 }, desc: 'Phủ lưới điện tại chỗ địch: ai đứng trong dễ bị Tê liệt.' }),
  magnitude: B({ id: 'magnitude', name: 'Cường Độ', type: 'ground', power: 26, cooldownMs: 3200, sfx: 'hit', knockback: 200, icon: 'rock', burstRadius: 80, particle: 'dustpuff',
    magnitude: true, desc: 'Rung chấn ngẫu nhiên cường độ 4–10: sức mạnh và vùng ảnh hưởng thay đổi mỗi lần.' }),
  earthquake: B({ id: 'earthquake', name: 'Động Đất', type: 'ground', power: 40, cooldownMs: 5200, sfx: 'hit', knockback: 260, icon: 'rock', burstRadius: 135, particle: 'dustpuff',
    desc: 'Động đất cực mạnh, đánh trúng mọi địch trong vùng rất rộng quanh người.' }),
  selfDestruct: B({ id: 'selfDestruct', name: 'Tự Nổ', type: 'normal', power: 62, cooldownMs: 6500, anim: 'charge', animMs: 400, sfx: 'thunder', knockback: 300, icon: 'skull', burstRadius: 100, particle: 'flamepuff',
    selfCost: 0.5, desc: 'Nổ tung gây sát thương cực lớn quanh người, nhưng tự mất 50% máu hiện tại.' }),

  harden: F({ id: 'harden', name: 'Cứng Hóa', type: 'normal', power: 0, cooldownMs: 8000, sfx: 'swap', icon: 'shield', guard: 0.45, buffMs: 4000,
    desc: 'Cứng người: giảm 55% sát thương nhận vào trong 4 giây.' }),
  minimize: F({ id: 'minimize', name: 'Thu Nhỏ', type: 'normal', power: 0, cooldownMs: 8000, sfx: 'swap', icon: 'sparkle', evade: 0.5, buffMs: 4000,
    desc: 'Thu nhỏ người: 50% né hoàn toàn mọi đòn trong 4 giây.' }),
  withdraw: F({ id: 'withdraw', name: 'Thủ Mai', type: 'water', power: 0, cooldownMs: 8000, sfx: 'swap', icon: 'shell', guard: 0.4, reflect: 1, buffMs: 4000,
    desc: 'Rụt vào mai: giảm 60% sát thương và phản đòn địch nào chạm vào.' }),
  teleport: F({ id: 'teleport', name: 'Dịch Chuyển', type: 'psychic', power: 0, cooldownMs: 2600, sfx: 'swap', icon: 'sparkle', anim: 'charge', animMs: 200,
    blink: 120, desc: 'Biến mất rồi hiện ra cách xa địch gần nhất 120px, bất tử trong chốc lát.' }),
  metronome: F({ id: 'metronome', name: 'Phẩy Ngón Tay', type: 'normal', power: 0, cooldownMs: 3200, sfx: 'pickup', icon: 'note', anim: 'attack', animMs: 300,
    metronome: true, desc: 'Phẩy ngón tay: tung ngẫu nhiên một chiêu mạnh bất kỳ!' }),
};

export const MOVES: Record<string, MoveDef> = Object.assign({}, CORE_MOVES, ...CHAPTERS.map((c) => c.moves));

/** các chiêu Phẩy Ngón Tay có thể ra */
export const METRONOME_POOL = ['thunder', 'flameBurst', 'waterPulse', 'confusion', 'thunderbolt', 'poisonPowder', 'hornDrill', 'swift', 'rapidSpin', 'dig', 'flamethrower'];

export const DASH_LABEL = { name: 'Lướt', key: 'Space' };

// ======================================================================= nâng cấp chiêu bằng tiền

/** một mốc nâng cấp đặc biệt: điều kiện + mô tả + cách áp dụng */
interface Perk {
  when: (m: MoveDef) => boolean;
  label: (m: MoveDef) => string;
  apply: (m: MoveDef) => void;
}

/** mốc Lv 3: tăng hiệu ứng đặc trưng */
const PERKS_3: Perk[] = [
  { when: (m) => !!m.chain, label: () => tr('Bounces to 1 more foe', 'Nảy thêm 1 địch'), apply: (m) => { m.chain = (m.chain ?? 0) + 1; } },
  { when: (m) => !!m.money, label: () => tr('+2₽ more per hit', 'Nhặt thêm +2₽ mỗi lần trúng'), apply: (m) => { m.money = m.money! + 2; } },
  { when: (m) => !!m.blink, label: () => tr('Teleports 30% farther', 'Dịch chuyển xa hơn 30%'), apply: (m) => { m.blink = m.blink! * 1.3; } },
  { when: (m) => !!m.zone, label: () => tr('Cloud 25% wider', 'Mây rộng hơn 25%'), apply: (m) => { m.zone = { ...m.zone!, radius: Math.round(m.zone!.radius * 1.25) }; } },
  { when: (m) => !!m.status && m.status.chance < 1, label: (m) => tr(`+15% ${statusLabel(m.status!.kind)} chance`, `+15% tỉ lệ ${STATUS_LABEL[m.status!.kind]}`), apply: (m) => { m.status = { ...m.status!, chance: Math.min(1, m.status!.chance + 0.15) }; } },
  { when: (m) => !!m.explode, label: () => tr('Blast radius +25%', 'Vùng nổ rộng hơn 25%'), apply: (m) => { m.explode = Math.round(m.explode! * 1.25); } },
  { when: (m) => !!m.crit, label: () => tr('+15% crit chance', '+15% Chí mạng'), apply: (m) => { m.crit = Math.min(1, m.crit! + 0.15); } },
  { when: (m) => !!m.drain, label: () => tr('Drain +20%', 'Hút máu +20%'), apply: (m) => { m.drain = m.drain! + 0.2; } },
  { when: (m) => !!m.stack, label: () => tr('Stacks +15% per use', 'Tích lũy +15% mỗi lần'), apply: (m) => { m.stack = m.stack! + 0.15; } },
  { when: (m) => !!m.burrowMs || !!m.spinMs, label: () => tr('Lasts 30% longer', 'Kéo dài thêm 30%'), apply: (m) => { if (m.burrowMs) m.burrowMs *= 1.3; if (m.spinMs) m.spinMs *= 1.3; } },
  { when: (m) => !!m.status, label: (m) => tr(`${statusLabel(m.status!.kind)} lasts +30%`, `${STATUS_LABEL[m.status!.kind]} kéo dài +30%`), apply: (m) => { m.status = { ...m.status!, ms: m.status!.ms * 1.3 }; } },
  { when: (m) => !!m.slow, label: () => tr('Stronger slow', 'Làm chậm mạnh hơn'), apply: (m) => { m.slow = m.slow! * 0.75; } },
  { when: (m) => !!m.evade, label: () => tr('+15% evasion', '+15% né'), apply: (m) => { m.evade = Math.min(0.9, m.evade! + 0.15); } },
  { when: (m) => !!m.guard, label: () => tr('Blocks 10% more damage', 'Giảm thêm 10% sát thương'), apply: (m) => { m.guard = Math.max(0.1, m.guard! - 0.1); } },
  { when: (m) => !!m.lunge, label: () => tr('Lunges 30% farther', 'Lao xa hơn 30%'), apply: (m) => { m.lunge = m.lunge! * 1.3; } },
  { when: () => true, label: () => tr('Cooldown −10%', 'Hồi chiêu nhanh thêm 10%'), apply: (m) => { m.cooldownMs *= 0.9; } },
];

/** mốc Lv 5: thêm số lượng / thời gian */
const PERKS_5: Perk[] = [
  { when: (m) => !!m.metronome, label: () => tr('Cooldown halved', 'Hồi chiêu giảm một nửa'), apply: (m) => { m.cooldownMs *= 0.5; } },
  { when: (m) => !!m.selfCost, label: () => tr('Costs only 30% HP', 'Chỉ mất 30% máu'), apply: (m) => { m.selfCost = 0.3; } },
  { when: (m) => !!m.fixedPerLevel, label: () => tr('Fixed damage +30%', 'Sát thương cố định +30%'), apply: (m) => { m.fixedPerLevel = m.fixedPerLevel! * 1.3; } },
  { when: (m) => !!m.blink, label: () => tr('Cooldown halved', 'Hồi chiêu giảm một nửa'), apply: (m) => { m.cooldownMs *= 0.5; } },
  { when: (m) => !!m.strikes, label: () => tr('+1 lightning bolt', '+1 tia sét'), apply: (m) => { m.strikes = m.strikes! + 1; } },
  { when: (m) => (m.count ?? 1) > 1 || !!m.homing || !!m.boomerang, label: () => tr('+1 projectile', '+1 viên đạn'), apply: (m) => { m.count = (m.count ?? 1) + 1; } },
  { when: (m) => !!m.hits || !!m.randomHits, label: () => tr('+1 hit', '+1 nhát'), apply: (m) => { if (m.hits) m.hits++; if (m.randomHits) m.randomHits = [m.randomHits[0] + 1, m.randomHits[1] + 1]; } },
  { when: (m) => !!m.chain, label: () => tr('Bounces to 1 more foe', 'Nảy thêm 1 địch'), apply: (m) => { m.chain = (m.chain ?? 0) + 1; } },
  { when: (m) => !!m.zone, label: () => tr('Cloud lasts 40% longer', 'Mây tồn tại lâu hơn 40%'), apply: (m) => { m.zone = { ...m.zone!, ms: m.zone!.ms * 1.4 }; } },
  { when: (m) => !!m.reflect, label: () => tr('Reflect ×2', 'Phản đòn ×2'), apply: (m) => { m.reflect = m.reflect! * 2; } },
  { when: (m) => !!m.buffMs, label: () => tr('Lasts 40% longer', 'Kéo dài thêm 40%'), apply: (m) => { m.buffMs = m.buffMs! * 1.4; } },
  { when: (m) => !!m.status, label: (m) => tr(`${statusLabel(m.status!.kind)} lasts +40%`, `${STATUS_LABEL[m.status!.kind]} kéo dài +40%`), apply: (m) => { m.status = { ...m.status!, ms: m.status!.ms * 1.4 }; } },
  { when: (m) => !!m.halveHp, label: () => tr('Cooldown −30%', 'Hồi chiêu nhanh thêm 30%'), apply: (m) => { m.cooldownMs *= 0.7; } },
  { when: () => true, label: () => tr('+20% damage', 'Sát thương thêm 20%'), apply: (m) => { m.power *= 1.2; } },
];

export const SKILL_MAX_LEVEL = 5;

/** Chiêu sau khi nâng cấp: +sát thương, −hồi chiêu theo bảng SKILL_UPGRADE.power / cooldown; Lv 3 và Lv 5 mở hiệu ứng đặc biệt */
export function upgradeMove(base: MoveDef, lv: number): MoveDef {
  if (lv <= 0) return base;
  const m: MoveDef = { ...base, status: base.status && { ...base.status }, zone: base.zone && { ...base.zone } };
  const i = Math.min(lv, SKILL_UPGRADE.power.length - 1);
  m.power = base.power * (1 + SKILL_UPGRADE.power[i]);
  m.cooldownMs = base.cooldownMs * (1 - SKILL_UPGRADE.cooldown[i]);
  if (lv >= 3) PERKS_3.find((p) => p.when(base))!.apply(m);
  if (lv >= 5) PERKS_5.find((p) => p.when(base))!.apply(m);
  return m;
}

/** Hệ số sức mạnh theo ô chiêu (COMBAT.slotPower: J yếu hơn, K/L/U mạnh hơn) – giữ nguyên cơ chế riêng của chiêu
 *  (chiêu sát thương cố định theo cấp như Sóng Âm không đổi) */
export function slotScaledMove(m: MoveDef, slot: string): MoveDef {
  const k = COMBAT.slotPower[slot] ?? 1;
  const g = COMBAT.slotReach[slot] ?? 1;
  let out = m;
  if (k !== 1 && m.power) out = { ...out, power: m.power * k };
  if (g !== 1) {
    // K/L/U tầm rộng hơn: phạm vi, bán kính, vệt và quãng lao đều nở ra
    const sc = (v: number | undefined) => (v === undefined ? v : Math.round(v * g));
    out = {
      ...out,
      range: sc(m.range), burstRadius: sc(m.burstRadius), explode: sc(m.explode), line: sc(m.line), lineWidth: sc(m.lineWidth),
      lunge: slot === 'K' && m.lunge ? Math.round(m.lunge * COMBAT.kLungeMult) : m.lunge,
      zone: m.zone ? { ...m.zone, radius: Math.round(m.zone.radius * g) } : m.zone,
    };
  }
  return out;
}

/** Mô tả hai mốc đặc biệt của một chiêu (Lv 3, Lv 5) */
export function upgradePerks(base: MoveDef): { lv3: string; lv5: string } {
  return { lv3: PERKS_3.find((p) => p.when(base))!.label(base), lv5: PERKS_5.find((p) => p.when(base))!.label(base) };
}
