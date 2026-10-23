import { defineConfig, type Plugin } from 'vite';
import { createHash } from 'node:crypto';
import { readdirSync } from 'node:fs';

// ビルド時に、全ファイルを先にキャッシュする service worker（sw.js）を書き出す。
// これでスマホに一度入れたあとは、ネットがなくても動く。
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
        source: `const CACHE = 'app-${version}';
const FILES = ${JSON.stringify(files)};
self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(FILES)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});
self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
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
