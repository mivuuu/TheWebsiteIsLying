import { test, expect } from '@playwright/test';
import { boot, nav, snapshot } from './helpers.js';
import { game } from '../helpers.js';
import { serializeRun } from '../../src/game/persistence.js';
import { translations } from '../../src/translations/index.js';
for (const lang of ['en', 'ru', 'he']) {
  test(`fresh observed mismatch accepts 05 after refresh (${lang})`, async ({ page }) => {
    await boot(page, lang); await nav(page, 'archive'); await page.locator('.version-button').first().click();
    await nav(page, 'rules'); await nav(page, 'status'); await nav(page, 'help');
    await nav(page, 'archive'); await page.locator('.version-button').first().click(); await nav(page, 'rules');
    await expect(page.locator('.rules-list li').nth(4)).toContainText(translations[lang]['rule.changed']);
    await page.reload(); await nav(page, 'status');
    for (const [i, value] of ['05', '6', '7'].entries()) await page.locator('.audit-fields input').nth(i).fill(value);
    await page.locator('.puzzle form .action').click();
    await expect(page.locator('.story-feedback')).toHaveText(translations[lang]['story.feedback.accepted']);
    await expect(page.locator('.story-receipt')).toHaveText(translations[lang]['story.status.checksum']);
    expect(await page.locator('.debug-panel').count()).toBe(0);
    if (lang === 'he') await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
  });
  test(`existing stuck save repairs on load and remains repaired (${lang})`, async ({ page }) => {
    const g = game(); g.act('START'); g.nav('archive'); g.act('OPEN_VERSION', { version: '3.2' }); g.nav('rules'); g.nav('status'); g.nav('rules'); g.nav('status');
    const stuck = structuredClone(g.state); delete stuck.auditEvidence; stuck.feedback = { key: 'story.feedback.mismatch' };
    await page.addInitScript(({ run, lang }) => { if (!localStorage.getItem('lying:run:v2')) localStorage.setItem('lying:run:v2', run); localStorage.setItem('lying:language', lang); }, { run: serializeRun(stuck), lang });
    await page.goto('/'); await expect(page.locator('.story-receipt')).toHaveText(translations[lang]['story.status.checksum']);
    await page.reload(); await expect(page.locator('.story-receipt')).toHaveText(translations[lang]['story.status.checksum']);
    const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('lying:run:v2')));
    expect(saved.sessionId).toBe(stuck.sessionId); expect(saved.visits).toEqual(stuck.visits); expect(saved.puzzles.audit).toBe(true);
    if (lang === 'he') await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
  });
}
