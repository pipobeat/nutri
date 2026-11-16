import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

declare const __SINGLE__: boolean;

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);

if (!__SINGLE__ && 'serviceWorker' in navigator && location.protocol === 'https:') {
  window.addEventListener('load', () => navigator.serviceWorker.register('./sw.js').catch(() => {}));
}
