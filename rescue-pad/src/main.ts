import './style.css';
import { MEMBERS, MISSIONS, type Member, type Mission } from './data';
import {
  playAlarm,
  playBoot,
  playConnect,
  playFanfare,
  playRing,
  playSiren,
  playTap,
  playWrong,
  speak,
  stopSounds,
  stopSpeaking,
  unlockAudio,
} from './sound';
import { addBadge, badges, clearBadges, saveSettings, settings } from './store';

type ScreenId = 'off' | 'menu' | 'call' | 'mission' | 'clear' | 'badges';
interface NavState {
  screen: ScreenId;
  member?: string;
  mission?: string;
}

// 絵（Microsoft Fluent Emoji の 3D、MIT ライセンス）。ビルド時にファイルとして書き出される
const IMAGES = import.meta.glob<string>('./img/*.webp', { eager: true, query: '?url', import: 'default' });
const img = (name: string) => IMAGES[`./img/${name}.webp`] ?? '';

const $ = <T extends HTMLElement>(sel: string, root: ParentNode = document) => root.querySelector(sel) as T;
const memberOf = (id: string) => MEMBERS.find((m) => m.id === id)!;
const shuffle = <T>(a: T[]) => a.map((v) => [Math.random(), v] as const).sort((x, y) => x[0] - y[0]).map(([, v]) => v);

document.querySelectorAll<HTMLImageElement>('img[data-img]').forEach((el) => (el.src = img(el.dataset.img!)));

// ---- 画面の切り替え（Android の戻るボタンでも1つ前の画面に戻る） ----

let nav: NavState = { screen: 'off' };
/** 画面が変わったら、前の画面で予約した動きはすべて取り消す */
let gen = 0;
function later(fn: () => void, ms: number): void {
  const g = gen;
  setTimeout(() => g === gen && fn(), ms);
}
/** 前の画面の読み上げが終わってから動かないように、今の画面のときだけ呼ぶ */
function guard(fn: () => void): () => void {
  const g = gen;
  return () => g === gen && fn();
}

function show(state: NavState, how: 'push' | 'replace' | 'none' = 'push'): void {
  nav = state;
  if (how === 'push') history.pushState(state, '');
  if (how === 'replace') history.replaceState(state, '');
  gen++;
  stopSpeaking();
  stopSounds();
  $('#drive').hidden = true;
  for (const id of ['off', 'menu', 'call', 'mission', 'clear', 'badges'] as const) $(`#${id}`).hidden = id !== state.screen;
  $('.back').hidden = !['call', 'mission', 'badges'].includes(state.screen);
  if (state.screen === 'menu') renderMenu();
  if (state.screen === 'call') startCall(memberOf(state.member!));
  if (state.screen === 'mission') startMission(MISSIONS.find((m) => m.id === state.mission)!);
  if (state.screen === 'clear') renderClear(MISSIONS.find((m) => m.id === state.mission)!);
  if (state.screen === 'badges') renderBadges();
}

history.replaceState(nav, '');
window.addEventListener('popstate', (e) => {
  const s = (e.state as NavState) ?? { screen: 'off' };
  // 起動の音と声は、スイッチを押したときだけにする
  show(s.screen === 'off' ? { screen: 'off' } : s, 'none');
});
$('.back').addEventListener('click', () => {
  playTap();
  history.back();
});

// ---- 電源オン ----

$('#power').addEventListener('click', () => {
  unlockAudio();
  playBoot();
  document.body.classList.add('booting');
  later(() => {
    document.body.classList.remove('booting');
    show({ screen: 'menu' });
    speak('どうぶつレスキューたい、じゅんび オーケー！');
  }, 900);
});

// ---- メニュー ----

function avatar(m: Member, cls = ''): string {
  return `<div class="avatar ${cls}" style="--c:${m.color}"><img src="${img(m.img)}" alt="" draggable="false"></div>`;
}

