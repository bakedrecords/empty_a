import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Category,
  Pattern,
  patternsByCategory,
  randomPattern,
} from './data/patterns';
import { PracticeEngine, TempoUpConfig } from './audio/engine';
import { Notation } from './components/Notation';

const MIN_BPM = 40;
const MAX_BPM = 260;

/** トグル用のピルボタン */
function Toggle({
  on,
  onChange,
  children,
}: {
  on: boolean;
  onChange: (v: boolean) => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      className={on ? 'pill on' : 'pill'}
      aria-pressed={on}
      onClick={() => onChange(!on)}
    >
      {children}
    </button>
  );
}

export function App() {
  const engineRef = useRef<PracticeEngine | null>(null);
  if (engineRef.current === null) {
    engineRef.current = new PracticeEngine();
  }
  const engine = engineRef.current;

  const [category, setCategory] = useState<Category>('rudiment');
  const [pattern, setPattern] = useState<Pattern>(
    () => patternsByCategory('rudiment')[0],
  );
  const [bpm, setBpm] = useState(100);
  const [playing, setPlaying] = useState(false);

  const [click, setClick] = useState(true);
  const [example, setExample] = useState(false);       // デフォルトOFF
  const [sticking, setSticking] = useState(true);
  const [distinctHands, setDistinctHands] = useState(false); // デフォルトOFF

  const [tempoUp, setTempoUp] = useState<TempoUpConfig>({
    enabled: false,
    everyLoops: 2,
    stepBpm: 2,
    maxBpm: 180,
  });
  const [countIn, setCountIn] = useState(false);

  const list = useMemo(() => patternsByCategory(category), [category]);

  // グループ（ロール/ディドル/フラム/ドラッグ等）ごとに分けて <optgroup> 化
  const grouped = useMemo(() => {
    const map = new Map<string, Pattern[]>();
    for (const p of list) {
      const g = p.group ?? 'その他';
      if (!map.has(g)) map.set(g, []);
      map.get(g)!.push(p);
    }
    return [...map.entries()];
  }, [list]);

  // エンジンへ設定を反映
  useEffect(() => { engine.setBpm(bpm); }, [engine, bpm]);
  useEffect(() => { engine.setClickEnabled(click); }, [engine, click]);
  useEffect(() => { engine.setExampleEnabled(example); }, [engine, example]);
  useEffect(() => { engine.setDistinctHands(distinctHands); }, [engine, distinctHands]);
  useEffect(() => { engine.setTempoUp(tempoUp); }, [engine, tempoUp]);
  useEffect(() => { engine.setCountIn(countIn); }, [engine, countIn]);
  useEffect(() => { engine.setPattern(pattern); }, [engine, pattern]);

  // テンポアップでBPMが変わったらUIへ反映
  useEffect(() => {
    engine.onBpmChange = (next) => setBpm(next);
    return () => { engine.onBpmChange = null; };
  }, [engine]);

  useEffect(() => () => engine.dispose(), [engine]);

  function changeCategory(c: Category) {
    setCategory(c);
    setPattern(patternsByCategory(c)[0]);
  }

  async function togglePlay() {
    if (playing) {
      engine.stop();
      setPlaying(false);
    } else {
      await engine.start();
      setPlaying(true);
    }
  }

  function pickRandom() {
    setPattern((cur) => randomPattern(category, cur.id));
  }

  function selectById(id: string) {
    const found = list.find((p) => p.id === id);
    if (found) setPattern(found);
  }

  function nudge(d: number) {
    setBpm((b) => Math.min(MAX_BPM, Math.max(MIN_BPM, b + d)));
  }

  return (
    <div className="app">
      <header className="app-header">
        <h1>🥁 Drum Trainer</h1>
      </header>

      <div className="tabs">
        <button
          className={category === 'rudiment' ? 'tab active' : 'tab'}
          onClick={() => changeCategory('rudiment')}
        >
          ルーディメンツ
        </button>
        <button
          className={category === 'accent' ? 'tab active' : 'tab'}
          onClick={() => changeCategory('accent')}
        >
          アクセント移動
        </button>
      </div>

      <div className="picker">
        <select
          className="pattern-select"
          value={pattern.id}
          onChange={(e) => selectById(e.target.value)}
        >
          {grouped.map(([g, items]) => (
            <optgroup key={g} label={g}>
              {items.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </optgroup>
          ))}
        </select>
        <button className="random" onClick={pickRandom} aria-label="ランダム出題">🎲</button>
      </div>

      <section className="card">
        <div className="card-title">
          <h2>{pattern.name}</h2>
          <p className="hint">{pattern.hint ?? ''}</p>
        </div>
        <Notation pattern={pattern} showSticking={sticking} />
      </section>

      <section className="card">
        <input
          className="tempo-slider"
          type="range"
          min={MIN_BPM}
          max={MAX_BPM}
          value={bpm}
          onChange={(e) => setBpm(Number(e.target.value))}
          aria-label="テンポ"
        />
        <div className="bpm-buttons">
          <button onClick={() => nudge(-5)}>−5</button>
          <button onClick={() => nudge(-1)}>−1</button>
          <button onClick={() => nudge(+1)}>＋1</button>
          <button onClick={() => nudge(+5)}>＋5</button>
        </div>

        <div className="settings">
          <Toggle on={click} onChange={setClick}>クリック</Toggle>
          <Toggle on={sticking} onChange={setSticking}>手順 R/L</Toggle>
          <Toggle on={countIn} onChange={setCountIn}>カウントイン</Toggle>
          <Toggle on={example} onChange={setExample}>お手本再生</Toggle>
          <Toggle on={distinctHands} onChange={setDistinctHands}>左右で音色</Toggle>
        </div>

        <details className="advanced">
          <summary>テンポアップ</summary>
          <div className="tempo-up-row">
            <Toggle on={tempoUp.enabled} onChange={(v) => setTempoUp({ ...tempoUp, enabled: v })}>
              有効
            </Toggle>
            <label>
              <input
                type="number" min={1} max={32}
                value={tempoUp.everyLoops}
                onChange={(e) => setTempoUp({ ...tempoUp, everyLoops: Number(e.target.value) })}
              />
              ループごと
            </label>
            <label>
              +<input
                type="number" min={1} max={20}
                value={tempoUp.stepBpm}
                onChange={(e) => setTempoUp({ ...tempoUp, stepBpm: Number(e.target.value) })}
              />
              BPM
            </label>
            <label>
              上限<input
                type="number" min={MIN_BPM} max={MAX_BPM}
                value={tempoUp.maxBpm}
                onChange={(e) => setTempoUp({ ...tempoUp, maxBpm: Number(e.target.value) })}
              />
            </label>
          </div>
        </details>
      </section>

      <div className="transport-bar">
        <div className="bpm">
          <span className="bpm-value">{bpm}</span>
          <span className="bpm-unit">BPM</span>
        </div>
        <button className={playing ? 'play stop' : 'play'} onClick={togglePlay}>
          {playing ? '■ 停止' : '▶ 再生'}
        </button>
      </div>
    </div>
  );
}
