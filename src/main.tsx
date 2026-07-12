import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { triggerRealtimeSync } from './sheetsSync';

// Suppress benign WebSocket/HMR connection errors from being shown in the app preview
if (typeof window !== 'undefined') {
  window.addEventListener('unhandledrejection', (event) => {
    const reasonStr = event.reason ? String(event.reason.message || event.reason) : '';
    if (reasonStr.includes('WebSocket') || reasonStr.includes('vite') || reasonStr.includes('hmr')) {
      event.preventDefault();
      console.warn('Silenced benign HMR/WebSocket connection failure:', reasonStr);
    }
  });

  // Intercept localStorage writes on any database table key to trigger background Google Sheets sync in real-time
  const originalSetItem = localStorage.setItem;
  localStorage.setItem = function (key, value) {
    originalSetItem.apply(this, arguments as any);
    if (key.startsWith("dorm_") && key !== "dorm_last_sync_time" && key !== "dorm_gs_url" && key !== "dorm_sidebar_collapsed") {
      triggerRealtimeSync();
    }
  };
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

