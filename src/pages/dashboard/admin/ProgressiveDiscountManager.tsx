import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { toast } from '@/components/ui/use-toast';
import { Gift, AlertCircle, Check, RefreshCw } from 'lucide-react';
import { Switch } from '@/components/ui/switch';

interface Campaign {
  id: string;
  title: string;
  progressive_discount_enabled: boolean;
  is_active: boolean;
  event_date: string | null;
}

const ProgressiveDiscountManager = () => {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);

  useEffect(() => {
    fetchCampaigns();
  }, []);

  const fetchCampaigns = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('campaigns')
        .select('id, title, progressive_discount_enabled, is_active, event_date')
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      setCampaigns(data || []);
    } catch (error) {
      console.error('Error fetching campaigns:', error);
      toast({
        title: "Erro ao carregar eventos",
        description: "Não foi possível carregar os eventos.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const toggleDiscount = async (campaignId: string, currentValue: boolean) => {
    try {
      setUpdating(campaignId);
      const { error } = await supabase
        .from('campaigns')
        .update({ progressive_discount_enabled: !currentValue })
        .eq('id', campaignId);

      if (error) throw error;

      // Atualizar estado local
      setCampaigns(prev =>
        prev.map(c =>
          c.id === campaignId
            ? { ...c, progressive_discount_enabled: !currentValue }
            : c
        )
      );

      toast({
        title: "Atualizado!",
        description: `Desconto progressivo ${!currentValue ? 'habilitado' : 'desabilitado'} com sucesso.`,
      });
    } catch (error) {
      console.error('Error updating campaign:', error);
      toast({
        title: "Erro ao atualizar",
        description: "Não foi possível atualizar o evento.",
        variant: "destructive",
      });
    } finally {
      setUpdating(null);
    }
  };

  const enableAllDiscounts = async () => {
    try {
      setLoading(true);
      const { error } = await supabase
        .from('campaigns')
        .update({ progressive_discount_enabled: true })
        .eq('progressive_discount_enabled', false);

      if (error) throw error;

      await fetchCampaigns();

      toast({
        title: "Sucesso!",
        description: "Desconto progressivo habilitado em todos os eventos.",
      });
    } catch (error) {
      console.error('Error enabling all discounts:', error);
      toast({
        title: "Erro",
        description: "Não foi possível habilitar os descontos.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const stats = {
    total: campaigns.length,
    enabled: campaigns.filter(c => c.progressive_discount_enabled).length,
    disabled: campaigns.filter(c => !c.progressive_discount_enabled).length,
    active: campaigns.filter(c => c.is_active).length,
  };

  if (loading && campaigns.length === 0) {
    return (
      <div className="container max-w-6xl py-8">
        <Card>
          <CardContent className="p-8 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
            <p className="mt-4 text-muted-foreground">Carregando eventos...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container max-w-6xl py-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Gift className="h-8 w-8" />
          Gerenciar Descontos Progressivos
        </h1>
        <p className="text-muted-foreground mt-2">
          Ative ou desative descontos progressivos por evento
        </p>
      </div>

      {/* Estatísticas */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-3xl font-bold text-primary">{stats.total}</p>
              <p className="text-sm text-muted-foreground mt-1">Total de Eventos</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-3xl font-bold text-green-600">{stats.enabled}</p>
              <p className="text-sm text-muted-foreground mt-1">Com Desconto Ativo</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-3xl font-bold text-red-600">{stats.disabled}</p>
              <p className="text-sm text-muted-foreground mt-1">Sem Desconto</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-3xl font-bold text-blue-600">{stats.active}</p>
              <p className="text-sm text-muted-foreground mt-1">Eventos Ativos</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Ações em Massa */}
      {stats.disabled > 0 && (
        <Alert className="mb-6 bg-orange-50 dark:bg-orange-950/20 border-orange-200 dark:border-orange-800">
          <AlertCircle className="h-4 w-4 text-orange-600 dark:text-orange-400" />
          <AlertDescription className="text-orange-900 dark:text-orange-100">
            <div className="flex items-center justify-between">
              <span>
                <strong>{stats.disabled} eventos</strong> estão sem desconto progressivo habilitado.
              </span>
              <Button
                onClick={enableAllDiscounts}
                disabled={loading}
                size="sm"
                variant="outline"
                className="ml-4"
              >
                {loading ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Habilitando...
                  </>
                ) : (
                  <>
                    <Check className="h-4 w-4 mr-2" />
                    Habilitar em Todos
                  </>
                )}
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* Informações sobre o Desconto */}
      <Card className="mb-6 border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-blue-900 dark:text-blue-100">
            <Gift className="h-5 w-5" />
            Como Funcionam os Descontos Progressivos?
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 text-sm text-blue-900 dark:text-blue-100">
            <div className="flex justify-between p-2 rounded bg-blue-100 dark:bg-blue-900/30">
              <span>🖼️ 2 a 4 fotos</span>
              <Badge variant="outline" className="bg-blue-200 dark:bg-blue-800">5% OFF</Badge>
            </div>
            <div className="flex justify-between p-2 rounded bg-blue-100 dark:bg-blue-900/30">
              <span>🖼️🖼️ 5 a 9 fotos</span>
              <Badge variant="outline" className="bg-blue-200 dark:bg-blue-800">10% OFF</Badge>
            </div>
            <div className="flex justify-between p-2 rounded bg-blue-100 dark:bg-blue-900/30">
              <span>🖼️🖼️🖼️ 10+ fotos</span>
              <Badge variant="outline" className="bg-blue-200 dark:bg-blue-800">20% OFF</Badge>
            </div>
            <p className="text-xs text-blue-700 dark:text-blue-300 mt-3">
              💡 Os descontos são aplicados automaticamente no carrinho quando o cliente adiciona múltiplas fotos.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Lista de Eventos */}
      <Card>
        <CardHeader>
          <CardTitle>Eventos ({campaigns.length})</CardTitle>
          <CardDescription>
            Clique no switch para ativar/desativar descontos progressivos em cada evento
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {campaigns.map((campaign) => (
              <div
                key={campaign.id}
                className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="font-medium truncate">{campaign.title}</p>
                    {!campaign.is_active && (
                      <Badge variant="outline" className="text-xs">Inativo</Badge>
                    )}
                  </div>
                  {campaign.event_date && (
                    <p className="text-xs text-muted-foreground">
                      Data: {new Date(campaign.event_date).toLocaleDateString('pt-BR')}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-3 ml-4">
                  <Badge
                    variant={campaign.progressive_discount_enabled ? "default" : "outline"}
                    className="whitespace-nowrap"
                  >
                    {campaign.progressive_discount_enabled ? (
                      <>
                        <Check className="h-3 w-3 mr-1" />
                        Ativo
                      </>
                    ) : (
                      'Inativo'
                    )}
                  </Badge>
                  <Switch
                    checked={campaign.progressive_discount_enabled}
                    onCheckedChange={() => toggleDiscount(campaign.id, campaign.progressive_discount_enabled)}
                    disabled={updating === campaign.id}
                  />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ProgressiveDiscountManager;
