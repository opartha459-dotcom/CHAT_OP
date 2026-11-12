// Application environment configuration
export const APP_NAME =
  import.meta.env.VITE_APP_NAME ||
  import.meta.env.APP_NAME ||
  'PulseChat';

// Determine backend URL (from env variations or fallback)
export const SERVER_URI =
  import.meta.env.VITE_SERVER_URI ||
  import.meta.env.SERVER_URI ||
  import.meta.env.VITE_SERVER_URL ||
  import.meta.env.SERVER_URL ||
  (typeof window !== 'undefined' && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1'
    ? `${window.location.protocol}//${window.location.hostname}:5000`
    : 'http://127.0.0.1:5000');

export const SERVER_URL = SERVER_URI;

export const API_URL =
  import.meta.env.VITE_API_URL ||
  import.meta.env.API_URL ||
  SERVER_URI;

export const isDev = import.meta.env.DEV;
export const isProd = import.meta.env.PROD;
