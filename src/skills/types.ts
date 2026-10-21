// Kiểu dữ liệu của hệ "nguyên mẫu chiêu" (skill archetype): mỗi nguyên mẫu (đạn, lao chém, dòng phun, cầu nổ...)
// viết MỘT lần trong archetypes.ts, nhận tham số (màu, kích thước, thời gian, nhịp, bậc theo cấp...).
// Mỗi hệ / loài / bậc cấp chỉ là cấu hình trong kits.ts.
import type { SkillSlot } from '../data/pokemon';
import type { SfxName } from '../systems/sfx';
import type { StatusKind } from '../data/moveKit';

/**
 * Nguyên mẫu chiêu thường (ô J/K/L/U).
 *  bolt       – đạn bay có vệt + nổ nhỏ khi trúng; bậc cấp: to hơn, vệt dày, tách nhiều viên
 *  dashStrike – lao vút tới mục tiêu (bất tử khi lao) + vệt vuốt/chém tại điểm cuối
 *  stream     – vạch ngắm rồi dòng phun dày xuyên thẳng (nhiều lớp màu), sát thương theo nhịp
 *  blast      – vạch chấm + vòng mục tiêu → cầu bay tới → nổ lớn + mảnh vỡ + vùng cháy lưu lại
 *
 *  nova       – vòng sóng lan ra quanh người (hoặc tại mục tiêu), nhiều lớp vòng, đẩy văng mạnh, có thể nhiều nhịp
 *  chain      – tia sét đánh mục tiêu rồi nảy sang N địch gần nhất (giảm dần), tia gấp khúc, khựng hình nhẹ
 *  whip       – (cỏ) dây leo quất / đập: duỗi → vút → thu về, quét cung, hất văng / choáng, nứt đất
 *  cloud      – (cỏ) bột bào tử phun hình quạt từ củ, đám mây lưu lại gây trạng thái
 *  tether     – (cỏ) hạt cắm vào địch, mọc dây hút máu nối về người, lan sang địch gần
 *  rain       – vòng cảnh báo trên (các) mục tiêu → sét / thiên thạch / giọt nước rơi từ trời xuống
 *
 * Dự kiến (chưa làm – chiêu khai báo các id này sẽ rơi về đường cast cũ):
 *  trap   – vùng gài, kích hoạt sau một lúc · summon – gọi trợ thủ / tháp bắn tạm thời
 */
export type ArchetypeId = 'bolt' | 'dashStrike' | 'stream' | 'blast' | 'nova' | 'chain' | 'rain' | 'whip' | 'cloud' | 'tether' | 'telekinesis' | 'blizzard' | 'lance' | 'gale' | 'strike' | 'counter' | 'slam' | 'cross' | 'boomerang' | 'barrier' | 'singularity'
  | 'wingslash' | 'sonic' | 'clones' | 'bodyslam' | 'throw' | 'shellspin' | 'fan' | 'sweep' | 'serpent' | 'dive' | 'lob' | 'roll' | 'fallers' | 'ridge' | 'quicksand' | 'ambush' | 'twister' | 'web' | 'swarm' | 'triattack' | 'beam'
  | 'arcshot' | 'phoenixdash' | 'xslash' | 'forkbolt' | 'blink' | 'stormcloud' | 'powergrid' | 'aurora' | 'iceglide' | 'prism' | 'icewall';
export type PlannedArchetypeId = 'trap' | 'summon';
export const IMPLEMENTED_ARCHETYPES: readonly ArchetypeId[] = ['bolt', 'dashStrike', 'stream', 'blast', 'nova', 'chain', 'rain', 'whip', 'cloud', 'tether', 'telekinesis', 'blizzard', 'lance', 'gale', 'strike', 'counter', 'slam', 'cross', 'boomerang', 'barrier', 'singularity',
  'wingslash', 'sonic', 'clones', 'bodyslam', 'throw', 'shellspin', 'fan', 'sweep', 'serpent', 'dive', 'lob', 'roll', 'fallers', 'ridge', 'quicksand', 'ambush', 'twister', 'web', 'swarm', 'triattack', 'beam', 'arcshot', 'phoenixdash', 'xslash', 'forkbolt', 'blink', 'stormcloud', 'powergrid', 'aurora', 'iceglide', 'prism', 'icewall'];

/**
 * Nguyên mẫu tuyệt chiêu (phím I).
 *  inferno      = vòng cột lửa + thiên thạch
 *  tsunami      = sóng thần quét ngang sân + xoáy nước hút địch
 *  thunderstorm = trời tối, sét giáng dày đặc + sét nảy chuỗi
 *  bloom        = bão cánh hoa xoay / rễ gai trồi khắp sân + đóa hoa khổng lồ nở rộ (hệ cỏ)
 */
export type UltArchetypeId = 'inferno' | 'tsunami' | 'thunderstorm' | 'bloom' | 'timestop' | 'absolutezero' | 'komode' | 'mindbreak' | 'draco' | 'flock' | 'wavefront' | 'chasm' | 'rockfall' | 'nightfall' | 'hyperbeam' | 'phoenix' | 'judgement' | 'aurorafall';

/** "Bộ từ vựng" hiệu ứng (vệt, nổ trúng, khói, vụ nổ, cháy xém, cột, vuốt) – xem dialects.ts */
export type FxDialectId = 'fire' | 'water' | 'electric' | 'grass' | 'ghost' | 'psychic' | 'ice' | 'fighting' | 'dragon' | 'rock' | 'ground' | 'flying' | 'poison' | 'bug' | 'normal' | 'generic';

