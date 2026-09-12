import { createContext, useCallback, useContext, useEffect, useReducer, useRef, useState } from 'react';
import { gameReducer } from './engine.js';
import { readMeta, restoreRun, serializeRun, updateMeta, freshSeed, RUN_KEY, META_KEY } from './persistence.js';
import { horrorView } from './HorrorDirector.js';
const GameContext = createContext(null);
export function GameProvider({ children }) {
  const [meta, setMeta] = useState(readMeta);
  const [state, rawDispatch] = useReducer(gameReducer, undefined, () => {
    const saved = restoreRun(Date.now(), freshSeed(), meta.completedRuns);
    saved.horror.previousEndings = meta.discoveredEndings;
    // A reload restores the neutral registry presentation, not a stale visual double.
    if (['visitor-missing', 'users-count', 'duplicate-visitor'].includes(saved.horror.active?.id)) saved.horror.active = null;
    const requested = location.pathname.slice(1);
    if (saved.started && requested && !requested.startsWith('tests/') && requested !== saved.page) return gameReducer(saved, { type: 'NAVIGATE', page: requested, now: saved.now });
    return saved;
  });
  const offset = useRef(state.now - Date.now());
  const stateRef = useRef(state); stateRef.current = state;
  const lastSave = useRef({ at: -Infinity, signature: '' });
  const metaRef = useRef(meta); metaRef.current = meta;
  const [reducedHorror, setReducedHorror] = useState(() => {
    try { return localStorage.getItem('lying:reduced-horror') === 'on' || matchMedia('(prefers-reduced-motion: reduce)').matches; } catch { return true; }
  });
  useEffect(() => {
    const media = matchMedia('(prefers-reduced-motion: reduce)');
    const change = () => { if (media.matches) setReducedHorror(true); };
    media.addEventListener('change', change); return () => media.removeEventListener('change', change);
  }, []);
  const [effects, setEffects] = useState(() => {
    try { return localStorage.getItem('lying:effects') !== 'off' && !matchMedia('(prefers-reduced-motion: reduce)').matches; }
    catch { return false; }
  });
  const dispatch = useCallback(action => rawDispatch({ ...action, now: Date.now() + offset.current }), []);
  const restart = useCallback(() => {
    offset.current = 0;
    const completed = updateMeta(metaRef.current, stateRef.current);
    rawDispatch({ type: 'RESTART', now: Date.now(), seed: freshSeed(), previousRuns: completed.completedRuns, previousEndings: completed.discoveredEndings });
  }, []);
  const navigate = useCallback(page => dispatch({ type: 'NAVIGATE', page }), [dispatch]);
  useEffect(() => {
    if (!state.started) return;
    const interval = setInterval(() => dispatch({ type: 'TICK' }), 100);
    return () => clearInterval(interval);
  }, [state.started, dispatch]);
  useEffect(() => {
    if (state.ending?.id === 'null' && state.now - state.ending.at >= 5000) restart();
  }, [state.ending, state.now, restart]);
  useEffect(() => {
    const save = () => { try { localStorage.setItem(RUN_KEY, serializeRun(stateRef.current)); } catch { /* Optional local storage. */ } };
    const signature = [state.actionCount, state.clicks, state.fired.length, state.ending?.id, state.page, state.horror.active?.id, state.horror.seen.length, state.horror.hidden, state.horror.dismissed].join('|');
    if (signature !== lastSave.current.signature || Math.abs(state.now - lastSave.current.at) >= 1000) {
      save(); lastSave.current = { at: state.now, signature };
    }
  }, [state]);
  useEffect(() => {
    const save = () => { try { localStorage.setItem(RUN_KEY, serializeRun(stateRef.current)); } catch { /* Optional local storage. */ } };
    addEventListener('pagehide', save);
    return () => removeEventListener('pagehide', save);
  }, []);
  useEffect(() => {
    setMeta(previous => {
      const next = updateMeta(previous, state);
      if (JSON.stringify(next) === JSON.stringify(previous)) return previous;
      try { localStorage.setItem(META_KEY, JSON.stringify(next)); } catch { /* Optional local storage. */ }
      return next;
    });
  }, [state.ending, state.flags.discoveredRule8, state.secrets]);
  useEffect(() => {
    const url = state.started ? `/${state.page}` : '/';
    if (location.pathname !== url) history.pushState({}, '', url);
  }, [state.page, state.started]);
  useEffect(() => {
    const onBack = () => navigate(location.pathname.slice(1) || 'home');
    const onVisibility = () => dispatch({ type: 'VISIBILITY', hidden: document.hidden });
    addEventListener('popstate', onBack); document.addEventListener('visibilitychange', onVisibility);
    return () => { removeEventListener('popstate', onBack); document.removeEventListener('visibilitychange', onVisibility); };
  }, [navigate, dispatch]);
  const toggleEffects = () => setEffects(value => {
    try { localStorage.setItem('lying:effects', value ? 'off' : 'on'); } catch { /* Preferences are optional. */ }
    return !value;
  });
  const toggleReducedHorror = () => setReducedHorror(value => { try { localStorage.setItem('lying:reduced-horror', value ? 'off' : 'on'); } catch { /* Optional preference. */ } return !value; });
  const horror = horrorView(state);
  return <GameContext.Provider value={{ state, meta, dispatch, navigate, restart, effects, toggleEffects, horror, reducedHorror, toggleReducedHorror }}>{children}</GameContext.Provider>;
}
export const useGame = () => useContext(GameContext);
