import { Pattern } from '../data/patterns';

// 依存ライブラリなしで Standard MIDI File (Format 0) を生成する簡易ライター。
// アプリ内のお手本再生に加えて、外部プレイヤー/DAW で使える .mid を書き出す。

const PPQ = 480; // ticks per quarter note

// GM ドラム（チャンネル10）。R=スネア, L=サイドスティック で左右を聴き分け可能に。
const NOTE_R = 38;
const NOTE_L = 37;

function vlq(value: number): number[] {
  const bytes = [value & 0x7f];
  let v = value >> 7;
  while (v > 0) {
    bytes.unshift((v & 0x7f) | 0x80);
    v >>= 7;
  }
  return bytes;
}

function u32(n: number): number[] {
  return [(n >> 24) & 0xff, (n >> 16) & 0xff, (n >> 8) & 0xff, n & 0xff];
}

function str(s: string): number[] {
  return [...s].map((c) => c.charCodeAt(0));
}

export function patternToMidiBytes(pattern: Pattern, bpm: number): Uint8Array {
  const stepTicks = Math.round(PPQ / (pattern.subdivision / 1)) * 1;
  // 1拍 = PPQ。1音の長さ = PPQ / subdivision。
  const noteTicks = Math.round(PPQ / pattern.subdivision);
  const gate = Math.max(1, Math.floor(noteTicks * 0.5));

  const track: number[] = [];

  // テンポ メタイベント
  const microPerQuarter = Math.round(60_000_000 / bpm);
  track.push(
    ...vlq(0),
    0xff,
    0x51,
    0x03,
    (microPerQuarter >> 16) & 0xff,
    (microPerQuarter >> 8) & 0xff,
    microPerQuarter & 0xff,
  );

  // 各音符を note on/off で配置
  let cursor = 0; // 直前イベントからのデルタ計算用に絶対位置を保持
  pattern.notes.forEach((n, i) => {
    const onTime = i * noteTicks;
    const offTime = onTime + gate;
    const note = n.hand === 'R' ? NOTE_R : NOTE_L;
    const velocity = n.accent ? 120 : 64;

    track.push(...vlq(onTime - cursor), 0x99, note, velocity); // note on, ch10
    cursor = onTime;
    track.push(...vlq(offTime - cursor), 0x89, note, 0); // note off
    cursor = offTime;
  });

  // End of Track
  track.push(...vlq(0), 0xff, 0x2f, 0x00);

  const header = [
    ...str('MThd'),
    ...u32(6),
    0x00, 0x00, // format 0
    0x00, 0x01, // 1 track
    (PPQ >> 8) & 0xff, PPQ & 0xff,
  ];

  const trackChunk = [...str('MTrk'), ...u32(track.length), ...track];

  void stepTicks;
  return new Uint8Array([...header, ...trackChunk]);
}

export function downloadMidi(pattern: Pattern, bpm: number): void {
  const bytes = patternToMidiBytes(pattern, bpm);
  const blob = new Blob([bytes.buffer as ArrayBuffer], { type: 'audio/midi' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${pattern.id}-${bpm}bpm.mid`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