export interface BoltParams {
  dialect: FxDialectId;
  /** tỉ lệ sprite (1 = như chiêu thường: bán kính ≥ 7 thì ×1,5) */
  scale: number;
  /** bán kính trúng (mặc định = move.radius) */
  hitRadius?: number;
  /** vệt sau đạn: thin = 1 hạt/khung, thick = 2 */
  trail: 'none' | 'thin' | 'thick';
  /** xác suất thêm 1 hạt khói/lửa dọc vệt mỗi khung */
  trailPuffChance: number;
  /** số viên mỗi lần bắn (≥ 1; > 1 thì tỏa đều splitSpreadDeg giữa các viên) */
  split: number;
  splitSpreadDeg: number;
  /** hệ số sát thương mỗi viên khi split > 1 */
  splitPowerMult: number;
  /** vệt gấp khúc như tia điện sau đạn (màu) – null = không */
  zigzag?: number | null;
  /** nảy sang thêm N địch khi trúng (ghi đè move.chain) */
  chain?: number;
  /** hệ số tốc độ đạn / thời gian bay / sát thương (mặc định 1) */
  speedMult?: number;
  lifeMult?: number;
  powerMult?: number;
  /** loạt đạn liên tiếp: số viên, trễ giữa các viên (ms), lệch ngang xen kẽ (px), sát thương mỗi viên (× power) */
  burst?: { n: number; gapMs: number; side: number; powerMult: number };
  /** chớp sáng nòng khi bắn: màu, cỡ; rung màn hình khi bắn */
  muzzle?: { color: number; size: number; shake?: [number, number] };
  /** nổ lan tại điểm trúng (gây sát thương cho địch xung quanh): bán kính, hệ số sát thương, rung, khựng hình */
  splash?: { r: number; power: number; shake: [number, number]; stopMs: number };
  /** bọt (dialect.smoke) dọc vệt: xác suất mỗi khung */
  foamChance?: number;
  /** vệt gấp khúc: độ dày, vẽ đôi (2 sợi lệch nhau) */
  zigWidth?: number;
  zigDouble?: boolean;
  /** âm thanh khi bắn */
  fireSfx?: SfxName;
  /** đạn lượn sóng: biên độ góc (rad) và tần số (rad/s); các viên xen kẽ ngược pha (cánh hoa xoáy) */
  curve?: { amp: number; freq: number };
  /** để lại vùng (dialect.scorch: rêu / gai...) tại điểm trúng: bán kính, thời gian (ms) */
  lingerOnHit?: { r: number; ms: number };
  /** cỏ: chọn ngẫu nhiên texture lá cho mỗi viên, vệt gió mảnh sau lá (không quầng sáng) */
  texPick?: string[];
  windTrail?: boolean;
  /** đạn gió: xoáy ốc nhiều vòng quay tít + vệt gió cong phía sau (thay cho hình đạn) */
  gust?: { color: number; color2: number; r: number };
  /** cỏ: lá xoáy quanh người `ms` rồi mới bay ra (lốc lá) */
  cyclone?: { ms: number; r: number };
}

export interface DashStrikeParams {
  dialect: FxDialectId;
  /** thời gian lao (ms) */
  dashMs: number;
  /** bất tử thêm sau khi lao (ms) */
  iframeExtraMs: number;
  /** số hạt vệt mỗi khung khi lao (0 = không) */
  trailCount: number;
  /** vẽ vệt vuốt/chém tại điểm cuối */
  streaks: boolean;
  impactShake: [number, number];
  impactSfx: SfxName | null;
  /** bóng mờ (afterimage) dọc đường lao: số bóng + màu tô (0 = không) */
  afterimages?: number;
  afterimageTint?: number;
  /** thời gian mờ dần của bóng (ms) */
  afterimageMs?: number;
  /** hệ số quãng lao (so với move.lunge) */
  lungeMult?: number;
  /** sóng xung kích tại điểm cuối: bán kính, hệ số sát thương, lực đẩy, 2 màu, rung thêm */
  shockwave?: { r: number; power: number; push: number; color: number; color2: number; stopMs: number };
  /** cung bọt cong quét quanh điểm cuối (đường chém cong): bán kính, màu */
  arc?: { r: number; color: number; core: number };
  /** vòng bong bóng nổ quanh người ở điểm cuối: số bóng, bán kính */
  bubbleRing?: { n: number; r: number };
  /** âm khi lao */
  startSfx?: SfxName;
  /** cung chém thứ hai (lưỡi liềm đôi), quét phía đối diện */
  arc2?: { r: number; color: number; core: number };
  /** vài nhát cào nhỏ tại điểm cuối (không lửa): số nhát, dài, màu, lõi */
  scratch?: { n: number; len: number; color: number; core: number };
  /** bọc thân trong lửa / hào quang khi lao (Flare Blitz): màu ngoài, màu lõi */
  wrap?: { color: number; core: number };
  /** dây leo cong vút (sào nhảy) từ chỗ xuất phát tới điểm cuối: độ cong (px), màu, lõi */
  vine?: { h: number; color: number; core: number };
  /** rễ gai trồi dọc đường lao: số rễ, khoảng cách, chiều cao, trễ mỗi rễ (ms) */
  roots?: { n: number; step: number; h: number; delayMs: number };
}

