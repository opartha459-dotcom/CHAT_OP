import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App.jsx';

// In production on Vercel / Netlify, automatically route /api and /uploads to VITE_SERVER_URL if provided
const remoteServer = import.meta.env.VITE_SERVER_URL;
if (import.meta.env.PROD && remoteServer && remoteServer.startsWith('http')) {
  const backendBase = remoteServer.replace(/\/$/, '');
  const originalFetch = window.fetch;
  window.fetch = function (resource, init) {
    if (typeof resource === 'string') {
      if (resource.startsWith('/api') || resource.startsWith('/uploads')) {
        resource = `${backendBase}${resource}`;
      }
    } else if (resource instanceof Request) {
      const url = new URL(resource.url);
      if (url.pathname.startsWith('/api') || url.pathname.startsWith('/uploads')) {
        resource = new Request(`${backendBase}${url.pathname}${url.search}`, resource);
      }
    }
    return originalFetch.call(this, resource, init);
  };
}

// Register PWA Service Worker for Mobile & Phone Installation
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/sw.js')
      .then((reg) => {
        console.log('[PWA] Service Worker registered with scope:', reg.scope);
      })
      .catch((err) => {
        console.warn('[PWA] Service Worker registration failed:', err);
      });
  });
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>
);
