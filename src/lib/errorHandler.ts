/**
 * Error Handler - Sistema de tratamento de erros centralizado
 * Fornece mensagens específicas e contextuais para cada tipo de erro
 */

import { toast } from '@/components/ui/use-toast';
import { logger } from './logger';

// Tipos de erro comuns
export type ErrorType = 
  | 'network'
  | 'auth'
  | 'validation'
  | 'not_found'
  | 'permission'
  | 'timeout'
  | 'server'
  | 'unknown';

// Mapeamento de mensagens de erro
const errorMessages: Record<string, { title: string; description: string; type: ErrorType }> = {
  // Erros de Rede
  'Network error': {
    title: 'Sem conexão',
    description: 'Verifique sua conexão com a internet e tente novamente.',
    type: 'network'
  },
  'Failed to fetch': {
    title: 'Erro de conexão',
    description: 'Não foi possível conectar ao servidor. Verifique sua internet.',
    type: 'network'
  },
  
  // Erros de Autenticação
  'Invalid login': {
    title: 'Credenciais inválidas',
    description: 'Email ou senha incorretos. Verifique e tente novamente.',
    type: 'auth'
  },
  'Email not confirmed': {
    title: 'Email não confirmado',
    description: 'Confirme seu email antes de fazer login. Verifique sua caixa de entrada.',
    type: 'auth'
  },
  'Auth session missing': {
    title: 'Sessão expirada',
    description: 'Sua sessão expirou. Faça login novamente para continuar.',
    type: 'auth'
  },
  'Unauthorized': {
    title: 'Não autorizado',
    description: 'Você não tem permissão para realizar esta ação.',
    type: 'permission'
  },
  
  // Erros de Validação
  'Data do evento não pode ser no passado': {
    title: 'Data inválida',
    description: 'Escolha uma data futura ou atual para o evento.',
    type: 'validation'
  },
  'Invalid email': {
    title: 'Email inválido',
    description: 'Digite um endereço de email válido.',
    type: 'validation'
  },
  
  // Erros de Timeout
  'timeout': {
    title: 'Tempo esgotado',
    description: 'O servidor demorou muito para responder. Tente novamente.',
    type: 'timeout'
  },
  
  // Erros de Servidor
  'Internal server error': {
    title: 'Erro no servidor',
    description: 'Ocorreu um erro inesperado. Nossa equipe foi notificada.',
    type: 'server'
  },
  '500': {
    title: 'Erro no servidor',
    description: 'Ocorreu um erro inesperado. Tente novamente em alguns minutos.',
    type: 'server'
  },
  
  // Erros de Não Encontrado
  '404': {
    title: 'Não encontrado',
    description: 'O recurso solicitado não foi encontrado.',
    type: 'not_found'
  },
  'Not found': {
    title: 'Não encontrado',
    description: 'O item que você procura não existe ou foi removido.',
    type: 'not_found'
  }
};

// Mensagens contextuais por ação
const contextMessages: Record<string, string> = {
  'login': 'fazer login',
  'signup': 'criar sua conta',
  'upload': 'fazer upload das fotos',
  'create_campaign': 'criar o evento',
  'update_campaign': 'atualizar o evento',
  'delete_campaign': 'excluir o evento',
  'purchase': 'finalizar a compra',
  'apply': 'enviar candidatura',
  'approve': 'aprovar candidatura',
  'reject': 'rejeitar candidatura',
  'fetch': 'carregar os dados',
  'update_profile': 'atualizar seu perfil',
  'reset_password': 'redefinir sua senha',
  'upload_photo': 'enviar a foto',
  'delete_photo': 'excluir a foto',
  'add_to_cart': 'adicionar ao carrinho',
  'checkout': 'finalizar a compra'
};

interface ErrorHandlerOptions {
  context?: keyof typeof contextMessages;
  retry?: () => void | Promise<void>;
  showToast?: boolean;
  logError?: boolean;
}

/**
 * Trata erros de forma inteligente e exibe mensagens apropriadas
 */
export function handleError(
  error: any, 
  options: ErrorHandlerOptions = {}
): { title: string; description: string; type: ErrorType } {
  const { 
    context, 
    retry, 
    showToast = true, 
    logError = true 
  } = options;

  // Log do erro (apenas em dev)
  if (logError) {
    logger.error('Error handled:', error, { context });
  }

  // Extrair mensagem do erro
  const errorMessage = error?.message || error?.error?.message || error?.toString() || 'Unknown error';
  const errorCode = error?.code || error?.status?.toString() || '';

  // Buscar mensagem específica
  let errorInfo = errorMessages[errorMessage] || errorMessages[errorCode];

  // Fallback para mensagem genérica
  if (!errorInfo) {
    errorInfo = {
      title: 'Erro inesperado',
      description: 'Algo deu errado. Tente novamente ou entre em contato conosco.',
      type: 'unknown' as ErrorType
    };
  }

  // Adicionar contexto à descrição
  let description = errorInfo.description;
  if (context && contextMessages[context]) {
    description = `Não foi possível ${contextMessages[context]}. ${description}`;
  }

  // Exibir toast se solicitado
  if (showToast) {
    toast({
      title: errorInfo.title,
      description,
      variant: 'destructive'
    });
  }

  return {
    title: errorInfo.title,
    description,
    type: errorInfo.type
  };
}

/**
 * Wrapper para async/await com tratamento de erro automático
 */
export async function tryCatch<T>(
  fn: () => Promise<T>,
  options: ErrorHandlerOptions = {}
): Promise<{ data: T | null; error: any }> {
  try {
    const data = await fn();
    return { data, error: null };
  } catch (error) {
    handleError(error, options);
    return { data: null, error };
  }
}

/**
 * Extrai mensagem de erro user-friendly de objetos de erro complexos
 */
export function getErrorMessage(error: any): string {
  if (typeof error === 'string') return error;
  if (error?.message) return error.message;
  if (error?.error?.message) return error.error.message;
  if (error?.data?.message) return error.data.message;
  return 'Erro desconhecido';
}

/**
 * Verifica se é um erro de rede/conexão
 */
export function isNetworkError(error: any): boolean {
  const message = getErrorMessage(error).toLowerCase();
  return message.includes('network') || 
         message.includes('fetch') || 
         message.includes('connection') ||
         message.includes('internet');
}

/**
 * Verifica se é um erro de autenticação
 */
export function isAuthError(error: any): boolean {
  const message = getErrorMessage(error).toLowerCase();
  return message.includes('auth') || 
         message.includes('unauthorized') || 
         message.includes('session') ||
         message.includes('login') ||
         message.includes('token');
}
