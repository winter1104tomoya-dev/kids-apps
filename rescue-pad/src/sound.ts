import { settings } from './store';

// 声はスマホの音声合成（日本語）、効果音は Web Audio でその場で合成する（音声ファイル不要）

function findVoice(): SpeechSynthesisVoice | undefined {
  const voices = speechSynthesis.getVoices();
  return voices.find((v) => v.lang.replace('_', '-') === 'ja-JP') ?? voices.find((v) => v.lang.startsWith('ja'));
}

let speakId = 0;

/** 日本語で読む。終わったら（音なし・失敗のときもすぐに）onEnd を呼ぶ */
export function speak(text: string, pitch = 1.1, onEnd?: () => void): void {
  const id = ++speakId;
  const done = () => {
    if (id === speakId) onEnd?.();
  };
  if (!('speechSynthesis' in window) || settings.volume === 0) {
    setTimeout(done, 600);
    return;
  }
  speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = 'ja-JP';
  const v = findVoice();
  if (v) u.voice = v;
  u.rate = 0.95;
  u.pitch = pitch;
  u.volume = settings.volume === 2 ? 1 : 0.5;
  // 音声合成が終わりの合図を出さない端末があるので、長さから見積もった時間でも先に進める
  const guard = setTimeout(done, 1500 + text.length * 220);
  u.onend = u.onerror = () => {
    clearTimeout(guard);
    done();
  };
  speechSynthesis.speak(u);
}

export function stopSpeaking(): void {
  speakId++;
  if ('speechSynthesis' in window) speechSynthesis.cancel();
}

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

/** 最初のタップで音を出せる状態にする（ブラウザの自動再生制限対策） */
export function unlockAudio(): void {
  audio();
  if ('speechSynthesis' in window) speechSynthesis.getVoices();
}

/** 鳴っている効果音（サイレンなど）をまとめて止めるための出口 */
let bus: GainNode | null = null;
function out(a: AudioContext): GainNode {
  if (!bus) {
    bus = a.createGain();
    bus.connect(a.destination);
  }
  return bus;
}

export function stopSounds(): void {
  if (!ctx || !bus) return;
  bus.gain.setValueAtTime(0, ctx.currentTime);
  bus.disconnect();
  bus = null;
}

/** freq は1つの高さ、または [時間, 高さ] の並び（音の高さを途中で変える） */
function tone(freq: number | [number, number][], start: number, dur: number, type: OscillatorType = 'sine', vol = 1): void {
  const a = audio();
  if (!a) return;
  const t0 = a.currentTime + start;
  const osc = a.createOscillator();
  const g = a.createGain();
  osc.type = type;
  if (typeof freq === 'number') osc.frequency.setValueAtTime(freq, t0);
  else for (const [t, f] of freq) osc.frequency.setValueAtTime(f, t0 + t);
  const peak = (settings.volume === 2 ? 0.25 : 0.08) * vol;
  g.gain.setValueAtTime(0, t0);
  g.gain.linearRampToValueAtTime(peak, t0 + 0.01);
  g.gain.setValueAtTime(peak, t0 + Math.max(0.02, dur - 0.08));
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  osc.connect(g).connect(out(a));
  osc.start(t0);
  osc.stop(t0 + dur + 0.05);
}

function sweep(from: number, to: number, start: number, dur: number, type: OscillatorType = 'sine', vol = 1): void {
  const a = audio();
  if (!a) return;
  const t0 = a.currentTime + start;
  const osc = a.createOscillator();
  const g = a.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(from, t0);
  osc.frequency.exponentialRampToValueAtTime(to, t0 + dur);
  g.gain.setValueAtTime((settings.volume === 2 ? 0.2 : 0.07) * vol, t0);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  osc.connect(g).connect(out(a));
  osc.start(t0);
  osc.stop(t0 + dur + 0.05);
}

/** ボタンの「ピッ」 */
export function playTap(): void {
  tone(1400, 0, 0.07, 'square', 0.3);
}

/** パッドが起動する音 */
export function playBoot(): void {
  sweep(200, 1200, 0, 0.5, 'sawtooth', 0.5);
  [523, 659, 784].forEach((f, i) => tone(f, 0.45 + i * 0.1, 0.25, 'triangle'));
  tone(1047, 0.75, 0.6, 'triangle');
  tone(1568, 0.75, 0.6, 'sine', 0.4);
}

/** 呼び出し音（プルル…）を times 回 */
export function playRing(times = 2): void {
  for (let i = 0; i < times; i++) {
    const s = i * 1.1;
    const pattern: [number, number][] = [];
    for (let k = 0; k < 12; k++) pattern.push([k * 0.05, k % 2 ? 750 : 950]);
    tone(pattern, s, 0.6, 'square', 0.35);
  }
}

/** つながった「ピロン」 */
export function playConnect(): void {
  tone(880, 0, 0.12, 'triangle');
  tone(1320, 0.1, 0.3, 'triangle');
}

/** 出動のサイレン（ウーウー） */
export function playSiren(sec = 2.4): void {
  const pattern: [number, number][] = [];
  for (let t = 0; t < sec; t += 0.4) pattern.push([t, 660], [t + 0.2, 880]);
  tone(pattern, 0, sec, 'triangle', 0.6);
}

/** ミッションの警報（ピーポー） */
export function playAlarm(): void {
  const pattern: [number, number][] = [];
  for (let t = 0; t < 1.6; t += 0.32) pattern.push([t, 1000], [t + 0.16, 700]);
  tone(pattern, 0, 1.6, 'square', 0.35);
}

/** ちがったときの、やさしい「ぽよん」 */
export function playWrong(): void {
  tone(330, 0, 0.15, 'sine', 0.6);
  tone(262, 0.1, 0.2, 'sine', 0.6);
}

/** ミッション成功のファンファーレ */
export function playFanfare(): void {
  [523, 659, 784, 1047].forEach((f, i) => tone(f, i * 0.12, 0.3, 'triangle'));
  tone(1047, 0.5, 0.8, 'triangle');
  tone(1319, 0.5, 0.8, 'sine', 0.6);
  tone(1568, 0.5, 0.8, 'sine', 0.4);
}
