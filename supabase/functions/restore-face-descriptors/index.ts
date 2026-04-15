// Edge Function: Restaurar Descritores Faciais
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.0';
import { corsHeaders } from '../_shared/cors.ts';

interface RestoreRequest {
  userId: string;
  backupPath?: string; // Se não fornecido, usa o backup mais recente
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { userId, backupPath }: RestoreRequest = await req.json();

    console.log(`🔄 Iniciando restauração de descritores faciais para usuário: ${userId}`);

    let pathToRestore = backupPath;

    // Se não forneceu o path, buscar o backup mais recente
    if (!pathToRestore) {
      const { data: latestBackup, error: backupError } = await supabase
        .from('face_descriptor_backups')
        .select('backup_path')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (backupError || !latestBackup) {
        return new Response(JSON.stringify({
          success: false,
          message: 'Nenhum backup encontrado para este usuário',
        }), {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      pathToRestore = latestBackup.backup_path;
    }

    console.log(`📥 Baixando backup: ${pathToRestore}`);

    // Garantir que pathToRestore não é undefined
    if (!pathToRestore) {
      throw new Error('Caminho do backup não encontrado');
    }

    // Baixar o arquivo de backup
    const { data: backupFile, error: downloadError } = await supabase.storage
      .from('face-descriptors-backup')
      .download(pathToRestore);

    if (downloadError || !backupFile) {
      console.error('Erro ao baixar backup:', downloadError);
      throw new Error('Não foi possível baixar o arquivo de backup');
    }

    // Ler conteúdo do backup
    const backupContent = await backupFile.text();
    const backupData = JSON.parse(backupContent);

    // Validar dados do backup
    if (!backupData.descriptors || !Array.isArray(backupData.descriptors)) {
      throw new Error('Formato de backup inválido');
    }

    if (backupData.user_id !== userId) {
      throw new Error('Backup não pertence a este usuário');
    }

    console.log(`🔧 Restaurando ${backupData.descriptors.length} descritores`);

    // Deletar descritores atuais do usuário
    const { error: deleteError } = await supabase
      .from('user_face_descriptors')
      .delete()
      .eq('user_id', userId);

    if (deleteError) {
      console.error('Erro ao deletar descritores atuais:', deleteError);
      throw deleteError;
    }

    // Inserir descritores do backup
    const descriptorsToInsert = backupData.descriptors.map((d: any) => ({
      user_id: userId,
      descriptor: d.descriptor,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }));

    const { error: insertError } = await supabase
      .from('user_face_descriptors')
      .insert(descriptorsToInsert);

    if (insertError) {
      console.error('Erro ao inserir descritores:', insertError);
      throw insertError;
    }

    // Atualizar registro de backup como restaurado
    await supabase
      .from('face_descriptor_backups')
      .update({ restored_at: new Date().toISOString() })
      .eq('backup_path', pathToRestore);

    console.log(`✅ Restauração concluída com sucesso`);

    return new Response(JSON.stringify({
      success: true,
      message: 'Descritores faciais restaurados com sucesso',
      descriptor_count: backupData.descriptors.length,
      backup_date: backupData.created_at,
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    console.error('❌ Erro na restauração:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error.message || 'Erro ao restaurar backup',
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
