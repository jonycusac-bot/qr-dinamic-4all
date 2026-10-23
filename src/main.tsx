import {StrictMode, lazy, Suspense} from 'react';
import {createRoot} from 'react-dom/client';
const App = lazy(() => import.meta.env.VITE_ACCOUNT_MODE === 'true' ? import('./AccountApp.tsx') : import('./App.tsx')); 
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Suspense fallback={<p className="p-8">Cargando…</p>}><App /></Suspense>
  </StrictMode>,
);
