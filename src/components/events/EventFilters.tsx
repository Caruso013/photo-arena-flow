import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { Filter, X, ChevronDown } from 'lucide-react';

interface EventFiltersProps {
  filters: FilterState;
  onFilterChange: (filters: FilterState) => void;
  onClearFilters: () => void;
}

export interface FilterState {
  location: string;
  dateFrom: string;
  dateTo: string;
  sortBy: 'date' | 'title' | 'recent';
  photographer: string;
  organizationId: string;
}

interface Organization {
  id: string;
  name: string;
}

const buildActiveCount = (filters: FilterState) =>
  [filters.location, filters.dateFrom, filters.dateTo, filters.photographer, filters.organizationId].filter(Boolean).length;

export function EventFilters({ filters, onFilterChange, onClearFilters }: EventFiltersProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [organizations, setOrganizations] = useState<Organization[]>([]);

  useEffect(() => {
    const fetchOrgs = async () => {
      const { data } = await supabase.from('organizations').select('id, name').order('name');
      if (data) setOrganizations(data);
    };

    fetchOrgs();
  }, []);

  const handleFilterChange = (key: keyof FilterState, value: string) => {
    onFilterChange({
      ...filters,
      [key]: value,
    });
  };

  const activeCount = buildActiveCount(filters);
  const hasActiveFilters = activeCount > 0;

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen} className="mb-6">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
        <CollapsibleTrigger asChild>
          <Button variant="outline" size="sm" className="gap-2 rounded-full border-border/70 bg-card shadow-sm">
            <Filter className="h-4 w-4" />
            Filtros avançados
            {hasActiveFilters && (
              <span className="rounded-full bg-primary text-primary-foreground px-2 py-0.5 text-xs font-semibold">
                {activeCount}
              </span>
            )}
            <ChevronDown className={`h-3.5 w-3.5 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
          </Button>
        </CollapsibleTrigger>

        {hasActiveFilters && (
          <Button variant="ghost" size="sm" onClick={onClearFilters} className="gap-1 rounded-full text-muted-foreground hover:text-foreground">
            <X className="h-3.5 w-3.5" />
            Limpar filtros
          </Button>
        )}
      </div>

      <CollapsibleContent>
        <div className="rounded-3xl border border-border/70 bg-gradient-to-br from-card via-card to-primary/5 p-4 md:p-5 shadow-sm space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-foreground">Refinar resultados</p>
              <p className="text-xs text-muted-foreground">Combine filtros para encontrar eventos mais rápido.</p>
            </div>
            <Badge variant="secondary" className="rounded-full px-3 py-1">
              {activeCount} filtro(s) ativo(s)
            </Badge>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-muted-foreground">Organização</Label>
              <Select
                value={filters.organizationId}
                onValueChange={(value) => handleFilterChange('organizationId', value === 'all' ? '' : value)}
              >
                <SelectTrigger className="h-11 rounded-xl bg-background">
                  <SelectValue placeholder="Todas as organizações" />
                </SelectTrigger>
                <SelectContent className="bg-popover z-50">
                  <SelectItem value="all">Todas as organizações</SelectItem>
                  {organizations.map((org) => (
                    <SelectItem key={org.id} value={org.id}>
                      {org.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-muted-foreground">Fotógrafo</Label>
              <Input
                placeholder="Buscar por nome..."
                value={filters.photographer}
                onChange={(e) => handleFilterChange('photographer', e.target.value)}
                className="h-11 rounded-xl bg-background"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-muted-foreground">Localização</Label>
              <Input
                placeholder="Ex: São Paulo"
                value={filters.location}
                onChange={(e) => handleFilterChange('location', e.target.value)}
                className="h-11 rounded-xl bg-background"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-muted-foreground">Data início</Label>
              <Input
                type="date"
                value={filters.dateFrom}
                onChange={(e) => handleFilterChange('dateFrom', e.target.value)}
                className="h-11 rounded-xl bg-background"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-muted-foreground">Data fim</Label>
              <Input
                type="date"
                value={filters.dateTo}
                onChange={(e) => handleFilterChange('dateTo', e.target.value)}
                className="h-11 rounded-xl bg-background"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-muted-foreground">Ordenar por</Label>
              <Select
                value={filters.sortBy}
                onValueChange={(value) => handleFilterChange('sortBy', value as FilterState['sortBy'])}
              >
                <SelectTrigger className="h-11 rounded-xl bg-background">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-popover z-50">
                  <SelectItem value="recent">Mais recentes</SelectItem>
                  <SelectItem value="date">Data do evento</SelectItem>
                  <SelectItem value="title">Nome (A-Z)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 pt-1">
            {filters.organizationId && (
              <Badge variant="secondary" className="rounded-full px-3 py-1">Organização ativa</Badge>
            )}
            {filters.photographer && (
              <Badge variant="secondary" className="rounded-full px-3 py-1">Fotógrafo: {filters.photographer}</Badge>
            )}
            {filters.location && (
              <Badge variant="secondary" className="rounded-full px-3 py-1">Local: {filters.location}</Badge>
            )}
            {filters.dateFrom && <Badge variant="secondary" className="rounded-full px-3 py-1">De: {filters.dateFrom}</Badge>}
            {filters.dateTo && <Badge variant="secondary" className="rounded-full px-3 py-1">Até: {filters.dateTo}</Badge>}
          </div>
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}
