import React, { useState, useMemo, useRef, useEffect } from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Search, Calendar, MapPin, ChevronDown, X, Camera } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

export interface EventOption {
  id: string;
  title: string;
  event_date?: string | null;
  location?: string | null;
}

interface SearchableEventSelectProps {
  events: EventOption[];
  value: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

export const SearchableEventSelect: React.FC<SearchableEventSelectProps> = ({
  events,
  value,
  onValueChange,
  placeholder = "Selecione um evento",
  disabled = false,
  className,
}) => {
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  // Ordenar eventos: futuros primeiro (ascendente), depois passados (descendente)
  const sortedEvents = useMemo(() => {
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    
    return [...events].sort((a, b) => {
      const dateA = a.event_date ? new Date(a.event_date) : null;
      const dateB = b.event_date ? new Date(b.event_date) : null;
      
      // Eventos sem data vão para o final
      if (!dateA && !dateB) return 0;
      if (!dateA) return 1;
      if (!dateB) return -1;
      
      const isFutureA = dateA.getTime() >= now.getTime();
      const isFutureB = dateB.getTime() >= now.getTime();
      
      // Futuros primeiro
      if (isFutureA && !isFutureB) return -1;
      if (!isFutureA && isFutureB) return 1;
      
      // Ambos futuros: ordem ascendente (mais próximo primeiro)
      if (isFutureA && isFutureB) {
        return dateA.getTime() - dateB.getTime();
      }
      
      // Ambos passados: ordem descendente (mais recente primeiro)
      return dateB.getTime() - dateA.getTime();
    });
  }, [events]);

  // Filtrar eventos com base na pesquisa
  const filteredEvents = useMemo(() => {
    if (!searchQuery.trim()) return sortedEvents;
    
    const query = searchQuery.toLowerCase().trim();
    
    return sortedEvents.filter(event => {
      const titleMatch = event.title.toLowerCase().includes(query);
      const locationMatch = event.location?.toLowerCase().includes(query) || false;
      
      // Buscar por data formatada (ex: "31/01", "janeiro")
      let dateMatch = false;
      if (event.event_date) {
        try {
          const date = new Date(event.event_date);
          const formattedDate = format(date, 'dd/MM/yyyy', { locale: ptBR });
          const monthName = format(date, 'MMMM', { locale: ptBR });
          dateMatch = formattedDate.includes(query) || monthName.toLowerCase().includes(query);
        } catch {
          dateMatch = false;
        }
      }
      
      return titleMatch || locationMatch || dateMatch;
    });
  }, [sortedEvents, searchQuery]);

  // Encontrar o evento selecionado
  const selectedEvent = events.find(e => e.id === value);

  // Formatar data do evento
  const formatEventDate = (dateStr?: string | null) => {
    if (!dateStr) return null;
    try {
      const date = new Date(dateStr);
      return format(date, "dd/MM/yyyy", { locale: ptBR });
    } catch {
      return null;
    }
  };

  // Verificar se o evento é futuro
  const isFutureEvent = (dateStr?: string | null) => {
    if (!dateStr) return true;
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    const eventDate = new Date(dateStr);
    return eventDate.getTime() >= now.getTime();
  };

  // Focar no input quando abrir o popover
  useEffect(() => {
    if (open && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [open]);

  const handleSelect = (eventId: string) => {
    onValueChange(eventId);
    setOpen(false);
    setSearchQuery('');
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onValueChange('');
    setSearchQuery('');
  };

  return (
    <Popover open={open} onOpenChange={setOpen} modal={false}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className={cn(
            "w-full h-12 justify-between text-left font-normal",
            !value && "text-muted-foreground",
            className
          )}
        >
          {selectedEvent ? (
            <div className="flex items-center gap-2 truncate">
              <Camera className="h-4 w-4 flex-shrink-0 text-primary" />
              <span className="truncate">{selectedEvent.title}</span>
              {selectedEvent.event_date && (
                <span className="text-xs text-muted-foreground flex-shrink-0">
                  ({formatEventDate(selectedEvent.event_date)})
                </span>
              )}
            </div>
          ) : (
            <span>{placeholder}</span>
          )}
          <div className="flex items-center gap-1">
            {value && (
              <X 
                className="h-4 w-4 hover:text-destructive cursor-pointer" 
                onClick={handleClear}
              />
            )}
            <ChevronDown className="h-4 w-4 opacity-50" />
          </div>
        </Button>
      </PopoverTrigger>
      <PopoverContent 
        className="w-[--radix-popover-trigger-width] p-0 z-[9999]" 
        align="start"
        sideOffset={4}
        onPointerDownOutside={(e) => e.preventDefault()}
        onInteractOutside={(e) => e.preventDefault()}
      >
        {/* Campo de pesquisa */}
        <div className="p-3 border-b">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              ref={inputRef}
              placeholder="Buscar evento..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-10"
            />
            {searchQuery && (
              <Button
                variant="ghost"
                size="sm"
                className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 p-0"
                onClick={() => setSearchQuery('')}
              >
                <X className="h-3 w-3" />
              </Button>
            )}
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            {filteredEvents.length} evento(s) disponível(is)
          </p>
        </div>

        {/* Lista de eventos */}
        <div className="max-h-[280px] overflow-y-auto">
          {filteredEvents.length === 0 ? (
            <div className="p-6 text-center text-sm text-muted-foreground">
              <Search className="h-8 w-8 mx-auto mb-2 opacity-30" />
              <p>Nenhum evento encontrado</p>
              {searchQuery && (
                <Button
                  variant="link"
                  size="sm"
                  onClick={() => setSearchQuery('')}
                  className="mt-1"
                >
                  Limpar busca
                </Button>
              )}
            </div>
          ) : (
            filteredEvents.map((event) => {
              const isSelected = event.id === value;
              
              return (
                <button
                  key={event.id}
                  type="button"
                  onClick={() => handleSelect(event.id)}
                  className={cn(
                    "w-full text-left px-3 py-2.5 hover:bg-accent transition-colors border-b border-border/50 last:border-0",
                    isSelected && "bg-primary/5"
                  )}
                >
                  <div className="flex items-center gap-3">
                    <Camera className="h-4 w-4 text-primary flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className={cn(
                        "font-medium truncate text-sm",
                        isSelected && "text-primary"
                      )}>
                        {event.title}
                      </p>
                      <span className="text-xs text-muted-foreground">
                        {formatEventDate(event.event_date)}
                        {event.location && ` • ${event.location}`}
                      </span>
                    </div>
                    {isSelected && (
                      <div className="h-5 w-5 rounded-full bg-primary flex items-center justify-center flex-shrink-0">
                        <svg className="h-3 w-3 text-primary-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                    )}
                  </div>
                </button>
              );
            })
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
};

export default SearchableEventSelect;
