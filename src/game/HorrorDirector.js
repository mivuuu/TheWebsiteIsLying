import { seedChance } from './story.js';

// A presentation director: never writes puzzle answers, trust, route gates or endings.
export const MINUTE = 60000;
export const RED_DURATION = 32000;
export const SEVEN_DEPARTURE = 24000;
export const initialHorror = (previousEndings = []) => ({
  version: 1, previousEndings, seen: [], history: [], active: null, pending: [],
  nextAt: 5 * MINUTE, lastMajorAt: -10 * MINUTE, counts: [0, 0, 0, 0, 0],
  previousPage: null, hidden: false, hiddenAt: null, returnUntil: 0,
  silenceUntil: 0, dismissed: null, coreSeen: [],
});
const after = (minutes, condition = () => true) => (s, a, elapsed) => elapsed >= minutes * MINUTE && condition(s, a);
const on = (page, condition = () => true) => (s, a) => s.page === page && condition(s, a);
const moved = (s, a) => a.type === 'NAVIGATE' && s.horror.previousPage !== s.page;
const answered = s => Object.keys(s.responses).length > 0;
const DEFINITIONS = [
  { id: 'period', level: 1, duration: 8000, when: after(5, on('home')) },
  { id: 'lower-line', level: 1, duration: 7000, when: after(5, on('about')) },
  { id: 'hover-label', level: 1, duration: 9000, when: after(7, (s, a) => moved(s, a)) },
  { id: 'empty-cursor', level: 1, duration: 6000, when: after(8, on('home')) },
  { id: 'cursor-loss', level: 1, duration: 300, chance: .3, when: after(12, on('about')) },
  { id: 'ghost-line', level: 1, duration: 6000, when: after(8, on('about')) },
  { id: 'rule-answer', level: 1, duration: 14000, when: after(10, on('rules', s => s.puzzles.archive && answered(s))) },
  { id: 'rule-question', level: 1, duration: 11000, when: after(17, on('rules', s => s.puzzles.archive && answered(s))) },
  { id: 'nav-duplicate', level: 1, duration: 9000, when: after(15, (s, a) => moved(s, a)) },
  { id: 'sender-missing', level: 1, duration: 7000, when: after(12, on('messages', s => s.flags.adminAvailable)) },
  { id: 'late-navigation', level: 1, duration: 1500, chance: .55, when: after(7, (s, a) => moved(s, a) && ['about', 'home', 'files'].includes(s.page)) },
  { id: 'typing-abandoned', level: 2, duration: 16000, when: after(10, on('messages', s => s.flags.adminAvailable)) },
  { id: 'incomplete', level: 2, duration: 5000, when: after(12, on('messages', s => s.flags.otherVoice)) },
  { id: 'false-log', level: 2, duration: 18000, when: after(14, on('logs', s => s.puzzles.archive)) },
  { id: 'users-count', level: 2, duration: 12000, when: after(14, on('users', s => s.flags.otherVoice)) },
  { id: 'duplicate-visitor', level: 2, duration: 2000, chance: .12, when: after(18, on('users', s => s.visits.users > 1 && s.flags.otherVoice)) },
  { id: 'rules-black', level: 2, duration: 2000, chance: .25, when: after(15, (s, a) => moved(s, a) && s.page === 'rules' && s.puzzles.archive) },
  { id: 'wrong-page', level: 2, duration: 200, chance: .08, when: after(18, (s, a) => moved(s, a) && s.page === 'files' && s.puzzles.terminal) },
  { id: 'terminal-users', level: 2, duration: 5500, chance: .2, when: after(17, (s, a) => s.page === 'terminal' && a.type === 'COMMAND' && a.command.trim() === 'users') },
  { id: 'tab-title', level: 2, duration: 18000, chance: .12, when: after(12, (s, a) => a.type === 'VISIBILITY' && a.hidden) },
  { id: 'missed-it', level: 1, duration: 2000, chance: .06, when: after(15, (s, a) => a.type === 'VISIBILITY' && !a.hidden && s.page === 'rules') },
  { id: 'room-silence', level: 2, duration: 180000, chance: .35, when: after(18, (s, a) => moved(s, a)) },
  { id: 'visitor-missing', level: 3, duration: 10000, when: after(22, on('users', s => s.flags.otherVoice && s.visits.users > 1)) },
  { id: 'identity-slip', level: 3, duration: 1300, chance: .35, when: after(20, (s, a) => s.page === 'terminal' && a.type === 'COMMAND' && a.command.trim() === 'whoami') },
  { id: 'status-visitor', level: 3, duration: 200, chance: .2, when: after(21, on('status', s => s.puzzles.terminal)) },
  { id: 'false-memory', level: 3, duration: 16000, when: after(24, on('messages', s => answered(s))) },
  { id: 'empty-page', level: 3, duration: 6000, chance: .09, when: after(23, (s, a) => moved(s, a) && ['about', 'home', 'files'].includes(s.page)) },
  { id: 'false-ending', level: 3, duration: 13000, chance: .3, when: after(26, on('exit', s => s.puzzles.terminal && !s.choices.protocol && s.exitAnswer)) },
  { id: 'wrong-sender', level: 4, duration: 16000, chance: .025, when: after(20, on('messages', s => s.previousRuns > 0 && s.flags.adminAvailable)) },
  { id: 'null-memory', level: 2, duration: 18000, when: after(12, on('logs', s => s.horror.previousEndings.includes('null'))) },
  { id: 'chair-memory', level: 2, duration: 18000, when: after(12, on('messages', s => s.horror.previousEndings.includes('replaced'))) },
  { id: 'escaped-memory', level: 1, duration: 3000, when: after(6, on('home', s => s.horror.previousEndings.includes('escaped'))) },
  { id: 'zero', level: 1, duration: 3000, chance: .05, when: after(10, on('rules', s => s.puzzles.archive)) },
  { id: 'third', level: 2, duration: 4000, chance: .02, when: after(15, on('users', s => s.puzzles.archive)) },
  { id: 'wrong', level: 4, duration: 3000, chance: .01, when: after(25, on('home', s => s.puzzles.terminal)) },
];
export const HORROR_EVENTS = DEFINITIONS;
export const BLOCKING_EVENTS = ['rules-black', 'wrong-page', 'empty-page', 'false-ending', 'late-navigation'];
export function horrorActive(s, id) { return s.horror?.active?.id === id && s.now < s.horror.active.until; }
function quietWindow(s) {
  const start = (seedChance(s.sessionSeed, 'quiet-window') < .5 ? 11 : 16) * MINUTE;
  const elapsed = s.now - s.startedAt;
  return elapsed >= start && elapsed < start + 5 * MINUTE;
}
export function memoryMayArrive(s) {
  const h = s.horror;
  return !h || !h.active && h.counts[2] < 5 && !quietWindow(s) && s.now - s.startedAt >= h.nextAt && s.redUntil <= s.now && !['page-7', 'old-rules', 'real-exit', 'null'].includes(s.page);
}
function start(s, def, elapsed) {
  const h = s.horror;
  const active = { id: def.id, level: def.level, at: s.now, until: s.now + def.duration, page: s.page, previousPage: h.previousPage };
  const counts = [...h.counts]; counts[def.level]++;
  const gap = def.level >= 3 ? 240000 : 90000 + Math.floor(seedChance(s.sessionSeed, `gap:${def.id}`) * 40000);
  const pending = [...h.pending];
  if (def.id === 'typing-abandoned') pending.push({ id: 'never-mind', at: s.now + 4 * MINUTE, textKey: 'horror.neverMind', from: 'ADMIN' });
  if (def.id === 'false-memory') pending.push({ id: 'did-not-write', at: s.now + 3 * MINUTE, textKey: 'horror.didNotWrite', from: 'ADMIN' });
  return { ...s, horror: { ...h, active, counts, pending, seen: [...h.seen, def.id], history: [...h.history, { id: def.id, level: def.level, at: s.now }], nextAt: elapsed + gap, lastMajorAt: def.level >= 3 ? elapsed : h.lastMajorAt, silenceUntil: def.id === 'room-silence' ? s.now + 3 * MINUTE : h.silenceUntil } };
}
export function advanceHorror(state, action, previous) {
  let s = state.horror ? state : { ...state, horror: initialHorror() };
  if (!s.started || s.ending) return s;
  let h = { ...s.horror };
  const elapsed = s.now - s.startedAt;
  const newMemory = ['logo-memory', 'return-memory', 'red-memory'].find(id => s.fired.includes(id) && !previous.fired.includes(id));
  if (newMemory) {
    h.nextAt = Math.max(h.nextAt, elapsed + 120000);
    h.counts = h.counts.map((count, level) => level === 2 ? count + 1 : count);
    h.history = [...h.history, { id: newMemory, level: 2, at: s.now }];
  }
  if (s.page !== previous.page) { h.previousPage = previous.page; if (h.active && !BLOCKING_EVENTS.includes(h.active.id)) h.active = null; }
  if (action.type === 'VISIBILITY') {
    h.hidden = Boolean(action.hidden);
    if (action.hidden) h.hiddenAt = s.now;
    else if (h.active?.id === 'tab-title') { h.returnUntil = s.now + 1200; h.active = null; }
  }
  if (action.type === 'HORROR_DISMISS') { h.dismissed = h.active?.id; h.active = null; }
  if (h.active && s.now >= h.active.until) h.active = null;
  // Key story revelations own the stage. Cosmetic anomalies cannot bury their clues.
  const core = s.page === 'page-7' ? `page-7:${s.visits['page-7']}` : s.redUntil > s.now ? 'red' : s.page === 'old-rules' && !s.flags.oldCorrupted ? 'rule-eight' : null;
  if (core) {
    h.active = null;
    if (!h.coreSeen.includes(core)) { h.coreSeen = [...h.coreSeen, core]; h.nextAt = Math.max(h.nextAt, elapsed + 4 * MINUTE); h.lastMajorAt = elapsed; }
  }
  s = { ...s, horror: h };
  if (core || ['page-7', 'null', 'old-rules', 'real-exit'].includes(s.page) || s.choices.protocol || h.active || elapsed < h.nextAt) return s;
  // One genuinely quiet five-minute stretch, with its placement fixed per run.
  if (quietWindow(s)) return s;
  // Optional follow-ups also consume the budget and keep their event IDs across refresh.
  const pending = h.pending.find(p => p.at <= s.now && !h.seen.includes(p.id));
  if (pending && !h.hidden && h.counts[2] < 5) {
    s = start(s, { id: pending.id, level: 2, duration: 10000 }, elapsed);
    return { ...s, messages: [...s.messages, { id: `horror:${pending.id}`, from: pending.from, textKey: pending.textKey, at: elapsed }] };
  }
  const limits = [0, 10, 5, 2, 1];
  const candidates = DEFINITIONS.filter(def => !h.seen.includes(def.id) && h.counts[def.level] < limits[def.level]
    && (def.level < 3 || elapsed - h.lastMajorAt >= 4 * MINUTE)
    && (!h.hidden || def.id === 'tab-title') && def.when(s, action, elapsed)
    && seedChance(s.sessionSeed, `horror:${def.id}`) < (def.chance ?? 1));
  // A stable seed chooses among eligible anomalies; no per-render random rolls.
  candidates.sort((a, b) => seedChance(s.sessionSeed, `order:${a.id}`) - seedChance(s.sessionSeed, `order:${b.id}`));
  if (!candidates.length) return s;
  s = start(s, candidates[0], elapsed);
  if (candidates[0].id === 'identity-slip') s = { ...s, terminalHistory: s.terminalHistory.map((entry, i) => i === s.terminalHistory.length - 1 ? { ...entry, key: 'story.term.visitor' } : entry) };
  if (['zero', 'third', 'wrong'].includes(candidates[0].id)) s = { ...s, rare: { key: candidates[0].id, until: s.horror.active.until }, secrets: [...new Set([...s.secrets, `rare-${candidates[0].id}`])] };
  if (candidates[0].id === 'wrong-sender') {
    s = { ...s, messages: [...s.messages, { id: 'horror:wrong-sender', from: 'ADMIN', textKey: 'horror.sameName', at: elapsed }],
      log: [...s.log, { key: 'horror.log.admin', params: {}, at: elapsed }].slice(-160) };
  }
  return s;
}

