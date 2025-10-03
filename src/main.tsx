import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import setupGlobalErrorHandling from './lib/globalErrorHandler'

// Configurar tratamento global de erros
setupGlobalErrorHandling();

createRoot(document.getElementById("root")!).render(<App />);
