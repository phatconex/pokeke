// Gộp sân đấu tự vẽ của các chương: key = biome của ải (StageDef.biome).
import { ARENAS as EVO } from './evo';
import { ARENAS as CH4 } from './ch4';
import { ARENAS as CH5 } from './ch5';
import { ARENAS as CH6 } from './ch6';
import { ARENAS as CH7 } from './ch7';
import { ARENAS as CH8 } from './ch8';
import { ARENAS as LEAGUE } from './league';
import type { ArenaDef } from './types';

export type { ArenaDef, ArenaFrame, ArenaPainter, BaseBiome, RGB } from './types';
export { makeFrame, DESIGN_W, DESIGN_H } from './types';
export const ARENA_DEFS: Record<string, ArenaDef> = { ...EVO, ...CH4, ...CH5, ...CH6, ...CH7, ...CH8, ...LEAGUE };
