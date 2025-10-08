import React, { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export const AuthDebugger = () => {
  const [email, setEmail] = useState('');
  const [results, setResults] = useState<any>(null);

  const checkUser = async () => {
    console.log('=== VERIFICANDO USUÁRIO ===');
    console.log('Email para verificar:', email);

    try {
      // Verificar se o usuário existe na tabela auth.users (via RPC ou função)
      const { data: authData, error: authError } = await supabase
        .from('profiles')
        .select('*')
        .eq('email', email.trim());

      console.log('Resultado da consulta profiles:', authData);
      console.log('Erro da consulta profiles:', authError);

      // Tentar fazer login com uma senha fictícia para ver o erro específico
      const { data: loginData, error: loginError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password: 'senha_ficticia_para_teste'
      });

      console.log('Resultado do login de teste:', loginData);
      console.log('Erro do login de teste:', loginError);

      setResults({
        profiles: { data: authData, error: authError },
        loginTest: { data: loginData, error: loginError }
      });

    } catch (error) {
      console.error('Erro durante verificação:', error);
      setResults({ error: error });
    }
  };

  const resetPassword = async () => {
    console.log('=== RESET DE SENHA ===');
    
    const { data, error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/auth`
    });

    console.log('Resultado do reset:', data);
    console.log('Erro do reset:', error);
    
    setResults(prev => ({
      ...prev,
      passwordReset: { data, error }
    }));
  };

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>Debug de Autenticação</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          <Input
            type="email"
            placeholder="Email para verificar"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <Button onClick={checkUser}>Verificar</Button>
          <Button onClick={resetPassword} variant="outline">Reset Senha</Button>
        </div>

        {results && (
          <div className="mt-4 p-4 bg-muted rounded-lg">
            <h3 className="font-semibold mb-2">Resultados:</h3>
            <pre className="text-xs overflow-auto">
              {JSON.stringify(results, null, 2)}
            </pre>
          </div>
        )}
      </CardContent>
    </Card>
  );
};