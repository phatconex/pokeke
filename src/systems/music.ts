// Nhạc nền chiptune 8-bit tổng hợp bằng WebAudio (không dùng file âm thanh ngoài).
// Toàn bộ 9 bài đều tự sáng tác cho game này.
//
// Ký hiệu nốt (mỗi kênh là một chuỗi, các token cách nhau bởi khoảng trắng, '|' chỉ để ngăn ô nhịp):
//   'C5:8'        nốt Đô quãng 5, móc đơn (8 = móc đơn, 4 = đen, 2 = trắng, 1 = tròn, 16 = móc kép)
//   'C5:4.'       có chấm dôi (x1.5)
//   'D5'          bỏ trường độ → dùng lại trường độ của token trước
//   'r:4'         dấu lặng
//   '_:8'         nối thêm trường độ vào nốt trước
//   'C4+E4+G4:1'  hợp âm rải (arpeggio) trên một oscillator
//   kênh trống:   'k' trống cái, 's' trống lẫy, 'h' hi-hat, 'o' chũm chọe/hi-hat mở
import { getAudioContext } from './sfx';
import { getSettings } from './settings';

export type MusicTrack = 'title' | 'map' | 'battle' | 'gym' | 'league' | 'champion' | 'victory' | 'evolution' | 'dex';

// ───────────────────────── Cấu hình chung ─────────────────────────

const MASTER_VOL = 0.06;
const LOOKAHEAD = 0.15; // giây: đặt lịch trước bao xa
const TICK_MS = 30; // nhịp lập lịch
const SWITCH_FADE_MS = 300;

type DrumKind = 'k' | 's' | 'h' | 'o';

interface ChannelDef {
  kind: 'pulse' | 'triangle' | 'drum';
  /** độ rộng xung cho kênh pulse: 0.125 / 0.25 / 0.5 */
  duty?: number;
  vol: number;
  /** tỉ lệ thời gian giữ nốt so với trường độ (staccato < 1) */
  gate?: number;
  /** giây cho mỗi bước rải hợp âm */
  arp?: number;
  /** độ giảm âm lượng trong lúc giữ nốt (1 = không giảm) */
  sustain?: number;
  vibrato?: boolean;
  notes: string;
}

interface TrackDef {
  bpm: number;
  loop: boolean;
  channels: ChannelDef[];
}

interface NoteEvent {
  beat: number;
  len: number;
  freqs: number[] | null;
  drum: DrumKind | null;
}

// ───────────────────────── Trợ giúp soạn nhạc ─────────────────────────

