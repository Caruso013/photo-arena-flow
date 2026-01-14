import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.74.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );

    // ========== VALIDAÇÃO DE ROLE (ADMIN ONLY) ==========
    const authHeader = req.headers.get('Authorization');
    
    if (!authHeader) {
      console.warn('Tentativa de acesso sem autenticação');
      return new Response(
        JSON.stringify({ error: 'Token de autenticação não fornecido' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(token);

    if (userError || !user) {
      console.warn('Token inválido ou expirado');
      return new Response(
        JSON.stringify({ error: 'Não autorizado' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verificar se é admin
    const { data: profile } = await supabaseClient
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profile?.role !== 'admin') {
      console.warn(`Acesso negado para usuário ${user.id} com role ${profile?.role}`);
      return new Response(
        JSON.stringify({ error: 'Apenas administradores podem criar usuários de organização' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    // ========== FIM DA VALIDAÇÃO DE ROLE ==========

    const body = await req.json();
    const { organizationId, organizationName, email, password } = body;

    console.log('Admin autorizado:', user.id);
    console.log('Criando usuário organização:', { organizationId, organizationName, email });

    if (!organizationId || !organizationName || !email || !password) {
      console.error('Missing fields:', { organizationId: !!organizationId, organizationName: !!organizationName, email: !!email, password: !!password });
      throw new Error(`Missing required fields. Received: ${JSON.stringify(Object.keys(body))}`);
    }

    // Validar formato do email (@stafotos.com)
    if (!email.endsWith('@stafotos.com')) {
      console.warn('Email não segue o padrão @stafotos.com:', email);
    }

    console.log('Processing organization user:', { organizationId, organizationName, email });

    let userId: string;

    // 1. Verificar se usuário já existe
    const { data: existingUsers, error: listError } = await supabaseClient.auth.admin.listUsers();
    
    if (listError) {
      console.error('Error listing users:', listError);
      throw listError;
    }

    const existingUser = existingUsers.users.find(u => u.email === email);

    if (existingUser) {
      console.log('User already exists, updating password:', existingUser.id);
      
      // Atualizar senha do usuário existente
      const { error: updateError } = await supabaseClient.auth.admin.updateUserById(
        existingUser.id,
        { 
          password: password,
          user_metadata: {
            full_name: organizationName,
            role: 'organization',
            organization_name: organizationName
          }
        }
      );

      if (updateError) {
        console.error('Error updating user password:', updateError);
        throw updateError;
      }

      userId = existingUser.id;
      console.log('Password updated for existing user:', userId);

      // Criar ou atualizar perfil (upsert para garantir que existe)
      console.log('Upserting profile for existing user:', userId);
      const { error: profileUpsertError } = await supabaseClient
        .from('profiles')
        .upsert({
          id: userId,
          email: email,
          full_name: organizationName,
          role: 'organization'
        }, { onConflict: 'id' });

      if (profileUpsertError) {
        console.error('Could not upsert profile:', profileUpsertError);
      } else {
        console.log('Profile upserted successfully for user:', userId);
      }

    } else {
      console.log('Creating new user:', email);
      
      // Criar novo usuário
      const { data: authData, error: authError } = await supabaseClient.auth.admin.createUser({
        email: email,
        password: password,
        email_confirm: true,
        user_metadata: {
          full_name: organizationName,
          role: 'organization',
          organization_name: organizationName
        }
      });

      if (authError) {
        console.error('Auth error:', authError);
        throw authError;
      }

      userId = authData.user.id;
      console.log('New user created in auth:', userId);

      // Criar perfil diretamente com upsert (não depender apenas do trigger)
      console.log('Upserting profile for new user:', userId);
      const { error: profileUpsertError } = await supabaseClient
        .from('profiles')
        .upsert({
          id: userId,
          email: email,
          full_name: organizationName,
          role: 'organization'
        }, { onConflict: 'id' });

      if (profileUpsertError) {
        console.error('Could not upsert profile for new user:', profileUpsertError);
      } else {
        console.log('Profile created successfully for new user:', userId);
      }
    }

    // 2. Criar/atualizar vínculo com organização (upsert)
    const { error: linkError } = await supabaseClient
      .from('organization_users')
      .upsert(
        {
          user_id: userId,
          organization_id: organizationId,
          updated_at: new Date().toISOString()
        },
        { 
          onConflict: 'user_id,organization_id',
          ignoreDuplicates: false 
        }
      );

    if (linkError) {
      console.error('Link error:', linkError);
      // Se for erro de constraint, tentar insert simples
      if (linkError.code === '23505') {
        console.log('Link already exists, ignoring...');
      } else {
        throw linkError;
      }
    }

    console.log('Organization user link created/updated');

    return new Response(
      JSON.stringify({ 
        success: true, 
        userId: userId,
        email,
        message: existingUser ? 'User password updated and linked' : 'Organization user created successfully'
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    );

  } catch (error: unknown) {
    console.error('Error in create-organization-user:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ 
        error: errorMessage,
        details: String(error)
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400
      }
    );
  }
});
