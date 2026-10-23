import './style.css';
import { CATEGORIES, type Word } from './words';
import { dutchVoiceName, speakNl, unlockAudio } from './sound';
import { saveSettings, settings } from './store';

type ScreenId = 'home' | 'book';
interface NavState {
  screen: ScreenId;
  cat?: number;
}

const $ = <T extends HTMLElement>(sel: string) => document.querySelector(sel) as T;

let nav: NavState = { screen: 'home' };

// ---- 画面の切り替え（Android の戻るボタンでも1つ前の画面に戻る） ----

function show(state: NavState, push = true): void {
  nav = state;
  if (push) history.pushState(state, '');
  for (const id of ['home', 'book'] as const) $(`#${id}`).hidden = id !== state.screen;
  if (state.screen === 'book') renderBook(state.cat!);
}

history.replaceState(nav, '');
window.addEventListener('popstate', (e) => show((e.state as NavState) ?? { screen: 'home' }, false));

document.querySelectorAll('.back').forEach((b) => b.addEventListener('click', () => history.back()));

// ---- ホーム ----

CATEGORIES.forEach((c, i) => {
  const b = document.createElement('button');
  b.className = 'cat';
  b.style.setProperty('--c', c.color);
  b.innerHTML = `<span class="pic">${c.pic}</span><span class="name">${c.ja}</span>`;
  b.addEventListener('click', () => {
    speakNl(c.nl, c.ja);
    show({ screen: 'book', cat: i });
  });
  $('#cats').append(b);
});

// ---- 図鑑 ----

/** 読み上げる文。冠詞をつける設定なら「de aardbei」 */
function phrase(w: Word): string {
  return settings.article && w.art ? `${w.art} ${w.nl}` : w.nl;
}

function picHtml(w: Word): string {
  if (w.num) {
    // 数字の下に同じ数の丸を並べて、量も一緒に見せる
    const dots = '<i></i>'.repeat(w.num);
    return `<span class="num"><b>${w.num}</b><span class="dots">${dots}</span></span>`;
  }
  return w.color
    ? `<span class="swatch" style="--sw:${w.color}"></span>`
    : `<span class="pic">${w.pic}</span>`;
}

function renderBook(cat: number): void {
  const c = CATEGORIES[cat];
  $('#title').innerHTML = `<span>${c.pic}</span> ${c.ja}`;
  $('#title').style.setProperty('--c', c.color);
  $('#banner').hidden = true;
  const box = $('#cards');
  box.innerHTML = '';
  box.scrollTop = 0;
  c.words.forEach((w) => {
    const card = document.createElement('button');
    card.className = 'card';
    card.style.setProperty('--c', c.color);
    card.setAttribute('aria-label', w.ja);
    card.innerHTML = picHtml(w);
    card.addEventListener('click', () => say(card, w));
    box.append(card);
  });
}

let bannerTimer = 0;
let current: Word | null = null;

function say(card: HTMLElement, w: Word): void {
  speakNl(phrase(w), w.ja);
  // 絵をぴょんと跳ねさせる（連打しても毎回動くようにアニメを付け直す）
  card.classList.remove('boing');
  void card.offsetWidth;
  card.classList.add('boing');
  // 下に大きく単語を出す。タッチするともう一度読む
  current = w;
  const banner = $('#banner');
  banner.innerHTML = `${picHtml(w)}<span class="word">${phrase(w)}</span>`;
  banner.hidden = false;
  banner.classList.remove('in');
  void banner.offsetWidth;
  banner.classList.add('in');
  clearTimeout(bannerTimer);
  bannerTimer = window.setTimeout(() => (banner.hidden = true), 4000);
}

$('#banner').addEventListener('click', () => {
  if (!current) return;
  speakNl(phrase(current), current.ja);
  clearTimeout(bannerTimer);
  bannerTimer = window.setTimeout(() => ($('#banner').hidden = true), 4000);
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

type SegKey = 'volume' | 'rate' | 'article' | 'japanese';

function syncSeg(): void {
  document.querySelectorAll<HTMLElement>('.seg').forEach((seg) => {
    const key = seg.dataset.key as SegKey;
    seg.querySelectorAll<HTMLButtonElement>('button').forEach((b) => {
      b.classList.toggle('on', String(settings[key]) === b.dataset.v);
    });
  });
}

function syncVoice(): void {
  const name = dutchVoiceName();
  $('#voice').textContent = name
    ? `オランダ語の声が使えます（${name}）。`
    : 'オランダ語の声が見つかりません。「ためす」で英語っぽい発音になる場合は、README の「オランダ語の声を入れる」を見てください。';
}

function openParent(): void {
  syncSeg();
  syncVoice();
  $('#parent').hidden = false;
}

document.querySelectorAll<HTMLElement>('.seg').forEach((seg) =>
  seg.addEventListener('click', (e) => {
    const b = (e.target as HTMLElement).closest('button');
    if (!b) return;
    const v = b.dataset.v!;
    switch (seg.dataset.key as SegKey) {
      case 'volume':
        settings.volume = Number(v) as 0 | 1 | 2;
        break;
      case 'rate':
        settings.rate = v as typeof settings.rate;
        break;
      case 'article':
        settings.article = v === 'true';
        break;
      case 'japanese':
        settings.japanese = v === 'true';
        break;
    }
    saveSettings();
    syncSeg();
  }),
);

$('#test').addEventListener('click', () => {
  speakNl(settings.article ? 'de aardbei' : 'aardbei', 'いちご');
  syncVoice();
});
$('#close').addEventListener('click', () => ($('#parent').hidden = true));

// 声の一覧はあとから届くので、届いたら表示を更新する
if ('speechSynthesis' in window) speechSynthesis.addEventListener('voiceschanged', syncVoice);

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

// 公開版では service worker を登録して、オフラインでも開けるようにする
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => navigator.serviceWorker.register('./sw.js').catch(() => {}));
}
