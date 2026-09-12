// Canonical rule identities carry their puzzle meaning; never parse translated prose.
const RULE_VALUES = Object.freeze({ 'rule.5': 6, 'rule.changed': 7 });
export const rule05Value = rules => RULE_VALUES[rules?.[4]] ?? null;
export const initialAuditEvidence = () => ({ version: 1, archiveReadAt: null, observedAt: null, observedRule: null, lastAttempt: null });
export function auditDiagnostics(s) {
  const e = s.auditEvidence;
  const archivedRule05 = rule05Value(s.originalRules);
  const canonicalCurrentRule05 = rule05Value(s.currentRules);
  const archiveRead = s.archiveProgress.includes('3.2') && e?.archiveReadAt != null;
  const rulesReadAfterArchive = archiveRead && e.observedAt > e.archiveReadAt;
  const mismatchObserved = Boolean(rulesReadAfterArchive && e.observedRule === s.currentRules[4] && canonicalCurrentRule05 != null && archivedRule05 !== canonicalCurrentRule05);
  return { archivedRule05, canonicalCurrentRule05, renderedRule05: canonicalCurrentRule05, mismatchObserved, archiveRead: Boolean(archiveRead), rulesReadAfterArchive: Boolean(rulesReadAfterArchive), expectedMismatchAnswer: { rule: 5, before: archivedRule05, after: canonicalCurrentRule05 } };
}
export function normalizeAuditAnswer(answer) {
  return Object.fromEntries(['rule', 'before', 'after'].map(key => {
    const raw = String(answer[key] ?? '').trim();
    return [key, /^\d{1,2}$/.test(raw) ? Number(raw) : null];
  }));
}
export function auditAnswerMatches(s, answer) {
  const d = auditDiagnostics(s); const normalized = normalizeAuditAnswer(answer);
  return d.mismatchObserved && Object.keys(normalized).every(key => normalized[key] === d.expectedMismatchAnswer[key]);
}
// Only non-evidence rules may be cosmetically projected. Archived copies never use this layer.
export function renderedRules(s, anomaly) {
  return s.currentRules.map((rule, index) => index === 3 && anomaly?.rule4 ? anomaly.rule4 : rule);
}
export function migrateAuditEvidence(s) {
  if (s.auditEvidence?.version === 1) return s;
  const read = s.archiveProgress.includes('3.2');
  const mutated = rule05Value(s.currentRules) === 7;
  const rulesIndex = s.log.findLastIndex(entry => entry.key === 'story.log.visit' && entry.params?.path === '/rules');
  const archiveBeforeRules = s.log.slice(0, rulesIndex).some(entry => entry.key === 'story.log.visit' && entry.params?.path === '/archive');
  // Old saves did not record archive-open/mutation timestamps. Recover only an existing
  // observation record plus an ordered archive → rules visit, never manufacture a visit.
  const observed = read && mutated && s.rulesObserved.includes(5) && archiveBeforeRules && (s.visits.rules >= 2 || s.page === 'rules' || s.feedback?.key === 'story.feedback.mismatch');
  const e = { ...initialAuditEvidence(), archiveReadAt: read ? 0 : null, observedAt: observed ? 1 : null, observedRule: observed ? s.currentRules[4] : null };
  if (observed && s.feedback?.key === 'story.feedback.mismatch' && !s.puzzles.audit && !s.ending) e.lastAttempt = { rule: 5, before: rule05Value(s.originalRules), after: rule05Value(s.currentRules), recovered: true };
  return { ...s, auditEvidence: e, flags: mutated ? { ...s.flags, rulesChanged: true } : s.flags };
}
