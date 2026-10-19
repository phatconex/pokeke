// Âm thanh tổng hợp bằng WebAudio (không dùng file âm thanh ngoài).
import { getSettings } from './settings';

export type SfxName =
  | 'ember' | 'flame' | 'dash' | 'hit' | 'hurt' | 'pickup' | 'level' | 'warn' | 'boss' | 'win' | 'lose' | 'select'
  | 'zap' | 'thunder' | 'leaf' | 'whip' | 'water' | 'heal' | 'encounter' | 'badge' | 'talk' | 'super' | 'swap' | 'faint' | 'boom' | 'roar'
  | 'waterHi' | 'waterLo' | 'zapHi' | 'zapLo' | 'leafHi' | 'leafLo' | 'bloom' | 'powder' | 'seedPop' | 'vineSnap';

let ctx: AudioContext | null = null;
let lastPlayed: Partial<Record<SfxName, number>> = {};

/** AudioContext dùng chung (nhạc nền dùng lại để không tạo nhiều context) */
export function getAudioContext(): AudioContext | null {
  return audio();
}

function audio(): AudioContext | null {
  if (ctx) return ctx;
  try {
    const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
  } catch {
    ctx = null;
  }
  return ctx;
}

function tone(freq: number, endFreq: number, durMs: number, type: OscillatorType, vol: number, delayMs = 0) {
  const ac = audio();
  if (!ac) return;
  if (ac.state === 'suspended') void ac.resume().catch(() => undefined);
  const t0 = ac.currentTime + delayMs / 1000;
  const t1 = t0 + durMs / 1000;
  const osc = ac.createOscillator();
  const gain = ac.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);
  osc.frequency.exponentialRampToValueAtTime(Math.max(20, endFreq), t1);
  gain.gain.setValueAtTime(Math.max(0.0002, vol * getSettings().sfxVolume), t0);
  gain.gain.exponentialRampToValueAtTime(0.0001, t1);
  osc.connect(gain).connect(ac.destination);
  osc.start(t0);
  osc.stop(t1 + 0.02);
}

export function playSfx(name: SfxName) {
  if (getSettings().muted) return;
  // chống phát dồn dập cùng một âm
  const now = performance.now();
  const minGap = name === 'hit' || name === 'pickup' ? 45 : 20;
  if ((lastPlayed[name] ?? 0) + minGap > now) return;
  lastPlayed[name] = now;
  try {
    switch (name) {
      case 'ember': tone(520, 220, 90, 'square', 0.05); break;
      case 'flame': tone(180, 60, 320, 'sawtooth', 0.07); break;
      case 'dash': tone(300, 900, 110, 'triangle', 0.06); break;
      case 'hit': tone(240, 90, 70, 'square', 0.05); break;
      case 'hurt': tone(160, 50, 220, 'sawtooth', 0.09); break;
      case 'pickup': tone(880, 1320, 60, 'triangle', 0.035); break;
      case 'level':
        tone(523, 523, 110, 'square', 0.06);
        tone(659, 659, 110, 'square', 0.06, 110);
        tone(784, 784, 200, 'square', 0.06, 220);
        break;
      case 'warn': tone(700, 700, 120, 'square', 0.04); break;
      case 'boss':
        tone(110, 80, 600, 'sawtooth', 0.09);
        tone(82, 60, 700, 'square', 0.06, 300);
        break;
      case 'win':
        [523, 659, 784, 1046].forEach((f, i) => tone(f, f, 180, 'square', 0.06, i * 150));
        break;
      case 'lose':
        [392, 330, 262, 196].forEach((f, i) => tone(f, f * 0.95, 220, 'triangle', 0.07, i * 180));
        break;
      case 'select': tone(660, 990, 80, 'square', 0.05); break;
      case 'zap': tone(1400, 700, 60, 'square', 0.04); break;
      case 'thunder':
        tone(90, 40, 380, 'sawtooth', 0.09);
        tone(1800, 300, 140, 'square', 0.04);
        break;
      case 'leaf': tone(900, 1300, 70, 'triangle', 0.045); break;
      case 'whip': tone(500, 120, 150, 'sawtooth', 0.06); break;
      case 'water': tone(700, 350, 110, 'sine', 0.07); break;
      case 'waterHi': tone(1100, 1500, 60, 'sine', 0.05); break;
      case 'waterLo':
        tone(220, 90, 260, 'sine', 0.1);
        tone(120, 50, 300, 'sawtooth', 0.06, 10);
        break;
      case 'leafHi': tone(1200, 1700, 50, 'triangle', 0.04); break;
      case 'leafLo':
        tone(260, 110, 240, 'triangle', 0.09);
        tone(140, 60, 280, 'sawtooth', 0.05, 10);
        break;
      case 'powder':
        tone(2400, 900, 260, 'sine', 0.02);
        tone(1800, 600, 320, 'triangle', 0.018, 40);
        break;
      case 'seedPop': tone(300, 700, 70, 'sine', 0.06); tone(900, 500, 90, 'triangle', 0.04, 60); break;
      case 'vineSnap':
        tone(700, 90, 110, 'sawtooth', 0.07);
        tone(2200, 500, 40, 'square', 0.04, 70);
        break;
      case 'bloom':
        [392, 523, 659, 784].forEach((f, i) => tone(f, f * 1.02, 160, 'triangle', 0.05, i * 70));
        tone(110, 50, 500, 'sawtooth', 0.07);
        break;
      case 'zapHi': tone(2000, 1200, 45, 'square', 0.03); break;
      case 'zapLo':
        tone(500, 150, 160, 'sawtooth', 0.08);
        tone(1400, 400, 110, 'square', 0.04, 15);
        break;
      case 'heal':
        [523, 659, 784, 1046, 784, 1046].forEach((f, i) => tone(f, f, 120, 'triangle', 0.05, i * 110));
        break;
      case 'encounter':
        [880, 660, 880, 660, 1046].forEach((f, i) => tone(f, f, 70, 'square', 0.05, i * 60));
        break;
      case 'badge':
        [523, 659, 784, 1046, 1318].forEach((f, i) => tone(f, f, 160, 'square', 0.06, i * 130));
        break;
      case 'talk': tone(440, 440, 30, 'square', 0.025); break;
      case 'super': tone(300, 900, 120, 'square', 0.05); break;
      case 'swap': tone(500, 800, 90, 'triangle', 0.05); break;
      case 'faint': tone(400, 80, 500, 'triangle', 0.07); break;
      case 'boom':
        tone(140, 30, 520, 'sawtooth', 0.12);
        tone(70, 25, 600, 'square', 0.08, 20);
        break;
      case 'roar':
        tone(220, 70, 520, 'sawtooth', 0.09);
        tone(330, 90, 420, 'sawtooth', 0.05, 40);
        break;
    }
  } catch {
    /* âm thanh lỗi không ảnh hưởng game */
  }
}

export function resetSfxThrottle() {
  lastPlayed = {};
}
