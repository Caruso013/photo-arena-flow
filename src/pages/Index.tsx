import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Camera, MapPin, Calendar } from 'lucide-react';
import { Link } from 'react-router-dom';
import MainLayout from '@/components/layout/MainLayout';
import { logger } from '@/lib/logger';
import { handleError } from '@/lib/errorHandler';

interface Campaign {
  id: string;
  title: string;
  description: string;
  event_date: string;
  location: string;
  cover_image_url: string;
  photographer: {
    full_name: string;
  };
}

const Index = () => {
  const { user } = useAuth();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchFeaturedCampaigns();
  }, []);

  const fetchFeaturedCampaigns = async () => {
    try {
      const { data, error } = await supabase
        .from('campaigns')
        .select(`
          *,
          photographer:profiles(full_name)
        `)
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(6);

      if (error) throw error;
      setCampaigns(data || []);
    } catch (error) {
      logger.error('Error fetching campaigns:', error);
      handleError(error, { 
        context: 'fetch',
        showToast: false // Não mostrar toast na home, apenas logar
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <MainLayout>
      {/* Featured Campaigns */}
      <section className="py-8 sm:py-12 px-3 sm:px-4">
        <div className="container mx-auto">
          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="aspect-[4/5] bg-muted animate-pulse rounded-lg" />
              ))}
            </div>
          ) : campaigns.length > 0 ? (
            <>
              <div className="text-center mb-6 sm:mb-8">
                <h2 className="text-2xl sm:text-3xl font-bold text-foreground mb-2">Eventos em Destaque</h2>
                <p className="text-muted-foreground text-sm sm:text-base">Navegue pelos principais campeonatos esportivos</p>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                {campaigns.map((campaign, index) => (
                  <Link 
                    to={`/campaign/${campaign.id}`} 
                    key={campaign.id} 
                    className="group animate-fade-in"
                    style={{ animationDelay: `${index * 0.1}s` }}
                  >
                    <Card className="overflow-hidden cursor-pointer border-2 transition-all duration-300 hover:border-primary/40 hover:shadow-2xl hover:-translate-y-2 active:scale-95">
                      <div className="aspect-[4/5] bg-gradient-dark relative">
                        {campaign.cover_image_url ? (
                          <img
                            src={campaign.cover_image_url}
                            alt={campaign.title}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-secondary">
                            <div className="text-center text-secondary-foreground">
                              <Camera className="h-12 w-12 sm:h-16 sm:w-16 mx-auto mb-3 sm:mb-4 text-primary" />
                              <h3 className="text-lg sm:text-xl font-bold mb-2">{campaign.title}</h3>
                            </div>
                          </div>
                        )}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                        <div className="absolute bottom-3 sm:bottom-4 left-3 sm:left-4 right-3 sm:right-4 text-white">
                          <h3 className="text-lg sm:text-xl font-bold mb-1 group-hover:text-primary transition-colors line-clamp-2">{campaign.title}</h3>
                          <div className="flex flex-wrap items-center gap-2 sm:gap-4 text-xs sm:text-sm">
                            <div className="flex items-center gap-1">
                              <MapPin className="h-3 w-3 flex-shrink-0" />
                              <span className="truncate max-w-[120px] sm:max-w-none">{campaign.location}</span>
                            </div>
                            <div className="flex items-center gap-1 flex-shrink-0">
                              <Calendar className="h-3 w-3" />
                              <span>{new Date(campaign.event_date).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                      
                      <CardContent className="p-3 sm:p-4">
                        <div className="flex justify-between items-center gap-2">
                          <div className="min-w-0 flex-1">
                            <p className="text-xs sm:text-sm text-muted-foreground truncate">
                              Por: {campaign.photographer?.full_name}
                            </p>
                          </div>
                          <Button size="sm" className="bg-primary text-primary-foreground hover:bg-primary/90 h-8 sm:h-9 text-xs sm:text-sm flex-shrink-0">
                            Ver Fotos
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                ))}
              </div>
            </>
          ) : (
            <div className="text-center py-12 sm:py-16 px-4">
              <Camera className="h-12 w-12 sm:h-16 sm:w-16 text-muted-foreground mx-auto mb-3 sm:mb-4" />
              <h3 className="text-lg sm:text-xl font-medium mb-2">Em breve novos eventos!</h3>
              <p className="text-muted-foreground text-sm sm:text-base mb-4">
                Fotógrafos estão preparando eventos incríveis para você
              </p>
              {!user && (
                <Link to="/auth">
                  <Button className="mt-4 bg-primary text-primary-foreground hover:bg-primary/90 h-11 sm:h-12 text-sm sm:text-base">
                    Cadastre-se para ser notificado
                  </Button>
                </Link>
              )}
            </div>
          )}
        </div>
      </section>
    </MainLayout>
  );
};

export default Index;