const NOTE_RE = /^([A-G])(#|b)?(-?\d)$/;
const SEMI: Record<string, number> = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
const NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

function noteToMidi(name: string): number | null {
  const m = NOTE_RE.exec(name);
  if (!m) return null;
  const acc = m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0;
  return 12 * (Number(m[3]) + 1) + SEMI[m[1]] + acc;
}

function midiToName(midi: number): string {
  return NAMES[((midi % 12) + 12) % 12] + String(Math.floor(midi / 12) - 1);
}

function midiToFreq(midi: number): number {
  return 440 * Math.pow(2, (midi - 69) / 12);
}

/** Lặp một đoạn n lần */
function rep(s: string, n: number): string {
  return Array.from({ length: n }, () => s).join(' | ');
}

/**
 * Mẫu bè trầm theo gốc hợp âm: token dạng 'quãng:trường độ' (quãng tính bằng nửa cung từ nốt gốc).
 * Ví dụ pat('0:8 12 7', 'C3 G2') → 'C3:8 C4 G3 | G2:8 G3 D3'
 */
function pat(tpl: string, roots: string): string {
  const toks = tpl.split(/\s+/).filter(Boolean);
  return roots
    .split(/[\s|]+/)
    .filter(Boolean)
    .map((root) => {
      const base = noteToMidi(root) ?? 48;
      return toks
        .map((t) => {
          const [off, dur] = t.split(':');
          const name = off === 'r' ? 'r' : midiToName(base + Number(off));
          return dur ? `${name}:${dur}` : name;
        })
        .join(' ');
    })
    .join(' | ');
}

/** Mỗi hợp âm đánh 4 phách đen (rải nhanh, ngắt tiếng) – một hợp âm cho mỗi ô nhịp */
function stab(chords: string): string {
  return chords
    .split(/\s+/)
    .filter(Boolean)
    .map((c) => `${c}:4 ${c} ${c} ${c}`)
    .join(' | ');
}

function parseDur(spec: string): number | null {
  const m = /^(\d+)(\.|t)?$/.exec(spec);
  if (!m) return null;
  const n = Number(m[1]);
  if (!n) return null;
  let beats = 4 / n;
  if (m[2] === '.') beats *= 1.5;
  else if (m[2] === 't') beats *= 2 / 3;
  return beats;
}

/** Chuyển chuỗi ký hiệu thành danh sách sự kiện (đơn vị: phách) */
function parseChannel(src: string, drum: boolean): { events: NoteEvent[]; len: number } {
  const events: NoteEvent[] = [];
  let beat = 0;
  let lastDur = 1;
  for (const tok of src.split(/\s+/)) {
    if (!tok || tok === '|') continue;
    const [head, durSpec] = tok.split(':');
    if (durSpec) lastDur = parseDur(durSpec) ?? lastDur;
    const len = lastDur;
    if (head === '_') {
      const prev = events[events.length - 1];
      if (prev) prev.len += len;
      beat += len;
      continue;
    }
    if (head === 'r') {
      events.push({ beat, len, freqs: null, drum: null });
    } else if (drum) {
      const d = head === 'k' || head === 's' || head === 'h' || head === 'o' ? head : null;
      events.push({ beat, len, freqs: null, drum: d });
    } else {
      const freqs = head
        .split('+')
        .map((n) => noteToMidi(n))
        .filter((m): m is number => m !== null)
        .map(midiToFreq);
      events.push({ beat, len, freqs: freqs.length ? freqs : null, drum: null });
    }
    beat += len;
  }
  // bỏ các dấu lặng để vòng lặp nhẹ hơn (thời điểm đã lưu trong beat)
  return { events: events.filter((e) => e.freqs || e.drum), len: beat };
}

// ───────────────────────── 9 bài nhạc ─────────────────────────

const FILL_A = 'k:8 s:16 s s:8 s:16 s k:8 s:16 s s s s s';

const TRACKS: Record<MusicTrack, TrackDef> = {
  // Màn hình tiêu đề: Đô trưởng, hùng tráng và tươi vui (I–V–vi–IV–I–♭VII–IV–V)
  title: {
    bpm: 132,
    loop: true,
    channels: [
      {
        kind: 'pulse', duty: 0.25, vol: 0.5, gate: 0.9, sustain: 0.75, vibrato: true,
        notes:
          'G4:8. C5:16 E5:4 G5 E5:8 C5 | D5:4. B4:8 G4:4 D5 | C5:8 E5 A5:4 G5:8 E5 C5:4 | F5:4. E5:8 D5 C5 A4:4 | ' +
          'G4:8. C5:16 E5:4 G5 C6 | Bb5:4. A5:8 F5:4 D5 | C5:8 F5 A5:4 G5:8 F5 E5 F5 | G5:2. r:8 B4:16 D5',
      },
      {
        kind: 'pulse', duty: 0.125, vol: 0.2, arp: 0.05, gate: 1, sustain: 0.6,
        notes: 'C4+E4+G4:1 | B3+D4+G4 | A3+C4+E4 | A3+C4+F4 | C4+E4+G4 | Bb3+D4+F4 | A3+C4+F4 | B3+D4+G4',
      },
      { kind: 'triangle', vol: 0.9, gate: 0.8, notes: pat('0:8 12 0 12 0 12 0 12', 'C3 G2 A2 F2 C3 Bb2 F2 G2') },
      { kind: 'drum', vol: 1, notes: rep('k:8 h s h k k s h', 7) + ' | k:8 s s s s:16 s s s s:8 s' },
    ],
  },

  // Bản đồ: Sol trưởng, nhẹ nhàng, bước chân phiêu lưu
  map: {
    bpm: 112,
    loop: true,
    channels: [
      {
        kind: 'pulse', duty: 0.5, vol: 0.42, gate: 0.88, sustain: 0.7, vibrato: true,
        notes:
          'B4:8 D5 G5:4 F#5:8 E5 D5:4 | E5:4. D5:8 B4:2 | C5:8 E5 G5:4 A5:8 G5 E5:4 | F#5:4. E5:8 D5:2 | ' +
          'B4:8 D5 G5:4 A5:8 B5 A5:4 | G5:4. E5:8 B4:4 E5 | C5:8 E5 A5:4 G5:8 F#5 E5:4 | F#5:2. r:4 | ' +
          'E5:4 G5 E5:8 D5 C5:4 | D5:4 F#5 A5:4. r:8 | B5:4. A5:8 F#5:4 D5 | E5:2 G5:4 B5 | ' +
          'C6:4. B5:8 A5 G5 E5:4 | F#5:4 A5:8 F#5 D5:4 E5:8 F#5 | G5:2. D5:8 B4 | A4:4 B4:8 C5 D5:2',
      },
      {
        kind: 'pulse', duty: 0.125, vol: 0.16, arp: 0.06, gate: 1, sustain: 0.55,
        notes:
          'G3+B3+D4:1 | E3+G3+B3 | C4+E4+G4 | D4+F#4+A4 | G3+B3+D4 | E3+G3+B3 | A3+C4+E4 | D4+F#4+A4 | ' +
          'C4+E4+G4 | D4+F#4+A4 | B3+D4+F#4 | E3+G3+B3 | C4+E4+G4 | D4+F#4+A4 | G3+B3+D4 | D4+F#4+A4',
      },
      {
        kind: 'triangle', vol: 0.85, gate: 0.75,
        notes: pat('0:4. 12:8 7:4 12:4', 'G2 E2 C3 D3 G2 E2 A2 D3 C3 D3 B2 E2 C3 D3 G2 D3'),
      },
      { kind: 'drum', vol: 0.7, notes: rep('k:4 h:8 k s:4 h:8 h', 15) + ' | k:4 h:8 k s:8 s:16 s s:8 s' },
    ],
  },

  // Trận đấu thường: Rê thứ pha màu rock, nhanh và dồn dập
  battle: {
    bpm: 168,
    loop: true,
    channels: [
      {
        kind: 'pulse', duty: 0.25, vol: 0.48, gate: 0.85, sustain: 0.8, vibrato: true,
        notes:
          'D5:8 r:16 D5 F5:8 A5 D6:4 C6:8 A5 | G5:8 A5 F5:4 E5:8 D5 E5:4 | F5:8 F5:16 G5 F5:8 D5 Bb5:4 A5:8 G5 | E5:4. C5:8 G5:4 E5 | ' +
          'D5:8 r:16 D5 F5:8 A5 D6:4 C6:8 A5 | A5:8 G5 F5 G5 A5:4 C6 | D6:4. C6:8 Bb5 A5 G5 F5 | E5:4 A5 C#6 E6 | ' +
          'G5:4 Bb5:8 A5 G5:4 D5 | A5:4 C6:8 Bb5 A5:4 E5 | Bb5:8 A5 G5 F5 G5:4 Bb5 | C6:2 E5:4 G5 | ' +
          'D6:4. C6:8 Bb5:4 G5 | C#6:4. B5:8 A5:4 E5 | F5:8 E5 D5 F5 A5 G5 F5 A5 | E5:8 r E5 r A4:16 C#5 E5 A5 C#6:4',
      },
      {
        kind: 'triangle', vol: 0.95, gate: 0.7,
        notes: pat('0:8 0 12 0 7 0 12 0', 'D3 D3 Bb2 C3 D3 D3 Bb2 A2 G2 A2 Bb2 C3 G2 A2 D3 A2'),
      },
      {
        kind: 'drum', vol: 1,
        notes: rep('k:8 h s h k k s h', 7) + ' | ' + FILL_A + ' | ' + rep('k:8 h s h k k s h', 7) + ' | ' + FILL_A,
      },
    ],
  },

  // Nhà thi đấu (Gym): Đô thứ, căng thẳng hơn, bass đập quãng tám liên tục
  gym: {
    bpm: 152,
    loop: true,
    channels: [
      {
        kind: 'pulse', duty: 0.5, vol: 0.4, gate: 0.85, sustain: 0.75, vibrato: true,
        notes:
          'C5:8 C5:16 C5 Eb5:8 G5 C6:4 B5 | Ab5:4. G5:8 Eb5:4 C5 | D5:8 F5 Bb5:4 Ab5:8 G5 F5:4 | G5:4. F5:8 D5 B4 G4:4 | ' +
          'C5:8 Eb5 G5 C6 Eb6:4 D6:8 C6 | C6:4 Ab5 Eb5 C5 | F5:8 Ab5 C6 Ab5 F5 Eb5 D5 C5 | B4:4 D5 G5 B5 | ' +
          'Eb6:2 C6:4 Ab5 | D6:2 Bb5:4 F5 | G5:8 Ab5 G5 F5 Eb5:4 D5 | C5:2 r:8 C5 D5 Eb5 | ' +
          'F5:8 Eb5 F5 G5 Ab5:4 C6 | Bb5:8 Ab5 Bb5 C6 D6:4 Bb5 | B5:2. G5:8 F5 | D5:8 r D5 r G4:16 B4 D5 F5 G5:4',
      },
      {
        kind: 'pulse', duty: 0.125, vol: 0.14, arp: 0.045, gate: 0.5,
        notes: stab(
          'C4+Eb4+G4 C4+Eb4+Ab4 D4+F4+Bb4 B3+D4+G4 C4+Eb4+G4 C4+Eb4+Ab4 C4+F4+Ab4 B3+D4+G4 ' +
            'C4+Eb4+Ab4 D4+F4+Bb4 C4+Eb4+G4 C4+Eb4+G4 C4+Eb4+Ab4 D4+F4+Bb4 B3+D4+G4 B3+D4+F4',
        ),
      },
      {
        kind: 'triangle', vol: 0.95, gate: 0.65,
        notes: pat('0:8 12 0 12 0 12 0 12', 'C3 Ab2 Bb2 G2 C3 Ab2 F2 G2 Ab2 Bb2 C3 C3 Ab2 Bb2 G2 G2'),
      },
      {
        kind: 'drum', vol: 1,
        notes: rep('k:8 h s h k h s s:16 s', 7) + ' | ' + FILL_A + ' | ' + rep('k:8 h s h k h s s:16 s', 7) + ' | ' + FILL_A,
      },
    ],
  },

  // Liên đoàn (Tứ Thiên Vương): Mi thứ, trang nghiêm, nốt dài kịch tính
  league: {
    bpm: 116,
    loop: true,
    channels: [
      {
        kind: 'pulse', duty: 0.5, vol: 0.42, gate: 0.94, sustain: 0.65, vibrato: true,
        notes:
          'E5:2. G5:8 F#5 | E5:2 C5:4 G5 | F#5:2. A5:8 G5 | F#5:1 | ' +
          'B5:2. C6:8 B5 | A5:2 E5:4 C6 | G5:4. F#5:8 E5:4 G5 | D#5:2 F#5 | ' +
          'C6:2. B5:8 A5 | B5:2 G5:4 E5 | F5:2. A5:8 C6 | B5:2 A5:4 F#5 | ' +
          'G5:4 C6 E6 D6:8 C6 | D6:2 A5:4 F#5 | D#6:2. C6:8 B5 | B5:2 F#5:4 D#5',
      },
      {
        kind: 'pulse', duty: 0.125, vol: 0.16, arp: 0.055, gate: 1, sustain: 0.5,
        notes:
          'E4+G4+B4:1 | C4+E4+G4 | D4+F#4+A4 | B3+D#4+F#4 | E4+G4+B4 | A3+C4+E4 | C4+E4+G4 | B3+D#4+F#4 | ' +
          'A3+C4+E4 | E4+G4+B4 | F4+A4+C5 | B3+D#4+F#4 | C4+E4+G4 | D4+F#4+A4 | B3+D#4+F#4+A4 | B3+D#4+F#4',
      },
      {
        kind: 'triangle', vol: 0.95, gate: 0.8,
        notes: pat('0:8 0 7 0 12 0 7 0', 'E2 C3 D3 B2 E2 A2 C3 B2 A2 E2 F2 B2 C3 D3 B2 B2'),
      },
      {
        kind: 'drum', vol: 0.95,
        notes:
          rep('k:4 h:8 h s:4. k:8', 7) + ' | s:8 s s s s:16 s s s s:4 | ' +
          rep('k:4 h:8 h s:4. k:8', 7) + ' | s:8 s s s s:16 s s s o:4',
      },
    ],
  },

  // Nhà vô địch: Si thứ, nhanh nhất, nhiều móc kép – cao trào của cả trò chơi
  champion: {
    bpm: 176,
    loop: true,
    channels: [
      {
        kind: 'pulse', duty: 0.25, vol: 0.46, gate: 0.85, sustain: 0.8, vibrato: true,
        notes:
          'B4:16 D5 F#5 B5 D6:8 C#6 B5 F#5 D5:4 | G5:8 B5 D6:4. C#6:16 B5 A5:8 G5 | A5:8. E5:16 A5:8 C#6 E6:4 D6:8 C#6 | A#5:4. C#6:8 F#6:4 E6:8 C#6 | ' +
          'B5:8 B5:16 B5 D6:8 B5 F#6:4 E6:8 D6 | D6:8 B5 G5 B5 D6 G6 F#6 E6 | E6:4. D6:8 B5 G5 E5:4 | F#5:16 A#5 C#6 F#6 E6:4 C#6 A#5 | ' +
          'D6:2 B5:4 G5 | E6:2 C#6:4 A5 | F#6:4. E6:8 D6 C#6 B5:4 | A5:8 F#5 A5 D6 F#6:4 D6 | ' +
          'D6:4. E6:8 D6 B5 G5:4 | C#6:4. D6:8 E6 C#6 A5:4 | F#6:2 E6:4 C#6 | C#6:8 r C#6 r E6:4 A#5:16 F#5 C#5 A#4',
      },
      {
        kind: 'pulse', duty: 0.125, vol: 0.17, arp: 0.042, gate: 1, sustain: 0.6,
        notes:
          'B3+D4+F#4:1 | G3+B3+D4 | A3+C#4+E4 | F#3+A#3+C#4+E4 | B3+D4+F#4 | G3+B3+D4 | E3+G3+B3 | F#3+A#3+C#4 | ' +
          'G3+B3+D4 | A3+C#4+E4 | B3+D4+F#4 | D4+F#4+A4 | G3+B3+D4 | A3+C#4+E4 | F#3+A#3+C#4 | F#3+A#3+C#4+E4',
      },
      {
        kind: 'triangle', vol: 0.95, gate: 0.7,
        notes: pat('0:16 0 12 0 0 0 12 0 0 0 12 0 0 12 7 12', 'B2 G2 A2 F#2 B2 G2 E2 F#2 G2 A2 B2 D3 G2 A2 F#2 F#2'),
      },
      {
        kind: 'drum', vol: 1,
        notes:
          rep('k:8 h s h k:16 k h:8 s h:16 h', 7) + ' | ' + FILL_A + ' | ' +
          rep('k:8 h s h k:16 k h:8 s h:16 h', 7) + ' | ' + FILL_A,
      },
    ],
  },

  // Chiến thắng: kèn fanfare ngắn (~3 giây), phát một lần rồi im
  victory: {
    bpm: 150,
    loop: false,
    channels: [
      {
        kind: 'pulse', duty: 0.25, vol: 0.5, gate: 0.92, sustain: 0.7, vibrato: true,
        notes: 'G4:16 C5 E5 G5 C6:8 r:16 G5 C6:4. r:8 | A5:8 B5 C6 D6 E6:2',
      },
      {
        kind: 'pulse', duty: 0.5, vol: 0.28, gate: 0.92, sustain: 0.7,
        notes: 'E4:16 G4 C5 E5 G5:8 r:16 E5 E5:4. r:8 | F5:8 G5 A5 B5 C6:2',
      },
      { kind: 'triangle', vol: 0.95, gate: 0.85, notes: 'C3:8. C3:16 G2:8 C3 E3:4 G3 | F3:4 G3 C3:2' },
      { kind: 'drum', vol: 1, notes: 'k:8 s:16 s k:8 s k:4 s | k:8 k s s:16 s k:4 o' },
    ],
  },

  // Tiến hóa: La thứ, huyền bí, hợp âm rải lấp lánh và nhịp tim chậm
  evolution: {
    bpm: 92,
    loop: true,
    channels: [
      {
        kind: 'pulse', duty: 0.5, vol: 0.32, gate: 0.95, sustain: 0.6, vibrato: true,
        notes:
          'E5:2. D5:8 C5 | A4:2. C5:4 | B4:2. D5:8 E5 | G#4:1 | ' +
          'A5:2. G5:8 E5 | F5:2. E5:8 C5 | D5:4. E5:8 F5:4 A5 | G#5:2 B4',
      },
      {
        kind: 'pulse', duty: 0.125, vol: 0.22, arp: 0.075, gate: 1, sustain: 0.7,
        notes:
          'A3+C4+E4+B4:1 | F3+A3+C4+E4 | G3+B3+D4+A4 | E3+G#3+B3+D4 | ' +
          'A3+C4+E4+B4 | F3+A3+C4+E4 | D3+F3+A3+C4 | E3+G#3+B3+E4',
      },
      { kind: 'triangle', vol: 0.85, gate: 0.9, notes: pat('0:2. 7:4', 'A2 F2 G2 E2 A2 F2 D2 E2') },
      { kind: 'drum', vol: 0.6, notes: rep('k:4 r r:8 h:8 r:4', 8) },
    ],
  },

  // Pokédex: Fa trưởng, êm và chậm như tiếng hộp nhạc
  dex: {
    bpm: 84,
    loop: true,
    channels: [
      {
        kind: 'pulse', duty: 0.5, vol: 0.32, gate: 0.9, sustain: 0.6, vibrato: true,
        notes:
          'C5:4 F5 A5:4. G5:8 | F5:2 D5:4 E5 | F5:4. D5:8 Bb4:2 | C5:2. r:4 | ' +
          'A4:4 C5 F5 A5 | G5:4. E5:8 C5:2 | D5:4 F5 Bb5 A5:8 G5 | E5:2 G4',
      },
      {
        kind: 'pulse', duty: 0.125, vol: 0.16, arp: 0.09, gate: 1, sustain: 0.5,
        notes:
          'F3+A3+C4+E4:1 | D3+F3+A3+C4 | Bb3+D4+F4+A4 | C4+E4+G4 | ' +
          'F3+A3+C4+E4 | A3+C4+E4+G4 | Bb3+D4+F4 | C4+E4+G4+Bb4',
      },
      { kind: 'triangle', vol: 0.8, gate: 0.85, notes: pat('0:4 7 12 7', 'F2 D2 Bb2 C3 F2 A2 Bb2 C3') },
      { kind: 'drum', vol: 0.45, notes: rep('r:4 h:8 h r:4 h', 8) },
    ],
  },
};

// ───────────────────────── Bộ phát ─────────────────────────

interface ChannelState {
  def: ChannelDef;
  events: NoteEvent[];
  len: number;
  idx: number;
  loopNo: number;
  done: boolean;
}

interface Session {
  track: MusicTrack;
  bus: GainNode;
  t0: number;
  spb: number;
  loop: boolean;
  endTime: number;
  finished: boolean;
  channels: ChannelState[];
}

const parsedCache = new Map<MusicTrack, { def: ChannelDef; events: NoteEvent[]; len: number }[]>();
const pulseWaves = new Map<number, PeriodicWave>();

let currentTrack: MusicTrack | null = null;
let session: Session | null = null;
let master: GainNode | null = null;
let masterCtx: AudioContext | null = null;
let timer: ReturnType<typeof setInterval> | null = null;
let lastLevel = -1;
let noiseWhite: AudioBuffer | null = null;
let noiseBright: AudioBuffer | null = null;
let unlockAttached = false;

function parsedTrack(track: MusicTrack) {
  let p = parsedCache.get(track);
  if (!p) {
    p = TRACKS[track].channels.map((def) => ({ def, ...parseChannel(def.notes, def.kind === 'drum') }));
    parsedCache.set(track, p);
  }
  return p;
}

function ensureMaster(ac: AudioContext): GainNode {
  if (master && masterCtx === ac) return master;
  master = ac.createGain();
  masterCtx = ac;
  lastLevel = targetLevel(getSettings().muted);
  master.gain.setValueAtTime(lastLevel, ac.currentTime);
  master.connect(ac.destination);
  pulseWaves.clear();
  noiseWhite = null;
  noiseBright = null;
  return master;
}

/** Sóng xung với độ rộng tùy ý (chuỗi Fourier) – 50% dùng 'square' sẵn có */
function pulseWave(ac: AudioContext, duty: number): PeriodicWave {
  let w = pulseWaves.get(duty);
  if (w) return w;
  const n = 32;
  const real = new Float32Array(n);
  const imag = new Float32Array(n);
  for (let k = 1; k < n; k++) real[k] = (2 / (k * Math.PI)) * Math.sin(k * Math.PI * duty);
  w = ac.createPeriodicWave(real, imag);
  pulseWaves.set(duty, w);
  return w;
}

function noiseBuffers(ac: AudioContext): { white: AudioBuffer; bright: AudioBuffer } {
  if (!noiseWhite || !noiseBright) {
    const len = Math.floor(ac.sampleRate);
    noiseWhite = ac.createBuffer(1, len, ac.sampleRate);
    noiseBright = ac.createBuffer(1, len, ac.sampleRate);
    const w = noiseWhite.getChannelData(0);
    const b = noiseBright.getChannelData(0);
    let prev = 0;
    for (let i = 0; i < len; i++) {
      const x = Math.random() * 2 - 1;
      w[i] = x;
      b[i] = (x - prev) * 0.5; // vi phân → tiếng sáng, mảnh như hi-hat
      prev = x;
    }
  }
  return { white: noiseWhite, bright: noiseBright };
}

function playTone(ac: AudioContext, out: AudioNode, def: ChannelDef, ev: NoteEvent, t: number, spb: number) {
  const freqs = ev.freqs;
  if (!freqs) return;
  const dur = ev.len * spb;
  const gateDur = Math.max(0.03, dur * (def.gate ?? 0.9));
  const tOff = t + gateDur;
  const atk = 0.005;
  const rel = Math.min(0.03, gateDur * 0.3);
  const v = def.vol;

  const osc = ac.createOscillator();
  if (def.kind === 'triangle') osc.type = 'triangle';
  else if ((def.duty ?? 0.5) === 0.5) osc.type = 'square';
  else osc.setPeriodicWave(pulseWave(ac, def.duty ?? 0.5));

  const f = osc.frequency;
  if (freqs.length > 1) {
    const step = def.arp ?? 0.05;
    let i = 0;
    for (let tt = t; tt < tOff; tt += step, i++) f.setValueAtTime(freqs[i % freqs.length], tt);
  } else {
    const f0 = freqs[0];
    f.setValueAtTime(f0, t);
    // rung nhẹ (vibrato) cho nốt dài, không cần thêm LFO
    if (def.vibrato && gateDur > 0.4) {
      let up = true;
      for (let tt = t + 0.22; tt < tOff - 0.04; tt += 0.08, up = !up) {
        f.linearRampToValueAtTime(f0 * (up ? 1.005 : 0.995), tt);
      }
    }
  }

  const g = ac.createGain();
  const gg = g.gain;
  gg.setValueAtTime(0, t);
  gg.linearRampToValueAtTime(v, t + atk);
  gg.linearRampToValueAtTime(v * (def.sustain ?? 1), Math.max(t + atk + 0.001, tOff - rel));
  gg.linearRampToValueAtTime(0, tOff);

  osc.connect(g);
  g.connect(out);
  osc.start(t);
  osc.stop(tOff + 0.02);
}

function playDrum(ac: AudioContext, out: AudioNode, def: ChannelDef, kind: DrumKind, t: number) {
  const g = ac.createGain();
  g.connect(out);
  if (kind === 'k') {
    const v = 0.85 * def.vol;
    const osc = ac.createOscillator();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(170, t);
    osc.frequency.exponentialRampToValueAtTime(45, t + 0.1);
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(v, t + 0.003);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.13);
    osc.connect(g);
    osc.start(t);
    osc.stop(t + 0.15);
    return;
  }
  const { white, bright } = noiseBuffers(ac);
  const src = ac.createBufferSource();
  const conf =
    kind === 's' ? { buf: white, v: 0.42, d: 0.12 } :
    kind === 'h' ? { buf: bright, v: 0.3, d: 0.035 } :
    { buf: bright, v: 0.3, d: 0.32 };
  src.buffer = conf.buf;
  const v = conf.v * def.vol;
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(v, t + 0.002);
  g.gain.exponentialRampToValueAtTime(0.0001, t + conf.d);
  src.connect(g);
  src.start(t, Math.random() * 0.5);
  src.stop(t + conf.d + 0.02);
}

