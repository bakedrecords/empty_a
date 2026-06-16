import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Category,
  Pattern,
  patternsByCategory,
  randomPattern,
} from './data/patterns';
import { PracticeEngine, TempoUpConfig } from './audio/engine';
import { downloadMidi } from './audio/midi';
import { Notation } from './components/Notation';

const MIN_BPM = 40;
const MAX_BPM = 260;

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
  const [example, setExample] = useState(true);
  const [sticking, setSticking] = useState(true);
  const [distinctHands, setDistinctHands] = useState(true);

  const [tempoUp, setTempoUp] = useState<TempoUpConfig>({
    enabled: false,
    everyLoops: 2,
    stepBpm: 5,
    maxBpm: 180,
  });

  const list = useMemo(() => patternsByCategory(category), [category]);

  // エンジンへ設定を反映
  useEffect(() => { engine.setBpm(bpm); }, [engine, bpm]);
  useEffect(() => { engine.setClickEnabled(click); }, [engine, click]);
  useEffect(() => { engine.setExampleEnabled(example); }, [engine, example]);
  useEffect(() => { engine.setDistinctHands(distinctHands); }, [engine, distinctHands]);
  useEffect(() => { engine.setTempoUp(tempoUp); }, [engine, tempoUp]);
  useEffect(() => { engine.setPattern(pattern); }, [engine, pattern]);

  // テンポアップでBPMが変わったらUIへ反映
  useEffect(() => {
    engine.onBpmChange = (next) => setBpm(next);
    return () => { engine.onBpmChange = null; };
  }, [engine]);

  useEffect(() => () => engine.dispose(), [engine]);

  function changeCategory(c: Category) {
    setCategory(c);
    const first = patternsByCategory(c)[0];
    setPattern(first);
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

  return (
    <div className="app">
      <header className="app-header">
        <h1>🥁 Drum Trainer</h1>
        <p className="subtitle">ルーディメンツ / アクセント移動 練習</p>
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

      <div className="layout">
        <aside className="sidebar">
          <h2>メニュー</h2>
          <ul className="pattern-list">
            {list.map((p) => (
              <li key={p.id}>
                <button
                  className={p.id === pattern.id ? 'item active' : 'item'}
                  onClick={() => setPattern(p)}
                >
                  {p.name}
                </button>
              </li>
            ))}
          </ul>
          <button className="random" onClick={pickRandom}>
            🎲 ランダム出題
          </button>
        </aside>

        <main className="main">
          <div className="card">
            <div className="card-title">
              <h2>{pattern.name}</h2>
              {pattern.hint && <span className="hint">{pattern.hint}</span>}
            </div>
            <Notation pattern={pattern} showSticking={sticking} />
          </div>

          <div className="card controls">
            <div className="transport">
              <button className={playing ? 'play stop' : 'play'} onClick={togglePlay}>
                {playing ? '■ 停止' : '▶ 再生'}
              </button>
              <div className="bpm">
                <span className="bpm-value">{bpm}</span>
                <span className="bpm-unit">BPM</span>
              </div>
            </div>

            <input
              className="tempo-slider"
              type="range"
              min={MIN_BPM}
              max={MAX_BPM}
              value={bpm}
              onChange={(e) => setBpm(Number(e.target.value))}
            />
            <div className="bpm-buttons">
              {[-10, -5, -1, +1, +5, +10].map((d) => (
                <button
                  key={d}
                  onClick={() =>
                    setBpm((b) => Math.min(MAX_BPM, Math.max(MIN_BPM, b + d)))
                  }
                >
                  {d > 0 ? `+${d}` : d}
                </button>
              ))}
            </div>

            <div className="toggles">
              <label>
                <input type="checkbox" checked={click} onChange={(e) => setClick(e.target.checked)} />
                クリック
              </label>
              <label>
                <input type="checkbox" checked={example} onChange={(e) => setExample(e.target.checked)} />
                お手本再生
              </label>
              <label>
                <input type="checkbox" checked={sticking} onChange={(e) => setSticking(e.target.checked)} />
                手順(R/L)表示
              </label>
              <label>
                <input type="checkbox" checked={distinctHands} onChange={(e) => setDistinctHands(e.target.checked)} />
                左右の音色を分ける
              </label>
            </div>

            <fieldset className="tempo-up">
              <legend>
                <label>
                  <input
                    type="checkbox"
                    checked={tempoUp.enabled}
                    onChange={(e) => setTempoUp({ ...tempoUp, enabled: e.target.checked })}
                  />
                  テンポアップ
                </label>
              </legend>
              <div className="tempo-up-row">
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
            </fieldset>

            <button className="midi" onClick={() => downloadMidi(pattern, bpm)}>
              ⬇ MIDI（お手本）を書き出す
            </button>
          </div>
        </main>
      </div>

      <footer className="app-footer">
        <small>練習のヒント：まずゆっくり正確に → テンポアップで限界を少しずつ上げる。</small>
      </footer>
    </div>
  );
}
