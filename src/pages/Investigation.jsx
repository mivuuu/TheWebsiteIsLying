import { useState, useRef, useEffect } from 'react';
import { useGame } from '../game/GameContext.jsx';
import { useLanguage } from '../translations/LanguageContext.jsx';
import { ARCHIVES, FILES, QUESTIONS, archiveAvailable, fileAvailable, commitEligible, nextHint } from '../game/story.js';
import { Action, PageHeading, RouteLink, RuleList } from '../components/Primitives.jsx';
import { Feedback, RouteEntry, ServiceLinks } from '../components/StoryControls.jsx';

export function Protocol({ protocol }) {
  const { state, dispatch, horror, reducedHorror } = useGame(); const { t } = useLanguage();
  const allowed = commitEligible(state, protocol);
  return <section className="protocol"><h2>{t(`story.protocol.${protocol}`)}</h2><p>{t(`story.protocol.${protocol}.detail`)}</p><p className="quiet-note">{t('story.protocol.permanent')}</p><Action secondary disabled={!allowed} onClick={() => dispatch({ type: 'COMMIT', protocol })}>{t('story.protocol.commit')}</Action>{!allowed && <p className="quiet-note">{t(`story.protocol.${protocol}.needs`)}</p>}</section>;
}
export function Status() {
  const { state, dispatch, horror, reducedHorror } = useGame(); const { t } = useLanguage();
  const [audit, setAudit] = useState({ rule: '', before: '', after: '' });
  const showContainment = horror.statusContained;
  return <><PageHeading label={t('story.status.label')} title={t('story.status.title')}>{t('story.status.description')}</PageHeading>
    <dl className="status-ledger"><div><dt>{t('sender.SYSTEM')}</dt><dd>{t('story.status.online')}</dd></div><div><dt>{t('shell.session')}</dt><dd><bdi>{state.sessionId}</bdi></dd></div><div><dt>{t('story.status.engine')}</dt><dd>{t('story.status.active')}</dd></div>{showContainment && <div><dt><bdi>{t(horror.statusVisitor && !reducedHorror ? 'story.user.visitor' : 'sender.ADMIN')}</bdi></dt><dd>{t(state.choices.protocol === 'release' ? 'story.status.pending' : state.adminTrust >= 4 ? 'story.status.unstable' : 'story.status.contained')}</dd></div>}</dl>
    {!state.puzzles.audit ? <section className="puzzle"><h2>{t('story.audit.title')}</h2><p>{t('story.audit.instruction')}</p><form noValidate onSubmit={e => { e.preventDefault(); dispatch({ type: 'SOLVE_AUDIT', ...audit }); }}><div className="audit-fields">{['rule', 'before', 'after'].map(field => <label key={field}>{t(`story.audit.${field}`)}<input dir="ltr" inputMode="numeric" maxLength={2} value={audit[field]} onChange={e => setAudit({ ...audit, [field]: e.target.value })} /></label>)}</div><Action>{t('story.audit.submit')}</Action></form><ServiceLinks pages={['archive', 'rules']} /></section> : <p className="story-receipt">{t('story.status.checksum')}</p>}
    {state.puzzles.terminal && <Protocol protocol="obey" />}<Feedback /><ServiceLinks pages={['help', ...(state.puzzles.audit ? ['users', 'logs'] : [])]} />
  </>;
}
export function Archive() {
  const { state, dispatch, horror, reducedHorror } = useGame(); const { t } = useLanguage(); const [code, setCode] = useState('');
  return <><PageHeading label={t('archive.label')} title={t('archive.title')}>{t('story.archive.description')}</PageHeading>
    <div className="archive-table">{ARCHIVES.map(version => <div className="archive-record" key={version}><button className="record-button version-button" onClick={() => dispatch({ type: 'OPEN_VERSION', version })} aria-expanded={state.activeVersion === version}><bdi>{`v${version}`}</bdi><span>{t(archiveAvailable(state, version) ? 'story.archive.readable' : 'story.archive.sealed')}</span><span aria-hidden="true">+</span></button>{state.activeVersion === version && <div className="record-content multiline"><p>{t(`story.archive.${version}`)}</p>{version === '3.2' && <RuleList rules={state.originalRules} />}{version === '1.0' && <p className="eighth-rule">{t('story.rule8.them')}</p>}</div>}</div>)}</div>
    {state.puzzles.audit && !state.puzzles.archive && <section className="puzzle"><h2>{t('story.archive.lock')}</h2><p>{t('story.archive.recipe')}</p><form noValidate onSubmit={e => { e.preventDefault(); dispatch({ type: 'SOLVE_ARCHIVE', code }); }}><label>{t('story.archive.code')}<input dir="ltr" inputMode="numeric" maxLength={12} value={code} onChange={e => setCode(e.target.value)} /></label><Action>{t('story.archive.restore')}</Action></form></section>}
    <Feedback /><ServiceLinks pages={['status', ...(state.puzzles.audit ? ['files', 'logs'] : [])]} />
  </>;
}
export function Messages() {
  const { state, dispatch, horror, reducedHorror } = useGame(); const { t } = useLanguage();
  const messageOutput = useRef(null);
  useEffect(() => { if (messageOutput.current) messageOutput.current.scrollTop = messageOutput.current.scrollHeight; }, [state.messages.length]);
  const question = QUESTIONS.find(q => q.when(state) && !state.responses[q.id]);
  return <><PageHeading label={t('messages.label')} title={t('messages.title')}>{t('messages.description')}</PageHeading><div className="message-list" ref={messageOutput} role="log" aria-live="polite">{state.messages.map((m, i) => <article className={`message ${m.from === 'ADMIN' ? 'admin-message' : ''}`} key={`${m.id}-${i}`}><div className="message-meta"><bdi>{t(m.id === 'horror:wrong-sender' && horror.wrongSender && !reducedHorror ? 'story.user.visitor' : horror.id === 'sender-missing' && m.from === 'ADMIN' ? 'horror.senderMissing' : `sender.${m.from}`)}</bdi><span>{t('messages.number', { number: String(i + 1).padStart(3, '0') })}</span></div><p>{t(m.textKey, m.params)}</p></article>)}</div>
    {horror.transientMessage && <article className="message withdrawn-message" role="status"><div className="message-meta"><bdi>{t(horror.id === 'false-memory' ? 'sender.SYSTEM' : 'sender.ADMIN')}</bdi></div><p>{t(horror.transientMessage)}</p></article>}
    {question && <section className="conversation"><h2>{t(question.textKey)}</h2><div className="button-row">{['yes', 'no', 'silent'].map(answer => <Action key={answer} secondary={answer !== 'yes'} onClick={() => dispatch({ type: 'REPLY', question: question.id, answer })}>{t(`story.answer.${answer}`)}</Action>)}</div></section>}
    {Object.entries(state.responses).map(([id, response]) => <p className="conversation-receipt" key={id}>{t(`story.q.${id}`)} <span>{t(`story.answer.${response.answer}`)}</span></p>)}
    <ServiceLinks pages={state.unlocked.includes('page-7') ? ['page-7', 'files'] : ['status']} />
  </>;
}
export function Logs() {
  const { state, horror, reducedHorror } = useGame(); const { t } = useLanguage();
  const impossible = horror.impossibleLog;
  const entries = [...(impossible ? [{ key: 'story.log.visit', params: { path: '/admin' }, at: -8000 }] : []), { key: 'story.log.initialized', at: 0 }, ...state.log, ...(horror.falseLog ? [{ key: horror.falseLog, at: horror.id === 'null-memory' ? -11000 : horror.logAt - state.startedAt }] : [])];
  const stamp = ms => `${ms < 0 ? '−' : '+'}${String(Math.floor(Math.abs(ms) / 60000)).padStart(2, '0')}:${String(Math.floor(Math.abs(ms) / 1000) % 60).padStart(2, '0')}`;
  return <><PageHeading label={t('story.logs.label')} title={t('story.logs.title')}>{t('story.logs.description')}</PageHeading><div className="log-output">{entries.map((entry, i) => <div key={i}><bdi dir="ltr">{stamp(entry.at)}</bdi><span>{t(entry.key, entry.params)}</span></div>)}{state.puzzles.archive && <div><bdi dir="ltr">{stamp(state.now - state.startedAt)}</bdi><span>{t('story.log.adminActive')}</span></div>}</div><p className="quiet-note">{t('story.logs.origin')}</p><ServiceLinks pages={['terminal', 'archive', 'users']} /></>;
}
export function Users() {
  const { state, dispatch, horror, reducedHorror } = useGame(); const { t } = useLanguage();
  const refreshing = state.restoredAt && state.now - state.restoredAt < 2500;
  const users = ['story.user.visitor'];
  if (state.flags.otherVoice && !refreshing) users.push(state.flags.discoveredRule8 ? 'story.user.visitor' : 'sender.ADMIN');
  if (state.rare?.key === 'third' && state.rare.until > state.now) users.push('story.user.unknown');
  if (!refreshing && state.horror.previousEndings.includes('replaced') && !state.flags.otherVoice) users.push('sender.ADMIN');
  if (!refreshing && horror.usersMode === 'missing') users.splice(0, users.length, 'sender.ADMIN');
  if (!refreshing && horror.usersMode === 'extra') users.splice(0, users.length, 'story.user.visitor', 'sender.ADMIN', 'story.user.visitor');
  const displayedCount = !refreshing && horror.usersMode === 'count' ? 1 : horror.usersMode === 'extra' ? 2 : users.length;
  return <><PageHeading label={t('story.users.label')} title={t('story.users.count', { count: displayedCount })}>{t('story.users.description')}</PageHeading><div className="user-registry">{users.map((key, i) => <div key={i}><bdi>{String(i + 1).padStart(2, '0')}</bdi><span>{t(key)}</span><span>{t('story.status.active')}</span></div>)}</div>
    {state.choices.protocol && <section className="puzzle"><h2>{t('story.registry.title')}</h2><p>{t(`story.registry.${state.choices.protocol}`)}</p><Action onClick={() => dispatch({ type: 'REGISTRY' })} disabled={state.choices.registry}>{t(state.choices.registry ? 'story.registry.done' : 'story.registry.sign')}</Action></section>}
    {state.choices.registry && <ServiceLinks pages={['real-exit']} />}<ServiceLinks pages={['status', 'terminal']} />
  </>;
}
export function Files() {
  const { state, dispatch, horror, reducedHorror } = useGame(); const { t } = useLanguage();
  return <><PageHeading label={t('story.files.label')} title={t('story.files.title')}>{t('story.files.description')}</PageHeading><div className="archive-table">{FILES.map(file => <div className="archive-record" key={file}><button className="record-button file-button" onClick={() => dispatch({ type: 'OPEN_FILE', file })}><bdi dir="ltr">{file}</bdi><span>{t(fileAvailable(state, file) ? 'archive.read' : 'story.feedback.denied')}</span></button>{state.activeFile === file && <div className="record-content multiline"><p>{t(`story.file.${file}`)}</p>{file === 'notice.txt' && state.unlocked.includes('page-7') && <ServiceLinks pages={['page-7']} />}{file === 'readme.old' && <ServiceLinks pages={['mirror', 'deleted']} />}</div>}</div>)}</div><Feedback /><ServiceLinks pages={['terminal', 'archive', 'help']} /></>;
}
export function Terminal() {
  const { state, dispatch, horror, reducedHorror } = useGame(); const { t } = useLanguage();
  const [command, setCommand] = useState(''); const [historyIndex, setHistoryIndex] = useState(-1); const output = useRef(null);
  useEffect(() => { if (output.current) output.current.scrollTop = output.current.scrollHeight; }, [state.terminalHistory.length]);
  return <><PageHeading label={t('story.terminal.label')} title={t('story.terminal.title')}>{t('story.terminal.description')}</PageHeading><div className="terminal"><div className="terminal-output" ref={output} role="log" aria-live="polite">{!state.terminalHistory.length && <p>{t('story.term.welcome')}</p>}{state.terminalHistory.map((entry, i) => <div className="terminal-entry" key={i}><p dir="ltr">&gt; {entry.command}</p><p className="multiline">{t(i === state.terminalHistory.length - 1 && entry.command === 'whoami' && horror.terminalAdmin && !reducedHorror ? 'sender.ADMIN' : entry.key, entry.params)}</p>{i === state.terminalHistory.length - 1 && entry.command === 'users' && horror.terminalExtra && <p><bdi>2</bdi></p>}</div>)}</div><form onSubmit={e => { e.preventDefault(); dispatch({ type: 'COMMAND', command }); setCommand(''); setHistoryIndex(-1); }}><label htmlFor="terminal-command">{t('story.terminal.input')}</label><div className="terminal-prompt" dir="ltr"><span aria-hidden="true">&gt;</span><input id="terminal-command" autoComplete="off" spellCheck={false} value={command} maxLength={100} onChange={e => setCommand(e.target.value)} onKeyDown={e => {
    if (e.key !== 'ArrowUp' && e.key !== 'ArrowDown') return;
    e.preventDefault(); const max = state.commandHistory.length - 1;
    const next = e.key === 'ArrowUp' ? Math.min(max, historyIndex + 1) : Math.max(-1, historyIndex - 1);
    setHistoryIndex(next); setCommand(next < 0 ? '' : state.commandHistory[max - next] || '');
  }} /><button className="small-button">{t('story.terminal.run')}</button></div></form></div><ServiceLinks pages={['logs', 'files', 'users', ...(state.puzzles.terminal ? ['admin'] : []), ...(state.choices.registry ? ['real-exit'] : [])].filter(p => !state.hiddenRoutes.includes(p))} /></>;
}
export function Missing() {
  const { state, horror, reducedHorror } = useGame(); const { t } = useLanguage();
  const n = state.invalidRoutes.length;
  return <><PageHeading label="404" title={t(n >= 3 ? 'story.missing.again' : n ? 'story.missing.good' : 'story.missing.lost')}>{t(n ? 'story.missing.instruction' : 'story.missing.description')}</PageHeading><bdi className="missing-path" dir="ltr">{state.invalidPath}</bdi>{n > 0 && <div className="route-fragments" dir="ltr">{['/ol', 'd-r', 'ules'].slice(0, n).map(fragment => <code key={fragment}>{fragment}</code>)}</div>}<RouteEntry /><ServiceLinks pages={['help', 'archive']} /></>;
}
export function OldRules() {
  const { state, horror, reducedHorror } = useGame(); const { t } = useLanguage();
  return <><PageHeading label={t('story.old.label')} title={t('story.old.title')}>{t('story.old.description')}</PageHeading><RuleList rules={state.originalRules} /><p className="eighth-rule" role="status">{t(state.flags.oldCorrupted ? 'story.rule8.masked' : 'story.rule8.admin')}</p><p className="quiet-note">{t('story.old.warning')}</p><ServiceLinks pages={['archive', 'files', 'deleted']} /></>;
}
export function Mirror() {
  const { state, dispatch, horror, reducedHorror } = useGame(); const { t } = useLanguage(); const [claims, setClaims] = useState([]);
  const rules = state.currentRules.map((rule, index) => index === 3 ? 'story.mirror.rule' : rule);
  return <><PageHeading label={t('story.mirror.label')} title={t('story.mirror.title')}>{t('story.mirror.description')}</PageHeading><RuleList rules={rules} />
    {state.flags.discoveredRule8 && <section className="puzzle"><h2>{t('story.proof.title')}</h2><p>{t('story.proof.instruction')}</p>{['names', 'leaving', 'authorized'].map(claim => <label className="claim" key={claim}><input type="checkbox" checked={claims.includes(claim)} onChange={e => setClaims(e.target.checked ? [...claims, claim] : claims.filter(c => c !== claim))} />{t(`story.proof.${claim}`)}</label>)}<Action onClick={() => dispatch({ type: 'SOLVE_CONTRADICTION', claims })}>{t('story.proof.submit')}</Action></section>}
    {state.puzzles.terminal && <><button className="text-button marginalia" onClick={() => dispatch({ type: 'SECRET', key: 'null-mirror' })}>{t('story.secret.margin')}</button>{state.secrets.includes('null-mirror') && <p className="story-receipt">{t('story.secret.mirror')}</p>}</>}
    {state.puzzles.contradiction && <><p className="story-receipt">{t('story.proof.command')}</p><Protocol protocol="detach" /></>}<Feedback /><ServiceLinks pages={['files', 'archive', 'terminal']} />
  </>;
}
export function Deleted() {
  const { state, dispatch, horror, reducedHorror } = useGame(); const { t } = useLanguage();
  return <><PageHeading label={t('story.deleted.label')} title={t('story.deleted.title')}>{t('story.deleted.description')}</PageHeading>{!state.puzzles.archive ? <p className="quiet-note">{t('story.deleted.empty')}</p> : <div className="recovered-fragments"><blockquote>{t('story.deleted.one')}</blockquote><blockquote>{t('story.deleted.two')}</blockquote>{state.flags.discoveredRule8 && <><blockquote>{t('story.rule8.masked')}</blockquote><button className="text-button marginalia" onClick={() => dispatch({ type: 'SECRET', key: 'null-deleted' })}>{t('story.secret.margin')}</button>{state.secrets.includes('null-deleted') && <p>{t('story.secret.deleted')}</p>}</>}</div>}<ServiceLinks pages={['files', 'archive']} /></>;
}
export function Admin() {
  const { state, horror, reducedHorror } = useGame(); const { t } = useLanguage();
  return <><PageHeading label={t('story.admin.label')} title={t('story.admin.title')}>{t('story.admin.description')}</PageHeading><div className="prose"><p>{t('story.admin.one')}</p><p>{t(state.responses.identity?.answer === 'yes' ? 'story.admin.identityYes' : 'story.admin.identityNo')}</p><blockquote>{t('story.admin.uncertain')}</blockquote></div><Protocol protocol="release" /><Protocol protocol="contain" /><ServiceLinks pages={['messages', 'mirror', 'files', 'terminal'].filter(p => !state.hiddenRoutes.includes(p))} /><Feedback /></>;
}
export function Help() {
  const { state, dispatch, horror, reducedHorror } = useGame(); const { t } = useLanguage(); const hint = nextHint(state);
  return <><PageHeading label={t('story.help.label')} title={t('story.help.title')}>{t(state.puzzles.terminal ? 'story.help.none' : state.puzzles.audit ? 'story.help.notExit' : 'story.help.exit')}</PageHeading><div className="prose"><p>{t('story.help.controls')}</p><p>{t('story.help.address')}</p></div><RouteEntry /><section className="puzzle"><h2>{t('story.help.hints')}</h2><button className="text-button" onClick={() => dispatch({ type: 'HINT' })}>{t('story.help.request')}</button>{state.hintLevel >= 1 && <p>{t('story.hint.general')}</p>}{state.hintLevel >= 2 && <p>{t(`story.hint.${hint}`)}</p>}{state.hintLevel >= 3 && <p className="story-receipt">{t(`story.solution.${hint}`)}</p>}</section><ServiceLinks pages={['status', 'archive', ...(state.puzzles.audit ? ['files', 'messages'] : [])].filter(p => !state.hiddenRoutes.includes(p))} /></>;
}
export function RealExit() {
  const { state, dispatch, horror, reducedHorror } = useGame(); const { t } = useLanguage();
  return <><PageHeading label={t('story.real.label')} title={t('story.real.title')}>{t('story.real.description')}</PageHeading><p className="story-receipt">{t(`story.real.${state.choices.protocol}`)}</p><Action onClick={() => dispatch({ type: 'COMPLETE' })}>{t('story.real.disconnect')}</Action><Feedback /></>;
}
export function NullPage() {
  const { dispatch } = useGame(); const { t } = useLanguage();
  return <main className="null-page"><button aria-label={t('story.null.forget')} onClick={() => dispatch({ type: 'COMPLETE' })}>∅</button><Feedback /></main>;
}




