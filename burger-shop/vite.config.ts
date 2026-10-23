import { defineConfig, type Plugin } from 'vite';
import { createHash } from 'node:crypto';
import { readdirSync } from 'node:fs';
import { basename } from 'node:path';

// ビルド時に、全ファイルを先にキャッシュする service worker（sw.js）を書き出す。
// これでスマホに一度入れたあとは、ネットがなくても動く。
// ページ本体はネットを優先して取りに行くので、更新は次に開いたときに反映される。
// 同じドメインに複数のアプリがあるので、キャッシュ名はアプリごとに分ける。
function offline(): Plugin {
  return {
    name: 'offline-sw',
    apply: 'build',
    generateBundle(_, bundle) {
      const files = ['./', ...readdirSync('public'), ...Object.keys(bundle)].filter((f) => f !== 'index.html');
      const version = createHash('sha256')
        .update(Object.values(bundle).map((c) => ('code' in c ? c.code : String(c.source))).join(''))
        .digest('hex')
        .slice(0, 10);
      this.emitFile({
        type: 'asset',
        fileName: 'sw.js',
        source: `const APP = '${basename(process.cwd())}';
const CACHE = APP + '-${version}';
const FILES = ${JSON.stringify(files)};
self.addEventListener('install', (e) => {
  // ブラウザの通常キャッシュを通さず、必ず最新のファイルを取りに行く
  const reqs = FILES.map((f) => new Request(f, { cache: 'reload' }));
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(reqs)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', (e) => {
  e.waitUntil(
    // このアプリの古いキャッシュと、以前の共通名（app-…）のキャッシュだけを消す
    caches.keys()
      .then((keys) => keys.filter((k) => k !== CACHE && (k.startsWith(APP + '-') || /^app-[0-9a-f]{10}$/.test(k))))
      .then((old) => Promise.all(old.map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});
self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  if (e.request.mode === 'navigate') {
    // ページ本体：ネット優先。つながらないときだけ保存した版を出す
    e.respondWith(
      fetch(e.request, { cache: 'no-cache' })
        .then((res) => {
          const copy = res.clone();
          if (res.ok) caches.open(CACHE).then((c) => c.put('./', copy));
          return res;
        })
        .catch(() => caches.match('./')),
    );
    return;
  }
  e.respondWith(
    caches.match(e.request, { ignoreSearch: true }).then((hit) => hit || fetch(e.request).catch(() => caches.match('./'))),
  );
});
`,
      });
    },
  };
}

export default defineConfig({
  // 相対パスで出力し、dist をどの静的サーバーからでも開けるようにする
  base: './',
  server: { host: true, port: 5173 },
  preview: { host: true, port: 4173 },
  plugins: [offline()],
});
