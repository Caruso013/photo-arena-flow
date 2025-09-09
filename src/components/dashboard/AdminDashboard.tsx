import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Users, Camera, DollarSign, Shield, Settings, Eye, Edit, Trash2, Image, CreditCard, CheckCircle, XCircle } from 'lucide-react';
import DashboardLayout from './DashboardLayout';

interface User {
  id: string;
  email: string;
  full_name: string;
  role: string;
  created_at: string;
}

interface Campaign {
  id: string;
  title: string;
  description: string;
  event_date: string;
  location: string;
  is_active: boolean;
  photographer: {
    full_name: string;
  };
}

interface Purchase {
  id: string;
  amount: number;
  status: string;
  created_at: string;
  photo: {
    title: string;
  };
  buyer: {
    full_name: string;
  };
  photographer: {
    full_name: string;
  };
}

interface Photo {
  id: string;
  title: string;
  watermarked_url: string;
  thumbnail_url: string;
  is_available: boolean;
  price: number;
  created_at: string;
  photographer: {
    full_name: string;
  };
  campaign: {
    title: string;
  };
}

interface PayoutRequest {
  id: string;
  amount: number;
  status: string;
  requested_at: string;
  processed_at: string | null;
  notes: string | null;
  photographer: {
    full_name: string;
  } | null;
}

interface PhotographerRevenue {
  id: string;
  full_name: string;
  total_sales: number;
  commission: number;
  available_balance: number;
  total_photos: number;
}

interface Stats {
  totalUsers: number;
  totalPhotographers: number;
  totalCampaigns: number;
  totalRevenue: number;
}

