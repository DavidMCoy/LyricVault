import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';
import { registerSW } from 'virtual:pwa-register';

// Register Service Worker immediately for 100% offline standalone caching
registerSW({
  immediate: true,
  onNeedRefresh() {
    console.log('New content available, auto-updating...');
  },
  onOfflineReady() {
    console.log('LyricVault is completely ready to work offline!');
  }
});

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
