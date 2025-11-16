// Supabase Edge Function para buscar fotos por reconhecimento facial
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { descriptors, campaign_id, threshold = 0.6 } = await req.json()

    if (!descriptors || !Array.isArray(descriptors) || descriptors.length === 0) {
      throw new Error('Descritores faciais não fornecidos')
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    )

    // Buscar fotos com descritores faciais salvos
    let query = supabaseClient
      .from('photo_face_descriptors')
      .select(`
        id,
        photo_id,
        descriptor,
        photos:photo_id (
          id,
          photo_url,
          campaign_id,
          campaigns:campaign_id (
            id,
            name
          )
        )
      `)

    if (campaign_id) {
      // Se campaign_id fornecido, buscar apenas neste evento
      query = query.eq('photos.campaign_id', campaign_id)
    }

    const { data: photoDescriptors, error } = await query

    if (error) throw error

    // Calcular similaridade usando distância euclidiana
    const calculateSimilarity = (desc1: number[], desc2: number[]): number => {
      if (desc1.length !== desc2.length) return 0
      
      let sum = 0
      for (let i = 0; i < desc1.length; i++) {
        sum += Math.pow(desc1[i] - desc2[i], 2)
      }
      
      const distance = Math.sqrt(sum)
      // Converter distância para similaridade (0-1)
      // Quanto menor a distância, maior a similaridade
      return Math.max(0, 1 - distance / 2)
    }

    // Encontrar matches
    const matches = []
    const userDescriptor = descriptors[0] // Usar primeiro descritor do usuário

    for (const photoDesc of photoDescriptors || []) {
      const similarity = calculateSimilarity(userDescriptor, photoDesc.descriptor)
      
      if (similarity >= threshold) {
        matches.push({
          photo_id: photoDesc.photo_id,
          similarity: similarity,
          photo_url: photoDesc.photos?.photo_url,
          campaign_id: photoDesc.photos?.campaign_id,
          campaign_name: photoDesc.photos?.campaigns?.name,
        })
      }
    }

    // Ordenar por similaridade (maior primeiro)
    matches.sort((a, b) => b.similarity - a.similarity)

    console.log(`Encontrados ${matches.length} matches com threshold ${threshold}`)

    return new Response(
      JSON.stringify({
        success: true,
        matches: matches.slice(0, 50), // Limitar a 50 fotos
        total: matches.length,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      },
    )
  } catch (error) {
    console.error('Erro ao buscar fotos:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      },
    )
  }
})
