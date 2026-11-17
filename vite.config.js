import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { defineConfig } from 'vite';

// Writes dist/sw.js with the list of files to keep offline.
// A new build gets a new version, so phones pick up the update.
function serviceWorker() {
  return {
    name: 'service-worker',
    apply: 'build',
    generateBundle(_, bundle) {
      const built = Object.keys(bundle)
        .filter((f) => f !== 'index.html' && !f.endsWith('.woff')) // phones that run the app use .woff2
        .map((f) => `/${f}`);
      const assets = ['/', ...built, '/icon.svg', '/icon-192.png', '/icon-512.png', '/manifest.webmanifest'];
      const template = readFileSync('src/sw.js', 'utf8');
      const hash = createHash('sha256').update(template);
      for (const file of Object.values(bundle)) hash.update(file.code ?? file.source);
      for (const file of ['icon.svg', 'icon-192.png', 'icon-512.png', 'manifest.webmanifest']) hash.update(readFileSync(`public/${file}`));
      const version = hash.digest('hex').slice(0, 12);
      const source = template
        .replace('__VERSION__', version)
        .replace('__ASSETS__', JSON.stringify(assets));
      this.emitFile({ type: 'asset', fileName: 'sw.js', source });
    },
  };
}

export default defineConfig({
  plugins: [serviceWorker()],
  server: {
    proxy: { '/api': 'http://localhost:3000' },
  },
});
