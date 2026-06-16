// 練習パターンのデータ定義
// ルーディメンツ / アクセント移動 をここで一元管理する。

export type Hand = 'R' | 'L';
export type Category = 'rudiment' | 'accent';

export interface Note {
  hand: Hand;
  accent: boolean;
}

export interface Pattern {
  id: string;
  name: string;
  category: Category;
  /** 1拍あたりの音符数。2=8分, 3=8分3連, 4=16分, 6=16分6連 */
  subdivision: number;
  /** 音符列。長さは subdivision の倍数（= 拍数 × subdivision） */
  notes: Note[];
  /** 補足説明（任意） */
  hint?: string;
}

// --- 生成ヘルパー -----------------------------------------------------------

/** "RLRR" のような手順文字列と、アクセント位置(0始まり)からノート列を作る */
function build(sticking: string, accents: number[] = []): Note[] {
  const set = new Set(accents);
  return sticking
    .replace(/\s+/g, '')
    .split('')
    .map((c, i) => ({
      hand: c.toUpperCase() === 'R' ? 'R' : 'L',
      accent: set.has(i),
    } as Note));
}

/** 単打の交互手順 RLRL... を n 個生成（先頭の手を指定可） */
function alt(n: number, start: Hand = 'R'): string {
  let s = '';
  let h = start;
  for (let i = 0; i < n; i++) {
    s += h;
    h = h === 'R' ? 'L' : 'R';
  }
  return s;
}

// --- ルーディメンツ ---------------------------------------------------------

export const rudiments: Pattern[] = [
  {
    id: 'single-stroke-roll',
    name: 'シングルストローク・ロール',
    category: 'rudiment',
    subdivision: 4,
    notes: build(alt(16)),
    hint: '左右を均等に。1音ずつ交互に。',
  },
  {
    id: 'double-stroke-roll',
    name: 'ダブルストローク・ロール',
    category: 'rudiment',
    subdivision: 4,
    notes: build('RRLL RRLL RRLL RRLL'),
    hint: '2打目を1打目と同じ音量・粒で。',
  },
  {
    id: 'single-paradiddle',
    name: 'シングル・パラディドル',
    category: 'rudiment',
    subdivision: 4,
    notes: build('RLRR LRLL RLRR LRLL', [0, 4, 8, 12]),
    hint: 'アクセントは各グループの頭。',
  },
  {
    id: 'double-paradiddle',
    name: 'ダブル・パラディドル',
    category: 'rudiment',
    subdivision: 6,
    notes: build('RLRLRR LRLRLL', [0, 6]),
    hint: '6連（2拍）。頭にアクセント。',
  },
  {
    id: 'paradiddle-diddle',
    name: 'パラディドル・ディドル',
    category: 'rudiment',
    subdivision: 6,
    notes: build('RLRRLL RLRRLL', [0, 6]),
  },
  {
    id: 'triple-stroke-roll',
    name: 'トリプルストローク・ロール',
    category: 'rudiment',
    subdivision: 3,
    notes: build('RRR LLL RRR LLL', [0, 3, 6, 9]),
    hint: '3連符。3打を粒よく。',
  },
  {
    id: 'single-stroke-four',
    name: 'シングルストローク・フォー',
    category: 'rudiment',
    subdivision: 3,
    notes: build('RLRLRL RLRLRL', [0, 3, 6, 9]),
    hint: '3連の単打。各拍頭にアクセント。',
  },
  {
    id: 'inverted-paradiddle',
    name: 'インワード（逆）パラディドル',
    category: 'rudiment',
    subdivision: 4,
    notes: build('RLLR LRRL RLLR LRRL', [0, 4, 8, 12]),
  },
];

// --- アクセント移動 ---------------------------------------------------------
// すべて16分の単打(RLRL)で、アクセント位置だけを変える基礎トレーニング。

export const accents: Pattern[] = [
  {
    id: 'accent-1',
    name: 'アクセント移動：1（表）',
    category: 'accent',
    subdivision: 4,
    notes: build(alt(16), [0, 4, 8, 12]),
    hint: '各拍の「1」にアクセント。',
  },
  {
    id: 'accent-e',
    name: 'アクセント移動：e（2つ目）',
    category: 'accent',
    subdivision: 4,
    notes: build(alt(16), [1, 5, 9, 13]),
    hint: '各拍の「e」にアクセント。',
  },
  {
    id: 'accent-and',
    name: 'アクセント移動：&（裏）',
    category: 'accent',
    subdivision: 4,
    notes: build(alt(16), [2, 6, 10, 14]),
    hint: '各拍の「&」にアクセント。',
  },
  {
    id: 'accent-a',
    name: 'アクセント移動：a（4つ目）',
    category: 'accent',
    subdivision: 4,
    notes: build(alt(16), [3, 7, 11, 15]),
    hint: '各拍の「a」にアクセント。',
  },
  {
    id: 'accent-1-and',
    name: 'アクセント移動：1 & （表裏）',
    category: 'accent',
    subdivision: 4,
    notes: build(alt(16), [0, 2, 4, 6, 8, 10, 12, 14]),
  },
  {
    id: 'accent-moving-up',
    name: 'アクセント移動：1拍ごとに後ろへ',
    category: 'accent',
    subdivision: 4,
    notes: build(alt(16), [0, 5, 10, 15]),
    hint: '1→e→&→a と1拍ずつ後ろへ移動。',
  },
];

export const allPatterns: Pattern[] = [...rudiments, ...accents];

export function patternsByCategory(category: Category): Pattern[] {
  return category === 'rudiment' ? rudiments : accents;
}

/** 指定カテゴリからランダムに1つ。現在のものは避ける。 */
export function randomPattern(category: Category, excludeId?: string): Pattern {
  const list = patternsByCategory(category);
  const pool = list.length > 1 && excludeId
    ? list.filter((p) => p.id !== excludeId)
    : list;
  return pool[Math.floor(Math.random() * pool.length)];
}

/** 1パターンの拍数 */
export function patternBeats(p: Pattern): number {
  return p.notes.length / p.subdivision;
}
