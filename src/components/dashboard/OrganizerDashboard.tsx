import React, { useState, useEffect } from 'react';
import { formatCurrency } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DollarSign, Camera, BarChart3, Calendar } from 'lucide-react';
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
      // Buscar organizações do usuário
      const { data: orgMemberships } = await supabase
        .from('organization_members')
        .select('organization_id')
        .eq('user_id', user?.id)
        .eq('is_active', true);

      const orgIds = orgMemberships?.map(m => m.organization_id) || [];

      if (orgIds.length === 0) {
        setCampaigns([]);
        return;
      }

      // Buscar campanhas vinculadas às organizações
      const { data: campaignsData, error } = await supabase
        .from('campaigns')
        .select('*')
        .in('organization_id', orgIds)
        .order('event_date', { ascending: false });

      if (error) throw error;

      const campaignsWithStats = await Promise.all(
        (campaignsData || []).map(async (campaign) => {
          const { count: photosCount } = await supabase
            .from('photos')
            .select('*', { count: 'exact', head: true })
            .eq('campaign_id', campaign.id);

          const { data: photosInCampaign } = await supabase
            .from('photos')
            .select('id')
            .eq('campaign_id', campaign.id);

          const photoIds = photosInCampaign?.map(p => p.id) || [];

          let totalSales = 0;
          if (photoIds.length > 0) {
            const { data: purchasesData } = await supabase
              .from('purchases')
              .select('amount')
              .in('photo_id', photoIds)
              .eq('status', 'completed');

            totalSales = purchasesData?.reduce((sum, p) => sum + Number(p.amount), 0) || 0;
          }

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
      // Buscar organizações do usuário
      const { data: orgMemberships } = await supabase
        .from('organization_members')
        .select('organization_id')
        .eq('user_id', user?.id)
        .eq('is_active', true);

      const orgIds = orgMemberships?.map(m => m.organization_id) || [];

      if (orgIds.length === 0) {
        setStats({
          totalCampaigns: 0,
          totalPhotos: 0,
          totalRevenue: 0,
          totalOrganizationRevenue: 0
        });
        return;
      }

      const { count: campaignsCount } = await supabase
        .from('campaigns')
        .select('*', { count: 'exact', head: true })
        .in('organization_id', orgIds);

      const { data: campaignsData } = await supabase
        .from('campaigns')
        .select('id, organization_percentage')
        .in('organization_id', orgIds);

      const campaignIds = campaignsData?.map(c => c.id) || [];

      let photosCount = 0;
      if (campaignIds.length > 0) {
        const { count } = await supabase
          .from('photos')
          .select('*', { count: 'exact', head: true })
          .in('campaign_id', campaignIds);
        photosCount = count || 0;
      }

      let totalRevenue = 0;
      let organizationRevenue = 0;

      for (const campaign of campaignsData || []) {
        const { data: photosInCampaign } = await supabase
          .from('photos')
          .select('id')
          .eq('campaign_id', campaign.id);

        const photoIds = photosInCampaign?.map(p => p.id) || [];

        if (photoIds.length > 0) {
          const { data: purchasesData } = await supabase
            .from('purchases')
            .select('amount')
            .in('photo_id', photoIds)
            .eq('status', 'completed');

          const salesForCampaign = purchasesData?.reduce((sum, p) => sum + Number(p.amount), 0) || 0;
          totalRevenue += salesForCampaign;
          organizationRevenue += salesForCampaign * (campaign.organization_percentage / 100);
        }
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