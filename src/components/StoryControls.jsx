import { useState } from 'react';
import { useGame } from '../game/GameContext.jsx';
import { useLanguage } from '../translations/LanguageContext.jsx';
import { RouteLink } from './Primitives.jsx';
export function Feedback() {
  const { state } = useGame(); const { t } = useLanguage();
  return state.feedback ? <p className="story-feedback" role="status">{t(state.feedback.key, state.feedback.params)}</p> : null;
}
export function RouteEntry() {
  const { navigate } = useGame(); const { t } = useLanguage(); const [path, setPath] = useState(''); const [invalid, setInvalid] = useState(false);
  return <form className="route-entry" noValidate onSubmit={e => { e.preventDefault(); if (/^\/?[a-z0-9/-]{1,64}$/i.test(path)) { setInvalid(false); navigate(path); } else setInvalid(true); }}>
    <label htmlFor="route-address">{t('story.route.label')}</label><div className="name-input-row"><input id="route-address" dir="ltr" value={path} onChange={e => setPath(e.target.value)} maxLength={64} aria-invalid={invalid} required /><button className="small-button">{t('story.route.open')}</button></div>{invalid && <p className="form-error" role="alert">{t('story.feedback.path')}</p>}
  </form>;
}
export function ServiceLinks({ pages }) {
  const { t } = useLanguage();
  return <div className="page-bottom-links">{pages.map(page => <RouteLink key={page} page={page}>{t(`nav.${page}`)}</RouteLink>)}</div>;
}
