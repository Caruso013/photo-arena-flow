import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Camera, Search, MapPin, Calendar, User } from 'lucide-react';
import { Link } from 'react-router-dom';

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
  const { user } = useAuth();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
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

  const filteredCampaigns = campaigns.filter(campaign =>
    campaign.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    campaign.location?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    campaign.photographer?.full_name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-secondary text-secondary-foreground">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Link to="/" className="flex items-center gap-2 md:gap-3">
              <img 
                src="/lovable-uploads/6fdfc5d2-230c-4142-bf7c-3a326e5e45a8.png" 
                alt="STA Fotos Logo" 
                className="h-8 md:h-10 w-auto"
              />
            </Link>

            <div className="flex items-center gap-2 md:gap-4">
              <div className="relative hidden md:block">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Buscar eventos..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 bg-background/10 border-gray-600 text-white placeholder:text-gray-400 w-64"
                />
              </div>

              {user ? (
                <Link to="/dashboard">
                  <Button variant="outline" size="sm" className="gap-1 md:gap-2 border-primary text-primary hover:bg-primary hover:text-primary-foreground text-xs md:text-sm">
                    <User className="h-3 w-3 md:h-4 md:w-4" />
                    <span className="hidden sm:inline">Dashboard</span>
                    <span className="sm:hidden">Painel</span>
                  </Button>
                </Link>
              ) : (
                <Link to="/auth">
                  <Button size="sm" className="gap-1 md:gap-2 bg-primary text-primary-foreground hover:bg-primary/90 text-xs md:text-sm">
                    <span className="hidden sm:inline">Entrar</span>
                    <span className="sm:hidden">Login</span>
                  </Button>
                </Link>
              )}
            </div>
          </div>
        </div>

        {/* Mobile Search */}
        <div className="md:hidden border-t border-gray-700 p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              placeholder="Buscar eventos..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 bg-background/10 border-gray-600 text-white placeholder:text-gray-400 text-base"
            />
          </div>
        </div>

        <nav className="border-t border-gray-700">
          <div className="container mx-auto px-4">
            <div className="flex items-center justify-center md:justify-start space-x-4 md:space-x-8 py-3 text-xs md:text-sm overflow-x-auto">
              <Link to="/" className="hover:text-primary transition-colors whitespace-nowrap">HOME</Link>
              <Link to="/events" className="text-primary font-medium whitespace-nowrap">EVENTOS</Link>
              <Link to="/fotografos" className="hover:text-primary transition-colors whitespace-nowrap">FOTÓGRAFOS</Link>
              <Link to="/contato" className="hover:text-primary transition-colors whitespace-nowrap">CONTATO</Link>
            </div>
          </div>
        </nav>
      </header>

      {/* Content */}
      <main className="container mx-auto px-4 py-6 md:py-8">
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
        ) : filteredCampaigns.length === 0 ? (
          <div className="text-center py-12 md:py-16 px-4">
            <Camera className="h-12 md:h-16 w-12 md:w-16 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg md:text-xl font-medium mb-2">Nenhum evento encontrado</h3>
            <p className="text-sm md:text-base text-muted-foreground">
              {searchTerm 
                ? 'Tente buscar com outros termos'
                : 'Ainda não há eventos disponíveis'
              }
            </p>
          </div>
        ) : (
          <>
            <div className="mb-4 md:mb-6">
              <p className="text-xs md:text-sm text-muted-foreground">
                {filteredCampaigns.length} evento(s) encontrado(s)
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
              {filteredCampaigns.map((campaign) => (
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
                      <Button size="sm" className="bg-primary text-primary-foreground hover:bg-primary/90 text-xs md:text-sm">
                        Ver Fotos
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </>
        )}
      </main>
    </div>
  );
};

export default Events;