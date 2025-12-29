// @ts-nocheck - Deno Edge Function shared utility
/**
 * Helpers de Autenticação e Autorização para Supabase Edge Functions
 * 
 * Fornece validação centralizada de roles para operações administrativas
 */

import { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';

export type UserRole = 'admin' | 'photographer' | 'organization' | 'user';

export interface AuthResult {
  authenticated: boolean;
  userId?: string;
  email?: string;
  role?: UserRole;
  error?: string;
}

/**
 * Extrai e valida o usuário a partir do token JWT
 * @param supabase - Cliente Supabase (service role)
 * @param req - Request HTTP
 * @returns Resultado da autenticação
 */
export async function authenticateUser(
  supabase: SupabaseClient,
  req: Request
): Promise<AuthResult> {
  const authHeader = req.headers.get('Authorization');
  
  if (!authHeader) {
    return { 
      authenticated: false, 
      error: 'Token de autenticação não fornecido' 
    };
  }

  const token = authHeader.replace('Bearer ', '');
  
  if (!token || token === authHeader) {
    return { 
      authenticated: false, 
      error: 'Formato de token inválido' 
    };
  }

  try {
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);

    if (userError || !user) {
      console.error('Auth error:', userError);
      return { 
        authenticated: false, 
        error: 'Token inválido ou expirado' 
      };
    }

    // Buscar role do perfil
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role, email')
      .eq('id', user.id)
      .single();

    if (profileError) {
      console.error('Profile fetch error:', profileError);
      return { 
        authenticated: true, 
        userId: user.id,
        email: user.email,
        role: 'user' // Default role
      };
    }

    return {
      authenticated: true,
      userId: user.id,
      email: profile?.email || user.email,
      role: profile?.role as UserRole || 'user'
    };
  } catch (error) {
    console.error('Authentication error:', error);
    return { 
      authenticated: false, 
      error: 'Erro ao validar autenticação' 
    };
  }
}

/**
 * Verifica se o usuário tem uma role específica
 * @param supabase - Cliente Supabase (service role)
 * @param req - Request HTTP
 * @param allowedRoles - Array de roles permitidas
 * @returns Resultado da autorização
 */
export async function authorizeRole(
  supabase: SupabaseClient,
  req: Request,
  allowedRoles: UserRole[]
): Promise<AuthResult & { authorized: boolean }> {
  const authResult = await authenticateUser(supabase, req);
  
  if (!authResult.authenticated) {
    return { ...authResult, authorized: false };
  }

  const authorized = allowedRoles.includes(authResult.role as UserRole);
  
  if (!authorized) {
    console.warn(`Unauthorized access attempt by user ${authResult.userId} with role ${authResult.role}`);
    return { 
      ...authResult, 
      authorized: false,
      error: `Acesso negado. Roles permitidas: ${allowedRoles.join(', ')}`
    };
  }

  return { ...authResult, authorized: true };
}

/**
 * Verifica se o usuário é admin
 * @param supabase - Cliente Supabase (service role)
 * @param req - Request HTTP
 * @returns Resultado da autorização
 */
export async function requireAdmin(
  supabase: SupabaseClient,
  req: Request
): Promise<AuthResult & { authorized: boolean }> {
  return authorizeRole(supabase, req, ['admin']);
}

/**
 * Verifica se o usuário é admin ou organização
 * @param supabase - Cliente Supabase (service role)
 * @param req - Request HTTP
 * @returns Resultado da autorização
 */
export async function requireAdminOrOrganization(
  supabase: SupabaseClient,
  req: Request
): Promise<AuthResult & { authorized: boolean }> {
  return authorizeRole(supabase, req, ['admin', 'organization']);
}

/**
 * Verifica se o usuário é admin, organização ou fotógrafo
 * @param supabase - Cliente Supabase (service role)
 * @param req - Request HTTP
 * @returns Resultado da autorização
 */
export async function requirePrivilegedUser(
  supabase: SupabaseClient,
  req: Request
): Promise<AuthResult & { authorized: boolean }> {
  return authorizeRole(supabase, req, ['admin', 'organization', 'photographer']);
}

/**
 * Gera resposta de erro de autorização padronizada
 * @param error - Mensagem de erro
 * @param statusCode - Código HTTP (default: 403)
 * @param corsHeaders - Headers CORS
 * @returns Response HTTP
 */
export function unauthorizedResponse(
  error: string,
  statusCode: number = 403,
  corsHeaders: Record<string, string> = {}
): Response {
  return new Response(
    JSON.stringify({ 
      error,
      authorized: false 
    }),
    { 
      status: statusCode, 
      headers: { 
        ...corsHeaders, 
        'Content-Type': 'application/json' 
      } 
    }
  );
}
