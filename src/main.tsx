import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';
import { registerPwaServiceWorker } from './pwa/register';

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// Initialize Service Worker registration for PWA offline capabilities
registerPwaServiceWorker();
