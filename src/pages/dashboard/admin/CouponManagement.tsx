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
  AlertCircle,
  Loader2,
  Wand2,
  Copy,
  Check
} from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { toast } from 'sonner';

// Gerar código aleatório
const generateCouponCode = () => {
  const prefixes = ['PROMO', 'DESC', 'SAVE', 'OFF', 'FOTO'];
  const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
  const randomNum = Math.floor(Math.random() * 900) + 100;
  const year = new Date().getFullYear().toString().slice(-2);
  return `${prefix}${randomNum}${year}`;
};

const CouponManagement = () => {
  const { coupons, loading, createCoupon, updateCoupon, deleteCoupon, toggleCouponStatus, getCouponStats } = useCoupons();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingCoupon, setEditingCoupon] = useState<Coupon | null>(null);
  const [couponStats, setCouponStats] = useState<CouponStats[]>([]);
  const [saving, setSaving] = useState(false);
  const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; coupon: Coupon | null }>({ open: false, coupon: null });
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  
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
    // Validações
    if (!formData.code || formData.code.trim().length < 3) {
      toast.error('O código deve ter pelo menos 3 caracteres');
      return;
    }
    
    if (formData.value <= 0) {
      toast.error('O valor do desconto deve ser maior que zero');
      return;
    }
    
    if (formData.type === 'percentage' && formData.value > 100) {
      toast.error('O percentual não pode ser maior que 100%');
      return;
    }

    setSaving(true);
    try {
      const couponData = {
        ...formData,
        code: formData.code.toUpperCase().trim(),
        max_uses: formData.max_uses ? parseInt(formData.max_uses) : null,
        end_date: formData.end_date || null,
      };

      if (editingCoupon) {
        await updateCoupon(editingCoupon.id, couponData);
        toast.success('Cupom atualizado com sucesso!');
      } else {
        await createCoupon(couponData as any);
        toast.success(`Cupom ${couponData.code} criado com sucesso!`);
      }

      setIsDialogOpen(false);
      resetForm();
      loadStats();
    } catch (error: any) {
      console.error('Erro ao salvar cupom:', error);
      if (error.message?.includes('duplicate') || error.message?.includes('unique')) {
        toast.error('Já existe um cupom com este código');
      } else {
        toast.error('Erro ao salvar cupom. Tente novamente.');
      }
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteDialog.coupon) return;
    
    try {
      await deleteCoupon(deleteDialog.coupon.id);
      toast.success('Cupom excluído com sucesso!');
      loadStats();
    } catch (error) {
      toast.error('Erro ao excluir cupom');
    } finally {
      setDeleteDialog({ open: false, coupon: null });
    }
  };

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    toast.success('Código copiado!');
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const handleToggleStatus = async (id: string, currentStatus: boolean) => {
    try {
      await toggleCouponStatus(id, !currentStatus);
      toast.success(currentStatus ? 'Cupom desativado' : 'Cupom ativado');
      loadStats();
    } catch (error) {
      toast.error('Erro ao alterar status');
    }
  };

  const handleGenerateCode = () => {
    const newCode = generateCouponCode();
    setFormData({ ...formData, code: newCode });
    toast.success(`Código gerado: ${newCode}`);
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
                        <TableCell className="font-mono font-bold">
                          <div className="flex items-center gap-2">
                            <span>{coupon.code}</span>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6"
                              onClick={() => handleCopyCode(coupon.code)}
                            >
                              {copiedCode === coupon.code ? (
                                <Check className="h-3 w-3 text-green-500" />
                              ) : (
                                <Copy className="h-3 w-3 text-muted-foreground" />
                              )}
                            </Button>
                          </div>
                        </TableCell>
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
                              onClick={() => setDeleteDialog({ open: true, coupon })}
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
                      <TableCell className="font-mono font-bold">
                        <div className="flex items-center gap-2">
                          <span>{coupon.code}</span>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6"
                            onClick={() => handleCopyCode(coupon.code)}
                          >
                            {copiedCode === coupon.code ? (
                              <Check className="h-3 w-3 text-green-500" />
                            ) : (
                              <Copy className="h-3 w-3 text-muted-foreground" />
                            )}
                          </Button>
                        </div>
                      </TableCell>
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
                            onClick={() => setDeleteDialog({ open: true, coupon })}
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
              <div className="flex gap-2">
                <Input
                  id="code"
                  placeholder="EX: PROMO2025"
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase().replace(/\s/g, '') })}
                  className="font-mono flex-1"
                  maxLength={20}
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleGenerateCode}
                  className="gap-2"
                >
                  <Wand2 className="h-4 w-4" />
                  Gerar
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Mínimo 3 caracteres, máximo 20. Sem espaços.
              </p>
              {formData.code && formData.code.length < 3 && (
                <p className="text-xs text-destructive">Código muito curto</p>
              )}
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
            
            {formData.value > 0 && (
              <div className="bg-muted/50 rounded-lg p-4">
                <p className="text-sm font-medium mb-1">Prévia do desconto:</p>
                <p className="text-lg font-bold text-primary">
                  {formData.type === 'percentage' 
                    ? `${formData.value}% de desconto`
                    : `R$ ${formData.value.toFixed(2)} de desconto`}
                </p>
                {formData.min_purchase_amount > 0 && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Compra mínima: R$ {formData.min_purchase_amount.toFixed(2)}
                  </p>
                )}
              </div>
            )}
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button 
              variant="outline" 
              onClick={() => setIsDialogOpen(false)}
              disabled={saving}
            >
              Cancelar
            </Button>
            <Button 
              onClick={handleSave} 
              disabled={saving || !formData.code || formData.code.length < 3 || formData.value <= 0}
            >
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Salvando...
                </>
              ) : (
                editingCoupon ? 'Salvar Alterações' : 'Criar Cupom'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog de Confirmação de Exclusão */}
      <AlertDialog open={deleteDialog.open} onOpenChange={(open) => setDeleteDialog({ open, coupon: null })}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Cupom</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir o cupom <strong className="font-mono">{deleteDialog.coupon?.code}</strong>?
              <br />
              Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default CouponManagement;
