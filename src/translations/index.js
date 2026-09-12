import en from './en.js';
import ru from './ru.js';
import he from './he.js';

export const translations = { en, ru, he };
export const LANGUAGES = ['en', 'ru', 'he'];
export const LANGUAGE_LABELS = { en: 'EN', ru: 'RU', he: 'HE' };

// Isolate technical tokens and user-supplied aliases; never interpret markup.
export function translate(language, key, params = {}) {
  const template = translations[language]?.[key];
  if (typeof template !== 'string') throw new Error(`Missing translation: ${language}:${key}`);
  const text = language === 'he' ? template.replace(/reconcile lock alias visitor|disconnect claims|release admin|seal admin|trace origin|history --erased|(?:rules\.txt|session\.log|notice\.txt|admin\.lock|readme\.old|recovery\.dat)|ADMIN|\/[a-z0-9]+(?:-[a-z0-9]+)*|\[\d{2}:\d{2}\]|Escape|\b\d+(?:\.\d+)? KB\b|\bv\d\.\d\b|\b(?:reconcile|origin|trace|whoami|help|lock|alias|visitor)\b/g, token => `\u2066${token}\u2069`) : template;
  return text.replace(/\{(\w+)\}/g, (_, name) => {
    if (!(name in params)) throw new Error(`Missing translation parameter: ${key}:${name}`);
    const value = String(params[name]).replace(/[\u202a-\u202e\u2066-\u2069]/g, '');
    return language === 'he' ? `\u2068${value}\u2069` : value;
  });
}
export function graphemes(text, language) {
  return Array.from(new Intl.Segmenter(language, { granularity: 'grapheme' }).segment(text), part => part.segment);
}
