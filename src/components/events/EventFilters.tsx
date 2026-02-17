import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
  onFilterChange: (filters: FilterState) => void;
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

export function EventFilters({ onFilterChange }: EventFiltersProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [filters, setFilters] = useState<FilterState>({
    location: '',
    dateFrom: '',
    dateTo: '',
    sortBy: 'recent',
    photographer: '',
    organizationId: '',
  });

  useEffect(() => {
    const fetchOrgs = async () => {
      const { data } = await supabase
        .from('organizations')
        .select('id, name')
        .order('name');
      if (data) setOrganizations(data);
    };
    fetchOrgs();
  }, []);

  const handleFilterChange = (key: keyof FilterState, value: string) => {
    const newFilters = { ...filters, [key]: value };
    setFilters(newFilters);
    onFilterChange(newFilters);
  };

  const clearFilters = () => {
    const emptyFilters: FilterState = {
      location: '',
      dateFrom: '',
      dateTo: '',
      sortBy: 'recent',
      photographer: '',
      organizationId: '',
    };
    setFilters(emptyFilters);
    onFilterChange(emptyFilters);
  };

  const activeCount = [
    filters.location,
    filters.dateFrom,
    filters.dateTo,
    filters.photographer,
    filters.organizationId,
  ].filter(Boolean).length;

  const hasActiveFilters = activeCount > 0;

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen} className="mb-6">
      <div className="flex items-center gap-2 mb-3">
        <CollapsibleTrigger asChild>
          <Button variant="outline" size="sm" className="gap-2">
            <Filter className="h-4 w-4" />
            Filtros
            {hasActiveFilters && (
              <span className="rounded-full bg-primary text-primary-foreground px-2 py-0.5 text-xs font-semibold">
                {activeCount}
              </span>
            )}
            <ChevronDown className={`h-3.5 w-3.5 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
          </Button>
        </CollapsibleTrigger>

        {hasActiveFilters && (
          <Button variant="ghost" size="sm" onClick={clearFilters} className="gap-1 text-muted-foreground hover:text-foreground">
            <X className="h-3.5 w-3.5" />
            Limpar
          </Button>
        )}
      </div>

      <CollapsibleContent>
        <div className="rounded-xl border bg-card p-4 shadow-sm space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Organização */}
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-muted-foreground">Organização</Label>
              <Select
                value={filters.organizationId}
                onValueChange={(value) => handleFilterChange('organizationId', value === 'all' ? '' : value)}
              >
                <SelectTrigger className="h-10">
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

            {/* Fotógrafo */}
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-muted-foreground">Fotógrafo</Label>
              <Input
                placeholder="Buscar por nome..."
                value={filters.photographer}
                onChange={(e) => handleFilterChange('photographer', e.target.value)}
                className="h-10"
              />
            </div>

            {/* Localização */}
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-muted-foreground">Localização</Label>
              <Input
                placeholder="Ex: São Paulo"
                value={filters.location}
                onChange={(e) => handleFilterChange('location', e.target.value)}
                className="h-10"
              />
            </div>

            {/* Data de / até */}
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-muted-foreground">Data início</Label>
              <Input
                type="date"
                value={filters.dateFrom}
                onChange={(e) => handleFilterChange('dateFrom', e.target.value)}
                className="h-10"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-muted-foreground">Data fim</Label>
              <Input
                type="date"
                value={filters.dateTo}
                onChange={(e) => handleFilterChange('dateTo', e.target.value)}
                className="h-10"
              />
            </div>

            {/* Ordenar */}
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-muted-foreground">Ordenar por</Label>
              <Select
                value={filters.sortBy}
                onValueChange={(value) => handleFilterChange('sortBy', value as FilterState['sortBy'])}
              >
                <SelectTrigger className="h-10">
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
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}
