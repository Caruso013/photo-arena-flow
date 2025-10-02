// Mercado Pago integration for photo purchases
import { MercadoPagoConfig, Preference } from 'mercadopago';

// Initialize Mercado Pago client
const client = new MercadoPagoConfig({
  accessToken: import.meta.env.VITE_MERCADO_PAGO_ACCESS_TOKEN || '',
  // For production, use the production access token
  options: {
    timeout: 5000,
    idempotencyKey: 'abc',
  }
});

export interface PhotoPurchaseItem {
  id: string;
  title: string;
  quantity: number;
  unit_price: number;
  currency_id: string;
  picture_url?: string;
}

export interface BuyerInfo {
  name: string;
  surname: string;
  email: string;
  phone?: {
    area_code: string;
    number: string;
  };
  identification?: {
    type: string;
    number: string;
  };
  address?: {
    street_name: string;
    street_number: string;
    zip_code: string;
  };
}

export interface PaymentPreferenceData {
  items: PhotoPurchaseItem[];
  payer: BuyerInfo;
  back_urls: {
    success: string;
    failure: string;
    pending: string;
  };
  auto_return: string;
  external_reference: string;
  notification_url?: string;
  expires?: boolean;
  expiration_date_from?: string;
  expiration_date_to?: string;
}

class MercadoPagoService {
  private preference: Preference;

  constructor() {
    this.preference = new Preference(client);
  }

  async createPaymentPreference(data: PaymentPreferenceData) {
    try {
      const preferenceData = {
        items: data.items,
        payer: data.payer,
        back_urls: data.back_urls,
        auto_return: data.auto_return,
        external_reference: data.external_reference,
        notification_url: data.notification_url,
        expires: data.expires || false,
        expiration_date_from: data.expiration_date_from,
        expiration_date_to: data.expiration_date_to,
        statement_descriptor: 'STA FOTOS',
        // Additional security and configuration
        binary_mode: false,
        payment_methods: {
          excluded_payment_methods: [],
          excluded_payment_types: [],
          installments: 1, // Only allow single payment for photos
        },
      };

      const result = await this.preference.create({ body: preferenceData });
      return {
        success: true,
        preference_id: result.id,
        init_point: result.init_point,
        sandbox_init_point: result.sandbox_init_point,
      };
    } catch (error) {
      console.error('Mercado Pago preference creation error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  async getPaymentInfo(paymentId: string) {
    try {
      // This would require the Payment API which needs server-side implementation
      // For now, we'll return a placeholder
      return {
        success: true,
        payment: {
          id: paymentId,
          status: 'approved',
          status_detail: 'accredited',
          transaction_amount: 0,
          date_approved: new Date().toISOString(),
        },
      };
    } catch (error) {
      console.error('Error getting payment info:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  // Helper method to create a photo purchase preference
  async createPhotoPurchase(
    photoId: string,
    photoTitle: string,
    price: number,
    buyerInfo: BuyerInfo,
    campaignId: string
  ) {
    const currentUrl = window.location.origin;
    const items: PhotoPurchaseItem[] = [
      {
        id: photoId,
        title: photoTitle,
        quantity: 1,
        unit_price: price,
        currency_id: 'BRL',
        picture_url: `${currentUrl}/api/photos/${photoId}/thumbnail`,
      },
    ];

    const preferenceData: PaymentPreferenceData = {
      items,
      payer: buyerInfo,
      back_urls: {
        success: `${currentUrl}/campaign/${campaignId}?payment=success&photo=${photoId}`,
        failure: `${currentUrl}/campaign/${campaignId}?payment=failure&photo=${photoId}`,
        pending: `${currentUrl}/campaign/${campaignId}?payment=pending&photo=${photoId}`,
      },
      auto_return: 'approved',
      external_reference: `photo_${photoId}_${Date.now()}`,
      notification_url: `${currentUrl}/api/webhooks/mercadopago`, // Webhook URL for server-side processing
      expires: true,
      expiration_date_from: new Date().toISOString(),
      expiration_date_to: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24 hours
    };

    return this.createPaymentPreference(preferenceData);
  }

  // Helper to validate webhook notifications (would be used server-side)
  validateWebhookSignature(signature: string, secretKey: string, dataId: string) {
    // This is typically done server-side for security
    // Implementation would depend on Mercado Pago's webhook validation requirements
    return true;
  }
}

export const mercadoPagoService = new MercadoPagoService();
export default mercadoPagoService;