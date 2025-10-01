import React, { useState, useEffect, useRef } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { CreditCard, Loader2, ShoppingCart, ArrowLeft } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';

declare global {
  interface Window {
    MercadoPago: any;
  }
}

interface Photo {
  id: string;
  title?: string;
  price?: number;
  image_url?: string;
  watermarked_url?: string;
}

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  photo: Photo;
  onPaymentSuccess?: (paymentData: any) => void;
}

export default function PaymentModal({ 
  isOpen, 
  onClose, 
  photo, 
  onPaymentSuccess 
}: PaymentModalProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [showCheckout, setShowCheckout] = useState(false);
  const [preferenceId, setPreferenceId] = useState<string | null>(null);
  const checkoutContainerRef = useRef<HTMLDivElement>(null);
  const [buyerData, setBuyerData] = useState({
    name: user?.user_metadata?.full_name?.split(' ')[0] || '',
    surname: user?.user_metadata?.full_name?.split(' ').slice(1).join(' ') || '',
    email: user?.email || '',
    phone: '',
    document: '',
  });

  const handleInputChange = (field: string, value: string) => {
    setBuyerData(prev => ({ ...prev, [field]: value }));
  };

  const isFormValid = () => {
    return buyerData.name && 
           buyerData.surname && 
           buyerData.email && 
           buyerData.phone && 
           buyerData.document;
  };

  useEffect(() => {
    if (showCheckout && preferenceId && checkoutContainerRef.current && window.MercadoPago) {
      const mp = new window.MercadoPago('APP_USR-a66d49dc-c48e-4308-ba84-95e798e90a95', {
        locale: 'pt-BR'
      });

      mp.checkout({
        preference: {
          id: preferenceId
        },
        render: {
          container: '.cho-container',
          label: 'Pagar',
        },
        theme: {
          elementsColor: '#4f46e5',
          headerColor: '#4f46e5',
        }
      });
    }
  }, [showCheckout, preferenceId]);

  const handlePayment = async () => {
    if (!photo.price || !isFormValid()) {
      toast({
        title: "Dados incompletos",
        description: "Por favor, preencha todos os campos obrigatórios.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      const buyerInfo = {
        name: buyerData.name,
        surname: buyerData.surname,
        email: buyerData.email,
        phone: {
          area_code: buyerData.phone.substring(0, 2),
          number: buyerData.phone.substring(2),
        },
        identification: {
          type: 'CPF',
          number: buyerData.document,
        },
      };

      const { data, error } = await supabase.functions.invoke('create-payment-preference', {
        body: {
          photoId: photo.id,
          photoTitle: photo.title || 'Foto',
          price: photo.price,
          buyerInfo,
          campaignId: 'default-campaign',
        },
      });

      if (error) throw error;

      if (data.success && data.preference_id) {
        setPreferenceId(data.preference_id);
        setShowCheckout(true);
        
        localStorage.setItem(`payment_${photo.id}`, JSON.stringify({
          preferenceId: data.preference_id,
          photoId: photo.id,
          amount: photo.price,
          timestamp: Date.now(),
        }));
      } else {
        throw new Error(data.error || 'Erro ao criar preferência de pagamento');
      }
    } catch (error) {
      toast({
        title: "Erro no pagamento",
        description: "Não foi possível processar o pagamento. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    setShowCheckout(false);
    setPreferenceId(null);
  };

  const handleModalClose = () => {
    setShowCheckout(false);
    setPreferenceId(null);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleModalClose}>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {showCheckout && (
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={handleBack}
                className="mr-2"
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
            )}
            <ShoppingCart className="h-5 w-5" />
            {showCheckout ? 'Pagamento' : 'Comprar Foto'}
          </DialogTitle>
          <DialogDescription>
            {showCheckout 
              ? 'Complete o pagamento no formulário abaixo'
              : 'Complete seus dados para prosseguir com o pagamento via Mercado Pago'
            }
          </DialogDescription>
        </DialogHeader>

        {!showCheckout ? (
          <div className="space-y-6">
            <div className="flex items-center gap-4 p-4 bg-muted rounded-lg">
              <img 
                src={photo.image_url || photo.watermarked_url} 
                alt={photo.title || 'Foto'}
                className="w-16 h-16 object-cover rounded"
              />
              <div className="flex-1">
                <h4 className="font-medium">{photo.title || 'Foto'}</h4>
                <p className="text-2xl font-bold text-green-600">
                  {photo.price ? formatCurrency(photo.price) : 'R$ 0,00'}
                </p>
              </div>
            </div>

            <Separator />

            <div className="space-y-4">
              <h4 className="font-medium">Dados do comprador</h4>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Nome *</Label>
                  <Input
                    id="name"
                    value={buyerData.name}
                    onChange={(e) => handleInputChange('name', e.target.value)}
                    placeholder="Seu primeiro nome"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="surname">Sobrenome *</Label>
                  <Input
                    id="surname"
                    value={buyerData.surname}
                    onChange={(e) => handleInputChange('surname', e.target.value)}
                    placeholder="Seu sobrenome"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">E-mail *</Label>
                <Input
                  id="email"
                  type="email"
                  value={buyerData.email}
                  onChange={(e) => handleInputChange('email', e.target.value)}
                  placeholder="seu@email.com"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">Telefone *</Label>
                <Input
                  id="phone"
                  value={buyerData.phone}
                  onChange={(e) => handleInputChange('phone', e.target.value.replace(/\D/g, ''))}
                  placeholder="11999999999"
                  maxLength={11}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="document">CPF *</Label>
                <Input
                  id="document"
                  value={buyerData.document}
                  onChange={(e) => handleInputChange('document', e.target.value.replace(/\D/g, ''))}
                  placeholder="00000000000"
                  maxLength={11}
                />
              </div>
            </div>

            <Separator />

            <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
              <div className="flex items-center gap-2 mb-2">
                <CreditCard className="h-4 w-4 text-blue-600" />
                <span className="font-medium text-blue-900">Pagamento via Mercado Pago</span>
              </div>
              <p className="text-sm text-blue-700">
                Pague com cartão de crédito, débito, PIX ou boleto bancário.
              </p>
            </div>

            <div className="flex gap-3">
              <Button variant="outline" onClick={handleModalClose} className="flex-1">
                Cancelar
              </Button>
              <Button 
                onClick={handlePayment} 
                disabled={!isFormValid() || loading}
                className="flex-1"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Processando...
                  </>
                ) : (
                  <>
                    <CreditCard className="h-4 w-4 mr-2" />
                    Continuar
                  </>
                )}
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center gap-4 p-4 bg-muted rounded-lg">
              <img 
                src={photo.image_url || photo.watermarked_url} 
                alt={photo.title || 'Foto'}
                className="w-12 h-12 object-cover rounded"
              />
              <div className="flex-1">
                <h4 className="font-medium text-sm">{photo.title || 'Foto'}</h4>
                <p className="text-xl font-bold text-green-600">
                  {photo.price ? formatCurrency(photo.price) : 'R$ 0,00'}
                </p>
              </div>
            </div>

            <div ref={checkoutContainerRef} className="cho-container min-h-[400px]"></div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}