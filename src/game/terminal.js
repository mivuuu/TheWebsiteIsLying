// Only whitelisted, simulated commands. Never eval, spawn, fetch or execute shell input.
export const BASIC_COMMANDS = ['help', 'status', 'rules', 'history', 'users', 'clear', 'whoami', 'admin', 'exit'];
export function terminalResult(s, input) {
  const command = input.trim().toLowerCase().replace(/\s+/g, ' ').slice(0, 100);
  const result = (key, params = {}, effects = []) => ({ command, output: { key, params }, effects });
  switch (command) {
    case 'help': return result('story.term.help', { commands: BASIC_COMMANDS.join(' / ') });
    case 'status': return result('story.term.status', { session: s.sessionId });
    case 'rules': return result('story.term.rules');
    case 'history': return result('story.term.history', { count: s.log.length });
    case 'users': return result('story.term.users');
    case 'whoami': return result(s.puzzles.archive ? 'story.term.session' : 'story.term.visitor', { session: s.sessionId });
    case 'admin': return result(s.puzzles.terminal ? 'story.term.admin' : 'story.term.denied');
    case 'exit': return result(s.choices.registry ? 'story.term.realExit' : 'story.term.falseExit');
    case 'clear': return result('story.term.cleared');
    case 'trace origin':
      return s.puzzles.archive && s.readFiles.includes('recovery.dat') ? result('story.term.origin', {}, [{ type: 'flag', key: 'tracePrepared' }]) : result('story.term.denied');
    case 'reconcile lock alias visitor':
      return s.flags.tracePrepared && s.archiveProgress.includes('1.4') && s.readFiles.includes('session.log') ? result('story.term.reconciled', {}, [{ type: 'puzzle', key: 'terminal' }, { type: 'unlock', page: 'admin' }]) : result('story.term.recordsRequired');
    case 'release admin':
      return s.puzzles.terminal && !s.choices.protocol ? result('story.term.release') : result('story.term.denied');
    case 'seal admin':
      return s.flags.discoveredRule8 && s.puzzles.terminal && !s.choices.protocol ? result('story.term.seal') : result('story.term.denied');
    case 'disconnect claims':
      return s.puzzles.contradiction && !s.choices.protocol ? result('story.term.detach') : result('story.term.denied');
    case 'history --erased':
      return s.puzzles.terminal && s.readFiles.includes('readme.old') ? result('story.term.erased', {}, [{ type: 'secret', key: 'null-terminal' }]) : result('story.term.denied');
    default: return command.startsWith('reconcile ') ? result('story.term.orderWrong') : result('story.term.unknown', { command });
  }
}
