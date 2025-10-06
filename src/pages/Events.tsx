import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Camera, MapPin, Calendar } from 'lucide-react';
import { Link } from 'react-router-dom';
import MainLayout from '@/components/layout/MainLayout';

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

const Events = () => {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCampaigns();
  }, []);

  const fetchCampaigns = async () => {
    try {
      const { data, error } = await supabase
        .from('campaigns')
        .select(`
          *,
          photographer:profiles(full_name)
        `)
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setCampaigns(data || []);
    } catch (error) {
      console.error('Error fetching campaigns:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <MainLayout>
      <section className="container mx-auto px-4 py-6 md:py-8">
        <div className="mb-6 md:mb-8">
          <h1 className="text-2xl md:text-3xl font-bold mb-2">Todos os Eventos</h1>
          <p className="text-sm md:text-base text-muted-foreground">
            Encontre fotos dos seus eventos esportivos favoritos
          </p>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="aspect-video bg-muted animate-pulse rounded-lg" />
            ))}
          </div>
        ) : campaigns.length === 0 ? (
          <div className="text-center py-12 md:py-16 px-4">
            <Camera className="h-12 md:h-16 w-12 md:w-16 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg md:text-xl font-medium mb-2">Nenhum evento encontrado</h3>
            <p className="text-sm md:text-base text-muted-foreground">
              Ainda não há eventos disponíveis
            </p>
          </div>
        ) : (
          <>
            <div className="mb-4 md:mb-6">
              <p className="text-xs md:text-sm text-muted-foreground">
                {campaigns.length} evento(s) encontrado(s)
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
              {campaigns.map((campaign) => (
                <Card key={campaign.id} className="overflow-hidden hover:shadow-lg transition-shadow group cursor-pointer border-2 hover:border-primary/20">
                  <div className="aspect-video bg-gradient-dark relative">
                    {campaign.cover_image_url ? (
                      <img
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
                    <div className="absolute bottom-2 md:bottom-4 left-2 md:left-4 right-2 md:right-4 text-white">
                      <h3 className="text-base md:text-xl font-bold mb-1">{campaign.title}</h3>
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
                  
                  <CardContent className="p-3 md:p-4">
                    <div className="flex justify-between items-center">
                      <div>
                        <p className="text-xs md:text-sm text-muted-foreground truncate">
                          Por: {campaign.photographer?.full_name}
                        </p>
                      </div>
                      <Link to={`/campaign/${campaign.id}`}>
                        <Button size="sm" className="bg-primary text-primary-foreground hover:bg-primary/90 text-xs md:text-sm">
                          Ver Fotos
                        </Button>
                      </Link>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </>
        )}
      </section>
    </MainLayout>
  );
};

export default Events;