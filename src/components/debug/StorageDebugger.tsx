import React, { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';

export const StorageDebugger = () => {
  const [results, setResults] = useState<any>(null);
  const [testFile, setTestFile] = useState<File | null>(null);
  const { user, profile } = useAuth();

  const checkStorageBuckets = async () => {
    console.log('=== VERIFICANDO BUCKETS DE STORAGE ===');
    
    try {
      // Verificar se buckets existem
      const { data: buckets, error: bucketsError } = await supabase.storage.listBuckets();
      
      console.log('Buckets disponíveis:', buckets);
      console.log('Erro ao listar buckets:', bucketsError);

      setResults({
        buckets: { data: buckets, error: bucketsError },
        userInfo: { user: user?.id, profile: profile?.id }
      });
      
    } catch (error) {
      console.error('Erro ao verificar buckets:', error);
      setResults({ error: error });
    }
  };

  const testUpload = async () => {
    if (!testFile) {
      alert('Selecione um arquivo primeiro');
      return;
    }

    console.log('=== TESTE DE UPLOAD ===');
    console.log('Arquivo:', testFile.name, testFile.size);
    console.log('Usuário:', user?.id);
    console.log('Perfil:', profile?.id);

    try {
      const fileName = `${user?.id}/test_${Date.now()}.${testFile.name.split('.').pop()}`;
      
      // Tentar upload no bucket photos-original
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('photos-original')
        .upload(fileName, testFile);

      console.log('Resultado upload:', uploadData);
      console.log('Erro upload:', uploadError);

      // Se funcionou, tentar obter URL
      let publicUrl = null;
      if (!uploadError) {
        const { data: urlData } = supabase.storage
          .from('photos-original')
          .getPublicUrl(fileName);
        publicUrl = urlData.publicUrl;
        console.log('URL gerada:', publicUrl);
      }

      setResults(prev => ({
        ...prev,
        uploadTest: {
          fileName,
          upload: { data: uploadData, error: uploadError },
          publicUrl
        }
      }));

    } catch (error) {
      console.error('Erro no teste de upload:', error);
      setResults(prev => ({
        ...prev,
        uploadTest: { error: error }
      }));
    }
  };

  const checkPolicies = async () => {
    console.log('=== VERIFICANDO POLÍTICAS ===');
    
    try {
      // Tentar listar arquivos existentes
      const { data: files, error: listError } = await supabase.storage
        .from('photos-original')
        .list('', {
          limit: 5
        });

      console.log('Arquivos no bucket:', files);
      console.log('Erro ao listar:', listError);

      setResults(prev => ({
        ...prev,
        policyTest: {
          list: { data: files, error: listError }
        }
      }));

    } catch (error) {
      console.error('Erro ao verificar políticas:', error);
      setResults(prev => ({
        ...prev,
        policyTest: { error: error }
      }));
    }
  };

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle>Diagnóstico de Storage</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2 flex-wrap">
          <Button onClick={checkStorageBuckets}>
            Verificar Buckets
          </Button>
          <Button onClick={checkPolicies} variant="outline">
            Testar Políticas
          </Button>
        </div>

        <div className="flex gap-2 items-center">
          <input
            type="file"
            accept="image/*"
            onChange={(e) => setTestFile(e.target.files?.[0] || null)}
            className="text-sm"
          />
          <Button onClick={testUpload} disabled={!testFile}>
            Testar Upload
          </Button>
        </div>

        {results && (
          <div className="mt-4 p-4 bg-muted rounded-lg">
            <h3 className="font-semibold mb-2">Resultados:</h3>
            <pre className="text-xs overflow-auto max-h-96 whitespace-pre-wrap">
              {JSON.stringify(results, null, 2)}
            </pre>
          </div>
        )}
      </CardContent>
    </Card>
  );
};