import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import en from './src/translations/en.js';
import { copyFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

export default defineConfig({ base: process.env.PAGES_BASE_PATH || '/', plugins: [react(), {
  name: 'localized-document-defaults',
  transformIndexHtml(html) {
    return html.replace('__APP_TITLE__', en['app.title']).replace('__APP_DESCRIPTION__', en['app.description']);
  },
}, {
  name: 'pages-route-fallback',
  apply: 'build',
  writeBundle(options) {
    const directory = options.dir || 'dist';
    copyFileSync(resolve(directory, 'index.html'), resolve(directory, '404.html'));
    writeFileSync(resolve(directory, '.nojekyll'), '');
  },
}] });
