import test from 'node:test';
import assert from 'node:assert/strict';
import { game, investigate, complete } from './helpers.js';
import { gameReducer } from '../src/game/engine.js';
import { initialHorror, advanceHorror, horrorView, HORROR_EVENTS, BLOCKING_EVENTS, MINUTE, RED_DURATION } from '../src/game/HorrorDirector.js';
import { seedChance } from '../src/game/story.js';
import { restoreRun, serializeRun } from '../src/game/persistence.js';

const gameplay = s => Object.fromEntries(['puzzles','responses','adminTrust','websiteTrust','rulesBroken','originalRules','currentRules','choices','unlocked','visits','ending','sessionId'].map(key => [key,s[key]]));
function fixture(id, page, action = { type: 'TICK' }) {
  const g = investigate(game(12345, 1)); const s = structuredClone(g.state);
  s.now = s.startedAt + 32 * MINUTE; s.enteredAt = s.now - 1000; s.page = page; s.redUntil = 0; s.previousRuns = 1; s.delayed = [];
  if (id === 'false-ending') s.exitAnswer = 'yes';
  s.visits.users = 2; s.horror = initialHorror(['null', 'replaced', 'escaped']); s.horror.nextAt = 0;
  s.horror.seen = HORROR_EVENTS.filter(e => e.id !== id).map(e => e.id);
  const def = HORROR_EVENTS.find(e => e.id === id);
  for (let seed = 0; seed < 100000; seed++) if (seedChance(seed, `horror:${id}`) < (def.chance ?? 1)) { s.sessionSeed = seed; break; }
  const previous = { ...s, page: 'home' }; const next = advanceHorror(s, action, previous);
  assert.equal(next.horror.active?.id, id, id); return next;
}
test('all director events have deterministic reachable conditions and preserve gameplay', () => {
  const cases = {
    period: ['home'], 'lower-line': ['about'], 'hover-label': ['about', { type: 'NAVIGATE' }], 'empty-cursor': ['home'], 'cursor-loss': ['about'], 'ghost-line': ['about'],
    'rule-answer': ['rules'], 'rule-question': ['rules'], 'nav-duplicate': ['about', { type: 'NAVIGATE' }], 'sender-missing': ['messages'], 'late-navigation': ['files', { type: 'NAVIGATE' }],
    'typing-abandoned': ['messages'], incomplete: ['messages'], 'false-log': ['logs'], 'users-count': ['users'], 'duplicate-visitor': ['users'],
    'rules-black': ['rules', { type: 'NAVIGATE' }], 'wrong-page': ['files', { type: 'NAVIGATE' }], 'terminal-users': ['terminal', { type: 'COMMAND', command: 'users' }],
    'tab-title': ['about', { type: 'VISIBILITY', hidden: true }], 'missed-it': ['rules', { type: 'VISIBILITY', hidden: false }], 'room-silence': ['about', { type: 'NAVIGATE' }],
    'visitor-missing': ['users'], 'identity-slip': ['terminal', { type: 'COMMAND', command: 'whoami' }], 'status-visitor': ['status'], 'false-memory': ['messages'],
    'empty-page': ['files', { type: 'NAVIGATE' }], 'wrong-sender': ['messages'], 'null-memory': ['logs'], 'chair-memory': ['messages'], 'escaped-memory': ['home'], zero: ['rules'], third: ['users'], wrong: ['home'],
  };
  for (const [id, [page, action]] of Object.entries(cases)) {
    const active = fixture(id, page, action); const before = gameplay(active);
    const next = gameReducer(active, { type: 'TICK', now: active.now + 20000 }); assert.deepEqual(gameplay(next), before, id);
    assert.equal(next.horror.seen.filter(key => key === id).length, 1);
  }
});
test('first five minutes are quiet and clocks cannot trigger a burst after a long absence', () => {
  const g = game(); g.act('START'); g.nav('about'); g.act('TICK', {}, 299000); assert.equal(g.state.horror.history.length, 0);
  const base = fixture('lower-line', 'about'); const later = gameReducer(base, { type: 'TICK', now: base.now + 20 * MINUTE });
  assert.ok(later.horror.history.length <= base.horror.history.length + 1);
});
test('wrong sender corrects visually and only ADMIN is stored in the message and log', () => {
  const s = fixture('wrong-sender', 'messages'); assert.equal(horrorView(s).wrongSender, true);
  assert.equal(s.messages.at(-1).from, 'ADMIN'); assert.equal(s.log.at(-1).key, 'horror.log.admin');
  const saved = restoreRun(9999999, 1, 1, { getItem: () => serializeRun(s) });
  const later = gameReducer(saved, { type: 'TICK', now: s.now + 4100 }); assert.equal(horrorView(later).wrongSender, false);
  assert.deepEqual(later.messages, JSON.parse(JSON.stringify(s.messages))); assert.deepEqual(later.log, s.log);
});
test('whoami identity is a 300ms projection and never becomes terminal history', () => {
  const s = fixture('identity-slip', 'terminal', { type: 'COMMAND', command: 'whoami' });
  assert.equal(horrorView(s).terminalAdmin, false);
  const middle = gameReducer(s, { type: 'TICK', now: s.now + 600 }); assert.equal(horrorView(middle).terminalAdmin, true);
  const saved = restoreRun(9999999, 1, 0, { getItem: () => serializeRun(middle) });
  const end = gameReducer(saved, { type: 'TICK', now: s.now + 900 }); assert.equal(horrorView(end).terminalAdmin, false);
  assert.deepEqual(end.terminalHistory, s.terminalHistory); assert.ok(!JSON.stringify(end.terminalHistory).includes('sender.ADMIN'));
});
test('red sequence stays interactive and page-7 reveals have finite exits on every visit', () => {
  const s = investigate(game()).state;
  for (const [age, typing, line] of [[0,false,null],[8000,true,null],[15000,false,'horror.dont'],[22000,false,null],[27000,false,'horror.inputAvailable']]) {
    const view = horrorView({ ...s, redUntil: s.now + RED_DURATION - age }); assert.equal(view.typing, typing); assert.equal(view.redLine, line);
  }
  for (const visit of [1,2,3,4]) {
    const base = { ...s, page: 'page-7', enteredAt: s.now, visits: { ...s.visits, 'page-7': visit } };
    assert.equal(horrorView(base).sevenReturn, false); assert.equal(horrorView({ ...base, now: base.now + 22000 }).sevenReturn, true);
    const leave = gameReducer(base, { type: 'NAVIGATE', page: 'files', now: base.now + 1 }); assert.equal(leave.page, 'files');
  }
});
test('budget caps, cooldowns, and one level-four event hold over extended seeded sessions', () => {
  for (let seed = 1; seed <= 12; seed++) {
    let s = investigate(game(seed)).state; s = { ...s, previousRuns: 1, horror: initialHorror(['replaced']), delayed: [] };
    const routes = ['home','about','rules','messages','users','files','logs','terminal','status'];
    for (let tick = 1; tick <= 480; tick++) {
      const previous = s; s = { ...s, now: s.startedAt + tick * 5000, page: routes[Math.floor(tick / 3) % routes.length] };
      s = advanceHorror(s, { type: tick % 3 === 0 ? 'NAVIGATE' : 'TICK' }, previous);
    }
    assert.ok(s.horror.counts[1] <= 10); assert.ok(s.horror.counts[2] <= 5); assert.ok(s.horror.counts[3] <= 2); assert.ok(s.horror.counts[4] <= 1);
    const history = s.horror.history;
    for (let i = 1; i < history.length; i++) assert.ok(history[i].at - history[i-1].at >= 90000);
    const majors = history.filter(e => e.level >= 3); for (let i = 1; i < majors.length; i++) assert.ok(majors[i].at - majors[i-1].at >= 240000);
  }
});
test('old saves migrate without losing puzzles; active anomalies and cooldowns survive refresh', () => {
  const s = investigate(game()).state; const old = { ...s }; delete old.horror;
  const migrated = restoreRun(9999999, 1, 0, { getItem: () => serializeRun(old) }); assert.deepEqual(gameplay(migrated), gameplay(s));
  const active = fixture('empty-page', 'files', { type: 'NAVIGATE' }); const restored = restoreRun(9999999, 1, 0, { getItem: () => serializeRun(active) });
  assert.deepEqual(restored.horror, active.horror); const end = gameReducer(restored, { type: 'TICK', now: restored.horror.active.until + 1 }); assert.equal(horrorView(end).overlay, null);
  const dismiss = gameReducer(active, { type: 'HORROR_DISMISS', now: active.now }); assert.equal(dismiss.horror.active, null); assert.deepEqual(gameplay(active), gameplay(dismiss));
});
test('actual endings preempt atmosphere and preserve the final outcome', () => {
  const ended = complete(investigate(game()), 'obey').state;
  const next = gameReducer(ended, { type: 'TICK', now: ended.now + 40 * MINUTE }); assert.deepEqual(next.ending, ended.ending); assert.deepEqual(next.horror, ended.horror);
});
test('false ending is eligible only before commitment, resumes once and awards nothing', () => {
  const s = fixture('false-ending', 'exit');
  const next = gameReducer(s, { type: 'TICK', now: s.horror.active.until });
  assert.equal(next.page, 'home'); assert.equal(next.ending, null); assert.deepEqual(next.puzzles, s.puzzles);
  assert.ok(next.horror.seen.includes('false-ending'));
});
test('wrong-sender eligibility is rare, stable, and absent without a previous completed run', () => {
  let eligible = 0; for (let seed = 0; seed < 20000; seed++) if (seedChance(seed, 'horror:wrong-sender') < .025) eligible++;
  assert.ok(eligible > 350 && eligible < 650);
  const s = fixture('wrong-sender', 'messages'); const fresh = { ...s, previousRuns: 0, horror: { ...initialHorror(), seen: HORROR_EVENTS.filter(e => e.id !== 'wrong-sender').map(e => e.id), nextAt: 0 } };
  assert.equal(advanceHorror(fresh, { type: 'TICK' }, fresh).horror.active, null);
});

