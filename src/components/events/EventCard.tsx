import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Camera, 
  MapPin, 
  Calendar, 
  Folder, 
  ChevronRight,
  Image as ImageIcon,
  X
} from 'lucide-react';
import { LazyImage } from '@/components/ui/lazy-image';
import { supabase } from '@/integrations/supabase/client';
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  SheetClose,
} from "@/components/ui/sheet";
import { useIsMobile } from '@/hooks/use-mobile';

interface SubEvent {
  id: string;
  title: string;
  location: string | null;
  photo_count: number;
}

interface Campaign {
  id: string;
  title: string;
  description: string;
  event_date: string;
  location: string;
  cover_image_url: string;
  created_at?: string;
  photographer: {
    full_name: string;
  };
}

interface EventCardProps {
  campaign: Campaign;
  index: number;
}

export const EventCard: React.FC<EventCardProps> = ({ campaign, index }) => {
  const [subEvents, setSubEvents] = useState<SubEvent[]>([]);
  const [loadingSubEvents, setLoadingSubEvents] = useState(false);
  const [totalPhotos, setTotalPhotos] = useState(0);
  const [sheetOpen, setSheetOpen] = useState(false);
  const isMobile = useIsMobile();

  useEffect(() => {
    fetchSubEvents();
  }, [campaign.id]);

  const fetchSubEvents = async () => {
    setLoadingSubEvents(true);
    try {
      const { data, error } = await supabase
        .from('sub_events')
        .select('id, title, location')
        .eq('campaign_id', campaign.id)
        .order('created_at', { ascending: true });

      if (error) throw error;

      // Buscar contagem de fotos para cada sub-evento
      const subEventsWithCount = await Promise.all(
        (data || []).map(async (se) => {
          const { count } = await supabase
            .from('photos')
            .select('*', { count: 'exact', head: true })
            .eq('campaign_id', campaign.id)
            .eq('sub_event_id', se.id)
            .eq('is_available', true);
          
          return { ...se, photo_count: count || 0 };
        })
      );

      setSubEvents(subEventsWithCount);
      
      // Calcular total de fotos
      const total = subEventsWithCount.reduce((sum, se) => sum + se.photo_count, 0);
      setTotalPhotos(total);
    } catch (error) {
      console.error('Error fetching sub-events:', error);
    } finally {
      setLoadingSubEvents(false);
    }
  };

  return (
    <div
      className="group animate-fade-in"
      style={{ animationDelay: `${index * 0.1}s` }}
    >
      <Card className="overflow-hidden cursor-pointer border-2 transition-all duration-300 hover:border-primary/40 hover:shadow-2xl hover:-translate-y-2 active:scale-95">
        <Link to={`/campaign/${campaign.id}`}>
          <div className="aspect-[4/5] bg-gradient-dark relative">
            {campaign.cover_image_url ? (
              <LazyImage
                src={campaign.cover_image_url}
                alt={campaign.title}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-secondary">
                <div className="text-center text-secondary-foreground px-4">
                  <Camera className="h-12 md:h-16 w-12 md:w-16 mx-auto mb-2 md:mb-4 text-primary" />
                  <h3 className="text-lg md:text-xl font-bold mb-2">{campaign.title}</h3>
                </div>
              </div>
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
            
            {/* Badge com total de fotos */}
            {totalPhotos > 0 && (
              <div className="absolute top-2 right-2">
                <Badge variant="secondary" className="bg-black/60 text-white border-0 backdrop-blur-sm">
                  <ImageIcon className="h-3 w-3 mr-1" />
                  {totalPhotos} fotos
                </Badge>
              </div>
            )}

            <div className="absolute bottom-2 md:bottom-4 left-2 md:left-4 right-2 md:right-4 text-white">
              <h3 className="text-base md:text-xl font-bold mb-1 group-hover:text-primary transition-colors">
                {campaign.title}
              </h3>
              <div className="flex flex-col md:flex-row md:items-center gap-1 md:gap-4 text-xs md:text-sm">
                <div className="flex items-center gap-1">
                  <MapPin className="h-3 w-3" />
                  <span className="truncate">{campaign.location}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  <span>{new Date(campaign.event_date).toLocaleDateString('pt-BR')}</span>
                </div>
              </div>
            </div>
          </div>
        </Link>

        <CardContent className="p-3 md:p-4">
          <div className="flex justify-between items-start gap-2">
            <div className="flex-1 min-w-0">
              <p className="text-xs md:text-sm text-muted-foreground truncate mb-2">
                Por: {campaign.photographer?.full_name}
              </p>
              
              {/* Pastas/Sub-eventos - Mobile usa Sheet, Desktop usa HoverCard */}
              {subEvents.length > 0 && (
                <>
                  {isMobile ? (
                    <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
                      <SheetTrigger asChild>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="h-auto p-0 text-xs text-muted-foreground hover:text-primary hover:bg-transparent"
                        >
                          <Folder className="h-3 w-3 mr-1" />
                          {subEvents.length} {subEvents.length === 1 ? 'pasta' : 'pastas'}
                          <ChevronRight className="h-3 w-3 ml-1" />
                        </Button>
                      </SheetTrigger>
                      <SheetContent side="bottom" className="h-[85vh] rounded-t-2xl p-0">
                        <SheetHeader className="p-4 border-b sticky top-0 bg-background z-10">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <Folder className="h-5 w-5 text-primary" />
                              <SheetTitle className="text-lg">Pastas do Evento</SheetTitle>
                            </div>
                            <SheetClose asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8">
                                <X className="h-4 w-4" />
                              </Button>
                            </SheetClose>
                          </div>
                          <p className="text-sm text-muted-foreground text-left">
                            {campaign.title}
                          </p>
                        </SheetHeader>
                        <div className="p-4 space-y-2 overflow-y-auto h-[calc(85vh-80px)]">
                          {subEvents.map((subEvent) => (
                            <Link 
                              key={subEvent.id}
                              to={`/campaign/${campaign.id}`}
                              className="block"
                              onClick={() => setSheetOpen(false)}
                            >
                              <div className="flex items-start gap-3 p-3 rounded-lg bg-card border-2 border-border hover:border-primary transition-all active:scale-95">
                                <div className="w-14 h-14 bg-muted rounded-lg flex items-center justify-center flex-shrink-0">
                                  <Folder className="h-6 w-6 text-muted-foreground" />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="text-base font-semibold line-clamp-2 mb-1">
                                    {subEvent.title}
                                  </p>
                                  {subEvent.location && (
                                    <p className="text-sm text-muted-foreground flex items-center gap-1 mb-1">
                                      <MapPin className="h-3.5 w-3.5 flex-shrink-0" />
                                      <span className="truncate">{subEvent.location}</span>
                                    </p>
                                  )}
                                  <Badge variant="secondary" className="text-xs">
                                    <ImageIcon className="h-3 w-3 mr-1" />
                                    {subEvent.photo_count} {subEvent.photo_count === 1 ? 'foto' : 'fotos'}
                                  </Badge>
                                </div>
                                <ChevronRight className="h-5 w-5 text-muted-foreground flex-shrink-0 mt-1" />
                              </div>
                            </Link>
                          ))}
                        </div>
                      </SheetContent>
                    </Sheet>
                  ) : (
                    <HoverCard openDelay={200}>
                      <HoverCardTrigger asChild>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="h-auto p-0 text-xs text-muted-foreground hover:text-primary hover:bg-transparent"
                        >
                          <Folder className="h-3 w-3 mr-1" />
                          {subEvents.length} {subEvents.length === 1 ? 'pasta' : 'pastas'}
                          <ChevronRight className="h-3 w-3 ml-1" />
                        </Button>
                      </HoverCardTrigger>
                      <HoverCardContent 
                        className="w-80 p-3" 
                        align="start"
                        side="top"
                      >
                        <div className="space-y-2">
                          <div className="flex items-center gap-2 mb-3">
                            <Folder className="h-4 w-4 text-primary" />
                            <h4 className="font-semibold text-sm">Pastas do Evento</h4>
                          </div>
                          <div className="space-y-1.5 max-h-60 overflow-y-auto">
                            {subEvents.map((subEvent) => (
                              <Link 
                                key={subEvent.id}
                                to={`/campaign/${campaign.id}`}
                                className="block"
                              >
                                <div className="flex items-start gap-2 p-2 rounded-md hover:bg-accent transition-colors group/item">
                                  <div className="w-12 h-12 bg-muted rounded flex items-center justify-center flex-shrink-0">
                                    <Folder className="h-5 w-5 text-muted-foreground" />
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium line-clamp-1 group-hover/item:text-primary transition-colors">
                                      {subEvent.title}
                                    </p>
                                    {subEvent.location && (
                                      <p className="text-xs text-muted-foreground truncate flex items-center gap-1 mt-0.5">
                                        <MapPin className="h-3 w-3 flex-shrink-0" />
                                        {subEvent.location}
                                      </p>
                                    )}
                                    <p className="text-xs text-muted-foreground mt-0.5">
                                      {subEvent.photo_count} {subEvent.photo_count === 1 ? 'foto' : 'fotos'}
                                    </p>
                                  </div>
                                </div>
                              </Link>
                            ))}
                          </div>
                        </div>
                      </HoverCardContent>
                    </HoverCard>
                  )}
                </>
              )}
            </div>
            
            <Link to={`/campaign/${campaign.id}`}>
              <Button size="sm" className="text-xs md:text-sm flex-shrink-0">
                Ver Fotos
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
