import React from 'react';
import { Link } from 'react-router-dom';
import { getTransformedImageUrl } from '@/lib/supabaseImageTransform';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Camera, MapPin, Calendar, Folder, ChevronRight, Image as ImageIcon, Users } from 'lucide-react';
import { formatCampaignDate } from '@/lib/eventDate';

interface SubEvent {
  id: string;
  title: string;
  location: string | null;
  photo_count: number;
}

interface Photographer {
  id: string;
  full_name: string;
  avatar_url?: string;
}

interface Campaign {
  id: string;
  short_code?: string;
  title: string;
  description: string;
  event_date: string;
  location: string;
  cover_image_url: string;
  created_at?: string;
  photographer: Photographer | null;
  campaign_photographers?: {
    photographer_id: string;
    profiles: Photographer;
  }[];
  sub_events?: SubEvent[];
  photo_count?: number;
}

interface EventCardProps {
  campaign: Campaign;
  index: number;
}

export const EventCard: React.FC<EventCardProps> = ({ campaign, index }) => {
  const subEvents = campaign.sub_events || [];
  const totalPhotos = campaign.photo_count || subEvents.reduce((sum, se) => sum + (se.photo_count || 0), 0);
  
  const campaignLink = campaign.short_code 
    ? `/E/${campaign.short_code}` 
    : `/campaign/${campaign.id}`;
  
  const allPhotographers = (): Photographer[] => {
    const photographers: Photographer[] = [];
    if (campaign.photographer) {
      photographers.push(campaign.photographer);
    }
    if (campaign.campaign_photographers) {
      campaign.campaign_photographers.forEach(cp => {
        if (cp.profiles && !photographers.find(p => p.id === cp.profiles.id)) {
          photographers.push(cp.profiles);
        }
      });
    }
    return photographers;
  };

  return (
    <div
      className="group animate-fade-in h-full"
      style={{ animationDelay: `${Math.min(index, 5) * 0.1}s` }}
    >
      <Card className="overflow-hidden cursor-pointer border border-border/70 transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl hover:border-primary/40 bg-card h-full">
        <Link to={campaignLink}>
          <div className="aspect-[4/3] bg-muted relative overflow-hidden">
            {campaign.cover_image_url ? (
              <>
                <img
                  src={getTransformedImageUrl(campaign.cover_image_url, 'medium')}
                  alt=""
                  aria-hidden="true"
                  className="absolute inset-0 h-full w-full object-cover blur-xl opacity-35 transition-opacity duration-500 group-hover:opacity-45"
                  loading="lazy"
                />
                <img
                  src={getTransformedImageUrl(campaign.cover_image_url, 'medium')}
                  alt={campaign.title}
                  className="relative w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                  loading="lazy"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                  }}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent opacity-100" />
              </>
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-secondary to-secondary/60">
                <div className="text-center text-secondary-foreground px-4">
                  <Camera className="h-14 w-14 mx-auto mb-3 text-primary drop-shadow-lg" />
                  <h3 className="text-lg font-bold">{campaign.title}</h3>
                </div>
              </div>
            )}
            
            {totalPhotos > 0 && (
              <div className="absolute top-3 right-3">
                <Badge variant="secondary" className="bg-black/70 text-white border-0 backdrop-blur-md px-3 py-1.5 shadow-lg">
                  <ImageIcon className="h-3.5 w-3.5 mr-1.5" />
                  <span className="font-semibold">{totalPhotos}</span>
                </Badge>
              </div>
            )}
          </div>
        </Link>

        <CardContent className="p-4 md:p-5 space-y-4">
          <div className="space-y-2">
            <h3 className="text-base md:text-xl font-bold leading-tight line-clamp-2 text-foreground group-hover:text-primary transition-colors">
              {campaign.title}
            </h3>
            <div className="space-y-1.5 text-xs md:text-sm text-muted-foreground">
              {campaign.event_date && (
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 shrink-0" />
                  <span>
                    {formatCampaignDate(campaign.event_date) || ''}
                  </span>
                </div>
              )}
              {campaign.location && (
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 shrink-0" />
                  <span className="truncate">{campaign.location}</span>
                </div>
              )}
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-border/70">
            <div className="flex items-center gap-2 min-w-0">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary shrink-0">
                <Users className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Fotógrafo</p>
                <p className="text-sm font-medium truncate max-w-[170px]">
                  {allPhotographers().length > 0 ? allPhotographers()[0].full_name : 'STA Fotos'}
                </p>
              </div>
            </div>

            {subEvents.length > 0 && (
              <Badge variant="secondary" className="gap-1.5 px-2.5 py-1">
                <Folder className="h-3.5 w-3.5" />
                <span>{subEvents.length} {subEvents.length === 1 ? 'pasta' : 'pastas'}</span>
                <ChevronRight className="h-3.5 w-3.5" />
              </Badge>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
