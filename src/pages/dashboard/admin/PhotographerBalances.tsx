import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { formatCurrency } from '@/lib/utils';
import { DollarSign, Search, Users, TrendingUp, Clock, Download } from 'lucide-react';
import AdminLayout from '@/components/dashboard/AdminLayout';
import { toast } from 'sonner';
import * as XLSX from 'xlsx';

interface PhotographerBalance {
  photographer_id: string;
  photographer_name: string;
  photographer_email: string;
  total_earned: number;
  total_withdrawn: number;
  pending_withdrawal: number;
  available_balance: number;
  total_sales: number;
}

const PhotographerBalances = () => {
  const { profile } = useAuth();
  const [balances, setBalances] = useState<PhotographerBalance[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchBalances();
  }, []);

  const fetchBalances = async () => {
    try {
      setLoading(true);

      // Buscar TODOS os revenue_shares com paginação para evitar limite de 1000 registros
      let allRevenueData: any[] = [];
      let page = 0;
      const pageSize = 1000;
      let hasMore = true;

      while (hasMore) {
        const { data: revenueData, error: revenueError } = await supabase
          .from('revenue_shares')
          .select(`
            photographer_id,
            photographer_amount,
            purchase:purchases!inner(status)
          `)
          .eq('purchase.status', 'completed')
          .range(page * pageSize, (page + 1) * pageSize - 1);

        if (revenueError) throw revenueError;

        if (revenueData && revenueData.length > 0) {
          allRevenueData = [...allRevenueData, ...revenueData];
          page++;
          hasMore = revenueData.length === pageSize;
        } else {
          hasMore = false;
        }
      }

      // Buscar payouts
      const { data: payoutsData, error: payoutsError } = await supabase
        .from('payout_requests')
        .select('photographer_id, amount, status');

      if (payoutsError) throw payoutsError;

      // Buscar perfis dos fotógrafos
      const photographerIds = [...new Set(allRevenueData?.map(r => r.photographer_id) || [])];
      
      // Evitar query vazia
      if (photographerIds.length === 0) {
        setBalances([]);
        return;
      }

      const { data: profilesData } = await supabase
        .from('profiles')
        .select('id, full_name, email')
        .in('id', photographerIds);

      const profileMap = new Map(profilesData?.map(p => [p.id, p]) || []);

      // Agregar dados - agora todos os registros já são de compras completed
      const balanceMap = new Map<string, PhotographerBalance>();

      allRevenueData?.forEach(revenue => {
        const id = revenue.photographer_id;
        if (!balanceMap.has(id)) {
          const profile = profileMap.get(id);
          balanceMap.set(id, {
            photographer_id: id,
            photographer_name: profile?.full_name || 'Fotógrafo',
            photographer_email: profile?.email || '',
            total_earned: 0,
            total_withdrawn: 0,
            pending_withdrawal: 0,
            available_balance: 0,
            total_sales: 0,
          });
        }

        const balance = balanceMap.get(id)!;
        balance.total_earned += Number(revenue.photographer_amount || 0);
        balance.total_sales += 1;
      });

      // Adicionar payouts
      payoutsData?.forEach(payout => {
        const balance = balanceMap.get(payout.photographer_id);
        if (!balance) return;

        if (payout.status === 'completed') {
          balance.total_withdrawn += Number(payout.amount || 0);
        } else if (payout.status === 'pending' || payout.status === 'approved') {
          balance.pending_withdrawal += Number(payout.amount || 0);
        }
      });

      // Calcular saldo disponível
      balanceMap.forEach(balance => {
        balance.available_balance = balance.total_earned - balance.total_withdrawn - balance.pending_withdrawal;
      });

      // Ordenar por saldo disponível
      const sortedBalances = Array.from(balanceMap.values())
        .sort((a, b) => b.available_balance - a.available_balance);

      setBalances(sortedBalances);
    } catch (error) {
      console.error('Error fetching balances:', error);
      toast.error('Erro ao carregar saldos');
    } finally {
      setLoading(false);
    }
  };

  const exportToExcel = () => {
    const data = filteredBalances.map(b => ({
      'Nome': b.photographer_name,
      'Email': b.photographer_email,
      'Total Vendas': b.total_sales,
      'Total Ganho': b.total_earned,
      'Total Sacado': b.total_withdrawn,
      'Saque Pendente': b.pending_withdrawal,
      'Saldo Disponível': b.available_balance,
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Saldos Fotógrafos');
    XLSX.writeFile(wb, `saldos-fotografos-${new Date().toISOString().split('T')[0]}.xlsx`);

    toast.success('Relatório exportado com sucesso!');
  };

  const filteredBalances = balances.filter(b =>
    b.photographer_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    b.photographer_email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const totals = filteredBalances.reduce((acc, b) => ({
    totalEarned: acc.totalEarned + b.total_earned,
    totalWithdrawn: acc.totalWithdrawn + b.total_withdrawn,
    pendingWithdrawal: acc.pendingWithdrawal + b.pending_withdrawal,
    availableBalance: acc.availableBalance + b.available_balance,
  }), { totalEarned: 0, totalWithdrawn: 0, pendingWithdrawal: 0, availableBalance: 0 });

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
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Provisionamento de Fotógrafos</h1>
            <p className="text-muted-foreground">Visualize saldos disponíveis de cada fotógrafo</p>
          </div>
          <Button onClick={exportToExcel} variant="outline" className="gap-2">
            <Download className="h-4 w-4" />
            Exportar Excel
          </Button>
        </div>

        {/* Cards de resumo */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Users className="h-4 w-4" />
                Fotógrafos
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{filteredBalances.length}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-green-500" />
                Total Ganho
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{formatCurrency(totals.totalEarned)}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Clock className="h-4 w-4 text-yellow-500" />
                Pendente de Saque
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-600">{formatCurrency(totals.pendingWithdrawal)}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-blue-500" />
                Saldo Disponível
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">{formatCurrency(totals.availableBalance)}</div>
            </CardContent>
          </Card>
        </div>

        {/* Busca */}
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome ou email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Tabela */}
        <Card>
          <CardHeader>
            <CardTitle>Saldos por Fotógrafo</CardTitle>
            <CardDescription>
              Detalhamento financeiro de cada fotógrafo cadastrado
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-4">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="h-16 bg-muted rounded animate-pulse" />
                ))}
              </div>
            ) : filteredBalances.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                Nenhum fotógrafo encontrado
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b text-left">
                      <th className="pb-3 font-medium">Fotógrafo</th>
                      <th className="pb-3 font-medium text-center">Vendas</th>
                      <th className="pb-3 font-medium text-right">Total Ganho</th>
                      <th className="pb-3 font-medium text-right">Sacado</th>
                      <th className="pb-3 font-medium text-right">Pendente</th>
                      <th className="pb-3 font-medium text-right">Disponível</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredBalances.map((balance) => (
                      <tr key={balance.photographer_id} className="border-b hover:bg-muted/50">
                        <td className="py-4">
                          <div>
                            <p className="font-medium">{balance.photographer_name}</p>
                            <p className="text-sm text-muted-foreground">{balance.photographer_email}</p>
                          </div>
                        </td>
                        <td className="py-4 text-center">
                          <Badge variant="secondary">{balance.total_sales}</Badge>
                        </td>
                        <td className="py-4 text-right font-medium text-green-600">
                          {formatCurrency(balance.total_earned)}
                        </td>
                        <td className="py-4 text-right text-muted-foreground">
                          {formatCurrency(balance.total_withdrawn)}
                        </td>
                        <td className="py-4 text-right">
                          {balance.pending_withdrawal > 0 ? (
                            <Badge variant="outline" className="text-yellow-600">
                              {formatCurrency(balance.pending_withdrawal)}
                            </Badge>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </td>
                        <td className="py-4 text-right font-bold text-blue-600">
                          {formatCurrency(balance.available_balance)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
};

export default PhotographerBalances;