/** mức âm lượng mong muốn: tắt tiếng → 0, còn lại theo thanh trượt nhạc */
function targetLevel(muted: boolean) {
  return muted ? 0 : MASTER_VOL * getSettings().musicVolume;
}

function applyMute(ac: AudioContext, muted: boolean) {
  const level = targetLevel(muted);
  if (!master || Math.abs(level - lastLevel) < 1e-4) return;
  lastLevel = level;
  const now = ac.currentTime;
  const gp = master.gain;
  gp.cancelScheduledValues(now);
  gp.setValueAtTime(gp.value, now);
  gp.linearRampToValueAtTime(level, now + 0.06);
}

function tick() {
  try {
    const ac = getAudioContext();
    const s = session;
    if (!ac || !s || ac.state === 'closed') return;
    const muted = getSettings().muted;
    applyMute(ac, muted);
    if (ac.state !== 'running') return;

    const now = ac.currentTime;
    const horizon = now + LOOKAHEAD;
    for (const ch of s.channels) {
      let guard = 0;
      while (!ch.done && guard++ < 512) {
        const ev = ch.events[ch.idx];
        let time = s.t0 + (ch.loopNo * ch.len + ev.beat) * s.spb;
        // tab bị ẩn lâu (setInterval bị bóp) → nhảy qua các vòng đã lỡ, không phát dồn
        if (s.loop && time < now - 1) {
          const behind = Math.floor((now - time) / (ch.len * s.spb));
          if (behind > 0) {
            ch.loopNo += behind;
            time += behind * ch.len * s.spb;
          }
        }
        if (time >= horizon) break;
        if (!muted && time >= now - 0.02) {
          if (ev.drum) playDrum(ac, s.bus, ch.def, ev.drum, Math.max(time, now));
          else playTone(ac, s.bus, ch.def, ev, Math.max(time, now), s.spb);
        }
        ch.idx++;
        if (ch.idx >= ch.events.length) {
          ch.idx = 0;
          if (s.loop) ch.loopNo++;
          else ch.done = true;
        }
      }
    }

    if (!s.loop && !s.finished && s.channels.every((c) => c.done) && now > s.endTime) {
      s.finished = true;
      stopTimer();
    }
  } catch {
    // WebAudio lỗi → im lặng, không ảnh hưởng game
  }
}

