import { RED_DURATION, SEVEN_DEPARTURE } from '../src/game/HorrorDirector.js';
import { createInitialState, gameReducer } from '../src/game/engine.js';
export function game(seed = 12345, previousRuns = 0) {
  let state = createInitialState(1000, seed, previousRuns);
  return {
    get state() { return state; },
    act(type, data = {}, advance = 1) { state = gameReducer(state, { type, ...data, now: state.now + advance }); return state; },
    nav(page) { return this.act('NAVIGATE', { page }); },
    command(command) { this.nav('terminal'); return this.act('COMMAND', { command }); },
    reply(question, answer) { this.nav('messages'); return this.act('REPLY', { question, answer }); },
  };
}
export function audit(g) {
  g.act('START'); g.nav('rules'); g.nav('archive'); g.act('OPEN_VERSION', { version: '3.2' });
  g.nav('about'); g.nav('rules'); g.nav('status'); g.act('SOLVE_AUDIT', { rule: '5', before: '6', after: '7' });
}
export function investigate(g, answers = ['no', 'no', 'no']) {
  audit(g);
  g.nav('archive'); g.act('TICK', {}, 3500); g.act('TICK', {}, RED_DURATION);
  g.reply('trust', answers[0]); g.nav('files'); g.act('OPEN_FILE', { file: 'notice.txt' });
  g.nav('page-7'); g.act('TICK', {}, 4000); g.act('TICK', {}, SEVEN_DEPARTURE - 4000);
  g.reply('carry', answers[1]); g.nav('logs'); g.nav('users'); g.nav('archive');
  g.act('OPEN_VERSION', { version: '2.1' }); g.act('SOLVE_ARCHIVE', { code: '6082' });
  g.act('OPEN_VERSION', { version: '1.4' });
  g.nav('missing-a'); g.nav('missing-b'); g.nav('missing-c'); g.nav('old-rules'); g.act('TICK', {}, 2000);
  g.nav('archive'); g.act('OPEN_VERSION', { version: '1.0' });
  g.nav('files'); for (const file of ['recovery.dat', 'session.log', 'admin.lock', 'readme.old']) g.act('OPEN_FILE', { file });
  g.command('trace origin'); g.command('reconcile lock alias visitor');
  g.reply('identity', answers[2]); g.nav('mirror'); g.act('SOLVE_CONTRADICTION', { claims: ['names', 'leaving'] });
  return g;
}
export function complete(g, protocol) {
  g.command(({ obey: 'seal admin', release: 'release admin', contain: 'seal admin', detach: 'disconnect claims' })[protocol]);
  g.nav(protocol === 'obey' ? 'status' : protocol === 'detach' ? 'mirror' : 'admin');
  g.act('COMMIT', { protocol }); g.act('REGISTRY'); g.nav('real-exit'); g.act('COMPLETE');
  return g;
}

