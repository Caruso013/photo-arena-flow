import { createRoot } from 'react-dom/client'
import * as Sentry from '@sentry/react'
import App from './App.tsx'
import './index.css'
import './dark-theme-improvements.css'
import setupGlobalErrorHandling from './lib/globalErrorHandler'

// Inicializar Sentry para monitoramento de erros
Sentry.init({
  dsn: import.meta.env.VITE_SENTRY_DSN || '',
  environment: import.meta.env.MODE,
  integrations: [
    Sentry.browserTracingIntegration(),
    Sentry.replayIntegration({
      maskAllText: true,
      blockAllMedia: true,
    }),
  ],
  // Performance Monitoring
  tracesSampleRate: import.meta.env.PROD ? 0.1 : 1.0,
  // Session Replay
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1.0,
  // Filtrar erros conhecidos
  beforeSend(event, hint) {
    // Ignorar erros de extensões de navegador
    if (event.exception) {
      const error = hint.originalException;
      if (error && typeof error === 'object' && 'message' in error) {
        const message = String(error.message);
        if (message.includes('chrome-extension://') || message.includes('moz-extension://')) {
          return null;
        }
      }
    }
    return event;
  },
  enabled: import.meta.env.PROD, // Apenas em produção
});

// Configurar tratamento global de erros
setupGlobalErrorHandling();

createRoot(document.getElementById("root")!).render(<App />);