function startTimer() {
  if (timer === null) timer = setInterval(tick, TICK_MS);
}

function stopTimer() {
  if (timer !== null) {
    clearInterval(timer);
    timer = null;
  }
}

/** Trình duyệt chặn tự phát: thử resume, đồng thời chờ thao tác đầu tiên của người chơi */
function ensureRunning(ac: AudioContext) {
  if (ac.state !== 'suspended') return;
  try {
    void ac.resume().catch(() => undefined);
  } catch {
    // bỏ qua
  }
  if (unlockAttached || typeof window === 'undefined') return;
  unlockAttached = true;
  const unlock = () => {
    try {
      void ac
        .resume()
        .then(() => {
          if (ac.state === 'running') {
            window.removeEventListener('pointerdown', unlock);
            window.removeEventListener('keydown', unlock);
            unlockAttached = false;
            tick();
          }
        })
        .catch(() => undefined);
    } catch {
      // bỏ qua
    }
  };
  window.addEventListener('pointerdown', unlock);
  window.addEventListener('keydown', unlock);
}

function fadeOutSession(ac: AudioContext, s: Session, fadeMs: number) {
  try {
    const now = ac.currentTime;
    const gp = s.bus.gain;
    const sec = Math.max(0.01, fadeMs / 1000);
    gp.cancelScheduledValues(now);
    gp.setValueAtTime(gp.value, now);
    gp.linearRampToValueAtTime(0, now + sec);
    setTimeout(() => {
      try {
        s.bus.disconnect();
      } catch {
        // đã ngắt
      }
    }, fadeMs + 250);
  } catch {
    // bỏ qua
  }
}

