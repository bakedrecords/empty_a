import * as Tone from 'tone';
import { Pattern, patternBeats } from '../data/patterns';

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

/**
 * 練習用オーディオエンジン。
 * - クリック（メトロノーム）
 * - パターン（お手本）再生：R/Lで音色を分け、アクセントは強く鳴らす
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
  private exampleEnabled = true;
  private distinctHands = true;
  private tempoUp: TempoUpConfig = {
    enabled: false,
    everyLoops: 2,
    stepBpm: 5,
    maxBpm: 200,
  };

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

  private rebuild(): void {
    this.disposeSequences();
    if (!this.pattern) return;

    const p = this.pattern;
    const step = STEP_NOTATION[p.subdivision] ?? '16n';
    const beatsPerLoop = patternBeats(p);

    // お手本（パターン）再生
    this.patternSeq = new Tone.Sequence(
      (time, idx: number) => {
        if (!this.exampleEnabled) return;
        const note = p.notes[idx];
        const velocity = note.accent ? 1.0 : 0.5;
        const synth = this.distinctHands && note.hand === 'L' ? this.lHand : this.rHand;
        const pitch = note.hand === 'R' ? 'C2' : this.distinctHands ? 'G2' : 'C2';
        synth.triggerAttackRelease(pitch, '32n', time, velocity);
      },
      p.notes.map((_, i) => i),
      step,
    );
    this.patternSeq.loop = true;
    this.patternSeq.start(0);

    // クリック（拍ごと）＋ テンポアップ用のループカウント
    this.beatCount = 0;
    this.clickLoop = new Tone.Loop((time) => {
      const beatInLoop = this.beatCount % beatsPerLoop;

      if (this.clickEnabled) {
        const accent = beatInLoop === 0;
        this.clickSynth.triggerAttackRelease(accent ? 'C6' : 'G5', '32n', time, accent ? 1 : 0.7);
      }

      // ループ末尾（次の頭の手前）でテンポアップ判定
      this.beatCount += 1;
      if (this.beatCount % beatsPerLoop === 0) {
        const loops = this.beatCount / beatsPerLoop;
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
