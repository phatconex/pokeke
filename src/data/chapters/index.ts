// Gộp nội dung các chương sau chương 3 theo thứ tự đi trên bản đồ.
import { CHAPTER as EVO } from './evo';
import { CHAPTER as CH4 } from './ch4';
import { CHAPTER as CH5 } from './ch5';
import { CHAPTER as CH6 } from './ch6';
import { CHAPTER as CH7 } from './ch7';
import { CHAPTER as CH8 } from './ch8';
import { CHAPTER as LEAGUE } from './league';
import { CHAPTER as EXTRA } from './extra';
import type { ChapterContent } from './types';

export type { ChapterContent } from './types';
/** EVO: dạng tiến hóa của loài chương 1–3 (không có ải) */
export const CHAPTERS: ChapterContent[] = [EVO, CH4, CH5, CH6, CH7, CH8, LEAGUE, EXTRA];
