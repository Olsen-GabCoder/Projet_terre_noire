import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
        secure: false,
        cookieDomainRewrite: 'localhost',
        configure: (proxy) => {
          proxy.on('proxyRes', (proxyRes) => {
            // S'assurer que les Set-Cookie du backend passent au navigateur
            const cookies = proxyRes.headers['set-cookie'];
            if (cookies) {
              proxyRes.headers['set-cookie'] = cookies.map((cookie) =>
                cookie.replace(/;\s*Secure/gi, '').replace(/;\s*SameSite=\w+/gi, '; SameSite=Lax')
              );
            }
          });
        },
      },
    },
  },
  build: {
    chunkSizeWarningLimit: 500,
    rollupOptions: {
      output: {
        manualChunks(id) {
          // Locale JSON files → i18n chunk (keeps index.js lean)
          if (id.includes('/i18n/locales/')) return 'i18n';

          // Node-modules mappings
          const pkgChunks = {
            vendor: ['react-dom', 'react-router-dom'],
            i18n: ['react-i18next', 'i18next'],
            ui: ['react-hot-toast', 'react-helmet-async'],
            charts: ['recharts'],
            pdf: ['pdfjs-dist'],
            query: ['@tanstack/react-query'],
            icons: ['@fortawesome/fontawesome-free'],
            http: ['axios'],
            sanitize: ['dompurify'],
            utils: ['fast-average-color', 'react-intersection-observer'],
          };
          if (id.includes('node_modules')) {
            for (const [chunk, pkgs] of Object.entries(pkgChunks)) {
              if (pkgs.some(pkg => id.includes(`/node_modules/${pkg}/`))) return chunk;
            }
          }
        },
      },
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/test/setup.js',
    include: ['src/**/*.{test,spec}.{js,jsx}'],
    css: true,
  },
})
