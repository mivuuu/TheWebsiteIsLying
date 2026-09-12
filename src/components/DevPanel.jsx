import { useGame } from '../game/GameContext.jsx';
import { endingEligibility } from '../game/story.js';
import { auditDiagnostics } from '../game/rules.js';
import { useLanguage } from '../translations/LanguageContext.jsx';
export default function DevPanel() {
  const { state } = useGame(); const { t } = useLanguage();
  const mismatch = auditDiagnostics(state);
  return <details className="debug-panel" data-presentation-control><summary>{t('story.debug')}</summary><pre dir="ltr">{JSON.stringify({ stage: state.stage, seed: state.sessionSeed, rules: state.rulesBroken, admin: state.adminTrust, website: state.websiteTrust, unlocked: state.unlocked, fired: state.fired, puzzles: state.puzzles, choices: state.choices, eligible: endingEligibility(state), horror: state.horror, mismatch }, null, 2)}</pre></details>;
}