export interface StreamLayer {
  /** chiều dài (× độ dài dòng), bề rộng ở miệng (px), bề rộng cuối (× nửa bề rộng dòng) */
  len: number;
  w0: number;
  w1: number;
  color: number;
  alpha: number;
}

export interface StreamParams {
  /** tia xoắn gen (huyền thoại): hai sợi sin quấn nhau + nấc ngang */
  helix?: { colors: [number, number]; amp: number; wave: number };
  /** tia vòng (Siêu linh): chuỗi vòng elip chạy dọc đường bắn thay cho các hình nêm màu */
  ringBeam?: { n: number; colors: number[]; spin: number };
  dialect: FxDialectId;
  telegraphMs: number;
  /** khoảng cách giữa 2 nhịp sát thương (ms) */
  tickMs: number;
  /** tốc độ xoay theo mục tiêu khi phun / khi ngắm (rad/s) */
  turnRate: number;
  telegraphTurn: number;
  /** tổng sát thương = power × mult (chia đều các nhịp) */
  totalPowerMult: number;
  tickKnockback: number;
  telegraphColor: number;
  telegraphRing: number;
  /** các lớp lõi từ ngoài vào trong */
  layers: StreamLayer[];
  /** số dòng song song (2 = pháo đôi) + khoảng cách giữa các dòng (px) */
  beams?: number;
  beamGap?: number;
  /** hệ số dài / rộng so với move.line / move.lineWidth */
  lenMult?: number;
  widthMult?: number;
  /** hệ số thời gian phun (so với move.sprayMs) và mật độ hạt */
  durMult?: number;
  sprayMult?: number;
  /** quét qua lại khi phun: biên độ (rad) và số chu kỳ trong suốt thời gian phun (tắt bám mục tiêu) */
  sweep?: { amp: number; cycles: number; phase?: number };
  /** rung khi phun [cường độ, mỗi nhịp] và chớp nòng (màu, cỡ) */
  shake?: [number, number];
  muzzle?: { color: number; size: number };
  /** xác suất bọt ở dòng mỗi khung (dialect.smoke dọc dòng) */
  foamAlong?: number;
  /** kéo địch về phía người thay vì đẩy ra (roi dây leo) */
  pull?: boolean;
  /** ánh sáng hội tụ về người trong lúc ngắm (Tia Mặt Trời): màu, số hạt mỗi khung, bán kính */
  gather?: { color: number; n: number; r: number };
  /** cỏ (Solar Beam): ánh sáng xoắn ốc hội tụ vào CỦ trên lưng (thay cho quả cầu ở miệng): màu hạt, màu ánh củ, bán kính, số hạt/giây */
  bulb?: { color: number; color2: number; r: number; rate: number };
  /** cỏ: để lại vệt cỏ bị cắt / rạp dọc đường tia (ms) */
  scar?: number;
}

export interface BlastParams {
  dialect: FxDialectId;
  telegraphMs: number;
  /** tốc độ cầu bay (px/s) */
  speed: number;
  hitStopMs: number;
  /** độ cong tối đa của đường bay (px) */
  arcHeight: number;
  ballTexture: string;
  ballScale: number;
  haloScale: number;
  haloTint: number;
  /** màu vạch chấm, nền vòng, vòng lấp đầy, viền vòng */
  telegraphLine: number;
  telegraphFill: number;
  telegraphFill2: number;
  telegraphStroke: number;
  /** vùng cháy lưu lại sau nổ (null = không) */
  linger: { ms: number; tickMs: number; powerMult: number; radiusMult: number; color: number; status?: boolean; slow?: number; drain?: number } | null;
  /** nổ hình sao nhiều cánh: số cánh, màu, lõi (Đại Hỏa) – cũng vẽ vạch ngắm hình sao */
  star?: { points: number; color: number; core: number };
  /** sóng xung kích nền + mảnh vỡ bay + rung mạnh hơn */
  shockwave?: { color: number; color2: number };
  debris?: number;
  shake?: [number, number];
  /** gai / rễ trồi quanh điểm nổ: số, bán kính (× r), chiều cao */
  spikes?: { n: number; r: number; h: number };
  /** cầu quay tròn khi bay (rad/khung, mặc định 0,4) */
  spin?: number;
}

export interface NovaRing {
  /** màu viền, độ dày, độ đậm, hệ số bán kính (so với bán kính sóng) */
  color: number;
  width: number;
  alpha: number;
  r: number;
}

