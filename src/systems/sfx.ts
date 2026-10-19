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

/** kênh trộn hiệu ứng: giảm âm lượng chung + nén để nhiều tiếng chồng nhau không bị vỡ/ù */
let bus: AudioNode | null = null;
function out(ac: AudioContext): AudioNode {
  if (bus) return bus;
  const comp = ac.createDynamicsCompressor();
  comp.threshold.value = -22;
  comp.knee.value = 14;
  comp.ratio.value = 6;
  comp.attack.value = 0.003;
  comp.release.value = 0.16;
  const g = ac.createGain();
  g.gain.value = 0.7;
  g.connect(comp);
  comp.connect(ac.destination);
  bus = g;
  return g;
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
  const v = Math.max(0.0004, vol * getSettings().sfxVolume);
  // vào nhẹ 4ms (không bị "tách"), rồi tắt dần
  gain.gain.setValueAtTime(0.0001, t0);
  gain.gain.linearRampToValueAtTime(v, t0 + 0.004);
  gain.gain.exponentialRampToValueAtTime(0.0001, t1);
  // sóng răng cưa / vuông có nhiều họa âm chói → lọc bớt
  if (type === 'sawtooth' || type === 'square') {
    const lp = ac.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = Math.min(6500, Math.max(900, Math.max(freq, endFreq) * 5));
    osc.connect(lp).connect(gain);
  } else osc.connect(gain);
  gain.connect(out(ac));
  osc.start(t0);
  osc.stop(t1 + 0.02);
}

let noiseBuf: AudioBuffer | null = null;
/** nhiễu trắng qua bộ lọc quét từ f0 → f1 (tiếng nổ, gió, nước, lửa mềm hơn sóng răng cưa) */
function noise(durMs: number, vol: number, f0: number, f1: number, type: BiquadFilterType = 'lowpass', delayMs = 0, q = 0.8) {
  const ac = audio();
  if (!ac) return;
  if (ac.state === 'suspended') void ac.resume().catch(() => undefined);
  if (!noiseBuf) {
    noiseBuf = ac.createBuffer(1, ac.sampleRate, ac.sampleRate);
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  }
  const t0 = ac.currentTime + delayMs / 1000;
  const t1 = t0 + Math.min(0.95, durMs / 1000);
  const src = ac.createBufferSource();
  src.buffer = noiseBuf;
  const f = ac.createBiquadFilter();
  f.type = type;
  f.Q.value = q;
  f.frequency.setValueAtTime(f0, t0);
  f.frequency.exponentialRampToValueAtTime(Math.max(40, f1), t1);
  const gain = ac.createGain();
  const v = Math.max(0.0004, vol * getSettings().sfxVolume);
  gain.gain.setValueAtTime(0.0001, t0);
  gain.gain.linearRampToValueAtTime(v, t0 + 0.006);
  gain.gain.exponentialRampToValueAtTime(0.0001, t1);
  src.connect(f).connect(gain).connect(out(ac));
  src.start(t0, Math.random() * 0.05);
  src.stop(t1 + 0.02);
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
      case 'flame': noise(320, 0.07, 2200, 500, 'lowpass'); tone(150, 70, 260, 'sine', 0.04); break;
      case 'dash': tone(300, 900, 110, 'triangle', 0.06); break;
      case 'hit': tone(240, 90, 70, 'square', 0.05); break;
      case 'hurt': tone(170, 60, 200, 'triangle', 0.08); noise(120, 0.04, 1600, 300); break;
      case 'pickup': tone(880, 1320, 60, 'triangle', 0.035); break;
      case 'level':
        tone(523, 523, 110, 'square', 0.06);
        tone(659, 659, 110, 'square', 0.06, 110);
        tone(784, 784, 200, 'square', 0.06, 220);
        break;
      case 'warn': tone(700, 700, 120, 'square', 0.04); break;
      case 'boss':
        tone(110, 80, 600, 'sawtooth', 0.06);
        tone(82, 60, 700, 'square', 0.04, 300);
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
        noise(160, 0.07, 6000, 900, 'bandpass', 0, 1.2);
        tone(95, 40, 360, 'sine', 0.1);
        noise(420, 0.04, 900, 120);
        break;
      case 'leaf': tone(900, 1300, 70, 'triangle', 0.045); break;
      case 'whip': noise(130, 0.05, 4500, 900, 'bandpass', 0, 1.4); break;
      case 'water': noise(110, 0.05, 2400, 1200, 'bandpass', 0, 1.1); tone(650, 380, 90, 'sine', 0.04); break;
      case 'waterHi': tone(1100, 1500, 60, 'sine', 0.05); break;
      case 'waterLo':
        tone(200, 80, 260, 'sine', 0.09);
        noise(300, 0.06, 1800, 300, 'lowpass', 10);
        break;
      case 'leafHi': tone(1200, 1700, 50, 'triangle', 0.04); break;
      case 'leafLo':
        tone(240, 110, 230, 'triangle', 0.08);
        noise(240, 0.04, 2600, 500, 'lowpass', 10);
        break;
      case 'powder': noise(300, 0.035, 5200, 1500, 'bandpass', 0, 0.9); break;
      case 'seedPop': tone(300, 700, 70, 'sine', 0.06); tone(900, 500, 90, 'triangle', 0.04, 60); break;
      case 'vineSnap':
        noise(100, 0.07, 5000, 800, 'bandpass', 0, 1.5);
        tone(420, 90, 100, 'triangle', 0.05);
        break;
      case 'bloom':
        [392, 523, 659, 784].forEach((f, i) => tone(f, f * 1.02, 160, 'triangle', 0.05, i * 70));
        tone(110, 50, 500, 'sawtooth', 0.07);
        break;
      case 'zapHi': tone(2000, 1200, 45, 'square', 0.03); break;
      case 'zapLo':
        noise(130, 0.06, 5200, 1200, 'bandpass', 0, 1.3);
        tone(420, 140, 150, 'triangle', 0.06);
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
        // nổ: thình trầm (sine) + tiếng xì lọc quét xuống; ngắn, gọn, không ù
        tone(120, 36, 420, 'sine', 0.13);
        noise(380, 0.09, 2600, 160, 'lowpass');
        break;
      case 'roar':
        tone(210, 80, 480, 'sawtooth', 0.06);
        tone(320, 110, 380, 'triangle', 0.04, 40);
        noise(420, 0.03, 1800, 400, 'lowpass');
        break;
    }
  } catch {
    /* âm thanh lỗi không ảnh hưởng game */
  }
}

export function resetSfxThrottle() {
  lastPlayed = {};
}
