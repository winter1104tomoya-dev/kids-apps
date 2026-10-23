import './style.css';
import {
  BUN_BOTTOM,
  BUN_TOP,
  CUSTOMERS,
  DRINKS,
  MAI,
  TOPPINGS,
  drinkSvg,
  iconSvg,
  layerSvg,
  type Drink,
  type Topping,
} from './parts';
import { playBoing, playCoin, playFanfare, playPop, playWhoosh, speak, unlockAudio } from './sound';
import { LEVELS, addCoin, coins, resetCoins, saveSettings, settings, type Level } from './store';

type ScreenId = 'home' | 'shop';
interface NavState {
  screen: ScreenId;
}

interface Order {
  /** 具ごとの枚数（並び順は問わない） */
  items: Partial<Record<Topping, number>>;
  drink?: Drink;
  /** お客さんの絵文字と声の高さ */
  who: string;
  pitch: number;
}

const $ = <T extends HTMLElement>(sel: string) => document.querySelector(sel) as T;
const KINDS = Object.keys(TOPPINGS) as Topping[];
const DRINK_KINDS = Object.keys(DRINKS) as Drink[];
/** パンのあいだにのせられる具の数 */
const MAX_STACK = 8;

const pick = <T>(list: readonly T[]): T => list[Math.floor(Math.random() * list.length)];
const shuffle = <T>(list: readonly T[]): T[] => [...list].sort(() => Math.random() - 0.5);

let order: Order | null = null;
let stack: Topping[] = [];
let phase: 'burger' | 'drink' | 'done' = 'burger';
/** 画面を離れたら、待っている次の動き（タイマー）を無効にするための番号 */
let turn = 0;

// ---- 画面の切り替え（Android の戻るボタンでも1つ前の画面に戻る） ----

function show(state: NavState, push = true): void {
  if (push) history.pushState(state, '');
  for (const id of ['home', 'shop'] as const) $(`#${id}`).hidden = id !== state.screen;
  turn++;
  if (state.screen === 'shop') {
    renderCoins();
    if (!order || phase === 'done') nextCustomer();
    else {
      render();
      sayOrder();
    }
  } else {
    if ('speechSynthesis' in window) speechSynthesis.cancel();
  }
}

history.replaceState({ screen: 'home' }, '');
window.addEventListener('popstate', (e) => show((e.state as NavState) ?? { screen: 'home' }, false));
document.querySelectorAll('.back').forEach((b) => b.addEventListener('click', () => history.back()));

/** turn が変わっていなければ、ms 後に fn を動かす */
function later(ms: number, fn: () => void): void {
  const t = turn;
  window.setTimeout(() => t === turn && fn(), ms);
}

/** 連打しても毎回動くように、アニメーションのクラスを付け直す */
function replay(el: Element, cls: string): void {
  el.classList.remove(cls);
  void (el as HTMLElement).offsetWidth;
  el.classList.add(cls);
}

// ---- ホーム ----

$('#logo').innerHTML =
  `<div class="mini-stack">${[BUN_TOP, TOPPINGS.lettuce, TOPPINGS.cheese, TOPPINGS.patty, BUN_BOTTOM]
    .map((p) => layerSvg(p))
    .join('')}</div>`;
$('#open').addEventListener('click', () => show({ screen: 'shop' }));

// ---- 注文 ----

function makeOrder(): Order {
  const lv = LEVELS[settings.level];
  const [lo, hi] = lv.kinds;
  const n = lo + Math.floor(Math.random() * (hi - lo + 1));
  const items: Partial<Record<Topping, number>> = {};
  let left = lv.total;
  shuffle(KINDS)
    .slice(0, n)
    .forEach((k, i) => {
      // 残りの具に最低1まいずつ残しておく
      const room = Math.min(lv.max, left - (n - 1 - i));
      const c = 1 + Math.floor(Math.random() * room);
      items[k] = c;
      left -= c;
    });
  const prev = order?.who;
  return {
    items,
    drink: settings.drink && Math.random() < 0.5 ? pick(DRINK_KINDS) : undefined,
    who: pick(CUSTOMERS.filter((c) => c !== prev)),
    pitch: 1 + Math.random() * 0.6,
  };
}

function orderText(o: Order): string {
  const parts = (Object.keys(o.items) as Topping[]).map((k) => `${TOPPINGS[k].name} ${MAI[o.items[k]!]}`);
  let text = `ハンバーガー ください。${parts.join('と、')}。`;
  if (o.drink) text += `それと、${DRINKS[o.drink].color}の ジュースも！`;
  return text;
}

function sayOrder(): void {
  if (order) speak(orderText(order), order.pitch);
}

function nextCustomer(): void {
  order = makeOrder();
  stack = [];
  phase = 'burger';
  const c = $('#customer');
  c.textContent = order.who;
  c.className = 'customer';
  replay(c, 'arrive');
  $('#glass').innerHTML = '';
  render();
  replay($('#order'), 'pop');
  later(500, sayOrder);
}

