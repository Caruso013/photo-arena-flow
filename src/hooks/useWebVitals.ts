import { useEffect } from 'react';
import { onCLS, onINP, onFCP, onLCP, onTTFB, type Metric } from 'web-vitals';
import * as Sentry from '@sentry/react';

export interface WebVitalsOptions {
  reportToConsole?: boolean;
  reportToSentry?: boolean;
  reportToAnalytics?: boolean;
}

/**
 * Hook para rastrear Web Vitals e enviar métricas para Sentry/Analytics
 * 
 * Web Vitals rastreadas:
 * - CLS (Cumulative Layout Shift): estabilidade visual
 * - INP (Interaction to Next Paint): interatividade (substitui FID)
 * - FCP (First Contentful Paint): primeira renderização
 * - LCP (Largest Contentful Paint): carregamento principal
 * - TTFB (Time to First Byte): tempo de resposta do servidor
 */
export function useWebVitals(options: WebVitalsOptions = {}) {
  const {
    reportToConsole = import.meta.env.DEV,
    reportToSentry = import.meta.env.PROD,
    reportToAnalytics = false,
  } = options;

  useEffect(() => {
    const handleMetric = (metric: Metric) => {
      // Log no console (apenas em desenvolvimento)
      if (reportToConsole) {
        console.log(`[Web Vitals] ${metric.name}:`, metric.value, metric);
      }

      // Enviar para Sentry (em produção)
      if (reportToSentry) {
        Sentry.metrics.distribution(metric.name, metric.value, {
          unit: 'millisecond',
        });
      }

      // Enviar para Google Analytics ou outra ferramenta
      if (reportToAnalytics && typeof window !== 'undefined' && (window as any).gtag) {
        (window as any).gtag('event', metric.name, {
          value: Math.round(metric.name === 'CLS' ? metric.value * 1000 : metric.value),
          event_category: 'Web Vitals',
          event_label: metric.id,
          non_interaction: true,
        });
      }
    };

    // Registrar callbacks para cada métrica
    onCLS(handleMetric);
    onINP(handleMetric); // INP substituiu FID
    onFCP(handleMetric);
    onLCP(handleMetric);
    onTTFB(handleMetric);
  }, [reportToConsole, reportToSentry, reportToAnalytics]);
}

/**
 * Função para reportar Web Vitals manualmente (pode ser usada em qualquer lugar)
 */
export function reportWebVitals() {
  const handleMetric = (metric: Metric) => {
    // Log
    console.log(`[Web Vitals] ${metric.name}:`, metric.value);

    // Sentry
    if (import.meta.env.PROD) {
      Sentry.metrics.distribution(metric.name, metric.value, {
        unit: 'millisecond',
      });
    }
  };

  onCLS(handleMetric);
  onINP(handleMetric);
  onFCP(handleMetric);
  onLCP(handleMetric);
  onTTFB(handleMetric);
}

/**
 * Interpretar os valores das métricas
 */
export function getMetricRating(name: string, value: number): 'good' | 'needs-improvement' | 'poor' {
  switch (name) {
    case 'CLS':
      if (value <= 0.1) return 'good';
      if (value <= 0.25) return 'needs-improvement';
      return 'poor';
    case 'INP':
      if (value <= 200) return 'good';
      if (value <= 500) return 'needs-improvement';
      return 'poor';
    case 'FCP':
      if (value <= 1800) return 'good';
      if (value <= 3000) return 'needs-improvement';
      return 'poor';
    case 'LCP':
      if (value <= 2500) return 'good';
      if (value <= 4000) return 'needs-improvement';
      return 'poor';
    case 'TTFB':
      if (value <= 800) return 'good';
      if (value <= 1800) return 'needs-improvement';
      return 'poor';
    default:
      return 'needs-improvement';
  }
}
