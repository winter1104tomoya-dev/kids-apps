// Google Cloud Text-to-Speech で、図鑑のことばの音声ファイル（mp3）を作る。
// 使い方: GOOGLE_TTS_API_KEY=... node --experimental-strip-types tools/make-voices.mjs [--force]
// できたファイルは src/voice/{nl,ja}/ に入り、src/voice/voices.json（文 → ファイル名）が更新される。
// すでにあるファイルは作り直さない（--force で全部作り直す）。
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, readdirSync, unlinkSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(ROOT, 'src/voice');
const KEY = process.env.GOOGLE_TTS_API_KEY;
const FORCE = process.argv.includes('--force');
if (!KEY) {
  console.error('GOOGLE_TTS_API_KEY がありません');
  process.exit(1);
}

// 使いたい声の順番。上から、使えるものを選ぶ（女性のやわらかい声を優先）
const PREFER = {
  nl: ['nl-NL-Chirp3-HD-Aoede', 'nl-NL-Chirp3-HD-Leda', 'nl-NL-Wavenet-F', 'nl-NL-Wavenet-D', 'nl-NL-Wavenet-A', 'nl-NL-Standard-A'],
  ja: ['ja-JP-Neural2-B', 'ja-JP-Wavenet-A', 'ja-JP-Chirp3-HD-Aoede', 'ja-JP-Wavenet-B', 'ja-JP-Standard-A'],
};
const LANG = { nl: 'nl-NL', ja: 'ja-JP' };
// 声を指定して作るとき（ワークフローの入力から）
if (process.env.NL_VOICE) PREFER.nl.unshift(process.env.NL_VOICE);
if (process.env.JA_VOICE) PREFER.ja.unshift(process.env.JA_VOICE);

const { CATEGORIES } = await import(join(ROOT, 'src/words.ts'));

// アプリが読み上げる文をすべて集める（main.ts の speakNl の呼び出しと合わせる）
const texts = { nl: new Set(['Goed zo!', 'Super!', 'aardbei', 'de aardbei']), ja: new Set(['苺']) };
for (const c of CATEGORIES) {
  texts.nl.add(c.nl);
  texts.ja.add(c.say ?? c.ja);
  for (const w of c.words) {
    texts.nl.add(w.nl);
    if (w.art) texts.nl.add(`${w.art} ${w.nl}`);
    texts.ja.add(w.say ?? w.ja);
  }
}

async function api(path, body) {
  const res = await fetch(`https://texttospeech.googleapis.com/v1/${path}?key=${KEY}`, {
    method: body ? 'POST' : 'GET',
    headers: { 'Content-Type': 'application/json' },
    body: body && JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`${path}: ${res.status} ${await res.text()}`);
  return res.json();
}

const old = JSON.parse(readFileSync(join(OUT, 'voices.json'), 'utf8'));
const manifest = { voice: {}, nl: {}, ja: {} };
let made = 0;
const voices = (await api('voices', null)).voices.map((v) => v.name);
for (const lang of ['nl', 'ja']) {
  const name = PREFER[lang].find((n) => voices.includes(n));
  if (!name) throw new Error(`${lang} の声が見つかりません`);
  // 声を変えたときは全部作り直す
  const redo = FORCE || old.voice?.[lang] !== name;
  manifest.voice[lang] = name;
  mkdirSync(join(OUT, lang), { recursive: true });
  for (const text of [...texts[lang]].sort()) {
    const hash = createHash('sha1').update(text).digest('hex').slice(0, 12);
    const file = join(OUT, lang, `${hash}.mp3`);
    if (redo || !existsSync(file)) {
      const r = await api('text:synthesize', {
        input: { text },
        voice: { languageCode: LANG[lang], name },
        audioConfig: { audioEncoding: 'MP3', sampleRateHertz: 24000 },
      });
      writeFileSync(file, Buffer.from(r.audioContent, 'base64'));
      made++;
    }
    manifest[lang][text] = hash;
  }
  // もう使わない文のファイルは消す（アプリに入れないため）
  const used = new Set(Object.values(manifest[lang]).map((h) => `${h}.mp3`));
  for (const f of readdirSync(join(OUT, lang))) if (!used.has(f)) unlinkSync(join(OUT, lang, f));
  console.log(`${lang}: ${name}（${texts[lang].size} 個）`);
}
writeFileSync(join(OUT, 'voices.json'), JSON.stringify(manifest, null, 2) + '\n');
console.log(`新しく作ったファイル: ${made} 個`);
