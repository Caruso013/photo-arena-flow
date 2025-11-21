/**
 * Página dedicada de Metas e Objetivos do Fotógrafo
 * Gestão completa de metas, estatísticas detalhadas e comparação mês a mês
 */

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Target, TrendingUp, Plus, Edit, Trash2, Calendar, DollarSign, Camera } from 'lucide-react';
import { usePhotographerGoals, PhotographerGoal } from '@/hooks/usePhotographerGoals';
import { formatCurrency } from '@/lib/utils';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';

const Goals = () => {
  const { goals, currentGoal, progress, loading, saveGoal, deleteGoal } = usePhotographerGoals();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedGoal, setSelectedGoal] = useState<PhotographerGoal | null>(null);
  const [goalToDelete, setGoalToDelete] = useState<string | null>(null);
  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7));
  const [salesTarget, setSalesTarget] = useState('1000');
  const [photosTarget, setPhotosTarget] = useState('50');
  const [eventsTarget, setEventsTarget] = useState('5');
  const [isSaving, setIsSaving] = useState(false);

  const handleSaveGoal = async () => {
    setIsSaving(true);
    try {
      await saveGoal({
        month: month + '-01',
        sales_target: parseFloat(salesTarget) || 0,
        photos_target: parseInt(photosTarget) || 0,
        events_target: parseInt(eventsTarget) || 0,
        is_active: true
      });

      setShowCreateModal(false);
      setSelectedGoal(null);
      // Reset form
      setMonth(new Date().toISOString().slice(0, 7));
      setSalesTarget('1000');
      setPhotosTarget('50');
      setEventsTarget('5');
    } catch (error) {
      console.error('Error saving goal:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleEditGoal = (goal: PhotographerGoal) => {
    setSelectedGoal(goal);
    setMonth(goal.month.slice(0, 7));
    setSalesTarget(goal.sales_target.toString());
    setPhotosTarget(goal.photos_target.toString());
    setEventsTarget(goal.events_target.toString());
    setShowCreateModal(true);
  };

  const handleDeleteGoal = async () => {
    if (!goalToDelete) return;
    await deleteGoal(goalToDelete);
    setGoalToDelete(null);
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-64 bg-muted animate-pulse rounded" />
        <div className="grid gap-6 md:grid-cols-2">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="h-64 bg-muted animate-pulse rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <Target className="h-8 w-8 text-primary" />
            Metas e Objetivos
          </h1>
          <p className="text-muted-foreground mt-1">
            Defina e acompanhe suas metas mensais para melhorar seu desempenho
          </p>
        </div>
        <Button onClick={() => {
          setSelectedGoal(null);
          setMonth(new Date().toISOString().slice(0, 7));
          setSalesTarget('1000');
          setPhotosTarget('50');
          setEventsTarget('5');
          setShowCreateModal(true);
        }} className="gap-2">
          <Plus className="h-4 w-4" />
          Nova Meta
        </Button>
      </div>

      {/* Meta do Mês Atual - Destaque */}
      {currentGoal && (
        <Card className="border-2 border-primary shadow-lg">
          <CardHeader className="bg-gradient-to-r from-primary/10 to-primary/5">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2 text-xl">
                  <TrendingUp className="h-5 w-5" />
                  Meta do Mês Atual
                </CardTitle>
                <CardDescription className="text-foreground/70">
                  {new Date(currentGoal.month).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
                </CardDescription>
              </div>
              <Button variant="outline" size="sm" onClick={() => handleEditGoal(currentGoal)}>
                <Edit className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>

          <CardContent className="pt-6">
            <div className="grid gap-6 md:grid-cols-3">
              {/* Vendas */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <DollarSign className="h-5 w-5 text-green-600" />
                  <span className="font-semibold">Vendas</span>
                </div>
                <div className="space-y-1">
                  <div className="flex items-baseline justify-between">
                    <span className="text-3xl font-bold text-primary">
                      {formatCurrency(progress.salesRealized)}
                    </span>
                    <span className="text-sm text-muted-foreground">
                      / {formatCurrency(currentGoal.sales_target)}
                    </span>
                  </div>
                  <Progress 
                    value={Math.min((progress.salesRealized / currentGoal.sales_target) * 100, 100)} 
                    className="h-2"
                  />
                  <p className="text-xs text-muted-foreground text-right">
                    {((progress.salesRealized / currentGoal.sales_target) * 100).toFixed(1)}%
                  </p>
                </div>
              </div>

              {/* Fotos */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Camera className="h-5 w-5 text-blue-600" />
                  <span className="font-semibold">Fotos Vendidas</span>
                </div>
                <div className="space-y-1">
                  <div className="flex items-baseline justify-between">
                    <span className="text-3xl font-bold text-primary">
                      {progress.photosRealized}
                    </span>
                    <span className="text-sm text-muted-foreground">
                      / {currentGoal.photos_target}
                    </span>
                  </div>
                  <Progress 
                    value={Math.min((progress.photosRealized / currentGoal.photos_target) * 100, 100)} 
                    className="h-2"
                  />
                  <p className="text-xs text-muted-foreground text-right">
                    {((progress.photosRealized / currentGoal.photos_target) * 100).toFixed(1)}%
                  </p>
                </div>
              </div>

              {/* Eventos */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Calendar className="h-5 w-5 text-purple-600" />
                  <span className="font-semibold">Eventos</span>
                </div>
                <div className="space-y-1">
                  <div className="flex items-baseline justify-between">
                    <span className="text-3xl font-bold text-primary">
                      {progress.eventsRealized}
                    </span>
                    <span className="text-sm text-muted-foreground">
                      / {currentGoal.events_target}
                    </span>
                  </div>
                  <Progress 
                    value={Math.min((progress.eventsRealized / currentGoal.events_target) * 100, 100)} 
                    className="h-2"
                  />
                  <p className="text-xs text-muted-foreground text-right">
                    {((progress.eventsRealized / currentGoal.events_target) * 100).toFixed(1)}%
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Histórico de Metas */}
      <div>
        <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
          <Calendar className="h-5 w-5" />
          Histórico de Metas
        </h2>

        {goals.length === 0 ? (
          <Card className="border-2 border-dashed">
            <CardContent className="py-12 text-center">
              <Target className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground mb-4">
                Você ainda não definiu nenhuma meta. Comece agora!
              </p>
              <Button onClick={() => setShowCreateModal(true)} className="gap-2">
                <Plus className="h-4 w-4" />
                Criar Primeira Meta
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {goals.map((goal) => {
              const isCurrentMonth = goal.id === currentGoal?.id;
              
              return (
                <Card key={goal.id} className={`${isCurrentMonth ? 'border-primary' : ''}`}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg">
                        {new Date(goal.month).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
                      </CardTitle>
                      {isCurrentMonth && (
                        <Badge variant="default">Atual</Badge>
                      )}
                    </div>
                  </CardHeader>

                  <CardContent>
                    <div className="space-y-3 text-sm">
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Vendas:</span>
                        <span className="font-semibold">{formatCurrency(goal.sales_target)}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Fotos:</span>
                        <span className="font-semibold">{goal.photos_target}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Eventos:</span>
                        <span className="font-semibold">{goal.events_target}</span>
                      </div>
                    </div>

                    <div className="flex gap-2 mt-4">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="flex-1"
                        onClick={() => handleEditGoal(goal)}
                      >
                        <Edit className="h-3 w-3 mr-1" />
                        Editar
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => setGoalToDelete(goal.id)}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Modal Criar/Editar Meta */}
      <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {selectedGoal ? 'Editar Meta' : 'Nova Meta'}
            </DialogTitle>
            <DialogDescription>
              Defina suas metas para o mês selecionado
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label htmlFor="month">Mês de Referência</Label>
              <Input
                id="month"
                type="month"
                value={month}
                onChange={(e) => setMonth(e.target.value)}
              />
            </div>

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
              <Button variant="outline" onClick={() => setShowCreateModal(false)}>
                Cancelar
              </Button>
              <Button onClick={handleSaveGoal} disabled={isSaving}>
                {isSaving ? 'Salvando...' : selectedGoal ? 'Atualizar' : 'Criar Meta'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Confirmar Exclusão */}
      <AlertDialog open={!!goalToDelete} onOpenChange={() => setGoalToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Meta?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. A meta será permanentemente excluída.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteGoal} className="bg-destructive hover:bg-destructive/90">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Goals;
