import { useEffect, useState } from 'react';
import { useGame } from '../game/GameContext.jsx';
import { useLanguage } from '../translations/LanguageContext.jsx';
import { ENDING_REGISTRY } from '../game/endings.js';
import { routeUrl } from '../game/routes.js';
import { PageHeading, formatTime } from '../components/Primitives.jsx';

function Link({ page, textKey }) {
  const { navigate } = useGame(); const { t } = useLanguage();
  return <a className="text-button" href={routeUrl(page)} onClick={event => { event.preventDefault(); navigate(page); }}>{t(textKey)}</a>;
}
function Counter() {
  const { meta } = useGame(); const { t } = useLanguage();
  return <p className="story-receipt">{t('maintenance.count', { found: meta.discoveredEndings.length, total: ENDING_REGISTRY.length })}</p>;
}
export default function Maintenance() {
  const { state, meta, restart, fullReset } = useGame(); const { t, language } = useLanguage();
  const [confirm, setConfirm] = useState(null); const [word, setWord] = useState(''); const [resetSettings, setResetSettings] = useState(false);
  const archive = state.page === 'help/endings'; const reset = state.page === 'help/reset';
  const cancel = () => { setConfirm(null); setWord(''); setResetSettings(false); };
  const required = t('maintenance.word');
  useEffect(() => { if (confirm) document.getElementById('reset-heading')?.focus(); }, [confirm]);
  return <section className="maintenance" data-presentation-control>
    <PageHeading label={t('maintenance.label')} title={t(archive ? 'maintenance.archive' : reset ? 'maintenance.reset' : 'maintenance.title')}>{t(reset ? 'maintenance.eraseFlavor' : 'maintenance.flavor')}</PageHeading>
    {!reset && <><Counter /><p>{t('maintenance.runs', { number: meta.completedRuns })}</p></>}
    {!archive && !reset && <section className="puzzle"><h2>{t('maintenance.session')}</h2><p><bdi>{state.sessionId}</bdi></p><p>{t('maintenance.active')}</p></section>}
    {archive && <>
      <p>{t('maintenance.retained')}</p>
      <ol className="ending-records">{ENDING_REGISTRY.map((ending, index) => {
        const found = meta.discoveredEndings.includes(ending.id); const record = meta.endingRecords[ending.id];
        return <li key={ending.id}><span className="record-number"><bdi>{String(index + 1).padStart(2, '0')}</bdi></span><div>
          <h2>{t(found ? ending.titleKey : 'maintenance.unknown')}</h2>
          {found && record && <details><summary>{t('maintenance.run', { number: record.runNumber })}</summary>
            <p>{t('maintenance.date', { date: new Date(record.discoveredAt).toLocaleString(language) })}</p>
            <p>{t('maintenance.time', { duration: formatTime(record.duration) })}</p>
            <p>{t('maintenance.rules', { number: record.rules.length })}</p>
            <p>{t('maintenance.pages', { number: record.pages })}</p>
          </details>}
        </div></li>;
      })}</ol>
      {meta.discoveredEndings.length >= 3 && <p className="muted">{t(meta.discoveredEndings.length === ENDING_REGISTRY.length ? 'maintenance.all' : 'maintenance.disagree')}</p>}
    </>}
    {reset && <section className="puzzle">
      {!confirm ? <div className="maintenance-actions"><button className="action" onClick={() => setConfirm('current')}>{t('maintenance.current')}</button><button className="action" onClick={() => setConfirm('full')}>{t('maintenance.full')}</button></div> : <>
        <h2 id="reset-heading" tabIndex={-1}>{t(confirm === 'current' ? 'maintenance.currentConfirm' : 'maintenance.full')}</h2>
        <p>{t(confirm === 'current' ? 'maintenance.currentWarning' : 'maintenance.fullWarning')}</p>
        {confirm === 'full' ? <form onSubmit={event => { event.preventDefault(); if (word === required) fullReset(word, resetSettings); }}>
          <label htmlFor="reset-confirmation">{t('maintenance.type', { word: required })}</label>
          <input id="reset-confirmation" dir="auto" autoComplete="off" autoCorrect="off" autoCapitalize="off" spellCheck={false} value={word} onChange={event => setWord(event.target.value)} />
          <label className="reset-settings"><input type="checkbox" checked={resetSettings} onChange={event => setResetSettings(event.target.checked)} /><span>{t('maintenance.settings')}</span></label>
          <div className="maintenance-actions"><button className="action" type="button" onClick={cancel}>{t('maintenance.cancel')}</button><button className="action" disabled={word !== required} type="submit">{t('maintenance.erase')}</button></div>
        </form> : <div className="maintenance-actions"><button className="action" onClick={cancel}>{t('maintenance.cancel')}</button><button className="action" onClick={restart}>{t('maintenance.current')}</button></div>}
      </>}
    </section>}
    <nav className="maintenance-links" aria-label={t('maintenance.label')}>
      {state.page !== 'help/system' && <Link page="help/system" textKey="maintenance.title" />}
      {!archive && <Link page="help/endings" textKey="maintenance.archive" />}
      {!reset && <Link page="help/reset" textKey="maintenance.reset" />}
      <Link page="help" textKey="maintenance.back" />
    </nav>
  </section>;
}
