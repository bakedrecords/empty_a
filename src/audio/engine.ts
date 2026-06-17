import * as Tone from 'tone';
import { Hand, Pattern, patternBeats } from '../data/patterns';

export interface TempoUpConfig {
  enabled: boolean;
  /** 何ループごとに上げるか */
  everyLoops: number;
  /** 1回あたりの上げ幅(BPM) */
  stepBpm: number;
  /** 上限BPM */
  maxBpm: number;
}

const STEP_NOTATION: Record<number, string> = {
  2: '8n',
  3: '8t',
  4: '16n',
  6: '16t',
};

// 前打音（フラム/ドラッグ）を主音の何秒前に置くか
const GRACE_SPACING = 0.035;

/**
 * 練習用オーディオエンジン。
 * - クリック（メトロノーム）
 * - パターン（お手本）再生：アクセントは強く、フラム/ドラッグは前打音を鳴らす
 * - テンポアップ：一定ループごとにBPMを自動で上げる
 */
export class PracticeEngine {
  private rHand: Tone.MembraneSynth;
  private lHand: Tone.MembraneSynth;
  private clickSynth: Tone.Synth;

  private patternSeq: Tone.Sequence | null = null;
  private clickLoop: Tone.Loop | null = null;

  private pattern: Pattern | null = null;
  private clickEnabled = true;
  private exampleEnabled = false;   // デフォルトOFF
  private distinctHands = false;    // デフォルトOFF
  private tempoUp: TempoUpConfig = {
    enabled: false,
    everyLoops: 2,
    stepBpm: 5,
    maxBpm: 200,
  };

  private countIn = false;
  private beatCount = 0;

  /** BPM変化を外部へ通知（テンポアップ時のUI更新用） */
  onBpmChange: ((bpm: number) => void) | null = null;

  constructor() {
    const out = Tone.getDestination();

    this.rHand = new Tone.MembraneSynth({
      pitchDecay: 0.008,
      octaves: 4,
      envelope: { attack: 0.001, decay: 0.18, sustain: 0, release: 0.1 },
    }).connect(out);

    this.lHand = new Tone.MembraneSynth({
      pitchDecay: 0.008,
      octaves: 4,
      envelope: { attack: 0.001, decay: 0.18, sustain: 0, release: 0.1 },
    }).connect(out);

    this.clickSynth = new Tone.Synth({
      oscillator: { type: 'square' },
      envelope: { attack: 0.001, decay: 0.03, sustain: 0, release: 0.01 },
      volume: -6,
    }).connect(out);

    Tone.getTransport().bpm.value = 100;
  }

  /** ブラウザのオーディオ起動（ユーザー操作時に呼ぶ） */
  async ready(): Promise<void> {
    await Tone.start();
  }

  get bpm(): number {
    return Math.round(Tone.getTransport().bpm.value);
  }

  setBpm(bpm: number): void {
    Tone.getTransport().bpm.value = bpm;
  }

  setClickEnabled(v: boolean): void {
    this.clickEnabled = v;
  }

  setExampleEnabled(v: boolean): void {
    this.exampleEnabled = v;
  }

  setDistinctHands(v: boolean): void {
    this.distinctHands = v;
  }

  setTempoUp(cfg: TempoUpConfig): void {
    this.tempoUp = cfg;
  }

  setCountIn(v: boolean): void {
    this.countIn = v;
  }

  get isPlaying(): boolean {
    return Tone.getTransport().state === 'started';
  }

  /** パターンを設定。再生中なら作り直してそのまま継続 */
  setPattern(pattern: Pattern): void {
    this.pattern = pattern;
    if (this.isPlaying) {
      this.rebuild();
    }
  }

  /** 1打を発音 */
  private strike(hand: Hand, velocity: number, time: number): void {
    const synth = this.distinctHands && hand === 'L' ? this.lHand : this.rHand;
    const pitch = hand === 'R' ? 'C2' : this.distinctHands ? 'G2' : 'C2';
    synth.triggerAttackRelease(pitch, '32n', time, velocity);
  }

  private rebuild(): void {
    this.disposeSequences();
    if (!this.pattern) return;

    const p = this.pattern;
    const step = STEP_NOTATION[p.subdivision] ?? '16n';
    const beatsPerLoop = patternBeats(p);

    // カウントイン（1ループ分のクリック）を行う場合の先頭オフセット拍数
    const countInBeats = this.countIn ? beatsPerLoop : 0;

    // お手本（パターン）再生 ※カウントイン分だけ遅らせて開始
    this.patternSeq = new Tone.Sequence(
      (time, idx: number) => {
        if (!this.exampleEnabled) return;
        const note = p.notes[idx];

        // 前打音（フラム/ドラッグ）を主音の手前に鳴らす
        if (note.graces && note.graces.length > 0) {
          const n = note.graces.length;
          note.graces.forEach((g, gi) => {
            const t = time - GRACE_SPACING * (n - gi);
            this.strike(g, 0.3, Math.max(0, t));
          });
        }

        this.strike(note.hand, note.accent ? 1.0 : 0.5, time);
      },
      p.notes.map((_, i) => i),
      step,
    );
    this.patternSeq.loop = true;
    this.patternSeq.start(countInBeats > 0 ? `0:${countInBeats}:0` : 0);

    // クリック（拍ごと）＋ テンポアップ用のループカウント
    this.beatCount = 0;
    this.clickLoop = new Tone.Loop((time) => {
      // カウントイン中は rel<0。ループ内の相対拍を求める。
      const rel = this.beatCount - countInBeats;
      const beatInLoop = ((rel % beatsPerLoop) + beatsPerLoop) % beatsPerLoop;

      if (this.clickEnabled) {
        const accent = beatInLoop === 0;
        this.clickSynth.triggerAttackRelease(accent ? 'C6' : 'G5', '32n', time, accent ? 1 : 0.7);
      }

      // ループ末尾でテンポアップ判定（カウントインはループに数えない）
      this.beatCount += 1;
      if (rel >= 0 && (rel + 1) % beatsPerLoop === 0) {
        const loops = (rel + 1) / beatsPerLoop;
        if (this.tempoUp.enabled && loops % this.tempoUp.everyLoops === 0) {
          const next = Math.min(this.bpm + this.tempoUp.stepBpm, this.tempoUp.maxBpm);
          if (next !== this.bpm) {
            // 少し先のタイミングで反映してノイズを避ける
            Tone.getDraw().schedule(() => {
              this.onBpmChange?.(next);
            }, time);
            this.setBpm(next);
          }
        }
      }
    }, '4n');
    this.clickLoop.start(0);
  }

  async start(): Promise<void> {
    await this.ready();
    if (!this.pattern) return;
    this.rebuild();
    Tone.getTransport().start('+0.05');
  }

  stop(): void {
    Tone.getTransport().stop();
    Tone.getTransport().position = 0;
    this.disposeSequences();
  }

  private disposeSequences(): void {
    this.patternSeq?.dispose();
    this.patternSeq = null;
    this.clickLoop?.dispose();
    this.clickLoop = null;
  }

  dispose(): void {
    this.stop();
    this.rHand.dispose();
    this.lHand.dispose();
    this.clickSynth.dispose();
  }
}
