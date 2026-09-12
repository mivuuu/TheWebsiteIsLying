import { test, expect } from '@playwright/test';
import { game, investigate } from '../helpers.js';
import { initialHorror, RED_DURATION, MINUTE } from '../../src/game/HorrorDirector.js';
import { serializeRun } from '../../src/game/persistence.js';
import { translations } from '../../src/translations/index.js';
import { snapshot, switchTo } from './helpers.js';

function scene(id, route, duration, level = 2) {
  const s = structuredClone(investigate(game(12345, 1)).state);
  s.page = route; s.now = s.startedAt + 32 * MINUTE; s.enteredAt = s.now; s.delayed = []; s.redUntil = 0;
  s.horror = { ...initialHorror(), seen: [id], counts: [0,0,1,0,0], nextAt: 40 * MINUTE, active: { id, page: route, level, at: s.now, until: s.now + duration }, history: [{ id, level, at: s.now }] };
  return s;
}
async function load(page, s, language = 'en') {
  await page.clock.install({ time: new Date('2026-09-12T12:00:00Z') }); await page.clock.pauseAt(new Date('2026-09-12T12:00:00Z'));
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.addInitScript(({ run, language }) => {
    if (!localStorage.getItem('lying:run:v2')) localStorage.setItem('lying:run:v2', run);
    if (!localStorage.getItem('lying:language')) localStorage.setItem('lying:language', language);
  }, { run: serializeRun(s), language });
  await page.goto('/tests/fixtures/state-harness.html');
}
test('blackout restores after refresh, Escape always recovers, no route flash reaches history', async ({ page }) => {
  await load(page, scene('empty-page', 'files', 6000, 3));
  await expect(page.locator('.horror-blackout')).toBeVisible();
  const before = await snapshot(page); await page.clock.runFor(2000); await page.reload();
  await expect(page.locator('.horror-blackout')).toBeVisible(); await page.keyboard.press('Escape');
  await expect(page.locator('.horror-blackout')).toHaveCount(0);
  const after = await page.evaluate(() => JSON.parse(localStorage.getItem('lying:run:v2')));
  for (const key of ['puzzles','responses','unlocked','choices','visits','log','sessionId']) expect(after[key]).toEqual(before[key]);
});
for (const lang of ['en','ru','he']) test(`wrong sender corrects without leaving a false record (${lang})`, async ({ page }) => {
  const s = scene('wrong-sender', 'messages', 16000, 4);
  s.messages.push({ id: 'horror:wrong-sender', from: 'ADMIN', textKey: 'horror.sameName', at: s.now - s.startedAt });
  s.log.push({ key: 'horror.log.admin', params: {}, at: s.now - s.startedAt });
  await load(page, s, lang); await expect(page.locator('.message-list .message').last().locator('bdi')).toHaveText(translations[lang]['story.user.visitor']);
  const before = await snapshot(page); await switchTo(page, lang === 'he' ? 'ru' : 'he'); expect(await snapshot(page)).toEqual(before); await switchTo(page, lang);
  await page.clock.runFor(4100); await expect(page.locator('.message-list .message').last().locator('bdi')).toContainText('ADMIN');
  const after = await snapshot(page); expect(after.messages).toEqual(before.messages); expect(after.log).toEqual(before.log);
  await page.setViewportSize({ width: 375, height: 900 }); expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: `test-results/horror-sender-${lang}.png`, fullPage: true, animations: 'disabled' });
});
test('old reduced-horror preference cannot suppress anomalies', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('lying:reduced-horror', 'on'));
  await load(page, scene('empty-page', 'files', 6000, 3));
  await expect(page.locator('.horror-setting')).toHaveCount(0);
  await expect(page.locator('.horror-blackout')).toBeVisible();
  await page.reload();
  await expect(page.locator('.horror-blackout')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.locator('.horror-blackout')).toHaveCount(0);
});
test('page-7 has quiet phases and finite recovery on the third visit', async ({ page }) => {
  const s = scene('none', 'page-7', 0); s.visits['page-7'] = 3; await load(page, s, 'he');
  await expect(page.locator('.hidden-page h1, .hidden-page p, .hidden-return')).toHaveCount(0);
  await page.clock.runFor(15100); await expect(page.locator('.hidden-page p')).toHaveText(translations.he['horror.waiting']);
  await page.clock.runFor(4000); await expect(page.locator('.hidden-return a')).toBeVisible();
  await page.locator('.hidden-return a').click(); await expect(page).toHaveURL(/\/files$/);
});
test('red sequence never forces input and late feedback is silent', async ({ page }) => {
  const s = scene('none', 'archive', 0); s.redUntil = s.now + RED_DURATION; s.redBehavior = 'waiting'; s.fired = s.fired.filter(id => !['red-over','red-click'].includes(id));
  await load(page, s, 'ru'); await expect(page.locator('.horror-transmission')).toHaveCount(0);
  await page.clock.runFor(7100); await expect(page.locator('.horror-transmission')).toContainText(translations.ru['horror.typing']);
  await page.clock.runFor(7100); await expect(page.locator('.horror-transmission')).toContainText(translations.ru['horror.dont']);
  await page.clock.runFor(5000); await expect(page.locator('.horror-transmission')).toHaveCount(0);
  await page.clock.runFor(7000); await expect(page.locator('.horror-transmission')).toContainText(translations.ru['horror.inputAvailable']);
  await page.clock.runFor(6000); await expect(page.locator('.app')).not.toHaveClass(/red-state/);
  const saved = await snapshot(page); expect(saved.rulesBroken).not.toContain(2); expect(saved.redBehavior).toBe('waited');
});
test('false ending resumes Home, never awards an ending or repeats', async ({ page }) => {
  const s = scene('false-ending', 'exit', 13000, 3); s.exitAnswer = 'yes'; await load(page, s);
  await expect(page.locator('.horror-blackout p')).toHaveText(translations.en['ending.title']);
  await page.clock.runFor(4100); await expect(page.locator('.horror-blackout p')).toHaveText(translations.en['ending.label']);
  await page.clock.runFor(5500); await expect(page.locator('.horror-blackout p')).toHaveText(translations.en['horror.resumed']);
  await page.clock.runFor(3500); await expect(page).toHaveURL(/\/home$/);
  const after = await snapshot(page); expect(after.ending).toBeNull(); expect(after.puzzles).toEqual(s.puzzles); expect(after.horror.seen.filter(id => id === 'false-ending')).toHaveLength(1);
});
