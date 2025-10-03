import { toast } from '@/components/ui/use-toast';

// Interceptador global para tratar erros de rede e HTTP
export const setupGlobalErrorHandling = () => {
  // Interceptador para fetch global
  const originalFetch = window.fetch;
  
  window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    try {
      const response = await originalFetch(input, init);
      
      // Se a resposta não for ok, vamos tratar alguns erros específicos
      if (!response.ok) {
        const url = typeof input === 'string' ? input : input.toString();
        
        // Log do erro para debugging
        console.error(`Erro HTTP ${response.status} em ${url}`);
        
        // Não mostrar toast para algumas URLs específicas (como edge functions em desenvolvimento)
        const shouldShowToast = !url.includes('/functions/') || response.status >= 500;
        
        if (shouldShowToast) {
          let errorMessage = 'Ocorreu um erro de comunicação. ';
          
          switch (response.status) {
            case 400:
              errorMessage = 'Dados inválidos enviados. Verifique as informações e tente novamente.';
              break;
            case 401:
              errorMessage = 'Acesso não autorizado. Faça login novamente.';
              break;
            case 403:
              errorMessage = 'Você não tem permissão para esta ação.';
              break;
            case 404:
              errorMessage = 'Recurso não encontrado. A página ou serviço pode ter sido removido.';
              break;
            case 429:
              errorMessage = 'Muitas tentativas. Aguarde alguns minutos e tente novamente.';
              break;
            case 500:
              errorMessage = 'Erro interno do servidor. Nossa equipe foi notificada.';
              break;
            case 502:
            case 503:
            case 504:
              errorMessage = 'Serviço temporariamente indisponível. Tente novamente em alguns minutos.';
              break;
            default:
              errorMessage += `Se o problema persistir, entre em contato: contato@stafotos.com (Código: ${response.status})`;
          }
          
          // Só mostrar toast para erros críticos ou se não for uma requisição de edge function
          if (response.status >= 500 || !url.includes('/functions/')) {
            toast({
              title: `Erro ${response.status}`,
              description: errorMessage,
              variant: 'destructive',
            });
          }
        }
      }
      
      return response;
    } catch (error) {
      // Erro de rede (sem internet, timeout, etc.)
      console.error('Erro de rede:', error);
      
      toast({
        title: 'Erro de conexão',
        description: 'Verifique sua conexão com a internet e tente novamente. Se o problema persistir, entre em contato: contato@stafotos.com',
        variant: 'destructive',
      });
      
      throw error;
    }
  };

  // Interceptador para erros não capturados
  window.addEventListener('error', (event) => {
    console.error('Erro global capturado:', event.error);
    
    // Só mostrar toast para erros críticos, não para warnings ou erros menores
    if (event.error && event.error.stack) {
      toast({
        title: 'Erro inesperado',
        description: 'Ocorreu um erro inesperado. A página será recarregada automaticamente. Se o problema persistir, entre em contato: contato@stafotos.com',
        variant: 'destructive',
      });
      
      // Recarregar a página após 3 segundos
      setTimeout(() => {
        window.location.reload();
      }, 3000);
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