import hiraganaData from './data/hiragana.json';
import katakanaData from './data/katakana.json';
import alphabetData from './data/alphabet.json';
import lowercaseData from './data/lowercase.json';
import numbersData from './data/numbers.json';

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

export type SetId = 'hiragana' | 'katakana' | 'alphabet' | 'numbers';

type RawChar = { char: string; strokes: Pt[][] };

const COLORS = ['#ff8a80', '#ffb74d', '#81c784', '#64b5f6', '#ba68c8'];

// ひらがな・カタカナは五十音表の行ごとに色分けする
const GOJUON = [
  'あいうえお', 'かきくけこ', 'さしすせそ', 'たちつてと', 'なにぬねの',
  'はひふへほ', 'まみむめも', 'や ゆ よ', 'らりるれろ', 'わ   を', 'ん    ',
];
const HIRAGANA_COLORS = [...COLORS, '#4db6ac', '#f06292', '#ffd54f', '#7986cb', '#a1887f', '#90a4ae'];
/** カタカナをひらがなに直す（読み上げと色分けに使う） */
function toHiragana(ch: string): string {
  const code = ch.charCodeAt(0);
  return code >= 0x30a1 && code <= 0x30f6 ? String.fromCharCode(code - 0x60) : ch;
}
function kanaColor(ch: string): string {
  const row = GOJUON.findIndex((r) => r.includes(toHiragana(ch)));
  return HIRAGANA_COLORS[row % HIRAGANA_COLORS.length];
}

const ALPHABET_READINGS = [
  'エー', 'ビー', 'シー', 'ディー', 'イー', 'エフ', 'ジー', 'エイチ', 'アイ', 'ジェー', 'ケー', 'エル', 'エム',
  'エヌ', 'オー', 'ピー', 'キュー', 'アール', 'エス', 'ティー', 'ユー', 'ブイ', 'ダブリュー', 'エックス', 'ワイ', 'ゼット',
];
const NUMBER_READINGS = ['ぜろ', 'いち', 'に', 'さん', 'よん', 'ご', 'ろく', 'なな', 'はち', 'きゅう'];

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

function build(data: RawChar[], reading: (c: RawChar, i: number) => string, color: (c: RawChar, i: number) => string): CharData[] {
  return data.map((c, i) => ({
    char: c.char,
    reading: reading(c, i),
    strokes: normalize(c.strokes),
    color: color(c, i),
  }));
}

const hiragana = build(hiraganaData as RawChar[], (c) => c.char, (c) => kanaColor(c.char));
// カタカナ1文字だと読み上げが不安定なことがあるので、ひらがなで読ませる
const katakana = build(katakanaData as RawChar[], (c) => toHiragana(c.char), (c) => kanaColor(c.char));
const upper = build(alphabetData as RawChar[], (_, i) => ALPHABET_READINGS[i], (_, i) => COLORS[i % COLORS.length]);
const lower = build(lowercaseData as RawChar[], (_, i) => ALPHABET_READINGS[i], (_, i) => COLORS[i % COLORS.length]);
// 数字は 1〜9、0 の順に並べる
const numbers = build(numbersData as RawChar[], (_, i) => NUMBER_READINGS[i], (_, i) => COLORS[i % COLORS.length]);
numbers.push(numbers.shift()!);

/** 文字えらびに並べる文字。lowercase が true ならアルファベットに小文字も加える */
export function charList(set: SetId, lowercase: boolean): CharData[] {
  if (set === 'hiragana') return hiragana;
  if (set === 'katakana') return katakana;
  if (set === 'numbers') return numbers;
  return lowercase ? [...upper, ...lower] : upper;
}

/**
 * 文字えらびの並び。ひらがな・カタカナは五十音表の形にし、空きマスは null。
 * columns は1行に並べる数
 */
export function tileLayout(set: SetId, lowercase: boolean): { columns: number; cells: (CharData | null)[] } {
  if (set !== 'hiragana' && set !== 'katakana') {
    return { columns: set === 'numbers' ? 3 : 4, cells: charList(set, lowercase) };
  }
  const kana = charList(set, lowercase);
  const cells = GOJUON.flatMap((row) => [...row].map((ch) => kana.find((c) => toHiragana(c.char) === ch) ?? null));
  return { columns: 5, cells };
}
