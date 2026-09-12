import { useEffect, useRef, useState } from 'react';
import { useLanguage } from '../translations/LanguageContext.jsx';
import { useGame } from '../game/GameContext.jsx';
export default function AmbientAudio() {
  const { t } = useLanguage(); const { horror, state } = useGame();
  const [enabled, setEnabled] = useState(false); const sound = useRef(null); const sounded = useRef(new Set());
  const silent = horror.silence || Boolean(state.ending) || state.page === 'page-7';
  useEffect(() => () => { sound.current?.context.close(); }, []);
  useEffect(() => {
    if (!sound.current) return;
    const { context, gain } = sound.current;
    gain.gain.cancelScheduledValues(context.currentTime);
    gain.gain.setTargetAtTime(enabled && !silent ? .0035 : 0, context.currentTime, 1.3);
  }, [enabled, silent]);
  useEffect(() => {
    // One quiet electrical tick on selected director events, never at red onset.
    if (!enabled || silent || !sound.current || !['incomplete', 'ghost-line'].includes(horror.id) || sounded.current.has(horror.id)) return;
    sounded.current.add(horror.id);
    const { context } = sound.current; const pulse = context.createOscillator(); const level = context.createGain();
    pulse.type = 'sine'; pulse.frequency.value = 170;
    level.gain.setValueAtTime(0, context.currentTime); level.gain.linearRampToValueAtTime(.0006, context.currentTime + .02); level.gain.linearRampToValueAtTime(0, context.currentTime + .09);
    pulse.connect(level); level.connect(context.destination); pulse.start(); pulse.stop(context.currentTime + .1);
    pulse.onended = () => { pulse.disconnect(); level.disconnect(); };
  }, [horror.id, enabled, silent]);
  async function toggle() {
    if (enabled) { setEnabled(false); return; }
    try {
      if (!sound.current) {
        const context = new AudioContext(); const gain = context.createGain(); gain.gain.value = 0; gain.connect(context.destination);
        for (const frequency of [38, 50, 100.4]) {
          const oscillator = context.createOscillator(); oscillator.frequency.value = frequency; oscillator.type = 'sine'; oscillator.connect(gain); oscillator.start();
        }
        sound.current = { context, gain };
      }
      await sound.current.context.resume(); setEnabled(true);
    } catch { setEnabled(false); }
  }
  return <button className="effects-toggle ambient-control" data-presentation-control aria-pressed={enabled} onClick={toggle}>{t(enabled ? 'story.audio.on' : 'story.audio.off')}</button>;
}