export interface NovaParams {
  dialect: FxDialectId;
  /** bán kính (mặc định = move.burstRadius) */
  radius?: number;
  /** số nhịp sóng, khoảng cách giữa các nhịp (ms), mỗi nhịp to thêm × */
  pulses: number;
  pulseGapMs: number;
  pulseGrowth: number;
  /** chờ trước nhịp đầu (ms) – không vạch cảnh báo, chỉ cúi người */
  delayMs: number;
  /** thời gian vòng lan hết bán kính (ms) */
  expandMs: number;
  /** lực đẩy văng (ghi đè move.knockback) */
  push: number;
  /** sát thương mỗi nhịp (× power), theo thứ tự; thiếu thì lấy phần tử cuối */
  pulsePower: number[];
  /** đánh tại điểm mục tiêu thay vì quanh người */
  atTarget: boolean;
  /** dẹt theo phối cảnh (y × squash) */
  squash: number;
  fill: number;
  fillAlpha: number;
  /** các lớp vòng viền (ngoài → trong) */
  rings: NovaRing[];
  /** mật độ hạt (dialect.trail) dọc mép vòng khi lan (~sprayCount/6 mỗi khung) */
  sprayCount: number;
  /** số "ngọn sóng" (dialect.pillar) dựng lên dọc mép vòng mỗi nhịp */
  crests: number;
  shake: [number, number];
  /** để lại vệt (dialect.scorch: vũng nước / tĩnh điện / cháy xém) quanh vòng: số vệt, bán kính, thời gian */
  residue: { count: number; r: number; ms: number } | null;
  hitStopMs: number;
  /** chiều cao ngọn sóng (mặc định 2,5) */
  crestH?: number;
  /** xoáy bong bóng quay quanh tâm trong lúc lan: số hạt mỗi khung */
  swirl?: number;
  /** chớp màn hình (r,g,b) ở nhịp đầu */
  flash?: [number, number, number];
  /** vòng cánh hoa / lá xoay quanh tâm khi lan ra: số cánh, texture, tốc độ xoay (rad/s), cỡ, số tia xoắn */
  orbit?: { n: number; tex: string; spin: number; scale: number; arms?: number };
}

export interface ChainParams {
  dialect: FxDialectId;
  /** tầm tìm mục tiêu đầu (px) */
  range: number;
  /** số lần nảy, tầm nảy (px), hệ số sát thương mỗi lần nảy (nhân dồn) */
  jumps: number;
  jumpRange: number;
  falloff: number;
  /** trễ giữa các lần nảy (ms) */
  jumpDelayMs: number;
  /** tỉ lệ tê liệt mỗi lần trúng (ghi đè move.status.chance nếu có) */
  paralyzeChance: number;
  hitStopMs: number;
  /** màu tia ngoài / lõi, độ dày, độ gấp khúc */
  color: number;
  core: number;
  width: number;
  jitter: number;
  /** chớp sáng ở mục tiêu đầu */
  flash: boolean;
  /** vết tĩnh điện lưu lại ở mỗi mục tiêu (dialect.scorch): bán kính, ms – null = không */
  residue: { r: number; ms: number } | null;
  /** rung ở mục tiêu đầu */
  shake?: number;
  /** vẽ đôi (2 sợi lõi lệch nhau) cho tia dày */
  double?: boolean;
}

export interface RainParams {
  dialect: FxDialectId;
  /** số đòn rơi, tỏa quanh mục tiêu (px) */
  count: number;
  spread: number;
  /** ưu tiên rơi lên các địch gần mục tiêu (thay vì ngẫu nhiên quanh) */
  seekEnemies: boolean;
  /** vòng cảnh báo (ms) trước đòn đầu, trễ giữa các đòn (ms) */
  telegraphMs: number;
  staggerMs: number;
  /** bán kính trúng mỗi đòn (mặc định = move.burstRadius) */
  radius?: number;
  /** hình dạng đòn rơi */
  kind: 'bolt' | 'meteor' | 'drop' | 'root';
  /** sát thương mỗi đòn (× power) */
  powerMult: number;
  color: number;
  core: number;
  telegraphColor: number;
  hitStopMs: number;
  shake: [number, number];
  /** vết lưu lại (dialect.scorch) – null = không */
  residue: { r: number; ms: number } | null;
  /** độ dày tia sét (kind 'bolt'; mặc định 4) */
  boltWidth?: number;
  /** kind 'root': số đợt rễ trồi lại cùng chỗ, cách nhau (ms), hệ số sát thương mỗi đợt sau; số gai bao quanh mỗi điểm; chiều cao */
  waves?: { n: number; gapMs: number; power: number };
  spikes?: number;
  pillarH?: number;
  /** kind 'root': vạch cảnh báo là vết nứt gai (không elip) + rễ trồi nối tiếp từ người tới mục tiêu */
  crackTelegraph?: boolean;
  rootLine?: number;
}

/** Tâm linh nhấc bổng: vòng ma thuật → (hút vào) → nhấc lên → quật xuống */
export interface TelekinesisParams {
  dialect: FxDialectId;
  /** bán kính vòng (px) */
  r: number;
  telegraphMs: number;
  /** thời gian hút/nhấc lên, thời gian giữ lơ lửng (ms) */
  pullMs: number;
  holdMs: number;
  /** độ nhấc lên (px) */
  liftH: number;
  /** hút địch vào giữa vòng */
  pull: boolean;
  /** hệ số sát thương lúc quật xuống */
  slamMult: number;
  /** 4 màu: viền ngoài, nền, viền trong, sao */
  colors: number[];
  hitStopMs?: number;
  shake?: [number, number];
}

/** Mưa Băng (Băng): bóng báo trước → nhiều giá băng dài rơi đâm xuống đất, cụm tinh thể; gió tuyết ngang quét qua, cộng Lạnh dần */
export interface BlizzardParams {
  dialect: FxDialectId;
  windupMs: number;
  /** khoảng cách đặt vùng khi không khóa được địch (px) */
  reach: number;
  /** nửa chiều rộng vùng (px) */
  r: number;
  /** thời gian gió thổi, nhịp gây Lạnh (ms) */
  ms: number;
  tickMs: number;
  /** số giá băng, cách nhau (ms), thời gian rơi, chiều dài (px) */
  count: number;
  fallGapMs: number;
  fallMs: number;
  icicleH: number;
  powerMult: number;
  shake: [number, number];
}

