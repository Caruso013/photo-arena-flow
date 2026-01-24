import React, { useEffect, useRef, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';

interface AntiScreenshotProtectionProps {
  children: React.ReactNode;
}

const AntiScreenshotProtection: React.FC<AntiScreenshotProtectionProps> = ({ children }) => {
  const [obscured, setObscured] = useState(false);
  const timerRef = useRef<number | null>(null);
  const touchStartTime = useRef<number>(0);

  const triggerObscure = useCallback((ms = 2000) => {
    setObscured(true);
    if (timerRef.current) window.clearTimeout(timerRef.current);
    timerRef.current = window.setTimeout(() => setObscured(false), ms);
  }, []);

  useEffect(() => {
    // ============================================
    // PROTEÇÕES - Apenas ações específicas de screenshot
    // ============================================
    
    // Disable right-click context menu APENAS em imagens
    const handleContextMenu = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === 'IMG' || target.closest('img')) {
        e.preventDefault();
        return false;
      }
    };

    // Apenas teclas de screenshot - NÃO bloquear outras teclas úteis
    const handleKeyDown = (e: KeyboardEvent) => {
      const key = e.key ? e.key.toLowerCase() : '';
      
      if (
        e.key === 'PrintScreen' ||
        // Windows: Win + Shift + S (Snipping Tool)
        (e.metaKey && e.shiftKey && key === 's') ||
        // Mac: Cmd + Shift + 3/4/5 (screenshots)
        (e.metaKey && e.shiftKey && (key === '3' || key === '4' || key === '5'))
      ) {
        e.preventDefault();
        triggerObscure(2000);
        return false;
      }
    };

    // Disable drag APENAS em imagens
    const handleDragStart = (e: DragEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === 'IMG') {
        e.preventDefault();
        return false;
      }
    };

    // ============================================
    // PROTEÇÕES MOBILE - Apenas long press em imagens
    // ============================================

    const handleTouchStart = (e: TouchEvent) => {
      touchStartTime.current = Date.now();
      const target = e.target as HTMLElement;
      if (target.tagName === 'IMG' || target.closest('img')) {
        e.preventDefault();
      }
    };

    const handleTouchEnd = (e: TouchEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === 'IMG' || target.closest('img')) {
        const touchDuration = Date.now() - touchStartTime.current;
        // Long press em imagem = tentativa de salvar (> 800ms)
        if (touchDuration > 800) {
          triggerObscure(1500);
        }
      }
    };

    // ============================================
    // REGISTRAR EVENT LISTENERS
    // ============================================

    document.addEventListener('contextmenu', handleContextMenu);
    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('dragstart', handleDragStart);
    document.addEventListener('touchstart', handleTouchStart, { passive: false });
    document.addEventListener('touchend', handleTouchEnd, { passive: false });

    // CSS para proteger imagens e bloquear impressão
    const style = document.createElement('style');
    style.id = 'screenshot-prevention-styles';
    style.textContent = `
      img {
        -webkit-user-select: none !important;
        -webkit-touch-callout: none !important;
        -moz-user-select: none !important;
        user-select: none !important;
      }
      
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

    // Aplicar proteção em imagens existentes
    const images = document.querySelectorAll('img');
    images.forEach(img => {
      img.draggable = false;
      (img.style as any).webkitUserSelect = 'none';
      (img.style as any).webkitTouchCallout = 'none';
    });

    // Cleanup
    return () => {
      document.removeEventListener('contextmenu', handleContextMenu);
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('dragstart', handleDragStart);
      document.removeEventListener('touchstart', handleTouchStart);
      document.removeEventListener('touchend', handleTouchEnd);

      const styleEl = document.getElementById('screenshot-prevention-styles');
      if (styleEl) styleEl.remove();

      const images = document.querySelectorAll('img');
      images.forEach(img => {
        img.draggable = true;
      });
    };
  }, [triggerObscure]);

  return (
    <div 
      className="select-none relative"
      style={{ 
        WebkitUserSelect: 'none',
        WebkitTouchCallout: 'none',
      }}
    >
      {children}
      
      {/* BLUR - Só aparece quando realmente detecta screenshot */}
      {obscured && createPortal(
        <div 
          className="fixed inset-0 z-[99999]"
          style={{ 
            background: 'rgba(0, 0, 0, 0.98)',
            backdropFilter: 'blur(100px)',
            WebkitBackdropFilter: 'blur(100px)',
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            width: '100vw',
            height: '100vh',
          }}
        >
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center text-white p-6 sm:p-8 bg-black/90 rounded-xl border border-white/20 max-w-sm sm:max-w-md mx-4">
              <div className="text-5xl sm:text-6xl mb-4">🔒</div>
              <h2 className="text-xl sm:text-2xl font-bold mb-2">Conteúdo Protegido</h2>
              <p className="text-white/80 text-sm sm:text-base">
                Screenshots são proibidos nesta página.
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
