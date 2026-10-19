// Đa ngôn ngữ: tiếng Anh (mặc định) và tiếng Việt.
// - Chuỗi giao diện: t('menu.continue') – từ điển nằm ở i18n/strings/*.ts (mỗi màn một file, có en + vi).
// - Nội dung game (chiêu, ải, lời thoại...): dữ liệu gốc là tiếng Việt, bản tiếng Anh ở i18n/content/*.ts,
//   truy cập qua các hàm trong i18n/content.ts (moveName, stageName, gymText...).
import { getSettings, Lang, setSetting } from '../systems/settings';
import { STRING_TABLES } from './strings';

type Table = Record<string, string>;
const DICT: Record<Lang, Table> = { en: {}, vi: {} };
for (const tb of STRING_TABLES) {
  Object.assign(DICT.en, tb.en);
  Object.assign(DICT.vi, tb.vi);
}

export type { Lang };

export function lang(): Lang {
  return getSettings().lang;
}

export function setLang(l: Lang) {
  setSetting('lang', l);
}

/** Chuỗi giao diện theo khóa; {tên} trong chuỗi được thay bằng params.tên */
export function t(key: string, params?: Record<string, string | number>): string {
  let s = DICT[lang()][key] ?? DICT.en[key] ?? DICT.vi[key] ?? key;
  if (params) for (const [k, v] of Object.entries(params)) s = s.split(`{${k}}`).join(String(v));
  return s;
}

/** Chọn trực tiếp theo ngôn ngữ (cho chuỗi ghép phức tạp) */
export function tr(en: string, vi: string): string {
  return lang() === 'vi' ? vi : en;
}

export function locale(): string {
  return lang() === 'vi' ? 'vi-VN' : 'en-US';
}

/** Số có phân cách hàng nghìn theo ngôn ngữ */
export function fmtNum(n: number): string {
  return Math.round(n).toLocaleString(locale());
}
