// Service Worker para uploads em background
// Este arquivo deve ser colocado na pasta public/

const CACHE_NAME = 'upload-cache-v1';
const urlsToCache = [
  '/',
  '/static/js/bundle.js',
  '/static/css/main.css'
];

// Instalar Service Worker
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        return cache.addAll(urlsToCache);
      })
  );
});

// Interceptar requisições de rede
self.addEventListener('fetch', (event) => {
  // Permite uploads continuarem mesmo quando a página é fechada
  if (event.request.url.includes('/storage/v1/object/')) {
    // Requisições para Supabase storage - não interferir
    return;
  }
  
  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        return response || fetch(event.request);
      }
    )
  );
});

// Gerenciar uploads em background
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'UPLOAD_STATUS') {
    // Receber atualizações de upload do cliente
    console.log('Upload status received:', event.data.payload);
    
    // Mostrar notificação do progresso
    if (event.data.payload.status === 'completed') {
      self.registration.showNotification('STA Fotos - Upload Concluído', {
        body: `${event.data.payload.count} foto(s) enviada(s) com sucesso!`,
        icon: '/favicon.ico',
        badge: '/favicon.ico',
        tag: 'upload-complete',
        requireInteraction: false,
        actions: [
          {
            action: 'view',
            title: 'Ver Fotos'
          }
        ]
      });
    } else if (event.data.payload.status === 'error') {
      self.registration.showNotification('STA Fotos - Erro no Upload', {
        body: 'Algumas fotos falharam no upload. Clique para tentar novamente.',
        icon: '/favicon.ico',
        badge: '/favicon.ico',
        tag: 'upload-error',
        requireInteraction: true,
        actions: [
          {
            action: 'retry',
            title: 'Tentar Novamente'
          }
        ]
      });
    }
  }
});

// Manipular cliques nas notificações
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  
  if (event.action === 'view') {
    // Abrir dashboard do fotógrafo
    event.waitUntil(
      clients.openWindow('/dashboard')
    );
  } else if (event.action === 'retry') {
    // Informar o cliente para tentar novamente
    event.waitUntil(
      clients.matchAll().then((clientList) => {
        for (const client of clientList) {
          client.postMessage({
            type: 'RETRY_UPLOADS'
          });
        }
      })
    );
  } else {
    // Clique simples - abrir dashboard
    event.waitUntil(
      clients.openWindow('/dashboard')
    );
  }
});

// Manter o service worker ativo para uploads de longa duração
self.addEventListener('sync', (event) => {
  if (event.tag === 'upload-retry') {
    event.waitUntil(
      // Notificar o cliente para tentar uploads pendentes novamente
      clients.matchAll().then((clientList) => {
        for (const client of clientList) {
          client.postMessage({
            type: 'BACKGROUND_SYNC_RETRY'
          });
        }
      })
    );
  }
});