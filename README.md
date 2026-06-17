# 🥁 Drum Trainer

ドラムの **ルーディメンツ** と **アクセント移動** を練習するためのWebアプリ。
スマホでの利用を前提にしたUI（1カラム・大きめタップ領域・下部固定の再生バー）。

## 機能

- **クリック（メトロノーム）** — 拍頭にアクセント付き
- **テンポアップ** — 一定ループごとにBPMを自動で上げる
- **ランダム出題** — 選択中カテゴリからランダムに譜面を表示
- **お手本再生**（任意） — 譜面どおりに発音。フラム/ドラッグの前打音やアクセントも再現
- **カウントイン**（任意） — 再生前に1ループ分のクリック
- **カテゴリ分け** — 「ルーディメンツ」「アクセント移動」をタブで切替。
  ルーディメンツはロール/ディドル/フラム/ドラッグのグループ単位で選択
- 手順(R/L)表示の切替、テンポスライダー / ±ボタン、左右で音色を分ける切替

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
// アクセントのみ（フラム/ドラッグなし）
{
  id: 'my-pattern',
  name: '新しいパターン',
  category: 'rudiment',
  group: 'ディドル',
  subdivision: 4,                 // 1拍の音符数 (2/3/4/6)
  notes: build('RLRR LRLL', [0, 4]), // 手順とアクセント位置(0始まり)
}

// フラム/ドラッグを含む場合は seq() を使う
//   R / L … 通常打、末尾 > … アクセント
//   先頭 f … フラム（逆手の前打音1つ）、先頭 d … ドラッグ（逆手の前打音2つ）
{
  id: 'flam-tap',
  name: 'フラムタップ',
  category: 'rudiment',
  group: 'フラム',
  subdivision: 4,
  notes: seq('fR> R fL> L fR> R fL> L fR> R fL> L fR> R fL> L'),
}
```
