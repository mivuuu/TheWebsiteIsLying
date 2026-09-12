import { useEffect, useState } from 'react';
import { useGame } from '../game/GameContext.jsx';
import { useLanguage } from '../translations/LanguageContext.jsx';

export function HorrorTransmission() {
  const { horror, state } = useGame(); const { t } = useLanguage();
  const key = horror.redLine || (horror.typing ? 'horror.typing' : null);
  if (!key || state.ending) return null;
  return <aside className="horror-transmission" role="status" aria-live="polite">{horror.redLine && <bdi>{t(horror.redLine === 'horror.dont' ? 'sender.ADMIN' : 'sender.SYSTEM')}</bdi>}<span>{t(key)}</span></aside>;
}
export function EmptyRegion() {
  const { horror } = useGame(); const { t } = useLanguage(); const [read, setRead] = useState(false);
  if (horror.id !== 'empty-cursor') return null;
  return <button className="empty-region" aria-label={t('horror.emptyRegion')} onClick={() => setRead(true)}>{read ? t('horror.emptyReply') : <span className="sr-only">{t('horror.emptyRegion')}</span>}</button>;
}
export default function HorrorLayer() {
  const { state, horror, dispatch } = useGame(); const { t } = useLanguage();
  const blocking = horror.overlay && !state.ending;
  useEffect(() => {
    if (!blocking) return null;
    const escape = e => { if (e.key === 'Escape') { e.preventDefault(); dispatch({ type: 'HORROR_DISMISS' }); } };
    addEventListener('keydown', escape); return () => removeEventListener('keydown', escape);
  }, [blocking, dispatch]);
  if (state.ending) return null;
  if (!blocking) return null;
  return <div className={`horror-blackout blackout-${horror.overlay}`} role="dialog" aria-modal="true" aria-label={t('horror.dismiss')}>
    {horror.overlay === 'false-ending' && <p role="status">{t(horror.falseEndingKey)}</p>}
    {horror.overlay === 'wrong-page' && <p>{t('nav.admin')}</p>}
    <button className="blackout-recovery" data-presentation-control onClick={() => dispatch({ type: 'HORROR_DISMISS' })}>{t('horror.dismiss')}</button>
  </div>;
}
