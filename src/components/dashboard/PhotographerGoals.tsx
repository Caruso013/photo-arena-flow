/**
 * Componente de card de metas do fotógrafo
 * Mostra progresso das metas do mês atual
 */

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Target, TrendingUp, Camera, DollarSign, Edit, Plus } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { usePhotographerGoals } from '@/hooks/usePhotographerGoals';
import { Link } from 'react-router-dom';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { toast } from '@/components/ui/use-toast';

const PhotographerGoals = () => {
  const { currentGoal, progress, loading, saveGoal } = usePhotographerGoals();
  const [showEditModal, setShowEditModal] = useState(false);
  const [salesTarget, setSalesTarget] = useState(currentGoal?.sales_target.toString() || '1000');
  const [photosTarget, setPhotosTarget] = useState(currentGoal?.photos_target.toString() || '50');
  const [eventsTarget, setEventsTarget] = useState(currentGoal?.events_target.toString() || '5');
  const [isSaving, setIsSaving] = useState(false);

  const handleSaveGoal = async () => {
    setIsSaving(true);
    try {
      const currentMonth = new Date().toISOString().slice(0, 7) + '-01';
      
      await saveGoal({
        month: currentMonth,
        sales_target: parseFloat(salesTarget) || 0,
        photos_target: parseInt(photosTarget) || 0,
        events_target: parseInt(eventsTarget) || 0,
        is_active: true
      });

      setShowEditModal(false);
    } catch (error) {
      console.error('Error saving goal:', error);
    } finally {
      setIsSaving(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <div className="h-6 w-32 bg-muted animate-pulse rounded" />
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="h-12 bg-muted animate-pulse rounded" />
            <div className="h-12 bg-muted animate-pulse rounded" />
            <div className="h-12 bg-muted animate-pulse rounded" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!currentGoal) {
    return (
      <Card className="border-2 border-dashed">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            Metas do Mês
          </CardTitle>
          <CardDescription>
            Defina suas metas para acompanhar seu desempenho
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={() => setShowEditModal(true)} className="w-full gap-2">
            <Plus className="h-4 w-4" />
            Definir Metas do Mês
          </Button>

          <Dialog open={showEditModal} onOpenChange={setShowEditModal}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Definir Metas do Mês</DialogTitle>
                <DialogDescription>
                  Estabeleça suas metas para {new Date().toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4">
                <div>
                  <Label htmlFor="sales_target">Meta de Vendas (R$)</Label>
                  <Input
                    id="sales_target"
                    type="number"
                    value={salesTarget}
                    onChange={(e) => setSalesTarget(e.target.value)}
                    placeholder="1000.00"
                    step="10"
                    min="0"
                  />
                </div>

                <div>
                  <Label htmlFor="photos_target">Meta de Fotos Vendidas</Label>
                  <Input
                    id="photos_target"
                    type="number"
                    value={photosTarget}
                    onChange={(e) => setPhotosTarget(e.target.value)}
                    placeholder="50"
                    min="0"
                  />
                </div>

                <div>
                  <Label htmlFor="events_target">Meta de Eventos</Label>
                  <Input
                    id="events_target"
                    type="number"
                    value={eventsTarget}
                    onChange={(e) => setEventsTarget(e.target.value)}
                    placeholder="5"
                    min="0"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-4">
                  <Button variant="outline" onClick={() => setShowEditModal(false)}>
                    Cancelar
                  </Button>
                  <Button onClick={handleSaveGoal} disabled={isSaving}>
                    {isSaving ? 'Salvando...' : 'Salvar Metas'}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </CardContent>
      </Card>
    );
  }

  // Calcular porcentagens
  const salesPercent = Math.min((progress.salesRealized / currentGoal.sales_target) * 100, 100);
  const photosPercent = Math.min((progress.photosRealized / currentGoal.photos_target) * 100, 100);
  const eventsPercent = Math.min((progress.eventsRealized / currentGoal.events_target) * 100, 100);

  const getProgressColor = (percent: number) => {
    if (percent >= 100) return 'bg-green-500';
    if (percent >= 80) return 'bg-yellow-500';
    return 'bg-primary';
  };

  const getStatusBadge = (percent: number) => {
    if (percent >= 100) return <Badge variant="default" className="bg-green-500">Atingida! 🎉</Badge>;
    if (percent >= 80) return <Badge variant="default" className="bg-yellow-500">Quase lá! 💪</Badge>;
    return <Badge variant="secondary">Em Progresso</Badge>;
  };

  return (
    <Card className="overflow-hidden border-2 hover:shadow-lg transition-shadow">
      <CardHeader className="bg-gradient-to-r from-primary/10 to-primary/5">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5" />
              Metas do Mês
            </CardTitle>
            <CardDescription className="text-foreground/70">
              {new Date().toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => {
              setSalesTarget(currentGoal.sales_target.toString());
              setPhotosTarget(currentGoal.photos_target.toString());
              setEventsTarget(currentGoal.events_target.toString());
              setShowEditModal(true);
            }}>
              <Edit className="h-4 w-4" />
            </Button>
            <Link to="/dashboard/photographer/goals">
              <Button variant="outline" size="sm">
                <TrendingUp className="h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-6 space-y-6">
        {/* Meta de Vendas */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">Vendas</span>
            </div>
            {getStatusBadge(salesPercent)}
          </div>
          <div className="flex items-baseline justify-between text-sm">
            <span className="text-2xl font-bold text-primary">
              {formatCurrency(progress.salesRealized)}
            </span>
            <span className="text-muted-foreground">
              de {formatCurrency(currentGoal.sales_target)}
            </span>
          </div>
          <Progress value={salesPercent} className={`h-2 ${getProgressColor(salesPercent)}`} />
          <p className="text-xs text-muted-foreground text-right">
            {salesPercent.toFixed(0)}% concluído
          </p>
        </div>

        {/* Meta de Fotos */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Camera className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">Fotos Vendidas</span>
            </div>
            {getStatusBadge(photosPercent)}
          </div>
          <div className="flex items-baseline justify-between text-sm">
            <span className="text-2xl font-bold text-primary">
              {progress.photosRealized}
            </span>
            <span className="text-muted-foreground">
              de {currentGoal.photos_target}
            </span>
          </div>
          <Progress value={photosPercent} className={`h-2 ${getProgressColor(photosPercent)}`} />
          <p className="text-xs text-muted-foreground text-right">
            {photosPercent.toFixed(0)}% concluído
          </p>
        </div>

        {/* Meta de Eventos */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Target className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">Eventos</span>
            </div>
            {getStatusBadge(eventsPercent)}
          </div>
          <div className="flex items-baseline justify-between text-sm">
            <span className="text-2xl font-bold text-primary">
              {progress.eventsRealized}
            </span>
            <span className="text-muted-foreground">
              de {currentGoal.events_target}
            </span>
          </div>
          <Progress value={eventsPercent} className={`h-2 ${getProgressColor(eventsPercent)}`} />
          <p className="text-xs text-muted-foreground text-right">
            {eventsPercent.toFixed(0)}% concluído
          </p>
        </div>

        <Link to="/dashboard/photographer/goals">
          <Button variant="outline" className="w-full gap-2">
            <TrendingUp className="h-4 w-4" />
            Ver Histórico Completo
          </Button>
        </Link>
      </CardContent>

      <Dialog open={showEditModal} onOpenChange={setShowEditModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Metas do Mês</DialogTitle>
            <DialogDescription>
              Ajuste suas metas para {new Date().toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label htmlFor="edit_sales_target">Meta de Vendas (R$)</Label>
              <Input
                id="edit_sales_target"
                type="number"
                value={salesTarget}
                onChange={(e) => setSalesTarget(e.target.value)}
                step="10"
                min="0"
              />
            </div>

            <div>
              <Label htmlFor="edit_photos_target">Meta de Fotos Vendidas</Label>
              <Input
                id="edit_photos_target"
                type="number"
                value={photosTarget}
                onChange={(e) => setPhotosTarget(e.target.value)}
                min="0"
              />
            </div>

            <div>
              <Label htmlFor="edit_events_target">Meta de Eventos</Label>
              <Input
                id="edit_events_target"
                type="number"
                value={eventsTarget}
                onChange={(e) => setEventsTarget(e.target.value)}
                min="0"
              />
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={() => setShowEditModal(false)}>
                Cancelar
              </Button>
              <Button onClick={handleSaveGoal} disabled={isSaving}>
                {isSaving ? 'Salvando...' : 'Salvar Alterações'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
};

export default PhotographerGoals;
