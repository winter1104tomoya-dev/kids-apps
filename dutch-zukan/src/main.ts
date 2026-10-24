import './style.css';
import { CATEGORIES, type Shape, type Word } from './words';
import { dutchVoiceName, playCorrect, playFanfare, playWrong, recordedVoiceName, speakNl, unlockAudio } from './sound';
import { saveSettings, settings } from './store';

type ScreenId = 'home' | 'book' | 'quiz';
interface NavState {
  screen: ScreenId;
  cat?: number;
}

// リアル寄りの絵（Microsoft Fluent Emoji の 3D、MIT ライセンス）。ビルド時にファイルとして書き出される
const IMAGES = import.meta.glob<string>('./img/*.webp', { eager: true, query: '?url', import: 'default' });

/** 絵があれば <img>、なければ絵文字 */
function icon(item: { pic: string; img?: string }, cls = 'pic'): string {
  const src = item.img && IMAGES[`./img/${item.img}.webp`];
  return src ? `<img class="${cls} img" src="${src}" alt="" draggable="false">` : `<span class="${cls}">${item.pic}</span>`;
}

const $ = <T extends HTMLElement>(sel: string) => document.querySelector(sel) as T;

let nav: NavState = { screen: 'home' };

// ---- 画面の切り替え（Android の戻るボタンでも1つ前の画面に戻る） ----

function show(state: NavState, push = true): void {
  nav = state;
  if (push) history.pushState(state, '');
  for (const id of ['home', 'book', 'quiz'] as const) $(`#${id}`).hidden = id !== state.screen;
  stopQuiz();
  if (state.screen === 'book') renderBook(state.cat!);
  if (state.screen === 'quiz') startQuiz(state.cat!);
}

history.replaceState(nav, '');
window.addEventListener('popstate', (e) => show((e.state as NavState) ?? { screen: 'home' }, false));

document.querySelectorAll('.back').forEach((b) => b.addEventListener('click', () => history.back()));

// ---- ホーム ----