// All timing/selection lives here. Components render these projections, without rolls or timers.
export function horrorView(s) {
  const h = s.horror || initialHorror(); const a = h.active; const age = a ? s.now - a.at : 0;
  const id = a && s.now < a.until ? a.id : null;
  const pageAge = s.now - s.enteredAt;
  const redAge = s.redUntil ? RED_DURATION - (s.redUntil - s.now) : -1;
  const sevenVisit = s.visits['page-7'] || 0;
  const falseMemory = h.history.find(entry => entry.id === 'false-memory');
  return {
    id, age, level: a?.level || 0,
    overlay: id && BLOCKING_EVENTS.includes(id) ? id : null,
    previousPage: a?.previousPage,
    falseEndingKey: age < 4000 ? 'ending.title' : age < 9500 ? 'ending.label' : 'horror.resumed',
    rule4: id === 'rule-answer' ? 'horror.rule.answered' : id === 'rule-question' ? 'horror.rule.why' : null,
    navLabels: id === 'hover-label', duplicateArchive: id === 'nav-duplicate',
    typing: id === 'typing-abandoned' || redAge >= 7000 && redAge < 14000,
    redLine: redAge >= 14000 && redAge < 17500 ? 'horror.dont' : redAge >= 26000 && redAge < RED_DURATION ? 'horror.inputAvailable' : null,
    transientMessage: id === 'incomplete' ? 'horror.incomplete' : id === 'false-memory' ? 'horror.noContact' : id === 'chair-memory' ? 'horror.chair' : null,
    wrongSender: id === 'wrong-sender' && age < 4000,
    falseLog: id === 'false-log' ? 'horror.log.stop' : id === 'null-memory' ? 'horror.log.null' : falseMemory && s.now - falseMemory.at >= 180000 && s.now - falseMemory.at < 240000 ? 'horror.log.noContact' : null,
    logAt: a?.at || falseMemory?.at,
    usersMode: id === 'users-count' ? 'count' : id === 'visitor-missing' ? 'missing' : id === 'duplicate-visitor' ? 'extra' : null,
    statusContained: s.puzzles.audit || s.visits.status === 1 && seedChance(s.sessionSeed, 'contained-flash') < .08 && pageAge >= 300 && pageAge < 400,
    statusVisitor: id === 'status-visitor',
    impossibleLog: s.visits.logs > 1 || pageAge >= 15000 || s.puzzles.archive,
    terminalAdmin: id === 'identity-slip' && age >= 500 && age < 800,
    terminalExtra: id === 'terminal-users' && age >= 2000 && age < 4500,
    missed: id === 'missed-it',
    title: h.returnUntil > s.now ? 'horror.title.return' : id === 'tab-title' && h.hidden ? age < 5000 ? 'horror.title.dont' : age < 11000 ? 'horror.title.log' : null : null,
    silence: h.silenceUntil > s.now,
    sevenHeading: sevenVisit === 1 ? pageAge >= 3000 ? 'hidden.first' : null : sevenVisit === 2 ? 'story.seven.back' : null,
    sevenLine: sevenVisit === 1 ? pageAge >= 11000 && pageAge < 19000 ? 'hidden.second' : null : sevenVisit === 2 ? pageAge < 5000 ? 'horror.seven.violation' : pageAge < 11500 ? 'story.seven.good' : null : pageAge >= 15000 ? 'horror.waiting' : null,
    sevenReturn: sevenVisit === 1 ? pageAge >= 21000 : sevenVisit === 2 ? pageAge >= 15000 : pageAge >= 19000,
    exitPrompt: !s.exitAnswer && s.page === 'exit' ? pageAge >= 16000 ? 'horror.exit.check' : pageAge >= 8000 ? 'horror.exit.sure' : null : null,
  };
}
