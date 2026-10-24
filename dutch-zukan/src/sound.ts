import { settings } from './store';
import voices from './voice/voices.json';

// 読み上げは、用意した音声ファイル（tools/make-voices.mjs で Google の読み上げから作ったもの）があればそれを使い、
// なければブラウザの音声合成（Web Speech API）で読む

type Lang = 'nl' | 'ja';
const MANIFEST = voices as { voice: Partial<Record<Lang, string>> } & Record<Lang, Record<string, string>>;
const FILES = import.meta.glob<string>('./voice/*/*.mp3', { eager: true, query: '?url', import: 'default' });

function fileFor(text: string, lang: Lang): string | undefined {
  const hash = MANIFEST[lang][text];
  return hash && FILES[`./voice/${lang}/${hash}.mp3`];
}

/** 声の一覧は後から読み込まれることがあるので、毎回探し直す */
function findVoice(prefix: 'nl' | 'ja'): SpeechSynthesisVoice | undefined {
  const voices = speechSynthesis.getVoices();
  const main = prefix === 'nl' ? 'nl-NL' : 'ja-JP';
  return (
    voices.find((v) => v.lang.replace('_', '-') === main) ??
    voices.find((v) => v.lang.toLowerCase().startsWith(prefix))
  );
}

function utter(text: string, lang: 'nl' | 'ja'): SpeechSynthesisUtterance {
  const u = new SpeechSynthesisUtterance(text);
  u.lang = lang === 'nl' ? 'nl-NL' : 'ja-JP';
  const voice = findVoice(lang);
  if (voice) u.voice = voice;
  u.rate = settings.rate === 'slow' ? 0.7 : 0.95;
  u.pitch = 1.1;
  u.volume = settings.volume === 2 ? 1 : 0.5;
  return u;
}

let playing: HTMLAudioElement | null = null;
/** 読み上げの番号。新しく読み始めたら、前の読み上げの「終わった」合図は無視する */
let speakId = 0;

/** 1つの文を読む。ファイルがあれば再生、なければ音声合成。終わったら（失敗しても）next を呼ぶ */
function speakOne(text: string, lang: Lang, next: () => void): void {
  const url = fileFor(text, lang);
  if (url) {
    const a = new Audio(url);
    a.playbackRate = settings.rate === 'slow' ? 0.8 : 1;
    a.preservesPitch = true;
    a.volume = settings.volume === 2 ? 1 : 0.5;
    a.onended = next;
    a.onerror = next;
    playing = a;
    a.play().catch(next);
    return;
  }
  if (!('speechSynthesis' in window)) return next();
  const u = utter(text, lang);
  u.onend = next;
  u.onerror = next;
  speechSynthesis.speak(u);
}

/** オランダ語で読む。設定によっては続けて日本語も読む。onEnd は読み終わったとき（読まないときはすぐ）に呼ぶ */
export function speakNl(nl: string, ja?: string, onEnd?: () => void): void {
  const id = ++speakId;
  playing?.pause();
  playing = null;
  if ('speechSynthesis' in window) speechSynthesis.cancel();
  if (settings.volume === 0) {
    onEnd?.();
    return;
  }
  const list: [string, Lang][] = [[nl, 'nl']];
  if (ja && settings.japanese) list.push([ja, 'ja']);
  const step = (i: number) => {
    if (id !== speakId) return;
    if (i >= list.length) return onEnd?.();
    speakOne(list[i][0], list[i][1], () => step(i + 1));
  };
  step(0);
}

/** 保護者メニュー用：音声ファイルの声の名前（ファイルがなければ null） */
export function recordedVoiceName(): string | null {
  return Object.keys(MANIFEST.nl).length ? (MANIFEST.voice.nl ?? '') : null;
}

/** 保護者メニュー用：オランダ語の声が入っているか */
export function dutchVoiceName(): string | null {
  if (!('speechSynthesis' in window)) return null;
  return findVoice('nl')?.name ?? null;
}

/** 最初のタップで読み上げを使える状態にする（ブラウザの自動再生制限対策） */
export function unlockAudio(): void {
  audio();
  if ('speechSynthesis' in window) speechSynthesis.getVoices();
}

// ---- クイズの効果音。Web Audio でその場で合成する（音声ファイル不要） ----

let ctx: AudioContext | null = null;

function audio(): AudioContext | null {
  if (settings.volume === 0) return null;
  if (!ctx) {
    try {
      ctx = new AudioContext();
    } catch {
      return null;
    }
  }
  if (ctx.state === 'suspended') void ctx.resume();
  return ctx;
}

function tone(freq: number, start: number, dur: number, type: OscillatorType = 'sine', vol = 1): void {
  const a = audio();
  if (!a) return;
  const t0 = a.currentTime + start;
  const osc = a.createOscillator();
  const g = a.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);
  g.gain.setValueAtTime(0, t0);
  g.gain.linearRampToValueAtTime((settings.volume === 2 ? 0.3 : 0.1) * vol, t0 + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  osc.connect(g).connect(a.destination);
  osc.start(t0);
  osc.stop(t0 + dur + 0.05);
}

/** 正解の「ピンポン」 */
export function playCorrect(): void {
  tone(1047, 0, 0.25, 'triangle');
  tone(1319, 0.12, 0.4, 'triangle');
}

/** ちがったときの、やさしい「ぽよん」 */
export function playWrong(): void {
  tone(330, 0, 0.15, 'sine', 0.5);
  tone(262, 0.1, 0.2, 'sine', 0.5);
}

/** 5問できたときのファンファーレ */
export function playFanfare(): void {
  [523, 659, 784, 1047].forEach((f, i) => tone(f, i * 0.12, 0.3, 'triangle'));
  tone(1047, 0.5, 0.7, 'triangle');
  tone(1319, 0.5, 0.7, 'sine', 0.6);
}
