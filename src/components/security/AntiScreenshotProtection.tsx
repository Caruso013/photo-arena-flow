import React, { useEffect, useRef, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';

interface AntiScreenshotProtectionProps {
  children: React.ReactNode;
}

// Detectar tipo de dispositivo
const isMobile = () => {
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
};

const isIOS = () => {
  return /iPad|iPhone|iPod/.test(navigator.userAgent) || 
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
};

const isAndroid = () => {
  return /Android/i.test(navigator.userAgent);
};

const AntiScreenshotProtection: React.FC<AntiScreenshotProtectionProps> = ({ children }) => {
  const [obscured, setObscured] = useState(false);
  const timerRef = useRef<number | null>(null);
  const touchStartTime = useRef<number>(0);
  const lastOrientationTime = useRef<number>(0);
  const volumeButtonTime = useRef<number>(0);
  const powerButtonTime = useRef<number>(0);

  const triggerObscure = useCallback((ms = 3000) => {
    setObscured(true);
    if (timerRef.current) window.clearTimeout(timerRef.current);
    timerRef.current = window.setTimeout(() => setObscured(false), ms);
  }, []);

  useEffect(() => {
    // ============================================
    // PROTEÇÕES DESKTOP
    // ============================================
    
    // Disable right-click context menu
    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();
      triggerObscure(2000);
      return false;
    };

    // Disable key combinations for developer tools and screenshots
    const handleKeyDown = (e: KeyboardEvent) => {
      const key = e.key ? e.key.toLowerCase() : '';
      if (
        e.key === 'F12' ||
        (e.ctrlKey && e.shiftKey && key === 'i') ||
        (e.ctrlKey && key === 'u') ||
        (e.ctrlKey && key === 's') ||
        (e.ctrlKey && key === 'a') ||
        (e.ctrlKey && key === 'p') ||
        (e.ctrlKey && e.shiftKey && key === 'c') ||
        e.key === 'PrintScreen' ||
        // Windows: Win + Shift + S (Snipping Tool)
        (e.metaKey && e.shiftKey && key === 's') ||
        // Mac: Cmd + Shift + 3/4/5 (screenshots)
        (e.metaKey && e.shiftKey && (key === '3' || key === '4' || key === '5'))
      ) {
        e.preventDefault();
        triggerObscure(3000);
        return false;
      }
    };

    // Disable text selection
    const handleSelectStart = (e: Event) => {
      e.preventDefault();
      return false;
    };

    // Disable drag and drop
    const handleDragStart = (e: DragEvent) => {
      e.preventDefault();
      return false;
    };

    // ============================================
    // PROTEÇÕES MOBILE (iOS & Android)
    // ============================================

    // Prevenir long press no iOS (3D Touch) e Android
    const handleTouchStart = (e: TouchEvent) => {
      touchStartTime.current = Date.now();
      const target = e.target as HTMLElement;
      if (target.tagName === 'IMG' || target.closest('img')) {
        // Prevenir menu de contexto em imagens
        e.preventDefault();
      }
    };

    const handleTouchEnd = (e: TouchEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === 'IMG' || target.closest('img')) {
        e.preventDefault();
      }
      
      // Detectar long press (possível tentativa de salvar imagem)
      const touchDuration = Date.now() - touchStartTime.current;
      if (touchDuration > 500) {
        // Long press detectado - possível tentativa de salvar imagem
        triggerObscure(2000);
      }
    };

    // Detectar mudança de orientação (comum durante screenshots em alguns dispositivos)
    const handleOrientationChange = () => {
      const now = Date.now();
      // Se a orientação mudar muito rápido, pode ser screenshot
      if (now - lastOrientationTime.current < 1000) {
        triggerObscure(2000);
      }
      lastOrientationTime.current = now;
    };

    // Detectar resize da janela (pode indicar screenshot ou screen recording)
    const handleResize = () => {
      if (isMobile()) {
        // Em mobile, resize pode indicar atividade de screenshot
        triggerObscure(1500);
      }
    };

    // ============================================
    // DETECÇÃO DE SCREENSHOT iOS
    // ============================================
    // iOS não tem API direta, mas podemos detectar padrões:
    // 1. Visibility change + blur em rápida sucessão
    // 2. Touch cancel eventos
    
    let lastBlurTime = 0;
    let lastVisibilityChangeTime = 0;

    const handleWindowBlur = () => {
      lastBlurTime = Date.now();
      
      if (isMobile()) {
        // Em iOS, screenshot causa blur momentâneo
        // Em Android, botões de volume + power causam blur
        triggerObscure(4000);
      } else {
        triggerObscure(3000);
      }
    };

    const handleWindowFocus = () => {
      const now = Date.now();
      const timeSinceBlur = now - lastBlurTime;
      
      // Se blur durou menos de 500ms, provavelmente foi screenshot
      if (timeSinceBlur < 500 && isMobile()) {
        triggerObscure(5000); // Manter blur por mais tempo
      } else {
        setObscured(false);
      }
    };

    // Visibility change - importante para mobile
    const handleVisibilityChange = () => {
      const now = Date.now();
      
      if (document.hidden) {
        lastVisibilityChangeTime = now;
        triggerObscure(5000);
      } else {
        // Voltou a ficar visível
        const hiddenDuration = now - lastVisibilityChangeTime;
        
        // Se ficou escondido por menos de 1 segundo, pode ser screenshot
        if (hiddenDuration < 1000 && isMobile()) {
          triggerObscure(5000);
        }
      }
    };

    // ============================================
    // DETECÇÃO DE SCREENSHOT ANDROID
    // ============================================
    // Android: Volume Down + Power button = Screenshot
    // Detectamos via keydown se o navegador permitir
    
    const handleKeyUp = (e: KeyboardEvent) => {
      const now = Date.now();
      
      // Detectar botões de volume (Android)
      if (e.key === 'VolumeDown' || e.key === 'AudioVolumeDown') {
        volumeButtonTime.current = now;
      }
      
      // Se volume e power foram pressionados juntos (dentro de 300ms)
      if (Math.abs(volumeButtonTime.current - powerButtonTime.current) < 300) {
        triggerObscure(5000);
      }
    };

    // Touch cancel pode indicar screenshot em alguns dispositivos
    const handleTouchCancel = () => {
      if (isMobile()) {
        triggerObscure(3000);
      }
    };

    // ============================================
    // PROTEÇÃO EXTRA: Detectar screen recording
    // ============================================
    
    // Usar a API de mídia para detectar screen capture (se disponível)
    let mediaQueryList: MediaQueryList | null = null;
    
    const checkDisplayCapture = () => {
      try {
        // Alguns navegadores suportam detectar screen capture
        if ('getDisplayMedia' in navigator.mediaDevices) {
          // Se chegou aqui, o navegador suporta screen capture
          // Não podemos prevenir, mas podemos dificultar
        }
      } catch {
        // Ignorar erros
      }
    };

    // Adicionar CSS para prevenir screenshots via media query
    const addScreenshotPreventionStyles = () => {
      const style = document.createElement('style');
      style.id = 'screenshot-prevention-styles';
      style.textContent = `
        /* Prevenir seleção de texto e imagens */
        img {
          -webkit-user-select: none !important;
          -webkit-touch-callout: none !important;
          -moz-user-select: none !important;
          -ms-user-select: none !important;
          user-select: none !important;
          pointer-events: none !important;
        }
        
        /* Permitir clique nos wrappers de imagem */
        .photo-wrapper, [data-photo-wrapper] {
          pointer-events: auto !important;
        }
        
        /* iOS: Prevenir zoom e seleção */
        * {
          -webkit-touch-callout: none;
        }
        
        /* Esconder conteúdo quando printando */
        @media print {
          body * {
            visibility: hidden !important;
          }
          body::after {
            content: "Conteúdo protegido - Impressão não permitida";
            visibility: visible;
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            font-size: 24px;
          }
        }
      `;
      document.head.appendChild(style);
    };

    // ============================================
    // REGISTRAR EVENT LISTENERS
    // ============================================

    // Desktop
    document.addEventListener('contextmenu', handleContextMenu);
    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('keyup', handleKeyUp);
    document.addEventListener('selectstart', handleSelectStart);
    document.addEventListener('dragstart', handleDragStart);
    
    // Mobile + Desktop
    document.addEventListener('visibilitychange', handleVisibilityChange);
    document.addEventListener('touchstart', handleTouchStart, { passive: false });
    document.addEventListener('touchend', handleTouchEnd, { passive: false });
    document.addEventListener('touchcancel', handleTouchCancel);
    window.addEventListener('blur', handleWindowBlur);
    window.addEventListener('focus', handleWindowFocus);
    window.addEventListener('resize', handleResize);
    
    // Mobile específico
    window.addEventListener('orientationchange', handleOrientationChange);

    // Adicionar estilos de proteção
    addScreenshotPreventionStyles();
    checkDisplayCapture();

    // Disable image dragging and iOS callouts specifically
    const images = document.querySelectorAll('img');
    images.forEach(img => {
      img.draggable = false;
      (img.style as any).webkitUserSelect = 'none';
      (img.style as any).webkitTouchCallout = 'none';
      img.addEventListener('dragstart', handleDragStart as any);
      img.addEventListener('touchstart', handleTouchStart as any, { passive: false });
    });

    // Cleanup on component unmount
    return () => {
      // Desktop
      document.removeEventListener('contextmenu', handleContextMenu);
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('keyup', handleKeyUp);
      document.removeEventListener('selectstart', handleSelectStart);
      document.removeEventListener('dragstart', handleDragStart);
      
      // Mobile + Desktop
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      document.removeEventListener('touchstart', handleTouchStart);
      document.removeEventListener('touchend', handleTouchEnd);
      document.removeEventListener('touchcancel', handleTouchCancel);
      window.removeEventListener('blur', handleWindowBlur);
      window.removeEventListener('focus', handleWindowFocus);
      window.removeEventListener('resize', handleResize);
      
      // Mobile específico
      window.removeEventListener('orientationchange', handleOrientationChange);

      // Limpar estilos
      const styleEl = document.getElementById('screenshot-prevention-styles');
      if (styleEl) styleEl.remove();

      // Limpar imagens
      const images = document.querySelectorAll('img');
      images.forEach(img => {
        img.draggable = true;
        img.removeEventListener('dragstart', handleDragStart as any);
        img.removeEventListener('touchstart', handleTouchStart as any);
      });
    };
  }, [triggerObscure]);

  return (
    <div 
      className="select-none relative"
      style={{ 
        userSelect: 'none',
        WebkitUserSelect: 'none',
        WebkitTouchCallout: 'none',
        MozUserSelect: 'none',
        msUserSelect: 'none'
      }}
      onContextMenu={(e) => e.preventDefault()}
    >
      {children}
      
      {/* BLUR TOTAL DA PÁGINA - Renderizado via Portal no body para cobrir TUDO */}
      {obscured && createPortal(
        <div 
          className="fixed inset-0 z-[99999]"
          style={{ 
            background: 'rgba(0, 0, 0, 0.98)',
            backdropFilter: 'blur(100px)',
            WebkitBackdropFilter: 'blur(100px)',
            // Cobrir absolutamente tudo incluindo modais
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            width: '100vw',
            height: '100vh',
          }}
        >
          {/* Mensagem de aviso */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center text-white p-6 sm:p-8 bg-black/90 rounded-xl border border-white/20 max-w-sm sm:max-w-md mx-4">
              <div className="text-5xl sm:text-6xl mb-4">🔒</div>
              <h2 className="text-xl sm:text-2xl font-bold mb-2">Conteúdo Protegido</h2>
              <p className="text-white/80 text-sm sm:text-base">
                {isMobile() 
                  ? 'Screenshots e gravações de tela são detectados e proibidos.'
                  : 'Capturas de tela são proibidas nesta página.'
                }
                <br />
                <span className="text-xs sm:text-sm text-white/60 mt-2 block">
                  Para obter as fotos em alta qualidade, faça a compra.
                </span>
              </p>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};

export default AntiScreenshotProtection;