MEMBERS.forEach((m) => {
  const b = document.createElement('button');
  b.className = 'member';
  b.style.setProperty('--c', m.color);
  b.innerHTML = `${avatar(m)}<img class="mini-car" src="${img(m.car)}" alt="" draggable="false"><span class="name">${m.name}</span>`;
  b.addEventListener('click', () => {
    playTap();
    show({ screen: 'call', member: m.id });
  });
  $('#members').append(b);
});

function renderMenu(): void {
  $('#badgeCount').textContent = `${badges.length}`;
}

$('#sos').addEventListener('click', () => show({ screen: 'mission', mission: pickMission() }));
$('#toBadges').addEventListener('click', () => {
  playTap();
  show({ screen: 'badges' });
});

// ---- 隊員を呼び出す ----

function startCall(m: Member): void {
  const call = $('#call');
  call.style.setProperty('--c', m.color);
  call.classList.remove('connected');
  $<HTMLImageElement>('img', call).src = img(m.img);
  $('.call-name', call).textContent = `${m.name}（${m.job}）`;
  $('.bubble', call).hidden = true;
  $('#go').hidden = true;
  playRing(2);
  later(() => {
    call.classList.add('connected');
    playConnect();
    const text = `はい、${m.name}です！ ${m.line}`;
    const bubble = $('.bubble', call);
    bubble.textContent = text;
    bubble.hidden = false;
    later(() => ($('#go').hidden = false), 600);
    speak(text, m.pitch);
  }, 2300);
}

$('#go').addEventListener('click', () => {
  const m = memberOf(nav.member!);
  $('#go').hidden = true;
  drive(m, guard(() => history.back()));
});

/** のりものが走りぬける。終わったら onDone */
function drive(m: Member, onDone: () => void): void {
  const d = $('#drive');
  const imgs = d.querySelectorAll('img');
  imgs[0].src = img(m.car);
  imgs[1].src = img(m.img);
  d.style.setProperty('--c', m.color);
  d.dataset.kind = m.car === 'helicopter' ? 'fly' : m.car === 'motor_boat' ? 'sea' : 'road';
  d.hidden = false;
  // アニメーションをはじめから動かしなおす
  const car = $('.car', d);
  car.style.animation = 'none';
  void car.offsetWidth;
  car.style.animation = '';
  playSiren(2.6);
  later(() => {
    d.hidden = true;
    onDone();
  }, 2800);
}

// ---- ミッション ----

/** まだバッジをもらっていないミッションを優先して選ぶ */
function pickMission(): string {
  const left = MISSIONS.filter((m) => !badges.includes(m.id) && m.id !== nav.mission);
  const pool = left.length ? left : MISSIONS.filter((m) => m.id !== nav.mission);
  return pool[Math.floor(Math.random() * pool.length)].id;
}

function troubleHtml(ms: Mission): string {
  return ms.pics.map((p) => `<img src="${img(p)}" alt="" draggable="false">`).join('');
}

function startMission(ms: Mission): void {
  const sec = $('#mission');
  sec.classList.add('alerting');
  $('.trouble', sec).innerHTML = troubleHtml(ms);
  $('.trouble-text', sec).textContent = ms.text;
  const right = memberOf(ms.member);
  const others = shuffle(MEMBERS.filter((m) => m !== right)).slice(0, settings.choices - 1);
  const box = $('.choices', sec);
  box.innerHTML = '';
  box.dataset.n = String(settings.choices);
  for (const m of shuffle([right, ...others])) {
    const b = document.createElement('button');
    b.className = 'member';
    b.style.setProperty('--c', m.color);
    b.innerHTML = `${avatar(m)}<span class="name">${m.name}</span>`;
    b.addEventListener('click', () => choose(ms, m, b));
    box.append(b);
  }
  playAlarm();
  later(() => {
    sec.classList.remove('alerting');
    speak(`たいへん！ ${ms.text} だれを よぶ？`);
  }, 1700);
}

