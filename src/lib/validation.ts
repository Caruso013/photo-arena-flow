import { z } from 'zod';

// Buyer information validation schema
export const buyerInfoSchema = z.object({
  name: z.string()
    .trim()
    .min(2, 'Nome deve ter pelo menos 2 caracteres')
    .max(100, 'Nome muito longo'),
  surname: z.string()
    .trim()
    .min(2, 'Sobrenome deve ter pelo menos 2 caracteres')
    .max(100, 'Sobrenome muito longo'),
  email: z.string()
    .trim()
    .email('Email inválido')
    .max(255, 'Email muito longo'),
  phone: z.string()
    .regex(/^\d{10,11}$/, 'Telefone deve conter 10 ou 11 dígitos'),
  document: z.string()
    .regex(/^\d{11}$/, 'CPF deve conter 11 dígitos'),
});

// Campaign form validation
export const campaignSchema = z.object({
  title: z.string()
    .trim()
    .min(3, 'Título deve ter pelo menos 3 caracteres')
    .max(200, 'Título muito longo'),
  description: z.string()
    .trim()
    .max(1000, 'Descrição muito longa')
    .optional(),
  location: z.string()
    .trim()
    .max(200, 'Localização muito longa')
    .optional(),
  event_date: z.string().optional(),
});

// Photo upload validation
export const photoUploadSchema = z.object({
  title: z.string()
    .trim()
    .max(200, 'Título muito longo')
    .optional(),
  price: z.number()
    .min(1, 'Preço mínimo é R$ 1,00')
    .max(10000, 'Preço máximo é R$ 10.000,00'),
});

// Contact form validation
export const contactSchema = z.object({
  name: z.string()
    .trim()
    .min(2, 'Nome deve ter pelo menos 2 caracteres')
    .max(100, 'Nome muito longo'),
  email: z.string()
    .trim()
    .email('Email inválido')
    .max(255, 'Email muito longo'),
  message: z.string()
    .trim()
    .min(10, 'Mensagem deve ter pelo menos 10 caracteres')
    .max(1000, 'Mensagem muito longa'),
});

export type BuyerInfo = z.infer<typeof buyerInfoSchema>;
export type CampaignForm = z.infer<typeof campaignSchema>;
export type PhotoUploadForm = z.infer<typeof photoUploadSchema>;
export type ContactForm = z.infer<typeof contactSchema>;
