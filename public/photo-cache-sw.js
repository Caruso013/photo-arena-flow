/**
 * Service Worker para Cache de Fotos
 * Estratégia: Cache-first para thumbnails, Network-first para fotos grandes
 */

const CACHE_NAME = 'sta-fotos-v1';
const IMAGE_CACHE_NAME = 'sta-images-v1';

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

  // Estratégia baseada no tamanho da imagem (via query params)
  const params = new URLSearchParams(url.search);
  const width = parseInt(params.get('width') || '0');
  const isThumbnail = width <= 400;

  if (isThumbnail) {
    // Cache-first para thumbnails (pequenos)
    event.respondWith(
      caches.match(request).then((cachedResponse) => {
        if (cachedResponse) {
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
  } else {
    // Network-first para imagens grandes
    event.respondWith(
      fetch(request)
        .then((response) => {
          // Salvar no cache para acesso offline
          const responseToCache = response.clone();
          caches.open(IMAGE_CACHE_NAME).then((cache) => {
            cache.put(request, responseToCache);
          });
          return response;
        })
        .catch(() => {
          // Fallback para cache se offline
          return caches.match(request);
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
  
  // Suporte para atualização automática
  if (event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