const AdminDashboard = () => {
  const { profile } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [payoutRequests, setPayoutRequests] = useState<PayoutRequest[]>([]);
  const [photographerRevenue, setPhotographerRevenue] = useState<PhotographerRevenue[]>([]);
  const [stats, setStats] = useState<Stats>({
    totalUsers: 0,
    totalPhotographers: 0,
    totalCampaigns: 0,
    totalRevenue: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    await Promise.all([
      fetchUsers(),
      fetchCampaigns(),
      fetchPurchases(),
      fetchPhotos(),
      fetchPayoutRequests(),
      fetchPhotographerRevenue(),
      fetchStats()
    ]);
    setLoading(false);
  };

  const fetchUsers = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setUsers(data || []);
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  };

  const fetchCampaigns = async () => {
    try {
      const { data, error } = await supabase
        .from('campaigns')
        .select(`
          *,
          photographer:profiles(full_name)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setCampaigns(data || []);
    } catch (error) {
      console.error('Error fetching campaigns:', error);
    }
  };

  const fetchPurchases = async () => {
    try {
      const { data, error } = await supabase
        .from('purchases')
        .select(`
          *,
          photo:photos(title),
          buyer:profiles!purchases_buyer_id_fkey(full_name),
          photographer:profiles!purchases_photographer_id_fkey(full_name)
        `)
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) throw error;
      setPurchases(data || []);
    } catch (error) {
      console.error('Error fetching purchases:', error);
    }
  };

  const fetchStats = async () => {
    try {
      // Total users
      const { count: usersCount } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true });

      // Total photographers
      const { count: photographersCount } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .eq('role', 'photographer');

      // Total campaigns
      const { count: campaignsCount } = await supabase
        .from('campaigns')
        .select('*', { count: 'exact', head: true });

      // Total revenue
      const { data: revenueData } = await supabase
        .from('purchases')
        .select('amount')
        .eq('status', 'completed');

      const totalRevenue = revenueData?.reduce((sum, purchase) => sum + Number(purchase.amount), 0) || 0;

      setStats({
        totalUsers: usersCount || 0,
        totalPhotographers: photographersCount || 0,
        totalCampaigns: campaignsCount || 0,
        totalRevenue
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const fetchPhotos = async () => {
    try {
      const { data, error } = await supabase
        .from('photos')
        .select(`
          *,
          photographer:profiles(full_name),
          campaign:campaigns(title)
        `)
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) throw error;
      setPhotos(data || []);
    } catch (error) {
      console.error('Error fetching photos:', error);
    }
  };

  const fetchPayoutRequests = async () => {
    try {
      const { data, error } = await supabase
        .from('payout_requests')
        .select(`
          *,
          photographer:profiles(full_name)
        `)
        .order('requested_at', { ascending: false });

      if (error) throw error;
      setPayoutRequests((data || []).map(item => ({
        id: item.id,
        amount: item.amount,
        status: item.status,
        requested_at: item.requested_at,
        processed_at: item.processed_at,
        notes: item.notes,
        photographer: item.photographer && 
          typeof item.photographer === 'object' && 
          !Array.isArray(item.photographer) &&
          'full_name' in item.photographer
          ? { full_name: (item.photographer as any).full_name }
          : null
      })));
    } catch (error) {
      console.error('Error fetching payout requests:', error);
    }
  };

  const fetchPhotographerRevenue = async () => {
    try {
      // Get all photographers
      const { data: photographers, error: photoError } = await supabase
        .from('profiles')
        .select('id, full_name')
        .eq('role', 'photographer');

      if (photoError) throw photoError;

      const revenueData = await Promise.all(
        (photographers || []).map(async (photographer) => {
          // Get total sales for this photographer
          const { data: sales } = await supabase
            .from('purchases')
            .select('amount')
            .eq('photographer_id', photographer.id)
            .eq('status', 'completed');

          // Get total photos for this photographer
          const { count: totalPhotos } = await supabase
            .from('photos')
            .select('*', { count: 'exact', head: true })
            .eq('photographer_id', photographer.id);

          const totalSales = sales?.reduce((sum, sale) => sum + Number(sale.amount), 0) || 0;
          const commission = totalSales * 0.7; // 70% for photographer
          
          return {
            id: photographer.id,
            full_name: photographer.full_name,
            total_sales: totalSales,
            commission,
            available_balance: commission, // In a real app, subtract already paid amounts
            total_photos: totalPhotos || 0
          };
        })
      );

      setPhotographerRevenue(revenueData);
    } catch (error) {
      console.error('Error fetching photographer revenue:', error);
    }
  };

  const updatePhotoStatus = async (photoId: string, isAvailable: boolean) => {
    try {
      const { error } = await supabase
        .from('photos')
        .update({ is_available: isAvailable })
        .eq('id', photoId);

      if (error) throw error;
      await fetchPhotos();
    } catch (error) {
      console.error('Error updating photo status:', error);
    }
  };

  const processPayoutRequest = async (requestId: string, action: 'approved' | 'rejected', notes?: string) => {
    try {
      const { error } = await supabase
        .from('payout_requests')
        .update({
          status: action,
          processed_at: new Date().toISOString(),
          processed_by: profile?.id,
          notes: notes
        })
        .eq('id', requestId);

      if (error) throw error;
      await fetchPayoutRequests();
    } catch (error) {
      console.error('Error processing payout request:', error);
    }
  };

  const updateUserRole = async (userId: string, newRole: 'user' | 'photographer' | 'admin') => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ role: newRole })
        .eq('id', userId);

      if (error) throw error;
      
      // Refresh users list
      await fetchUsers();
      await fetchStats();
    } catch (error) {
      console.error('Error updating user role:', error);
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
        {/* Welcome Section */}
        <div className="bg-gradient-primary rounded-lg p-8 text-white">
          <div className="flex items-center gap-3 mb-2">
            <Shield className="h-8 w-8" />
            <h1 className="text-3xl font-bold">Painel Administrativo</h1>
          </div>
          <p className="text-lg opacity-90">
            Olá, {profile?.full_name}! Gerencie toda a plataforma aqui.
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total de Usuários</p>
                  <p className="text-2xl font-bold">{stats.totalUsers}</p>
                </div>
                <Users className="h-8 w-8 text-primary" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Fotógrafos</p>
                  <p className="text-2xl font-bold">{stats.totalPhotographers}</p>
                </div>
                <Camera className="h-8 w-8 text-primary" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total de Eventos</p>
                  <p className="text-2xl font-bold">{stats.totalCampaigns}</p>
                </div>
                <Camera className="h-8 w-8 text-primary" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Receita Total</p>
                  <p className="text-2xl font-bold">R$ {stats.totalRevenue.toFixed(2)}</p>
                </div>
                <DollarSign className="h-8 w-8 text-primary" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content Tabs */}
        <Tabs defaultValue="users" className="space-y-4">
          <TabsList>
            <TabsTrigger value="users">Usuários</TabsTrigger>
            <TabsTrigger value="campaigns">Eventos</TabsTrigger>
            <TabsTrigger value="photos">Fotos</TabsTrigger>
            <TabsTrigger value="revenue">Receitas</TabsTrigger>
            <TabsTrigger value="payouts">Repasses</TabsTrigger>
            <TabsTrigger value="purchases">Vendas</TabsTrigger>
          </TabsList>

          <TabsContent value="users" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Gerenciar Usuários</CardTitle>
                <CardDescription>
                  Visualize e gerencie todos os usuários da plataforma
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {users.map((user) => (
                    <div key={user.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex-1">
                        <div className="flex items-center gap-3">
                          <div>
                            <p className="font-medium">{user.full_name || user.email}</p>
                            <p className="text-sm text-muted-foreground">{user.email}</p>
                          </div>
                          <Badge variant={
                            user.role === 'admin' ? 'default' : 
                            user.role === 'photographer' ? 'secondary' : 'outline'
                          }>
                            {user.role === 'admin' ? 'Admin' : 
                             user.role === 'photographer' ? 'Fotógrafo' : 'Usuário'}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          Criado em {new Date(user.created_at).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        {user.role !== 'admin' && (
                          <>
                            <Button 
                              size="sm" 
                              variant="outline"
                              onClick={() => updateUserRole(user.id, user.role === 'photographer' ? 'user' : 'photographer')}
                            >
                              {user.role === 'photographer' ? 'Tornar Usuário' : 'Tornar Fotógrafo'}
                            </Button>
                            <Button size="sm" variant="outline">
                              <Edit className="h-3 w-3" />
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="campaigns" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Todos os Eventos</CardTitle>
                <CardDescription>
                  Visualize e gerencie todos os eventos da plataforma
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {campaigns.map((campaign) => (
                    <div key={campaign.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="font-medium">{campaign.title}</h3>
                          <Badge variant={campaign.is_active ? "default" : "secondary"}>
                            {campaign.is_active ? "Ativo" : "Inativo"}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground mb-1">
                          {campaign.description}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          Por: {campaign.photographer?.full_name} • {campaign.location} • {new Date(campaign.event_date).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline">
                          <Eye className="h-3 w-3" />
                        </Button>
                        <Button size="sm" variant="outline">
                          <Edit className="h-3 w-3" />
                        </Button>
                        <Button size="sm" variant="outline">
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="photos" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Gerenciar Fotos</CardTitle>
                <CardDescription>
                  Visualize e modere todas as fotos da plataforma
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {photos.map((photo) => (
                    <div key={photo.id} className="flex items-center gap-4 p-4 border rounded-lg">
                      <div className="w-20 h-20 rounded-lg overflow-hidden bg-muted">
                        <img 
                          src={photo.thumbnail_url || photo.watermarked_url} 
                          alt={photo.title || 'Foto'}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="font-medium">{photo.title || 'Foto sem título'}</h3>
                          <Badge variant={photo.is_available ? "default" : "secondary"}>
                            {photo.is_available ? "Disponível" : "Indisponível"}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          Por: {photo.photographer?.full_name} • Evento: {photo.campaign?.title}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          Preço: R$ {Number(photo.price).toFixed(2)} • {new Date(photo.created_at).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => updatePhotoStatus(photo.id, !photo.is_available)}
                        >
                          {photo.is_available ? 'Ocultar' : 'Mostrar'}
                        </Button>
                        <Button size="sm" variant="outline">
                          <Eye className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="revenue" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Receitas por Fotógrafo</CardTitle>
                <CardDescription>
                  Visualize o desempenho financeiro individual de cada fotógrafo
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {photographerRevenue.map((photographer) => (
                    <div key={photographer.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex-1">
                        <h3 className="font-medium">{photographer.full_name}</h3>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-2 text-sm">
                          <div>
                            <p className="text-muted-foreground">Total de Fotos</p>
                            <p className="font-medium">{photographer.total_photos}</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">Vendas Totais</p>
                            <p className="font-medium">R$ {photographer.total_sales.toFixed(2)}</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">Comissão (70%)</p>
                            <p className="font-medium text-primary">R$ {photographer.commission.toFixed(2)}</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">Saldo Disponível</p>
                            <p className="font-medium text-green-600">R$ {photographer.available_balance.toFixed(2)}</p>
                          </div>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline">
                          <Eye className="h-3 w-3 mr-1" />
                          Detalhes
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="payouts" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Solicitações de Repasse</CardTitle>
                <CardDescription>
                  Gerencie as solicitações de pagamento dos fotógrafos
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {payoutRequests.map((request) => (
                    <div key={request.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="font-medium">{request.photographer?.full_name}</h3>
                          <Badge variant={
                            request.status === 'approved' ? 'default' :
                            request.status === 'pending' ? 'secondary' : 'destructive'
                          }>
                            {request.status === 'approved' ? 'Aprovado' :
                             request.status === 'pending' ? 'Pendente' : 'Rejeitado'}
                          </Badge>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                          <div>
                            <p className="text-muted-foreground">Valor Solicitado</p>
                            <p className="font-medium text-primary">R$ {Number(request.amount).toFixed(2)}</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">Data da Solicitação</p>
                            <p className="font-medium">{new Date(request.requested_at).toLocaleDateString()}</p>
                          </div>
                          {request.processed_at && (
                            <div>
                              <p className="text-muted-foreground">Processado em</p>
                              <p className="font-medium">{new Date(request.processed_at).toLocaleDateString()}</p>
                            </div>
                          )}
                        </div>
                        {request.notes && (
                          <p className="text-sm text-muted-foreground mt-2">
                            Observações: {request.notes}
                          </p>
                        )}
                      </div>
                      {request.status === 'pending' && (
                        <div className="flex gap-2">
                          <Button 
                            size="sm" 
                            variant="outline"
                            className="text-green-600 border-green-600 hover:bg-green-50"
                            onClick={() => processPayoutRequest(request.id, 'approved', 'Pagamento aprovado pelo admin')}
                          >
                            <CheckCircle className="h-3 w-3 mr-1" />
                            Aprovar
                          </Button>
                          <Button 
                            size="sm" 
                            variant="outline"
                            className="text-red-600 border-red-600 hover:bg-red-50"
                            onClick={() => processPayoutRequest(request.id, 'rejected', 'Rejeitado pelo admin')}
                          >
                            <XCircle className="h-3 w-3 mr-1" />
                            Rejeitar
                          </Button>
                        </div>
                      )}
                    </div>
                  ))}
                  {payoutRequests.length === 0 && (
                    <div className="text-center py-8 text-muted-foreground">
                      Nenhuma solicitação de repasse encontrada
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="purchases" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Histórico de Vendas</CardTitle>
                <CardDescription>
                  Visualize todas as transações da plataforma
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {purchases.map((purchase) => (
                    <div key={purchase.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-1">
                          <p className="font-medium">{purchase.photo?.title || 'Foto'}</p>
                          <Badge variant={
                            purchase.status === 'completed' ? 'default' :
                            purchase.status === 'pending' ? 'secondary' : 'destructive'
                          }>
                            {purchase.status === 'completed' ? 'Concluído' :
                             purchase.status === 'pending' ? 'Pendente' : 'Falhou'}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          Comprador: {purchase.buyer?.full_name} • Fotógrafo: {purchase.photographer?.full_name}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(purchase.created_at).toLocaleDateString()} às {new Date(purchase.created_at).toLocaleTimeString()}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-medium">R$ {Number(purchase.amount).toFixed(2)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
};

export default AdminDashboard;