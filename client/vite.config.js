import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const backendTarget = env.VITE_SERVER_URL || 'http://localhost:5000';

  return {
    plugins: [react(), tailwindcss()],
    server: {
      port: 5173,
      host: true, // Exposes on local network so phones on Wi-Fi can connect directly
      proxy: {
        '/api': {
          target: backendTarget,
          changeOrigin: true,
          configure: (proxy) => {
            proxy.on('error', (err, _req, res) => {
              if (res && !res.headersSent && typeof res.writeHead === 'function') {
                res.writeHead(503, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ success: false, message: 'Backend server starting up or reconnecting...' }));
              }
            });
          }
        },
        '/uploads': {
          target: backendTarget,
          changeOrigin: true
        },
        '/socket.io': {
          target: backendTarget,
          ws: true,
          configure: (proxy) => {
            proxy.on('error', (err) => {
              // Suppress unhandled socket proxy reset when server restarts
            });
          }
        }
      }
    }
  };
});
