import React, { useEffect } from 'react';

interface AntiScreenshotProtectionProps {
  children: React.ReactNode;
}

const AntiScreenshotProtection: React.FC<AntiScreenshotProtectionProps> = ({ children }) => {
  useEffect(() => {
    // Disable right-click context menu
    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();
      return false;
    };

    // Disable key combinations for developer tools and screenshots
    const handleKeyDown = (e: KeyboardEvent) => {
      // Prevent F12, Ctrl+Shift+I, Ctrl+U, Ctrl+S, Ctrl+A, Ctrl+P
      if (
        e.key === 'F12' ||
        (e.ctrlKey && e.shiftKey && e.key === 'I') ||
        (e.ctrlKey && e.key === 'u') ||
        (e.ctrlKey && e.key === 's') ||
        (e.ctrlKey && e.key === 'a') ||
        (e.ctrlKey && e.key === 'p') ||
        (e.ctrlKey && e.shiftKey && e.key === 'C') ||
        e.key === 'PrintScreen'
      ) {
        e.preventDefault();
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

    // Blur content when window loses focus (potential screenshot attempt)
    const handleVisibilityChange = () => {
      const body = document.body;
      if (document.hidden) {
        body.style.filter = 'blur(10px)';
      } else {
        body.style.filter = 'none';
      }
    };

    // Add event listeners
    document.addEventListener('contextmenu', handleContextMenu);
    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('selectstart', handleSelectStart);
    document.addEventListener('dragstart', handleDragStart);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Disable image dragging specifically
    const images = document.querySelectorAll('img');
    images.forEach(img => {
      img.draggable = false;
      img.addEventListener('dragstart', handleDragStart);
    });

    // Clear console periodically
    const clearConsole = setInterval(() => {
      if (typeof console !== 'undefined') {
        console.clear();
      }
    }, 1000);

    // Cleanup on component unmount
    return () => {
      document.removeEventListener('contextmenu', handleContextMenu);
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('selectstart', handleSelectStart);
      document.removeEventListener('dragstart', handleDragStart);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      
      // Reset body filter
      document.body.style.filter = 'none';
      
      // Clear interval
      clearInterval(clearConsole);
      
      // Re-enable image dragging for other pages
      const images = document.querySelectorAll('img');
      images.forEach(img => {
        img.draggable = true;
        img.removeEventListener('dragstart', handleDragStart);
      });
    };
  }, []);

  return (
    <div 
      className="select-none"
      style={{ 
        userSelect: 'none',
        WebkitUserSelect: 'none',
        MozUserSelect: 'none',
        msUserSelect: 'none'
      }}
    >
      {children}
      
      {/* Overlay to detect screenshot attempts */}
      <div 
        className="fixed inset-0 pointer-events-none z-50"
        style={{ 
          background: 'transparent',
          backdropFilter: document.hidden ? 'blur(10px)' : 'none'
        }}
      />
    </div>
  );
};

export default AntiScreenshotProtection;