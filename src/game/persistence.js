import { createInitialState, reconcileAuditSave } from './engine.js';
import { migrateAuditEvidence } from './rules.js';
import { initialHorror } from './HorrorDirector.js';
export const RUN_KEY = 'lying:run:v2';
export const META_KEY = 'lying:meta:v1';
export const emptyMeta = () => ({ completedRuns: 0, discoveredEndings: [], discoveredRule8: false, discoveredSecrets: [], completedIds: [] });
export function freshSeed() { return crypto.getRandomValues(new Uint32Array(1))[0]; }
export function readMeta(storage) {
  try {
    storage ??= globalThis.localStorage;
    const m = JSON.parse(storage.getItem(META_KEY));
    if (!m || !Number.isInteger(m.completedRuns) || m.completedRuns < 0 || !['completedIds', 'discoveredEndings', 'discoveredSecrets'].every(key => Array.isArray(m[key]))) return emptyMeta();
    return { ...emptyMeta(), ...m };
  } catch { return emptyMeta(); }
}
export function restoreRun(now, seed, previousRuns, storage) {
  try {
    storage ??= globalThis.localStorage;
    let s = JSON.parse(storage.getItem(RUN_KEY));
    if (s?.version !== 2 || !Array.isArray(s.fired) || !Array.isArray(s.delayed) || !s.puzzles || !s.responses || !Number.isFinite(s.now) || !Number.isFinite(s.sessionSeed)) throw new Error('Invalid run');
    const fresh = createInitialState(s.now, s.sessionSeed, previousRuns);
    s = migrateAuditEvidence(s);
    // Migrate existing runs in place: adding atmosphere must never restart a puzzle session.
    const validHorror = s.horror?.version === 1 && ['seen', 'pending', 'counts', 'history', 'previousEndings', 'coreSeen'].every(key => Array.isArray(s.horror[key])) && ['nextAt', 'lastMajorAt', 'silenceUntil', 'returnUntil'].every(key => Number.isFinite(s.horror[key]));
    if (!validHorror) s.horror = initialHorror();
    if (s.horror.active && (!Number.isFinite(s.horror.active.at) || !Number.isFinite(s.horror.active.until))) s.horror.active = null;
    for (const [key, value] of Object.entries(fresh)) {
      if (Array.isArray(value) && !Array.isArray(s[key])) throw new Error('Invalid list');
      if (typeof value === 'number' && !Number.isFinite(s[key])) throw new Error('Invalid clock or counter');
      if (value && typeof value === 'object' && !Array.isArray(value) && (!s[key] || typeof s[key] !== 'object' || Array.isArray(s[key]))) throw new Error('Invalid record');
    }
    return reconcileAuditSave({ ...createInitialState(s.now, s.sessionSeed, previousRuns), ...s, restoredAt: s.now });
  } catch { return createInitialState(now, seed, previousRuns); }
}
export function serializeRun(state) {
  // The alias is unnecessary for progression. Never persist player-supplied name text.
  const { name, ...run } = state;
  return JSON.stringify({ ...run, name: '', notice: state.notice?.textKey === 'event.name' ? { ...state.notice, textKey: 'story.msg.answered', params: {} } : state.notice });
}
export function updateMeta(meta, state) {
  const completed = state.ending && !meta.completedIds.includes(`${state.sessionId}:${state.sessionSeed}:${state.startedAt}`);
  const id = `${state.sessionId}:${state.sessionSeed}:${state.startedAt}`;
  return {
    completedRuns: meta.completedRuns + Number(Boolean(completed)),
    discoveredEndings: [...new Set([...meta.discoveredEndings, ...(state.ending ? [state.ending.id] : [])])],
    discoveredRule8: meta.discoveredRule8 || Boolean(state.flags.discoveredRule8),
    discoveredSecrets: [...new Set([...meta.discoveredSecrets, ...state.secrets])],
    completedIds: completed ? [...meta.completedIds, id].slice(-100) : meta.completedIds,
  };
}
