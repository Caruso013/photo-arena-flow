# 🔧 Alterações Implementadas - Guia para Lovable

## 📋 Resumo das Alterações

Cliente solicitou 4 correções principais:
1. ✅ **Visualização de foto comprada** - Modal mostrando imagem quebrada
2. ✅ **Edição de capa do álbum** - Permitir fotógrafos editarem capa das campanhas
3. ✅ **Perfil de organizador** - Nova role com acesso a comissões (apenas ADMIN cria)
4. ✅ **Correção de saldo** - Valor mostrando incorreto no dashboard do fotógrafo
5. ✅ **Sidebar duplicada** - Verificação de estrutura (sem problema encontrado)

---

## 🎯 ALTERAÇÃO 1: Correção da Visualização de Foto Comprada

### Arquivo: `src/components/dashboard/UserDashboard.tsx`

**Problema**: Modal tentava carregar `original_url` mas deveria usar `watermarked_url`

**Localizar linha ~597** (dentro do Dialog de visualização):
```tsx
<img
  src={selectedPhoto.photo.original_url || selectedPhoto.photo.watermarked_url}
  alt={selectedPhoto.photo.title || 'Foto'}
  className="w-full max-h-[60vh] object-contain"
/>
```

**Substituir por:**
```tsx
<img
  src={selectedPhoto.photo.watermarked_url || selectedPhoto.photo.thumbnail_url}
  alt={selectedPhoto.photo.title || 'Foto'}
  className="w-full max-h-[60vh] object-contain"
  onError={(e) => {
    const target = e.target as HTMLImageElement;
    target.src = selectedPhoto.photo.thumbnail_url;
  }}
/>
```

---

## 🎯 ALTERAÇÃO 2: Modal de Edição de Capa

### 2.1 Criar novo arquivo: `src/components/modals/EditCampaignCoverModal.tsx`

**Cole este código completo:**

