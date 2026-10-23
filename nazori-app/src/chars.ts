import hiraganaData from './data/hiragana.json';

export type Pt = [number, number];

export interface CharData {
  char: string;
  /** 読み上げる言葉 */
  reading: string;
  /** 書き順どおりの画。各画は 100×100 マス上の点の列 */
  strokes: Pt[][];
  /** 文字えらびのタイルの色 */
  color: string;
}

export type SetId = 'hiragana' | 'alphabet';

// ひらがなは行ごとに色分けする
const ROW_COLORS: Record<string, string> = {
  あ: '#ff8a80', か: '#ffb74d', さ: '#81c784', た: '#64b5f6', な: '#ba68c8',
};
const ROW_OF: Record<string, string> = {
  あ: 'あ', い: 'あ', う: 'あ', え: 'あ', お: 'あ',
  か: 'か', き: 'か', く: 'か', け: 'か', こ: 'か',
  さ: 'さ', し: 'さ', す: 'さ', せ: 'さ', そ: 'さ',
  た: 'た', ち: 'た', つ: 'た', て: 'た', と: 'た',
};

// 大文字は直線と円弧だけなので手で定義する（日本の小学校英語の書き順）
function line(x1: number, y1: number, x2: number, y2: number): Pt[] {
  return [[x1, y1], [x2, y2]];
}

/** 上から反時計回りに一周する楕円 */
function ellipse(cx: number, cy: number, rx: number, ry: number): Pt[] {
  const pts: Pt[] = [];
  for (let i = 0; i <= 64; i++) {
    const a = -Math.PI / 2 - (i / 64) * Math.PI * 2;
    pts.push([cx + rx * Math.cos(a), cy + ry * Math.sin(a)]);
  }
  return pts;
}

const ALPHABET: { char: string; reading: string; strokes: Pt[][] }[] = [
  { char: 'L', reading: 'エル', strokes: [[[32, 12], [32, 88], [72, 88]]] },
  { char: 'T', reading: 'ティー', strokes: [line(18, 14, 82, 14), line(50, 14, 50, 88)] },
  { char: 'I', reading: 'アイ', strokes: [line(50, 12, 50, 88)] },
  { char: 'O', reading: 'オー', strokes: [ellipse(50, 50, 32, 38)] },
  {
    char: 'A',
    reading: 'エー',
    strokes: [line(50, 12, 20, 88), line(50, 12, 80, 88), line(32, 60, 68, 60)],
  },
];
const ALPHA_COLORS = ['#ff8a80', '#ffb74d', '#81c784', '#64b5f6', '#ba68c8'];

/** 文字の外接枠をマスの中央に寄せ、大きい方の辺が SIZE になるよう拡大する */
function normalize(strokes: Pt[][]): Pt[][] {
  const SIZE = 78;
  const all = strokes.flat();
  const xs = all.map((p) => p[0]);
  const ys = all.map((p) => p[1]);
  const minX = Math.min(...xs), maxX = Math.max(...xs);
  const minY = Math.min(...ys), maxY = Math.max(...ys);
  const s = SIZE / Math.max(maxX - minX, maxY - minY);
  const ox = 50 - ((minX + maxX) / 2) * s;
  const oy = 50 - ((minY + maxY) / 2) * s;
  return strokes.map((st) => st.map(([x, y]) => [x * s + ox, y * s + oy] as Pt));
}

export const SETS: Record<SetId, CharData[]> = {
  hiragana: (hiraganaData as { char: string; strokes: Pt[][] }[]).map((c) => ({
    char: c.char,
    reading: c.char,
    strokes: normalize(c.strokes),
    color: ROW_COLORS[ROW_OF[c.char] ?? 'あ'],
  })),
  alphabet: ALPHABET.map((c, i) => ({
    ...c,
    strokes: normalize(c.strokes),
    color: ALPHA_COLORS[i % ALPHA_COLORS.length],
  })),
};
