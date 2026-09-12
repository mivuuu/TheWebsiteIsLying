import { seedChance, QUESTIONS } from './story.js';
import { RED_DURATION, SEVEN_DEPARTURE } from './HorrorDirector.js';
const flag = key => ({ type: 'flag', key });
const unlock = page => ({ type: 'unlock', page });
const message = (textKey, from = 'SYSTEM') => ({ type: 'message', textKey, from });

export const EVENTS = [
  { id: 'logo-recorded', when: s => s.logoClicked, effects: [{ type: 'breakRule', rule: 1 }, { type: 'delay', id: 'logo-memory', afterActions: 12, afterMs: 600000, requiresAudit: true, effects: [message('story.msg.logo', 'ADMIN')] }] },
  { id: 'return-recorded', when: s => s.revisited, effects: [{ type: 'breakRule', rule: 6 }, { type: 'delay', id: 'return-memory', afterActions: 16, afterMs: 120000, effects: [message('story.msg.return')] }] },
  { id: 'first-mutation', when: s => s.page !== 'rules' && s.visits.rules && s.archiveProgress.includes('3.2') && (s.visits.about || s.visits.status), effects: [{ type: 'mutateRule', index: 4, key: 'rule.changed' }, flag('rulesChanged')] },
  { id: 'audit-opened', when: s => s.puzzles.audit, effects: [{ type: 'stage', stage: 'doubt' }, flag('adminAvailable'), ...['logs', 'users', 'files', 'terminal', 'deleted'].map(unlock), message('event.admin', 'ADMIN'), message('story.msg.unauthorized'), { type: 'notice', textKey: 'event.adminNotice' }] },
  { id: 'red-screen', when: s => s.puzzles.audit && s.visits.status && s.page === 'archive' && s.now - s.enteredAt >= 3500, effects: [{ type: 'red', duration: RED_DURATION }] },
  { id: 'red-over', when: s => s.redUntil > 0 && s.now >= s.redUntil, effects: [{ type: 'clearRed' }, { type: 'delay', id: 'red-memory', afterActions: 10, afterMs: 120000, effects: [{ type: 'redMemory' }] }] },
  { id: 'red-click', when: s => s.clickedDuringRed, effects: [{ type: 'breakRule', rule: 2 }] },
  { id: 'name-request', when: s => s.puzzles.audit && s.visits.messages && s.page !== 'page-7' && s.now - s.enteredAt >= 3000, effects: [flag('nameAsked')] },
  { id: 'hidden-invitation', when: s => s.puzzles.audit && (s.readFiles.includes('notice.txt') || s.responses.trust), effects: [unlock('page-7')] },
  { id: 'other-voice', when: s => s.page === 'page-7' && s.now - s.enteredAt >= 4000, effects: [flag('otherVoice'), { type: 'stage', stage: 'investigate' }, { type: 'evidence', key: 'voice' }, message('story.msg.voice', 'ADMIN')] },
  { id: 'directory-closed', when: s => s.page === 'page-7' && s.now - s.enteredAt >= SEVEN_DEPARTURE, effects: [{ type: 'navigate', page: 'files' }] },
  { id: 'archive-restored', when: s => s.puzzles.archive, effects: [message('story.msg.archive'), { type: 'mutateRule', index: 4, key: 'story.rule.hidden' }] },
  { id: 'old-corruption', when: s => s.page === 'old-rules' && s.now - s.enteredAt >= 2000, effects: [flag('oldCorrupted')] },
  { id: 'rule-eight', when: s => s.flags.discoveredRule8, effects: [message('story.msg.before'), { type: 'evidence', key: 'old' }] },
  { id: 'terminal-traced', when: s => s.puzzles.terminal, effects: [{ type: 'stage', stage: 'choose' }, message('story.msg.role', 'ADMIN')] },
  { id: 'site-aggressive', when: s => s.adminTrust >= 4, effects: [message('story.msg.aggressive'), { type: 'hide', page: 'exit', duration: 8000 }] },
  { id: 'admin-cold', when: s => Object.values(s.responses).filter(r => r.answer === 'silent').length >= 2, effects: [message('story.msg.cold', 'ADMIN')] },
  { id: 'hesitation-memory', when: s => Object.values(s.responses).some(r => r.hesitation >= 20000) && s.puzzles.terminal, effects: [message('story.msg.hesitated', 'ADMIN')] },
  { id: 'looked-away', when: s => s.lookedAway && s.puzzles.audit, effects: [flag('welcomeChanged')] },
  { id: 'returning-lie', when: s => s.previousRuns > 0 && s.puzzles.audit, effects: [message('story.msg.firstSession')] },
  ...QUESTIONS.map(q => ({ id: `question-${q.id}`, when: s => q.when(s) && s.page === 'messages', effects: [{ type: 'question', key: q.id }] })),
];
