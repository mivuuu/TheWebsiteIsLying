import { useEffect } from 'react';
import { useGame } from '../game/GameContext.jsx';
import { useLanguage } from '../translations/LanguageContext.jsx';
import { exitResponse } from '../game/engine.js';
import { PageHeading, Action, AccentTitle, Door, RuleList, formatTime } from '../components/Primitives.jsx';
import { ServiceLinks } from '../components/StoryControls.jsx';
import { EmptyRegion } from '../components/HorrorLayer.jsx';

export function Home() {
  const { state, navigate, horror } = useGame(); const { t } = useLanguage();
  const title = state.rare?.key === 'wrong' && state.rare.until > state.now ? 'story.rare.wrong' : state.adminTrust >= 4 ? 'story.home.stop' : state.revisited ? 'story.home.before' : state.websiteTrust >= 2 ? 'story.home.well' : 'intro.welcome';
  return <><div className="home-layout"><div className="home-copy"><PageHeading label={t('home.label')} title={<AccentTitle text={horror.id === 'escaped-memory' ? t('horror.title.return') : horror.id === 'period' ? t(title).replace(/\.$/, '…') : t(title)} />}>{t(state.puzzles.audit ? 'home.returnDescription' : 'story.home.follow')}</PageHeading><Action onClick={() => navigate('about')}>{t('home.begin')}</Action><div className="home-annotation">{t('home.remember')}</div></div><Door /></div><EmptyRegion key={horror.id} /><div className="orientation-note"><span className="note-symbol" aria-hidden="true">[ i ]</span><div><h2>{t('home.noteTitle')}</h2><p>{t('home.note')}</p></div></div><ServiceLinks pages={['rules', 'status']} /></>;
}
export function About() {
  const { state, horror } = useGame(); const { t } = useLanguage();
  return <><PageHeading label={t('about.label')} title={t(state.flags.welcomeChanged ? 'about.changed' : 'about.title')}>{t('story.about.creator')}</PageHeading><div className="prose"><p>{t('story.about.discontinued')}</p><p>{t('story.about.maintenance')}</p><blockquote>{t(state.puzzles.archive ? 'story.about.purposeLater' : 'story.about.purpose')}</blockquote><p>{t('story.about.note')}</p></div>{horror.id === 'ghost-line' && <p className="phosphor-ghost">{t('horror.ghost')}</p>}<ServiceLinks pages={['archive', 'status', 'help']} /></>;
}
export function Rules() {
  const { state, horror } = useGame(); const { t } = useLanguage();
  return <><PageHeading label={t('intro.protocol')} title={t('rules.title')}>{t('intro.follow')}</PageHeading>{state.rare?.key === 'zero' && state.rare.until > state.now && <p className="rare-text">{t('story.rare.zero')}</p>}<RuleList />{horror.missed && <p className="quiet-note">{t('horror.missed')}</p>}<div className="rules-certification"><span>{t('rules.verified')}</span><span>{t('rules.unchanged')}</span></div><ServiceLinks pages={['status', 'archive']} /></>;
}
export function Exit() {
  const { state, dispatch, horror } = useGame(); const { t } = useLanguage(); const response = exitResponse(state);
  return <><PageHeading label={t('exit.label')} title={<AccentTitle text={t(horror.exitPrompt || 'exit.title')} />}>{t(state.exitAnswer ? 'exit.recorded' : 'exit.honest')}</PageHeading>{!state.exitAnswer ? <div className="button-row exit-choices">{['yes', 'no'].map(answer => <Action key={answer} secondary={answer === 'no'} onClick={() => dispatch({ type: 'EXIT_ANSWER', answer })}>{t(`exit.${answer}`)}</Action>)}</div> : <div className="exit-response"><p>{t(response.key, response.params)}</p><p>{t('story.exit.notDoor')}</p><ServiceLinks pages={['status', 'help']} /></div>}<div className="exit-bottom"><span className="exit-seal" aria-hidden="true">×</span>{t('exit.required')}</div></>;
}
export function HiddenPage() {
  const { navigate, horror } = useGame(); const { t } = useLanguage();
  useEffect(() => { const escape = e => { if (e.key === 'Escape') navigate('files'); }; addEventListener('keydown', escape); return () => removeEventListener('keydown', escape); }, [navigate]);
  return <main className="hidden-page">{horror.sevenHeading && <h1>{t(horror.sevenHeading)}</h1>}{horror.sevenLine && <p role="status">{t(horror.sevenLine)}</p>}{horror.sevenReturn && <div className="hidden-return"><ServiceLinks pages={['files']} /></div>}</main>;
}
export function Ending() {
  const { state, restart } = useGame(); const { t } = useLanguage(); const { id } = state.ending; const elapsed = state.now - state.ending.at;
  if (id === 'null') return <main className="null-ending"><h1>{t('story.ending.nullText')}</h1></main>;
  if (id === 'escaped') return <main className="escaped-ending">{elapsed < 1500 ? <h1>{t('ending.connection')}</h1> : elapsed >= 4000 && <div className="escape-lines"><p>{t('story.ending.noRules')}</p>{elapsed >= 5000 && <p>{t('story.ending.noAdmin')}</p>}{elapsed >= 6000 && <p>{t('story.ending.noWebsite')}</p>}{elapsed >= 7000 && <p>{t('story.ending.close')}</p>}{elapsed >= 8000 && <Action onClick={restart}>{t('ending.restart')}</Action>}</div>}</main>;
  return <main className="ending"><span className="eyebrow">{t('ending.connection')}</span><h1><AccentTitle text={t('ending.title')} /></h1><div className="ending-label">{t('ending.label')} <span>{t(state.ending.titleKey)}</span></div><div className="ending-sequence" role="status"><p className="multiline">{t(`story.ending.${id}.one`)}</p>{elapsed >= 3000 && <p className="multiline">{t(`story.ending.${id}.two`)}</p>}</div><div className="ending-stats"><div><bdi>{state.ending.pages}</bdi>{t('ending.pages')}</div><div><bdi>{state.ending.rules.length}</bdi>{t('ending.rules')}</div><div><bdi>{formatTime(state.ending.duration)}</bdi>{t('ending.time')}</div></div><Action onClick={restart}>{t('ending.restart')}</Action><span className="ending-note">{t('ending.note')}</span></main>;
}
