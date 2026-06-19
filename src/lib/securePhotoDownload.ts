import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

/**
 * Interface da resposta do servidor
 */
interface DownloadResponse {
  signed_url: string;
  expires_in: number;
  token: string;
}

/**
 * Obtém URL segura de download do backend
 * 
 * ✅ Valida autenticação JWT
 * ✅ Valida se usuário comprou a foto
 * ✅ Valida rate limiting (25/hora)
 * ✅ Gera URL com 2 minutos de expiração
 * ✅ Registra auditoria completa
 * 
 * @param photoId - ID da foto para download
 * @returns URL segura assinada ou null em caso de erro
 */
export async function getSecurePhotoDownloadUrl(photoId: string): Promise<string | null> {
  try {
    // 1️⃣ Obter sessão do usuário
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session?.access_token) {
      toast.error('❌ Você precisa estar autenticado para baixar');
      return null;
    }

    // 2️⃣ Preparar requisição
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    if (!supabaseUrl) {
      toast.error('❌ Erro de configuração da aplicação');
      return null;
    }

    const endpoint = `${supabaseUrl}/functions/v1/generate-photo-download`;

    // 3️⃣ Fazer requisição ao backend seguro (com retry curto para webhook/propagação)
    const maxAttempts = 3;
    let response: Response | null = null;
    let errorData: any = null;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ photo_id: photoId }),
      });

      if (response.ok) {
        break;
      }

      try {
        errorData = await response.json();
      } catch {
        errorData = { error: 'Erro desconhecido' };
      }

      // Compra pode estar em processamento por alguns segundos após pagamento aprovado
      if (response.status === 409 && attempt < maxAttempts) {
        await new Promise((resolve) => setTimeout(resolve, 1200 * attempt));
        continue;
      }

      break;
    }

    // 4️⃣ Validar resposta
    if (!response || !response.ok) {
      if (response?.status === 429) {
        toast.error('⏰ Você atingiu o limite de downloads (25 por hora). Tente novamente mais tarde.');
      } else if (response?.status === 409) {
        toast.error('⏳ Pagamento em processamento. Aguarde alguns segundos e tente novamente.');
      } else if (response?.status === 403) {
        toast.error('❌ Compra ainda não identificada para esta foto. Atualize e tente novamente.');
      } else if (response?.status === 401) {
        toast.error('❌ Sua sessão expirou. Faça login novamente.');
      } else {
        toast.error(errorData?.error || '❌ Erro ao gerar link de download');
      }

      console.error(`❌ Erro na geração de URL (${response?.status ?? 'sem status'}):`, errorData);
      return null;
    }

    // 5️⃣ Processar resposta
    const data: DownloadResponse = await response.json();

    if (!data.signed_url) {
      toast.error('❌ URL de download inválida');
      return null;
    }

    console.log(`✅ URL segura gerada. Expira em ${data.expires_in}s`);
    return data.signed_url;

  } catch (error) {
    console.error('❌ Erro ao obter URL de download:', error);
    toast.error('❌ Erro ao processar sua requisição. Tente novamente.');
    return null;
  }
}

/**
 * Verifica quantos downloads o usuário fez hoje
 * (Para avisar quando está perto do limite)
 * 
 * @returns Número de downloads na última hora
 */
export async function getDownloadCountToday(): Promise<number> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return 0;

    const { data, error, count } = await (supabase as any)
      .from('photo_downloads')
      .select('id', { count: 'exact' })
      .eq('user_id', user.id)
      .gte('downloaded_at', new Date(Date.now() - 3600000).toISOString());

    if (error) {
      console.error('Erro ao contar downloads:', error);
      return 0;
    }

    return count || 0;
  } catch (error) {
    console.error('Erro ao verificar contagem:', error);
    return 0;
  }
}

/**
 * Avisa o usuário se está perto do limite
 */
export async function checkDownloadLimit(): Promise<void> {
  const count = await getDownloadCountToday();
  
  if (count >= 24) {
    toast.warning(`⚠️ Você fez ${count}/25 downloads. Limite se aproximando!`);
  }
}
