import { routeUrl } from '../game/routes.js';
import { useState } from 'react';
import { useGame } from '../game/GameContext.jsx';
import { PAGES } from '../game/content.js';
import { formatTime } from './Primitives.jsx';
import { useLanguage } from '../translations/LanguageContext.jsx';
import LanguageSwitcher from './LanguageSwitcher.jsx';
import { ServiceLinks } from './StoryControls.jsx';
function NameRequest() {
  const { dispatch } = useGame();
  const { t } = useLanguage();
  const [name, setName] = useState('');
  const [invalid, setInvalid] = useState(false);
  return <section className="name-request" aria-labelledby="name-title">
    <span className="eyebrow accent">{t('name.label')}</span><h2 id="name-title">{t('name.question')}</h2>
    <form noValidate onSubmit={e => { e.preventDefault(); if (name.trim()) dispatch({ type: 'NAME', name }); else setInvalid(true); }}>
      <label htmlFor="visitor-name">{t('name.hint')}</label>
      <div className="name-input-row"><input id="visitor-name" dir="auto" autoComplete="off" maxLength={32} value={name} onChange={e => { setName(e.target.value); setInvalid(false); }} placeholder={t('name.placeholder')} aria-invalid={invalid} aria-describedby={invalid ? 'name-error' : undefined} required /><button className="small-button" type="submit">{t('name.submit')} <span className="direction-arrow" aria-hidden="true">↗</span></button></div>
      {invalid && <p className="form-error" id="name-error" role="alert">{t('name.required')}</p>}
    </form>
    <button className="text-button" onClick={() => dispatch({ type: 'NAME', name: '' })}>{t('name.refuse')}</button>
  </section>;
}
export default function Shell({ children }) {
  const { state, dispatch, navigate, effects, toggleEffects, horror, maintenance } = useGame();
  const { t } = useLanguage();
  const red = state.redUntil > state.now;
  const pageNumber = PAGES.indexOf(state.page) + 1;
  const directory = (state.adminTrust >= 4 ? ['home', 'about', 'messages', 'archive', 'rules', 'exit'] : PAGES).filter(page => !state.hiddenRoutes.includes(page));
  const adminUnread = state.flags.adminAvailable && state.page !== 'messages' && !state.adminTrusted && !state.decisions.some(d => d.type === 'admin');
  return <div className="shell">
    <header className="site-header">
      <button className="brand" aria-label={t('brand.logo')} onClick={() => dispatch({ type: 'LOGO' })}><span className="brand-mark" aria-hidden="true"><i /><i /></span><span className="multiline">{t('brand.lines')}<span className="accent">_</span></span></button>
      <div className="connection"><span className="status-dot" />{t('shell.connected')}</div>
      <div className="header-controls"><button className="effects-toggle" data-presentation-control aria-pressed={effects} onClick={toggleEffects}>{t('shell.effects')} <span>[ {t(effects ? 'shell.on' : 'shell.off')} ]</span></button><LanguageSwitcher /></div>
    </header>
    <div className="shell-body">
      <aside className="sidebar">
        <div className="sidebar-label">{t('shell.directory')} <bdi>06</bdi></div>
        <nav aria-label={t('shell.navLabel')}>{directory.map((page, i) => <a key={page} href={routeUrl(page)} title={`/${page}`} aria-current={state.page === page ? 'page' : undefined} className={`nav-item ${state.page === page ? 'active' : ''}`} onClick={e => { e.preventDefault(); navigate(page); }}>
          <bdi className="nav-index">{String(i + 1).padStart(2, '0')}</bdi><span className={horror.navLabels && ['home', 'exit'].includes(page) ? 'nav-unstable' : ''}><span className="nav-canonical">{t(`nav.${page}`)}</span>{horror.navLabels && ['home', 'exit'].includes(page) && <span className="nav-incorrect" aria-hidden="true">{t(`horror.nav.${page}`)}</span>}</span><span className="nav-end direction-arrow" aria-hidden="true">{state.page === page ? '←' : page === 'messages' && adminUnread ? '•' : page === 'exit' ? '↗' : ''}</span>
        </a>)}{horror.duplicateArchive && <a className="nav-item" href={routeUrl('archive')} onClick={e => { e.preventDefault(); navigate('archive'); }}><bdi className="nav-index">03</bdi><span>{t('nav.archive')}</span></a>}</nav>
        <details className="service-directory" open={state.puzzles.audit}><summary>{t('story.services')}</summary><ServiceLinks pages={['status', 'logs', 'users', 'files', 'terminal', 'help'].filter(page => ['status', 'help'].includes(page) || state.unlocked.includes(page))} /></details>
        <div className="sidebar-note"><span className="sidebar-note-cross">+</span><p className="multiline">{t('shell.note')}</p><span className="faint">{t('shell.including')}</span></div>
        <div className="session-indicator"><span className="muted">{t('shell.session')}</span><span>{t(state.choices.registry ? 'shell.pending' : 'shell.progress')}<span className="cursor-line">_</span></span></div>
      </aside>
      <main className="main-panel" id="main-content">
        <div className="page-location"><span>{t('shell.root')} <span className="path-separator">/</span> <bdi dir={maintenance ? 'ltr' : undefined}>{t(`nav.${state.page}`).replace(/^\//, '').toUpperCase()}</bdi></span><span>{pageNumber > 0 ? t('shell.page', { number: String(pageNumber).padStart(2, '0') }) : t('story.unindexed')}</span></div>
        <div className="page-content" key={state.page}>{children}</div>
        {!maintenance && state.flags.nameAsked && !state.nameDecision && !state.exitAnswer && <NameRequest />}
        <div className="transmission" role="status" aria-live="polite"><span className="transmission-label">{t('sender.SYSTEM')}</span><span>{state.notice && state.notice.until > state.now ? t(state.notice.textKey, state.notice.params) : t('shell.normal')}</span><span className="transmission-cursor" aria-hidden="true">_</span></div>
      </main>
    </div>
    <footer className="site-footer"><span><bdi>{state.sessionId}</bdi> <span className="footer-slash">/</span> <bdi className="session-time">{formatTime(state.now - state.startedAt)}</bdi></span><span>{t('shell.inputs', { number: String(state.clicks).padStart(3, '0') })} <span className="footer-slash">/</span> <span className="accent">{t('shell.disconnect')}</span></span></footer>
  </div>;
}


