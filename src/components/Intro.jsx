import { useEffect, useState } from 'react';
import { useGame } from '../game/GameContext.jsx';
import { useLanguage } from '../translations/LanguageContext.jsx';
import { graphemes } from '../translations/index.js';
import LanguageSwitcher from './LanguageSwitcher.jsx';
import { HorrorSettings } from './HorrorLayer.jsx';
import { Action, RuleList } from './Primitives.jsx';
export default function Intro() {
  const { dispatch, state } = useGame();
  const { language, t } = useLanguage();
  const [elapsed, setElapsed] = useState(0);
  useEffect(() => {
    const start = Date.now();
    const timer = setInterval(() => setElapsed(previous => previous >= 9000 ? previous : Date.now() - start), 45);
    return () => clearInterval(timer);
  }, []);
  const visible = elapsed >= 2000;
  const welcomeKey = state.previousRuns > 0 && elapsed < 3800 ? 'story.intro.back' : 'intro.welcome';
  const welcome = graphemes(t(welcomeKey), language);
  const typed = Math.floor(welcome.length * Math.min(1, Math.max(0, (elapsed - 2000) / 800)));
  const ruleCount = Math.min(7, Math.max(0, Math.floor((elapsed - 4200) / 620) + 1));
  const complete = elapsed > 8700;
  return <div className={`intro ${visible ? 'intro-visible' : ''}`}>
    {!visible ? <div className="boot-cursor"><span className="cursor-block" /></div> : <>
      <header className="intro-header"><span>{t('brand.full')}<span className="accent">_</span></span><div className="header-controls"><HorrorSettings /><span className="muted intro-trust">{t('intro.trust')}</span><LanguageSwitcher /></div></header>
      <main className="intro-content">
        <div className="intro-kicker"><span className="tiny-square" />{t('intro.protocol')}</div>
        <h1 aria-label={t(welcomeKey)}><span aria-hidden="true">{welcome.slice(0, typed).join('')}</span><span className="cursor-block" aria-hidden="true" /></h1>
        <div className="intro-copy" aria-live="polite">
          {elapsed >= 3100 && <p>{t('intro.count')}</p>}
          {elapsed >= 3800 && <p className="muted">{t('intro.follow')}</p>}
        </div>
        <div className="intro-rules"><RuleList count={ruleCount} /></div>
        <div className="intro-actions">{complete ? <><Action onClick={() => dispatch({ type: 'START' })}>{t('intro.accept')}</Action><span className="quiet-note">{t('intro.thanks')}</span></> : <button className="text-button skip" onClick={() => setElapsed(10000)}>{t('intro.skip')} <span className="direction-arrow" aria-hidden="true">→</span></button>}</div>
      </main>
      <footer className="intro-footer"><span>{t('intro.footer')}</span><span>{t('intro.ratio')}</span></footer>
    </>}
  </div>;
}