$('#customer').addEventListener('click', () => {
  replay($('#customer'), 'hop');
  sayOrder();
});
$('#order').addEventListener('click', sayOrder);

// ---- 表示 ----

const count = (k: Topping) => stack.filter((s) => s === k).length;

function matches(): boolean {
  return !!order && KINDS.every((k) => count(k) === (order!.items[k] ?? 0));
}

/** 吹き出し：注文の具を枚数ぶん並べ、のせたぶんだけ「まる」をつける */
function renderOrder(): void {
  if (!order) return;
  const rows = (Object.keys(order.items) as Topping[]).map((k) => {
    const have = count(k);
    const icons = Array.from({ length: order!.items[k]! }, (_, i) =>
      `<span class="slot${i < have ? ' ok' : ''}">${iconSvg(k)}</span>`,
    ).join('');
    return `<div class="line" data-k="${k}">${icons}</div>`;
  });
  if (order.drink) {
    rows.push(`<div class="line"><span class="slot cupslot${phase === 'done' ? ' ok' : ''}">${drinkSvg(order.drink)}</span></div>`);
  }
  $('#order').innerHTML = rows.join('');
}

/** お皿の上のハンバーガー。具が多いときは小さくして画面におさめる */
function renderStack(dropLast = false): void {
  const box = $('#stack');
  const closed = phase !== 'burger';
  let html = `<div class="layer base">${layerSvg(BUN_BOTTOM)}</div>`;
  stack.forEach((k, i) => {
    html += `<button class="layer" data-i="${i}" aria-label="${TOPPINGS[k].name}">${layerSvg(TOPPINGS[k])}</button>`;
  });
  if (closed) html += `<div class="layer top">${layerSvg(BUN_TOP)}</div>`;
  box.innerHTML = html;

  const heights = [BUN_BOTTOM.h, ...stack.map((k) => TOPPINGS[k].h), closed ? BUN_TOP.h : 74];
  const ratio = heights.reduce((a, b) => a + b, 0) / 200;
  const room = $('#kitchen').clientHeight - 24;
  const base = Math.min(window.innerWidth * 0.78, 400);
  box.style.width = `${Math.max(90, Math.min(base, room / ratio))}px`;

  if (dropLast) {
    const layers = box.querySelectorAll('.layer');
    layers[layers.length - 1].classList.add('drop');
  }
}

function render(dropLast = false): void {
  renderOrder();
  renderStack(dropLast);
  const burger = phase === 'burger';
  $('#tray').hidden = !burger;
  $('#drinks').hidden = phase !== 'drink';
  $('#done').classList.toggle('ready', burger && matches());
}

function renderCoins(): void {
  $('#coins b').textContent = String(coins());
}

// ---- 具をのせる ----

KINDS.forEach((k) => {
  const b = document.createElement('button');
  b.className = 'topping';
  b.dataset.k = k;
  b.setAttribute('aria-label', TOPPINGS[k].name);
  b.innerHTML = iconSvg(k);
  b.addEventListener('click', () => addTopping(k, b));
  $('#toppings').append(b);
});

function addTopping(k: Topping, btn: HTMLElement): void {
  if (phase !== 'burger' || !order) return;
  replay(btn, 'press');
  if (stack.length >= MAX_STACK) {
    playBoing();
    speak('もう のらないよ');
    return;
  }
  stack.push(k);
  playPop(stack.length);
  render(true);
  const n = count(k);
  const t = TOPPINGS[k];
  let text = n === 1 ? `${t.color} ${t.name}、${MAI[1]}` : `${t.name}、${MAI[n]}`;
  if (matches()) text += '。ぴったり！ うえの パンを のせてね';
  speak(text);
}

// のせた具をさわると、とれる（多すぎたときに直せるように）
$('#stack').addEventListener('click', (e) => {
  const el = (e.target as HTMLElement).closest<HTMLElement>('button.layer');
  if (!el || phase !== 'burger') return;
  stack.splice(Number(el.dataset.i), 1);
  playWhoosh();
  render();
  if (matches()) speak('ぴったり！ うえの パンを のせてね');
});

// ---- できた（うえのパンをのせる） ----

$('#done').innerHTML = layerSvg(BUN_TOP);
$('#done').addEventListener('click', () => {
  if (phase !== 'burger' || !order) return;
  replay($('#done'), 'press');
  if (stack.length === 0) {
    playBoing();
    sayOrder();
    return;
  }
  for (const k of KINDS) {
    const want = order.items[k] ?? 0;
    const have = count(k);
    if (have === want) continue;
    // 責めずに、何をすればいいかだけ伝える
    playBoing();
    const name = TOPPINGS[k].name;
    if (have < want) {
      speak(`${name}が あと ${MAI[want - have]} ほしいな`, order.pitch);
      const btn = document.querySelector(`.topping[data-k="${k}"]`);
      if (btn) replay(btn, 'wiggle');
      const line = document.querySelector(`#order .line[data-k="${k}"]`);
      if (line) replay(line, 'wiggle');
    } else {
      speak(want === 0 ? `${name}は いらないよ。さわって とってね` : `${name}は ${MAI[want]} で いいよ。さわって とってね`, order.pitch);
      // 多い具だけをゆらして、どれをとればいいか見せる
      let extra = have - want;
      [...document.querySelectorAll<HTMLElement>('#stack button.layer')].reverse().forEach((el) => {
        if (extra > 0 && stack[Number(el.dataset.i)] === k) {
          replay(el, 'wiggle');
          extra--;
        }
      });
    }
    return;
  }
  closeBurger();
});

