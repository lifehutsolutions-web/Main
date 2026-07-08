import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { AuthProvider } from './context/AuthContext';

// Prevent scroll wheel from changing values on input type="number" elements
document.addEventListener('wheel', (e) => {
  const target = e.target as HTMLElement | null;
  if (target && target.tagName === 'INPUT' && (target as HTMLInputElement).type === 'number') {
    e.preventDefault();
  }
}, { passive: false });

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AuthProvider>
      <App />
    </AuthProvider>
  </StrictMode>,
);