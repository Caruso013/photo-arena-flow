import { describe, it, expect } from 'vitest';
import { formatCurrency } from '@/lib/utils';

describe('Utils', () => {
  describe('formatCurrency', () => {
    it('deve formatar valores monetários corretamente', () => {
      expect(formatCurrency(100)).toContain('100');
      expect(formatCurrency(100)).toContain('00');
      expect(formatCurrency(1234.56)).toContain('1');
      expect(formatCurrency(1234.56)).toContain('234');
      expect(formatCurrency(0)).toContain('0');
    });

    it('deve lidar com valores negativos', () => {
      const result = formatCurrency(-50);
      expect(result).toContain('-');
      expect(result).toContain('50');
    });

    it('deve arredondar corretamente', () => {
      expect(formatCurrency(10.999)).toContain('11');
      expect(formatCurrency(10.994)).toContain('10');
    });
  });
});
