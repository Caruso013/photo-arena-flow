import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { toast } from '@/components/ui/use-toast';
import { Settings, AlertCircle, Save, Lock, Unlock, Link as LinkIcon, ArrowLeft, Image as ImageIcon, Upload, Trash2, Loader2 } from 'lucide-react';
import AdminLayout from '@/components/dashboard/AdminLayout';

const HERO_BANNER_CONFIG_KEY = 'home_hero_banner';
const HERO_BANNER_BUCKET = 'campaign-covers';

const PlatformConfig = () => {
  const navigate = useNavigate();
  const [fixedPercentage, setFixedPercentage] = useState(7); // Taxa fixa sempre 7%
  const [variablePercentage, setVariablePercentage] = useState(0);
  const [variableEnabled, setVariableEnabled] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [generatingCodes, setGeneratingCodes] = useState(false);
  const [uploadingBanner, setUploadingBanner] = useState(false);
  const [currentHeroBannerUrl, setCurrentHeroBannerUrl] = useState('');
  const [currentHeroBannerPath, setCurrentHeroBannerPath] = useState<string | null>(null);
  const bannerInputRef = useRef<HTMLInputElement>(null);

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

      const { data: heroBannerData } = await supabase
        .from('system_config' as any)
        .select('value')
        .eq('key', HERO_BANNER_CONFIG_KEY)
        .maybeSingle() as any;

      const heroUrl = heroBannerData?.value?.url;
      const heroPath = heroBannerData?.value?.path;
      if (typeof heroUrl === 'string') {
        setCurrentHeroBannerUrl(heroUrl);
      }
      if (typeof heroPath === 'string') {
        setCurrentHeroBannerPath(heroPath);
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
    // Validação: taxa variável 0% a 2% (para atingir máximo de 9% com os 7% fixos)
    if (variablePercentage < 0 || variablePercentage > 2) {
      toast({
        title: "Valor inválido",
        description: "A taxa variável deve estar entre 0% e 2%",
        variant: "destructive",
      });
      return;
    }

    // Validação: taxa total entre 7% e 9%
    const totalPercentage = fixedPercentage + (variableEnabled ? variablePercentage : 0);
    if (totalPercentage < 7 || totalPercentage > 9) {
      toast({
        title: "Valor inválido",
        description: "A taxa total da plataforma deve estar entre 7% e 9%",
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
            max: 2,
            enabled: variableEnabled,
            description: 'Taxa variável adicional (0% a 2%, para atingir até 9% total)'
          },
          updated_at: new Date().toISOString()
        })
        .eq('key', 'variable_percentage');

      if (variableError) throw variableError;

      const totalPercentage = fixedPercentage + (variableEnabled ? variablePercentage : 0);

      toast({
        title: "Configuração atualizada!",
        description: `Taxa da plataforma: ${fixedPercentage}% fixo + ${variableEnabled ? variablePercentage : 0}% variável = ${totalPercentage}% total (entre 7% e 9%). Novos eventos usarão esta taxa.`,
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

  const generateShortCodes = async () => {
    setGeneratingCodes(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-campaign-short-codes');

      if (error) throw error;

      toast({
        title: "Códigos gerados!",
        description: data.message || "Códigos curtos gerados com sucesso",
      });
    } catch (error) {
      console.error('Error generating codes:', error);
      toast({
        title: "Erro ao gerar códigos",
        description: "Não foi possível gerar os códigos curtos.",
        variant: "destructive",
      });
    } finally {
      setGeneratingCodes(false);
    }
  };

  const saveHeroBannerConfig = async (bannerUrl: string, bannerPath: string | null) => {
    const { error } = await supabase
      .from('system_config' as any)
      .upsert(
        {
          key: HERO_BANNER_CONFIG_KEY,
          value: {
            url: bannerUrl,
            path: bannerPath,
            bucket: HERO_BANNER_BUCKET,
          },
          description: 'Banner principal da home definido pelo admin',
          updated_at: new Date().toISOString(),
        } as any,
        { onConflict: 'key' }
      ) as any;

    if (error) throw error;
  };

  const removeBannerFile = async (path: string | null) => {
    if (!path) return;

    const { error } = await supabase.storage
      .from(HERO_BANNER_BUCKET)
      .remove([path]);

    if (error) {
      console.warn('Could not remove previous hero banner:', error);
    }
  };

  const handleHeroBannerUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast({
        title: 'Arquivo inválido',
        description: 'Selecione uma imagem válida.',
        variant: 'destructive',
      });
      return;
    }

    if (file.size > 8 * 1024 * 1024) {
      toast({
        title: 'Arquivo muito grande',
        description: 'A imagem deve ter no máximo 8MB.',
        variant: 'destructive',
      });
      return;
    }

    setUploadingBanner(true);
    try {
      const extension = file.name.split('.').pop()?.toLowerCase() || 'jpg';
      const filePath = `admin/home-hero-${Date.now()}.${extension}`;

      const { error: uploadError } = await supabase.storage
        .from(HERO_BANNER_BUCKET)
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: true,
        });

      if (uploadError) throw uploadError;

      const { data: publicUrlData } = supabase.storage
        .from(HERO_BANNER_BUCKET)
        .getPublicUrl(filePath);

      await saveHeroBannerConfig(publicUrlData.publicUrl, filePath);
      await removeBannerFile(currentHeroBannerPath);

      setCurrentHeroBannerUrl(publicUrlData.publicUrl);
      setCurrentHeroBannerPath(filePath);

      toast({
        title: 'Banner atualizado!',
        description: 'A nova imagem da home foi salva com sucesso.',
      });
    } catch (error) {
      console.error('Error uploading hero banner:', error);
      toast({
        title: 'Erro no upload',
        description: 'Não foi possível enviar a imagem do banner.',
        variant: 'destructive',
      });
    } finally {
      setUploadingBanner(false);
      event.target.value = '';
    }
  };

  const clearHeroBanner = async () => {
    setUploadingBanner(true);
    try {
      await saveHeroBannerConfig('', null);
      await removeBannerFile(currentHeroBannerPath);
      setCurrentHeroBannerUrl('');
      setCurrentHeroBannerPath(null);

      toast({
        title: 'Banner removido',
        description: 'A home voltou para a imagem padrão dinâmica dos eventos.',
      });
    } catch (error) {
      console.error('Error clearing hero banner:', error);
      toast({
        title: 'Erro ao remover',
        description: 'Não foi possível remover o banner da home.',
        variant: 'destructive',
      });
    } finally {
      setUploadingBanner(false);
    }
  };

  if (loading) {
    return (
      <AdminLayout>
        <div className="container max-w-4xl py-8">
          <Card>
            <CardContent className="p-8 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
            </CardContent>
          </Card>
        </div>
      </AdminLayout>
    );
  }

  const totalPercentage = fixedPercentage + (variableEnabled ? variablePercentage : 0);
  const availablePercentage = 100 - totalPercentage;

  return (
    <AdminLayout>
      <div className="container max-w-4xl py-8">
      <Button
        variant="ghost"
        className="mb-6"
        onClick={() => navigate('/dashboard/admin/config')}
      >
        <ArrowLeft className="h-4 w-4 mr-2" />
        Voltar
      </Button>

      <div className="mb-6">
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Settings className="h-8 w-8" />
          Configurações da Plataforma
        </h1>
        <p className="text-muted-foreground mt-2">
          Gerencie taxas, porcentagens e links curtos do sistema
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
                <Label className="text-base font-medium">Taxa Fixa (Bloqueada em 7%)</Label>
              </div>
              <span className="text-3xl font-bold text-primary">{fixedPercentage}%</span>
            </div>
            <p className="text-sm text-muted-foreground">
              A taxa fixa de {fixedPercentage}% não pode ser alterada. Esta é a taxa mínima da plataforma.
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
                    Percentual Variável (0% a 2%)
                  </Label>
                  <div className="flex items-center gap-3">
                    <Input
                      id="variable-percentage"
                      type="number"
                      min={0}
                      max={2}
                      step={0.1}
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
                    max={2}
                    step={0.1}
                    value={variablePercentage}
                    onChange={(e) => setVariablePercentage(Number(e.target.value))}
                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700"
                  />
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>Mínimo: 0%</span>
                    <span>Máximo: 2%</span>
                  </div>
                </div>
              </>
            )}

            <p className="text-sm text-muted-foreground">
              {variableEnabled 
                ? `Você pode ajustar a taxa variável de 0% a 2% para atingir até 9% total (7% fixo + até 2% variável).`
                : 'Ative a taxa variável para ter controle adicional sobre a receita da plataforma (até 9% total).'}
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
              <strong>Importante:</strong> A taxa da plataforma está limitada entre <strong>7% e 9%</strong>. 
              Esta alteração afetará apenas <strong>NOVOS eventos</strong> criados após salvar. 
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

      <Card className="mt-6 border-[#D4AF37]/40">
        <CardHeader className="rounded-t-xl bg-gradient-to-r from-[#D4AF37]/10 to-transparent border-b border-[#D4AF37]/20 pb-4">
          <CardTitle className="flex items-center gap-2 text-[#B8860B]">
            <ImageIcon className="h-5 w-5" />
            Banner Principal da Home
          </CardTitle>
          <CardDescription>
            Esta imagem aparece para <strong>todos os usuários</strong> na seção "Encontre suas Fotos". Somente administradores podem alterá-la.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 pt-5">
          <Alert className="border-[#D4AF37]/40 bg-[#D4AF37]/5">
            <Lock className="h-4 w-4 text-[#B8860B]" />
            <AlertDescription className="text-sm">
              <strong>Exclusivo para Admins.</strong> A imagem definida aqui substitui a capa dinâmica dos eventos e fica fixada para todos os visitantes do site até que um novo banner seja enviado ou removido.
            </AlertDescription>
          </Alert>

          <input
            ref={bannerInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleHeroBannerUpload}
          />

          <div className="overflow-hidden rounded-xl border-2 border-dashed border-[#D4AF37]/30 bg-muted/20 transition-colors hover:border-[#D4AF37]/60">
            {currentHeroBannerUrl ? (
              <div className="relative">
                <img
                  src={currentHeroBannerUrl}
                  alt="Banner atual da home"
                  className="h-44 w-full object-cover md:h-56"
                />
                <div className="absolute bottom-2 left-2 rounded-md bg-black/60 px-2 py-1 text-xs text-white backdrop-blur-sm">
                  Banner ativo — visível para todos os usuários
                </div>
              </div>
            ) : (
              <div className="flex h-44 w-full flex-col items-center justify-center gap-2 text-muted-foreground md:h-56">
                <ImageIcon className="h-10 w-10 opacity-30" />
                <p className="text-sm">Nenhum banner fixo definido</p>
                <p className="text-xs opacity-60">A home usa a capa do último evento automaticamente</p>
              </div>
            )}
          </div>

          <p className="text-xs text-muted-foreground">
            Proporção recomendada: <strong>1920 × 540 px</strong> (proporção 16:3) · Máximo 8 MB · JPG ou WebP
          </p>

          <div className="flex flex-col gap-3 sm:flex-row">
            <Button
              type="button"
              onClick={() => bannerInputRef.current?.click()}
              disabled={uploadingBanner}
              className="gap-2 bg-[#D4AF37] text-black hover:bg-[#C19B2D]"
            >
              {uploadingBanner ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Enviando…
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4" />
                  {currentHeroBannerUrl ? 'Trocar imagem' : 'Enviar imagem'}
                </>
              )}
            </Button>

            {currentHeroBannerUrl && (
              <Button
                type="button"
                variant="outline"
                onClick={clearHeroBanner}
                disabled={uploadingBanner}
                className="gap-2 border-destructive/40 text-destructive hover:bg-destructive/5"
              >
                <Trash2 className="h-4 w-4" />
                Remover banner fixo
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Card de Links Curtos */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <LinkIcon className="h-5 w-5" />
            Links Curtos para Eventos
          </CardTitle>
          <CardDescription>
            Gere códigos curtos (formato: sta.com/E/ABC123) para eventos existentes que ainda não possuem
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Esta ação gerará códigos curtos únicos de 6 caracteres para todas as campanhas que ainda não possuem. 
              Os códigos facilitam o compartilhamento dos eventos com os clientes.
            </AlertDescription>
          </Alert>

          <Button 
            onClick={generateShortCodes}
            disabled={generatingCodes}
            className="w-full"
            variant="outline"
            size="lg"
          >
            {generatingCodes ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary mr-2"></div>
                Gerando códigos...
              </>
            ) : (
              <>
                <LinkIcon className="h-4 w-4 mr-2" />
                Gerar Códigos Curtos para Eventos Existentes
              </>
            )}
          </Button>
        </CardContent>
      </Card>
    </div>
    </AdminLayout>
  );
};

export default PlatformConfig;
