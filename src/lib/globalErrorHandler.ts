import { toast } from '@/components/ui/use-toast';

// Interceptador global para tratar erros de rede e HTTP
export const setupGlobalErrorHandling = () => {
  // NÃO interceptar window.fetch - isso causa conflitos com o Supabase SDK
  // e gera toasts duplicados/cascatas de erros durante saturação do DB.
  // O tratamento de erros é feito diretamente nos componentes e no AuthContext.

  // Interceptador para erros não capturados
  window.addEventListener('error', (event) => {
    console.error('Erro global capturado:', event.error);
    
    // Só mostrar toast para erros críticos, não para warnings ou erros menores
    if (event.error && event.error.stack) {
      toast({
        title: 'Erro inesperado',
        description: 'Ocorreu um erro inesperado. Recarregue a página para continuar. Se o problema persistir, entre em contato: contato@stafotos.com',
        variant: 'destructive',
      });
    }
  });

  // Interceptador para promessas rejeitadas não capturadas
  window.addEventListener('unhandledrejection', (event) => {
    console.error('Promise rejeitada não capturada:', event.reason);
    
    // Só mostrar toast se for um erro crítico
    if (event.reason instanceof Error && event.reason.message) {
      const isCritical = 
        event.reason.message.toLowerCase().includes('network') ||
        event.reason.message.toLowerCase().includes('failed to fetch') ||
        event.reason.message.toLowerCase().includes('timeout');
      
      if (isCritical) {
        toast({
          title: 'Erro de comunicação',
          description: 'Falha na comunicação com o servidor. Verifique sua conexão e tente novamente. Se o problema persistir, entre em contato: contato@stafotos.com',
          variant: 'destructive',
        });
      }
    }
  });
};

export default setupGlobalErrorHandling;