/** Mũi Băng (Băng): cột tinh thể lăng trụ mọc dài ra phía trước từng đốt, để lại mảng băng rách góc làm trơn */
export interface LanceParams {
  dialect: FxDialectId;
  telegraphMs: number;
  len: number;
  segs: number;
  growMs: number;
  /** nửa bề rộng lăng trụ, độ cao tăng dần mỗi đốt (px) */
  w: number;
  growH: number;
  branch: boolean;
  powerMult: number;
  frost: { n: number; r: number; ms: number };
}

/** Gió Tuyết (Băng): đường gió dài thổi ngang một dải phía trước */
export interface GaleParams {
  dialect: FxDialectId;
  windupMs: number;
  len: number;
  wid: number;
  ms: number;
  tickMs: number;
  streaks: number;
  powerMult: number;
}

/** Không Độ Tuyệt Đối (Băng): đóng băng cả sân rồi vỡ nát cùng lúc */
export interface AbsoluteZeroParams {
  dialect: FxDialectId;
  windupMs: number;
  r: number;
  freezeMs: number;
  slamPower: number;
}

/** Chặt (Giác đấu): 1 hoặc nhiều nhát / nắm đấm bay trong hình quạt ngắn phía trước */
export interface StrikeParams {
  dialect: FxDialectId;
  hits: number;
  gapMs: number;
  reach: number;
  halfDeg: number;
  /** dùng nắm đấm bay thay cho vệt chặt (Machamp) */
  fists: boolean;
  /** hệ số sát thương mỗi nhát */
  powerMult: number;
}

/** Phản Đòn (Giác đấu): giữ thế đỡ; bị đánh trúng thì giảm sát thương, phản lại mọi địch gần và tăng L/U kế tiếp */
export interface CounterParams {
  dialect: FxDialectId;
  stanceMs: number;
  /** hệ số sát thương nhận vào khi đỡ (0,3 = nhận 30%) */
  reduce: number;
  reach: number;
  /** số nắm đấm bay vào mỗi địch khi phản (0 = không) */
  fists: number;
  counterMult: number;
  buffMs: number;
  buffMult: number;
}

/** Quật / Đấm khổng lồ (Giác đấu) */
export interface SlamParams {
  dialect: FxDialectId;
  /** toss: tóm ném qua vai · spin: xoay 1 vòng rồi ném · mega: gồng rồi nắm đấm khổng lồ giáng xuống */
  mode: 'toss' | 'spin' | 'mega';
  reach: number;
  tossDist: number;
  flyMs: number;
  spinMs?: number;
  windupMs?: number;
  /** bán kính trúng đòn (mega), cỡ nắm đấm (mega) */
  hitR?: number;
  size?: number;
  stunMs: number;
  powerMult: number;
}

/** Chặt chéo (chữ X) hoặc Trăm cú đấm (barrage) */
export interface CrossParams {
  dialect: FxDialectId;
  windupMs: number;
  r: number;
  size: number;
  powerMult: number;
  barrage?: { n: number; gapMs: number };
}

/** Đấm Hạ Gục (Giác đấu): truyện tranh toàn màn hình, lao qua từng địch tung loạt đấm, nổ cuối + chữ K.O.! */
export interface KoModeParams {
  dialect: FxDialectId;
  windupMs: number;
  maxTargets: number;
  perTargetMs: number;
  hitsPer: number;
  hitPower: number;
  slamPower: number;
  ko: boolean;
}

/** Lưỡi Cắt Tâm Linh (huyền thoại): lưỡi liềm bay ra xuyên địch rồi quay lại chém lần hai */
export interface BoomerangParams {
  dialect: FxDialectId;
  blades: number;
  spreadDeg: number;
  range: number;
  /** thời gian bay ra (ms); tổng = ×2 */
  flyMs: number;
  /** độ cong đường bay (px), cỡ lưỡi (px) */
  curve: number;
  size: number;
  powerMult: number;
  colors: number[];
}

/** Lá Chắn Lục Giác (huyền thoại): tổ ong lục giác hấp thụ đòn đầu, vỡ thì đẩy địch văng */
export interface BarrierParams {
  dialect: FxDialectId;
  ms: number;
  reach: number;
  push: number;
  /** bán kính mỗi ô lục giác (px) */
  cell: number;
  colors: number[];
}

/** Giếng Trọng Lực (huyền thoại): xoáy đen hút địch, nén lại rồi nổ */
export interface SingularityParams {
  dialect: FxDialectId;
  windupMs: number;
  pullMs: number;
  r: number;
  powerMult: number;
  stunMs: number;
  shake: [number, number];
  colors: number[];
}

/** Mind Break (huyền thoại): khối tà diện tím nhốt địch rồi vỡ thành trăm mảnh */
export interface MindBreakParams {
  dialect: FxDialectId;
  windupMs: number;
  r: number;
  gatherMs: number;
  holdMs: number;
  shards: number;
  slamPower: number;
  colors: number[];
}

/** Tham số 'lỏng' cho các khuôn của 7 hệ mới (đọc theo khóa trong từng hàm cast, mặc định ở kits.ts) */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type LooseParams = { dialect: FxDialectId } & { [k: string]: any };

