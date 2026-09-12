import { RED_DURATION } from '../../src/game/HorrorDirector.js';
import { test, expect } from '@playwright/test';
import { translations, graphemes } from '../../src/translations/index.js';
import { game, investigate as stateInvestigation, complete } from '../helpers.js';
import { serializeRun } from '../../src/game/persistence.js';
import { ROUTES } from '../../src/game/story.js';
import { boot, audit, investigate, finish, nav, switchTo, snapshot } from './helpers.js';

test('language is presentation only during red, question draft, secret timer, terminal and ending', async ({ page }) => {
  test.setTimeout(90000); await boot(page); await audit(page);
  const unchanged = async () => { const before = await snapshot(page); for (const lang of ['ru', 'he', 'en']) { await switchTo(page, lang); expect(await snapshot(page)).toEqual(before); } };
  await nav(page, 'archive'); await page.clock.runFor(3500); await unchanged();
  expect((await snapshot(page)).rulesBroken).not.toContain(2); await page.clock.runFor(RED_DURATION);
  await nav(page, 'messages'); await page.clock.runFor(3000); await page.locator('#visitor-name').fill('Alex אור'); await unchanged();
  await expect(page.locator('#visitor-name')).toHaveValue('Alex אור');
  await page.locator('.name-request form button').click();
  await page.locator('.conversation button').nth(1).click(); await nav(page, 'page-7'); await page.clock.runFor(2000); await unchanged();
  await page.clock.runFor(9250); await expect(page.locator('.hidden-page p')).toHaveText(translations.en['hidden.second']);
  await page.clock.runFor(13000); await nav(page, 'terminal'); await page.locator('#terminal-command').fill('whoami'); await unchanged();
  await page.locator('#terminal-command').press('Enter'); await unchanged();
  const before = await snapshot(page); await page.reload();
  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('lying:run:v2')));
  for (const key of ['responses', 'fired', 'puzzles', 'visits', 'terminalHistory', 'sessionSeed', 'startedAt', 'now']) expect(saved[key]).toEqual(before[key]);
});

for (const language of ['en', 'ru', 'he']) test(`${language}: all 20 routes fit mobile, tablet and desktop`, async ({ page }) => {
  test.setTimeout(90000); const errors = []; page.on('pageerror', e => errors.push(e.message));
  const g = stateInvestigation(game()); const state = g.state;
  // State comes from a real reducer walkthrough; expose all routes only for visual coverage of their independent layouts.
  const fixture = { ...state, page: 'home', unlocked: ROUTES, choices: { protocol: 'detach', registry: true }, hiddenRoutes: [] };
  await page.addInitScript(({ run, lang }) => { localStorage.setItem('lying:run:v2', run); localStorage.setItem('lying:language', lang); }, { run: serializeRun(fixture), lang: language });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.clock.install(); await page.clock.pauseAt(new Date()); await page.goto('/');
  for (const width of [375, 768, 1440]) {
    await page.setViewportSize({ width, height: 1000 });
    for (const route of ROUTES) {
      await page.evaluate(route => { history.pushState({}, '', `/${route}`); dispatchEvent(new PopStateEvent('popstate')); }, route);
      await expect(page).toHaveURL(new RegExp(`/${route}$`));
      await expect(page.locator('.page-heading h1, .hidden-page, .null-page button').first()).toBeVisible();
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `${language}:${route}:${width}`).toBe(true);
      if (language === 'he') await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
      if (language === 'he' && ['terminal', 'old-rules', 'status', 'mirror'].includes(route) && width !== 768) await page.screenshot({ path: `test-results/he-${route}-${width}.png`, fullPage: true });
    }
  }
  expect(errors).toEqual([]);
});

test('Unicode typing preserves its position across language changes', async ({ page }) => {
  await page.clock.install({ time: new Date('2026-09-12T12:00:00Z') }); await page.clock.pauseAt(new Date('2026-09-12T12:00:00Z')); await page.goto('/');
  await page.clock.runFor(2400);
  for (const lang of ['ru', 'he', 'en']) {
    await switchTo(page, lang); const typed = await page.locator('.intro h1 > span').first().textContent();
    const full = graphemes(translations[lang]['intro.welcome'], lang).join(''); expect(full.startsWith(typed)).toBe(true); expect(typed.length).toBeGreaterThan(0); expect(typed).not.toBe(full);
  }
});
test('language persists and unavailable storage remains playable', async ({ page }) => {
  await page.goto('/'); await switchTo(page, 'he'); await page.reload(); await expect(page.locator('html')).toHaveAttribute('lang', 'he');
  await page.evaluate(() => localStorage.setItem('lying:language', 'invalid')); await page.reload(); await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  await page.addInitScript(() => { Storage.prototype.getItem = () => { throw Error('blocked'); }; Storage.prototype.setItem = () => { throw Error('blocked'); }; });
  await page.reload(); await switchTo(page, 'ru'); await expect(page.locator('html')).toHaveAttribute('lang', 'ru');
});
test('ending language changes preserve result and its cinematic clock', async ({ page }) => {
  const ended = complete(stateInvestigation(game()), 'obey').state;
  await page.addInitScript(run => localStorage.setItem('lying:run:v2', run), serializeRun(ended));
  await page.clock.install(); await page.clock.pauseAt(new Date()); await page.goto('/tests/fixtures/state-harness.html');
  const before = await snapshot(page); for (const lang of ['ru', 'he', 'en']) { await switchTo(page, lang); expect(await snapshot(page)).toEqual(before); }
});

