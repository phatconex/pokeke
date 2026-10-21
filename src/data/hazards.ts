// Bẫy / cơ chế sân đấu (khai báo trong layout của sân, BattleScene xử lý).
import type { PokemonType } from './types';

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** hiệu ứng hình ảnh khi bẫy kích hoạt */
export type HazardFx = 'lightning' | 'flame' | 'spore' | 'rock' | 'ice' | 'shadow' | 'water' | 'psychic' | 'poison';

/** sát thương / làm chậm người chơi khi đứng trong vùng lúc bẫy kích hoạt */
export interface HazardHit {
  /** tỉ lệ máu tối đa (trước khắc hệ), vd 0.1 = 10% */
  damagePct: number;
  type: PokemonType;
  /** làm chậm người chơi (ms) – vd. bào tử buồn ngủ, băng */
  slowMs?: number;
  /** hệ Pokémon miễn nhiễm hoàn toàn (vd. hệ Đất với sàn điện) */
  immuneTypes?: PokemonType[];
}

export type HazardDef =
  /** các vùng cố định chia nhóm, lần lượt từng nhóm sáng báo hiệu (warnMs) rồi kích hoạt; mỗi periodMs đổi nhóm */
  | ({ kind: 'pulse'; areas: (Rect & { group: number })[]; periodMs: number; warnMs: number; fx: HazardFx; color: number } & HazardHit)
  /** mưa đòn: count vòng tròn ngẫu nhiên quanh người chơi, báo hiệu rồi nổ */
  | ({ kind: 'rain'; count: number; radius: number; periodMs: number; warnMs: number; fx: HazardFx; color: number; /** vũng lưu lại sau khi rơi (ms): chậm + mất máu theo nhịp */ puddleMs?: number } & HazardHit)
  /** nắp phun cố định chia nhóm: mỗi chu kỳ một nhóm báo trước (vòng đỏ) rồi phun cột lên; đứng trong vòng thì dính */
  | ({ kind: 'vents'; spots: { x: number; y: number; group: number }[]; radius: number; periodMs: number; warnMs: number; fx: HazardFx; color: number } & HazardHit)
  /** ô dịch chuyển: đứng vào ô i sẽ bị đưa tới ô pads[i].to */
  | { kind: 'teleport'; pads: { x: number; y: number; r: number; to: number }[]; /** hồi giữa hai lần dịch chuyển (ms, mặc định 1100) */ cooldownMs?: number; /** địch cũng bị dịch chuyển */ enemies?: boolean }
  /** sàn băng trơn trượt: người chơi trôi theo quán tính */
  | { kind: 'ice'; areas: Rect[] }
  /** bóng tối: chỉ thấy trong bán kính quanh người chơi */
  | { kind: 'darkness'; radius: number }
  /** gió giật: báo hiệu rồi đẩy người chơi theo phương ngang (hướng đổi mỗi lần) */
  | { kind: 'wind'; periodMs: number; warnMs: number; force: number };

/** vật cản; hidden = tường tàng hình, chỉ hiện ra chốc lát khi va vào */
export interface Solid extends Rect {
  hidden?: boolean;
}

export interface ArenaLayout {
  /** khoảng cách từ mép sân không đi vào được */
  inset: number;
  solids: Solid[];
  /** vùng làm chậm (nước, cát lún...) */
  slowZones?: Rect[];
  /** hệ không bị vùng làm chậm ảnh hưởng (mặc định ['water']) */
  slowImmuneTypes?: PokemonType[];
  hazards?: HazardDef[];
}
