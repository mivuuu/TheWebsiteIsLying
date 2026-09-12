// Test-only probe; no debug state is exposed by the production entry point.
import React, { useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { GameProvider, useGame } from '../../src/game/GameContext.jsx';
import { LanguageProvider } from '../../src/translations/LanguageContext.jsx';
import App from '../../src/App.jsx';
import '../../src/styles.css';
function Probe() {
  const { state } = useGame();
  useEffect(() => { window.__gameState = state; }, [state]);
  return null;
}
createRoot(document.getElementById('root')).render(<LanguageProvider><GameProvider><App /><Probe /></GameProvider></LanguageProvider>);
