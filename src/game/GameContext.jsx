import { createContext, useCallback, useContext, useEffect, useReducer, useRef, useState } from 'react';
import { gameReducer } from './engine.js';
import { readMeta, restoreRun, serializeRun, updateMeta, freshSeed, emptyMeta, RUN_KEY, META_KEY } from './persistence.js';
import { STORAGE_KEYS, GAME_STORAGE_KEYS, clearGameStorage } from './storage.js';
import { ENDING_REGISTRY, recordEnding } from './endings.js';
import { isMaintenance } from './maintenance.js';
import { useLanguage } from '../translations/LanguageContext.jsx';
import { horrorView } from './HorrorDirector.js';
import { routeUrl, routeFromPath } from './routes.js';
const GameContext = createContext(null);
export function GameProvider({ children }) {
  const { setLanguage, t } = useLanguage();
  const [meta, setMeta] = useState(readMeta);
  const [state, rawDispatch] = useReducer(gameReducer, undefined, () => {
    const saved = restoreRun(Date.now(), freshSeed(), meta.completedRuns);
    saved.horror.previousEndings = meta.discoveredEndings;
    // A reload restores the neutral registry presentation, not a stale visual double.
    if (['visitor-missing', 'users-count', 'duplicate-visitor'].includes(saved.horror.active?.id)) saved.horror.active = null;
    const requested = routeFromPath(location.pathname);
    if (saved.started && requested && !requested.startsWith('tests/') && requested !== saved.page) return gameReducer(saved, { type: 'NAVIGATE', page: requested, now: saved.now });
    return saved;
  });
  const offset = useRef(state.now - Date.now());
  const stateRef = useRef(state); stateRef.current = state;
  const lastSave = useRef({ at: -Infinity, signature: '' });
  const metaRef = useRef(meta); metaRef.current = meta;
  const [effects, setEffects] = useState(() => {
    try { return localStorage.getItem(STORAGE_KEYS.effects) !== 'off' && !matchMedia('(prefers-reduced-motion: reduce)').matches; }
    catch { return false; }
  });
  const [audioEnabled, setAudioState] = useState(() => { try { return localStorage.getItem(STORAGE_KEYS.audio) === 'on'; } catch { return false; } });
  const setAudioEnabled = useCallback(value => {
    setAudioState(value);
    try { localStorage.setItem(STORAGE_KEYS.audio, value ? 'on' : 'off'); } catch { /* Optional preference. */ }
  }, []);
  const dispatch = useCallback(action => rawDispatch({ ...action, now: Date.now() + offset.current }), []);
  const writeMeta = useCallback(next => {
    metaRef.current = next; setMeta(next);
    try { localStorage.setItem(META_KEY, JSON.stringify(next)); } catch { /* Optional storage. */ }
  }, []);
  const resetRun = useCallback(completed => {
    offset.current = 0;
    let seed = freshSeed();
    if (seed % 9000 === stateRef.current.sessionSeed % 9000) seed = (seed + 1) >>> 0;
    const next = gameReducer(stateRef.current, { type: 'RESTART', now: Date.now(), seed, previousRuns: completed.completedRuns, previousEndings: completed.discoveredEndings });
    stateRef.current = next;
    lastSave.current = { at: -Infinity, signature: '' };
    // Persist before returning to the intro, including immediate refresh/pagehide.
    try { localStorage.setItem(RUN_KEY, serializeRun(next)); } catch { /* Optional storage. */ }
    rawDispatch({ type: 'RESTART', now: next.now, seed, previousRuns: completed.completedRuns, previousEndings: completed.discoveredEndings });
  }, []);
  const restart = useCallback(() => {
    const completed = updateMeta(metaRef.current, stateRef.current);
    writeMeta(completed); resetRun(completed);
  }, [writeMeta, resetRun]);
  const fullReset = useCallback((confirmation, resetSettings = false) => {
    if (confirmation !== t('maintenance.word')) return;
    clearGameStorage(resetSettings);
    const cleared = emptyMeta(); writeMeta(cleared); resetRun(cleared);
    if (resetSettings) { setLanguage('en'); setEffects(!matchMedia('(prefers-reduced-motion: reduce)').matches); setAudioState(false); }
  }, [writeMeta, resetRun, setLanguage, t]);
  const debug = import.meta.env.DEV ? {
    registry: ENDING_REGISTRY, storageKeys: GAME_STORAGE_KEYS,
    unlockEnding: id => writeMeta(recordEnding(metaRef.current, id, { id: `debug:${freshSeed()}:${Date.now()}`, discoveredAt: Date.now(), duration: state.now - state.startedAt, rules: [...state.rulesBroken], pages: Object.keys(state.visits).length })),
    clearCurrentRun: restart,
    clearMeta: () => { const cleared = emptyMeta(); writeMeta(cleared); resetRun(cleared); },
  } : undefined;
  const navigate = useCallback(page => dispatch({ type: 'NAVIGATE', page }), [dispatch]);
  useEffect(() => {
    if (!import.meta.env.DEV) return;
    const openReset = event => {
      if (event.ctrlKey && event.shiftKey && event.key === 'Backspace' && stateRef.current.started && !stateRef.current.ending) {
        event.preventDefault();
        dispatch({ type: 'NAVIGATE', page: 'help' }); dispatch({ type: 'OPEN_MAINTENANCE' }); dispatch({ type: 'NAVIGATE', page: 'help/reset' });
      }
    };
    addEventListener('keydown', openReset); return () => removeEventListener('keydown', openReset);
  }, [dispatch]);
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
    const url = routeUrl(state.started ? state.page : '');
    if (location.pathname !== url) history.pushState({}, '', url);
  }, [state.page, state.started]);
  useEffect(() => {
    const onBack = () => navigate(routeFromPath(location.pathname) || 'home');
    const onVisibility = () => dispatch({ type: 'VISIBILITY', hidden: document.hidden });
    addEventListener('popstate', onBack); document.addEventListener('visibilitychange', onVisibility);
    return () => { removeEventListener('popstate', onBack); document.removeEventListener('visibilitychange', onVisibility); };
  }, [navigate, dispatch]);
  const toggleEffects = () => setEffects(value => {
    try { localStorage.setItem(STORAGE_KEYS.effects, value ? 'off' : 'on'); } catch { /* Preferences are optional. */ }
    return !value;
  });
  const maintenance = isMaintenance(state.page);
  const horror = maintenance ? {} : horrorView(state);
  return <GameContext.Provider value={{ state, meta, dispatch, navigate, restart, fullReset, effects, toggleEffects, audioEnabled, setAudioEnabled, horror, maintenance, debug }}>{children}</GameContext.Provider>;
}
export const useGame = () => useContext(GameContext);
