import { useLanguage } from '../translations/LanguageContext.jsx';
import { LANGUAGES, LANGUAGE_LABELS } from '../translations/index.js';
export default function LanguageSwitcher({ standalone = false }) {
  const { language, setLanguage, t } = useLanguage();
  return <div className={`language-switcher ${standalone ? 'language-standalone' : ''}`} role="group" aria-label={t('language.label')} dir="ltr" data-presentation-control>
    {LANGUAGES.map((code, index) => <span className="language-option" key={code}>
      {index > 0 && <span className="language-separator" aria-hidden="true">/</span>}
      <button type="button" lang={code} aria-label={t(`language.${code}`)} aria-pressed={language === code} onClick={() => setLanguage(code)}>{LANGUAGE_LABELS[code]}</button>
    </span>)}
  </div>;
}
