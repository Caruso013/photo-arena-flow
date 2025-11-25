import { useCallback } from 'react';

type HapticStyle = 'light' | 'medium' | 'heavy' | 'success' | 'warning' | 'error';

export const useHapticFeedback = () => {
  const isSupported = useCallback(() => {
    return 'vibrate' in navigator;
  }, []);

  const respectsReducedMotion = useCallback(() => {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }, []);

  const vibrate = useCallback((pattern: number | number[]) => {
    if (!isSupported() || respectsReducedMotion()) {
      return;
    }
    
    try {
      navigator.vibrate(pattern);
    } catch (error) {
      console.warn('Haptic feedback not available:', error);
    }
  }, [isSupported, respectsReducedMotion]);

  const light = useCallback(() => vibrate(10), [vibrate]);
  const medium = useCallback(() => vibrate(20), [vibrate]);
  const heavy = useCallback(() => vibrate(30), [vibrate]);
  const success = useCallback(() => vibrate([10, 50, 10]), [vibrate]);
  const warning = useCallback(() => vibrate([10, 100, 10]), [vibrate]);
  const error = useCallback(() => vibrate([20, 50, 20, 50, 20]), [vibrate]);

  const trigger = useCallback((style: HapticStyle = 'medium') => {
    const patterns = {
      light,
      medium,
      heavy,
      success,
      warning,
      error
    };
    
    patterns[style]();
  }, [light, medium, heavy, success, warning, error]);

  return {
    trigger,
    light,
    medium,
    heavy,
    success,
    warning,
    error,
    isSupported: isSupported()
  };
};
