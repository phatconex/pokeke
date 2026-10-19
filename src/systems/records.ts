import { loadJson, saveJson } from './storage';

export interface Records {
  bestTimeMs: number;
  bestKills: number;
  bestLevel: number;
  wins: number;
  /** thời gian thắng nhanh nhất; 0 = chưa thắng */
  fastestWinMs: number;
}

const DEFAULTS: Records = { bestTimeMs: 0, bestKills: 0, bestLevel: 1, wins: 0, fastestWinMs: 0 };

export function loadRecords(): Records {
  const r = loadJson<Records>('records', DEFAULTS);
  // phòng dữ liệu hỏng
  for (const k of Object.keys(DEFAULTS) as (keyof Records)[]) {
    if (typeof r[k] !== 'number' || !Number.isFinite(r[k])) r[k] = DEFAULTS[k];
  }
  return r;
}

export interface RunResult {
  timeMs: number;
  kills: number;
  level: number;
  won: boolean;
}

/** Cập nhật kỷ lục; trả về danh sách khóa hạng mục vừa phá kỷ lục ('time' | 'kills' | 'level' | 'fastest' – HUD dịch qua t('hud.best.*')) và việc lưu có thành công không */
export function submitRun(run: RunResult): { records: Records; newBest: string[]; saved: boolean } {
  const r = loadRecords();
  const newBest: string[] = [];
  if (run.timeMs > r.bestTimeMs) {
    r.bestTimeMs = run.timeMs;
    newBest.push('time');
  }
  if (run.kills > r.bestKills) {
    r.bestKills = run.kills;
    newBest.push('kills');
  }
  if (run.level > r.bestLevel) {
    r.bestLevel = run.level;
    newBest.push('level');
  }
  if (run.won) {
    r.wins += 1;
    if (r.fastestWinMs === 0 || run.timeMs < r.fastestWinMs) {
      r.fastestWinMs = run.timeMs;
      newBest.push('fastest');
    }
  }
  const saved = saveJson('records', r);
  return { records: r, newBest, saved };
}

export function formatTime(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}
