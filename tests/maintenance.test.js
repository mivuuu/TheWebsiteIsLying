import test from 'node:test';
import assert from 'node:assert/strict';
import { game, investigate, complete } from './helpers.js';
import { emptyMeta, updateMeta, readMeta, serializeRun, restoreRun } from '../src/game/persistence.js';
import { recordEnding, ENDING_REGISTRY } from '../src/game/endings.js';
import { clearGameStorage, STORAGE_KEYS } from '../src/game/storage.js';

test('ending registry records unique discoveries and every new completed run exactly once', () => {
  const first = complete(investigate(game()), 'obey').state;
  let meta = updateMeta(emptyMeta(), first);
  const record = structuredClone(meta.endingRecords.obeyed);
  assert.deepEqual(updateMeta(meta, first), meta);
  const second = { ...first, sessionSeed: 999, startedAt: first.startedAt + 1000 };
  meta = updateMeta(meta, second);
  assert.equal(meta.completedRuns, 2); assert.equal(meta.discoveredEndings.length, 1);
  assert.deepEqual(meta.endingRecords.obeyed, record);
  meta = recordEnding(meta, 'escaped', { id: 'third', discoveredAt: 999, duration: 100, rules: [], pages: 5 });
  assert.equal(meta.completedRuns, 3); assert.equal(meta.discoveredEndings.length, 2);
  assert.equal(meta.runHistory.length, 3);
  assert.equal(new Set(ENDING_REGISTRY.map(e => e.id)).size, ENDING_REGISTRY.length);
  assert.equal(recordEnding(meta, 'fake', { id: 'bad' }), meta);
});
test('old ending metadata migrates without fabricating discovery dates', () => {
  const old = { completedRuns: 3, discoveredEndings: ['obeyed'], discoveredSecrets: ['secret'], completedIds: ['old'], discoveredRule8: true };
  const meta = readMeta({ getItem: () => JSON.stringify(old) });
  assert.deepEqual(meta.endingRecords, {}); assert.equal(meta.completedRuns, 3); assert.deepEqual(meta.discoveredEndings, ['obeyed']);
});
test('maintenance is discovered through help, preserves progression and restores its route', () => {
  const g = game(); g.act('START'); g.nav('help/system'); assert.equal(g.state.page, '404');
  g.nav('help'); const before = structuredClone(g.state);
  g.act('OPEN_MAINTENANCE'); g.nav('help/endings');
  g.act('CLICK'); g.act('LOGO'); g.act('TICK', {}, 10000);
  for (const key of ['visits', 'puzzles', 'rulesBroken', 'currentRules', 'horror', 'messages', 'fired', 'actionCount', 'clicks']) assert.deepEqual(g.state[key], before[key], key);
  const restored = restoreRun(999, 999, 0, { getItem: () => serializeRun(g.state) });
  assert.equal(restored.page, 'help/endings'); assert.equal(restored.flags.maintenanceDiscovered, true);
  g.act('RESTART', { seed: 789, previousRuns: 3, previousEndings: ['obeyed'] });
  assert.equal(g.state.started, false); assert.deepEqual(g.state.visits, {}); assert.equal(g.state.flags.maintenanceDiscovered, undefined);
  assert.deepEqual(g.state.horror.previousEndings, ['obeyed']); assert.equal(g.state.previousRuns, 3);
});
test('full storage cleanup removes current and legacy game keys in both stores, preserves unrelated data and optional settings', () => {
  function storage() {
    const map = new Map(Object.values(STORAGE_KEYS).map(key => [key, 'value']).concat([['lying:run:v1', 'old'], ['another-app', 'keep']]));
    return { get length() { return map.size; }, key: i => [...map.keys()][i], removeItem: key => map.delete(key), getItem: key => map.get(key) };
  }
  const stores = [storage(), storage()]; clearGameStorage(false, stores);
  for (const store of stores) {
    assert.equal(store.getItem(STORAGE_KEYS.run), undefined); assert.equal(store.getItem(STORAGE_KEYS.meta), undefined);
    assert.equal(store.getItem('lying:run:v1'), undefined); assert.equal(store.getItem(STORAGE_KEYS.language), 'value'); assert.equal(store.getItem(STORAGE_KEYS.audio), 'value');
  }
  clearGameStorage(true, stores);
  for (const store of stores) { assert.equal(store.length, 1); assert.equal(store.getItem('another-app'), 'keep'); }
});
