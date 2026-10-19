// Kiểu dữ liệu chiêu thức + hàm dựng chiêu (P: đạn, C: cận chiến, B: quanh người/tại mục tiêu, F: tự cường hóa).
// Tách riêng để các file nội dung từng chương (data/chapters) dùng mà không vòng import với moves.ts.
// Định nghĩa chiêu thức. Mỗi loài mở dần các ô chiêu J / K / L / U theo cấp (xem learnset trong pokemon.ts).
// Mỗi chiêu có một cơ chế riêng (xuyên, nảy, boomerang, lao tới, mây độc, chui đất...) và trạng thái riêng
// (Bỏng, Nhiễm độc, Tê liệt, Rối loạn, Hạt hút máu), để mỗi Pokémon chơi một kiểu.
import type { AnimName } from './spriteSheets';
import type { PokemonType } from './types';
import type { SfxName } from '../systems/sfx';
import type { ArchetypeId } from '../skills/types';

/** projectile: đạn · cone: cận chiến trước mặt · burst: quanh người / tại mục tiêu · buff: tự cường hóa */
export type MoveKind = 'projectile' | 'cone' | 'burst' | 'buff';

export type StatusKind = 'burn' | 'poison' | 'paralyze' | 'confuse' | 'seed' | 'sleep' | 'freeze';

export const STATUS_LABEL: Record<StatusKind, string> = {
  burn: 'Bỏng', poison: 'Nhiễm độc', paralyze: 'Tê liệt', confuse: 'Rối loạn', seed: 'Hạt hút máu', sleep: 'Ngủ', freeze: 'Đóng băng',
};
export const STATUS_COLOR: Record<StatusKind, string> = {
  burn: '#ff9a50', poison: '#c88aff', paralyze: '#ffe24a', confuse: '#ff9ad8', seed: '#8ae070', sleep: '#a8c0ff', freeze: '#9ae8ff',
};

export interface MoveDef {
  id: string;
  /** gắn lúc người chơi ra chiêu (BattleScene.castMove): ô chiêu + mã lần ra chiêu – dùng cho hoàn năng lượng J,
   *  tích tuyệt chiêu chỉ từ K/L/U và Thông thạo (mastery). Được giữ qua các bản sao { ...m }. */
  castSlot?: 'J' | 'K' | 'L' | 'U';
  castId?: number;
  name: string;
  type: PokemonType;
  kind: MoveKind;
  /** mô tả ngắn cơ chế đặc trưng (hiện ở màn Đội hình) */
  desc: string;
  /** sát thương gốc (nhân với sức mạnh theo cấp và khắc hệ) */
  power: number;
  cooldownMs: number;
  anim: AnimName;
  animMs: number;
  sfx: SfxName;
  knockback: number;
  /** icon trên thanh chiêu */
  icon: string;
  /** trạng thái gây lên địch khi trúng */
  status?: { kind: StatusKind; chance: number; ms: number };
  /** làm chậm mục tiêu (hệ số tốc độ) trong 2 giây */
  slow?: number;
  /** hồi lại phần sát thương gây ra */
  drain?: number;
  /** tỉ lệ chí mạng (×1,8) */
  crit?: number;
  /** cắt một nửa máu hiện tại (Siêu Nanh) */
  halveHp?: boolean;
  /** dùng liên tục trong 2 giây thì mạnh dần: +stack mỗi lần (tối đa 4 lần) */
  stack?: number;
  /** Ném Xu: mỗi lần trúng nhặt thêm số tiền này (cộng khi thắng ải) */
  money?: number;
  /** sát thương cố định = cấp người dùng × hệ số (không tính khắc hệ, Sóng Âm) */
  fixedPerLevel?: number;
  /** sức mạnh ngẫu nhiên ×0,5–2 và bán kính đổi theo (Cường Độ) */
  magnitude?: boolean;
  /** tự mất tỉ lệ máu hiện tại này (Tự Nổ) – không bao giờ tự gục */
  selfCost?: number;
  /** dịch chuyển tức thời (px) ra xa địch gần nhất (Dịch Chuyển) */
  blink?: number;
  /** tự hồi tỉ lệ máu tối đa (chiêu buff: Hồi Phục, Ngủ Sâu...) */
  heal?: number;
  /** gồng trước khi ra đòn (ms): đứng chậm lại, có vòng sáng báo hiệu (Tia Mặt Trời, Phá Hủy...) */
  windupMs?: number;
  /**
   * Nguyên mẫu trình diễn (skills/archetypes.ts): bolt · dashStrike · stream · blast. Tham số lấy từ bộ chiêu của hệ /
   * loài / bậc cấp (skills/kits.ts). Không đặt = đường cast cũ. (Loài cũng có thể gán nguyên mẫu cho ô chiêu trong SPECIES_KITS.)
   */
  archetype?: ArchetypeId;

