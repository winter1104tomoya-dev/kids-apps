// 設定とコインを端末内（localStorage）に保存する。キーは burger. で始めて、ほかのアプリの保存データにはさわらない

export type Level = 'easy' | 'normal' | 'hard';

export interface Settings {
  /** 0: 音なし 1: 小さめ 2: ふつう */
  volume: 0 | 1 | 2;
  level: Level;
  /** ジュースの注文もある */
  drink: boolean;
}

/** kinds: 注文に入る具の種類の数、max: 1つの具の最大枚数、total: 具の合計の上限 */
export const LEVELS: Record<Level, { kinds: [number, number]; max: number; total: number }> = {
  easy: { kinds: [1, 1], max: 2, total: 2 },
  normal: { kinds: [2, 2], max: 2, total: 3 },
  hard: { kinds: [2, 3], max: 3, total: 5 },
};

const KEY_SETTINGS = 'burger.settings';
const KEY_COINS = 'burger.coins';

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

export const settings: Settings = load<Settings>(KEY_SETTINGS, { volume: 2, level: 'easy', drink: true });
export function saveSettings(): void {
  save(KEY_SETTINGS, settings);
}

const wallet = load<{ coins: number }>(KEY_COINS, { coins: 0 });
export function coins(): number {
  return wallet.coins;
}
export function addCoin(): void {
  wallet.coins++;
  save(KEY_COINS, wallet);
}
export function resetCoins(): void {
  wallet.coins = 0;
  save(KEY_COINS, wallet);
}
