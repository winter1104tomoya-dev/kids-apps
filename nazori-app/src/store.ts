// 設定とシールを端末内（localStorage）に保存する

export type Level = 'easy' | 'normal' | 'hard';

export interface Settings {
  /** 0: 音なし 1: 小さめ 2: ふつう */
  volume: 0 | 1 | 2;
  level: Level;
  /** アルファベットに小文字も並べる */
  lowercase: boolean;
  /** お手本の出し方。auto は文字ごとに段階が上がる。数字はその段階に固定 */
  guide: 'auto' | '1' | '2' | '3' | '4';
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

export const settings: Settings = load<Settings>(KEY_SETTINGS, { volume: 2, level: 'easy', lowercase: false, guide: 'auto' });
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
  for (const k of Object.keys(stages)) delete stages[k];
  save(KEY_STAGES, stages);
}

/**
 * お手本の段階。1: なぞる 2: てんせん 3: はじまりの点だけ 4: なにもなし
 * 文字ごとに、助けなしで書けたら1つ上がる。5 は「4 もできた」のしるし
 */
export type Stage = 1 | 2 | 3 | 4;
export const STAGE_NAMES = ['', 'なぞる', 'てんせん', 'てん', 'じぶんで'];
const KEY_STAGES = 'nazori.stages';
const stages: Record<string, number> = load<Record<string, number>>(KEY_STAGES, {});

/** できるようになった段階の数（0〜4） */
export function clearedStages(char: string): number {
  return (stages[char] ?? 1) - 1;
}
/** 今この文字を書く段階 */
export function stageFor(char: string): Stage {
  if (settings.guide !== 'auto') return Number(settings.guide) as Stage;
  return Math.min(4, stages[char] ?? 1) as Stage;
}
/** 助けなしで書けたとき呼ぶ。段階が上がったら true */
export function clearStage(char: string, stage: Stage): boolean {
  if (settings.guide !== 'auto') return false;
  const cur = stages[char] ?? 1;
  if (stage !== Math.min(4, cur) || cur >= 5) return false;
  stages[char] = cur + 1;
  save(KEY_STAGES, stages);
  return true;
}
