// Bọc localStorage an toàn: lỗi (chế độ riêng tư, bị chặn, đầy) không làm hỏng game.

const PREFIX = 'pokeke.';

function forcedOff(): boolean {
  try {
    return new URLSearchParams(window.location.search).has('nostorage');
  } catch {
    return false;
  }
}

export function loadJson<T>(key: string, fallback: T): T {
  if (forcedOff()) return fallback;
  try {
    const raw = window.localStorage.getItem(PREFIX + key);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw) as unknown;
    if (parsed && typeof parsed === 'object') return { ...fallback, ...(parsed as object) } as T;
    return fallback;
  } catch {
    return fallback;
  }
}

export function saveJson(key: string, value: unknown): boolean {
  if (forcedOff()) return false;
  try {
    window.localStorage.setItem(PREFIX + key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}