export interface WhipParams {
  dialect: FxDialectId;
  /** lash: 2 dây quét cung / slam: 2 dây vút lên rồi đập xuống / xslam: 2 dây đập chéo thành chữ X */
  style: 'lash' | 'slam' | 'xslam';
  thick: number;
  /** tầm với (px) và nửa góc quét trúng (độ) */
  reach: number;
  halfAngleDeg: number;
  extendMs: number;
  holdMs: number;
  retractMs: number;
  /** hệ số quãng lao tới địch (0 = đứng yên; dùng move.lunge) */
  lungeMult: number;
  /** bán kính vùng đập (slam / xslam) */
  slamR?: number;
  /** choáng (ms) – boss không bị */
  stunMs?: number;
  /** lực hất văng / kéo (ghi đè move.knockback) */
  push?: number;
  pull?: boolean;
  /** hệ số sát thương đòn đập (1 = move.power) */
  powerMult?: number;
  shake: [number, number];
  stopMs: number;
  /** vết nứt đất khi đập */
  crack?: boolean;
  sfx?: SfxName;
}

export interface CloudParams {
  dialect: FxDialectId;
  /** bảng màu bột: 1 bảng = 1 màu; 2 bảng = nửa trái / nửa phải (độc tím + tê vàng) */
  colors: number[][];
  halfDeg: number;
  range: number;
  puffN: number;
  /** thời gian đám mây lưu lại (ms), nhịp gây hiệu ứng (ms), sát thương mỗi nhịp (× power / số nhịp) */
  lingerMs: number;
  tickMs: number;
  totalPowerMult: number;
  /** trạng thái gây ra mỗi nhịp (xoay vòng theo nhịp) */
  statuses: { kind: StatusKind; chance: number; ms: number }[];
  shake: [number, number];
}

export interface TetherParams {
  dialect: FxDialectId;
  /** thời gian hạt bay, độ vồng đường bay (px), tầm tìm địch (px) */
  flyMs: number;
  arcH: number;
  range: number;
  /** thời gian dây hút máu (ms), nhịp xung sáng (ms) */
  drainMs: number;
  pulseMs: number;
  /** lan sang N địch gần nhất trong spreadRange (px) sau spreadDelayMs */
  spread: number;
  spreadRange: number;
  spreadDelayMs: number;
}

export interface InfernoParams {
  dialect: FxDialectId;
  /** gồng trước khi bung (ms) */
  windupMs: number;
  flash: [number, number, number];
  shockFill: number;
  shockStroke: number;
  /** các vòng cột lửa lan ra (bán kính, số cột) */
  rings: { r: number; n: number }[];
  ringStaggerMs: number;
  /** sát thương mỗi vòng (× sức mạnh tuyệt chiêu) */
  ringPower: number;
  meteor: { flyMs: number; fromDx: number; fromDy: number; scale: number; haloScale: number; haloTint: number; scorchR: number; scorchMs: number; firstMs: number; perTargetMs: number; perHitMs: number };
  /** thiên thạch trang trí rơi quanh người */
  extraMeteors: number;
  /** người dùng bay lên (sprite nhấc cao h px trong ms) */
  lift?: { h: number; ms: number };
  /** chiều cao cột lửa (mặc định 4 + chỉ số vòng) */
  pillarH?: number;
  /** pháo hoa kết: bán kính nổ, màu, số cột bắn lên cuối cùng */
  flare?: { r: number; color: number; color2: number; pillars: number };
}

export interface BloomParams {
  dialect: FxDialectId;
  windupMs: number;
  flash: [number, number, number];
  /** bão cánh hoa xoay quanh người rồi nở rộng: số cánh, thời gian, bán kính tối đa, sát thương mỗi nhịp (× ult), nhịp (ms) */
  storm?: { n: number; ms: number; r: number; power: number; tickMs: number; tex: string; /** cỏ: 2 dòng cánh hoa xoắn ốc quay (thay vòng tròn) */ spiral?: boolean };
  /** cỏ: rễ trồi dọc các tia hướng ra từ người (thay vòng rễ tròn): số tia, khoảng cách rễ, xa tối đa, trễ giữa các rễ (ms) */
  arms?: { n: number; step: number; max: number; delayMs: number };
  /** các vòng rễ gai trồi lên lan ra (bán kính, số rễ) */
  rings: { r: number; n: number }[];
  ringStaggerMs: number;
  ringPower: number;
  /** rễ gai dưới chân mọi địch: trễ đầu, giữa các địch, giữa các đòn (ms), chiều cao, gai bao quanh */
  firstMs: number;
  perTargetMs: number;
  perHitMs: number;
  rootH: number;
  rootSpikes: number;
  /** đóa hoa khổng lồ nở ở giữa rồi nổ: bán kính, thời gian nở, sát thương nổ (× ult); null = không */
  bloom: { r: number; ms: number; power: number; color: number; color2: number } | null;
  /** để lại vệt rêu làm chậm dưới địch */
  moss: { r: number; ms: number } | null;
  shake: number;
  /** hồi % máu tối đa cho người dùng */
  heal?: number;
}

