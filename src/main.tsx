import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { AuthProvider } from './context/AuthContext';
import { initCrashlytics } from './firebase/crashlytics';
import { CrashErrorBoundary } from './components/CrashErrorBoundary';

// Initialize Firebase Crashlytics Web Exception Monitor
initCrashlytics();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AuthProvider>
      <CrashErrorBoundary>
        <App />
      </CrashErrorBoundary>
    </AuthProvider>
  </StrictMode>,
);
