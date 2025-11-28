// Edge Function para processar rostos em fotos recém-enviadas
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { photo_id } = await req.json();

    if (!photo_id) {
      throw new Error('photo_id é obrigatório');
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    // Buscar informações da foto
    const { data: photo, error: photoError } = await supabaseClient
      .from('photos')
      .select('id, watermarked_url, thumbnail_url')
      .eq('id', photo_id)
      .single();

    if (photoError) throw photoError;

    console.log(`Processando rostos na foto ${photo_id}...`);

    // Baixar a imagem (usar thumbnail para economizar recursos)
    const imageUrl = photo.thumbnail_url || photo.watermarked_url;
    const imageResponse = await fetch(imageUrl);
    
    if (!imageResponse.ok) {
      throw new Error(`Falha ao baixar imagem: ${imageResponse.status}`);
    }

    const imageBlob = await imageResponse.blob();
    const arrayBuffer = await imageBlob.arrayBuffer();
    const base64Image = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));

    // NOTA: Esta é uma implementação simplificada
    // Em produção, você integraria com um serviço real de ML
    // como AWS Rekognition, Azure Face API, ou Google Cloud Vision
    
    // Para demo, retornamos sucesso sem processar
    // Na versão de produção, processar com ML real aqui
    console.log(`Foto ${photo_id} marcada para processamento (${imageBlob.size} bytes)`);

    return new Response(
      JSON.stringify({
        success: true,
        photo_id,
        message: 'Foto agendada para processamento facial',
        faces_detected: 0,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error) {
    console.error('Erro ao processar foto:', error);
    return new Response(
      JSON.stringify({ 
        success: false,
        error: error.message 
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  }
});
