import { RED_DURATION, SEVEN_DEPARTURE } from '../../src/game/HorrorDirector.js';
import { expect } from '@playwright/test';
import { translations } from '../../src/translations/index.js';
export const switchTo = (page, language) => page.locator(`.language-switcher button[lang="${language}"]`).click();
export const snapshot = page => page.evaluate(() => structuredClone(window.__gameState));
export async function boot(page, language = 'en', harness = true) {
  await page.addInitScript(lang => { if (!localStorage.getItem('lying:language')) localStorage.setItem('lying:language', lang); }, language);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.clock.install({ time: new Date('2026-09-12T12:00:00Z') });
  await page.clock.pauseAt(new Date('2026-09-12T12:00:00Z'));
  await page.goto(harness ? '/tests/fixtures/state-harness.html' : '/');
  await page.clock.runFor(9000);
  await page.getByRole('button', { name: translations[language]['intro.accept'] }).click();
}
export async function nav(page, route) {
  if (new URL(page.url()).pathname === `/${route}`) return;
  const direct = page.locator(`a[href="/${route}"]:visible`).first();
  if (await direct.count()) await direct.click();
  else {
    if (!(await page.locator('#route-address').count())) {
      const details = page.locator('.service-directory');
      if (!(await details.getAttribute('open'))) { if (!(await page.locator('a[href="/help"]:visible').count())) await details.locator('summary').click(); }
      await page.locator('a[href="/help"]:visible').first().click();
    }
    await page.locator('#route-address').fill(`/${route}`);
    await page.locator('.route-entry button').click();
  }
}
export async function command(page, value) { await nav(page, 'terminal'); await page.locator('#terminal-command').fill(value); await page.locator('#terminal-command').press('Enter'); }
export async function reply(page, answer) { await nav(page, 'messages'); await page.locator('.conversation button').nth(['yes', 'no', 'silent'].indexOf(answer)).click(); }
export async function audit(page) {
  await nav(page, 'rules'); await nav(page, 'archive'); await page.locator('.version-button').nth(0).click();
  await nav(page, 'about'); await nav(page, 'rules'); await nav(page, 'status');
  for (const [i, value] of ['5', '6', '7'].entries()) await page.locator('.audit-fields input').nth(i).fill(value);
  await page.locator('.puzzle form .action').click();
  expect((await snapshot(page)).puzzles.audit).toBe(true);
}
export async function investigate(page, answers = ['no', 'no', 'no']) {
  await audit(page); await nav(page, 'archive'); await page.clock.runFor(3500);
  await expect(page.locator('.app')).toHaveClass(/red-state/); await page.clock.runFor(RED_DURATION);
  await reply(page, answers[0]); await nav(page, 'files'); await page.locator('.file-button').filter({ hasText: 'notice.txt' }).click();
  await nav(page, 'page-7'); await page.clock.runFor(11000); await expect(page.locator('.hidden-page p')).toBeVisible();
  await page.clock.runFor(SEVEN_DEPARTURE - 11000); await expect(page).toHaveURL(/\/files$/);
  await reply(page, answers[1]); await nav(page, 'logs'); await nav(page, 'users'); await nav(page, 'archive');
  await page.locator('.version-button').nth(2).click(); await page.locator('.puzzle input').fill('6082'); await page.locator('.puzzle form .action').click();
  await page.locator('.version-button').nth(3).click();
  for (const route of ['missing-a', 'missing-b', 'missing-c', 'old-rules']) await nav(page, route);
  await expect(page).toHaveURL(/\/old-rules$/); await page.clock.runFor(2000);
  await nav(page, 'archive'); await page.locator('.version-button').nth(4).click();
  await nav(page, 'files'); for (const file of ['recovery.dat', 'session.log', 'admin.lock', 'readme.old']) await page.locator('.file-button').filter({ hasText: file }).click();
  await command(page, 'trace origin'); await command(page, 'reconcile lock alias visitor');
  await reply(page, answers[2]); await nav(page, 'mirror');
  await page.locator('.claim input').nth(0).check(); await page.locator('.claim input').nth(1).check(); await page.locator('.puzzle > .action').click();
  expect(Object.values((await snapshot(page)).puzzles).every(Boolean)).toBe(true);
}
export async function finish(page, protocol) {
  await command(page, { obey: 'seal admin', release: 'release admin', contain: 'seal admin', detach: 'disconnect claims' }[protocol]);
  await nav(page, protocol === 'obey' ? 'status' : protocol === 'detach' ? 'mirror' : 'admin');
  await page.locator('.protocol').nth(protocol === 'contain' ? 1 : 0).locator('button').click();
  await expect(page).toHaveURL(/\/users$/); await page.locator('.puzzle > .action').click();
  await nav(page, 'real-exit'); await page.locator('.page-content > .action').click();
}

