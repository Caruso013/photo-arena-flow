import React, { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export const AuthFixer = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [results, setResults] = useState<any>(null);

  const createMissingProfile = async () => {
    try {
      console.log('=== CRIANDO PERFIL MANUALMENTE ===');
      
      // Primeiro, tentar fazer login para obter o user ID
      const { data: loginData, error: loginError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password: password
      });

      if (loginError) {
        console.log('Erro no login:', loginError);
        setResults({ error: 'Erro no login: ' + loginError.message });
        return;
      }

      if (!loginData.user) {
        setResults({ error: 'Usuário não encontrado' });
        return;
      }

      console.log('Login bem-sucedido, criando perfil...');
      
      // Criar o perfil manualmente
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .insert({
          id: loginData.user.id,
          email: loginData.user.email,
          full_name: loginData.user.user_metadata?.full_name || 'Usuário',
          role: 'user'
        })
        .select();

      if (profileError) {
        console.log('Erro ao criar perfil:', profileError);
        setResults({ 
          success: 'Login realizado mas erro ao criar perfil',
          user: loginData.user,
          profileError: profileError
        });
      } else {
        console.log('Perfil criado com sucesso!');
        setResults({
          success: 'Perfil criado com sucesso!',
          user: loginData.user,
          profile: profileData
        });
      }

    } catch (error) {
      console.error('Erro geral:', error);
      setResults({ error: error });
    }
  };

  const checkUserInAuth = async () => {
    try {
      console.log('=== VERIFICANDO USUÁRIO NO AUTH ===');
      
      // Tentar reset de senha para ver se o usuário existe
      const { data: resetData, error: resetError } = await supabase.auth.resetPasswordForEmail(
        email.trim(), 
        { redirectTo: `${window.location.origin}/auth` }
      );

      setResults({
        resetPassword: { data: resetData, error: resetError },
        message: resetError ? 
          'Usuário pode não existir no sistema de auth' : 
          'Email de reset enviado - usuário existe no auth!'
      });

    } catch (error) {
      console.error('Erro ao verificar usuário:', error);
      setResults({ error: error });
    }
  };

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>Corretor de Autenticação</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-col gap-2">
          <Input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <Input
            type="password"
            placeholder="Senha"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>
        
        <div className="flex gap-2">
          <Button onClick={createMissingProfile}>
            Tentar Login + Criar Perfil
          </Button>
          <Button onClick={checkUserInAuth} variant="outline">
            Verificar se Usuário Existe
          </Button>
        </div>

        {results && (
          <div className="mt-4 p-4 bg-muted rounded-lg">
            <h3 className="font-semibold mb-2">Resultados:</h3>
            <pre className="text-xs overflow-auto max-h-96">
              {JSON.stringify(results, null, 2)}
            </pre>
          </div>
        )}
      </CardContent>
    </Card>
  );
};