import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import { VitePWA } from 'vite-plugin-pwa';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [
    react(),
    mode === 'development' && componentTagger(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'robots.txt', 'lovable-uploads/*.png'],
      manifest: {
        name: 'STA Fotos - Plataforma de Fotografia Esportiva',
        short_name: 'STA Fotos',
        description: 'Plataforma profissional para comercialização de fotografias esportivas',
        theme_color: '#0EA5E9',
        background_color: '#ffffff',
        display: 'standalone',
        orientation: 'portrait',
        scope: '/',
        start_url: '/',
        icons: [
          {
            src: '/lovable-uploads/6fdfc5d2-230c-4142-bf7c-3a326e5e45a8.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any maskable'
          },
          {
            src: '/lovable-uploads/6fdfc5d2-230c-4142-bf7c-3a326e5e45a8.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable'
          }
        ],
        categories: ['photography', 'sports', 'business'],
        shortcuts: [
          {
            name: 'Eventos',
            short_name: 'Eventos',
            description: 'Ver todos os eventos',
            url: '/#/events',
            icons: [{ src: '/lovable-uploads/6fdfc5d2-230c-4142-bf7c-3a326e5e45a8.png', sizes: '96x96' }]
          },
          {
            name: 'Dashboard',
            short_name: 'Dashboard',
            description: 'Acessar meu dashboard',
            url: '/#/dashboard',
            icons: [{ src: '/lovable-uploads/6fdfc5d2-230c-4142-bf7c-3a326e5e45a8.png', sizes: '96x96' }]
          }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,jpg,jpeg,webp}'],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/gtpqppvyjrnnuhlsbpqd\.supabase\.co\/.*/i,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'supabase-cache',
              expiration: {
                maxEntries: 100,
                maxAgeSeconds: 60 * 60 * 24 * 7 // 7 dias
              },
              cacheableResponse: {
                statuses: [0, 200]
              }
            }
          },
          {
            urlPattern: /\.(?:png|jpg|jpeg|svg|gif|webp)$/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'images-cache',
              expiration: {
                maxEntries: 200,
                maxAgeSeconds: 60 * 60 * 24 * 30 // 30 dias
              }
            }
          },
          {
            urlPattern: /\.(?:js|css)$/i,
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'static-resources',
            }
          }
        ],
        cleanupOutdatedCaches: true,
        skipWaiting: true,
        clientsClaim: true
      },
      devOptions: {
        enabled: false // Desabilitar em dev para não conflitar
      }
    })
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  esbuild: {
    // Remove console.logs e debuggers em produção
    drop: mode === 'production' ? ['console', 'debugger'] : [],
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          // Vendor chunks
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          'ui-vendor': ['@radix-ui/react-dialog', '@radix-ui/react-dropdown-menu', '@radix-ui/react-select'],
          'supabase': ['@supabase/supabase-js'],
          'tanstack': ['@tanstack/react-query'],
          
          // Feature chunks
          'dashboard': [
            './src/pages/Dashboard.tsx',
            './src/pages/dashboard/Overview.tsx',
            './src/pages/dashboard/MyEvents.tsx',
            './src/pages/dashboard/MyPhotos.tsx',
            './src/pages/dashboard/MyPurchases.tsx',
            './src/pages/dashboard/Financial.tsx',
            './src/pages/dashboard/Profile.tsx',
          ],
          'admin': [
            './src/pages/dashboard/admin/Overview.tsx',
            './src/pages/dashboard/admin/Events.tsx',
            './src/pages/dashboard/admin/Photographers.tsx',
            './src/pages/dashboard/admin/Users.tsx',
            './src/pages/dashboard/admin/Organizations.tsx',
            './src/pages/dashboard/admin/Financial.tsx',
            './src/pages/dashboard/admin/Reports.tsx',
          ],
          'campaign': ['./src/pages/Campaign.tsx'],
          'checkout': [
            './src/pages/CheckoutSuccess.tsx',
            './src/pages/CheckoutProcessing.tsx',
            './src/pages/CheckoutFailure.tsx',
          ],
        },
      },
    },
    // Aumentar limite de warning para chunks grandes conhecidos
    chunkSizeWarningLimit: 600,
  },
}));
