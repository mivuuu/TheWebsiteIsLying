export const STORAGE_KEYS = Object.freeze({
  run: 'lying:run:v2', meta: 'lying:meta:v1', language: 'lying:language',
  effects: 'lying:effects', audio: 'lying:audio', legacyReducedHorror: 'lying:reduced-horror',
});
export const GAME_STORAGE_KEYS = Object.freeze(Object.values(STORAGE_KEYS));
const settings = new Set([STORAGE_KEYS.language, STORAGE_KEYS.effects, STORAGE_KEYS.audio, STORAGE_KEYS.legacyReducedHorror]);
// The lying: namespace belongs to this game, including obsolete save versions.
export function clearGameStorage(resetSettings = false, stores) {
  stores ??= ['localStorage', 'sessionStorage'].map(name => { try { return globalThis[name]; } catch { return null; } });
  for (const storage of stores) {
    if (!storage) continue;
    const keys = new Set(GAME_STORAGE_KEYS);
    try { for (let i = 0; i < storage.length; i++) { const key = storage.key(i); if (key?.startsWith('lying:')) keys.add(key); } } catch { /* Storage can be unavailable. */ }
    for (const key of keys) if (resetSettings || !settings.has(key)) {
      try { storage.removeItem(key); } catch { /* Keep the in-memory reset usable. */ }
    }
  }
}