export interface TsunamiParams {
  dialect: FxDialectId;
  windupMs: number;
  flash: [number, number, number];
  /** sóng quét ngang sân theo hướng người dùng nhìn: thời gian quét, bề dày sóng (px), màu các lớp */
  sweepMs: number;
  waveThick: number;
  waveColors: number[];
  /** sát thương khi sóng đi qua (× sức mạnh tuyệt chiêu) */
  wavePower: number;
  /** xoáy nước tại các địch sau sóng: số xoáy tối đa, bán kính, thời gian, nhịp, sát thương mỗi nhịp, lực hút (px/s) */
  whirlpools: { max: number; r: number; ms: number; tickMs: number; power: number; pull: number; delayMs: number };
  /** sóng hình quạt: độ lệch mép theo khoảng cách dọc tới người (0 = thẳng) */
  fanSlope?: number;
  /** thời gian chớp màn hình (ms), rung (cường độ) */
  flashMs?: number;
  shake?: number;
}

export interface ThunderstormParams {
  dialect: FxDialectId;
  windupMs: number;
  flash: [number, number, number];
  /** độ tối bầu trời */
  darken: number;
  darkenMs: number;
  /** sét trên mỗi địch: số lần = u.hits; nhịp giữa các tia */
  perTargetMs: number;
  perHitMs: number;
  firstMs: number;
  /** sét trang trí ngẫu nhiên */
  extraStrikes: number;
  strikeR: number;
  /** cuối bão: sét nảy chuỗi qua N địch */
  finaleChain: number;
  finalePower: number;
  color: number;
  core: number;
}

export interface ArchetypeParamMap {
  bolt: BoltParams;
  dashStrike: DashStrikeParams;
  stream: StreamParams;
  blast: BlastParams;
  nova: NovaParams;
  chain: ChainParams;
  rain: RainParams;
  whip: WhipParams;
  cloud: CloudParams;
  tether: TetherParams;
  telekinesis: TelekinesisParams;
  blizzard: BlizzardParams;
  lance: LanceParams;
  strike: StrikeParams;
  counter: CounterParams;
  slam: SlamParams;
  cross: CrossParams;
  boomerang: BoomerangParams;
  barrier: BarrierParams;
  singularity: SingularityParams;
  fan: LooseParams;
  sweep: LooseParams;
  wingslash: LooseParams;
  sonic: LooseParams;
  clones: LooseParams;
  bodyslam: LooseParams;
  throw: LooseParams;
  shellspin: LooseParams;
  serpent: LooseParams;
  dive: LooseParams;
  lob: LooseParams;
  roll: LooseParams;
  fallers: LooseParams;
  ridge: LooseParams;
  quicksand: LooseParams;
  ambush: LooseParams;
  twister: LooseParams;
  web: LooseParams;
  swarm: LooseParams;
  triattack: LooseParams;
  beam: LooseParams;
  arcshot: LooseParams;
  phoenixdash: LooseParams;
  xslash: LooseParams;
  forkbolt: LooseParams;
  blink: LooseParams;
  stormcloud: LooseParams;
  powergrid: LooseParams;
  aurora: LooseParams;
  iceglide: LooseParams;
  prism: LooseParams;
  icewall: LooseParams;
  gale: GaleParams;
}

/** Ngưng Đọng Thời Gian (Siêu linh): tối màn hình, vòng ma thuật phủ sân, đóng băng + nhấc bổng mọi địch, lưỡi dao tâm linh xoay rồi lao đâm, cuối cùng quật xuống cùng lúc */
export interface TimeStopParams {
  dialect: FxDialectId;
  windupMs: number;
  /** bán kính vòng ma thuật (px thế giới) */
  r: number;
  darken: number;
  /** tổng thời gian đóng băng = lúc quật xuống */
  freezeMs: number;
  liftMs: number;
  liftH: number;
  blades: number;
  /** mốc bắt đầu xoay, mốc phóng, thời gian bay của lưỡi dao */
  orbitFromMs: number;
  launchMs: number;
  bladeFlyMs: number;
  /** sát thương lưỡi dao / cú quật (× amount của tuyệt chiêu) */
  bladePower: number;
  slamPower: number;
  colors: number[];
}

export interface UltParamMap {
  inferno: InfernoParams;
  tsunami: TsunamiParams;
  thunderstorm: ThunderstormParams;
  bloom: BloomParams;
  timestop: TimeStopParams;
  absolutezero: AbsoluteZeroParams;
  komode: KoModeParams;
  mindbreak: MindBreakParams;
  draco: LooseParams;
  flock: LooseParams;
  wavefront: LooseParams;
  chasm: LooseParams;
  rockfall: LooseParams;
  nightfall: LooseParams;
  hyperbeam: LooseParams;
  phoenix: LooseParams;
  judgement: LooseParams;
  aurorafall: LooseParams;
}

/** Bậc theo cấp: áp mọi bậc có minLevel ≤ cấp, theo thứ tự (gộp dần). Có thể đổi cả cost. */
export type TierDef<P> = { minLevel: number; cost?: number } & Partial<P>;

/** Cấu hình một nguyên mẫu trong bộ chiêu của hệ / loài */
export interface KitEntry<P> {
  params?: Partial<P>;
  tiers?: TierDef<P>[];
  cost?: number;
}

