// Edge Function: Backup de Descritores Faciais
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface BackupRequest {
  userId: string;
  isAutomatic?: boolean;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { userId, isAutomatic = false }: BackupRequest = await req.json();

    console.log(`📦 Iniciando backup de descritores faciais para usuário: ${userId}`);

    // Buscar todos os descritores faciais do usuário
    const { data: descriptors, error: descriptorsError } = await supabase
      .from('user_face_descriptors')
      .select('*')
      .eq('user_id', userId);

    if (descriptorsError) {
      console.error('Erro ao buscar descritores:', descriptorsError);
      throw descriptorsError;
    }

    if (!descriptors || descriptors.length === 0) {
      return new Response(JSON.stringify({ 
        success: false, 
        message: 'Nenhum descritor facial encontrado para backup' 
      }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Preparar dados do backup
    const backupData = {
      version: '1.0',
      created_at: new Date().toISOString(),
      user_id: userId,
      descriptor_count: descriptors.length,
      descriptors: descriptors,
    };

    const backupJson = JSON.stringify(backupData, null, 2);
    const backupSize = new Blob([backupJson]).size;
    
    // Nome do arquivo: user_id/backup_timestamp.json
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupPath = `${userId}/backup_${timestamp}.json`;

    console.log(`📤 Fazendo upload do backup: ${backupPath} (${backupSize} bytes)`);

    // Upload do backup para o storage
    const { error: uploadError } = await supabase.storage
      .from('face-descriptors-backup')
      .upload(backupPath, backupJson, {
        contentType: 'application/json',
        upsert: false,
      });

    if (uploadError) {
      console.error('Erro ao fazer upload:', uploadError);
      throw uploadError;
    }

    // Registrar backup no histórico
    const { error: historyError } = await supabase
      .from('face_descriptor_backups')
      .insert({
        user_id: userId,
        backup_path: backupPath,
        descriptor_count: descriptors.length,
        file_size: backupSize,
        is_automatic: isAutomatic,
        metadata: {
          version: '1.0',
          descriptors_ids: descriptors.map(d => d.id),
        },
      });

    if (historyError) {
      console.error('Erro ao registrar histórico:', historyError);
      // Não falhar se apenas o histórico falhar
    }

    // Limpar backups antigos (em background)
    EdgeRuntime.waitUntil(
      supabase.rpc('cleanup_old_face_backups').then(() => {
        console.log('✅ Limpeza de backups antigos concluída');
      }).catch(err => {
        console.error('Erro na limpeza de backups:', err);
      })
    );

    console.log(`✅ Backup concluído com sucesso: ${backupPath}`);

    return new Response(JSON.stringify({
      success: true,
      message: 'Backup realizado com sucesso',
      backup_path: backupPath,
      descriptor_count: descriptors.length,
      file_size: backupSize,
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    console.error('❌ Erro no backup:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error.message || 'Erro ao realizar backup',
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
