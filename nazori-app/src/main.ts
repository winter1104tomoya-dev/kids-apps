import './style.css';
import { charList, tileLayout, type CharData, type SetId } from './chars';
import { speak, unlockAudio } from './sound';
import { addSticker, resetStickers, saveSettings, settings, stickerCount } from './store';
import { Tracer } from './trace';

type ScreenId = 'home' | 'select' | 'trace';
interface NavState {
  screen: ScreenId;
  set?: SetId;
  index?: number;
}

const $ = <T extends HTMLElement>(sel: string) => document.querySelector(sel) as T;

const STICKER_SVG =
  '<svg class="sticker" viewBox="0 0 24 24"><path d="M12 1.8l3.1 6.4 7 .9-5.1 4.9 1.3 7-6.3-3.4-6.3 3.4 1.3-7L1.9 9.1l7-.9z" fill="#ffd54f" stroke="#f9a825" stroke-width="1.2" stroke-linejoin="round"/></svg>';

const tracer = new Tracer($<HTMLCanvasElement>('#board'), () => {
  addSticker(currentChar().char);
  speak('よくできました');
  $('#finish').hidden = false;
});

let nav: NavState = { screen: 'home' };

const list = (set: SetId): CharData[] => charList(set, settings.lowercase);
const currentChar = (): CharData => list(nav.set!)[nav.index!];

// ---- 画面の切り替え（Android の戻るボタンでも1つ前の画面に戻る） ----

function show(state: NavState, push = true): void {
  nav = state;
  if (push) history.pushState(state, '');
  for (const id of ['home', 'select', 'trace'] as const) $(`#${id}`).hidden = id !== state.screen;
  if (state.screen !== 'trace') tracer.stop();
  if (state.screen === 'select') renderTiles(state.set!);
  if (state.screen === 'trace') startTrace(state.set!, state.index!);
}

history.replaceState(nav, '');
window.addEventListener('popstate', (e) => show((e.state as NavState) ?? { screen: 'home' }, false));

document.querySelectorAll('.back').forEach((b) => b.addEventListener('click', () => history.back()));

// ---- ホーム ----

document.querySelectorAll<HTMLButtonElement>('.big-set').forEach((b) =>
  b.addEventListener('click', () => {
    const set = b.dataset.set as SetId;
    speak({ hiragana: 'ひらがな', alphabet: 'エービーシー', numbers: 'すうじ' }[set]);
    show({ screen: 'select', set });
  }),
);

// ---- 文字えらび ----

function renderTiles(set: SetId): void {
  const box = $('#tiles');
  box.innerHTML = '';
  const { columns, cells } = tileLayout(set, settings.lowercase);
  box.style.setProperty('--cols', String(columns));
  box.dataset.set = set;
  box.scrollTop = 0;
  cells.forEach((c) => {
    if (!c) {
      box.append(document.createElement('span'));
      return;
    }
    const i = list(set).indexOf(c);
    const tile = document.createElement('button');
    tile.className = 'tile';
    tile.style.setProperty('--c', c.color);
    tile.textContent = c.char;
    if (stickerCount(c.char) > 0) tile.insertAdjacentHTML('beforeend', STICKER_SVG);
    tile.addEventListener('click', () => {
      speak(c.reading);
      show({ screen: 'trace', set, index: i });
    });
    box.append(tile);
  });
}

// ---- なぞり書き ----

function startTrace(set: SetId, index: number): void {
  $('#finish').hidden = true;
  tracer.start(list(set)[index]);
}

$('#again').addEventListener('click', () => {
  speak(currentChar().reading);
  startTrace(nav.set!, nav.index!);
});

$('#next').addEventListener('click', () => {
  const chars = list(nav.set!);
  const index = (nav.index! + 1) % chars.length;
  speak(chars[index].reading);
  // 「つぎのもじ」は履歴を積まず、戻ると文字えらびに帰れるようにする
  nav = { screen: 'trace', set: nav.set, index };
  history.replaceState(nav, '');
  startTrace(nav.set!, index);
});

// ---- 保護者メニュー（右上の歯車を3秒長押し） ----

const gear = $('#gear');
let holdTimer = 0;
const cancelHold = () => {
  clearTimeout(holdTimer);
  gear.classList.remove('holding');
};
gear.addEventListener('pointerdown', (e) => {
  e.preventDefault();
  gear.classList.add('holding');
  holdTimer = window.setTimeout(() => {
    cancelHold();
    openParent();
  }, 3000);
});
['pointerup', 'pointerleave', 'pointercancel'].forEach((ev) => gear.addEventListener(ev, cancelHold));

function syncSeg(): void {
  document.querySelectorAll<HTMLElement>('.seg').forEach((seg) => {
    const key = seg.dataset.key as 'volume' | 'level' | 'lowercase';
    seg.querySelectorAll<HTMLButtonElement>('button').forEach((b) => {
      b.classList.toggle('on', String(settings[key]) === b.dataset.v);
    });
  });
}

function openParent(): void {
  syncSeg();
  $('#parent').hidden = false;
}

document.querySelectorAll<HTMLElement>('.seg').forEach((seg) =>
  seg.addEventListener('click', (e) => {
    const b = (e.target as HTMLElement).closest('button');
    if (!b) return;
    if (seg.dataset.key === 'volume') settings.volume = Number(b.dataset.v) as 0 | 1 | 2;
    else if (seg.dataset.key === 'lowercase') settings.lowercase = b.dataset.v === 'true';
    else settings.level = b.dataset.v as typeof settings.level;
    saveSettings();
    syncSeg();
  }),
);

$('#reset').addEventListener('click', () => {
  if (confirm('シールをすべて消しますか？')) resetStickers();
});
$('#close').addEventListener('click', () => ($('#parent').hidden = true));

// ---- 全体 ----

// 最初のタップで音を有効にし、全画面・縦向き固定にする
document.addEventListener(
  'pointerdown',
  () => {
    unlockAudio();
    const el = document.documentElement;
    if (!document.fullscreenElement && el.requestFullscreen) {
      el.requestFullscreen({ navigationUI: 'hide' })
        .then(() => (screen.orientation as ScreenOrientation & { lock?: (o: string) => Promise<void> }).lock?.('portrait'))
        .catch(() => {});
    }
  },
  { once: true },
);

// 長押しメニューやダブルタップ拡大を出さない
document.addEventListener('contextmenu', (e) => e.preventDefault());
document.addEventListener('dblclick', (e) => e.preventDefault());

// 開発中だけ、自動テスト用に文字データを見えるようにする
if (import.meta.env.DEV) (window as unknown as { __list: typeof list }).__list = list;

// 公開版では service worker を登録して、オフラインでも開けるようにする
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => navigator.serviceWorker.register('./sw.js').catch(() => {}));
}