function closeBurger(): void {
  if (!order) return;
  playFanfare();
  if (order.drink) {
    phase = 'drink';
    render(true);
    later(900, () => speak(`おいしそう！ それと、${DRINKS[order!.drink!].color}の ジュースも ください`, order!.pitch));
  } else {
    phase = 'done';
    render(true);
    later(700, thanks);
  }
}

// ---- ジュース ----

shuffle(DRINK_KINDS).forEach((d) => {
  const b = document.createElement('button');
  b.className = 'drink';
  b.setAttribute('aria-label', `${DRINKS[d].color}の ジュース`);
  b.innerHTML = drinkSvg(d);
  b.addEventListener('click', () => giveDrink(d, b));
  $('#drinks').append(b);
});

function giveDrink(d: Drink, btn: HTMLElement): void {
  if (phase !== 'drink' || !order?.drink) return;
  const want = order.drink;
  if (d !== want) {
    playBoing();
    replay(btn, 'wiggle');
    speak(`${DRINKS[d].color}の ジュースだね。うーん、${DRINKS[want].color}の ジュースが いいな`, order.pitch);
    return;
  }
  playPop(4);
  phase = 'done';
  $('#glass').innerHTML = drinkSvg(d);
  replay($('#glass'), 'drop');
  render();
  speak(`${DRINKS[d].color}の ジュース！`);
  later(1200, thanks);
}

// ---- ありがとう → コイン → 次のお客さん ----

function thanks(): void {
  if (!order) return;
  const c = $('#customer');
  c.classList.add('happy');
  speak(pick(['わーい！ ありがとう！', 'おいしそう！ ありがとう！', 'やったー！ いただきます！']), order.pitch);
  hearts();
  later(1300, () => {
    addCoin();
    playCoin();
    renderCoins();
    replay($('#coins'), 'pop');
    const coin = document.createElement('span');
    coin.className = 'coin flying';
    $('#shop').append(coin);
    window.setTimeout(() => coin.remove(), 900);
  });
  later(3200, () => {
    c.classList.remove('happy');
    replay(c, 'leave');
    $('#order').classList.add('away');
    $('#stack').classList.add('away');
    $('#glass').classList.add('away');
  });
  later(3900, () => {
    $('#order').classList.remove('away');
    $('#stack').classList.remove('away');
    $('#glass').classList.remove('away');
    nextCustomer();
  });
}

function hearts(): void {
  const box = $('#customer').getBoundingClientRect();
  for (let i = 0; i < 7; i++) {
    const h = document.createElement('span');
    h.className = 'heart';
    h.textContent = pick(['💖', '⭐', '💕', '✨']);
    h.style.left = `${box.left + box.width / 2 + (Math.random() - 0.5) * 120}px`;
    h.style.top = `${box.top + box.height / 2}px`;
    h.style.animationDelay = `${i * 0.08}s`;
    document.body.append(h);
    window.setTimeout(() => h.remove(), 1800);
  }
}

// ---- 保護者メニュー（ホーム右上の歯車を3秒長押し） ----

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

type SegKey = 'volume' | 'level' | 'drink';

function syncParent(): void {
  document.querySelectorAll<HTMLElement>('.seg').forEach((seg) => {
    const key = seg.dataset.key as SegKey;
    seg.querySelectorAll<HTMLButtonElement>('button').forEach((b) => {
      b.classList.toggle('on', String(settings[key]) === b.dataset.v);
    });
  });
  $('#coinTotal').textContent = String(coins());
}

function openParent(): void {
  syncParent();
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
      case 'level':
        settings.level = v as Level;
        // 次のお客さんから新しいむずかしさにする
        if (phase === 'burger' && stack.length === 0) order = null;
        break;
      case 'drink':
        settings.drink = v === 'true';
        if (phase === 'burger' && stack.length === 0) order = null;
        break;
    }
    saveSettings();
    syncParent();
  }),
);

$('#reset').addEventListener('click', () => {
  resetCoins();
  syncParent();
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

// 画面の大きさが変わったら、ハンバーガーの大きさを合わせ直す
window.addEventListener('resize', () => !$('#shop').hidden && renderStack());

// 長押しメニューやダブルタップ拡大を出さない
document.addEventListener('contextmenu', (e) => e.preventDefault());
document.addEventListener('dblclick', (e) => e.preventDefault());

// 公開版では service worker を登録して、オフラインでも開けるようにする
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => navigator.serviceWorker.register('./sw.js').catch(() => {}));
}
