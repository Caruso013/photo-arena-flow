import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { toast } from '@/components/ui/use-toast';
import { Settings, AlertCircle, Save, Lock, Unlock } from 'lucide-react';

const SystemConfig = () => {
  const [fixedPercentage, setFixedPercentage] = useState(7); // Taxa fixa sempre 7%
  const [variablePercentage, setVariablePercentage] = useState(3);
  const [variableEnabled, setVariableEnabled] = useState(true);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchConfig();
  }, []);

  const fetchConfig = async () => {
    try {
      // Buscar configuração da taxa fixa
      const { data: fixedData, error: fixedError } = await supabase
        .from('system_config' as any)
        .select('value')
        .eq('key', 'platform_percentage')
        .single() as any;

      if (fixedError) throw fixedError;

      // Buscar configuração da taxa variável
      const { data: variableData, error: variableError } = await supabase
        .from('system_config' as any)
        .select('value')
        .eq('key', 'variable_percentage')
        .single() as any;

      if (variableError) throw variableError;

      if (fixedData?.value?.value) {
        setFixedPercentage(Number(fixedData.value.value));
      }

      if (variableData?.value) {
        setVariablePercentage(Number(variableData.value.value) || 0);
        setVariableEnabled(variableData.value.enabled !== false);
      }
    } catch (error) {
      console.error('Error fetching config:', error);
      toast({
        title: "Erro ao carregar configurações",
        description: "Não foi possível carregar as configurações do sistema.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const updateConfig = async () => {
    // Validação: taxa variável 0% a 20%
    if (variablePercentage < 0 || variablePercentage > 20) {
      toast({
        title: "Valor inválido",
        description: "A taxa variável deve estar entre 0% e 20%",
        variant: "destructive",
      });
      return;
    }

    setSaving(true);
    try {
      // Atualizar taxa variável
      const { error: variableError } = await supabase
        .from('system_config' as any)
        .update({
          value: { 
            value: variablePercentage, 
            min: 0, 
            max: 20,
            enabled: variableEnabled 
          },
          updated_at: new Date().toISOString()
        })
        .eq('key', 'variable_percentage');

      if (variableError) throw variableError;

      const totalPercentage = fixedPercentage + (variableEnabled ? variablePercentage : 0);

      toast({
        title: "Configuração atualizada!",
        description: `Taxa da plataforma: ${fixedPercentage}% fixo + ${variableEnabled ? variablePercentage : 0}% variável = ${totalPercentage}% total. Novos eventos usarão esta taxa.`,
      });
    } catch (error) {
      console.error('Error updating config:', error);
      toast({
        title: "Erro ao salvar",
        description: "Não foi possível atualizar a configuração.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="container max-w-4xl py-8">
        <Card>
          <CardContent className="p-8 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const totalPercentage = fixedPercentage + (variableEnabled ? variablePercentage : 0);
  const availablePercentage = 100 - totalPercentage;

  return (
    <div className="container max-w-4xl py-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Settings className="h-8 w-8" />
          Configurações do Sistema
        </h1>
        <p className="text-muted-foreground mt-2">
          Gerencie configurações globais da plataforma
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Taxas da Plataforma</CardTitle>
          <CardDescription>
            Configure a taxa fixa + taxa variável que a plataforma recebe sobre cada venda
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Taxa Fixa - Bloqueada */}
          <div className="space-y-4 p-4 border rounded-lg bg-muted/30">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Lock className="h-5 w-5 text-muted-foreground" />
                <Label className="text-base font-medium">Taxa Fixa (Bloqueada)</Label>
              </div>
              <span className="text-3xl font-bold text-primary">{fixedPercentage}%</span>
            </div>
            <p className="text-sm text-muted-foreground">
              A taxa fixa de {fixedPercentage}% não pode ser alterada. Esta é a receita base da plataforma.
            </p>
          </div>

          {/* Taxa Variável - Ajustável */}
          <div className="space-y-4 p-4 border rounded-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Unlock className="h-5 w-5 text-primary" />
                <Label htmlFor="variable-enabled" className="text-base font-medium">
                  Taxa Variável (Controlável)
                </Label>
              </div>
              <div className="flex items-center gap-3">
                <Switch
                  id="variable-enabled"
                  checked={variableEnabled}
                  onCheckedChange={setVariableEnabled}
                />
                <span className="text-sm text-muted-foreground">
                  {variableEnabled ? 'Ativa' : 'Inativa'}
                </span>
              </div>
            </div>

            {variableEnabled && (
              <>
                <div className="flex items-center justify-between pt-2">
                  <Label htmlFor="variable-percentage" className="text-sm font-medium">
                    Percentual Variável
                  </Label>
                  <div className="flex items-center gap-3">
                    <Input
                      id="variable-percentage"
                      type="number"
                      min={0}
                      max={20}
                      step={0.5}
                      value={variablePercentage}
                      onChange={(e) => setVariablePercentage(Number(e.target.value))}
                      className="w-24 text-center text-lg font-bold"
                    />
                    <span className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                      {variablePercentage}%
                    </span>
                  </div>
                </div>

                <div className="space-y-2">
                  <input
                    type="range"
                    min={0}
                    max={20}
                    step={0.5}
                    value={variablePercentage}
                    onChange={(e) => setVariablePercentage(Number(e.target.value))}
                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700"
                  />
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>Mínimo: 0%</span>
                    <span>Máximo: 20%</span>
                  </div>
                </div>
              </>
            )}

            <p className="text-sm text-muted-foreground">
              {variableEnabled 
                ? `Você pode ajustar a taxa variável de 0% a 20% conforme necessário.`
                : 'Ative a taxa variável para ter controle adicional sobre a receita da plataforma.'}
            </p>
          </div>

          {/* Resumo Total */}
          <div className="p-4 bg-primary/10 dark:bg-primary/20 border border-primary/30 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <span className="text-lg font-semibold">Taxa Total da Plataforma</span>
              <span className="text-4xl font-bold text-primary">{totalPercentage}%</span>
            </div>
            <div className="text-sm text-muted-foreground">
              {fixedPercentage}% (fixa) + {variableEnabled ? variablePercentage : 0}% (variável) = {totalPercentage}% total
            </div>
          </div>

          <Alert className="bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800">
            <AlertCircle className="h-4 w-4 text-blue-600 dark:text-blue-400" />
            <AlertDescription className="text-blue-900 dark:text-blue-100">
              <strong>Importante:</strong> Esta alteração afetará apenas <strong>NOVOS eventos</strong> criados após salvar. 
              Eventos existentes manterão suas taxas originais.
            </AlertDescription>
          </Alert>

          <div className="border-t pt-6">
            <h4 className="font-medium mb-3">Exemplo de Divisão de Receita (em R$ 100,00)</h4>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between p-3 bg-primary/5 dark:bg-primary/10 rounded-lg">
                <span>🏢 Plataforma - Taxa Fixa ({fixedPercentage}%)</span>
                <span className="font-bold">R$ {(fixedPercentage).toFixed(2)}</span>
              </div>
              {variableEnabled && variablePercentage > 0 && (
                <div className="flex justify-between p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg">
                  <span>🏢 Plataforma - Taxa Variável ({variablePercentage}%)</span>
                  <span className="font-bold">R$ {(variablePercentage).toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between p-3 bg-green-50 dark:bg-green-950/20 rounded-lg">
                <span>📸 Fotógrafo + Organização ({availablePercentage}%)</span>
                <span className="font-bold">R$ {(availablePercentage).toFixed(2)}</span>
              </div>
            </div>
          </div>

          <Button 
            onClick={updateConfig} 
            disabled={saving}
            className="w-full gap-2"
            size="lg"
          >
            {saving ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                Salvando...
              </>
            ) : (
              <>
                <Save className="h-4 w-4" />
                Salvar Configuração
              </>
            )}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default SystemConfig;
