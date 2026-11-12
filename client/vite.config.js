import { defineConfig, loadEnv, createLogger } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const backendTarget =
    env.VITE_SERVER_URI ||
    env.SERVER_URI ||
    env.VITE_SERVER_URL ||
    env.SERVER_URL ||
    'http://127.0.0.1:5000';

  // Custom logger to filter out benign TCP socket resets when tabs refresh or close
  const customLogger = createLogger();
  const originalError = customLogger.error.bind(customLogger);
  customLogger.error = (msg, options) => {
    if (typeof msg === 'string' && (msg.includes('ws proxy error') || msg.includes('ECONNRESET') || msg.includes('ECONNREFUSED'))) {
      return;
    }
    originalError(msg, options);
  };

  return {
    customLogger,
    envPrefix: ['VITE_', 'SERVER_'],
    define: {
      'import.meta.env.VITE_SERVER_URI': JSON.stringify(backendTarget),
      'import.meta.env.SERVER_URI': JSON.stringify(backendTarget),
      'import.meta.env.VITE_SERVER_URL': JSON.stringify(backendTarget),
      'import.meta.env.SERVER_URL': JSON.stringify(backendTarget),
    },
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
          changeOrigin: true,
          ws: true,
          configure: (proxy) => {
            proxy.on('error', () => {});
            proxy.on('proxyReqWsError', () => {});
          }
        }
      }
    }
  };
});
