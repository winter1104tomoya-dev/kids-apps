// ハンバーガーの具とジュースの絵（SVG）と名前

export type Topping = 'patty' | 'cheese' | 'lettuce' | 'tomato';
export type Drink = 'orange' | 'pink' | 'green' | 'purple';

export interface ToppingInfo {
  /** 読み上げる名前 */
  name: string;
  /** 色の言い方（「きいろの チーズ」） */
  color: string;
  /** 絵の高さ（幅は 200） */
  h: number;
  svg: string;
  /** ボタンと注文で使う、ひと目でわかる絵（100×100） */
  icon: string;
}

export const TOPPINGS: Record<Topping, ToppingInfo> = {
  patty: {
    name: 'ハンバーグ',
    color: 'ちゃいろの',
    h: 40,
    svg: `<rect x="8" y="4" width="184" height="32" rx="16" fill="#7b4a2c"/>
      <rect x="18" y="8" width="164" height="8" rx="4" fill="#9a6440"/>
      <circle cx="40" cy="26" r="3" fill="#5c3520"/><circle cx="90" cy="24" r="3" fill="#5c3520"/>
      <circle cx="140" cy="27" r="3" fill="#5c3520"/><circle cx="170" cy="22" r="3" fill="#5c3520"/>`,
    icon: `<circle cx="50" cy="52" r="42" fill="#5c3520"/><circle cx="50" cy="48" r="42" fill="#7b4a2c"/>
      <path d="M26 34 74 34M20 50 80 50M26 66 74 66" stroke="#5c3520" stroke-width="6" stroke-linecap="round"/>
      <ellipse cx="36" cy="24" rx="12" ry="5" fill="#9a6440"/>`,
  },
  cheese: {
    name: 'チーズ',
    color: 'きいろの',
    h: 28,
    svg: `<path d="M4 4H196L190 12H176L166 26L156 12H98L86 24L74 12H30L22 22L14 12Z" fill="#ffc928" stroke="#f0a800" stroke-width="2" stroke-linejoin="round"/>`,
    icon: `<path d="M12 18 88 12 92 84 16 90Z" fill="#ffc928" stroke="#f0a800" stroke-width="4" stroke-linejoin="round"/>
      <circle cx="36" cy="38" r="8" fill="#f0a800"/><circle cx="66" cy="62" r="10" fill="#f0a800"/><circle cx="34" cy="70" r="5" fill="#f0a800"/><circle cx="68" cy="30" r="5" fill="#f0a800"/>`,
  },
  lettuce: {
    name: 'レタス',
    color: 'みどりの',
    h: 28,
    svg: `<path d="M6 10Q16 0 28 10T52 10T76 10T100 10T124 10T148 10T172 10T196 12Q190 26 172 20T148 22T124 20T100 22T76 20T52 22T28 20T6 18Z" fill="#6cc644" stroke="#3f9a2a" stroke-width="2"/>`,
    icon: `<path d="M50 92C26 92 8 74 10 52 6 36 18 22 30 22 34 10 50 6 60 14 74 10 88 22 86 36 96 48 92 72 76 82 68 90 58 92 50 92Z" fill="#6cc644" stroke="#3f9a2a" stroke-width="4" stroke-linejoin="round"/>
      <path d="M50 88 50 30M50 56 30 40M50 66 72 46" stroke="#a8e07f" stroke-width="5" stroke-linecap="round" fill="none"/>`,
  },
  tomato: {
    name: 'トマト',
    color: 'あかい',
    h: 26,
    svg: `<rect x="10" y="4" width="86" height="18" rx="9" fill="#e8402f"/>
      <rect x="104" y="4" width="86" height="18" rx="9" fill="#e8402f"/>
      <ellipse cx="53" cy="13" rx="28" ry="5" fill="#ff8a70"/>
      <ellipse cx="147" cy="13" rx="28" ry="5" fill="#ff8a70"/>`,
    icon: `<circle cx="50" cy="50" r="42" fill="#e8402f"/><circle cx="50" cy="50" r="33" fill="#ff7a62"/>
      <path d="M50 50 50 17M50 50 79 66M50 50 21 66" stroke="#e8402f" stroke-width="6"/>
      <g fill="#ffe3a0"><circle cx="38" cy="36" r="4"/><circle cx="62" cy="36" r="4"/><circle cx="50" cy="72" r="4"/></g>`,
  },
};

