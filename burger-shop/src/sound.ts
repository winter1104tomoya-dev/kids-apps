import { settings } from './store';

// 効果音は Web Audio でその場で合成する（音声ファイル不要）
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

function gainLevel(): number {
  return settings.volume === 2 ? 0.35 : 0.12;
}

function tone(freq: number, start: number, dur: number, type: OscillatorType = 'sine', vol = 1, to?: number): void {
  const a = audio();
  if (!a) return;
  const t0 = a.currentTime + start;
  const osc = a.createOscillator();
  const g = a.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);
  if (to) osc.frequency.exponentialRampToValueAtTime(to, t0 + dur);
  g.gain.setValueAtTime(0, t0);
  g.gain.linearRampToValueAtTime(gainLevel() * vol, t0 + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  osc.connect(g).connect(a.destination);
  osc.start(t0);
  osc.stop(t0 + dur + 0.05);
}

/** 具をのせたときの「ぽん」。のせるたびに少しずつ高くなる */
export function playPop(step: number): void {
  const f = 520 * Math.pow(2, Math.min(step, 8) / 12);
  tone(f, 0, 0.18, 'sine', 1, f * 1.5);
}

/** 具をとったときの「ひゅっ」 */
export function playWhoosh(): void {
  tone(900, 0, 0.18, 'triangle', 0.5, 300);
}

/** ちがうときの、やさしい「ぽよん」 */
export function playBoing(): void {
  tone(330, 0, 0.15, 'sine', 0.5);
  tone(440, 0.1, 0.15, 'sine', 0.5);
}

/** うえのパンをのせたときの「じゃーん」 */
export function playFanfare(): void {
  [523, 659, 784, 1047].forEach((f, i) => tone(f, i * 0.11, 0.3, 'triangle'));
  tone(1047, 0.46, 0.6, 'triangle');
  tone(1319, 0.46, 0.6, 'sine', 0.6);
}

/** コインの「チャリーン」 */
export function playCoin(): void {
  tone(988, 0, 0.12, 'square', 0.35);
  tone(1319, 0.08, 0.5, 'square', 0.35);
}

/** ブラウザの読み上げ機能で話す。pitch でお客さんごとに声を変える */
export function speak(text: string, pitch = 1.2): void {
  if (settings.volume === 0 || !('speechSynthesis' in window)) return;
  const u = new SpeechSynthesisUtterance(text);
  u.lang = 'ja-JP';
  u.rate = 0.9;
  u.pitch = pitch;
  u.volume = settings.volume === 2 ? 1 : 0.5;
  const voice = speechSynthesis.getVoices().find((v) => v.lang.startsWith('ja'));
  if (voice) u.voice = voice;
  speechSynthesis.cancel();
  speechSynthesis.speak(u);
}

/** 最初のタップで音を出せる状態にする（ブラウザの自動再生制限対策） */
export function unlockAudio(): void {
  audio();
  if ('speechSynthesis' in window) speechSynthesis.getVoices();
}
