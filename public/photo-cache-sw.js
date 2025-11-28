/**
 * Service Worker para Cache de Fotos - OTIMIZADO
 * Estratégia agressiva para reduzir Cached Egress do Supabase
 * Cache-first para thumbnails e medium, Network-first apenas para large
 */

const CACHE_NAME = 'sta-fotos-v3';
const IMAGE_CACHE_NAME = 'sta-images-v3';
const MAX_CACHE_SIZE = 200; // Máximo de imagens no cache

// URLs que devem sempre ser cached
const STATIC_ASSETS = [
  '/',
  '/manifest.json',
  '/lovable-uploads/6fdfc5d2-230c-4142-bf7c-3a326e5e45a8.png'
];

// Instalar Service Worker
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(STATIC_ASSETS))
      .then(() => self.skipWaiting())
  );
});

// Ativar Service Worker
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME && cacheName !== IMAGE_CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Interceptar requisições
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Apenas interceptar imagens
  if (!request.url.match(/\.(jpg|jpeg|png|webp|gif)$/i)) {
    return;
  }

  // Estratégia AGRESSIVA baseada no tamanho da imagem
  const params = new URLSearchParams(url.search);
  const width = parseInt(params.get('width') || '0');
  const isThumbnail = width <= 300; // Thumbnails até 300px
  const isMedium = width > 300 && width <= 600; // Medium até 600px
  const isLarge = width > 600; // Large acima de 600px

  // Cache-first para thumbnails e medium (economiza MUITO Cached Egress)
  if (isThumbnail || isMedium) {
    event.respondWith(
      caches.match(request).then((cachedResponse) => {
        if (cachedResponse) {
          // Retornar do cache IMEDIATAMENTE
          return cachedResponse;
        }

        return fetch(request).then((response) => {
          // Clonar resposta para cache
          const responseToCache = response.clone();
          
          caches.open(IMAGE_CACHE_NAME).then((cache) => {
            cache.put(request, responseToCache);
          });

          return response;
        });
      })
    );
  } else if (isLarge) {
    // Cache-first também para large (mudança para economizar Cached Egress)
    // Usuário já viu o thumbnail/medium, então pode esperar um pouco
    event.respondWith(
      caches.match(request).then((cachedResponse) => {
        if (cachedResponse) {
          return cachedResponse;
        }

        return fetch(request).then((response) => {
          // Salvar no cache
          const responseToCache = response.clone();
          caches.open(IMAGE_CACHE_NAME).then(async (cache) => {
            // Verificar tamanho do cache
            const keys = await cache.keys();
            if (keys.length > MAX_CACHE_SIZE) {
              // Remover primeira entrada (mais antiga)
              await cache.delete(keys[0]);
            }
            cache.put(request, responseToCache);
          });
          return response;
        }).catch(() => {
          // Fallback para cache se offline
          return caches.match(request);
        });
      })
    );
  }
});

// Limpar cache antigo quando exceder 50MB
self.addEventListener('message', (event) => {
  if (event.data.action === 'clearImageCache') {
    event.waitUntil(
      caches.delete(IMAGE_CACHE_NAME)
        .then(() => caches.open(IMAGE_CACHE_NAME))
    );
  }
});
