import { RULES, PAGES } from './content.js';
import { MAINTENANCE_ROUTES } from './maintenance.js';

export const ROUTES = [...PAGES, 'status', 'users', 'logs', 'terminal', 'files', 'help', '404', 'admin', 'mirror', 'deleted', 'old-rules', 'null', 'real-exit', 'page-7', ...MAINTENANCE_ROUTES];
export const PUBLIC_ROUTES = [...PAGES, 'status', 'help', '404'];
export const ARCHIVES = ['3.2', '2.7', '2.1', '1.4', '1.0'];
export const FILES = ['rules.txt', 'session.log', 'notice.txt', 'admin.lock', 'readme.old', 'recovery.dat'];
export const QUESTIONS = [
  { id: 'trust', when: s => s.puzzles.audit, textKey: 'story.q.trust' },
  { id: 'carry', when: s => s.flags.otherVoice, textKey: 'story.q.carry' },
  { id: 'identity', when: s => s.puzzles.terminal, textKey: 'story.q.identity' },
];
export const newStory = seed => ({
  version: 2, sessionSeed: seed, sessionId: `SESSION_${String(1000 + seed % 9000)}`,
  originalRules: [...RULES], currentRules: [...RULES], rulesObserved: [],
  adminTrust: 0, websiteTrust: 0, responses: {}, questionOpenedAt: {},
  puzzles: { audit: false, archive: false, route: false, terminal: false, contradiction: false },
  archiveProgress: [], activeVersion: null, readFiles: [], activeFile: null,
  evidence: [], secrets: [], invalidRoutes: [], invalidPath: '',
  terminalHistory: [], terminalActions: [], commandHistory: [], feedback: null,
  choices: {}, hiddenRoutes: [], log: [], delayed: [], hintLevel: 0,
  redBehavior: 'unseen', actionCount: 0, revisits: 0,
});
export function seedChance(seed, key) {
  let n = seed >>> 0;
  for (const c of key) { n ^= c.charCodeAt(0); n = Math.imul(n, 16777619); }
  n ^= n >>> 16; n = Math.imul(n, 0x45d9f3b); n ^= n >>> 16;
  return (n >>> 0) / 4294967296;
}
export const archiveAvailable = (s, version) => version === '3.2' || (['2.7', '2.1'].includes(version) && s.puzzles.audit) || (version === '1.4' && s.puzzles.archive) || (version === '1.0' && s.flags.discoveredRule8);
export const fileAvailable = (s, file) => !['admin.lock', 'recovery.dat'].includes(file) || (file === 'admin.lock' ? s.puzzles.archive : s.flags.otherVoice);
export const answered = (s, id) => Boolean(s.responses[id]);
export const allAnswered = s => QUESTIONS.every(q => answered(s, q.id));
export const neutralCount = s => Object.values(s.responses).filter(r => r.answer !== 'yes').length;
export const readAllProof = s => s.evidence.includes('old') && s.evidence.includes('them') && s.evidence.includes('mirror');
export function commitEligible(s, protocol) {
  if (s.choices.protocol || !s.puzzles.terminal || !s.flags.discoveredRule8 || !allAnswered(s)) return false;
  if (protocol === 'release') return s.terminalActions.includes('release admin') && s.responses.carry.answer === 'yes' && s.adminTrust >= (s.responses.identity.answer === 'yes' ? 4 : 2) && s.readFiles.includes('admin.lock') && Boolean(s.visits.users);
  if (protocol === 'obey') return s.terminalActions.includes('seal admin') && s.websiteTrust >= 3 && s.rulesBroken.length <= 2 && neutralCount(s) >= 2 && s.redBehavior !== 'unseen';
  if (protocol === 'contain') return s.terminalActions.includes('seal admin') && readAllProof(s) && s.puzzles.contradiction;
  if (protocol === 'detach') return s.puzzles.contradiction && readAllProof(s) && neutralCount(s) >= 2 && s.terminalActions.includes('disconnect claims');
  return false;
}
export function endingEligibility(s) {
  const prepared = s.flags.discoveredRule8 && s.puzzles.archive && s.puzzles.terminal && s.puzzles.route;
  const certified = prepared && s.choices.registry && s.choices.protocol;
  return {
    obeyed: Boolean(certified && s.choices.protocol === 'obey' && s.websiteTrust >= 3 && neutralCount(s) >= 2 && s.rulesBroken.length <= 2),
    freed: Boolean(certified && s.choices.protocol === 'release' && s.terminalActions.includes('release admin') && s.adminTrust >= 2 && s.responses.identity?.answer !== 'yes'),
    replaced: Boolean(certified && s.choices.protocol === 'release' && s.terminalActions.includes('release admin') && s.adminTrust >= 4 && s.responses.identity?.answer === 'yes'),
    trapped: Boolean(certified && s.choices.protocol === 'contain' && s.terminalActions.includes('seal admin') && readAllProof(s)),
    escaped: Boolean(certified && s.choices.protocol === 'detach' && neutralCount(s) >= 2 && s.puzzles.contradiction && readAllProof(s)),
    null: Boolean(prepared && !s.choices.protocol && ['null-deleted', 'null-mirror', 'null-terminal'].every(id => s.secrets.includes(id)) && s.visits.null),
  };
}
export function nextHint(s) {
  if (!s.puzzles.audit) return 'audit';
  if (!s.flags.otherVoice) return 'voice';
  if (!s.puzzles.archive) return 'archive';
  if (!s.flags.discoveredRule8) return 'route';
  if (!s.puzzles.terminal) return 'terminal';
  if (!allAnswered(s)) return 'talk';
  if (!s.puzzles.contradiction && !s.choices.protocol) return 'proof';
  if (!s.choices.protocol) return 'commit';
  if (!s.choices.registry) return 'registry';
  return 'exit';
}
