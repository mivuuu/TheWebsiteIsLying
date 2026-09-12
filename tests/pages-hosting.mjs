// Run after PAGES_BASE_PATH=/TheWebsiteIsLying/ npm run build.
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { resolve, extname } from 'node:path';
import assert from 'node:assert/strict';
import { chromium } from '@playwright/test';
const base = '/TheWebsiteIsLying/';
const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.woff2': 'font/woff2' };
const server = createServer(async (req, res) => {
  const pathname = new URL(req.url, 'http://localhost').pathname;
  if (!pathname.startsWith(base) || pathname.includes('..')) { res.writeHead(404); res.end(); return; }
  const file = pathname.slice(base.length) || 'index.html';
  try { const content = await readFile(resolve('dist', file)); res.setHeader('Content-Type', types[extname(file)] || 'application/octet-stream'); res.end(content); }
  catch { res.writeHead(404, { 'Content-Type': 'text/html' }); res.end(await readFile('dist/404.html')); }
});
await new Promise(done => server.listen(0, '127.0.0.1', done));
const browser = await chromium.launch();
try {
  const page = await browser.newPage({ reducedMotion: 'reduce' }); const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  const origin = `http://127.0.0.1:${server.address().port}`;
  await page.clock.install(); await page.goto(origin + base); await page.clock.fastForward(9000);
  await page.getByRole('button', { name: 'I UNDERSTAND' }).click();
  assert.equal(new URL(page.url()).pathname, base + 'home');
  for (const lang of ['en','ru','he']) {
    await page.locator(`button[lang="${lang}"]`).click();
    await page.locator(`nav a[href="${base}rules"]`).click();
    const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('lying:run:v2')));
    const response = await page.reload(); assert.equal(response.status(), 404);
    await page.locator('.rules-list').waitFor();
    const restored = await page.evaluate(() => JSON.parse(localStorage.getItem('lying:run:v2')));
    assert.equal(restored.sessionId, saved.sessionId); assert.deepEqual(restored.visits, saved.visits);
    assert.equal(await page.locator('html').getAttribute('lang'), lang);
    if (lang === 'he') assert.equal(await page.locator('html').getAttribute('dir'), 'rtl');
    await page.locator(`nav a[href="${base}home"]`).click();
  }
  await page.goto(origin + base + 'unknown-directory'); await page.locator('.route-entry').waitFor();
  assert.equal(new URL(page.url()).pathname, base + '404');
  assert.deepEqual(errors, []);
  console.log('Pages subdirectory, deep-link fallback, save/restore and EN/RU/HE: passed.');
} finally { await browser.close(); await new Promise(done => server.close(done)); }