  // ---- đạn ----
  speed?: number;
  lifeMs?: number;
  radius?: number;
  texture?: string;
  spin?: number;
  count?: number;
  spreadDeg?: number;
  /** xuyên qua địch */
  pierce?: boolean;
  /** hệ Băng: điểm Lạnh cộng thêm cho mỗi đòn trúng (mặc định 1 với chiêu hệ Băng); đủ 3 điểm → Đóng băng */
  chill?: number;
  /** mảnh băng vỡ (do Vỡ nát gây ra): không cộng Lạnh, không vỡ tiếp */
  shatterChild?: boolean;
  /** tự đuổi theo địch (rad/giây) */
  homing?: number;
  /** bay ra rồi quay về */
  boomerang?: boolean;
  /** nảy sang thêm N địch gần đó */
  chain?: number;
  /** nổ theo vùng khi trúng (bán kính) */
  explode?: number;

  // ---- cận chiến ----
  range?: number;
  halfAngleDeg?: number;
  sprayMs?: number;
  moveSlow?: number;
  particle?: string;
  /** lao tới mục tiêu (px) rồi mới đánh, không bị trúng đòn khi lao */
  lunge?: number;
  /** số nhát liên tiếp; randomHits = [min, max] */
  hits?: number;
  randomHits?: [number, number];
  hitGapMs?: number;
  /** đòn quất thẳng: dài × rộng (thay cho hình quạt) */
  line?: number;
  lineWidth?: number;

  // ---- quanh người / tại mục tiêu ----
  burstRadius?: number;
  /** đánh tại vị trí mục tiêu thay vì quanh người */
  atTarget?: boolean;
  /** số tia sét giáng xuống (Sấm Sét Lớn) */
  strikes?: number;
  /** để lại vùng mây tại mục tiêu */
  zone?: { radius: number; ms: number; tickMs: number };
  /** chui xuống đất (ms) rồi trồi lên */
  burrowMs?: number;
  /** xoay tít (ms), gây sát thương liên tục */
  spinMs?: number;

  // ---- tự cường hóa ----
  /** nhận sát thương × guard trong buffMs */
  guard?: number;
  buffMs?: number;
  /** tỉ lệ né đòn */
  evade?: number;
  /** phản lại đòn cận chiến (hệ số) */
  reflect?: number;
  /** tung ngẫu nhiên một chiêu khác */
  metronome?: boolean;
}

export type Base = Omit<MoveDef, 'kind' | 'anim' | 'animMs' | 'knockback'> & Partial<MoveDef>;
export const P = (m: Base): MoveDef => ({ kind: 'projectile', anim: 'attack', animMs: 240, knockback: 70, speed: 340, lifeMs: 760, radius: 4, ...m });
export const C = (m: Base): MoveDef => ({ kind: 'cone', anim: 'attack', animMs: 260, knockback: 150, range: 40, halfAngleDeg: 45, sprayMs: 140, moveSlow: 0.5, ...m });
export const B = (m: Base): MoveDef => ({ kind: 'burst', anim: 'charge', animMs: 360, knockback: 140, burstRadius: 80, ...m });
export const F = (m: Base): MoveDef => ({ kind: 'buff', anim: 'charge', animMs: 400, knockback: 0, ...m });
