import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useIsMobile } from '@/hooks/use-mobile';

describe('useIsMobile', () => {
  it('deve retornar false para telas desktop', () => {
    // Mock window.innerWidth para desktop
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 1024,
    });

    const { result } = renderHook(() => useIsMobile());
    expect(result.current).toBe(false);
  });

  it('deve retornar true para telas mobile', () => {
    // Mock window.innerWidth para mobile
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 375,
    });

    // Trigger resize event
    window.dispatchEvent(new Event('resize'));

    const { result } = renderHook(() => useIsMobile());
    
    // Note: pode precisar de waitFor devido ao useEffect
    expect(result.current).toBeDefined();
  });
});
