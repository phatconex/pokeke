// Chế độ Sinh tồn: lịch sinh địch theo thời gian (ms tính từ đầu trận).
// Mỗi đợt: khoảng thời gian, chu kỳ sinh, số con mỗi lần, cấp độ và tỷ lệ loài.

export interface WaveDef {
  name: string;
  fromMs: number;
  toMs: number;
  intervalMs: number;
  batch: number;
  /** cấp độ của địch trong đợt */
  level: number;
  /** id loài → trọng số */
  weights: Record<string, number>;
}

export const WAVES: WaveDef[] = [
  { name: 'Đợt 1', fromMs: 0, toMs: 30_000, intervalMs: 2200, batch: 2, level: 3, weights: { rattata: 3, geodude: 1 } },
  { name: 'Đợt 2', fromMs: 30_000, toMs: 60_000, intervalMs: 2000, batch: 3, level: 4, weights: { rattata: 3, geodude: 1, oddish: 1 } },
  { name: 'Đợt 3', fromMs: 60_000, toMs: 100_000, intervalMs: 1900, batch: 3, level: 5, weights: { rattata: 2, geodude: 2, oddish: 2 } },
  { name: 'Đợt 4', fromMs: 100_000, toMs: 140_000, intervalMs: 1700, batch: 4, level: 6, weights: { rattata: 3, geodude: 2, oddish: 2 } },
  { name: 'Đợt 5', fromMs: 140_000, toMs: 180_000, intervalMs: 1500, batch: 4, level: 7, weights: { rattata: 2, geodude: 3, oddish: 3 } },
  // Sau khi boss xuất hiện vẫn có địch lẻ tẻ (tần suất giảm theo SPAWN.afterBossRateMult)
  { name: 'Boss', fromMs: 180_000, toMs: Number.POSITIVE_INFINITY, intervalMs: 2200, batch: 2, level: 7, weights: { rattata: 2, oddish: 1 } },
];

export function waveAt(ms: number): WaveDef {
  return WAVES.find((w) => ms >= w.fromMs && ms < w.toMs) ?? WAVES[WAVES.length - 1];
}

export function pickWeighted(weights: Record<string, number>, rnd: () => number = Math.random): string {
  const entries = Object.entries(weights);
  const total = entries.reduce((s, [, w]) => s + w, 0);
  let r = rnd() * total;
  for (const [id, w] of entries) {
    r -= w;
    if (r <= 0) return id;
  }
  return entries[0][0];
}
