import test from 'node:test';
import assert from 'node:assert/strict';
import { game, audit, investigate, complete } from './helpers.js';
import { gameReducer, exitResponse } from '../src/game/engine.js';
import { endingEligibility, commitEligible, seedChance } from '../src/game/story.js';
import { restoreRun, serializeRun, emptyMeta, updateMeta, readMeta } from '../src/game/persistence.js';

test('orientation cannot bypass the investigation through the logo, exit, terminal or direct paths', () => {
  const g = game(); g.act('START'); g.act('LOGO');
  assert.deepEqual(g.state.rulesBroken, [1]); assert.equal(g.state.messages.length, 1);
  for (const page of ['page-7', 'old-rules', 'real-exit', 'null', 'admin']) { g.nav(page); assert.equal(g.state.page, '404'); }
  g.command('release admin'); g.act('COMPLETE'); assert.equal(g.state.ending, null);
  assert.ok(!g.state.unlocked.includes('page-7'));
});
test('rule mutation preserves the original and the audit requires observed evidence', () => {
  const g = game(); g.act('START'); g.act('SOLVE_AUDIT', { rule: 5, before: 6, after: 7 });
  assert.equal(g.state.puzzles.audit, false);
  audit(g); assert.equal(g.state.puzzles.audit, true);
  assert.notEqual(g.state.originalRules[4], g.state.currentRules[4]);
  assert.equal(g.state.messages.filter(m => m.textKey === 'event.admin').length, 1);
  g.act('TICK', {}, 60000); assert.equal(g.state.messages.filter(m => m.textKey === 'event.admin').length, 1);
});
test('red records waiting and clicking separately, without announcing the violation immediately', () => {
  for (const click of [false, true]) {
    const g = game(); audit(g); g.nav('archive'); g.act('TICK', {}, 3500);
    assert.ok(g.state.redUntil > g.state.now); if (click) g.act('CLICK');
    assert.equal(g.state.rulesBroken.includes(2), click);
    g.act('TICK', {}, 32000); assert.equal(g.state.redBehavior, click ? 'clicked' : 'waited');
    assert.ok(!g.state.fired.includes('red-memory'));
  }
});
test('five puzzles, three distinct missing routes, ordered terminal records and contradictions are required', () => {
  const g = game(); audit(g); g.act('SOLVE_ARCHIVE', { code: '6082' }); assert.equal(g.state.puzzles.archive, false);
  g.command('reconcile lock alias visitor'); assert.equal(g.state.puzzles.terminal, false);
  investigate(g); assert.ok(Object.values(g.state.puzzles).every(Boolean));
  assert.deepEqual(g.state.invalidRoutes, ['/missing-a', '/missing-b', '/missing-c']);
  assert.ok(g.state.flags.oldCorrupted); assert.ok(g.state.evidence.includes('them'));
});
test('answers are immutable, silence and hesitation are remembered without blocking investigation', () => {
  const g = game(); investigate(g, ['silent', 'silent', 'silent']);
  const responses = structuredClone(g.state.responses); g.reply('trust', 'yes'); assert.deepEqual(g.state.responses, responses);
  assert.equal(g.state.adminTrust, -3); assert.ok(g.state.fired.includes('admin-cold'));
  const h = game(); audit(h); h.nav('messages'); h.act('TICK', {}, 21000); h.reply('trust', 'no');
  assert.ok(h.state.responses.trust.hesitation >= 21000);
});
for (const [id, protocol, answers] of [
  ['obeyed', 'obey', ['no', 'no', 'no']], ['freed', 'release', ['yes', 'yes', 'no']],
  ['replaced', 'release', ['yes', 'yes', 'yes']], ['trapped', 'contain', ['yes', 'no', 'silent']],
  ['escaped', 'detach', ['no', 'silent', 'no']],
]) test(`${id}: full accumulated route reaches exactly one ending and stays locked`, () => {
  const g = investigate(game(), answers); complete(g, protocol);
  assert.equal(g.state.ending?.id, id); assert.equal(Object.values(endingEligibility(g.state)).filter(Boolean).length, 1);
  const before = g.state; g.act('LOGO'); g.act('REPLY', { question: 'identity', answer: 'yes' }); assert.deepEqual(g.state, before);
});
test('NULL requires all three optional discoveries and a route assembled by the player', () => {
  const g = investigate(game()); g.nav('null'); assert.equal(g.state.page, '404');
  g.nav('deleted'); g.act('SECRET', { key: 'null-deleted' });
  g.nav('mirror'); g.act('SECRET', { key: 'null-mirror' }); g.command('history --erased');
  g.nav('null'); g.act('COMPLETE'); assert.equal(g.state.ending.id, 'null');
});
test('all reply combinations retain a finishable route and no accepted release has a missing ending', () => {
  for (const a of ['yes', 'no', 'silent']) for (const b of ['yes', 'no', 'silent']) for (const c of ['yes', 'no', 'silent']) {
    const g = investigate(game(), [a, b, c]); g.command('release admin');
    if (commitEligible(g.state, 'release')) { complete(g, 'release'); assert.ok(g.state.ending, `${a}/${b}/${c}`); }
    else { complete(g, 'contain'); assert.equal(g.state.ending?.id, 'trapped'); }
  }
});
test('save restores progress and logical time, events do not repeat, aliases are omitted', () => {
  const g = investigate(game()); g.act('NAME', { name: 'Private alias' });
  const json = serializeRun(g.state); assert.ok(!json.includes('Private alias'));
  const restored = restoreRun(999999, 999, 0, { getItem: () => json });
  assert.equal(restored.now, g.state.now); assert.deepEqual(restored.responses, g.state.responses);
  const ticked = gameReducer(restored, { type: 'TICK', now: restored.now + 1 });
  assert.deepEqual(ticked.fired, restored.fired); assert.deepEqual(ticked.messages, restored.messages);
});
test('meta counts each ending once; restart clears run but preserves previous-run awareness', () => {
  const g = complete(investigate(game()), 'obey');
  const meta = updateMeta(emptyMeta(), g.state); assert.equal(meta.completedRuns, 1);
  assert.deepEqual(updateMeta(meta, g.state), meta);
  g.act('RESTART', { seed: 999, previousRuns: meta.completedRuns });
  assert.equal(g.state.started, false); assert.equal(g.state.previousRuns, 1); assert.deepEqual(g.state.responses, {});
  audit(g); assert.ok(g.state.fired.includes('returning-lie'));
});
test('corrupt or unavailable storage recovers safely', () => {
  for (const value of ['{', 'null', JSON.stringify({ ...game().state, messages: null })]) {
    assert.equal(restoreRun(100, 321, 2, { getItem: () => value }).sessionSeed, 321);
  }
  const blocked = { getItem() { throw Error('blocked'); } };
  assert.equal(restoreRun(100, 321, 2, blocked).previousRuns, 2); assert.deepEqual(readMeta(blocked), emptyMeta());
});
test('rare events are deterministic per run and use independent 5/2/1 percent thresholds', () => {
  for (const [key, threshold] of [['zero', .05], ['third', .02], ['wrong', .01]]) {
    let count = 0; for (let seed = 0; seed < 20000; seed++) { const value = seedChance(seed, key); assert.equal(value, seedChance(seed, key)); if (value < threshold) count++; }
    assert.ok(Math.abs(count / 20000 - threshold) < .008);
  }
});
test('terminal input is a closed simulation and exit answers reflect the real rule record', () => {
  const g = game(); g.act('START'); g.command('globalThis.pwned = true');
  assert.equal(g.state.terminalHistory.at(-1).key, 'story.term.unknown'); assert.equal(globalThis.pwned, undefined);
  g.nav('exit'); g.act('EXIT_ANSWER', { answer: 'yes' }); assert.equal(exitResponse(g.state).key, 'exit.obedient');
  g.act('LOGO'); assert.equal(exitResponse(g.state).params.numbers, '01'); g.act('COMPLETE'); assert.equal(g.state.ending, null);
});

test('delayed memories require elapsed time and progress, then survive refresh without repetition', () => {
  const g = game(); g.act('START'); g.act('LOGO'); investigate(g);
  assert.ok(!g.state.fired.includes('logo-memory'));
  for (let i = 0; i < 60 && !g.state.fired.includes('logo-memory'); i++) g.act('TICK', {}, 30000);
  assert.ok(g.state.fired.includes('logo-memory'));
  assert.equal(g.state.messages.filter(m => m.textKey === 'story.msg.logo').length, 1);
  const restored = restoreRun(900000, 1, 0, { getItem: () => serializeRun(g.state) });
  const next = gameReducer(restored, { type: 'TICK', now: restored.now + 120000 });
  assert.equal(next.messages.filter(m => m.textKey === 'story.msg.logo').length, 1);
});