export const BUN_BOTTOM = {
  h: 46,
  svg: `<path d="M8 6H192Q198 6 196 16Q190 42 156 42H44Q10 42 4 16Q2 6 8 6Z" fill="#eaa24a"/>
    <rect x="8" y="4" width="184" height="8" rx="4" fill="#f7d39a"/>`,
};

export const BUN_TOP = {
  h: 74,
  svg: `<path d="M6 66Q4 6 100 6Q196 6 194 66Q194 72 186 72H14Q6 72 6 66Z" fill="#f0a845"/>
    <path d="M30 34Q50 16 84 14" stroke="#f9cf8a" stroke-width="8" stroke-linecap="round" fill="none"/>
    <g fill="#fff6dc"><ellipse cx="70" cy="30" rx="5" ry="3" transform="rotate(-20 70 30)"/>
    <ellipse cx="106" cy="22" rx="5" ry="3"/><ellipse cx="140" cy="32" rx="5" ry="3" transform="rotate(20 140 32)"/>
    <ellipse cx="94" cy="46" rx="5" ry="3" transform="rotate(10 94 46)"/><ellipse cx="128" cy="52" rx="5" ry="3"/>
    <ellipse cx="56" cy="52" rx="5" ry="3" transform="rotate(-10 56 52)"/><ellipse cx="160" cy="50" rx="5" ry="3" transform="rotate(25 160 50)"/></g>`,
};

/** 具のアイコン */
export function iconSvg(t: Topping): string {
  return `<svg viewBox="0 0 100 100">${TOPPINGS[t].icon}</svg>`;
}

/** 具やパンを1枚の SVG にする */
export function layerSvg(part: { h: number; svg: string }, cls = ''): string {
  return `<svg class="${cls}" viewBox="0 0 200 ${part.h}" style="aspect-ratio:200/${part.h}">${part.svg}</svg>`;
}

export interface DrinkInfo {
  /** 「オレンジいろの ジュース」 */
  color: string;
  fill: string;
}

export const DRINKS: Record<Drink, DrinkInfo> = {
  orange: { color: 'オレンジいろ', fill: '#ff9a1f' },
  pink: { color: 'ピンク', fill: '#ff86b8' },
  green: { color: 'みどり', fill: '#4cc95a' },
  purple: { color: 'むらさき', fill: '#9b5bd6' },
};

/** ジュースのコップ */
export function drinkSvg(d: Drink): string {
  const fill = DRINKS[d].fill;
  return `<svg class="cup" viewBox="0 0 100 130">
    <path d="M58 30 70 2" stroke="#ff5a5a" stroke-width="7" stroke-linecap="round"/>
    <path d="M14 24H86L78 122Q77 128 70 128H30Q23 128 22 122Z" fill="#ffffff" stroke="#c9d6e2" stroke-width="4" stroke-linejoin="round"/>
    <path d="M19 44H81L75 118Q74 122 69 122H31Q26 122 25 118Z" fill="${fill}"/>
    <path d="M30 52 34 110" stroke="#fff" stroke-opacity=".5" stroke-width="6" stroke-linecap="round"/>
  </svg>`;
}

/** 数の読み方（読み上げで「1まい」が「いちまい」になるように、ひらがなで書く） */
export const MAI = ['', 'いちまい', 'にまい', 'さんまい', 'よんまい', 'ごまい', 'ろくまい', 'ななまい', 'はちまい'];

/** お客さん（動物の絵文字） */
export const CUSTOMERS = ['🐻', '🐰', '🐱', '🐶', '🐼', '🦊', '🐸', '🐷', '🐨', '🐵', '🐯', '🐮'];
