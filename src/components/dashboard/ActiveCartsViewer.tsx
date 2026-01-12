import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from '@/components/ui/use-toast';
import { ShoppingCart, Search, User, Image, Calendar, Loader2, RefreshCw, Eye } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useAuth } from '@/contexts/AuthContext';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface CartItem {
  id: string;
  title: string | null;
  price: number;
  watermarked_url: string;
  campaign_id: string;
  campaign_title?: string;
}

interface UserCart {
  user_id: string;
  user_email: string;
  user_name: string;
  items: CartItem[];
  total: number;
  last_updated: string;
}

// Nota: Este componente mostra carrinhos apenas para demonstração
// Os carrinhos são armazenados no localStorage dos usuários
// Para produção, seria necessário persistir no banco de dados

export const ActiveCartsViewer: React.FC = () => {
  const { profile } = useAuth();
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCart, setSelectedCart] = useState<UserCart | null>(null);
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);

  // Dados simulados para demonstração
  // Em produção, isso viria de uma tabela cart_items ou similar
  const [activeCarts, setActiveCarts] = useState<UserCart[]>([]);

  useEffect(() => {
    fetchActiveCarts();
  }, []);

  const fetchActiveCarts = async () => {
    setLoading(true);
    try {
      // Buscar fotos favoritadas como proxy para "interesse"
      // Isso mostra usuários que demonstraram interesse em fotos
      const { data: favorites, error } = await supabase
        .from('favorites')
        .select(`
          user_id,
          photo_id,
          created_at,
          photos!inner (
            id,
            title,
            price,
            watermarked_url,
            campaign_id,
            campaigns!inner (
              id,
              title,
              photographer_id
            )
          )
        `)
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) throw error;

      // Agrupar por usuário
      const cartsByUser: Record<string, {
        items: CartItem[];
        last_updated: string;
      }> = {};

      favorites?.forEach((fav: any) => {
        // Se fotógrafo, só mostrar fotos de suas campanhas
        if (profile?.role === 'photographer') {
          if (fav.photos.campaigns.photographer_id !== profile.id) {
            return;
          }
        }

        if (!cartsByUser[fav.user_id]) {
          cartsByUser[fav.user_id] = {
            items: [],
            last_updated: fav.created_at
          };
        }

        cartsByUser[fav.user_id].items.push({
          id: fav.photos.id,
          title: fav.photos.title,
          price: fav.photos.price,
          watermarked_url: fav.photos.watermarked_url,
          campaign_id: fav.photos.campaign_id,
          campaign_title: fav.photos.campaigns.title
        });

        // Atualizar last_updated se mais recente
        if (fav.created_at > cartsByUser[fav.user_id].last_updated) {
          cartsByUser[fav.user_id].last_updated = fav.created_at;
        }
      });

      // Buscar informações dos usuários
      const userIds = Object.keys(cartsByUser);
      if (userIds.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, email, full_name')
          .in('id', userIds);

        const profileMap = new Map(profiles?.map(p => [p.id, p]));

        const carts: UserCart[] = userIds.map(userId => {
          const userProfile = profileMap.get(userId);
          const cart = cartsByUser[userId];
          return {
            user_id: userId,
            user_email: userProfile?.email || 'Email não disponível',
            user_name: userProfile?.full_name || 'Usuário',
            items: cart.items,
            total: cart.items.reduce((sum, item) => sum + Number(item.price), 0),
            last_updated: cart.last_updated
          };
        }).sort((a, b) => new Date(b.last_updated).getTime() - new Date(a.last_updated).getTime());

        setActiveCarts(carts);
      } else {
        setActiveCarts([]);
      }
    } catch (error) {
      console.error('Error fetching carts:', error);
      toast({
        title: "Erro ao carregar",
        description: "Não foi possível carregar os carrinhos.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const filteredCarts = activeCarts.filter(cart => 
    cart.user_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    cart.user_email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const openDetails = (cart: UserCart) => {
    setSelectedCart(cart);
    setDetailsDialogOpen(true);
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <ShoppingCart className="h-5 w-5" />
              Interesses dos Clientes
            </CardTitle>
            <CardDescription>
              Veja fotos que os clientes favoritaram (potenciais compradores)
            </CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={fetchActiveCarts} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Atualizar
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {/* Busca */}
        <div className="mb-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nome ou email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : filteredCarts.length === 0 ? (
          <div className="text-center py-8">
            <ShoppingCart className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">Nenhum interesse encontrado</h3>
            <p className="text-sm text-muted-foreground">
              Quando clientes favoritarem fotos, eles aparecerão aqui
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredCarts.map((cart) => (
              <div 
                key={cart.user_id} 
                className="flex items-center justify-between p-4 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-center gap-4">
                  <div className="p-3 rounded-full bg-primary/10">
                    <User className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <h4 className="font-medium">{cart.user_name}</h4>
                    <p className="text-sm text-muted-foreground">{cart.user_email}</p>
                    <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Image className="h-3 w-3" />
                        {cart.items.length} {cart.items.length === 1 ? 'foto' : 'fotos'}
                      </span>
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {formatDistanceToNow(new Date(cart.last_updated), { 
                          addSuffix: true, 
                          locale: ptBR 
                        })}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <Badge variant="secondary" className="mb-1">
                      {cart.items.length} itens
                    </Badge>
                    <p className="text-lg font-bold text-primary">
                      R$ {cart.total.toFixed(2)}
                    </p>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => openDetails(cart)}>
                    <Eye className="h-4 w-4 mr-1" />
                    Ver
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Summary */}
        {filteredCarts.length > 0 && (
          <div className="mt-6 p-4 rounded-lg bg-muted">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Total de clientes interessados:</span>
              <span className="font-medium">{filteredCarts.length}</span>
            </div>
            <div className="flex items-center justify-between text-sm mt-1">
              <span className="text-muted-foreground">Valor potencial total:</span>
              <span className="font-bold text-primary">
                R$ {filteredCarts.reduce((sum, cart) => sum + cart.total, 0).toFixed(2)}
              </span>
            </div>
          </div>
        )}
      </CardContent>

      {/* Cart Details Dialog */}
      <Dialog open={detailsDialogOpen} onOpenChange={setDetailsDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ShoppingCart className="h-5 w-5" />
              Fotos Favoritadas
            </DialogTitle>
            <DialogDescription>
              {selectedCart?.user_name} ({selectedCart?.user_email})
            </DialogDescription>
          </DialogHeader>
          {selectedCart && (
            <div className="space-y-4 max-h-[60vh] overflow-y-auto">
              {selectedCart.items.map((item) => (
                <div key={item.id} className="flex items-center gap-4 p-3 rounded-lg border">
                  <img 
                    src={item.watermarked_url} 
                    alt={item.title || 'Foto'} 
                    className="w-20 h-20 object-cover rounded"
                  />
                  <div className="flex-1">
                    <h4 className="font-medium">{item.title || 'Sem título'}</h4>
                    <p className="text-sm text-muted-foreground">{item.campaign_title}</p>
                  </div>
                  <p className="font-bold text-primary">R$ {Number(item.price).toFixed(2)}</p>
                </div>
              ))}
              <div className="border-t pt-4 flex items-center justify-between">
                <span className="font-medium">Total:</span>
                <span className="text-xl font-bold text-primary">
                  R$ {selectedCart.total.toFixed(2)}
                </span>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </Card>
  );
};

export default ActiveCartsViewer;
