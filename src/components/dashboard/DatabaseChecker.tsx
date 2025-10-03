import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { AlertTriangle, Database, CheckCircle, XCircle } from "lucide-react";

interface DatabaseStatus {
  tableExists: boolean;
  hasPermissions: boolean;
  canInsert: boolean;
  error?: string;
}

export const DatabaseChecker = () => {
  const [status, setStatus] = useState<DatabaseStatus | null>(null);
  const [isChecking, setIsChecking] = useState(false);
  const { user } = useAuth();

  const checkDatabaseStatus = async () => {
    if (!user) return;
    
    setIsChecking(true);
    const newStatus: DatabaseStatus = {
      tableExists: false,
      hasPermissions: false,
      canInsert: false
    };

    try {
      // Test if table exists by attempting a simple select
      const { data, error } = await supabase
        .from('photographer_applications')
        .select('id')
        .limit(1);

      if (error) {
        if (error.message.includes('relation') && error.message.includes('does not exist')) {
          newStatus.error = 'A tabela photographer_applications não existe no banco de dados';
        } else if (error.message.includes('permission denied')) {
          newStatus.tableExists = true;
          newStatus.error = 'Sem permissão para acessar a tabela';
        } else {
          newStatus.error = error.message;
        }
      } else {
        newStatus.tableExists = true;
        newStatus.hasPermissions = true;
        
        // Test if we can insert (this will fail but we're just testing permissions)
        try {
          await supabase
            .from('photographer_applications')
            .insert({
              user_id: user.id,
              portfolio_url: 'test',
              status: 'pending'
            })
            .select();
          
          newStatus.canInsert = true;
        } catch (insertError: any) {
          // This might fail due to constraints, but if it's not a permission error, we're good
          if (!insertError?.message?.includes('permission')) {
            newStatus.canInsert = true;
          }
        }
      }
    } catch (error: any) {
      newStatus.error = error.message || 'Erro desconhecido';
    }

    setStatus(newStatus);
    setIsChecking(false);
  };

  useEffect(() => {
    if (user) {
      checkDatabaseStatus();
    }
  }, [user]);

  if (!user) {
    return null;
  }

  return (
    <Card className="mb-6 border-orange-200 bg-orange-50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-orange-800">
          <Database className="h-5 w-5" />
          Status do Banco de Dados
        </CardTitle>
        <CardDescription className="text-orange-700">
          Verificação do sistema de candidaturas para fotógrafos
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isChecking ? (
          <div className="flex items-center gap-2 text-orange-700">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-orange-600"></div>
            Verificando configuração...
          </div>
        ) : status ? (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              {status.tableExists ? (
                <CheckCircle className="h-4 w-4 text-green-600" />
              ) : (
                <XCircle className="h-4 w-4 text-red-600" />
              )}
              <span className={status.tableExists ? "text-green-700" : "text-red-700"}>
                Tabela photographer_applications: {status.tableExists ? "Existe" : "Não encontrada"}
              </span>
            </div>
            
            <div className="flex items-center gap-2">
              {status.hasPermissions ? (
                <CheckCircle className="h-4 w-4 text-green-600" />
              ) : (
                <XCircle className="h-4 w-4 text-red-600" />
              )}
              <span className={status.hasPermissions ? "text-green-700" : "text-red-700"}>
                Permissões de leitura: {status.hasPermissions ? "OK" : "Sem permissão"}
              </span>
            </div>
            
            <div className="flex items-center gap-2">
              {status.canInsert ? (
                <CheckCircle className="h-4 w-4 text-green-600" />
              ) : (
                <XCircle className="h-4 w-4 text-red-600" />
              )}
              <span className={status.canInsert ? "text-green-700" : "text-red-700"}>
                Permissões de escrita: {status.canInsert ? "OK" : "Sem permissão"}
              </span>
            </div>

            {status.error && (
              <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                <div className="flex items-center gap-2 text-red-800 mb-2">
                  <AlertTriangle className="h-4 w-4" />
                  <span className="font-medium">Erro detectado:</span>
                </div>
                <p className="text-red-700 text-sm">{status.error}</p>
              </div>
            )}

            {!status.tableExists && (
              <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <h4 className="font-medium text-blue-800 mb-2">Como resolver:</h4>
                <ol className="text-blue-700 text-sm space-y-1 list-decimal list-inside">
                  <li>Acesse o Supabase SQL Editor</li>
                  <li>Execute o arquivo `apply_photographer_applications_migration.sql`</li>
                  <li>Atualize esta página</li>
                </ol>
              </div>
            )}

            <Button 
              onClick={checkDatabaseStatus} 
              variant="outline" 
              size="sm"
              disabled={isChecking}
              className="mt-4"
            >
              Verificar novamente
            </Button>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
};