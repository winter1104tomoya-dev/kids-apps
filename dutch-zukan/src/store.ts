// 設定を端末内（localStorage）に保存する

export interface Settings {
  /** 0: 音なし 1: 小さめ 2: ふつう */
  volume: 0 | 1 | 2;
  /** 読み上げの速さ */
  rate: 'slow' | 'normal';
  /** 「de aardbei」のように冠詞もつけて読む */
  article: boolean;
  /** オランダ語のあとに日本語も読む */
  japanese: boolean;
}

const KEY_SETTINGS = 'zukan.settings';

function load<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? { ...fallback, ...JSON.parse(raw) } : fallback;
  } catch {
    return fallback;
  }
}

export const settings: Settings = load<Settings>(KEY_SETTINGS, {
  volume: 2,
  rate: 'slow',
  article: false,
  japanese: false,
});

export function saveSettings(): void {
  try {
    localStorage.setItem(KEY_SETTINGS, JSON.stringify(settings));
  } catch {
    // 保存できなくても遊べるようにする
  }
}