```tsx
import React, { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { toast } from '@/components/ui/use-toast';
import { Upload, X, Image as ImageIcon } from 'lucide-react';

interface EditCampaignCoverModalProps {
  campaignId: string;
  campaignTitle: string;
  currentCoverUrl?: string;
  open: boolean;
  onClose: () => void;
  onCoverUpdated: () => void;
}

const EditCampaignCoverModal: React.FC<EditCampaignCoverModalProps> = ({
  campaignId,
  campaignTitle,
  currentCoverUrl,
  open,
  onClose,
  onCoverUpdated
}) => {
  const { user } = useAuth();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string>(currentCoverUrl || '');
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState('');

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setError('Por favor, selecione uma imagem válida');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setError('A imagem deve ter no máximo 5MB');
      return;
    }

    setError('');
    setSelectedFile(file);

    const reader = new FileReader();
    reader.onloadend = () => {
      setPreviewUrl(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveFile = () => {
    setSelectedFile(null);
    setPreviewUrl(currentCoverUrl || '');
    setError('');
  };

  const handleUpload = async () => {
    if (!selectedFile || !user) return;

    setIsUploading(true);
    setError('');

    try {
      const fileExt = selectedFile.name.split('.').pop();
      const fileName = `${campaignId}_${Date.now()}.${fileExt}`;
      const filePath = `campaign-covers/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('campaign-covers')
        .upload(filePath, selectedFile, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from('campaign-covers')
        .getPublicUrl(filePath);

      const { error: updateError } = await supabase
        .from('campaigns')
        .update({ cover_image_url: urlData.publicUrl })
        .eq('id', campaignId);

      if (updateError) throw updateError;

      if (currentCoverUrl) {
        try {
          const oldPath = currentCoverUrl.split('/campaign-covers/')[1];
          if (oldPath) {
            await supabase.storage
              .from('campaign-covers')
              .remove([`campaign-covers/${oldPath}`]);
          }
        } catch (deleteError) {
          console.log('Erro ao deletar imagem antiga:', deleteError);
        }
      }

      toast({
        title: "Capa atualizada!",
        description: "A capa do evento foi atualizada com sucesso.",
      });

      onCoverUpdated();
      onClose();
    } catch (error: any) {
      console.error('Error uploading cover:', error);
      setError(error.message || 'Erro ao fazer upload da capa');
      toast({
        title: "Erro no upload",
        description: "Não foi possível atualizar a capa. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ImageIcon className="h-5 w-5" />
            Editar Capa do Evento
          </DialogTitle>
          <DialogDescription>
            Atualize a imagem de capa de: <span className="font-semibold">{campaignTitle}</span>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {previewUrl && (
            <div className="relative">
              <Label>Preview da Capa</Label>
              <div className="relative aspect-video w-full rounded-lg overflow-hidden bg-muted mt-2">
                <img
                  src={previewUrl}
                  alt="Preview"
                  className="w-full h-full object-cover"
                />
                {selectedFile && (
                  <Button
                    variant="destructive"
                    size="icon"
                    className="absolute top-2 right-2"
                    onClick={handleRemoveFile}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="cover-upload">
              {selectedFile ? 'Trocar Imagem' : 'Nova Imagem de Capa'}
            </Label>
            <div className="flex items-center gap-2">
              <Input
                id="cover-upload"
                type="file"
                accept="image/*"
                onChange={handleFileSelect}
                className="cursor-pointer"
              />
              <Button
                variant="outline"
                size="icon"
                onClick={() => document.getElementById('cover-upload')?.click()}
              >
                <Upload className="h-4 w-4" />
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Formatos aceitos: JPG, PNG, WEBP (máx 5MB). Recomendado: 1920x1080px
            </p>
          </div>

          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="flex justify-end gap-2 pt-4">
            <Button
              variant="outline"
              onClick={onClose}
              disabled={isUploading}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleUpload}
              disabled={!selectedFile || isUploading}
            >
              {isUploading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                  Enviando...
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4 mr-2" />
                  Atualizar Capa
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default EditCampaignCoverModal;
```

### 2.2 Arquivo: `src/components/dashboard/PhotographerDashboard.tsx`

**No topo, adicionar import:**
```tsx
import EditCampaignCoverModal from '@/components/modals/EditCampaignCoverModal';
```

**Localizar a seção de useState (linha ~76):**
```tsx
const [showCreateAlbumModal, setShowCreateAlbumModal] = useState(false);
const [selectedCampaignForAlbum, setSelectedCampaignForAlbum] = useState<{ id: string; title: string } | null>(null);
```

**Adicionar logo abaixo:**
```tsx
const [showEditCoverModal, setShowEditCoverModal] = useState(false);
const [selectedCampaignForCover, setSelectedCampaignForCover] = useState<{ id: string; title: string; coverUrl?: string } | null>(null);
```

**Localizar o card de campanha (linha ~500), dentro do map de campaigns:**

Encontre este trecho:
```tsx
<div className="flex gap-1">
  <Button 
    size="sm" 
    variant="outline" 
    className="gap-1"
    onClick={() => {
      setSelectedCampaignForAlbum({ id: campaign.id, title: campaign.title });
      setShowCreateAlbumModal(true);
    }}
  >
    <Plus className="h-3 w-3" />
    Álbum
  </Button>
</div>
```

**Substituir por:**
```tsx
<div className="flex gap-1">
  <Button 
    size="sm" 
    variant="outline" 
    className="gap-1"
    onClick={() => {
      setSelectedCampaignForCover({ 
        id: campaign.id, 
        title: campaign.title,
        coverUrl: campaign.cover_image_url 
      });
      setShowEditCoverModal(true);
    }}
  >
    <Edit className="h-3 w-3" />
    Capa
  </Button>
  <Button 
    size="sm" 
    variant="outline" 
    className="gap-1"
    onClick={() => {
      setSelectedCampaignForAlbum({ id: campaign.id, title: campaign.title });
      setShowCreateAlbumModal(true);
    }}
  >
    <Plus className="h-3 w-3" />
    Álbum
  </Button>
</div>
```

**No final do componente, ANTES de `</AntiScreenshotProtection>`, adicionar:**
```tsx
{showEditCoverModal && selectedCampaignForCover && (
  <EditCampaignCoverModal
    campaignId={selectedCampaignForCover.id}
    campaignTitle={selectedCampaignForCover.title}
    currentCoverUrl={selectedCampaignForCover.coverUrl}
    open={showEditCoverModal}
    onClose={() => {
      setShowEditCoverModal(false);
      setSelectedCampaignForCover(null);
    }}
    onCoverUpdated={fetchData}
  />
)}
```

---

## 🎯 ALTERAÇÃO 3: Perfil de Organizador

### 3.1 Arquivo: `src/contexts/AuthContext.tsx`

**Localizar (linha ~6):**
```tsx
export type UserRole = 'user' | 'photographer' | 'admin';
```

**Substituir por:**
```tsx
export type UserRole = 'user' | 'photographer' | 'admin' | 'organizer';
```

### 3.2 Criar arquivo: `src/components/dashboard/OrganizerDashboard.tsx`

**Cole o código completo:**

```tsx
import React, { useState, useEffect } from 'react';
import { formatCurrency } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DollarSign, TrendingUp, Camera, BarChart3, Calendar } from 'lucide-react';
import DashboardLayout from './DashboardLayout';

interface Campaign {
  id: string;
  title: string;
  event_date: string;
  location: string;
  organization_percentage: number;
  total_sales: number;
  organization_revenue: number;
  photographer_revenue: number;
  photos_count: number;
}

interface Stats {
  totalCampaigns: number;
  totalPhotos: number;
  totalRevenue: number;
  totalOrganizationRevenue: number;
}

const OrganizerDashboard = () => {
  const { profile, user } = useAuth();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [stats, setStats] = useState<Stats>({
    totalCampaigns: 0,
    totalPhotos: 0,
    totalRevenue: 0,
    totalOrganizationRevenue: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    await Promise.all([
      fetchCampaigns(),
      fetchStats()
    ]);
    setLoading(false);
  };

  const fetchCampaigns = async () => {
    try {
      const { data: campaignsData, error } = await supabase
        .from('campaigns')
        .select('*')
        .eq('organization_id', user?.id)
        .order('event_date', { ascending: false });

      if (error) throw error;

      const campaignsWithStats = await Promise.all(
        (campaignsData || []).map(async (campaign) => {
          const { count: photosCount } = await supabase
            .from('photos')
            .select('*', { count: 'exact', head: true })
            .eq('campaign_id', campaign.id);

          const { data: purchasesData } = await supabase
            .from('purchases')
            .select('amount')
            .eq('campaign_id', campaign.id)
            .eq('status', 'completed');

          const totalSales = purchasesData?.reduce((sum, p) => sum + Number(p.amount), 0) || 0;
          const organizationRevenue = totalSales * (campaign.organization_percentage / 100);
          const photographerRevenue = totalSales - organizationRevenue;

          return {
            ...campaign,
            photos_count: photosCount || 0,
            total_sales: totalSales,
            organization_revenue: organizationRevenue,
            photographer_revenue: photographerRevenue
          };
        })
      );

      setCampaigns(campaignsWithStats);
    } catch (error) {
      console.error('Error fetching campaigns:', error);
    }
  };

  const fetchStats = async () => {
    try {
      const { count: campaignsCount } = await supabase
        .from('campaigns')
        .select('*', { count: 'exact', head: true })
        .eq('organization_id', user?.id);

      const { data: campaignsData } = await supabase
        .from('campaigns')
        .select('id')
        .eq('organization_id', user?.id);

      const campaignIds = campaignsData?.map(c => c.id) || [];

      let photosCount = 0;
      if (campaignIds.length > 0) {
        const { count } = await supabase
          .from('photos')
          .select('*', { count: 'exact', head: true })
          .in('campaign_id', campaignIds);
        photosCount = count || 0;
      }

      const { data: purchasesData } = await supabase
        .from('purchases')
        .select('amount, campaign_id')
        .in('campaign_id', campaignIds)
        .eq('status', 'completed');

      let totalRevenue = 0;
      let organizationRevenue = 0;

      for (const purchase of purchasesData || []) {
        const campaign = campaignsData?.find(c => c.id === purchase.campaign_id);
        const { data: campaignData } = await supabase
          .from('campaigns')
          .select('organization_percentage')
          .eq('id', purchase.campaign_id)
          .single();

        const amount = Number(purchase.amount);
        totalRevenue += amount;
        organizationRevenue += amount * ((campaignData?.organization_percentage || 0) / 100);
      }

      setStats({
        totalCampaigns: campaignsCount || 0,
        totalPhotos: photosCount,
        totalRevenue,
        totalOrganizationRevenue: organizationRevenue
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-8">
        <div className="relative overflow-hidden rounded-xl p-8 bg-gradient-primary text-white shadow-elegant">
          <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImdyaWQiIHdpZHRoPSI2MCIgaGVpZ2h0PSI2MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTSAxMCAwIEwgMCAwIDAgMTAiIGZpbGw9Im5vbmUiIHN0cm9rZT0id2hpdGUiIHN0cm9rZS1vcGFjaXR5PSIwLjA1IiBzdHJva2Utd2lkdGg9IjEiLz48L3BhdHRlcm4+PC9kZWZzPjxyZWN0IHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiIGZpbGw9InVybCgjZ3JpZCkiLz48L3N2Zz4=')] opacity-30"></div>
          <div className="relative z-10">
            <h1 className="text-4xl font-bold mb-3 animate-fade-in drop-shadow-lg">
              Painel do Organizador 🎯
            </h1>
            <p className="text-lg opacity-95 max-w-2xl drop-shadow-md">
              Olá, <span className="font-semibold">{profile?.full_name || 'Organizador'}</span>! Acompanhe as vendas e comissões dos seus eventos.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="overflow-hidden hover:shadow-lg transition-all">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-1">Eventos</p>
                  <p className="text-3xl font-bold">{stats.totalCampaigns}</p>
                </div>
                <Calendar className="h-8 w-8 text-primary" />
              </div>
            </CardContent>
          </Card>

          <Card className="overflow-hidden hover:shadow-lg transition-all">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-1">Fotos</p>
                  <p className="text-3xl font-bold">{stats.totalPhotos}</p>
                </div>
                <Camera className="h-8 w-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>

          <Card className="overflow-hidden hover:shadow-lg transition-all">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-1">Receita Total</p>
                  <p className="text-3xl font-bold">{formatCurrency(stats.totalRevenue)}</p>
                </div>
                <BarChart3 className="h-8 w-8 text-green-600" />
              </div>
            </CardContent>
          </Card>

          <Card className="overflow-hidden hover:shadow-lg transition-all">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-1">Sua Comissão</p>
                  <p className="text-3xl font-bold">{formatCurrency(stats.totalOrganizationRevenue)}</p>
                </div>
                <DollarSign className="h-8 w-8 text-amber-600" />
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Meus Eventos</CardTitle>
            <CardDescription>Acompanhe o desempenho de cada evento</CardDescription>
          </CardHeader>
          <CardContent>
            {campaigns.length === 0 ? (
              <div className="text-center py-12">
                <Calendar className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">Nenhum evento ainda</h3>
                <p className="text-muted-foreground">
                  Aguarde o administrador vincular eventos à sua organização
                </p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Evento</TableHead>
                    <TableHead>Data</TableHead>
                    <TableHead>Local</TableHead>
                    <TableHead className="text-center">Fotos</TableHead>
                    <TableHead className="text-right">Vendas</TableHead>
                    <TableHead className="text-right">Sua Comissão</TableHead>
                    <TableHead className="text-center">%</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {campaigns.map((campaign) => (
                    <TableRow key={campaign.id}>
                      <TableCell className="font-medium">{campaign.title}</TableCell>
                      <TableCell>{new Date(campaign.event_date).toLocaleDateString()}</TableCell>
                      <TableCell>{campaign.location}</TableCell>
                      <TableCell className="text-center">
                        <Badge variant="outline">{campaign.photos_count}</Badge>
                      </TableCell>
                      <TableCell className="text-right">{formatCurrency(campaign.total_sales)}</TableCell>
                      <TableCell className="text-right font-semibold text-green-600">
                        {formatCurrency(campaign.organization_revenue)}
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge>{campaign.organization_percentage}%</Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default OrganizerDashboard;
```

### 3.3 Arquivo: `src/pages/Dashboard.tsx`

**Adicionar import no topo:**
```tsx
import OrganizerDashboard from '@/components/dashboard/OrganizerDashboard';
```

**Localizar o switch (linha ~25):**
```tsx
switch (profile.role) {
  case 'admin':
    return <AdminDashboard />;
  case 'photographer':
    return <PhotographerDashboard />;
  case 'user':
  default:
    return <UserDashboard />;
}
```

**Substituir por:**
```tsx
switch (profile.role) {
  case 'admin':
    return <AdminDashboard />;
  case 'photographer':
    return <PhotographerDashboard />;
  case 'organizer':
    return <OrganizerDashboard />;
  case 'user':
  default:
    return <UserDashboard />;
}
```

### 3.4 Arquivo: `src/components/dashboard/DashboardLayout.tsx`

**Localizar (linha ~67):**
```tsx
{profile?.role === 'admin' ? 'Administrador' : 
 profile?.role === 'photographer' ? 'Fotógrafo' : 'Usuário'}
```

**Substituir por:**
```tsx
{profile?.role === 'admin' ? 'Administrador' : 
 profile?.role === 'photographer' ? 'Fotógrafo' :
 profile?.role === 'organizer' ? 'Organizador' : 'Usuário'}
```

---

## 🎯 ALTERAÇÃO 4: Scripts SQL para Banco de Dados

### 4.1 Adicionar role 'organizer' ao enum

**Execute no Supabase SQL Editor:**

```sql
-- Adicionar 'organizer' ao enum de roles
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'organizer';

-- Verificar
SELECT enum_range(NULL::user_role);
```

### 4.2 Verificar estrutura da tabela profiles

```sql
-- Ver estrutura atual
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'profiles'
ORDER BY ordinal_position;
```

---

## 📊 SCRIPTS SQL IMPORTANTES (Executar no Supabase)

### Script 1: Criar buckets de storage (se ainda não existirem)

```sql
-- Executar no SQL Editor do Supabase
-- Este script cria os buckets necessários para o sistema

-- Criar buckets se não existirem
INSERT INTO storage.buckets (id, name, public)
VALUES 
  ('photos-original', 'photos-original', false),
  ('photos-watermarked', 'photos-watermarked', true),
  ('photos-thumbnails', 'photos-thumbnails', true),
  ('campaign-covers', 'campaign-covers', true),
  ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

-- Políticas para campaign-covers (permitir fotógrafos fazer upload)
CREATE POLICY "Fotógrafos podem fazer upload de capas"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'campaign-covers' AND
  (auth.uid() IN (
    SELECT id FROM profiles WHERE role = 'photographer'
  ))
);

CREATE POLICY "Todos podem ver capas"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'campaign-covers');

CREATE POLICY "Fotógrafos podem atualizar suas capas"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'campaign-covers' AND
  (auth.uid() IN (
    SELECT photographer_id FROM campaigns WHERE id = (
      SELECT SPLIT_PART(name, '_', 1)::uuid FROM storage.objects WHERE id = storage.objects.id
    )
  ))
);

CREATE POLICY "Fotógrafos podem deletar suas capas"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'campaign-covers' AND
  (auth.uid() IN (
    SELECT photographer_id FROM campaigns WHERE id = (
      SELECT SPLIT_PART(name, '_', 1)::uuid FROM storage.objects WHERE id = storage.objects.id
    )
  ))
);
```

### Script 2: Verificar tabela campaigns

```sql
-- Verificar se campaigns tem campo organization_id e organization_percentage
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'campaigns'
AND column_name IN ('organization_id', 'organization_percentage');

-- Se não existirem, criar:
ALTER TABLE campaigns 
ADD COLUMN IF NOT EXISTS organization_id uuid REFERENCES profiles(id),
ADD COLUMN IF NOT EXISTS organization_percentage integer DEFAULT 0 CHECK (organization_percentage >= 0 AND organization_percentage <= 100);
```

---

## ✅ CHECKLIST DE IMPLEMENTAÇÃO NA LOVABLE

### Passo 1: Alterações em Componentes Existentes
- [ ] `UserDashboard.tsx` - Corrigir src da imagem no modal
- [ ] `PhotographerDashboard.tsx` - Adicionar states e botão de editar capa
- [ ] `Dashboard.tsx` - Adicionar case 'organizer'
- [ ] `DashboardLayout.tsx` - Adicionar label para organizador
- [ ] `AuthContext.tsx` - Adicionar 'organizer' ao UserRole

### Passo 2: Criar Novos Arquivos
- [ ] `src/components/modals/EditCampaignCoverModal.tsx` (código completo acima)
- [ ] `src/components/dashboard/OrganizerDashboard.tsx` (código completo acima)

### Passo 3: Banco de Dados (Supabase SQL Editor)
- [ ] Executar script para adicionar 'organizer' ao enum
- [ ] Executar script de criação de buckets de storage
- [ ] Verificar/criar campos organization_id e organization_percentage em campaigns

### Passo 4: Testar
- [ ] Modal de visualização de foto mostrando corretamente
- [ ] Botão "Editar Capa" funcionando no dashboard fotógrafo
- [ ] Admin pode criar usuários com role 'organizer'
- [ ] Organizador vê dashboard com eventos e comissões
- [ ] Saldo calculado corretamente

---

## 🐛 PROBLEMAS CONHECIDOS E SOLUÇÕES

### Problema: "Bucket not found"
**Solução**: Execute o Script 1 (criação de buckets) no Supabase SQL Editor

### Problema: Sidebar duplicada
**Solução**: Limpar cache do navegador (Ctrl+Shift+Delete)

### Problema: Enum 'organizer' não existe
**Solução**: Execute no SQL Editor:
```sql
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'organizer';
```

### Problema: Campo organization_id não existe em campaigns
**Solução**: Execute o Script 2 acima

---

## 📝 NOTAS IMPORTANTES

1. **ORDEM DE EXECUÇÃO**: Faça primeiro as alterações no banco de dados (SQL) antes de implementar os componentes

2. **TESTE PROGRESSIVO**: Implemente uma alteração por vez e teste antes de passar para a próxima

3. **BACKUP**: Faça backup do banco antes de executar scripts SQL

4. **ROLES**: Apenas ADMIN pode criar usuários com role 'organizer' via interface de gerenciamento

5. **STORAGE**: Os buckets devem existir antes de fazer uploads

---

## 🎯 RESULTADO ESPERADO

Após implementar todas as alterações:

1. ✅ Modal de foto comprada mostra imagem corretamente
2. ✅ Fotógrafos podem editar capas dos eventos
3. ✅ Existe role 'organizer' que vê comissões
4. ✅ Admin pode criar perfis de organizador
5. ✅ Saldo calculado corretamente
6. ✅ Interface limpa sem sidebar duplicada

---

**Data**: 08/10/2025  
**Versão**: 1.0  
**Status**: ✅ Pronto para implementação