/** Phát nhạc nền (gọi lại cùng bài thì không phát lại từ đầu) */
export function playMusic(track: MusicTrack): void {
  if (track === currentTrack) {
    const ac = getAudioContext();
    if (ac) ensureRunning(ac);
    return;
  }
  currentTrack = track;
  const ac = getAudioContext();
  if (!ac) return;
  try {
    const out = ensureMaster(ac);
    ensureRunning(ac);
    const now = ac.currentTime;
    const old = session;
    if (old) fadeOutSession(ac, old, SWITCH_FADE_MS);

    const def = TRACKS[track];
    const parsed = parsedTrack(track);
    const bus = ac.createGain();
    bus.gain.setValueAtTime(0, now);
    bus.gain.linearRampToValueAtTime(1, now + 0.05);
    bus.connect(out);

    const spb = 60 / def.bpm;
    const t0 = now + (old ? 0.12 : 0.06);
    const maxLen = Math.max(0, ...parsed.map((p) => p.len));
    session = {
      track,
      bus,
      t0,
      spb,
      loop: def.loop,
      endTime: t0 + maxLen * spb + 0.6,
      finished: false,
      channels: parsed.map((p) => ({
        def: p.def,
        events: p.events,
        len: p.len,
        idx: 0,
        loopNo: 0,
        done: p.events.length === 0 || p.len <= 0,
      })),
    };
    startTimer();
    tick();
  } catch {
    session = null;
    stopTimer();
  }
}

/** Dừng nhạc (fade) */
export function stopMusic(fadeMs = 400): void {
  currentTrack = null;
  stopTimer();
  const s = session;
  session = null;
  if (!s) return;
  const ac = getAudioContext();
  if (!ac) return;
  fadeOutSession(ac, s, fadeMs);
}
