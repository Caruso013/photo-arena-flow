import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.0';
import { corsHeaders } from '../_shared/cors.ts';

interface DownloadRequest {
  photo_id: string;
}

interface DownloadResponse {
  signed_url: string;
  expires_in: number;
  token: string;
}

// Store rate limit info (em produção usar Redis/Supabase)
const downloadAttempts: Record<string, { count: number; resetTime: number }> = {};

serve(async (req) => {
  // CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // 1️⃣ VALIDAR AUTENTICAÇÃO (JWT)
    const authHeader = req.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ error: 'Não autorizado - JWT inválido' }),
        { 
          status: 401, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    const token = authHeader.substring(7);
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      console.log('❌ Erro na autenticação:', authError);
      return new Response(
        JSON.stringify({ error: 'Token JWT inválido ou expirado' }),
        { 
          status: 401, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    console.log(`✅ Usuário autenticado: ${user.id}`);

    // 2️⃣ VALIDAR RATE LIMITING (25 downloads/hora por usuário)
    const now = Date.now();
    const userKey = `user-${user.id}`;

    if (downloadAttempts[userKey]) {
      if (now < downloadAttempts[userKey].resetTime) {
        if (downloadAttempts[userKey].count >= 25) {
          console.log(`⚠️ Rate limit atingido para ${user.id}`);
          return new Response(
            JSON.stringify({ 
              error: 'Você atingiu o limite de 25 downloads por hora. Tente novamente mais tarde.' 
            }),
            { 
              status: 429, 
              headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
            }
          );
        }
        downloadAttempts[userKey].count++;
      } else {
        downloadAttempts[userKey] = { count: 1, resetTime: now + 3600000 };
      }
    } else {
      downloadAttempts[userKey] = { count: 1, resetTime: now + 3600000 };
    }

    console.log(`📊 Downloads hoje: ${downloadAttempts[userKey].count}/25`);

    // 3️⃣ EXTRAIR E VALIDAR REQUISIÇÃO
    const body = await req.json() as DownloadRequest;
    const { photo_id } = body;

    if (!photo_id) {
      return new Response(
        JSON.stringify({ error: 'photo_id é obrigatório' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // 4️⃣ VALIDAR SE USUÁRIO COMPROU ESTA FOTO
    const { data: purchase, error: purchaseError } = await supabase
      .from('purchases')
      .select('id, status')
      .eq('buyer_id', user.id)
      .eq('photo_id', photo_id)
      .eq('status', 'completed')
      .single();

    if (purchaseError || !purchase) {
      console.log(`❌ Usuário ${user.id} não comprou foto ${photo_id}`);
      return new Response(
        JSON.stringify({ error: 'Você não comprou esta foto' }),
        { 
          status: 403, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    console.log(`✅ Compra validada: ${purchase.id}`);

    // 5️⃣ OBTER CAMINHO DA FOTO ORIGINAL
    const { data: photo, error: photoError } = await supabase
      .from('photos')
      .select('original_url')
      .eq('id', photo_id)
      .single();

    if (photoError || !photo?.original_url) {
      console.log(`❌ Foto não encontrada: ${photo_id}`);
      return new Response(
        JSON.stringify({ error: 'Foto não encontrada' }),
        { 
          status: 404, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // 6️⃣ EXTRAIR PATH DO BUCKET
    let photoPath = photo.original_url;
    if (photoPath.includes('photos-original/')) {
      const match = photoPath.match(/photos-original\/(.+)$/);
      if (match) {
        photoPath = match[1];
      }
    }

    // 7️⃣ GERAR URL ASSINADA (2 MINUTOS - proteção!)
    const { data: signedData, error: signError } = await supabase
      .storage
      .from('photos-original')
      .createSignedUrl(photoPath, 120); // 2 minutos

    if (signError || !signedData) {
      console.error('❌ Erro ao gerar URL assinada:', signError);
      return new Response(
        JSON.stringify({ error: 'Erro ao gerar link de download' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // 8️⃣ GERAR TOKEN ÚNICO
    const downloadToken = crypto.randomUUID();

    // 9️⃣ REGISTRAR DOWNLOAD NO LOG (AUDITORIA)
    try {
      const ipAddress = req.headers.get('cf-connecting-ip') || 
                       req.headers.get('x-forwarded-for') || 
                       'unknown';
      const userAgent = req.headers.get('user-agent') || 'unknown';

      const { error: logError } = await supabase
        .from('photo_downloads')
        .insert({
          user_id: user.id,
          photo_id: photo_id,
          purchase_id: purchase.id,
          ip_address: ipAddress,
          user_agent: userAgent,
          download_token: downloadToken,
          downloaded_at: new Date().toISOString(),
        });

      if (logError) {
        console.error('⚠️ Erro ao registrar download:', logError);
        // Não falhar se log não funcionar - download já foi autorizado
      } else {
        console.log(`✅ Download registrado no log`);
      }
    } catch (logErr) {
      console.error('⚠️ Erro ao registrar auditoria:', logErr);
    }

    // 🔟 VERIFICAR PADRÕES SUSPEITOS
    try {
      const { data: recentDownloads, error: countError } = await supabase
        .from('photo_downloads')
        .select('id', { count: 'exact' })
        .eq('user_id', user.id)
        .gte('downloaded_at', new Date(now - 3600000).toISOString());

      if (!countError && recentDownloads && recentDownloads.length > 10) {
        console.warn(`⚠️ ALERTA: Usuário ${user.id} fez ${recentDownloads.length} downloads em 1 hora`);
      }
    } catch (err) {
      console.error('⚠️ Erro ao verificar padrões:', err);
    }

    // 1️⃣1️⃣ RETORNAR URL SEGURA
    const response: DownloadResponse = {
      signed_url: signedData.signedUrl,
      expires_in: 120,
      token: downloadToken,
    };

    console.log(`✅ Resposta enviada - URL expira em 120s`);

    return new Response(
      JSON.stringify(response),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('❌ Erro na Edge Function:', error);
    return new Response(
      JSON.stringify({ error: 'Erro ao processar sua requisição' }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