/** Bộ chiêu mặc định của một hệ: cách hệ đó "nói" bằng từng nguyên mẫu */
export interface TypeKit {
  bolt?: KitEntry<BoltParams>;
  dashStrike?: KitEntry<DashStrikeParams>;
  stream?: KitEntry<StreamParams>;
  blast?: KitEntry<BlastParams>;
  nova?: KitEntry<NovaParams>;
  chain?: KitEntry<ChainParams>;
  rain?: KitEntry<RainParams>;
  whip?: KitEntry<WhipParams>;
  cloud?: KitEntry<CloudParams>;
  tether?: KitEntry<TetherParams>;
  telekinesis?: KitEntry<TelekinesisParams>;
  blizzard?: KitEntry<BlizzardParams>;
  lance?: KitEntry<LanceParams>;
  strike?: KitEntry<StrikeParams>;
  counter?: KitEntry<CounterParams>;
  slam?: KitEntry<SlamParams>;
  cross?: KitEntry<CrossParams>;
  boomerang?: KitEntry<BoomerangParams>;
  barrier?: KitEntry<BarrierParams>;
  singularity?: KitEntry<SingularityParams>;
  fan?: KitEntry<LooseParams>;
  sweep?: KitEntry<LooseParams>;
  wingslash?: KitEntry<LooseParams>;
  sonic?: KitEntry<LooseParams>;
  clones?: KitEntry<LooseParams>;
  bodyslam?: KitEntry<LooseParams>;
  throw?: KitEntry<LooseParams>;
  shellspin?: KitEntry<LooseParams>;
  serpent?: KitEntry<LooseParams>;
  dive?: KitEntry<LooseParams>;
  lob?: KitEntry<LooseParams>;
  roll?: KitEntry<LooseParams>;
  fallers?: KitEntry<LooseParams>;
  ridge?: KitEntry<LooseParams>;
  quicksand?: KitEntry<LooseParams>;
  ambush?: KitEntry<LooseParams>;
  twister?: KitEntry<LooseParams>;
  web?: KitEntry<LooseParams>;
  swarm?: KitEntry<LooseParams>;
  triattack?: KitEntry<LooseParams>;
  beam?: KitEntry<LooseParams>;
  arcshot?: KitEntry<LooseParams>;
  phoenixdash?: KitEntry<LooseParams>;
  xslash?: KitEntry<LooseParams>;
  forkbolt?: KitEntry<LooseParams>;
  blink?: KitEntry<LooseParams>;
  stormcloud?: KitEntry<LooseParams>;
  powergrid?: KitEntry<LooseParams>;
  aurora?: KitEntry<LooseParams>;
  iceglide?: KitEntry<LooseParams>;
  prism?: KitEntry<LooseParams>;
  icewall?: KitEntry<LooseParams>;
  gale?: KitEntry<GaleParams>;
  inferno?: Partial<InfernoParams>;
  tsunami?: Partial<TsunamiParams>;
  thunderstorm?: Partial<ThunderstormParams>;
  bloom?: Partial<BloomParams>;
  timestop?: Partial<TimeStopParams>;
  absolutezero?: Partial<AbsoluteZeroParams>;
  komode?: Partial<KoModeParams>;
  mindbreak?: Partial<MindBreakParams>;
  draco?: Partial<LooseParams>;
  flock?: Partial<LooseParams>;
  wavefront?: Partial<LooseParams>;
  chasm?: Partial<LooseParams>;
  rockfall?: Partial<LooseParams>;
  nightfall?: Partial<LooseParams>;
  hyperbeam?: Partial<LooseParams>;
  phoenix?: Partial<LooseParams>;
  judgement?: Partial<LooseParams>;
  aurorafall?: Partial<LooseParams>;
}

/** Ghi đè cho một ô chiêu của một loài */
export type SlotOverride = {
  [A in ArchetypeId]: { archetype: A } & KitEntry<ArchetypeParamMap[A]>;
}[ArchetypeId] | { archetype?: undefined; cost?: number };

export interface SpeciesKit {
  /** dùng lại một mẫu có tên (KIT_TEMPLATES, vd. 'water.heavy'); các ô/tham số khai báo ở đây ghi đè lên mẫu */
  template?: string;
  /** dùng bộ chiêu của hệ khác (mặc định: hệ của chiêu) */
  kitType?: string;
  slots?: Partial<Record<SkillSlot, SlotOverride>>;
  ult?: UltArchetypeId;
  /** ghi đè tham số tuyệt chiêu (theo nguyên mẫu `ult`) */
  ultParams?: Partial<InfernoParams & TsunamiParams & ThunderstormParams & BloomParams & TimeStopParams & AbsoluteZeroParams & KoModeParams & MindBreakParams & LooseParams>;
}

interface SpecBase {
  /** năng lượng tiêu tốn mỗi lần dùng */
  cost: number;
  /** số bậc cấp đã áp / tổng số bậc */
  tier: number;
  tierCount: number;
  /** cấp mở bậc kế tiếp (null = đã tối đa) */
  nextTierAt: number | null;
  /** nguồn cấu hình (để Skill Lab hiển thị) */
  source: 'species' | 'move' | 'legacy';
}

/** Chiêu đã phân giải: nguyên mẫu + tham số cuối cùng (hoặc null = đường cast cũ) */
export type SkillSpec =
  | (SpecBase & { archetype: null })
  | { [A in ArchetypeId]: SpecBase & { archetype: A; params: ArchetypeParamMap[A] } }[ArchetypeId];

export type UltSpec = { [U in UltArchetypeId]: { archetype: U; params: UltParamMap[U] } }[UltArchetypeId];
