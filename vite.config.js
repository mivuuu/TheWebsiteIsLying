import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import en from './src/translations/en.js';

export default defineConfig({ plugins: [react(), {
  name: 'localized-document-defaults',
  transformIndexHtml(html) {
    return html.replace('__APP_TITLE__', en['app.title']).replace('__APP_DESCRIPTION__', en['app.description']);
  },
}] });