CATEGORIES.forEach((c, i) => {
  const b = document.createElement('button');
  b.className = 'cat';
  b.style.setProperty('--c', c.color);
  b.innerHTML = `${icon(c)}<span class="name">${c.ja}</span>`;
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

// かたちカテゴリの図形（100×100 の枠に描く）
const SHAPES: Record<Shape, string> = {
  circle: '<circle cx="50" cy="50" r="42"/>',
  square: '<rect x="12" y="12" width="76" height="76" rx="6"/>',
  triangle: '<path d="M50 10 92 86H8z" stroke-linejoin="round"/>',
  heart: '<path d="M50 88C20 66 6 50 6 32 6 18 17 8 30 8c9 0 16 5 20 12 4-7 11-12 20-12 13 0 24 10 24 24 0 18-14 34-44 56z"/>',
  star: '<path d="M50 6l12.9 27.6 30.2 3.6-22.3 20.7 5.9 29.9L50 72.9 23.3 87.8l5.9-29.9L6.9 37.2l30.2-3.6z"/>',
  rectangle: '<rect x="4" y="26" width="92" height="48" rx="6"/>',
  diamond: '<path d="M50 4 86 50 50 96 14 50z"/>',
};

function picHtml(w: Word): string {
  if (w.shape) {
    return `<svg class="shape" viewBox="0 0 100 100" fill="${w.color}">${SHAPES[w.shape]}</svg>`;
  }
  if (w.num) {
    // 数字の下に同じ数の丸を並べて、量も一緒に見せる
    const dots = '<i></i>'.repeat(w.num);
    return `<span class="num"><b>${w.num}</b><span class="dots">${dots}</span></span>`;
  }
  return w.color
    ? `<span class="swatch" style="--sw:${w.color}"></span>`
    : icon(w);
}

function renderBook(cat: number): void {
  const c = CATEGORIES[cat];
  $('#title').innerHTML = `${icon(c, 'head')} ${c.ja}`;
  $('#title').style.setProperty('--c', c.color);
  $('#quizBtn').style.setProperty('--c', c.color);
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

// ---- クイズ：オランダ語で読み上げた単語の絵をタッチする ----

/** 1回のクイズの問題数 */
const ROUNDS = 5;
const STAR = '<svg viewBox="0 0 24 24"><path d="M12 1.8l3.1 6.4 7 .9-5.1 4.9 1.3 7-6.3-3.4-6.3 3.4 1.3-7L1.9 9.1l7-.9z"/></svg>';

interface QuizState {
  cat: number;
  /** 正解した数 */
  score: number;
  target: Word;
  /** この問題でまちがえた回数 */
  misses: number;
  /** 正解したあと、次の問題までタッチを受け付けない */
  locked: boolean;
}

let quiz: QuizState | null = null;
let quizTimer = 0;
/** いま並んでいる絵と、その単語 */
let choiceCards: [HTMLElement, Word][] = [];

function shuffle<T>(list: T[]): T[] {
  const a = [...list];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function later(fn: () => void, ms: number): void {
  clearTimeout(quizTimer);
  quizTimer = window.setTimeout(fn, ms);
}

function stopQuiz(): void {
  clearTimeout(quizTimer);
  quiz = null;
}

function startQuiz(cat: number): void {
  $('#done').hidden = true;
  $('#quiz').style.setProperty('--c', CATEGORIES[cat].color);
  quiz = { cat, score: 0, target: CATEGORIES[cat].words[0], misses: 0, locked: true };
  renderStars();
  nextQuestion(null);
}

function renderStars(): void {
  const box = $('#stars');
  box.innerHTML = '';
  for (let i = 0; i < ROUNDS; i++) {
    const s = document.createElement('span');
    s.className = i < quiz!.score ? 'on' : '';
    if (i === quiz!.score - 1) s.classList.add('new');
    s.innerHTML = STAR;
    box.append(s);
  }
}

function nextQuestion(prev: Word | null): void {
  const q = quiz!;
  const words = CATEGORIES[q.cat].words;
  // 同じ問題が続かないようにする
  q.target = shuffle(words.filter((w) => w !== prev))[0];
  q.misses = 0;
  // 最初の読み上げが終わるまでは絵をタッチできない（聞く前に押してしまわないように）
  q.locked = true;
  const count = Math.min(settings.choices, words.length);
  const others = shuffle(words.filter((w) => w !== q.target)).slice(0, count - 1);
  const box = $('#choices');
  box.innerHTML = '';
  box.dataset.count = String(count);
  box.classList.add('listening');
  choiceCards = [];
  for (const w of shuffle([q.target, ...others])) {
    const card = document.createElement('button');
    card.className = 'card';
    card.setAttribute('aria-label', w.ja);
    card.innerHTML = picHtml(w);
    card.addEventListener('click', () => answer(card, w));
    box.append(card);
    choiceCards.push([card, w]);
  }
  later(() => ask(true), 500);
}

/** いちばん新しい読み上げの番号。聞き直しで前の読み上げが止まっても、そちらの合図では進めない */
let askId = 0;

/** 読み上げが終わった（または終わったことにする）ので、タッチを受け付ける */
function unlock(q: QuizState, id: number): void {
  if (quiz !== q || id !== askId) return;
  q.locked = false;
  $('#choices').classList.remove('listening');
}

/** 問題を読み上げる。スピーカーを押すともう一度 */
function ask(first = false): void {
  const q = quiz;
  if (!q) return;
  const listening = first || $('#choices').classList.contains('listening');
  const id = ++askId;
  speakNl(phrase(q.target), undefined, listening ? () => unlock(q, id) : undefined);
  // 読み終わりの合図が来ない端末でも先に進めるように、少し待ったら受け付ける
  if (listening) window.setTimeout(() => unlock(q, id), 5000);
  const sp = $('#speaker');
  sp.classList.remove('talk');
  void sp.offsetWidth;
  sp.classList.add('talk');
}

function answer(card: HTMLElement, w: Word): void {
  const q = quiz;
  if (!q || q.locked) return;
  if (w === q.target) {
    q.locked = true;
    card.classList.add('right');
    playCorrect();
    speakNl('Goed zo!');
    q.score++;
    renderStars();
    later(q.score >= ROUNDS ? finishQuiz : () => nextQuestion(w), 1800);
    return;
  }
  // まちがい：その絵をうすくして、もう一度問題を読む。2回まちがえたら正解の絵を光らせる
  q.misses++;
  card.classList.add('wrong');
  playWrong();
  if (q.misses >= 2) {
    for (const [c, cw] of choiceCards) if (cw === q.target) c.classList.add('hint');
  }
  later(() => ask(), 700);
}

function finishQuiz(): void {
  $('.big-stars').innerHTML = STAR.repeat(ROUNDS);
  $('#done').hidden = false;
  playFanfare();
  later(() => speakNl('Super!'), 600);
}

$('#quizBtn').addEventListener('click', () => show({ screen: 'quiz', cat: nav.cat }));
$('#speaker').addEventListener('click', () => ask());
$('#again').addEventListener('click', () => startQuiz(nav.cat!));
$('#toBook').addEventListener('click', () => history.back());

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

type SegKey = 'volume' | 'rate' | 'article' | 'japanese' | 'choices';

function syncSeg(): void {
  document.querySelectorAll<HTMLElement>('.seg').forEach((seg) => {
    const key = seg.dataset.key as SegKey;
    seg.querySelectorAll<HTMLButtonElement>('button').forEach((b) => {
      b.classList.toggle('on', String(settings[key]) === b.dataset.v);
    });
  });
}

function syncVoice(): void {
  const recorded = recordedVoiceName();
  if (recorded !== null) {
    $('#voice').textContent = `用意した音声ファイルで読みます（${recorded || 'Google の読み上げ'}）。ネットがなくても同じ声です。`;
    return;
  }
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
      case 'choices':
        settings.choices = Number(v) as 2 | 3 | 4;
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
