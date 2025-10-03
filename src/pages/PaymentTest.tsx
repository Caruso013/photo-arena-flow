import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import PaymentModal from '@/components/modals/PaymentModal';
import { ShoppingCart, CreditCard } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface Photo {
  id: string;
  title: string;
  price: number;
  watermarked_url: string;
  thumbnail_url?: string;
}

export default function PaymentTest() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [selectedPhoto, setSelectedPhoto] = useState<Photo | null>(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPhotos();
  }, []);

  const fetchPhotos = async () => {
    try {
      const { data, error } = await supabase
        .from('photos')
        .select('id, title, price, watermarked_url, thumbnail_url')
        .eq('is_available', true)
        .order('created_at', { ascending: false })
        .limit(6);

      if (error) throw error;
      setPhotos(data || []);
    } catch (error) {
      console.error('Erro ao buscar fotos:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível carregar as fotos',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleTestPayment = (photo: Photo) => {
    setSelectedPhoto(photo);
    setShowPaymentModal(true);
  };

  const handlePaymentSuccess = () => {
    toast({
      title: 'Teste de pagamento iniciado!',
      description: 'Complete o pagamento no Mercado Pago',
    });
  };

  if (!user) {
    return (
      <div className="container mx-auto py-20 text-center">
        <h1 className="text-2xl font-bold mb-4">Acesso Restrito</h1>
        <p>Faça login para testar o pagamento</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="container mx-auto py-20 text-center">
        <p>Carregando...</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-10 px-4">
      <Card className="mb-8">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-6 w-6" />
            Página de Teste de Pagamento
          </CardTitle>
          <CardDescription>
            Esta é uma página especial para testar o fluxo de pagamento do Mercado Pago.
            Selecione uma foto abaixo para simular uma compra.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
              <h3 className="font-semibold text-blue-900 mb-2">Informações de Teste</h3>
              <ul className="text-sm text-blue-700 space-y-1">
                <li>✓ Usuário logado: {user.email}</li>
                <li>✓ Fotos disponíveis: {photos.length}</li>
                <li>✓ Sistema de pagamento: Mercado Pago</li>
              </ul>
            </div>

            <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
              <h3 className="font-semibold text-yellow-900 mb-2">Para Teste com Mercado Pago</h3>
              <div className="text-sm text-yellow-700 space-y-1">
                <p><strong>Cartões de teste:</strong></p>
                <ul className="ml-4 mt-2">
                  <li>• Aprovado: 5031 4332 1540 6351</li>
                  <li>• CVV: 123</li>
                  <li>• Validade: 11/25</li>
                  <li>• Nome: APRO (qualquer nome)</li>
                </ul>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {photos.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <ShoppingCart className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
            <p className="text-lg text-muted-foreground">
              Nenhuma foto disponível para teste
            </p>
            <p className="text-sm text-muted-foreground mt-2">
              Faça upload de fotos primeiro para testá-las aqui
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {photos.map((photo) => (
            <Card key={photo.id} className="overflow-hidden hover:shadow-lg transition-shadow">
              <img
                src={photo.thumbnail_url || photo.watermarked_url}
                alt={photo.title}
                className="w-full h-48 object-cover"
              />
              <CardContent className="p-4">
                <h3 className="font-semibold mb-2">{photo.title}</h3>
                <div className="flex items-center justify-between">
                  <span className="text-2xl font-bold text-green-600">
                    R$ {photo.price.toFixed(2)}
                  </span>
                  <Button 
                    onClick={() => handleTestPayment(photo)}
                    size="sm"
                  >
                    <ShoppingCart className="h-4 w-4 mr-2" />
                    Testar
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {selectedPhoto && (
        <PaymentModal
          isOpen={showPaymentModal}
          onClose={() => {
            setShowPaymentModal(false);
            setSelectedPhoto(null);
          }}
          photo={selectedPhoto}
          onPaymentSuccess={handlePaymentSuccess}
        />
      )}
    </div>
  );
}
