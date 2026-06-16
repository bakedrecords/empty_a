# 🥁 Drum Trainer

ドラムの **ルーディメンツ** と **アクセント移動** を練習するためのWebアプリ。

## 機能（MVP）

- **クリック（メトロノーム）** — 拍頭にアクセント付き
- **テンポアップ** — 一定ループごとにBPMを自動で上げる
- **ランダム出題** — 選択中カテゴリからランダムに譜面を表示
- **お手本再生** — 譜面どおりに発音。R/Lで音色を分け、アクセントは強く鳴らす
- **MIDI書き出し** — お手本を `.mid` で保存し、外部プレイヤー/DAWでも再生可能
- **カテゴリ分け** — 「ルーディメンツ」「アクセント移動」をタブで切替
- 手順(R/L)表示の切替、テンポスライダー / ±ボタン

## 技術スタック

- Vite + React + TypeScript
- [Tone.js](https://tonejs.github.io/) — 発音・スケジューリング
- [VexFlow](https://vexflow.com/) — 楽譜描画

## 開発

```bash
npm install
npm run dev        # 開発サーバー
npm run build      # 本番ビルド
npm run typecheck  # 型チェック
```

## データの追加

`src/data/patterns.ts` の `rudiments` / `accents` 配列にパターンを追加するだけで
メニュー・ランダム出題・再生・描画すべてに反映されます。

```ts
{
  id: 'my-pattern',
  name: '新しいパターン',
  category: 'rudiment',
  subdivision: 4,                 // 1拍の音符数 (2/3/4/6)
  notes: build('RLRR LRLL', [0, 4]), // 手順とアクセント位置
}
```
