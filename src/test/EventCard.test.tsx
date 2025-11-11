import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { EventCard } from '@/components/events/EventCard';

// Mock do Supabase
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          order: vi.fn(() => ({
            data: [],
            error: null,
          })),
        })),
      })),
    })),
  },
}));

// Mock do LazyImage
vi.mock('@/components/ui/lazy-image', () => ({
  LazyImage: ({ src, alt, className }: any) => (
    <img src={src} alt={alt} className={className} />
  ),
}));

// Mock do useIsMobile
vi.mock('@/hooks/use-mobile', () => ({
  useIsMobile: () => false,
}));

describe('EventCard', () => {
  const mockCampaign = {
    id: '1',
    title: 'Corrida de São Silvestre 2024',
    description: 'Corrida tradicional de fim de ano',
    event_date: '2024-12-31',
    location: 'São Paulo, SP',
    cover_image_url: 'https://example.com/image.jpg',
    created_at: '2024-01-01',
    photographer: {
      full_name: 'João Silva',
    },
  };

  it('deve renderizar o card do evento com informações básicas', () => {
    render(
      <BrowserRouter>
        <EventCard campaign={mockCampaign} index={0} />
      </BrowserRouter>
    );

    expect(screen.getByText('Corrida de São Silvestre 2024')).toBeInTheDocument();
    expect(screen.getByText('São Paulo, SP')).toBeInTheDocument();
    expect(screen.getByText(/Por: João Silva/)).toBeInTheDocument();
  });

  it('deve exibir a data do evento formatada', () => {
    render(
      <BrowserRouter>
        <EventCard campaign={mockCampaign} index={0} />
      </BrowserRouter>
    );

    // A data pode estar formatada diferente dependendo do locale
    expect(screen.getByText(/12\/2024/)).toBeInTheDocument();
  });

  it('deve ter um link para a página do evento', () => {
    render(
      <BrowserRouter>
        <EventCard campaign={mockCampaign} index={0} />
      </BrowserRouter>
    );

    const links = screen.getAllByRole('link');
    const campaignLink = links.find(link => 
      link.getAttribute('href') === `/campaign/${mockCampaign.id}`
    );
    expect(campaignLink).toBeInTheDocument();
  });

  it('deve exibir botão "Ver Fotos"', () => {
    render(
      <BrowserRouter>
        <EventCard campaign={mockCampaign} index={0} />
      </BrowserRouter>
    );

    expect(screen.getByText('Ver Fotos')).toBeInTheDocument();
  });
});
