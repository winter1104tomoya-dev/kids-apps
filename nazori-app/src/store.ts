// 設定とシールを端末内（localStorage）に保存する

export type Level = 'easy' | 'normal' | 'hard';

export interface Settings {
  /** 0: 音なし 1: 小さめ 2: ふつう */
  volume: 0 | 1 | 2;
  level: Level;
  /** アルファベットに小文字も並べる */
  lowercase: boolean;
}

/** 判定のゆるさ。tol は始点・ずれの許容（マス単位）、pass は合格に必要な進み具合 */
export const LEVELS: Record<Level, { label: string; tol: number; pass: number }> = {
  easy: { label: 'やさしい', tol: 20, pass: 0.7 },
  normal: { label: 'ふつう', tol: 15, pass: 0.8 },
  hard: { label: 'しっかり', tol: 10, pass: 0.9 },
};

const KEY_SETTINGS = 'nazori.settings';
const KEY_STICKERS = 'nazori.stickers';

function load<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? { ...fallback, ...JSON.parse(raw) } : fallback;
  } catch {
    return fallback;
  }
}

function save(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // 保存できなくても遊べるようにする
  }
}

export const settings: Settings = load<Settings>(KEY_SETTINGS, { volume: 2, level: 'easy', lowercase: false });
export function saveSettings(): void {
  save(KEY_SETTINGS, settings);
}

/** 文字ごとの、なぞり終えた回数 */
const stickers: Record<string, number> = load<Record<string, number>>(KEY_STICKERS, {});
export function stickerCount(char: string): number {
  return stickers[char] ?? 0;
}
export function addSticker(char: string): void {
  stickers[char] = stickerCount(char) + 1;
  save(KEY_STICKERS, stickers);
}
export function resetStickers(): void {
  for (const k of Object.keys(stickers)) delete stickers[k];
  save(KEY_STICKERS, stickers);
}
