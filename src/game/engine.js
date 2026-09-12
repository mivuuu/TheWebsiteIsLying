import { EVENTS } from './events.js';
import { PAGES, RULES } from './content.js';
import { newStory, PUBLIC_ROUTES, ROUTES, archiveAvailable, fileAvailable, commitEligible, endingEligibility, QUESTIONS } from './story.js';
import { terminalResult } from './terminal.js';
import { initialHorror, advanceHorror, horrorActive, memoryMayArrive } from './HorrorDirector.js';
import { initialAuditEvidence, auditDiagnostics, auditAnswerMatches, normalizeAuditAnswer, migrateAuditEvidence } from './rules.js';

const unique = (items, value) => [...new Set([...items, value])];
export function createInitialState(now = Date.now(), seed = now >>> 0, previousRuns = 0) {
  return {
    ...newStory(seed), auditEvidence: initialAuditEvidence(), horror: initialHorror(), previousRuns, started: false, page: 'home', stage: 'orientation', now, startedAt: now,
    enteredAt: now, lastActionAt: now, visits: {}, clicks: 0, rulesBroken: [],
    logoClicked: false, adminTrusted: false, revisited: false, lookedAway: false,
    clickedDuringRed: false, redUntil: 0, flags: {}, unlocked: [], fired: [],
    decisions: [], openedRecords: [], activeRecord: null, notice: null,
    name: '', nameDecision: null, exitAnswer: null, ending: null,
    messages: [{ id: 'welcome', from: 'SYSTEM', textKey: 'event.welcome', at: 0 }],
  };
}
function log(s, key, params = {}) {
  return { ...s, log: [...s.log, { key, params, at: s.now - s.startedAt }].slice(-160) };
}
function visit(s, page) {
  const repeat = Boolean(s.visits[page]);
  return log({ ...s, page, enteredAt: s.now, lastActionAt: s.now, feedback: null,
    visits: { ...s.visits, [page]: (s.visits[page] || 0) + 1 }, revisited: s.revisited || repeat,
    revisits: s.revisits + Number(repeat), exitAnswer: null,
  }, 'story.log.visit', { path: `/${page}` });
}
function effect(s, e, id) {
  switch (e.type) {
    case 'breakRule': return s.rulesBroken.includes(e.rule) ? s : log({ ...s, rulesBroken: unique(s.rulesBroken, e.rule) }, 'story.log.rule', { number: String(e.rule).padStart(2, '0') });
    case 'unlock': return { ...s, unlocked: unique(s.unlocked, e.page) };
    case 'flag': return { ...s, flags: { ...s.flags, [e.key]: e.value ?? true } };
    case 'puzzle': return { ...s, hintLevel: 0, puzzles: { ...s.puzzles, [e.key]: true }, feedback: { key: 'story.feedback.accepted' } };
    case 'evidence': return { ...s, evidence: unique(s.evidence, e.key) };
    case 'secret': return { ...s, secrets: unique(s.secrets, e.key) };
    case 'stage': return { ...s, hintLevel: 0, stage: e.stage };
    case 'mutateRule': return { ...s, currentRules: s.currentRules.map((rule, i) => i === e.index ? e.key : rule) };
    case 'notice': return { ...s, notice: { textKey: e.textKey, params: e.params, until: s.now + 11000 } };
    case 'message': return { ...s, messages: [...s.messages, { id, from: e.from, textKey: e.textKey, params: e.params, at: s.now - s.startedAt }] };
    case 'red': return { ...s, redUntil: s.now + e.duration, redBehavior: 'waiting' };
    case 'clearRed': return { ...s, redUntil: 0, redBehavior: s.clickedDuringRed ? 'clicked' : 'waited', rulesObserved: s.clickedDuringRed ? s.rulesObserved : unique(s.rulesObserved, 2) };
    case 'redMemory': return effect(s, { type: 'message', from: 'SYSTEM', textKey: s.clickedDuringRed ? 'story.msg.redClicked' : 'story.msg.redWaited' }, id);
    case 'navigate': return visit(s, e.page);
    case 'question': return { ...s, questionOpenedAt: { ...s.questionOpenedAt, [e.key]: s.now } };
    case 'hide': return { ...s, hiddenRoutes: unique(s.hiddenRoutes, e.page), delayed: [...s.delayed, { id: `${id}-restore`, at: s.now + e.duration, effects: [{ type: 'show', page: e.page }] }] };
    case 'show': return { ...s, hiddenRoutes: s.hiddenRoutes.filter(p => p !== e.page) };
    case 'delay': return { ...s, delayed: [...s.delayed, { id: e.id, action: s.actionCount + e.afterActions, notBefore: s.now + (e.afterMs || 0), requiresAudit: e.requiresAudit, effects: e.effects }] };
    case 'rare': return { ...s, rare: { key: e.key, until: s.now + e.duration }, secrets: unique(s.secrets, `rare-${e.key}`) };
    default: throw new Error(`Unknown event effect: ${e.type}`);
  }
}
export function evaluateEvents(state) {
  if (!state.started || state.ending) return state;
  let s = state;
  for (let pass = 0; pass < EVENTS.length; pass++) {
    let changed = false;
    for (const event of EVENTS) if (!s.fired.includes(event.id) && event.when(s)) {
      s = { ...s, fired: [...s.fired, event.id] };
      for (const e of event.effects) s = effect(s, e, event.id);
      changed = true;
    }
    for (const delayed of s.delayed) if (!s.fired.includes(delayed.id) && (!delayed.requiresAudit || s.puzzles.audit) && s.now >= (delayed.notBefore || 0) && (delayed.at != null ? s.now >= delayed.at : s.actionCount >= delayed.action)) {
      if (['logo-memory', 'return-memory', 'red-memory'].includes(delayed.id) && !memoryMayArrive(s)) continue;
      s = { ...s, fired: [...s.fired, delayed.id] };
      for (const e of delayed.effects) s = effect(s, e, delayed.id);
      if (['logo-memory', 'return-memory', 'red-memory'].includes(delayed.id)) s = { ...s, horror: { ...s.horror, nextAt: s.now - s.startedAt + 120000 } };
      changed = true;
    }
    if (!changed) break;
  }
  return s;
}
function finish(s, id) {
  return { ...s, stage: 'complete', ending: { id, titleKey: `story.ending.${id}`, at: s.now, clicks: s.clicks, pages: Object.keys(s.visits).length, rules: [...s.rulesBroken], duration: s.now - s.startedAt } };
}
function coreReducer(state, action) {
  if (action.type === 'RESTART') return createInitialState(action.now, action.seed, action.previousRuns ?? state.previousRuns);
  if (state.ending) return action.type === 'TICK' ? { ...state, now: action.now } : state;
  let s = { ...state, now: action.now ?? state.now };
  if (!['TICK', 'LOOK_AWAY', 'CLICK', 'HINT', 'VISIBILITY', 'HORROR_DISMISS'].includes(action.type)) s.actionCount++;
  if (!['TICK', 'LOOK_AWAY', 'VISIBILITY', 'HORROR_DISMISS'].includes(action.type)) s.lastActionAt = s.now;
  const fail = (key = 'story.feedback.incomplete') => ({ ...s, feedback: { key } });
  switch (action.type) {
    case 'START': s = visit({ ...s, started: true, startedAt: s.now }, 'home'); break;
    case 'NAVIGATE': {
      if (!s.started) return state;
      const page = String(action.page || '').replace(/^\//, '').slice(0, 64);
      if (page === s.page && page !== '404') return state;
      if (page === 'old-rules' && s.puzzles.archive && s.invalidRoutes.length >= 3) {
        s = effect(effect(s, { type: 'puzzle', key: 'route' }), { type: 'flag', key: 'discoveredRule8' });
        s.unlocked = unique(s.unlocked, page);
      }
      if (page === 'null' && s.flags.discoveredRule8 && ['null-deleted', 'null-mirror', 'null-terminal'].every(key => s.secrets.includes(key))) s.unlocked = unique(s.unlocked, page);
      if (s.hiddenRoutes.includes(page)) { s = fail('story.feedback.sealed'); break; }
      if (!ROUTES.includes(page) || ![...PUBLIC_ROUTES, ...s.unlocked].includes(page)) {
        const path = `/${page.replace(/[^a-z0-9/-]/gi, '')}`;
        s = visit({ ...s, invalidPath: path, invalidRoutes: s.puzzles.archive && !ROUTES.includes(page) ? unique(s.invalidRoutes, path) : s.invalidRoutes }, '404');
      } else s = visit(s, page);
      if (page === 'rules') s.rulesObserved = unique(s.rulesObserved, 5);
      if (s.page === 'rules' && s.auditEvidence.archiveReadAt != null) s.auditEvidence = { ...s.auditEvidence, observedAt: s.actionCount, observedRule: s.currentRules[4] };
      if (page === 'mirror') s.evidence = unique(s.evidence, 'mirror');
      break;
    }
    case 'CLICK': s.clicks++; if (s.redUntil > s.now) s.clickedDuringRed = true; break;
    case 'LOGO': s.logoClicked = true; break;
    case 'LOOK_AWAY': s.lookedAway = true; break;
    case 'OPEN_RECORD': s.activeRecord = s.activeRecord === action.id ? null : action.id; s.openedRecords = unique(s.openedRecords, action.id); break;
    case 'OPEN_VERSION':
      if (!archiveAvailable(s, action.version)) { s = fail('story.feedback.locked'); break; }
      s.activeVersion = action.version; s.archiveProgress = unique(s.archiveProgress, action.version);
      if (action.version === '3.2' && s.auditEvidence.archiveReadAt == null) s.auditEvidence = { ...s.auditEvidence, archiveReadAt: s.actionCount };
      if (action.version === '1.0') s.evidence = unique(s.evidence, 'them');
      break;
    case 'OPEN_FILE':
      if (!fileAvailable(s, action.file)) { s = fail('story.feedback.denied'); break; }
      s.activeFile = action.file; s.readFiles = unique(s.readFiles, action.file);
      if (action.file === 'readme.old') s.unlocked = unique(s.unlocked, 'mirror');
      break;
    case 'SOLVE_AUDIT':
      s.auditEvidence = { ...s.auditEvidence, lastAttempt: normalizeAuditAnswer(action) };
      if (!auditDiagnostics(s).mismatchObserved) { s = fail(); break; }
      if (auditAnswerMatches(s, action)) s = effect(s, { type: 'puzzle', key: 'audit' }); else s = fail('story.feedback.mismatch');
      break;
    case 'SOLVE_ARCHIVE':
      if (!s.flags.otherVoice || !s.visits.logs || !s.visits.status) { s = fail(); break; }
      if (String(action.code).replace(/[\s-]/g, '') === '6082') s = effect(s, { type: 'puzzle', key: 'archive' }); else s = fail('story.feedback.code');
      break;
    case 'SOLVE_CONTRADICTION':
      if (!readProof(s)) { s = fail(); break; }
      if (action.claims?.length === 2 && action.claims.includes('names') && action.claims.includes('leaving')) s = effect(s, { type: 'puzzle', key: 'contradiction' }); else s = fail('story.feedback.proof');
      break;
    case 'REPLY': {
      const q = QUESTIONS.find(q => q.id === action.question);
      if (!q || !q.when(s) || s.responses[q.id] || !['yes', 'no', 'silent'].includes(action.answer)) return state;
      const hesitation = Math.max(0, s.now - (s.questionOpenedAt[q.id] ?? s.now));
      s.responses = { ...s.responses, [q.id]: { answer: action.answer, hesitation } };
      s.adminTrust += action.answer === 'yes' ? 2 : -1;
      s.websiteTrust += action.answer === 'yes' ? -1 : 2;
      s.adminTrusted = s.adminTrust > 0;
      s.decisions = [...s.decisions, { type: q.id, value: action.answer }];
      if (action.answer === 'yes') s = effect(s, { type: 'breakRule', rule: 4 });
      else s.rulesObserved = unique(s.rulesObserved, 4);
      s = effect(s, { type: 'message', from: 'ADMIN', textKey: `story.reply.${q.id}.${action.answer}` }, `reply-${q.id}`);
      s = log(s, 'story.log.reply', { question: String(QUESTIONS.indexOf(q) + 1) });
      break;
    }
    case 'NAME':
      if (!s.flags.nameAsked || s.nameDecision) return state;
      s.name = String(action.name || '').trim().slice(0, 32); s.nameDecision = s.name ? 'provided' : 'withheld';
      s.decisions = [...s.decisions, { type: 'name', value: s.nameDecision }];
      s.notice = { textKey: s.name ? 'event.name' : 'event.withheld', params: { name: s.name }, until: s.now + 11000 }; break;
    case 'COMMAND': {
      const result = terminalResult(s, String(action.command || ''));
      if (!result.command) return state;
      s.commandHistory = [...s.commandHistory, result.command].slice(-30);
      s.terminalHistory = result.command === 'clear' ? [] : [...s.terminalHistory, { command: result.command, ...result.output }].slice(-50);
      if (!['story.term.denied', 'story.term.unknown'].includes(result.output.key)) s.terminalActions = unique(s.terminalActions, result.command);
      for (const e of result.effects) s = effect(s, e, `command-${result.command}`);
      break;
    }
    case 'COMMIT':
      if (!commitEligible(s, action.protocol)) { s = fail(); break; }
      s.choices = { ...s.choices, protocol: action.protocol };
      s.hiddenRoutes = action.protocol === 'release' ? ['mirror', 'deleted'] : ['admin', 'messages'];
      s.stage = 'consequence'; s = visit(s, 'users'); break;
    case 'REGISTRY':
      if (!s.choices.protocol || !s.visits.users) return state;
      s.choices = { ...s.choices, registry: true }; s.unlocked = unique(s.unlocked, 'real-exit');
      s = effect(s, { type: 'notice', textKey: 'story.registry.ready' }); break;
    case 'SECRET':
      if ((action.key === 'null-deleted' && s.page === 'deleted' && s.flags.discoveredRule8) || (action.key === 'null-mirror' && s.page === 'mirror' && s.puzzles.terminal)) s = effect(s, { type: 'secret', key: action.key });
      break;
    case 'EXIT_ANSWER': s.exitAnswer = action.answer; s.decisions = [...s.decisions, { type: 'exit', value: action.answer, violations: [...s.rulesBroken] }]; break;
    case 'COMPLETE': {
      const eligible = endingEligibility(s);
      const id = s.page === 'null' ? eligible.null && 'null' : s.page === 'real-exit' && Object.keys(eligible).find(id => id !== 'null' && eligible[id]);
      if (id) s = finish(s, id); else s = fail();
      break;
    }
    case 'HINT': s.hintLevel = Math.min(3, s.hintLevel + 1); break;
    case 'VISIBILITY': if (action.hidden) s.lookedAway = true; break;
    case 'HORROR_DISMISS': case 'TICK': break;
    default: return state;
  }
  return evaluateEvents(s);
}
export function gameReducer(state, action) {
  state = reconcileAuditSave(state);
  const expiredFalseEnding = horrorActive(state, 'false-ending') && (action.now ?? state.now) >= state.horror.active.until;
  let next = coreReducer(state, action);
  if (action.type === 'RESTART') return { ...next, horror: initialHorror(action.previousEndings || state.horror?.previousEndings || []) };
  if (next === state && !['TICK', 'VISIBILITY', 'HORROR_DISMISS'].includes(action.type)) return state;
  next = advanceHorror(next, action, state);
  if (expiredFalseEnding && !next.ending && !next.choices.protocol && next.page === 'exit') next = coreReducer(next, { type: 'NAVIGATE', page: 'home', now: next.now });
  return next;
}
export function reconcileAuditSave(state) {
  let s = migrateAuditEvidence(state);
  if (!s.ending && !s.puzzles.audit && s.auditEvidence.lastAttempt?.recovered && auditAnswerMatches(s, s.auditEvidence.lastAttempt)) {
    s = effect(s, { type: 'puzzle', key: 'audit' });
    s = evaluateEvents(s);
  }
  return s;
}
function readProof(s) { return ['old', 'them', 'mirror'].every(key => s.evidence.includes(key)); }
export function exitResponse(state) {
  if (state.exitAnswer === 'yes') {
    if (state.rulesBroken.length) return { key: state.rulesBroken.length === 1 ? 'exit.brokenOne' : 'exit.brokenMany', params: { numbers: state.rulesBroken.map(n => String(n).padStart(2, '0')).join(', ') } };
    return { key: 'exit.obedient' };
  }
  return { key: state.rulesBroken.length ? 'exit.admitted' : 'exit.doubt' };
}
