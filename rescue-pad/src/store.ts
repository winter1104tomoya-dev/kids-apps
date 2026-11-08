// 設定ともらったバッジを端末内（localStorage）に保存する

export interface Settings {
  /** 0: 音なし 1: 小さめ 2: ふつう */
  volume: 0 | 1 | 2;
  /** ミッションで並べる隊員の数 */
  choices: 2 | 3 | 4;
}

const KEY_SETTINGS = 'rescue.settings';
const KEY_BADGES = 'rescue.badges';

function load<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    const v = JSON.parse(raw);
    return Array.isArray(fallback) ? v : { ...fallback, ...v };
  } catch {
    return fallback;
  }
}

function save(key: string, v: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(v));
  } catch {
    // 保存できなくても遊べるようにする
  }
}

export const settings: Settings = load<Settings>(KEY_SETTINGS, { volume: 2, choices: 3 });
export const saveSettings = () => save(KEY_SETTINGS, settings);

/** もらったバッジ（ミッションの id） */
export const badges: string[] = load<string[]>(KEY_BADGES, []);
export function addBadge(id: string): boolean {
  if (badges.includes(id)) return false;
  badges.push(id);
  save(KEY_BADGES, badges);
  return true;
}
export function clearBadges(): void {
  badges.length = 0;
  save(KEY_BADGES, badges);
}
