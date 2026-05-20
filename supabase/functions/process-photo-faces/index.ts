// Edge Function para processar rostos em fotos recém-enviadas
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import { corsHeaders } from '../_shared/cors.ts';

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

      // Em vez de processar aqui, enfileiramos um job para um worker dedicado
      console.log(`Criando job de processamento facial para foto ${photo_id} (${imageBlob.size} bytes)`);

      const { data: job, error: jobError } = await supabaseClient
        .from('face_processing_jobs')
        .insert([
          {
            photo_id,
            payload: {
              image_url: imageUrl,
              thumbnail_url: photo.thumbnail_url || null,
            },
            status: 'pending',
          },
        ])
        .select('*')
        .limit(1)
        .single();

      if (jobError) {
        console.error('Erro ao criar job:', jobError);
        throw jobError;
      }

      return new Response(
        JSON.stringify({
          success: true,
          photo_id,
          job_id: job.id,
          message: 'Foto enfileirada para processamento facial',
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
