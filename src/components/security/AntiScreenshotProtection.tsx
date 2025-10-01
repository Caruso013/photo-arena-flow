import React, { useEffect, useRef, useState } from 'react';

interface AntiScreenshotProtectionProps {
  children: React.ReactNode;
}

const AntiScreenshotProtection: React.FC<AntiScreenshotProtectionProps> = ({ children }) => {
  const [obscured, setObscured] = useState(false);
  const timerRef = useRef<number | null>(null);

  const triggerObscure = (ms = 2500) => {
    setObscured(true);
    if (timerRef.current) window.clearTimeout(timerRef.current);
    timerRef.current = window.setTimeout(() => setObscured(false), ms);
  };

  useEffect(() => {
    // Disable right-click context menu
    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();
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
        e.key === 'PrintScreen'
      ) {
        e.preventDefault();
        triggerObscure();
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

    // Obscure on visibility change and window focus loss
    const handleVisibilityChange = () => setObscured(document.hidden);
    const handleWindowBlur = () => setObscured(true);
    const handleWindowFocus = () => setObscured(false);

    // Add event listeners
    document.addEventListener('contextmenu', handleContextMenu);
    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('selectstart', handleSelectStart);
    document.addEventListener('dragstart', handleDragStart);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('blur', handleWindowBlur);
    window.addEventListener('focus', handleWindowFocus);

    // Disable image dragging specifically
    const images = document.querySelectorAll('img');
    images.forEach(img => {
      img.draggable = false;
      img.addEventListener('dragstart', handleDragStart as any);
    });

    // Cleanup on component unmount
    return () => {
      document.removeEventListener('contextmenu', handleContextMenu);
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('selectstart', handleSelectStart);
      document.removeEventListener('dragstart', handleDragStart);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('blur', handleWindowBlur);
      window.removeEventListener('focus', handleWindowFocus);

      const images = document.querySelectorAll('img');
      images.forEach(img => {
        img.draggable = true;
        img.removeEventListener('dragstart', handleDragStart as any);
      });
    };
  }, []);

  return (
    <div 
      className="select-none relative"
      style={{ 
        userSelect: 'none',
        WebkitUserSelect: 'none',
        MozUserSelect: 'none',
        msUserSelect: 'none'
      }}
    >
      {children}
      {/* Overlay to obscure content on suspected screenshot attempts */}
      <div 
        className="absolute inset-0 pointer-events-none z-50 transition-all"
        style={{ 
          background: obscured ? 'rgba(0,0,0,0.6)' : 'transparent',
          backdropFilter: obscured ? 'blur(18px) brightness(0.4)' : 'none'
        }}
      />
    </div>
  );
};

export default AntiScreenshotProtection;