function choose(ms: Mission, m: Member, b: HTMLButtonElement): void {
  const sec = $('#mission');
  if (sec.classList.contains('alerting') || sec.classList.contains('solved')) return;
  if (m.id !== ms.member) {
    playWrong();
    b.classList.remove('nope');
    void b.offsetWidth;
    b.classList.add('nope');
    speak(`${m.name}は ${m.job}の なかまだよ。ほかの なかまかな？`);
    return;
  }
  sec.classList.add('solved');
  b.classList.add('picked');
  playConnect();
  speak(`${m.name}、おねがい！ ${m.line}`, m.pitch, guard(() => {
    drive(m, () => {
      sec.classList.remove('solved');
      show({ screen: 'clear', mission: ms.id }, 'replace');
    });
  }));
}

function medalHtml(ms: Mission, earned = true): string {
  const m = memberOf(ms.member);
  return `<div class="medal-inner ${earned ? '' : 'locked'}" style="--c:${m.color}">
    <div class="ribbon"></div><div class="disc">${earned ? troubleHtml(ms) : '<b>?</b>'}</div></div>`;
}

function renderClear(ms: Mission): void {
  const isNew = addBadge(ms.id);
  $('#clear .medal').innerHTML = medalHtml(ms);
  playFanfare();
  later(() => speak(isNew ? 'やったね！ バッジ ゲット！' : 'やったね！ ありがとう！'), 900);
}

$('#next').addEventListener('click', () => show({ screen: 'mission', mission: pickMission() }, 'replace'));
$('#home').addEventListener('click', () => {
  playTap();
  history.back();
});

// ---- バッジ ----

function renderBadges(): void {
  const grid = $('.badge-grid');
  grid.innerHTML = '';
  for (const ms of MISSIONS) {
    const earned = badges.includes(ms.id);
    const b = document.createElement('button');
    b.className = 'badge';
    b.innerHTML = medalHtml(ms, earned);
    b.addEventListener('click', () => {
      if (!earned) {
        playWrong();
        speak('ミッションで もらえるよ');
        return;
      }
      playTap();
      const m = memberOf(ms.member);
      speak(`${ms.text.replace('！', '')}のとき、${m.name}が たすけたよ`);
    });
    grid.append(b);
  }
  speak(badges.length ? `バッジ、${badges.length}こ！` : 'ミッションで バッジを あつめよう');
}

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
    syncSeg();
    $('#parent').hidden = false;
  }, 3000);
});
['pointerup', 'pointerleave', 'pointercancel'].forEach((ev) => gear.addEventListener(ev, cancelHold));

type SegKey = 'volume' | 'choices';

function syncSeg(): void {
  document.querySelectorAll<HTMLElement>('.seg').forEach((seg) => {
    const key = seg.dataset.key as SegKey;
    seg.querySelectorAll<HTMLButtonElement>('button').forEach((b) => {
      b.classList.toggle('on', String(settings[key]) === b.dataset.v);
    });
  });
}

document.querySelectorAll<HTMLElement>('.seg').forEach((seg) =>
  seg.addEventListener('click', (e) => {
    const b = (e.target as HTMLElement).closest('button');
    if (!b) return;
    const v = Number(b.dataset.v);
    if (seg.dataset.key === 'volume') settings.volume = v as 0 | 1 | 2;
    else settings.choices = v as 2 | 3 | 4;
    saveSettings();
    syncSeg();
  }),
);

$('#reset').addEventListener('click', () => {
  if (!confirm('もらったバッジを、ぜんぶ消しますか？')) return;
  clearBadges();
  if (nav.screen === 'menu') renderMenu();
  if (nav.screen === 'badges') renderBadges();
});
$('#close').addEventListener('click', () => ($('#parent').hidden = true));

// オフラインでも動くように service worker を登録する（ビルドしたときだけ sw.js ができる）
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => navigator.serviceWorker.register('./sw.js').catch(() => {}));
}
