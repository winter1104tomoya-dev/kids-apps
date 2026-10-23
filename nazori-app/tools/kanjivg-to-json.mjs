// KanjiVG のSVGを、アプリ用の文字データ（100×100マス、画ごとの点の列）に変換する。
// 使い方: node tools/kanjivg-to-json.mjs        （全セットを作り直す）
//         node tools/kanjivg-to-json.mjs numbers（1セットだけ）
// 出力先: src/data/<セット名>.json
// KanjiVG © Ulrich Apel, CC BY-SA 3.0 (https://kanjivg.tagaini.net/)

import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const SETS = {
  hiragana: [...'あいうえおかきくけこさしすせそたちつてとなにぬねのはひふへほまみむめもやゆよらりるれろわをん'],
  katakana: [...'アイウエオカキクケコサシスセソタチツテトナニヌネノハヒフヘホマミムメモヤユヨラリルレロワヲン'],
  alphabet: [...'ABCDEFGHIJKLMNOPQRSTUVWXYZ'],
  lowercase: [...'abcdefghijklmnopqrstuvwxyz'],
  numbers: [...'0123456789'],
};
const targets = process.argv.length > 2 ? process.argv.slice(2) : Object.keys(SETS);

const SRC = 'https://raw.githubusercontent.com/KanjiVG/kanjivg/master/kanji/';
const SCALE = 100 / 109; // KanjiVG は 109×109
const STEP = 2; // 点の間隔（マス単位）

function tokenize(d) {
  return d.match(/[MmCcSsLlHhVvZz]|-?\d*\.?\d+(?:e-?\d+)?/g);
}

function cubic(p0, p1, p2, p3, t) {
  const u = 1 - t;
  return [
    u * u * u * p0[0] + 3 * u * u * t * p1[0] + 3 * u * t * t * p2[0] + t * t * t * p3[0],
    u * u * u * p0[1] + 3 * u * u * t * p1[1] + 3 * u * t * t * p2[1] + t * t * t * p3[1],
  ];
}

// SVG パスを細かい点の列にする
function pathToDense(d) {
  const tk = tokenize(d);
  const pts = [];
  let i = 0;
  let cmd = '';
  let cur = [0, 0];
  let lastCtrl = null;
  const num = () => parseFloat(tk[i++]);
  const addCurve = (c1, c2, end) => {
    for (let k = 1; k <= 40; k++) pts.push(cubic(cur, c1, c2, end, k / 40));
    lastCtrl = c2;
    cur = end;
  };
  while (i < tk.length) {
    if (/[A-Za-z]/.test(tk[i])) cmd = tk[i++];
    const rel = cmd === cmd.toLowerCase();
    const off = (x, y) => (rel ? [cur[0] + x, cur[1] + y] : [x, y]);
    switch (cmd.toUpperCase()) {
      case 'M':
        cur = off(num(), num());
        pts.push(cur);
        lastCtrl = null;
        cmd = rel ? 'l' : 'L';
        break;
      case 'L':
        cur = off(num(), num());
        pts.push(cur);
        lastCtrl = null;
        break;
      case 'H':
        cur = [rel ? cur[0] + num() : num(), cur[1]];
        pts.push(cur);
        lastCtrl = null;
        break;
      case 'V':
        cur = [cur[0], rel ? cur[1] + num() : num()];
        pts.push(cur);
        lastCtrl = null;
        break;
      case 'C': {
        const c1 = off(num(), num());
        const c2 = off(num(), num());
        const end = off(num(), num());
        addCurve(c1, c2, end);
        break;
      }
      case 'S': {
        const c1 = lastCtrl ? [2 * cur[0] - lastCtrl[0], 2 * cur[1] - lastCtrl[1]] : cur;
        const c2 = off(num(), num());
        const end = off(num(), num());
        addCurve(c1, c2, end);
        break;
      }
      default:
        throw new Error(`未対応のパス命令: ${cmd}`);
    }
  }
  return pts;
}

// 等間隔に間引いて 100 マスに換算
function resample(dense) {
  const out = [dense[0]];
  let acc = 0;
  for (let k = 1; k < dense.length; k++) {
    const a = dense[k - 1];
    const b = dense[k];
    acc += Math.hypot(b[0] - a[0], b[1] - a[1]) * SCALE;
    if (acc >= STEP) {
      out.push(b);
      acc = 0;
    }
  }
  const last = dense[dense.length - 1];
  if (out[out.length - 1] !== last) out.push(last);
  return out.map(([x, y]) => [Math.round(x * SCALE * 10) / 10, Math.round(y * SCALE * 10) / 10]);
}

async function convert(ch) {
  const code = ch.codePointAt(0).toString(16).padStart(5, '0');
  const res = await fetch(`${SRC}${code}.svg`);
  if (!res.ok) throw new Error(`${ch} のデータを取得できませんでした (${res.status})`);
  const svg = await res.text();
  const ds = [...svg.matchAll(/<path id="kvg:[0-9a-f]+-s\d+"[^>]*?\sd="([^"]+)"/g)].map((m) => m[1]);
  return { char: ch, strokes: ds.map((d) => resample(pathToDense(d))) };
}

for (const name of targets) {
  const result = [];
  for (const ch of SETS[name]) result.push(await convert(ch));
  const out = fileURLToPath(new URL(`../src/data/${name}.json`, import.meta.url));
  writeFileSync(out, JSON.stringify(result) + '\n');
  console.log(`${name}: ${result.map((c) => `${c.char}${c.strokes.length}`).join(' ')}`);
}
