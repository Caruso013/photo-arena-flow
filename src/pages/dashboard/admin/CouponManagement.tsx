import React, { useState, useEffect } from 'react';
import { useCoupons, Coupon, CouponStats } from '@/hooks/useCoupons';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import { 
  Ticket, 
  Plus, 
  Edit2, 
  Trash2, 
  TrendingUp, 
  Users, 
  DollarSign,
  Calendar,
  ToggleLeft,
  ToggleRight,
  AlertCircle
} from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

const CouponManagement = () => {
  const { coupons, loading, createCoupon, updateCoupon, deleteCoupon, toggleCouponStatus, getCouponStats } = useCoupons();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingCoupon, setEditingCoupon] = useState<Coupon | null>(null);
  const [couponStats, setCouponStats] = useState<CouponStats[]>([]);
  
  // Form state
  const [formData, setFormData] = useState({
    code: '',
    type: 'percentage' as 'fixed' | 'percentage',
    value: 10,
    description: '',
    start_date: new Date().toISOString().split('T')[0],
    end_date: '',
    max_uses: '',
    min_purchase_amount: 0,
    is_active: true,
  });

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    const stats = await getCouponStats();
    setCouponStats(stats);
  };

  const resetForm = () => {
    setFormData({
      code: '',
      type: 'percentage',
      value: 10,
      description: '',
      start_date: new Date().toISOString().split('T')[0],
      end_date: '',
      max_uses: '',
      min_purchase_amount: 0,
      is_active: true,
    });
    setEditingCoupon(null);
  };

  const handleOpenDialog = (coupon?: Coupon) => {
    if (coupon) {
      setEditingCoupon(coupon);
      setFormData({
        code: coupon.code,
        type: coupon.type,
        value: coupon.value,
        description: coupon.description || '',
        start_date: coupon.start_date.split('T')[0],
        end_date: coupon.end_date ? coupon.end_date.split('T')[0] : '',
        max_uses: coupon.max_uses?.toString() || '',
        min_purchase_amount: coupon.min_purchase_amount,
        is_active: coupon.is_active,
      });
    } else {
      resetForm();
    }
    setIsDialogOpen(true);
  };

  const handleSave = async () => {
    try {
      const couponData = {
        ...formData,
        code: formData.code.toUpperCase().trim(),
        max_uses: formData.max_uses ? parseInt(formData.max_uses) : null,
        end_date: formData.end_date || null,
      };

      if (editingCoupon) {
        await updateCoupon(editingCoupon.id, couponData);
      } else {
        await createCoupon(couponData as any);
      }

      setIsDialogOpen(false);
      resetForm();
      loadStats();
    } catch (error) {
      console.error('Erro ao salvar cupom:', error);
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm('Tem certeza que deseja excluir este cupom?')) {
      await deleteCoupon(id);
      loadStats();
    }
  };

  const handleToggleStatus = async (id: string, currentStatus: boolean) => {
    await toggleCouponStatus(id, !currentStatus);
    loadStats();
  };

  const getStatusBadge = (coupon: Coupon) => {
    if (!coupon.is_active) {
      return <Badge variant="destructive">Inativo</Badge>;
    }
    
    if (coupon.end_date && new Date(coupon.end_date) < new Date()) {
      return <Badge variant="destructive">Expirado</Badge>;
    }
    
    if (coupon.max_uses && coupon.current_uses >= coupon.max_uses) {
      return <Badge variant="outline" className="bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200">
        Limite Atingido
      </Badge>;
    }
    
    return <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">Ativo</Badge>;
  };

  if (loading) {
    return (
      <div className="container max-w-7xl py-8">
        <Card>
          <CardContent className="p-8 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Estatísticas gerais
  const totalStats = couponStats.reduce(
    (acc, stat) => ({
      uses: acc.uses + stat.total_uses,
      discounts: acc.discounts + stat.total_discount_given,
      users: acc.users + stat.unique_users,
    }),
    { uses: 0, discounts: 0, users: 0 }
  );

  return (
    <div className="container max-w-7xl py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Ticket className="h-8 w-8" />
            Gerenciar Cupons
          </h1>
          <p className="text-muted-foreground mt-2">
            Crie e gerencie cupons de desconto para seus clientes
          </p>
        </div>
        <Button onClick={() => handleOpenDialog()} className="gap-2">
          <Plus className="h-4 w-4" />
          Novo Cupom
        </Button>
      </div>

      {/* Estatísticas Gerais */}
      <div className="grid gap-4 md:grid-cols-3 mb-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Usos</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalStats.uses}</div>
            <p className="text-xs text-muted-foreground">cupons aplicados</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Desconto Total</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">R$ {totalStats.discounts.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">em descontos concedidos</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Usuários Únicos</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalStats.users}</div>
            <p className="text-xs text-muted-foreground">usuários usaram cupons</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="active" className="space-y-4">
        <TabsList>
          <TabsTrigger value="active">Ativos ({coupons.filter(c => c.is_active).length})</TabsTrigger>
          <TabsTrigger value="all">Todos ({coupons.length})</TabsTrigger>
          <TabsTrigger value="stats">Estatísticas</TabsTrigger>
        </TabsList>

        {/* Tab: Cupons Ativos */}
        <TabsContent value="active">
          <Card>
            <CardHeader>
              <CardTitle>Cupons Ativos</CardTitle>
              <CardDescription>Cupons atualmente disponíveis para uso</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Código</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Valor</TableHead>
                    <TableHead>Usos</TableHead>
                    <TableHead>Validade</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {coupons.filter(c => c.is_active).length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                        Nenhum cupom ativo
                      </TableCell>
                    </TableRow>
                  ) : (
                    coupons.filter(c => c.is_active).map((coupon) => (
                      <TableRow key={coupon.id}>
                        <TableCell className="font-mono font-bold">{coupon.code}</TableCell>
                        <TableCell>
                          {coupon.type === 'fixed' ? 'Fixo (R$)' : 'Percentual (%)'}
                        </TableCell>
                        <TableCell>
                          {coupon.type === 'fixed' 
                            ? `R$ ${coupon.value.toFixed(2)}`
                            : `${coupon.value}%`}
                        </TableCell>
                        <TableCell>
                          {coupon.current_uses} / {coupon.max_uses || '∞'}
                        </TableCell>
                        <TableCell>
                          {coupon.end_date 
                            ? new Date(coupon.end_date).toLocaleDateString('pt-BR')
                            : 'Sem data'}
                        </TableCell>
                        <TableCell>{getStatusBadge(coupon)}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleToggleStatus(coupon.id, coupon.is_active)}
                            >
                              {coupon.is_active ? (
                                <ToggleRight className="h-4 w-4" />
                              ) : (
                                <ToggleLeft className="h-4 w-4" />
                              )}
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleOpenDialog(coupon)}
                            >
                              <Edit2 className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDelete(coupon.id)}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab: Todos os Cupons */}
        <TabsContent value="all">
          <Card>
            <CardHeader>
              <CardTitle>Todos os Cupons</CardTitle>
              <CardDescription>Histórico completo de cupons criados</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Código</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Valor</TableHead>
                    <TableHead>Usos</TableHead>
                    <TableHead>Validade</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {coupons.map((coupon) => (
                    <TableRow key={coupon.id}>
                      <TableCell className="font-mono font-bold">{coupon.code}</TableCell>
                      <TableCell>
                        {coupon.type === 'fixed' ? 'Fixo (R$)' : 'Percentual (%)'}
                      </TableCell>
                      <TableCell>
                        {coupon.type === 'fixed' 
                          ? `R$ ${coupon.value.toFixed(2)}`
                          : `${coupon.value}%`}
                      </TableCell>
                      <TableCell>
                        {coupon.current_uses} / {coupon.max_uses || '∞'}
                      </TableCell>
                      <TableCell>
                        {coupon.end_date 
                          ? new Date(coupon.end_date).toLocaleDateString('pt-BR')
                          : 'Sem data'}
                      </TableCell>
                      <TableCell>{getStatusBadge(coupon)}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleToggleStatus(coupon.id, coupon.is_active)}
                          >
                            {coupon.is_active ? (
                              <ToggleRight className="h-4 w-4" />
                            ) : (
                              <ToggleLeft className="h-4 w-4" />
                            )}
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleOpenDialog(coupon)}
                          >
                            <Edit2 className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDelete(coupon.id)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab: Estatísticas Detalhadas */}
        <TabsContent value="stats">
          <Card>
            <CardHeader>
              <CardTitle>Estatísticas por Cupom</CardTitle>
              <CardDescription>Desempenho detalhado de cada cupom</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Código</TableHead>
                    <TableHead>Total Usos</TableHead>
                    <TableHead>Usuários Únicos</TableHead>
                    <TableHead>Desconto Dado</TableHead>
                    <TableHead>Valor Original</TableHead>
                    <TableHead>Valor Final</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {couponStats.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                        Nenhuma estatística disponível
                      </TableCell>
                    </TableRow>
                  ) : (
                    couponStats.map((stat) => (
                      <TableRow key={stat.id}>
                        <TableCell className="font-mono font-bold">{stat.code}</TableCell>
                        <TableCell>{stat.total_uses}</TableCell>
                        <TableCell>{stat.unique_users}</TableCell>
                        <TableCell className="text-red-600 dark:text-red-400">
                          -R$ {stat.total_discount_given.toFixed(2)}
                        </TableCell>
                        <TableCell>R$ {stat.total_original_value.toFixed(2)}</TableCell>
                        <TableCell className="font-bold">
                          R$ {stat.total_final_value.toFixed(2)}
                        </TableCell>
                        <TableCell>
                          <Badge variant={stat.is_active ? 'default' : 'secondary'}>
                            {stat.is_active ? 'Ativo' : 'Inativo'}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Dialog de Criar/Editar Cupom */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingCoupon ? 'Editar Cupom' : 'Criar Novo Cupom'}
            </DialogTitle>
            <DialogDescription>
              {editingCoupon 
                ? 'Atualize as informações do cupom'
                : 'Preencha os dados para criar um novo cupom de desconto'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Código */}
            <div className="space-y-2">
              <Label htmlFor="code">Código do Cupom *</Label>
              <Input
                id="code"
                placeholder="EX: PROMO2025"
                value={formData.code}
                onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                className="font-mono"
              />
              <p className="text-xs text-muted-foreground">
                Mínimo 3 caracteres. Será convertido para maiúsculas.
              </p>
            </div>

            {/* Tipo e Valor */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="type">Tipo de Desconto *</Label>
                <Select
                  value={formData.type}
                  onValueChange={(value: 'fixed' | 'percentage') => 
                    setFormData({ ...formData, type: value })
                  }
                >
                  <SelectTrigger id="type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="percentage">Percentual (%)</SelectItem>
                    <SelectItem value="fixed">Valor Fixo (R$)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="value">
                  Valor * {formData.type === 'percentage' ? '(%)' : '(R$)'}
                </Label>
                <Input
                  id="value"
                  type="number"
                  min={0}
                  max={formData.type === 'percentage' ? 100 : undefined}
                  step={formData.type === 'percentage' ? 1 : 0.01}
                  value={formData.value}
                  onChange={(e) => setFormData({ ...formData, value: parseFloat(e.target.value) || 0 })}
                />
              </div>
            </div>

            {/* Descrição */}
            <div className="space-y-2">
              <Label htmlFor="description">Descrição</Label>
              <Textarea
                id="description"
                placeholder="Ex: Promoção de verão - 20% de desconto"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={3}
              />
            </div>

            {/* Datas */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="start_date">Data de Início *</Label>
                <Input
                  id="start_date"
                  type="date"
                  value={formData.start_date}
                  onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="end_date">Data de Expiração</Label>
                <Input
                  id="end_date"
                  type="date"
                  value={formData.end_date}
                  onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                />
                <p className="text-xs text-muted-foreground">Deixe vazio para sem expiração</p>
              </div>
            </div>

            {/* Limites */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="max_uses">Limite de Usos</Label>
                <Input
                  id="max_uses"
                  type="number"
                  min={1}
                  placeholder="Ilimitado"
                  value={formData.max_uses}
                  onChange={(e) => setFormData({ ...formData, max_uses: e.target.value })}
                />
                <p className="text-xs text-muted-foreground">Deixe vazio para ilimitado</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="min_purchase">Valor Mínimo de Compra (R$)</Label>
                <Input
                  id="min_purchase"
                  type="number"
                  min={0}
                  step={0.01}
                  value={formData.min_purchase_amount}
                  onChange={(e) => setFormData({ ...formData, min_purchase_amount: parseFloat(e.target.value) || 0 })}
                />
              </div>
            </div>

            {/* Status */}
            <div className="flex items-center space-x-2">
              <Switch
                id="is_active"
                checked={formData.is_active}
                onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
              />
              <Label htmlFor="is_active">
                Cupom ativo (usuários podem usar imediatamente)
              </Label>
            </div>

            {formData.type === 'percentage' && formData.value > 50 && (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Atenção: Descontos acima de 50% são muito altos. Verifique se está correto.
                </AlertDescription>
              </Alert>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSave}>
              {editingCoupon ? 'Salvar Alterações' : 'Criar Cupom'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CouponManagement;
