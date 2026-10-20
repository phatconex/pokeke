import { loadJson, saveJson } from './storage';

/**
 * Cách ngắm:
 * - mouse:  rê chuột để ngắm, chuột trái = J, chuột phải = K
 * - auto:   tự ngắm địch gần nhất phía trước (chỉ dùng bàn phím)
 * - facing: bắn thẳng theo hướng đang quay
 */
export type AimMode = 'mouse' | 'auto' | 'facing';
export const AIM_MODES: AimMode[] = ['mouse', 'auto', 'facing'];
export const AIM_MODE_LABEL: Record<AimMode, string> = {
  mouse: 'Chuột',
  auto: 'Tự ngắm',
  facing: 'Hướng quay',
};

export type Lang = 'en' | 'vi';

export interface Settings {
  muted: boolean;
  reducedShake: boolean;
  aimMode: AimMode;
  /** âm lượng 0..1 */
  musicVolume: number;
  sfxVolume: number;
  /** ngôn ngữ giao diện (mặc định tiếng Anh) */
  lang: Lang;
}

const DEFAULTS: Settings = { muted: false, reducedShake: false, aimMode: 'auto', musicVolume: 0.6, sfxVolume: 0.8, lang: 'en' };

const vol = (v: unknown, d: number) => (typeof v === 'number' && Number.isFinite(v) ? Math.min(1, Math.max(0, v)) : d);

function sanitize(s: Partial<Settings>): Settings {
  const clean: Settings = {
    muted: !!s.muted,
    reducedShake: !!s.reducedShake,
    aimMode: s.aimMode as AimMode,
    musicVolume: vol(s.musicVolume, DEFAULTS.musicVolume),
    sfxVolume: vol(s.sfxVolume, DEFAULTS.sfxVolume),
    lang: s.lang === 'vi' ? 'vi' : 'en',
  };
  if (!AIM_MODES.includes(clean.aimMode)) clean.aimMode = DEFAULTS.aimMode;
  return clean;
}

// Mặc định là Tự ngắm (chỉ cần bàn phím). Người chơi cũ đã lưu cài đặt từ trước được chuyển sang Tự ngắm đúng một lần; sau đó muốn đổi (phím T) thì giữ nguyên lựa chọn của họ.
const stored = loadJson<Settings>('settings', DEFAULTS);
if (!loadJson<boolean>('aimAutoMigrated', false)) {
  stored.aimMode = 'auto';
  saveJson('aimAutoMigrated', true);
  saveJson('settings', stored);
}
let current: Settings = sanitize(stored);

export function getSettings(): Readonly<Settings> {
  return current;
}

/** Đổi một cài đặt (âm lượng, ngôn ngữ...) và lưu lại */
export function setSetting<K extends keyof Settings>(key: K, value: Settings[K]): Settings {
  current = sanitize({ ...current, [key]: value });
  saveJson('settings', current);
  return current;
}

export function toggleSetting(key: 'muted' | 'reducedShake'): Settings {
  current = { ...current, [key]: !current[key] };
  saveJson('settings', current);
  return current;
}

/** Chuyển sang cách ngắm kế tiếp: Chuột → Tự ngắm → Hướng quay → Chuột */
export function cycleAimMode(): AimMode {
  const i = AIM_MODES.indexOf(current.aimMode);
  current = { ...current, aimMode: AIM_MODES[(i + 1) % AIM_MODES.length] };
  saveJson('settings', current);
  return current.aimMode;
}
