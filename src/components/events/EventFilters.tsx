import { useState } from 'react';
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
import { Filter, X } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

interface EventFiltersProps {
  onFilterChange: (filters: FilterState) => void;
}

export interface FilterState {
  location: string;
  dateFrom: string;
  dateTo: string;
  sortBy: 'date' | 'title' | 'recent';
  photographer: string;
  minPrice: string;
  maxPrice: string;
}

export function EventFilters({ onFilterChange }: EventFiltersProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [filters, setFilters] = useState<FilterState>({
    location: '',
    dateFrom: '',
    dateTo: '',
    sortBy: 'recent',
    photographer: '',
    minPrice: '',
    maxPrice: '',
  });

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
      minPrice: '',
      maxPrice: '',
    };
    setFilters(emptyFilters);
    onFilterChange(emptyFilters);
  };

  const hasActiveFilters = filters.location || filters.dateFrom || filters.dateTo || 
    filters.photographer || filters.minPrice || filters.maxPrice;

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen} className="mb-6">
      <div className="flex items-center justify-between mb-3">
        <CollapsibleTrigger asChild>
          <Button variant="outline" size="sm" className="gap-2">
            <Filter className="h-4 w-4" />
            Filtros Avançados
            {hasActiveFilters && (
              <span className="ml-1 rounded-full bg-primary text-primary-foreground px-2 py-0.5 text-xs">
                {[filters.location, filters.dateFrom, filters.dateTo, filters.photographer, filters.minPrice, filters.maxPrice].filter(Boolean).length}
              </span>
            )}
          </Button>
        </CollapsibleTrigger>
        
        {hasActiveFilters && (
          <Button variant="ghost" size="sm" onClick={clearFilters} className="gap-2">
            <X className="h-4 w-4" />
            Limpar
          </Button>
        )}
      </div>

      <CollapsibleContent>
        <Card>
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              <div className="space-y-2">
                <Label htmlFor="location">Localização</Label>
                <Input
                  id="location"
                  placeholder="Ex: São Paulo"
                  value={filters.location}
                  onChange={(e) => handleFilterChange('location', e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="photographer">Fotógrafo</Label>
                <Input
                  id="photographer"
                  placeholder="Nome do fotógrafo"
                  value={filters.photographer}
                  onChange={(e) => handleFilterChange('photographer', e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="dateFrom">Data inicial</Label>
                <Input
                  id="dateFrom"
                  type="date"
                  value={filters.dateFrom}
                  onChange={(e) => handleFilterChange('dateFrom', e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="dateTo">Data final</Label>
                <Input
                  id="dateTo"
                  type="date"
                  value={filters.dateTo}
                  onChange={(e) => handleFilterChange('dateTo', e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="minPrice">Preço mínimo</Label>
                <Input
                  id="minPrice"
                  type="number"
                  placeholder="R$ 0"
                  min="0"
                  step="0.01"
                  value={filters.minPrice}
                  onChange={(e) => handleFilterChange('minPrice', e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="maxPrice">Preço máximo</Label>
                <Input
                  id="maxPrice"
                  type="number"
                  placeholder="R$ 1000"
                  min="0"
                  step="0.01"
                  value={filters.maxPrice}
                  onChange={(e) => handleFilterChange('maxPrice', e.target.value)}
                />
              </div>

              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="sortBy">Ordenar por</Label>
                <Select
                  value={filters.sortBy}
                  onValueChange={(value) => handleFilterChange('sortBy', value as FilterState['sortBy'])}
                >
                  <SelectTrigger id="sortBy">
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
          </CardContent>
        </Card>
      </CollapsibleContent>
    </Collapsible>
  );
}
