import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
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
      console.error('Error fetching campaigns:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <MainLayout>
      {/* Featured Campaigns */}
      <section className="py-12 px-4">
        <div className="container mx-auto">
          {loading ? (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="aspect-video bg-muted animate-pulse rounded-lg" />
              ))}
            </div>
          ) : campaigns.length > 0 ? (
            <>
              <div className="text-center mb-8">
                <h2 className="text-3xl font-bold text-foreground mb-2">Eventos em Destaque</h2>
                <p className="text-muted-foreground">Navegue pelos principais campeonatos esportivos</p>
              </div>
              
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {campaigns.map((campaign) => (
                  <Link to={`/campaign/${campaign.id}`} key={campaign.id} className="group">
                    <Card className="overflow-hidden hover:shadow-lg transition-shadow cursor-pointer border-2 hover:border-primary/20">
                      <div className="aspect-video bg-gradient-dark relative">
                        {campaign.cover_image_url ? (
                          <img
                            src={campaign.cover_image_url}
                            alt={campaign.title}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-secondary">
                            <div className="text-center text-secondary-foreground">
                              <Camera className="h-16 w-16 mx-auto mb-4 text-primary" />
                              <h3 className="text-xl font-bold mb-2">{campaign.title}</h3>
                            </div>
                          </div>
                        )}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                        <div className="absolute bottom-4 left-4 right-4 text-white">
                          <h3 className="text-xl font-bold mb-1 group-hover:text-primary transition-colors">{campaign.title}</h3>
                          <div className="flex items-center gap-4 text-sm">
                            <div className="flex items-center gap-1">
                              <MapPin className="h-3 w-3" />
                              <span>{campaign.location}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              <span>{new Date(campaign.event_date).toLocaleDateString()}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                      
                      <CardContent className="p-4">
                        <div className="flex justify-between items-center">
                          <div>
                            <p className="text-sm text-muted-foreground">
                              Por: {campaign.photographer?.full_name}
                            </p>
                          </div>
                          <Button size="sm" className="bg-primary text-primary-foreground hover:bg-primary/90">
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
            <div className="text-center py-16">
              <Camera className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-xl font-medium mb-2">Em breve novos eventos!</h3>
              <p className="text-muted-foreground">
                Fotógrafos estão preparando eventos incríveis para você
              </p>
              {!user && (
                <Link to="/auth">
                  <Button className="mt-4 bg-primary text-primary-foreground hover:bg-primary/90">
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