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

interface Photographer {
  id: string;
  full_name: string;
  avatar_url?: string;
}

interface Campaign {
  id: string;
  title: string;
  description: string;
  event_date: string;
  location: string;
  cover_image_url: string;
  created_at?: string;
  photographer: Photographer | null;
  campaign_photographers?: {
    photographer_id: string;
    profiles: Photographer;
  }[];
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
        .select('id, title, location, photo_count')
        .eq('campaign_id', campaign.id)
        .order('created_at', { ascending: true });

      if (error) throw error;

      const subEventsData = data || [];
      setSubEvents(subEventsData);
      
      const total = subEventsData.reduce((sum, se) => sum + (se.photo_count || 0), 0);
      setTotalPhotos(total);
    } catch (error) {
      console.error('Error fetching sub-events:', error);
      setSubEvents([]);
      setTotalPhotos(0);
    } finally {
      setLoadingSubEvents(false);
    }
  };

  // Obter todos os fotógrafos do evento
  const allPhotographers = (): Photographer[] => {
    const photographers: Photographer[] = [];
    
    // Adicionar fotógrafo principal
    if (campaign.photographer) {
      photographers.push(campaign.photographer);
    }
    
    // Adicionar fotógrafos adicionais (se houver)
    if (campaign.campaign_photographers) {
      campaign.campaign_photographers.forEach(cp => {
        if (cp.profiles && !photographers.find(p => p.id === cp.profiles.id)) {
          photographers.push(cp.profiles);
        }
      });
    }
    
    return photographers;
  };

  return (
    <div
      className="group animate-fade-in"
      style={{ animationDelay: `${index * 0.1}s` }}
    >
      <Card className="overflow-hidden cursor-pointer border-2 transition-all duration-300 hover:border-primary/50 hover:shadow-2xl hover:-translate-y-2 active:scale-[0.98] backdrop-blur-sm bg-card/80">
        <Link to={`/campaign/${campaign.id}`}>
          <div className="aspect-[4/5] bg-gradient-dark relative overflow-hidden">
            {campaign.cover_image_url ? (
              <>
                <LazyImage
                  src={campaign.cover_image_url}
                  alt={campaign.title}
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent opacity-90 group-hover:opacity-95 transition-opacity" />
              </>
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-secondary to-secondary/50">
                <div className="text-center text-secondary-foreground px-4">
                  <Camera className="h-16 md:h-20 w-16 md:w-20 mx-auto mb-4 text-primary drop-shadow-lg" />
                  <h3 className="text-xl md:text-2xl font-bold">{campaign.title}</h3>
                </div>
              </div>
            )}
            
            {/* Badge com total de fotos - melhorado */}
            {totalPhotos > 0 && (
              <div className="absolute top-3 right-3">
                <Badge variant="secondary" className="bg-black/70 text-white border-0 backdrop-blur-md px-3 py-1.5 shadow-lg">
                  <ImageIcon className="h-3.5 w-3.5 mr-1.5" />
                  <span className="font-semibold">{totalPhotos}</span>
                </Badge>
              </div>
            )}

            <div className="absolute bottom-0 left-0 right-0 p-4 md:p-5 text-white space-y-2">
              <h3 className="text-lg md:text-2xl font-bold mb-2 line-clamp-2 group-hover:text-primary transition-colors drop-shadow-lg">
                {campaign.title}
              </h3>
              <div className="flex flex-col gap-2 text-xs md:text-sm">
                <div className="flex items-center gap-2 bg-black/40 backdrop-blur-sm rounded-full px-3 py-1.5 w-fit">
                  <MapPin className="h-3.5 w-3.5 flex-shrink-0" />
                  <span className="truncate font-medium">{campaign.location}</span>
                </div>
                <div className="flex items-center gap-2 bg-black/40 backdrop-blur-sm rounded-full px-3 py-1.5 w-fit">
                  <Calendar className="h-3.5 w-3.5 flex-shrink-0" />
                  <span className="font-medium">{new Date(campaign.event_date).toLocaleDateString('pt-BR')}</span>
                </div>
              </div>
            </div>
          </div>
        </Link>

        <CardContent className="p-4 md:p-5 bg-gradient-to-b from-card to-card/50">
          <div className="flex justify-between items-start gap-3">
            <div className="flex-1 min-w-0 space-y-3">
              {/* Fotógrafos - Layout melhorado */}
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <div className="h-px flex-1 bg-border" />
                  <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    {allPhotographers().length === 1 ? 'Fotógrafo' : 'Fotógrafos'}
                  </span>
                  <div className="h-px flex-1 bg-border" />
                </div>
                
                {allPhotographers().length > 0 ? (
                  <div className="flex items-center gap-2 flex-wrap">
                    {allPhotographers().map((photographer) => (
                      <div 
                        key={photographer.id} 
                        className="group/photographer flex items-center gap-2 bg-gradient-to-r from-primary/10 to-primary/5 hover:from-primary/20 hover:to-primary/10 rounded-full px-3 py-2 transition-all duration-200 border border-primary/20 hover:border-primary/40"
                      >
                        {photographer.avatar_url ? (
                          <img 
                            src={photographer.avatar_url} 
                            alt={photographer.full_name}
                            className="w-6 h-6 rounded-full object-cover border-2 border-primary/30 group-hover/photographer:border-primary"
                          />
                        ) : (
                          <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center border-2 border-primary/30 group-hover/photographer:border-primary">
                            <Camera className="h-3.5 w-3.5 text-primary" />
                          </div>
                        )}
                        <span className="text-sm font-semibold truncate max-w-[120px] text-foreground">
                          {photographer.full_name}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground italic">Sem fotógrafo definido</p>
                )}
              </div>
              
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
              <Button size="sm" className="text-xs md:text-sm flex-shrink-0 shadow-lg hover:shadow-xl transition-shadow">
                Ver Fotos
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
