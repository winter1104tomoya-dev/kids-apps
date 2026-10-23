import { settings } from './store';

// 読み上げはブラウザの音声合成（Web Speech API）を使う。音声ファイルは不要

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

/** オランダ語で読む。設定によっては続けて日本語も読む */
export function speakNl(nl: string, ja?: string): void {
  if (settings.volume === 0 || !('speechSynthesis' in window)) return;
  speechSynthesis.cancel();
  speechSynthesis.speak(utter(nl, 'nl'));
  if (ja && settings.japanese) speechSynthesis.speak(utter(ja, 'ja'));
}

/** 保護者メニュー用：オランダ語の声が入っているか */
export function dutchVoiceName(): string | null {
  if (!('speechSynthesis' in window)) return null;
  return findVoice('nl')?.name ?? null;
}

/** 最初のタップで読み上げを使える状態にする（ブラウザの自動再生制限対策） */
export function unlockAudio(): void {
  if ('speechSynthesis' in window) speechSynthesis.getVoices();
}
