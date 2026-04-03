import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { AuthProvider } from './context/AuthContext';
import './index.css';

const vibe = (ms) => { if (navigator.vibrate) navigator.vibrate(ms); };

// Short tap on every interactive element
document.addEventListener('click', (e) => {
  const el = e.target.closest(
    'button, a, input[type="range"], input[type="checkbox"], input[type="radio"], label, select, [role="button"], [role="tab"], [role="switch"]'
  );
  if (el) vibe(6);
}, { passive: true });

// Instant feel on press down
document.addEventListener('pointerdown', (e) => {
  const el = e.target.closest('button, a, [role="button"]');
  if (el) vibe(4);
}, { passive: true });

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <AuthProvider>
      <App />
    </AuthProvider>
  </React.StrictMode>
);