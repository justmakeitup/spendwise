import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [
    react(),
    {
      name: 'apk-mime-middleware',
      configureServer(server) {
        server.middlewares.use((req, res, next) => {
          if (req.url && (req.url.endsWith('.apk') || req.url.includes('.apk'))) {
            res.setHeader('Content-Type', 'application/vnd.android.package-archive');
            res.setHeader('Content-Disposition', 'attachment; filename="SpendWise.apk"');
            res.setHeader('X-Content-Type-Options', 'nosniff');
          }
          next();
        });
      },
      configurePreviewServer(server) {
        server.middlewares.use((req, res, next) => {
          if (req.url && (req.url.endsWith('.apk') || req.url.includes('.apk'))) {
            res.setHeader('Content-Type', 'application/vnd.android.package-archive');
            res.setHeader('Content-Disposition', 'attachment; filename="SpendWise.apk"');
            res.setHeader('X-Content-Type-Options', 'nosniff');
          }
          next();
        });
      }
    }
  ],
  server: {
    host: true, // Exposes server to local network (0.0.0.0 / your LAN IP)
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true
      }
    }
  }
});
