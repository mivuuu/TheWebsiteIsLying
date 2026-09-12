import { useGame } from '../game/GameContext.jsx';
import { RULES } from '../game/content.js';
import { routeUrl } from '../game/routes.js';
import { renderedRules } from '../game/rules.js';
import { useLanguage } from '../translations/LanguageContext.jsx';
export function Action({ children, onClick, secondary = false, className = '', ...props }) {
  return <button className={`action ${secondary ? 'action-secondary' : ''} ${className}`} onClick={onClick} {...props}><span>{children}</span><span className="direction-arrow" aria-hidden="true">↗</span></button>;
}
export function RouteLink({ page, children, className = '' }) {
  const { navigate } = useGame();
  return <a className={`route-link ${className}`} href={routeUrl(page)} onClick={e => { e.preventDefault(); navigate(page); }}>{children || <bdi dir="ltr">/{page}</bdi>}<span className="direction-arrow" aria-hidden="true"> ↗</span></a>;
}
export function RuleList({ count = 7, rules }) {
  const { t } = useLanguage();
  const { state, horror } = useGame();
  const projected = rules || (state.page === 'rules' ? renderedRules(state, horror) : state.currentRules) || RULES;
  return <ol className="rules-list">{projected.slice(0, count).map((rule, i) => <li key={i}>
    <span className="rule-number">{t('rule.number', { number: String(i + 1).padStart(2, '0') })}</span>
    <span>{t(rule)}</span>
    <span className="rule-cross" aria-hidden="true">+</span>
  </li>)}</ol>;
}
export function AccentTitle({ text }) {
  return <>{text.slice(0, -1)}<span className="accent">{text.slice(-1)}</span></>;
}
export function PageHeading({ label, title, children }) {
  return <div className="page-heading"><div className="eyebrow"><span className="tiny-square" />{label}</div><h1 tabIndex={-1}>{title}</h1>{children && <p className="page-description">{children}</p>}</div>;
}
export function Door({ open = false }) {
  const { t } = useLanguage();
  return <div className={`door-illustration ${open ? 'door-open' : ''}`} aria-hidden="true"><div className="door-coordinate">{t(open ? 'door.open' : 'door.closed')}</div><div className="door-frame"><div className="door-inner"><span className="door-handle" /></div></div><div className="door-floor" /><span className="door-caption">{t(open ? 'door.other' : 'door.unlocked')}</span></div>;
}
export function formatTime(ms) {
  const seconds = Math.max(0, Math.floor(ms / 1000));
  return `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;
}
