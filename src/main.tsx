import * as Sentry from '@sentry/react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';

if (import.meta.env.VITE_SENTRY_DSN) {
  Sentry.init({
    dsn: import.meta.env.VITE_SENTRY_DSN,
    environment: import.meta.env.MODE,
    integrations: [
      Sentry.browserTracingIntegration(),
      Sentry.replayIntegration({ maskAllText: false, blockAllMedia: false }),
    ],
    tracesSampleRate: import.meta.env.PROD ? 0.2 : 1.0,
    replaysSessionSampleRate: 0.1,
    replaysOnErrorSampleRate: 1.0,
  });
  setTimeout(() => {
    console.log('Triggering test error for Sentry...');
    throw new Error('Sentry test error');
  }, 3000);
}

// Register Service Worker for PWA — ONLY in production
// In development, unregister any existing SW to prevent stale cache issues
if ('serviceWorker' in navigator) {
  if (import.meta.env.PROD) {
    window.addEventListener('load', () => {
      navigator.serviceWorker
        .register('/sw.js')
        .then(registration => {
          console.log('SW registered:', registration.scope);
        })
        .catch(error => {
          console.log('SW registration failed:', error);
        });
    });
  } else {
    // Dev mode: unregister any active SW + clear caches
    navigator.serviceWorker.getRegistrations().then(registrations => {
      for (const registration of registrations) {
        registration.unregister();
      }
    });
    if ('caches' in window) {
      caches.keys().then(names => {
        for (const name of names) caches.delete(name);
      });
    }
  }
}

createRoot(document.getElementById('root')!).render(<App />);
