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

    const { organizationId, organizationName, email, password } = await req.json();

    if (!organizationId || !organizationName || !email || !password) {
      throw new Error('Missing required fields');
    }

    console.log('Creating organization user:', { organizationId, organizationName, email });

    // 1. Criar usuário no Auth
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

    console.log('User created in auth:', authData.user.id);

    // 2. Criar perfil
    const { error: profileError } = await supabaseClient
      .from('profiles')
      .insert({
        id: authData.user.id,
        email: email,
        full_name: organizationName,
        role: 'organization'
      });

    if (profileError) {
      console.error('Profile error:', profileError);
      throw profileError;
    }

    console.log('Profile created');

    // 3. Vincular usuário à organização
    const { error: linkError } = await supabaseClient
      .from('organization_users')
      .insert({
        user_id: authData.user.id,
        organization_id: organizationId
      });

    if (linkError) {
      console.error('Link error:', linkError);
      throw linkError;
    }

    console.log('Organization user link created');

    return new Response(
      JSON.stringify({ 
        success: true, 
        userId: authData.user.id,
        email,
        message: 'Organization user created successfully'
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    );

  } catch (error) {
    console.error('Error in create-organization-user:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message,
        details: error
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400
      }
    );
  }
});