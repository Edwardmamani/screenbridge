import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import './index.css';

window.addEventListener('error', (event) => {
  void window.screenBridge?.logEvent({
    level: 'ERROR',
    source: 'renderer',
    message: event.message || 'Unhandled window error',
    details: { filename: event.filename, lineno: event.lineno, colno: event.colno },
  });
});

window.addEventListener('unhandledrejection', (event) => {
  void window.screenBridge?.logEvent({
    level: 'ERROR',
    source: 'renderer',
    message: 'Unhandled promise rejection',
    details: event.reason instanceof Error ? event.reason.message : String(event.reason),
  });
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
