import React from 'react';
import ReactDOM from 'react-dom/client';
import './base.css';

const root = document.getElementById('root');
if (!root) throw new Error('Root element is missing');

const mobileQuery = window.matchMedia('(max-width: 800px)');
const appModule = mobileQuery.matches ? import('./MobileApp') : import('./App');

appModule.then(({ default: App }) => {
  ReactDOM.createRoot(root).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>,
  );
});

mobileQuery.addEventListener('change', () => window.location.reload());
