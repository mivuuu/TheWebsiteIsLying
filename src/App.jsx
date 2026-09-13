import { useEffect, lazy, Suspense } from 'react';
import { useGame } from './game/GameContext.jsx';
import Intro from './components/Intro.jsx';
import Shell from './components/Shell.jsx';
import LanguageSwitcher from './components/LanguageSwitcher.jsx';
import HorrorLayer, { HorrorTransmission } from './components/HorrorLayer.jsx';
import AmbientAudio from './components/AmbientAudio.jsx';
import Maintenance from './pages/Maintenance.jsx';
import { useLanguage } from './translations/LanguageContext.jsx';
import { About, Ending, Exit, HiddenPage, Home, Rules } from './pages/CorePages.jsx';
import { Archive, Messages, Status, Users, Logs, Files, Terminal, Help, Missing, OldRules, Mirror, Deleted, Admin, NullPage, RealExit } from './pages/Investigation.jsx';

const screens = { home: Home, about: About, archive: Archive, messages: Messages, rules: Rules, exit: Exit, status: Status, users: Users, logs: Logs, files: Files, terminal: Terminal, help: Help, '404': Missing, 'old-rules': OldRules, mirror: Mirror, deleted: Deleted, admin: Admin, 'real-exit': RealExit };
const Debug = import.meta.env.DEV ? lazy(() => import('./components/DevPanel.jsx')) : null;
const debugRequested = import.meta.env.DEV && new URLSearchParams(location.search).has('debug');

export default function App() {
  const { state, dispatch, effects, horror, maintenance } = useGame();
  const { t } = useLanguage();
  useEffect(() => {
    document.title = state.ending ? t('app.complete') : horror.title ? t(horror.title) : state.page === 'page-7' ? ' ' : t('app.title');
  }, [t, state.ending, state.page, horror.title]);
  useEffect(() => {
    if (state.started && state.page !== 'page-7') document.querySelector('.page-heading h1')?.focus({ preventScroll: true });
    window.scrollTo({ top: 0 });
  }, [state.page, state.started, state.ending, state.flags.welcomeChanged]);
  const Screen = maintenance ? Maintenance : screens[state.page] || Home;
  return <div className={`app ${effects ? 'effects-on' : 'effects-off'}  ${state.redUntil > state.now && !state.ending && !maintenance ? 'red-state' : ''} ${horror.id ? `anomaly-${horror.id}` : ''}`} onClick={event => { if (!event.target.closest('[data-presentation-control]') && state.started && !state.ending && !maintenance) dispatch({ type: 'CLICK' }); }}>
    <div className="game-surface" inert={Boolean(horror.overlay && !state.ending)}>
    <a className="skip-link" href="#main-content" hidden={!state.started || state.ending || state.page === 'page-7'}>{t('app.skip')}</a>
    {state.started && (state.ending || ['page-7', 'null'].includes(state.page)) && <LanguageSwitcher standalone />}
    {!state.started ? <Intro /> : state.ending ? <Ending /> : state.page === 'page-7' ? <HiddenPage /> : state.page === 'null' ? <NullPage /> : <Shell><Screen /></Shell>}
    </div>
    <HorrorTransmission /><HorrorLayer />
    {state.started && <AmbientAudio />}
    {Debug && debugRequested && <Suspense fallback={null}><Debug /></Suspense>}
    <div className="screen-texture" aria-hidden="true" />
    <div className="screen-scanline" aria-hidden="true" />
  </div>;
}

