// Application environment configuration
export const APP_NAME = import.meta.env.VITE_APP_NAME || 'PulseChat';

// Determine backend URL (from env or fallback)
export const SERVER_URL =
  import.meta.env.VITE_SERVER_URL ||
  (typeof window !== 'undefined' && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1'
    ? `${window.location.protocol}//${window.location.hostname}:5000`
    : 'http://localhost:5000');

export const API_URL = import.meta.env.VITE_API_URL || SERVER_URL;

export const isDev = import.meta.env.DEV;
export const isProd = import.meta.env.PROD;
