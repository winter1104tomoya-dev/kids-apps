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

function tone(freq: number, start: number, dur: number, type: OscillatorType = 'sine', vol = 1): void {
  const a = audio();
  if (!a) return;
  const t0 = a.currentTime + start;
  const osc = a.createOscillator();
  const g = a.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);
  g.gain.setValueAtTime(0, t0);
  g.gain.linearRampToValueAtTime(gainLevel() * vol, t0 + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  osc.connect(g).connect(a.destination);
  osc.start(t0);
  osc.stop(t0 + dur + 0.05);
}

/** 1画できたときの「ポン」 */
export function playPon(): void {
  const a = audio();
  if (!a) return;
  const t0 = a.currentTime;
  const osc = a.createOscillator();
  const g = a.createGain();
  osc.frequency.setValueAtTime(880, t0);
  osc.frequency.exponentialRampToValueAtTime(1320, t0 + 0.08);
  g.gain.setValueAtTime(gainLevel(), t0);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.25);
  osc.connect(g).connect(a.destination);
  osc.start(t0);
  osc.stop(t0 + 0.3);
}

/** 始点から離れたところを触ったときの、やさしい「ぽよん」 */
export function playBoing(): void {
  tone(330, 0, 0.15, 'sine', 0.5);
  tone(440, 0.1, 0.15, 'sine', 0.5);
}

/** 1文字できたときのファンファーレと拍手 */
export function playFanfare(): void {
  const notes = [523, 659, 784, 1047];
  notes.forEach((f, i) => tone(f, i * 0.12, 0.3, 'triangle'));
  tone(1047, 0.5, 0.6, 'triangle');
  tone(1319, 0.5, 0.6, 'sine', 0.6);
  const a = audio();
  if (!a) return;
  // 拍手：短いノイズを不規則に重ねる
  const len = a.sampleRate * 0.04;
  const buf = a.createBuffer(1, len, a.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
  for (let i = 0; i < 28; i++) {
    const src = a.createBufferSource();
    src.buffer = buf;
    const g = a.createGain();
    const f = a.createBiquadFilter();
    f.type = 'bandpass';
    f.frequency.value = 1200 + Math.random() * 1500;
    g.gain.value = gainLevel() * (0.4 + Math.random() * 0.4);
    src.connect(f).connect(g).connect(a.destination);
    src.start(a.currentTime + 0.7 + Math.random() * 1.4);
  }
}

/** ブラウザの読み上げ機能で話す */
export function speak(text: string): void {
  if (settings.volume === 0 || !('speechSynthesis' in window)) return;
  const u = new SpeechSynthesisUtterance(text);
  u.lang = 'ja-JP';
  u.rate = 0.9;
  u.pitch = 1.2;
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
