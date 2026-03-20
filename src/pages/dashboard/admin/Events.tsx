import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { CampaignManager } from '@/components/dashboard/CampaignManager';
import { ApplicationsManager } from '@/components/dashboard/ApplicationsManager';
import { EventSalesManager } from '@/components/dashboard/EventSalesManager';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Calendar, UserCheck, ShoppingCart, DollarSign } from 'lucide-react';
import AdminLayout from '@/components/dashboard/AdminLayout';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/components/ui/use-toast';
import BulkPriceUpdateModal from '@/components/dashboard/BulkPriceUpdateModal';

const PAGE_SIZE = 20;

const AdminEvents = () => {
  const { profile } = useAuth();
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [bulkPriceOpen, setBulkPriceOpen] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(0);
  const [loadingMore, setLoadingMore] = useState(false);

  useEffect(() => {
    fetchCampaigns(0, true);
  }, []);

  const fetchCampaigns = async (pageNum: number = 0, reset: boolean = false) => {
    try {
      if (reset) setLoading(true);
      else setLoadingMore(true);

      const from = pageNum * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;

      const { data, error } = await supabase
        .from('campaigns')
        .select('*, organizations(name)')
        .order('created_at', { ascending: false })
        .range(from, to);

      if (error) throw error;

      const newData = data || [];
      setHasMore(newData.length === PAGE_SIZE);

      if (reset) {
        setCampaigns(newData);
      } else {
        setCampaigns(prev => [...prev, ...newData]);
      }
      setPage(pageNum);
    } catch (error) {
      console.error('Error fetching campaigns:', error);
      toast({
        title: "Erro ao carregar campanhas",
        description: "Não foi possível carregar a lista de campanhas.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  const handleLoadMore = () => {
    if (!loadingMore && hasMore) {
      fetchCampaigns(page + 1, false);
    }
  };

  if (profile?.role !== 'admin') {
    return (
      <div className="text-center py-12">
        <h2 className="text-2xl font-bold mb-2">Acesso Negado</h2>
        <p className="text-muted-foreground">Apenas administradores podem acessar esta página</p>
      </div>
    );
  }

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Eventos</h1>
            <p className="text-muted-foreground">Gerencie campanhas e candidaturas</p>
          </div>
          <Button variant="outline" onClick={() => setBulkPriceOpen(true)} className="gap-2">
            <DollarSign className="h-4 w-4" />
            Preço em Massa
          </Button>
        </div>

        <Tabs defaultValue="campaigns" className="space-y-6">
          <TabsList>
            <TabsTrigger value="campaigns" className="gap-2">
              <Calendar className="h-4 w-4" />
              Campanhas
            </TabsTrigger>
            <TabsTrigger value="applications" className="gap-2">
              <UserCheck className="h-4 w-4" />
              Candidaturas
            </TabsTrigger>
            <TabsTrigger value="sales" className="gap-2">
              <ShoppingCart className="h-4 w-4" />
              Vendas
            </TabsTrigger>
          </TabsList>

          <TabsContent value="campaigns">
            <CampaignManager 
              campaigns={campaigns} 
              onRefresh={() => fetchCampaigns(0, true)} 
              hasMore={hasMore}
              loadingMore={loadingMore}
              onLoadMore={handleLoadMore}
            />
          </TabsContent>

          <TabsContent value="applications">
            <ApplicationsManager />
          </TabsContent>

          <TabsContent value="sales">
            <EventSalesManager />
          </TabsContent>
        </Tabs>

        <BulkPriceUpdateModal open={bulkPriceOpen} onClose={() => setBulkPriceOpen(false)} />
      </div>
    </AdminLayout>
  );
};

export default AdminEvents;
