import test from 'node:test';
import assert from 'node:assert/strict';
import { game } from './helpers.js';
import { gameReducer } from '../src/game/engine.js';
import { auditDiagnostics, renderedRules } from '../src/game/rules.js';
import { serializeRun, restoreRun } from '../src/game/persistence.js';
export function observedAudit() {
  const g = game(); g.act('START'); g.nav('archive'); g.act('OPEN_VERSION', { version: '3.2' });
  g.nav('rules'); g.nav('status'); // The canonical mutation happens while away from Rules.
  g.nav('help'); g.nav('archive'); g.act('OPEN_VERSION', { version: '3.2' }); g.nav('rules'); g.nav('status');
  return g.state;
}
test('05 / 6 / 7 succeeds from observed canonical evidence, including stale flag and refresh', () => {
  const s = observedAudit(); s.flags.rulesChanged = false;
  const restored = restoreRun(999999, 2, 0, { getItem: () => serializeRun(s) });
  const result = gameReducer(restored, { type: 'SOLVE_AUDIT', rule: '05', before: '6', after: '7', now: restored.now + 1 });
  assert.equal(result.puzzles.audit, true); assert.equal(result.feedback.key, 'story.feedback.accepted');
  assert.ok(result.unlocked.includes('files')); assert.equal(result.stage, 'doubt');
  assert.deepEqual(auditDiagnostics(s).expectedMismatchAnswer, { rule: 5, before: 6, after: 7 });
});
test('archive then observation is required; knowing the answer before observing it is insufficient', () => {
  const g = game(); g.act('START'); g.nav('rules'); g.nav('archive'); g.act('OPEN_VERSION', { version: '3.2' }); g.nav('status');
  g.act('SOLVE_AUDIT', { rule: '05', before: '6', after: '7' }); assert.equal(g.state.puzzles.audit, false);
  g.nav('rules'); g.nav('status'); g.act('SOLVE_AUDIT', { rule: '05', before: '6', after: '7' }); assert.equal(g.state.puzzles.audit, true);
});
test('hallucination cannot change Rule 05; validation follows current rule identity rather than a constant', () => {
  const s = observedAudit(); const rendered = renderedRules(s, { rule4: 'horror.rule.why', rule5: 'rule.5' });
  assert.equal(rendered[4], s.currentRules[4]); assert.notEqual(rendered[3], s.currentRules[3]);
  const changed = { ...s, currentRules: s.currentRules.map((key, i) => i === 4 ? 'rule.5' : key) };
  const result = gameReducer(changed, { type: 'SOLVE_AUDIT', rule: '05', before: '6', after: '7', now: s.now });
  assert.equal(result.puzzles.audit, false);
});
test('stuck legacy save reconciles once without resetting session or HorrorDirector', () => {
  const stuck = observedAudit(); delete stuck.auditEvidence;
  stuck.feedback = { key: 'story.feedback.mismatch' }; stuck.flags.rulesChanged = false;
  const restored = restoreRun(999999, 2, 0, { getItem: () => serializeRun(stuck) });
  assert.equal(restored.puzzles.audit, true); assert.equal(restored.feedback.key, 'story.feedback.accepted');
  for (const key of ['sessionId', 'sessionSeed', 'startedAt', 'visits', 'rulesBroken', 'horror', 'responses']) assert.deepEqual(restored[key], stuck[key]);
  const twice = restoreRun(9999999, 3, 0, { getItem: () => serializeRun(restored) });
  assert.deepEqual(twice.messages, JSON.parse(JSON.stringify(restored.messages))); assert.deepEqual(twice.fired, restored.fired);
});
