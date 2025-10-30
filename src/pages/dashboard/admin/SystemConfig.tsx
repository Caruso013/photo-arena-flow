import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

import { Alert, AlertDescription } from '@/components/ui/alert';
import { toast } from '@/components/ui/use-toast';
import { Settings, AlertCircle, Save } from 'lucide-react';

const SystemConfig = () => {
  const [platformPercentage, setPlatformPercentage] = useState(9);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchConfig();
  }, []);

  const fetchConfig = async () => {
    try {
      const { data, error } = await supabase
        .from('system_config' as any)
        .select('value')
        .eq('key', 'platform_percentage')
        .single() as any;

      if (error) throw error;

      if (data && data.value && typeof data.value === 'object' && 'value' in data.value) {
        setPlatformPercentage(Number(data.value.value));
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
    // Validação: 5% a 20%
    if (platformPercentage < 5 || platformPercentage > 20) {
      toast({
        title: "Valor inválido",
        description: "A porcentagem deve estar entre 5% e 20%",
        variant: "destructive",
      });
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase
        .from('system_config' as any)
        .update({
          value: { value: platformPercentage, min: 5, max: 20 },
          updated_at: new Date().toISOString()
        })
        .eq('key', 'platform_percentage');

      if (error) throw error;

      toast({
        title: "Configuração atualizada!",
        description: `A porcentagem da plataforma foi alterada para ${platformPercentage}%. Novos eventos usarão esta porcentagem.`,
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
          <CardTitle>Porcentagem da Plataforma</CardTitle>
          <CardDescription>
            Define a taxa que a plataforma recebe sobre cada venda de foto
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label htmlFor="platform-percentage" className="text-base font-medium">
                Taxa da Plataforma
              </Label>
              <div className="flex items-center gap-3">
                <Input
                  id="platform-percentage"
                  type="number"
                  min={5}
                  max={20}
                  step={0.5}
                  value={platformPercentage}
                  onChange={(e) => setPlatformPercentage(Number(e.target.value))}
                  className="w-24 text-center text-lg font-bold"
                />
                <span className="text-2xl font-bold text-primary">{platformPercentage}%</span>
              </div>
            </div>

            <div className="space-y-2">
              <input
                type="range"
                min={5}
                max={20}
                step={0.5}
                value={platformPercentage}
                onChange={(e) => setPlatformPercentage(Number(e.target.value))}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700"
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Mínimo: 5%</span>
                <span>Máximo: 20%</span>
              </div>
            </div>
          </div>

          <Alert className="bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800">
            <AlertCircle className="h-4 w-4 text-blue-600 dark:text-blue-400" />
            <AlertDescription className="text-blue-900 dark:text-blue-100">
              <strong>Importante:</strong> Esta alteração afetará apenas <strong>NOVOS eventos</strong> criados após salvar. 
              Eventos existentes manterão suas porcentagens originais.
            </AlertDescription>
          </Alert>

          <div className="border-t pt-6">
            <h4 className="font-medium mb-3">Exemplo de Divisão de Receita</h4>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between p-3 bg-primary/5 dark:bg-primary/10 rounded-lg">
                <span>🏢 Plataforma ({platformPercentage}%)</span>
                <span className="font-bold">R$ {(platformPercentage).toFixed(2)}</span>
              </div>
              <div className="flex justify-between p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg">
                <span>📸 Fotógrafo + Organização ({100 - platformPercentage}%)</span>
                <span className="font-bold">R$ {(100 - platformPercentage).toFixed(2)}</span>
              </div>
              <div className="text-xs text-muted-foreground pt-2">
                *Valores baseados em uma venda de R$ 100,00
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
