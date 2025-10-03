import { useEffect, useState } from 'react';
import { backgroundUploadService } from '@/lib/backgroundUploadService';

export const useServiceWorker = () => {
  const [isSupported, setIsSupported] = useState(false);
  const [isRegistered, setIsRegistered] = useState(false);

  useEffect(() => {
    // Verificar se service workers são suportados
    if ('serviceWorker' in navigator) {
      setIsSupported(true);
      registerServiceWorker();
    }

    // Escutar mensagens do service worker
    const handleMessage = (event: MessageEvent) => {
      if (event.data && event.data.type === 'RETRY_UPLOADS') {
        // Service worker solicita retry de uploads
        retryAllFailedUploads();
      } else if (event.data && event.data.type === 'BACKGROUND_SYNC_RETRY') {
        // Background sync retry
        retryAllFailedUploads();
      }
    };

    navigator.serviceWorker?.addEventListener('message', handleMessage);

    return () => {
      navigator.serviceWorker?.removeEventListener('message', handleMessage);
    };
  }, []);

  const registerServiceWorker = async () => {
    try {
      const registration = await navigator.serviceWorker.register('/upload-sw.js', {
        scope: '/'
      });

      console.log('Service Worker registrado:', registration);
      setIsRegistered(true);

      // Pedir permissão para notificações
      if ('Notification' in window && Notification.permission === 'default') {
        await Notification.requestPermission();
      }

      // Registrar para background sync (se disponível)
      if ('sync' in registration) {
        try {
          await (registration as any).sync.register('upload-retry');
        } catch (error) {
          console.log('Background sync não disponível:', error);
        }
      }

    } catch (error) {
      console.error('Erro ao registrar Service Worker:', error);
    }
  };

  const sendUploadStatus = (status: string, count: number) => {
    if (navigator.serviceWorker?.controller) {
      navigator.serviceWorker.controller.postMessage({
        type: 'UPLOAD_STATUS',
        payload: { status, count }
      });
    }
  };

  const retryAllFailedUploads = () => {
    const uploads = backgroundUploadService.getAllUploads();
    uploads.forEach(batch => {
      if (batch.status === 'failed' || batch.status === 'partially_failed') {
        backgroundUploadService.retryFailedUploads(batch.id);
      }
    });
  };

  const requestNotificationPermission = async () => {
    if ('Notification' in window) {
      const permission = await Notification.requestPermission();
      return permission === 'granted';
    }
    return false;
  };

  return {
    isSupported,
    isRegistered,
    sendUploadStatus,
    requestNotificationPermission,
    retryAllFailedUploads
  };
};

export default useServiceWorker;