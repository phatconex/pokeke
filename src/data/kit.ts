// Hàm dựng dữ liệu dùng chung cho mọi chương: bộ chiêu của loài, đội hình đợt địch.
import type { PokemonSpecies } from './pokemon';
import type { Spawn } from './stages';

/** Bộ chiêu: J, K mở từ đầu; L, U mở ở cấp chỉ định */
export const sk = (j: string, k: string, l?: [string, number], u?: [string, number]) => {
  const out: PokemonSpecies['skills'] = [{ slot: 'J', move: j, level: 1 }, { slot: 'K', move: k, level: 1 }];
  if (l) out.push({ slot: 'L', move: l[0], level: l[1] });
  if (u) out.push({ slot: 'U', move: u[0], level: u[1] });
  return out;
};

/** một con */
export const s = (species: string, level: number): Spawn => ({ species, level });
/** con đầu đàn (vương miện, to, máu ×4, khó bắt) */
export const A = (species: string, level: number): Spawn => ({ species, level, alpha: true });
/** n con cùng loài, cấp dao động quanh lv */
export const many = (species: string, lv: number, n: number): Spawn[] => Array.from({ length: n }, (_, i) => s(species, lv + (i % 3 === 2 ? 1 : 0)));
