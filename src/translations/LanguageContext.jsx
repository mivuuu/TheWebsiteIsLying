import { createContext, useCallback, useContext, useLayoutEffect, useState } from 'react';
import { LANGUAGES, translate } from './index.js';
const LanguageContext = createContext(null);
export const LANGUAGE_STORAGE_KEY = 'lying:language';
export function LanguageProvider({ children }) {
  const [language, setLanguageState] = useState(() => {
    try { const saved = localStorage.getItem(LANGUAGE_STORAGE_KEY); return LANGUAGES.includes(saved) ? saved : 'en'; }
    catch { return 'en'; }
  });
  const setLanguage = useCallback(value => {
    if (!LANGUAGES.includes(value)) return;
    setLanguageState(value);
    try { localStorage.setItem(LANGUAGE_STORAGE_KEY, value); } catch { /* Storage is optional. */ }
  }, []);
  const t = useCallback((key, params) => translate(language, key, params), [language]);
  useLayoutEffect(() => {
    document.documentElement.lang = language;
    document.documentElement.dir = language === 'he' ? 'rtl' : 'ltr';
    document.querySelector('meta[name="description"]')?.setAttribute('content', t('app.description'));
  }, [language, t]);
  return <LanguageContext.Provider value={{ language, setLanguage, t }}>{children}</LanguageContext.Provider>;
}
export const useLanguage = () => useContext(LanguageContext);
