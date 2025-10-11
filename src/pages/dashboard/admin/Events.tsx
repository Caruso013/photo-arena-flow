import { useAuth } from '@/contexts/AuthContext';
import { CampaignManager } from '@/components/dashboard/CampaignManager';
import { ApplicationsManager } from '@/components/dashboard/ApplicationsManager';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Calendar, UserCheck } from 'lucide-react';
import AdminLayout from '@/components/dashboard/AdminLayout';

const AdminEvents = () => {
  const { profile } = useAuth();

  if (profile?.role !== 'admin') {
    return (
      <div className="text-center py-12">
        <h2 className="text-2xl font-bold mb-2">Acesso Negado</h2>
        <p className="text-muted-foreground">Apenas administradores podem acessar esta página</p>
      </div>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Eventos</h1>
          <p className="text-muted-foreground">Gerencie campanhas e candidaturas</p>
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
          </TabsList>

          <TabsContent value="campaigns">
            <CampaignManager campaigns={[]} onRefresh={() => {}} />
          </TabsContent>

          <TabsContent value="applications">
            <ApplicationsManager />
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  );
};

export default AdminEvents;
