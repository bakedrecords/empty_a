// 練習パターンのデータ定義
// ルーディメンツ / アクセント移動 をここで一元管理する。

export type Hand = 'R' | 'L';
export type Category = 'rudiment' | 'accent';

export interface Note {
  hand: Hand;
  accent: boolean;
  /** 装飾音（前打音）の手の並び。フラム=1個 / ドラッグ=2個（いずれも逆の手） */
  graces?: Hand[];
}

export interface Pattern {
  id: string;
  name: string;
  category: Category;
  /** ルーディメンツのサブグループ（ロール/ディドル/フラム/ドラッグ など） */
  group?: string;
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

/**
 * トークン列から音符を作る。フラム/ドラッグ対応。
 * 各トークン（空白区切り）:
 *   R / L            … 通常打
 *   末尾 >           … アクセント（例 R>）
 *   先頭 f           … フラム（逆の手の前打音1つ。例 fR = 左前打→右）
 *   先頭 d           … ドラッグ（逆の手の前打音2つ。例 dR = 左左前打→右）
 */
function seq(tokens: string): Note[] {
  return tokens
    .trim()
    .split(/\s+/)
    .map((tok) => {
      let t = tok;
      let graceCount = 0;
      if (t[0] === 'f') { graceCount = 1; t = t.slice(1); }
      else if (t[0] === 'd') { graceCount = 2; t = t.slice(1); }
      let accent = false;
      if (t.endsWith('>')) { accent = true; t = t.slice(0, -1); }
      const hand: Hand = t.toUpperCase() === 'R' ? 'R' : 'L';
      const opp: Hand = hand === 'R' ? 'L' : 'R';
      const note: Note = { hand, accent };
      if (graceCount > 0) note.graces = Array(graceCount).fill(opp);
      return note;
    });
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
// PAS（Percussive Arts Society）40 International Drum Rudiments のうち、
// 離散的な打音グリッド（均一なサブディビジョン）で正しく表せるものを収録。
// 番号付きロール（5/7/9…ストローク）やバズロードは、タイ/トレモロ記譜が
// 必要なため現状は未収録。

export const rudiments: Pattern[] = [
  // ロール系
  {
    id: 'single-stroke-roll',
    name: 'シングルストローク・ロール',
    category: 'rudiment',
    group: 'ロール',
    subdivision: 4,
    notes: build(alt(16)),
    hint: '左右を均等に。1音ずつ交互に。',
  },
  {
    id: 'single-stroke-four',
    name: 'シングルストローク・フォー',
    category: 'rudiment',
    group: 'ロール',
    subdivision: 3,
    notes: seq('R L R> L R L>'),
    hint: '3連の単打。各グループ末尾にアクセント。',
  },
  {
    id: 'triple-stroke-roll',
    name: 'トリプルストローク・ロール',
    category: 'rudiment',
    group: 'ロール',
    subdivision: 6,
    notes: build('RRRLLLRRRLLL', [0, 3, 6, 9]),
    hint: '6連。3打ずつ粒をそろえる。',
  },
  {
    id: 'double-stroke-roll',
    name: 'ダブルストローク（オープン）・ロール',
    category: 'rudiment',
    group: 'ロール',
    subdivision: 4,
    notes: build('RRLLRRLLRRLLRRLL'),
    hint: '2打目を1打目と同じ音量・粒で。',
  },
  {
    id: 'six-stroke-roll',
    name: 'シックスストローク・ロール',
    category: 'rudiment',
    group: 'ロール',
    subdivision: 6,
    notes: seq('R> L L R R L> L> R R L L R>'),
    hint: 'アクセント→ダブル→ダブル→アクセント。',
  },

  // ディドル系
  {
    id: 'single-paradiddle',
    name: 'シングル・パラディドル',
    category: 'rudiment',
    group: 'ディドル',
    subdivision: 4,
    notes: seq('R> L R R L> R L L'),
    hint: 'アクセントは各グループの頭。',
  },
  {
    id: 'double-paradiddle',
    name: 'ダブル・パラディドル',
    category: 'rudiment',
    group: 'ディドル',
    subdivision: 3,
    notes: seq('R> L R L R R L> R L R L L'),
    hint: '3連で。頭にアクセント。',
  },
  {
    id: 'triple-paradiddle',
    name: 'トリプル・パラディドル',
    category: 'rudiment',
    group: 'ディドル',
    subdivision: 4,
    notes: seq('R> L R L R L R R L> R L R L R L L'),
    hint: '単打6つ＋ディドル。頭にアクセント。',
  },
  {
    id: 'single-paradiddle-diddle',
    name: 'パラディドル・ディドル',
    category: 'rudiment',
    group: 'ディドル',
    subdivision: 3,
    notes: seq('R> L R R L L L> R L L R R'),
    hint: '単打2つ＋ディドル2つ。頭にアクセント。',
  },

  // フラム系
  {
    id: 'flam',
    name: 'フラム',
    category: 'rudiment',
    group: 'フラム',
    subdivision: 2,
    notes: seq('fR fL fR fL fR fL fR fL'),
    hint: '装飾音は主音の直前に。左右交互。',
  },
  {
    id: 'flam-accent',
    name: 'フラム・アクセント',
    category: 'rudiment',
    group: 'フラム',
    subdivision: 3,
    notes: seq('fR> L R fL> R L'),
    hint: '3連の頭をフラム＋アクセント。',
  },
  {
    id: 'flam-tap',
    name: 'フラム・タップ',
    category: 'rudiment',
    group: 'フラム',
    subdivision: 4,
    notes: seq('fR> R fL> L fR> R fL> L fR> R fL> L fR> R fL> L'),
    hint: 'フラム＋同じ手のタップ。',
  },
  {
    id: 'flamacue',
    name: 'フラマキュー',
    category: 'rudiment',
    group: 'フラム',
    subdivision: 4,
    notes: seq('fR L> R L fL R> L R'),
    hint: '頭をフラム、2つ目にアクセント。',
  },
  {
    id: 'flam-paradiddle',
    name: 'フラム・パラディドル',
    category: 'rudiment',
    group: 'フラム',
    subdivision: 4,
    notes: seq('fR> L R R fL> R L L'),
    hint: 'パラディドルの頭をフラム＋アクセント。',
  },
  {
    id: 'single-flammed-mill',
    name: 'シングル・フラム・ミル',
    category: 'rudiment',
    group: 'フラム',
    subdivision: 4,
    notes: seq('fR> R L R fL> L R L'),
    hint: '逆パラディドル(RRLR)の頭をフラム。',
  },
  {
    id: 'flam-paradiddle-diddle',
    name: 'フラム・パラディドル・ディドル',
    category: 'rudiment',
    group: 'フラム',
    subdivision: 3,
    notes: seq('fR> L R R L L fL> R L L R R'),
    hint: 'パラディドルディドルの頭をフラム。',
  },
  {
    id: 'pataflafla',
    name: 'パタフラフラ',
    category: 'rudiment',
    group: 'フラム',
    subdivision: 4,
    notes: seq('fR> L R fL> fL> R L fR>'),
    hint: '4打の1つ目と4つ目をフラム＋アクセント。',
  },
  {
    id: 'swiss-army-triplet',
    name: 'スイス・アーミー・トリプレット',
    category: 'rudiment',
    group: 'フラム',
    subdivision: 3,
    notes: seq('fR> R L fL> L R'),
    hint: 'フラム＋ダブル＋単打（RRL）。',
  },
  {
    id: 'inverted-flam-tap',
    name: 'インバーテッド・フラム・タップ',
    category: 'rudiment',
    group: 'フラム',
    subdivision: 4,
    notes: seq('fR> L fL> R fL> R fR> L'),
    hint: 'タップとフラムが入れ替わる形。',
  },
  {
    id: 'flam-drag',
    name: 'フラム・ドラッグ',
    category: 'rudiment',
    group: 'フラム',
    subdivision: 3,
    notes: seq('fR> dL R fL> dR L'),
    hint: 'フラム→ドラッグ→単打（3連）。',
  },

  // ドラッグ系
  {
    id: 'drag',
    name: 'ドラッグ（ラフ）',
    category: 'rudiment',
    group: 'ドラッグ',
    subdivision: 2,
    notes: seq('dR dL dR dL dR dL dR dL'),
    hint: '主音の直前に逆手のダブル装飾音。',
  },
  {
    id: 'single-drag-tap',
    name: 'シングル・ドラッグ・タップ',
    category: 'rudiment',
    group: 'ドラッグ',
    subdivision: 2,
    notes: seq('dR L> dL R>'),
    hint: 'ドラッグ→アクセントのタップ。',
  },
  {
    id: 'double-drag-tap',
    name: 'ダブル・ドラッグ・タップ',
    category: 'rudiment',
    group: 'ドラッグ',
    subdivision: 3,
    notes: seq('dR dR L> dL dL R>'),
    hint: 'ドラッグ2回→アクセントのタップ。',
  },
  {
    id: 'lesson-25',
    name: 'レッスン25',
    category: 'rudiment',
    group: 'ドラッグ',
    subdivision: 3,
    notes: seq('dR L R> dL R L>'),
    hint: 'ドラッグ→単打→アクセント（3連）。',
  },
];

// --- アクセント移動 ---------------------------------------------------------
// すべて16分の単打(RLRL)で、アクセント位置だけを変える基礎トレーニング。

export const accents: Pattern[] = [
  {
    id: 'accent-1',
    name: 'アクセント移動：1（表）',
    category: 'accent',
    group: '各拍に1つ',
    subdivision: 4,
    notes: build(alt(16), [0, 4, 8, 12]),
    hint: '各拍の「1」にアクセント。',
  },
  {
    id: 'accent-e',
    name: 'アクセント移動：e（2つ目）',
    category: 'accent',
    group: '各拍に1つ',
    subdivision: 4,
    notes: build(alt(16), [1, 5, 9, 13]),
    hint: '各拍の「e」にアクセント。',
  },
  {
    id: 'accent-and',
    name: 'アクセント移動：&（裏）',
    category: 'accent',
    group: '各拍に1つ',
    subdivision: 4,
    notes: build(alt(16), [2, 6, 10, 14]),
    hint: '各拍の「&」にアクセント。',
  },
  {
    id: 'accent-a',
    name: 'アクセント移動：a（4つ目）',
    category: 'accent',
    group: '各拍に1つ',
    subdivision: 4,
    notes: build(alt(16), [3, 7, 11, 15]),
    hint: '各拍の「a」にアクセント。',
  },
  {
    id: 'accent-1-and',
    name: 'アクセント移動：1 & （表裏）',
    category: 'accent',
    group: '応用',
    subdivision: 4,
    notes: build(alt(16), [0, 2, 4, 6, 8, 10, 12, 14]),
  },
  {
    id: 'accent-moving-up',
    name: 'アクセント移動：1拍ごとに後ろへ',
    category: 'accent',
    group: '応用',
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
