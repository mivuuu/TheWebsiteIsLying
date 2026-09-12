import { test, expect } from '@playwright/test';
import { boot, investigate, finish, nav, command, snapshot } from './helpers.js';
import { translations } from '../../src/translations/index.js';

for (const [ending, protocol, answers, language] of [
  ['obeyed', 'obey', ['no', 'no', 'no'], 'en'], ['freed', 'release', ['yes', 'yes', 'no'], 'ru'],
  ['replaced', 'release', ['yes', 'yes', 'yes'], 'he'], ['trapped', 'contain', ['silent', 'yes', 'no'], 'en'],
  ['escaped', 'detach', ['silent', 'no', 'no'], 'he'],
]) test(`full UI investigation: ${ending} (${language})`, async ({ page }) => {
  test.setTimeout(90000); const errors = []; page.on('pageerror', e => errors.push(e.message));
  await boot(page, language); await investigate(page, answers); await finish(page, protocol);
  expect((await snapshot(page)).ending.id).toBe(ending);
  await page.clock.runFor(8000);
  await page.screenshot({ path: `test-results/ending-${ending}-${language}.png`, fullPage: true });
  expect(errors).toEqual([]);
  const meta = await page.evaluate(() => JSON.parse(localStorage.getItem('lying:meta:v1')));
  expect(meta.completedRuns).toBe(1); expect(meta.discoveredEndings).toContain(ending);
  if (ending === 'obeyed') {
    await page.getByRole('button', { name: translations.en['ending.restart'] }).click();
    await page.clock.runFor(2900); await expect(page.locator('.intro h1')).toHaveAttribute('aria-label', translations.en['story.intro.back']);
    await page.clock.runFor(1000); await expect(page.locator('.intro h1')).toHaveAttribute('aria-label', translations.en['intro.welcome']);
    expect((await snapshot(page)).responses).toEqual({}); expect((await snapshot(page)).previousRuns).toBe(1);
  }
});
test('NULL uses optional fragments, clears the active run and retains meta discoveries', async ({ page }) => {
  test.setTimeout(90000); await boot(page); await investigate(page);
  await nav(page, 'deleted'); await page.locator('.marginalia').click();
  await nav(page, 'mirror'); await page.locator('.marginalia').click(); await command(page, 'history --erased');
  await nav(page, 'null'); await page.locator('.null-page button').click();
  expect((await snapshot(page)).ending.id).toBe('null'); await page.clock.runFor(5250);
  expect((await snapshot(page)).started).toBe(false); expect((await snapshot(page)).previousRuns).toBe(1);
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('lying:meta:v1')).discoveredEndings)).toContain('null');
});
