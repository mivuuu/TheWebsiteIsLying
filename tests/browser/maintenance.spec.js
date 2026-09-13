import { test, expect } from '@playwright/test';
import { game, investigate, complete } from '../helpers.js';
import { emptyMeta, updateMeta, serializeRun } from '../../src/game/persistence.js';
import { translations } from '../../src/translations/index.js';
import { ENDING_REGISTRY } from '../../src/game/endings.js';
import { boot, nav, snapshot } from './helpers.js';

async function seedHistory(page, language) {
  const ended = complete(investigate(game()), 'obey').state;
  const meta = updateMeta(emptyMeta(), ended); const fresh = game(98765, 1); fresh.act('START');
  await page.addInitScript(({ run, meta, language }) => {
    if (sessionStorage.getItem('fixture-installed')) return;
    localStorage.setItem('lying:run:v2', run); localStorage.setItem('lying:meta:v1', JSON.stringify(meta));
    localStorage.setItem('lying:language', language); localStorage.setItem('lying:effects', 'off');
    localStorage.setItem('lying:run:v1', 'obsolete'); sessionStorage.setItem('lying:old', 'obsolete');
    localStorage.setItem('unrelated', 'keep'); sessionStorage.setItem('unrelated', 'keep');
    sessionStorage.setItem('fixture-installed', 'yes');
  }, { run: serializeRun(fresh.state), meta, language });
  await page.clock.install(); await page.clock.pauseAt(new Date()); await page.goto('/tests/fixtures/state-harness.html');
}
async function system(page) {
  await nav(page, 'help'); await page.locator('.maintenance-access').click(); await expect(page).toHaveURL(/\/help\/system$/);
}
for (const language of ['en', 'ru', 'he']) test(`${language}: archive, confirmed resets, settings and refresh at mobile widths`, async ({ page }) => {
  test.setTimeout(90000); const errors = []; page.on('pageerror', error => errors.push(error.message));
  const t = key => translations[language][key]; await seedHistory(page, language);
  await system(page);
  await expect(page.locator('.sidebar a[href*="/help/"]')).toHaveCount(0);
  const first = await snapshot(page);
  for (const width of [320, 375, 390, 430]) {
    await page.setViewportSize({ width, height: 800 });
    for (const route of ['help/system', 'help/endings', 'help/reset']) {
      if ((await snapshot(page)).page !== route) await page.locator(`.maintenance a[href="/${route}"]`).click();
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `${language}:${route}:${width}`).toBe(true);
      if (route === 'help/endings') {
        await expect(page.locator('.ending-records li')).toHaveCount(ENDING_REGISTRY.length);
        await expect(page.locator('.ending-records h2').filter({ hasText: '???' })).toHaveCount(ENDING_REGISTRY.length - 1);
        await expect(page.locator('.ending-records h2').filter({ hasText: t('story.ending.obeyed') })).toHaveCount(1);
      }
      if (route === 'help/reset') {
        await page.getByRole('button', { name: t('maintenance.full'), exact: true }).click();
        const erase = page.getByRole('button', { name: t('maintenance.erase'), exact: true });
        await expect(erase).toBeDisabled(); await page.locator('#reset-confirmation').fill(t('maintenance.word') + ' '); await expect(erase).toBeDisabled();
        await page.locator('#reset-confirmation').fill(t('maintenance.word')); await expect(erase).toBeEnabled();
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
        if (language === 'he' && width === 320) await page.screenshot({ path: 'test-results/maintenance-he-reset-320.png', fullPage: true });
        await page.getByRole('button', { name: t('maintenance.cancel'), exact: true }).click();
      }
    }
  }
  await page.getByRole('button', { name: t('maintenance.current'), exact: true }).click();
  expect((await snapshot(page)).sessionSeed).toBe(first.sessionSeed);
  await page.getByRole('button', { name: t('maintenance.current'), exact: true }).click();
  const restarted = await snapshot(page); expect(restarted.started).toBe(false); expect(restarted.previousRuns).toBe(1); expect(restarted.sessionSeed).not.toBe(first.sessionSeed); expect(restarted.sessionId).not.toBe(first.sessionId);
  expect(restarted.horror.previousEndings).toEqual(['obeyed']);
  await page.clock.runFor(9000); await page.getByRole('button', { name: t('intro.accept') }).click(); await system(page);
  await page.locator('.maintenance a[href="/help/reset"]').click(); await page.getByRole('button', { name: t('maintenance.full'), exact: true }).click();
  await page.locator('#reset-confirmation').fill(t('maintenance.word')); await page.getByRole('button', { name: t('maintenance.erase'), exact: true }).click();
  const cleared = await snapshot(page); expect(cleared.started).toBe(false); expect(cleared.previousRuns).toBe(0); expect(cleared.horror.previousEndings).toEqual([]); expect(cleared.visits).toEqual({});
  const stored = await page.evaluate(() => ({ meta: JSON.parse(localStorage.getItem('lying:meta:v1')), language: localStorage.getItem('lying:language'), effects: localStorage.getItem('lying:effects'), old: sessionStorage.getItem('lying:old'), legacy: localStorage.getItem('lying:run:v1'), unrelated: localStorage.getItem('unrelated'), unrelatedSession: sessionStorage.getItem('unrelated') }));
  expect(stored.meta).toEqual(emptyMeta()); expect(stored.language).toBe(language); expect(stored.effects).toBe('off'); expect(stored.old).toBeNull(); expect(stored.legacy).toBeNull(); expect(stored.unrelated).toBe('keep'); expect(stored.unrelatedSession).toBe('keep');
  await page.reload(); await expect(page.locator('html')).toHaveAttribute('lang', language); await expect(page.locator('html')).toHaveAttribute('dir', language === 'he' ? 'rtl' : 'ltr');
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('lying:run:v2')).previousRuns)).toBe(0);
  await page.clock.runFor(9000); await page.getByRole('button', { name: t('intro.accept') }).click(); await system(page); await page.locator('.maintenance a[href="/help/endings"]').click();
  await expect(page.locator('.ending-records h2').filter({ hasText: '???' })).toHaveCount(ENDING_REGISTRY.length);
  expect(errors).toEqual([]);
});
test('reset settings checkbox resets language and effects; language switch invalidates confirmation', async ({ page }) => {
  await boot(page, 'ru'); await page.locator('.ambient-control').click(); await expect(page.locator('.ambient-control')).toHaveAttribute('aria-pressed', 'true');
  await system(page); await page.locator('.maintenance a[href="/help/reset"]').click();
  await page.getByRole('button', { name: translations.ru['maintenance.full'], exact: true }).click();
  await page.locator('#reset-confirmation').fill('СБРОС'); await page.locator('.language-switcher button[lang="he"]').click();
  await expect(page.getByRole('button', { name: translations.he['maintenance.erase'] })).toBeDisabled();
  await page.locator('#reset-confirmation').fill(translations.he['maintenance.word']); await page.locator('.reset-settings input').check();
  await page.getByRole('button', { name: translations.he['maintenance.erase'] }).click();
  await expect(page.locator('html')).toHaveAttribute('lang', 'en'); await expect(page.locator('html')).toHaveAttribute('dir', 'ltr');
  expect(await page.evaluate(() => localStorage.getItem('lying:effects'))).toBeNull(); expect(await page.evaluate(() => localStorage.getItem('lying:audio'))).toBeNull(); expect((await snapshot(page)).previousRuns).toBe(0);
  await page.reload(); await expect(page.locator('html')).toHaveAttribute('lang', 'en');
});
test('audio preference survives full progress reset and refresh by default', async ({ page }) => {
  await boot(page); await page.locator('.ambient-control').click(); await system(page);
  await page.locator('.maintenance a[href="/help/reset"]').click(); await page.getByRole('button', { name: 'FULL RESET', exact: true }).click();
  await page.locator('#reset-confirmation').fill('RESET'); await page.getByRole('button', { name: 'ERASE EVERYTHING', exact: true }).click();
  expect(await page.evaluate(() => localStorage.getItem('lying:audio'))).toBe('on');
  await page.reload(); await page.clock.runFor(9000); await page.getByRole('button', { name: 'I UNDERSTAND' }).click();
  await expect(page.locator('.ambient-control')).toHaveAttribute('aria-pressed', 'true');
});
test('maintenance shields controls from active horror without consuming it, and the developer shortcut only opens the page', async ({ page }) => {
  const g = game(); g.act('START'); g.nav('help'); g.act('OPEN_MAINTENANCE'); g.nav('help/reset');
  const state = { ...g.state, redUntil: g.state.now + 32000, horror: { ...g.state.horror, active: { id: 'rules-black', at: g.state.now, until: g.state.now + 10000, level: 2 } } };
  await page.addInitScript(run => { if (!localStorage.getItem('lying:run:v2')) localStorage.setItem('lying:run:v2', run); }, serializeRun(state));
  await page.clock.install(); await page.clock.pauseAt(new Date()); await page.goto('/tests/fixtures/state-harness.html');
  await expect(page.locator('.horror-blackout')).toHaveCount(0); await expect(page.locator('.app')).not.toHaveClass(/red-state/);
  await page.getByRole('button', { name: translations.en['maintenance.full'], exact: true }).click();
  await page.locator('#reset-confirmation').fill('RESET'); await page.clock.runFor(1000); await expect(page.locator('#reset-confirmation')).toHaveValue('RESET');
  expect((await snapshot(page)).horror.active).toEqual(state.horror.active);
  await page.locator('.maintenance a[href="/help"]').click(); await expect(page.locator('.app')).toHaveClass(/red-state/);
  await page.keyboard.press('Control+Shift+Backspace'); await expect(page).toHaveURL(/\/help\/reset$/);
  expect((await snapshot(page)).sessionSeed).toBe(state.sessionSeed); await expect(page.locator('#reset-confirmation')).toHaveCount(0);
});
