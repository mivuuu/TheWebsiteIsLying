import { useGame } from '../game/GameContext.jsx';
import { endingEligibility } from '../game/story.js';
import { auditDiagnostics } from '../game/rules.js';
import { useLanguage } from '../translations/LanguageContext.jsx';
function MaintenanceDebug() {
  const { debug } = useGame(); const { t } = useLanguage();
  return <><pre dir="ltr">{JSON.stringify({ registry: debug.registry, storageKeys: debug.storageKeys }, null, 2)}</pre>{debug.registry.map(ending => <button key={ending.id} onClick={() => debug.unlockEnding(ending.id)}>{t('maintenance.debugUnlock')} / {t(ending.titleKey)}</button>)}<button onClick={debug.clearCurrentRun}>{t('maintenance.current')}</button><button onClick={debug.clearMeta}>{t('maintenance.debugMeta')}</button></>;
}
export default function DevPanel() {
  const { t } = useLanguage();
  return <details className="debug-panel" data-presentation-control><summary>{t('story.debug')}</summary><MaintenanceDebug /><StateDebug /></details>;
}
function StateDebug() {
  const { state } = useGame(); const { t } = useLanguage();
  const mismatch = auditDiagnostics(state);
  return <pre dir="ltr">{JSON.stringify({ stage: state.stage, seed: state.sessionSeed, rules: state.rulesBroken, admin: state.adminTrust, website: state.websiteTrust, unlocked: state.unlocked, fired: state.fired, puzzles: state.puzzles, choices: state.choices, eligible: endingEligibility(state), horror: state.horror, mismatch }, null, 2)}</pre>;
}

